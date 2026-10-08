/**
 * Firebase Cloud Messaging : les notifications de l'appli Android.
 *
 * L'appli (`mobile/`) affiche le site dans une WebView, et une WebView n'a pas
 * de service de push : les notifications web n'y arrivent jamais. Le
 * téléphone s'abonne donc auprès de Firebase, nous remet son jeton, et c'est
 * à Firebase qu'on confie le message pour lui.
 *
 * Partagé par les deux processus qui préviennent quelqu'un — l'application
 * web (défis, amis, correspondance) et le serveur (rappel du défi du jour) —,
 * d'où sa place ici plutôt qu'en double dans chacun.
 *
 * **Node seulement** (`node:crypto`) : à n'importer que depuis du code serveur.
 * L'index du paquet ne l'exporte pas, pour qu'aucune page ne l'embarque.
 *
 * Aucune dépendance : le jeton d'accès Google est un JWT signé RS256 avec la
 * clé du compte de service, échangé contre un jeton d'une heure — vingt lignes,
 * là où la bibliothèque officielle en apporterait des milliers.
 */

import { createSign } from 'node:crypto'

/** Les trois champs utiles du fichier JSON que Firebase délivre. */
export interface CompteDeService {
  projectId: string
  clientEmail: string
  privateKey: string
}

/**
 * Lit `FCM_COMPTE_SERVICE` : le JSON du compte de service, encodé en base64
 * pour tenir sur une ligne de `.env` — ou tel quel s'il commence par `{`.
 *
 * Rend `null` quand rien n'est configuré, et le dit quand la valeur est là
 * mais illisible : une clé collée de travers ne doit pas passer pour une
 * fonctionnalité simplement désactivée.
 */
export function lireCompteDeService(valeur: string | undefined): CompteDeService | null {
  const brut = valeur?.trim()
  if (!brut) return null
  try {
    const json = brut.startsWith('{') ? brut : Buffer.from(brut, 'base64').toString('utf8')
    const compte = JSON.parse(json) as Record<string, unknown>
    if (
      typeof compte.project_id === 'string' &&
      typeof compte.client_email === 'string' &&
      typeof compte.private_key === 'string'
    ) {
      return {
        projectId: compte.project_id,
        clientEmail: compte.client_email,
        privateKey: compte.private_key,
      }
    }
  } catch {
    // Signalé juste en dessous, avec la même phrase que pour un JSON incomplet.
  }
  console.error('[fcm] FCM_COMPTE_SERVICE illisible : attendu le JSON du compte de service')
  return null
}

/** Ce qu'on annonce, déjà écrit dans la langue du destinataire. */
export interface MessageAppli {
  titre: string
  corps: string
  /** Où aller quand on touche la notification : un chemin du site. */
  url: string
  /**
   * Le fil, qui sert aussi de canal Android : une notification remplace la
   * précédente du même fil, et chaque fil se règle à part dans les paramètres
   * du téléphone.
   */
  fil: string
  /** Combien de temps Firebase garde le message si le téléphone est éteint. */
  ttlSecondes: number
  /** Réveiller le téléphone tout de suite : une invitation expire en cinq minutes. */
  urgent: boolean
}

/** Le corps de la requête `messages:send`, séparé pour être vérifié sans réseau. */
export function corpsFcm(jetonAppareil: string, message: MessageAppli) {
  return {
    message: {
      token: jetonAppareil,
      notification: { title: message.titre, body: message.corps },
      // Remis au site quand on touche la notification : voir
      // `apps/web/src/lib/notificationsAppli.ts`.
      data: { url: message.url, fil: message.fil },
      android: {
        priority: message.urgent ? 'high' : 'normal',
        ttl: `${message.ttlSecondes}s`,
        collapse_key: message.fil,
        notification: { channel_id: message.fil, tag: message.fil },
      },
    },
  }
}

const base64url = (texte: string) => Buffer.from(texte).toString('base64url')

let jetonEnCache: { valeur: string; expire: number; pour: string } | null = null

async function jetonAcces(compte: CompteDeService): Promise<string> {
  if (
    jetonEnCache &&
    jetonEnCache.pour === compte.clientEmail &&
    jetonEnCache.expire > Date.now() + 60_000
  ) {
    return jetonEnCache.valeur
  }

  const maintenant = Math.floor(Date.now() / 1000)
  const entete = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const revendications = base64url(
    JSON.stringify({
      iss: compte.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: maintenant,
      exp: maintenant + 3600,
    }),
  )
  const signature = createSign('RSA-SHA256')
    .update(`${entete}.${revendications}`)
    .sign(compte.privateKey, 'base64url')

  const reponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${entete}.${revendications}.${signature}`,
    }),
  })
  if (!reponse.ok) {
    throw new Error(`[fcm] jeton d'accès refusé par Google : ${reponse.status}`)
  }
  const { access_token, expires_in } = (await reponse.json()) as {
    access_token: string
    expires_in: number
  }
  jetonEnCache = {
    valeur: access_token,
    expire: Date.now() + expires_in * 1000,
    pour: compte.clientEmail,
  }
  return access_token
}

/**
 * Envoie un message à un téléphone.
 *
 * `mort` quand le jeton ne vaut plus rien — appli désinstallée, données
 * effacées, ou jeton d'un autre projet Firebase : l'appelant retire la ligne,
 * comme pour un abonnement web en 404 ou 410. `echec` pour tout le reste, qui
 * peut être passager : on garde la ligne, et on le dit dans le journal.
 */
export async function envoyerFcm(
  compte: CompteDeService,
  jetonAppareil: string,
  message: MessageAppli,
): Promise<'envoye' | 'mort' | 'echec'> {
  try {
    const reponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${compte.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await jetonAcces(compte)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corpsFcm(jetonAppareil, message)),
      },
    )
    if (reponse.ok) return 'envoye'

    const erreur = (await reponse.json().catch(() => null)) as {
      error?: { details?: Array<{ errorCode?: string }> }
    } | null
    const code = erreur?.error?.details?.find((detail) => detail.errorCode)?.errorCode
    if (reponse.status === 404 || code === 'UNREGISTERED' || code === 'SENDER_ID_MISMATCH') {
      return 'mort'
    }
    console.error(`[fcm] ${jetonAppareil.slice(0, 16)}… → ${reponse.status} ${code ?? ''}`)
    return 'echec'
  } catch (erreur) {
    console.error('[fcm] envoi impossible :', erreur)
    return 'echec'
  }
}
