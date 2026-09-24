/**
 * Les textes de la carrière, tirés du dictionnaire.
 *
 * Le cœur écrivait en français le titre de chaque temps d'un chapitre, le
 * bouton de la prochaine étape et les lignes du détail des points — « Encore 3
 * puzzles », « victoires en duel » —, et l'écran les affichait tels quels dans
 * toutes les langues. Il ne rend plus que la donnée (`cle`, `total`, `nombre`) ;
 * la phrase, accordée au nombre, se compose ici.
 *
 * Fonctions pures, le traducteur en argument : la page de carrière et l'accueil
 * les appellent tous deux.
 */

import type { Chapitre, Etape, LigneXp, Progression, prochaineEtape } from '@coupparfait/core'
import type { Traducteur } from '@/lib/i18n/resoudre.ts'

export function titreDEtape(t: Traducteur, etape: Etape): string {
  return t(`career2.steps.${etape.cle}`)
}

export function detailDEtape(t: Traducteur, etape: Etape): string {
  switch (etape.cle) {
    case 'lecon':
      return t('career2.steps.leconDetail')
    case 'puzzles':
      return t(etape.total > 1 ? 'career2.steps.puzzlesDetail' : 'career2.steps.puzzlesDetailOne', {
        n: etape.total,
      })
    case 'duel':
      return t(etape.total > 1 ? 'career2.steps.duelDetail' : 'career2.steps.duelDetailOne', {
        n: etape.total,
      })
    case 'bilan':
      return ''
  }
}

/** Le bouton de la prochaine étape : il dit ce qui reste, pas seulement où aller. */
export function libelleDeSuite(
  t: Traducteur,
  suite: NonNullable<ReturnType<typeof prochaineEtape>>,
  chapitre: Chapitre,
  progression: Progression,
): string {
  switch (suite.cle) {
    case 'puzzles': {
      const reste = chapitre.puzzles - progression.puzzlesDone
      if (reste === chapitre.puzzles) return t('career2.nextPuzzles')
      return t(reste > 1 ? 'career2.morePuzzles' : 'career2.morePuzzlesOne', { n: reste })
    }
    case 'duel':
      return t(progression.winsInChapter === 0 ? 'career2.nextDuel' : 'career2.moreDuel')
    default:
      return t('career2.nextLesson')
  }
}

export function libelleDeLigneXp(t: Traducteur, ligne: LigneXp): string {
  return t(ligne.nombre > 1 ? `career2.xpLines.${ligne.cle}` : `career2.xpLines.${ligne.cle}One`)
}
