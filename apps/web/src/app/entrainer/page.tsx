'use client'

/**
 * Sommaire de l'entraînement.
 *
 * La rubrique contient trois écrans qui travaillent la même matière — six
 * millions de positions notées — mais pas la même compétence : les puzzles
 * apprennent à *chercher*, la manche chronométrée à *reconnaître*, le défi du
 * jour à *revenir*. Rien ne le disait : « S'entraîner » ouvrait directement une
 * position, et sur téléphone l'onglet du bas s'appelait « Puzzles » et menait
 * au même endroit. Les deux autres n'existaient que dans un menu déroulant
 * qu'on n'a pas sur un doigt.
 *
 * Trois portes de taille égale, donc, sur le modèle de « Jouer » : c'est la
 * même page sur les deux tailles d'écran, et elle est la première chose que la
 * rubrique a à dire.
 */

import Link from 'next/link'
import { ArrowRight, Check, Puzzle, Timer, Zap } from 'lucide-react'
import { Chip } from '@/components/ui/index.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { queteFaite } from '@/lib/daily/quotidien.ts'

const EXERCICES = [
  {
    href: '/puzzles',
    icon: Puzzle,
    titre: 'Puzzles',
    phrase:
      'Une position, un coup à trouver. Le niveau suit le tien, et une erreur ne ferme pas l’exercice.',
    detail: '6 millions de positions · 12 thèmes · classement personnel',
    accent: 'var(--accent-3)',
  },
  {
    href: '/puzzles/rush',
    icon: Timer,
    titre: 'Puzzle rush',
    phrase:
      'Le plus de positions possible avant la fin du temps. On ne réfléchit plus, on reconnaît.',
    detail: '3 minutes, 5 minutes ou survie · trois erreurs et la manche s’arrête',
    accent: 'var(--accent)',
  },
  {
    href: '/puzzles?defi=1',
    icon: Zap,
    titre: 'Défi du jour',
    phrase:
      'Une seule position, la même pour tout le monde de ton niveau. La prochaine arrive à minuit.',
    detail: 'Compte pour la série et pour les quêtes du jour',
    accent: 'var(--accent-2)',
  },
] as const

export default function EntrainementPage() {
  const { etat: journee } = useQuotidien()
  // `null` tant que la journée n'est pas lue : on n'annonce pas « déjà relevé »
  // à quelqu'un qui ne l'a pas fait, le temps d'un rendu.
  const defiFait = journee != null && queteFaite(journee, 'defi')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">S’entraîner</h1>
      <p className="mt-2 max-w-xl text-muted max-lg:text-[13px] max-lg:leading-relaxed">
        Les mêmes positions, trois façons de les travailler : chercher le coup juste, le reconnaître
        vite, ou en résoudre une par jour.
      </p>

      {/* ── Les trois portes ─────────────────────────────────────────────

          Deux mises en page pour la même liste, comme sur « Jouer », et le
          partage se fait à `md`. Au-delà, une carte par colonne. En dessous,
          des rangées : icône à gauche, texte à droite, sans la ligne de
          détail — trois vitrines empilées font un couloir, et le défi du jour
          se retrouverait sous le bord de l'écran. */}
      <div className="mt-6 grid gap-2 md:mt-8 md:grid-cols-3 md:gap-3">
        {EXERCICES.map(({ href, icon: Icon, titre, phrase, detail, accent }, index) => (
          <Link
            key={href}
            href={href}
            className="group animate-slide-up glass gradient-ring relative flex flex-row items-center gap-3.5 overflow-hidden p-3.5 pr-11 transition-transform duration-300 hover:-translate-y-1 md:flex-col md:items-stretch md:gap-0 md:p-6"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius)] md:mb-5 md:h-12 md:w-12"
              style={{
                background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
              }}
            >
              <Icon size={22} style={{ color: accent }} aria-hidden />
            </span>

            {/* `md:contents` : au-delà de `md` cette boîte disparaît de la mise
                en page et ses enfants redeviennent ceux de la carte, ce qui
                rend au `flex-1` de la phrase son effet — pousser la ligne de
                détail contre le bas. */}
            <div className="min-w-0 flex-1 md:contents">
              <h2 className="flex flex-wrap items-center gap-2 pr-6 text-[15px] font-semibold md:pr-0 md:text-lg">
                {titre}
                {/* Le défi relevé se dit ici plutôt que sur la position :
                    on le découvrait en arrivant devant l'échiquier, c'est-à-dire
                    une fois le geste fait. */}
                {href.includes('defi=1') && defiFait && (
                  <Chip tone="success">
                    <Check size={11} aria-hidden />
                    relevé
                  </Chip>
                )}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted md:mt-1.5 md:line-clamp-none md:flex-1 md:text-sm md:leading-relaxed">
                {phrase}
              </p>
              <p className="mt-4 hidden text-[11px] uppercase tracking-wide text-faint md:block">
                {detail}
              </p>
            </div>

            <ArrowRight
              size={17}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-300 group-hover:text-ink md:right-5 md:top-6 md:translate-y-0 md:group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
