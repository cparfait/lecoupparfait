'use client'

/**
 * Le bloc « Maintenant » : ce qui a quelqu'un à l'autre bout.
 *
 * Une partie où c'est ton tour, une correspondance qui attend, une partie
 * laissée ouverte contre l'ordinateur. C'est la seule chose qui passe devant
 * « Ton chemin », parce que c'est la seule qui ne peut pas attendre demain.
 *
 * Il portait le bouton primaire de l'accueil ; il n'en porte plus. L'accueil
 * « Ton chemin » n'a qu'une action pleine, « Continuer », et deux boutons
 * violets l'un au-dessus de l'autre se disputaient le regard. Les urgences se
 * signalent par leur liseré et leur place, en tête de page — une ligne
 * chacune, cliquable en entier.
 *
 * L'ordre vient de `prochainesChoses`, qui est un fichier sans React : on peut
 * y discuter des priorités sans ouvrir un composant.
 */

import Link from 'next/link'
import { ArrowRight, Map, Play, Sun, Swords, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Skeleton } from '@/components/ui/index.tsx'
import type { ProchaineChose, ProchaineChoseId } from './prochainesChoses.ts'

/** Au-delà, ce n'est plus un rappel, c'est une liste — et une liste appelle un écran. */
const LIGNES_MAX = 3

const ICONES: Record<ProchaineChoseId, LucideIcon> = {
  tonTour: Swords,
  correspondance: Swords,
  partieOuverte: Swords,
  repriseOrdinateur: Play,
  defi: Target,
  quete: Sun,
  carriere: Map,
  jouer: Swords,
}

export function Maintenant({
  choses,
  chargement,
}: {
  choses: ProchaineChose[]
  /** Vrai tant qu'on ignore ce qui attend : on ne propose rien au hasard. */
  chargement: boolean
}) {
  if (chargement) return <Skeleton className="h-16 w-full rounded-[var(--radius)]" />
  if (choses.length === 0) return null

  return (
    <ul className="glass flex flex-col overflow-hidden border-accent/60">
      {choses.slice(0, LIGNES_MAX).map((chose) => {
        const Icone = ICONES[chose.id]
        return (
          <li key={`${chose.id}-${chose.lien}`} className="border-b border-line/60 last:border-0">
            <Link
              href={chose.lien}
              className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
            >
              <span
                className={clsx(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-surface-strong',
                  chose.urgent ? 'text-[var(--accent-text)]' : 'text-muted',
                )}
                aria-hidden
              >
                <Icone size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{chose.titre}</span>
                <span className="block truncate text-[12px] text-faint">{chose.detail}</span>
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-[var(--accent-text)]">
                {chose.action}
              </span>
              <ArrowRight size={14} className="shrink-0 text-faint rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
