'use client'

/**
 * Les cinq quêtes du jour, et la porte de chacune.
 *
 * Elles étaient écrites deux fois — dans la carte « Aujourd'hui » de l'accueil
 * connecté et dans « Le défi du jour » de l'accueil public — avec le même
 * balisage recopié. Deux copies d'une liste, c'est une liste qu'on corrige une
 * fois sur deux : le jour où l'on a rendu les lignes cliquables, l'une des
 * deux serait restée inerte.
 *
 * **Chaque ligne mène quelque part.** C'est le changement. Sous le bloc du
 * défi, on lisait « Jouer une partie », « Analyser une partie », « Enchaîner
 * 3 puzzles » — cinq consignes sans destination, à côté d'un défi qui, lui,
 * avait son bouton. Il fallait retrouver l'écran correspondant dans les menus.
 * L'adresse vit dans le catalogue (`quetes.ts`), pas ici.
 *
 * Une quête faite reste un lien : on y retourne volontiers, et une ligne qui
 * cesse d'être cliquable au moment où elle se coche donne l'impression d'une
 * porte qu'on referme.
 */

import Link from 'next/link'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { QUETES } from '@/lib/daily/quetes.ts'
import { queteFaite, type EtatQuotidien } from '@/lib/daily/quotidien.ts'

export function ListeDesQuetes({
  etat,
  className,
}: {
  etat: EtatQuotidien | null
  className?: string
}) {
  return (
    <ul className={clsx('space-y-0.5', className)}>
      {QUETES.map((quete) => {
        const faite = etat ? queteFaite(etat, quete.id) : false
        const avancement = etat?.avancement[quete.id] ?? 0
        return (
          <li key={quete.id}>
            <Link
              href={quete.lien}
              // Marges négatives : la zone touchable déborde des bords du
              // texte — il faut au moins un doigt de large — sans décaler la
              // liste par rapport au reste de la carte.
              className={clsx(
                '-mx-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-[14px] transition-colors hover:bg-surface-hover',
                faite ? 'text-faint line-through' : 'text-muted hover:text-ink',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  faite ? 'border-[var(--q-best)] bg-[var(--q-best)] text-white' : 'border-line',
                )}
              >
                {faite && <Check size={11} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{quete.label}</span>
              {!faite && quete.objectif > 1 && (
                <span className="shrink-0 text-[12px] tabular-nums text-faint">
                  {avancement} / {quete.objectif}
                </span>
              )}
              {/* Le chevron ne dit pas seulement « c'est un lien » : sans lui,
                  rien ne distingue ces lignes de la liste des étapes de
                  carrière, juste à côté, qui n'en est pas une. */}
              <span aria-hidden className="shrink-0 text-[12px] text-faint">
                →
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
