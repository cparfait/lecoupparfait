'use client'

/**
 * Écriture des coups à l'écran.
 *
 * Sept écrans affichent des coups — liste des coups, analyse, mode commenté,
 * leçons, puzzles, explorateur d'ouvertures. Chacun appelait `sanToFrench`
 * directement, si bien qu'ajouter une façon d'écrire obligeait à retrouver les
 * sept endroits et à n'en oublier aucun.
 *
 * Tout passe désormais par ici. La langue et le style viennent des préférences,
 * les écrans se contentent de demander « comment écris-tu ce coup ? ».
 */

import { useCallback } from 'react'
import { describeMoveInWords, localiseSan } from '@coupparfait/core'
import { localeDuContenu } from './i18n/dictionary.ts'
import { usePreferences } from './store/preferences.ts'

/**
 * Rend une fonction d'écriture des coups, accordée aux préférences.
 *
 * ```tsx
 * const san = useSan()
 * <span>{san(move.san)}</span>   // « Cf3 », « Nf3 » ou « ♘f3 »
 * ```
 */
export function useSan(): (san: string) => string {
  // Le cœur écrit les coups en français ou en anglais ; les trente-quatre
  // autres langues de l'interface lisent l'anglais. Voir `localeDuContenu`.
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  const notation = usePreferences((state) => state.notation)

  return useCallback((san: string) => localiseSan(san, locale, notation), [locale, notation])
}

/**
 * Rend une fonction qui explique un coup en français ordinaire.
 *
 * À poser en `title` partout où l'on affiche de la notation : « Tg2+ » n'a
 * aucun sens tant qu'on ne l'a pas apprise, et on l'apprend justement en
 * survolant quelques dizaines de fois.
 *
 * ```tsx
 * const dire = useMoveWords()
 * <span title={dire(move.san)}>{san(move.san)}</span>
 * ```
 */
export function useMoveWords(): (san: string) => string {
  // Le cœur écrit les coups en français ou en anglais ; les trente-quatre
  // autres langues de l'interface lisent l'anglais. Voir `localeDuContenu`.
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  return useCallback((san: string) => describeMoveInWords(san, locale), [locale])
}

/**
 * Même chose, hors composant React.
 *
 * Pour les rares endroits qui composent du texte en dehors du rendu : export
 * PGN, notifications, journal.
 */
export function formatSan(san: string): string {
  const { locale, notation } = usePreferences.getState()
  return localiseSan(san, localeDuContenu(locale), notation)
}
