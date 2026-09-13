'use client'

/**
 * Service de conversation avec le fournisseur choisi.
 *
 * Trois entrées seulement : poser une question, poser une question en flux, et
 * vérifier que la configuration tient debout. Tout ce qui touche au format du
 * fournisseur est déjà réglé dans `providers/` ; ici on ne s'occupe que du
 * dialogue et de la traduction des échecs en messages lisibles.
 */

import type { Locale } from '@coupparfait/core'
import type { useT } from '@/lib/i18n/index.tsx'
import type { AIMessage, AIProvider } from './types.ts'
import { appelChat, appelChatFlux } from './transport.ts'
import { systemPrompt } from './prompts.ts'

/**
 * Traduit une erreur d'appel en une phrase qui dit quoi faire.
 *
 * Sans cette couche, l'utilisateur voit le JSON brut du fournisseur et n'a
 * aucun moyen de savoir si le problème vient de sa clé, de son crédit, du
 * modèle qu'il a choisi ou de sa connexion — quatre causes, quatre gestes
 * différents.
 *
 * `t` est passé en argument : le module est une fonction pure appelée depuis
 * un `catch`, et `useT` est un crochet. Sans lui, les neuf phrases de ce
 * traducteur restaient en français dans les quarante autres langues.
 */
export function messageErreur(erreur: unknown, t: ReturnType<typeof useT>): string {
  const message = erreur instanceof Error ? erreur.message : String(erreur)

  // Modèle inconnu, retiré, ou hors du périmètre de la clé. Les fournisseurs
  // répondent 404, parfois 400 avec un libellé explicite. Sans ce cas, rien
  // n'indique qu'il faut simplement changer de modèle.
  if (
    /no longer available|not found for API version|model.*(not found|does not exist)/i.test(message)
  ) {
    return t('parts.iaModelUnavailable')
  }

  const code = /HTTP (\d{3})/.exec(message)?.[1]
  if (code === '401' || code === '403') {
    return t('parts.iaKeyRefused')
  }
  if (code === '402') {
    return t('parts.iaOutOfCredit')
  }
  if (code === '404') {
    return t('parts.iaNoSuchModel')
  }
  if (code === '429') {
    return t('parts.iaTooMany')
  }
  if (code && code.startsWith('5')) {
    return t('parts.iaServerError', { code })
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return t('parts.iaUnreachable')
  }
  if (/abort/i.test(message)) {
    return t('parts.iaTimeout')
  }

  return message
}

/** Une question, une réponse. Le tout d'un bloc. */
export async function demander(options: {
  provider: AIProvider
  model: string
  apiKey: string
  locale: Locale
  messages: AIMessage[]
  maxTokens: number
}): Promise<string> {
  const { provider, model, apiKey, locale, messages, maxTokens } = options
  const complet: AIMessage[] = [{ role: 'system', content: systemPrompt(locale) }, ...messages]
  const brut = await appelChat(
    provider,
    provider.chatUrl(model, apiKey),
    provider.buildHeaders(apiKey),
    provider.buildBody(complet, model, maxTokens),
  )
  return provider.parseResponse(brut)
}

/**
 * Même chose, mais la réponse s'écrit au fur et à mesure.
 *
 * On préfère le flux dès qu'il y a quelqu'un devant l'écran : trois secondes
 * de page figée se ressentent comme une panne, alors que les mêmes trois
 * secondes avec du texte qui arrive se ressentent comme une réflexion.
 */
export async function demanderEnFlux(options: {
  provider: AIProvider
  model: string
  apiKey: string
  locale: Locale
  messages: AIMessage[]
  maxTokens: number
  onFragment: (texte: string) => void
}): Promise<string> {
  const { provider, model, apiKey, locale, messages, maxTokens, onFragment } = options
  const complet: AIMessage[] = [{ role: 'system', content: systemPrompt(locale) }, ...messages]
  return appelChatFlux(
    provider,
    provider.streamChatUrl(model, apiKey),
    provider.buildHeaders(apiKey),
    provider.buildBody(complet, model, maxTokens, true),
    onFragment,
  )
}

/**
 * Vérifie la configuration par un appel réel, très court.
 *
 * Un simple appel à la liste des modèles ne prouverait pas grand-chose : il
 * passe parfois alors que la conversation échoue, parce que le modèle choisi
 * n'est pas accessible à cette clé. On envoie donc une vraie question.
 */
export async function testerConnexion(
  options: {
    provider: AIProvider
    model: string
    apiKey: string
  },
  t: ReturnType<typeof useT>,
): Promise<{ ok: boolean; erreur?: string }> {
  const { provider, model, apiKey } = options
  if (!model) return { ok: false, erreur: t('parts.iaPickModel') }
  if (provider.needsKey && !apiKey) return { ok: false, erreur: t('parts.iaEnterKey') }

  try {
    // Un appel qui aboutit suffit à valider la clé, le modèle et le réseau —
    // même si la sortie est vide, ce qui arrive avec les modèles qui
    // réfléchissent sur un budget aussi court. On ne juge donc pas le contenu.
    await appelChat(
      provider,
      provider.chatUrl(model, apiKey),
      provider.buildHeaders(apiKey),
      provider.buildBody([{ role: 'user', content: 'Réponds par le seul mot : OK' }], model, 16),
    )
    return { ok: true }
  } catch (erreur) {
    return { ok: false, erreur: messageErreur(erreur, t) }
  }
}
