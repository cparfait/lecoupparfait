import 'server-only'

/**
 * La connexion avec Google, côté serveur.
 *
 * Le parcours OpenID Connect ordinaire, en trois temps :
 *
 *  1. `api/auth/google` envoie chez Google avec un `state` aléatoire et un
 *     défi PKCE, gardés dans un témoin le temps de l'aller-retour ;
 *  2. Google revient sur `api/auth/google/retour` avec un code, qu'on échange
 *     — avec le secret, de serveur à serveur — contre un jeton d'identité ;
 *  3. on y lit qui est la personne : compte connu, on ouvre la session ;
 *     inconnu, on lui fait choisir un pseudo (`/connexion/google`).
 *
 * Le jeton d'identité n'est pas vérifié par signature, et c'est permis : il
 * vient de l'échange direct avec Google, en HTTPS, authentifié par notre
 * secret — personne n'a pu le glisser entre-temps (OpenID Connect, § 3.1.3.7).
 * On contrôle quand même son destinataire, son émetteur et son expiration.
 *
 * Sans `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET`, `googleDisponible()` répond
 * faux et l'interface retire le bouton.
 */

import { createHash, randomBytes } from 'node:crypto'

const IDENTIFIANT = process.env.AUTH_GOOGLE_ID?.trim()
const SECRET = process.env.AUTH_GOOGLE_SECRET?.trim()

/** Vrai si le serveur peut proposer la connexion avec Google. */
export function googleDisponible(): boolean {
  return Boolean(IDENTIFIANT && SECRET)
}

/** Le témoin de l'aller-retour chez Google : `state`, vérificateur PKCE, mode, suite. */
export const TEMOIN_DEPART = 'coupparfait_google'
/** Le témoin qui désigne une identité Google en attente de pseudo. */
export const TEMOIN_NOUVEAU = 'coupparfait_google_nouveau'
/** Dix minutes : le temps de choisir un compte Google, puis un pseudo. */
export const DUREE_SECONDES = 10 * 60

/**
 * L'adresse publique du site, pour construire les adresses de retour.
 *
 * Pas celle de la requête : derrière le relais, le serveur se voit en
 * `http://localhost:3000`, et Google refuserait une adresse de retour qui
 * n'est pas celle déclarée dans sa console.
 */
export function adresseDuSite(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin
}

export function adresseDeRetour(request: Request): string {
  return new URL('/api/auth/google/retour', adresseDuSite(request)).href
}

/** Un chemin du site, et rien d'autre : la suite d'un parcours ne mène jamais ailleurs. */
export function cheminDuSite(valeur: string | null | undefined): string | null {
  if (!valeur || !valeur.startsWith('/') || valeur.startsWith('//') || valeur.includes('\\')) {
    return null
  }
  return valeur
}

export interface Depart {
  etat: string
  verificateur: string
  /** `connexion` : se connecter ou s'inscrire. `lier` : lier Google au compte connecté. */
  mode: 'connexion' | 'lier'
  /** Où revenir une fois fini. */
  suite: string
}

/** Prépare l'aller chez Google : rend le départ à garder, et l'adresse où envoyer. */
export function preparerDepart(
  request: Request,
  mode: Depart['mode'],
  suite: string,
): { depart: Depart; adresse: string } {
  const depart: Depart = {
    etat: randomBytes(16).toString('base64url'),
    verificateur: randomBytes(32).toString('base64url'),
    mode,
    suite,
  }
  const defi = createHash('sha256').update(depart.verificateur).digest('base64url')
  const adresse = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  adresse.search = new URLSearchParams({
    client_id: IDENTIFIANT ?? '',
    redirect_uri: adresseDeRetour(request),
    response_type: 'code',
    scope: 'openid email profile',
    state: depart.etat,
    code_challenge: defi,
    code_challenge_method: 'S256',
    // Laisse choisir le compte : sur un ordinateur partagé, le compte Google
    // ouvert dans le navigateur n'est pas forcément le sien.
    prompt: 'select_account',
  }).toString()
  return { depart, adresse: adresse.href }
}

export function encoderDepart(depart: Depart): string {
  return Buffer.from(JSON.stringify(depart)).toString('base64url')
}

export function decoderDepart(valeur: string | undefined): Depart | null {
  if (!valeur) return null
  try {
    const depart = JSON.parse(Buffer.from(valeur, 'base64url').toString('utf8')) as Depart
    if (
      typeof depart.etat !== 'string' ||
      typeof depart.verificateur !== 'string' ||
      (depart.mode !== 'connexion' && depart.mode !== 'lier') ||
      !cheminDuSite(depart.suite)
    ) {
      return null
    }
    return depart
  } catch {
    return null
  }
}

/** Ce que Google dit de la personne, une fois vérifié. */
export interface IdentiteGoogle {
  sub: string
  /** Seulement si Google l'a vérifiée : une adresse non vérifiée ne prouve rien. */
  email: string | null
  nom: string | null
}

/** Échange le code contre l'identité. `null` si Google refuse ou si le jeton ne tient pas. */
export async function echangerCode(
  code: string,
  verificateur: string,
  adresseRetour: string,
): Promise<IdentiteGoogle | null> {
  if (!googleDisponible()) return null
  try {
    const reponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: IDENTIFIANT!,
        client_secret: SECRET!,
        redirect_uri: adresseRetour,
        grant_type: 'authorization_code',
        code_verifier: verificateur,
      }),
    })
    if (!reponse.ok) {
      console.error(`[google] échange du code refusé : ${reponse.status}`)
      return null
    }
    const { id_token } = (await reponse.json()) as { id_token?: string }
    const charge = id_token?.split('.')[1]
    if (!charge) return null
    const jeton = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8')) as {
      sub?: string
      aud?: string
      iss?: string
      exp?: number
      email?: string
      email_verified?: boolean
      name?: string
    }
    if (
      typeof jeton.sub !== 'string' ||
      jeton.aud !== IDENTIFIANT ||
      (jeton.iss !== 'https://accounts.google.com' && jeton.iss !== 'accounts.google.com') ||
      typeof jeton.exp !== 'number' ||
      jeton.exp * 1000 < Date.now()
    ) {
      console.error('[google] jeton d’identité inattendu')
      return null
    }
    return {
      sub: jeton.sub,
      email: jeton.email_verified && jeton.email ? jeton.email : null,
      nom: jeton.name?.trim() || null,
    }
  } catch (erreur) {
    console.error('[google] échange impossible :', erreur)
    return null
  }
}

/*
  Les identités qui attendent leur pseudo, en mémoire.

  Le temps de choisir un pseudo, il faut garder ce que Google a dit sans le
  confier au navigateur, qui pourrait le retoucher. Une table en mémoire suffit :
  le serveur web est un seul processus, et l'attente ne dure que dix minutes —
  un redémarrage pendant ce temps renvoie simplement à « Continuer avec Google ».
*/
const enAttente = new Map<string, { identite: IdentiteGoogle; expire: number }>()

export function mettreEnAttente(identite: IdentiteGoogle): string {
  const maintenant = Date.now()
  for (const [cle, valeur] of enAttente) {
    if (valeur.expire < maintenant) enAttente.delete(cle)
  }
  const cle = randomBytes(24).toString('base64url')
  enAttente.set(cle, { identite, expire: maintenant + DUREE_SECONDES * 1000 })
  return cle
}

export function lireAttente(cle: string | undefined): IdentiteGoogle | null {
  if (!cle) return null
  const valeur = enAttente.get(cle)
  if (!valeur || valeur.expire < Date.now()) return null
  return valeur.identite
}

export function oublierAttente(cle: string) {
  enAttente.delete(cle)
}
