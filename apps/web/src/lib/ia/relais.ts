/**
 * Garde-fous du relais d'IA — code serveur uniquement.
 *
 * Le relais existe pour une raison unique : les navigateurs refusent d'appeler
 * directement les API des fournisseurs distants. Il ne doit donc rien faire de
 * plus que recopier une requête vers une poignée d'adresses connues.
 *
 * Sans ces vérifications, la route deviendrait un proxy ouvert : n'importe qui
 * pourrait s'en servir pour faire émettre à notre serveur des requêtes vers le
 * réseau interne de l'hébergeur — base de données, service d'analyse,
 * métadonnées d'instance cloud. C'est la faille dite « SSRF », et elle est
 * d'autant plus facile à introduire ici que le relais est, par nature, une
 * fonction qui prend une URL en paramètre.
 *
 * Deux règles, donc :
 *   1. un fournisseur intégré ne peut viser que sa propre origine ;
 *   2. un fournisseur personnalisé ne peut viser qu'une adresse publique,
 *      vérifiée par résolution DNS — un nom public peut très bien pointer vers
 *      une adresse privée.
 *
 * Et deux pièges que ces règles ne couvrent pas seules, d'où `relayer()` :
 *   - **la redirection** : `fetch` suivait les `3xx`, si bien qu'un serveur
 *     public vérifié pouvait répondre `302 → http://postgres:5432` et le
 *     relais y allait, puis rendait le corps au client ;
 *   - **le rebinding DNS** : un nom résolu en adresse publique au contrôle
 *     peut l'être en adresse privée une milliseconde plus tard, au moment de
 *     la connexion. On revérifie donc l'adresse *effectivement* jointe.
 */

import { lookup as resoudreRappel, type LookupAddress, type LookupOptions } from 'node:dns'
import { lookup } from 'node:dns/promises'
import { request as requeteHttp, type IncomingMessage } from 'node:http'
import { request as requeteHttps } from 'node:https'
import { Readable } from 'node:stream'
import { PROVIDERS } from './providers/index.ts'
import { estAdresseLocale, estHoteLocal } from './hote.ts'
import type { Traducteur } from '@/lib/i18n/resoudre.ts'

/**
 * Origines autorisées, déduites des fournisseurs eux-mêmes.
 *
 * On ne recopie pas les domaines à la main : on demande à chaque fournisseur
 * l'URL qu'il utiliserait. Ajouter un fournisseur dans `providers/` suffit donc
 * à l'autoriser ici, et il est impossible que les deux listes divergent.
 */
const ORIGINES_INTEGREES: Map<string, Set<string>> = new Map(
  PROVIDERS.map((provider) => {
    const origines = new Set<string>()
    for (const url of [
      provider.chatUrl('modele', 'cle'),
      provider.streamChatUrl('modele', 'cle'),
      provider.modelsUrl('cle'),
    ]) {
      try {
        origines.add(new URL(url).origin)
      } catch {
        // Une URL malformée dans un fournisseur : on ne l'autorise pas, et le
        // fournisseur sera simplement inutilisable via le relais.
      }
    }
    return [provider.id, origines] as const
  }),
)

export interface Refus {
  message: string
  status: number
}

/**
 * Vérifie qu'on a le droit de relayer vers cette URL. `null` = autorisé.
 *
 * L'ordre des contrôles compte : on écarte d'abord ce qui est structurellement
 * inacceptable (protocole, hôte local) avant de faire la moindre résolution
 * DNS, qui est la seule étape coûteuse.
 */
export async function verifierCible(
  providerId: unknown,
  url: unknown,
  t: Traducteur,
): Promise<Refus | null> {
  if (typeof providerId !== 'string' || typeof url !== 'string' || !providerId || !url) {
    return { message: t('prompt.relayIncomplete'), status: 400 }
  }

  let cible: URL
  try {
    cible = new URL(url)
  } catch {
    return { message: 'Adresse illisible.', status: 400 }
  }

  if (cible.protocol !== 'https:' && cible.protocol !== 'http:') {
    return { message: t('prompt.relaySchemeOnly'), status: 400 }
  }

  // Un service local se joint depuis le navigateur, jamais depuis le serveur :
  // le relais n'a donc aucune raison légitime de viser une adresse privée.
  if (estHoteLocal(cible.hostname)) {
    return {
      message: 'Un service local s’appelle depuis ton navigateur, pas par le serveur.',
      status: 400,
    }
  }

  const integre = ORIGINES_INTEGREES.get(providerId)
  if (integre) {
    if (!integre.has(cible.origin)) {
      return { message: t('prompt.relayWrongProvider'), status: 400 }
    }
    return null
  }

  // Fournisseur personnalisé : l'utilisateur choisit l'adresse, on ne peut donc
  // pas la comparer à une liste. On vérifie ce qui reste vérifiable — qu'elle
  // sort bien sur Internet.
  if (!providerId.startsWith('custom-')) {
    return { message: 'Fournisseur inconnu.', status: 400 }
  }

  try {
    const adresses = await lookup(cible.hostname, { all: true })
    if (adresses.length === 0) {
      return { message: t('prompt.relayUnknownHost'), status: 400 }
    }
    if (adresses.some((entree) => estAdresseLocale(entree.address))) {
      return { message: t('prompt.relayPrivateNetwork'), status: 400 }
    }
  } catch {
    return { message: t('prompt.relayUnknownHost'), status: 400 }
  }

  return null
}

/**
 * Normalise les en-têtes reçus du navigateur.
 *
 * On ne recopie pas aveuglément : un en-tête `Host` ou `Cookie` glissé dans la
 * liste partirait chez le fournisseur avec la session de l'utilisateur.
 */
export function nettoyerEntetes(brut: unknown): Array<[string, string]> {
  if (!Array.isArray(brut)) return []
  const interdits = new Set(['host', 'cookie', 'set-cookie', 'connection', 'content-length'])
  const entetes: Array<[string, string]> = []
  for (const entree of brut) {
    if (!Array.isArray(entree) || entree.length !== 2) continue
    const [nom, valeur] = entree
    if (typeof nom !== 'string' || typeof valeur !== 'string') continue
    if (interdits.has(nom.toLowerCase())) continue
    entetes.push([nom, valeur])
  }
  return entetes
}

// ─────────────────────────────────────────────────────────────────────────────
//  L'appel sortant
// ─────────────────────────────────────────────────────────────────────────────

/** L'adresse jointe au moment de la connexion s'est révélée privée. */
export class CibleRefusee extends Error {
  constructor() {
    super('Adresse privée refusée à la connexion.')
    this.name = 'CibleRefusee'
  }
}

/**
 * Résolution DNS de la connexion elle-même, qui refuse les adresses privées.
 *
 * C'est elle qui ferme le rebinding : `verifierCible` résout le nom une
 * première fois, pour renvoyer un refus lisible ; mais la connexion refait sa
 * propre résolution, et c'est **celle-ci** qui décide de l'adresse jointe. Le
 * contrôle doit donc vivre ici, sans quoi il porte sur une autre réponse que
 * celle qu'on utilise.
 *
 * Les adresses IP écrites en toutes lettres ne passent pas par là — Node ne
 * résout pas ce qui n'a pas besoin de l'être — et c'est `estHoteLocal`, dans
 * `verifierCible`, qui les écarte.
 */
function resoudreSansReseauPrive(
  hote: string,
  options: LookupOptions,
  rappel: (
    erreur: NodeJS.ErrnoException | null,
    adresse: string | LookupAddress[],
    famille?: number,
  ) => void,
): void {
  resoudreRappel(hote, { ...options, all: true }, (erreur, adresses) => {
    if (erreur) return rappel(erreur, '')
    const premiere = adresses[0]
    if (!premiere || adresses.some((entree) => estAdresseLocale(entree.address))) {
      return rappel(new CibleRefusee(), '')
    }
    if (options.all) return rappel(null, adresses)
    rappel(null, premiere.address, premiere.family)
  })
}

/** Statuts qui n'ont jamais de corps : `new Response` refuse qu'on leur en donne un. */
const SANS_CORPS = new Set([204, 205, 304])

/**
 * Émet la requête vers le fournisseur, **sans suivre les redirections**, en
 * refusant à la connexion toute adresse privée.
 *
 * On passe par `node:http(s)` plutôt que par `fetch` parce que `fetch` ne
 * permet pas de brancher sa propre résolution DNS (il faudrait le paquet
 * `undici`, que l'application n'embarque pas), donc pas de fermer le
 * rebinding. `http.request` ne suit jamais de redirection : une `3xx` revient
 * telle quelle, et c'est à l'appelant de la refuser (`estRedirection`).
 *
 * La réponse est rendue sous forme de `Response`, pour que les routes gardent
 * le même code qu'avec `fetch`. `Accept-Encoding: identity` parce que, à la
 * différence de `fetch`, `http.request` ne décompresse rien : un corps gzip
 * serait relayé tel quel sous un `Content-Type` qui ment.
 */
export function relayer(
  url: string,
  init: {
    method: 'GET' | 'POST'
    entetes: Array<[string, string]>
    corps?: string
    signal: AbortSignal
  },
): Promise<Response> {
  const cible = new URL(url)
  const entetes: Record<string, string> = {}
  for (const [nom, valeur] of init.entetes) {
    if (nom.toLowerCase() !== 'accept-encoding') entetes[nom] = valeur
  }
  entetes['accept-encoding'] = 'identity'
  if (init.corps !== undefined) {
    entetes['content-length'] = String(Buffer.byteLength(init.corps))
    // `fetch` en posait un d'office ; `http.request` non. Le corps est
    // toujours du JSON, recopié par la route.
    if (!Object.keys(entetes).some((nom) => nom.toLowerCase() === 'content-type')) {
      entetes['content-type'] = 'application/json'
    }
  }

  const envoyer = cible.protocol === 'https:' ? requeteHttps : requeteHttp
  return new Promise((resoudre, rejeter) => {
    const requete = envoyer(
      cible,
      {
        method: init.method,
        headers: entetes,
        signal: init.signal,
        lookup: resoudreSansReseauPrive,
      },
      (reponse: IncomingMessage) => {
        // `Response` n'accepte que 200 à 599 : un statut hors de cette plage
        // lèverait ici, dans un rappel où personne ne rattraperait l'erreur.
        const brut = reponse.statusCode ?? 0
        const status = brut >= 200 && brut <= 599 ? brut : 502
        const entetesReponse = new Headers()
        for (const [nom, valeur] of Object.entries(reponse.headers)) {
          if (valeur === undefined) continue
          for (const une of Array.isArray(valeur) ? valeur : [valeur]) {
            try {
              entetesReponse.append(nom, une)
            } catch {
              // Un en-tête que `Headers` juge invalide : on ne le relaie pas.
            }
          }
        }
        if (SANS_CORPS.has(status)) {
          reponse.resume()
          resoudre(new Response(null, { status, headers: entetesReponse }))
          return
        }
        const corps = Readable.toWeb(reponse) as unknown as ReadableStream<Uint8Array>
        resoudre(new Response(corps, { status, headers: entetesReponse }))
      },
    )
    requete.on('error', rejeter)
    requete.end(init.corps)
  })
}

/** Vrai pour une redirection, que le relais ne suit jamais. */
export function estRedirection(status: number): boolean {
  return status >= 300 && status < 400
}
