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
import { localiseSan } from '@coupparfait/core'
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
  const locale = usePreferences((state) => state.locale)
  const notation = usePreferences((state) => state.notation)

  return useCallback((san: string) => localiseSan(san, locale, notation), [locale, notation])
}

/**
 * Même chose, hors composant React.
 *
 * Pour les rares endroits qui composent du texte en dehors du rendu : export
 * PGN, notifications, journal.
 */
export function formatSan(san: string): string {
  const { locale, notation } = usePreferences.getState()
  return localiseSan(san, locale, notation)
}
