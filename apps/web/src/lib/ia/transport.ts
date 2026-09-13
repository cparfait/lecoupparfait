'use client'

/**
 * Acheminement des appels vers le fournisseur choisi.
 *
 * Deux chemins, décidés par l'hôte visé et par lui seul :
 *
 *  - **service local** (Ollama, LM Studio, une passerelle sur le réseau
 *    domestique) : `fetch` direct depuis le navigateur. Le serveur n'est
 *    jamais mis dans la boucle — il n'aurait rien à y faire, et bien souvent
 *    il ne saurait même pas joindre la machine de l'utilisateur.
 *  - **service distant** : passage par `/api/ia/…`, parce que les navigateurs
 *    refusent l'appel direct (aucun de ces fournisseurs n'autorise le partage
 *    de ressources entre origines pour ses endpoints de conversation).
 *
 * Ce que ça implique, et qu'il faut dire clairement à l'utilisateur : pour un
 * fournisseur distant, **la clé traverse le serveur de l'instance**. Sur une
 * instance qu'on n'héberge pas soi-même, cela revient à faire confiance à
 * l'hébergeur. Les services locaux, eux, n'exposent la clé à personne.
 */

import type { AIProvider } from './types.ts'

/**
 * Les deux pannes que ce module sait nommer.
 *
 * Un code et non une phrase : le transport est un module pur, appelé hors de tout
 * composant, et ses deux messages restaient donc en français dans les quarante
 * autres langues. C'est `messageErreur`, dans `coach.ts`, qui les traduit — comme
 * il traduit déjà les neuf réponses du fournisseur.
 */
export const PANNES_IA = {
  illisible: 'ia:illisible',
  sansFlux: 'ia:sans-flux',
} as const
import { urlEstLocale } from './hote.ts'

/** Au-delà, on considère que le fournisseur ne répondra plus. */
const DELAI_MS = 120_000

/**
 * Erreur d'appel, portant le code HTTP dans son message.
 *
 * `messageErreur()` s'appuie sur ce format pour traduire un 401 en « ta clé
 * est refusée » plutôt qu'en un bloc de JSON illisible.
 */
function erreurHttp(status: number, corps: string): Error {
  return new Error(`HTTP ${status}: ${corps.slice(0, 400)}`)
}

function estLocal(provider: AIProvider, url: string): boolean {
  return provider.local === true || urlEstLocale(url)
}

async function fetchAvecDelai(url: string, init: RequestInit): Promise<Response> {
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_MS)
  try {
    return await fetch(url, { ...init, signal: controleur.signal })
  } finally {
    clearTimeout(minuterie)
  }
}

/** Appel direct, réservé aux services qui tournent sur la machine locale. */
async function appelDirect(
  url: string,
  methode: 'GET' | 'POST',
  headers: Array<[string, string]>,
  body?: unknown,
): Promise<Response> {
  return fetchAvecDelai(url, {
    method: methode,
    headers: Object.fromEntries(headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** Appel relayé par l'instance, pour les fournisseurs distants. */
async function appelRelaye(
  route: 'chat' | 'modeles',
  providerId: string,
  url: string,
  headers: Array<[string, string]>,
  body?: unknown,
): Promise<Response> {
  return fetchAvecDelai(`/api/ia/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, url, headers, body }),
  })
}

async function lireJson(reponse: Response): Promise<unknown> {
  const texte = await reponse.text()
  if (!reponse.ok) throw erreurHttp(reponse.status, texte)
  try {
    return JSON.parse(texte) as unknown
  } catch {
    throw new Error(PANNES_IA.illisible)
  }
}

/** Appel de conversation, sans flux. Renvoie la réponse brute du fournisseur. */
export async function appelChat(
  provider: AIProvider,
  url: string,
  headers: Array<[string, string]>,
  body: unknown,
): Promise<unknown> {
  const reponse = estLocal(provider, url)
    ? await appelDirect(url, 'POST', headers, body)
    : await appelRelaye('chat', provider.id, url, headers, body)
  return lireJson(reponse)
}

/** Liste des modèles. Renvoie la réponse brute du fournisseur. */
export async function appelModeles(
  provider: AIProvider,
  url: string,
  headers: Array<[string, string]>,
): Promise<unknown> {
  const reponse = estLocal(provider, url)
    ? await appelDirect(url, 'GET', headers)
    : await appelRelaye('modeles', provider.id, url, headers)
  return lireJson(reponse)
}

/**
 * Appel de conversation **en flux** : les fragments arrivent au fil de l'eau.
 *
 * Le découpage en lignes est fait ici, une fois pour toutes ; c'est ensuite le
 * `parseStreamChunk` de chaque fournisseur qui sait lire une ligne — `data: …`
 * pour les flux SSE, un objet JSON complet par ligne pour Ollama. Le relais se
 * contente de recopier les octets, il ne les interprète pas.
 */
export async function appelChatFlux(
  provider: AIProvider,
  url: string,
  headers: Array<[string, string]>,
  body: unknown,
  onFragment: (texte: string) => void,
): Promise<string> {
  const reponse = estLocal(provider, url)
    ? await appelDirect(url, 'POST', headers, body)
    : await appelRelaye('chat', provider.id, url, headers, body)

  if (!reponse.ok) throw erreurHttp(reponse.status, await reponse.text())
  if (!reponse.body) throw new Error(PANNES_IA.sansFlux)

  const lecteur = reponse.body.getReader()
  const decodeur = new TextDecoder()
  let tampon = ''
  let complet = ''

  const traiter = (ligne: string) => {
    const texte = provider.parseStreamChunk(ligne)
    if (texte) {
      complet += texte
      onFragment(texte)
    }
  }

  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    tampon += decodeur.decode(value, { stream: true })

    // On ne traite que les lignes complètes : un fragment reçu à cheval sur
    // deux paquets réseau donnerait un JSON tronqué, donc un fragment perdu.
    let saut = tampon.indexOf('\n')
    while (saut !== -1) {
      traiter(tampon.slice(0, saut).trim())
      tampon = tampon.slice(saut + 1)
      saut = tampon.indexOf('\n')
    }
  }

  // Dernière ligne éventuelle, si le flux se termine sans retour à la ligne.
  if (tampon.trim()) traiter(tampon.trim())

  return complet
}
