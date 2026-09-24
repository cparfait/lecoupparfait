/**
 * Les messages du tchat d'une partie en direct, et la traduction des annonces
 * du salon.
 *
 * Séparé de `useLiveGame.ts` pour être lisible sans React ni socket : c'est de
 * la donnée et une fonction, que `test/annonces-salon.test.ts` exerce.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface ChatMessage {
  from: string
  text: string
  at: number
  system?: boolean
  /** Ce qu'annonce un message système — voir `EvenementDuSalon` côté serveur. */
  code?: string
  /** Le joueur concerné par l'annonce. */
  name?: string
}

/**
 * Les annonces du salon, par code.
 *
 * Le serveur les écrivait en français, et le tchat les affichait telles
 * quelles dans toutes les langues. Il envoie maintenant un code et un nom. Un
 * message sans code — relu d'une partie enregistrée avant ce changement — ou
 * d'un code inconnu, d'un serveur plus récent que la page, garde son texte.
 */
const CLES_D_ANNONCE: Record<string, TranslationKey> = {
  joined: 'systeme.salon.joined',
  disconnected: 'systeme.salon.disconnected',
  declined: 'systeme.salon.declined',
  left: 'systeme.salon.left',
  drawDeclined: 'systeme.salon.drawDeclined',
  takeback: 'systeme.salon.takeback',
  hint: 'systeme.salon.hint',
  noShow: 'systeme.salon.noShow',
  notReconnected: 'systeme.salon.notReconnected',
  idleAborted: 'systeme.salon.idleAborted',
  aborted: 'systeme.salon.aborted',
  restarting: 'systeme.salon.restarting',
}

/** Le texte à afficher pour un message du tchat, traduit s'il vient du salon. */
export function texteDuMessage(
  t: (cle: TranslationKey, vars?: Record<string, string | number>) => string,
  message: ChatMessage,
): string {
  if (!message.system || !message.code) return message.text
  // Un indice demandé par un joueur sans siège connu : pas de nom à citer.
  if (message.code === 'hint' && !message.name) return t('systeme.salon.hintSomeone')
  const cle = CLES_D_ANNONCE[message.code]
  return cle ? t(cle, { name: message.name ?? '' }) : message.text
}
