'use client'

/**
 * Sommaire de « Progresser ».
 *
 * La rubrique réunit ce que « Apprendre » et « S'entraîner » se partageaient,
 * plus la carrière : treize destinations. Les montrer toutes en grand aurait
 * refait le mur de cartes qu'on voulait quitter — chaque page répond à une
 * question, et le reste attend qu'on le demande.
 *
 * Six portes pleines, donc, dans l'ordre de la question qu'on se pose en
 * arrivant : d'abord « où j'en suis ? » — le palier, et le test qui le mesure,
 * c'est la porte d'entrée —, puis « qu'est-ce que je fais maintenant ? » —
 * une leçon, un chapitre de carrière, des positions. Le reste, qu'on consulte
 * plus qu'on ne pratique, tient dans une liste compacte, lue dans
 * `navigation.ts` : une destination ajoutée à la rubrique y apparaît d'elle-même.
 */

import { Check, Gauge, GraduationCap, Puzzle, Target, Trophy, Zap } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { Chip, TitreDePage, TitreDeSection } from '@/components/ui/index.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { queteFaite } from '@/lib/daily/quotidien.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { NOMBRE_DE_LECONS } from '@/lib/lessons/compte.ts'
import { SECTIONS } from '@/lib/navigation.ts'

const SECTION = SECTIONS.find((s) => s.id === 'progresser')
const TEINTE = SECTION?.teinte

const PORTES = [
  {
    href: '/apprendre/palier',
    icon: Target,
    titreKey: 'progress.palier',
    phraseKey: 'progress.palierBlurb',
    detailKey: 'progress.palierDetail',
  },
  {
    href: '/apprendre/niveau',
    icon: Gauge,
    titreKey: 'progress.levelTest',
    phraseKey: 'progress.levelTestBlurb',
    detailKey: 'progress.levelTestDetail',
  },
  {
    href: '/apprendre',
    icon: GraduationCap,
    titreKey: 'progress.lessons',
    phraseKey: 'progress.lessonsBlurb',
    detailKey: 'progress.lessonsDetail',
  },
  {
    href: '/carriere',
    icon: Trophy,
    titreKey: 'progress.career',
    phraseKey: 'progress.careerBlurb',
    detailKey: 'progress.careerDetail',
  },
  {
    href: '/puzzles',
    icon: Puzzle,
    titreKey: 'progress.puzzles',
    phraseKey: 'progress.puzzlesBlurb',
    detailKey: 'progress.puzzlesDetail',
  },
  {
    href: '/puzzles?defi=1',
    icon: Zap,
    titreKey: 'progress.daily',
    phraseKey: 'progress.dailyBlurb',
    detailKey: 'progress.dailyDetail',
  },
] as const

const EN_GRAND = new Set<string>(PORTES.map((porte) => porte.href))

/** Le reste de la rubrique, dans l'ordre de `navigation.ts`. */
const EN_LISTE = (SECTION?.entrees ?? []).filter((entree) => !EN_GRAND.has(entree.href))

export default function ProgresserPage() {
  const t = useT()
  const { etat: journee } = useQuotidien()
  // `null` tant que la journée n'est pas lue : on n'annonce pas « relevé » à
  // quelqu'un qui ne l'a pas fait, le temps d'un rendu.
  const defiFait = journee != null && queteFaite(journee, 'defi')

  return (
    <div className="page">
      <TitreDePage intro={t('progress.intro')}>{t('progress.title')}</TitreDePage>

      <div className="grille-cartes">
        {PORTES.map(({ href, icon, titreKey, phraseKey, detailKey }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
            titre={t(titreKey)}
            phrase={t(phraseKey)}
            detail={t(detailKey, { n: NOMBRE_DE_LECONS })}
            badge={
              href.includes('defi=1') && defiFait ? (
                <Chip tone="success">
                  <Check size={11} aria-hidden />
                  {t('progress.dailyDone')}
                </Chip>
              ) : undefined
            }
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>

      {EN_LISTE.length > 0 && (
        <section className="mt-10">
          <TitreDeSection>{t('progress.moreTitle')}</TitreDeSection>
          <div className="grille-cartes">
            {EN_LISTE.map((entree) => (
              <CarteDestination
                key={entree.href}
                href={entree.href}
                icon={entree.icon}
                teinte={TEINTE}
                titre={t(entree.labelKey)}
                phrase={entree.hintKey ? t(entree.hintKey, entree.hintVars) : undefined}
                compacte
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
