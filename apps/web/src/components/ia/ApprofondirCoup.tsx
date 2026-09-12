'use client'

/**
 * Pont entre un commentaire calculé et la question libre.
 *
 * Isolé dans son propre composant parce qu'il se greffe partout où un
 * commentaire est déjà affiché — partie contre l'ordinateur, partie locale,
 * panneau « Pourquoi ? » — et qu'il ne doit surtout pas relancer d'analyse :
 * il consomme celle qui existe. C'est aussi ce qui garantit que le modèle et
 * le joueur regardent exactement les mêmes chiffres.
 *
 * Rend `null` tant que l'assistant n'est pas configuré, ce qui est le cas par
 * défaut : sur une installation ordinaire, ce composant n'existe pas à
 * l'écran.
 */

import type { Commentary } from '@/components/game/LiveCommentary.tsx'
import { QuestionLibre } from './QuestionLibre.tsx'
import { contexteDuCoup, questionApprofondir } from '@/lib/ia/contexte.ts'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

export function ApprofondirCoup({
  commentary,
  openingName,
}: {
  commentary: Commentary | null
  openingName?: string | null
}) {
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  const notation = usePreferences((state) => state.notation)

  if (!commentary) return null

  return (
    <QuestionLibre
      contexte={contexteDuCoup(
        {
          san: commentary.san,
          color: commentary.color,
          quality: commentary.quality,
          scoreBefore: commentary.scoreBefore,
          scoreAfter: commentary.scoreAfter,
          fenAfter: commentary.fenAfter,
          headline: commentary.headline,
          body: commentary.body,
          alternatives: commentary.alternatives,
        },
        { locale, notation, ouverture: openingName },
      )}
      questionParDefaut={questionApprofondir(locale)}
      suggestions={suggestionsPour(commentary.quality, locale)}
    />
  )
}

/**
 * Questions proposées, choisies selon le verdict du coup.
 *
 * Après une gaffe, la question utile n'est pas la même qu'après un bon coup :
 * dans un cas on veut comprendre ce qu'on a manqué, dans l'autre pourquoi ça
 * marchait. Proposer les deux à chaque fois reviendrait à n'en proposer
 * aucune.
 */
function suggestionsPour(quality: Commentary['quality'], locale: 'fr' | 'en'): string[] {
  const mauvais = quality === 'blunder' || quality === 'mistake' || quality === 'miss'

  if (locale === 'en') {
    return mauvais
      ? ['What should I have seen?', 'What does my opponent threaten now?']
      : ['What is the plan from here?', 'What should I watch out for?']
  }

  return mauvais
    ? ['Qu’est-ce que j’aurais dû voir ?', 'Que menace mon adversaire maintenant ?']
    : ['Quel est le plan à partir d’ici ?', 'À quoi dois-je faire attention ?']
}
