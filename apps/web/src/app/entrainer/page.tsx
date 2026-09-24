'use client'

/**
 * Sommaire de l'entraînement.
 *
 * Quatre écrans qui travaillent la même matière — six millions de positions
 * notées — mais pas la même compétence : les puzzles apprennent à *chercher*,
 * la manche chronométrée à *reconnaître*, le défi du jour à *revenir*. Le
 * quatrième n'apprend rien et c'est son rôle : il **mesure**. Les positions de
 * Lichess portent leur propre cote, établie sur des millions de tentatives, ce
 * qui en fait le seul instrument calibré dont l'application dispose.
 *
 * Quatre portes de la même forme, dans la teinte de la rubrique.
 *
 * La page n'est plus la porte d'une rubrique : « S'entraîner » a rejoint
 * « Progresser », dont `/progresser` est le sommaire. Elle reste ouverte pour
 * les liens qui y mènent encore, et son lien de retour remonte à la rubrique.
 */

import { Check, Gauge, Puzzle, Timer, Zap } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { Chip, TitreDePage } from '@/components/ui/index.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { queteFaite } from '@/lib/daily/quotidien.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { SECTIONS } from '@/lib/navigation.ts'

const TEINTE = SECTIONS.find((s) => s.id === 'progresser')?.teinte

const EXERCICES = [
  {
    href: '/puzzles',
    icon: Puzzle,
    titreKey: 'train.puzzles',
    phraseKey: 'train.puzzlesBlurb',
    detailKey: 'train.puzzlesDetail',
  },
  {
    href: '/puzzles/rush',
    icon: Timer,
    titreKey: 'train.rush',
    phraseKey: 'train.rushBlurb',
    detailKey: 'train.rushDetail',
  },
  {
    href: '/puzzles?defi=1',
    icon: Zap,
    titreKey: 'train.daily',
    phraseKey: 'train.dailyBlurb',
    detailKey: 'train.dailyDetail',
  },
  // Le test de niveau est rangé ici en plus de « Apprendre », et ce n'est pas
  // un doublon : il travaille la même matière que les trois autres — les
  // positions notées — et c'est depuis cet écran qu'on se demande « à quel
  // niveau je devrais m'entraîner ? ». Il ne touche à aucun classement.
  {
    href: '/apprendre/niveau',
    icon: Gauge,
    titreKey: 'train.levelTest',
    phraseKey: 'train.levelTestBlurb',
    detailKey: 'train.levelTestDetail',
  },
] as const

export default function EntrainementPage() {
  const t = useT()
  const { etat: journee } = useQuotidien()
  // `null` tant que la journée n'est pas lue : on n'annonce pas « déjà relevé »
  // à quelqu'un qui ne l'a pas fait, le temps d'un rendu.
  const defiFait = journee != null && queteFaite(journee, 'defi')

  return (
    <div className="page">
      <TitreDePage
        retour={{ href: '/progresser', label: t('nav.progress') }}
        intro={t('train.intro')}
      >
        {t('train.title')}
      </TitreDePage>

      <div className="grille-cartes">
        {EXERCICES.map(({ href, icon, titreKey, phraseKey, detailKey }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            // Une seule teinte : le test de niveau prenait celle d'« Apprendre »
            // pour dire qu'il menait ailleurs, mais les deux rubriques n'en
            // font plus qu'une.
            teinte={TEINTE}
            titre={t(titreKey)}
            phrase={t(phraseKey)}
            detail={t(detailKey)}
            // Le défi relevé se dit ici plutôt que sur la position : on le
            // découvrait en arrivant devant l'échiquier, une fois le geste fait.
            badge={
              href.includes('defi=1') && defiFait ? (
                <Chip tone="success">
                  <Check size={11} aria-hidden />
                  {t('train.dailyDone')}
                </Chip>
              ) : undefined
            }
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
