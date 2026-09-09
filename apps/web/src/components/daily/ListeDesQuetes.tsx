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
 *
 * **Le défi du jour porte sa couleur.** C'est une quête comme les autres pour
 * le décompte des points, et pas du tout comme les autres pour le reste : il
 * est la seule position que tout le monde partage, il a sa propre carte en
 * haut de l'accueil, et c'est celle-là qu'on met en avant. Écrit en gris au
 * milieu de trois autres lignes grises, il devenait la quatrième d'une liste
 * anonyme, et l'on ne savait plus si la grande carte violette du dessus
 * parlait de cette ligne ou d'autre chose. Elle prend donc le fond de
 * l'accent — le même que la carte, le même que le bouton qui y mène : un
 * regard suffit à relier les deux.
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
        const estDefi = quete.id === 'defi'
        return (
          <li key={quete.id}>
            <Link
              href={quete.lien}
              // Marges négatives : la zone touchable déborde des bords du
              // texte — il faut au moins un doigt de large — sans décaler la
              // liste par rapport au reste de la carte.
              className={clsx(
                '-mx-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-[14px] transition-colors',
                // Le fond de l'accent tient même une fois la quête faite :
                // c'est ce qui dit « ceci est le défi », pas « ceci reste à
                // faire ». Le texte, lui, se barre comme les autres.
                estDefi
                  ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_20%,transparent)]'
                  : 'hover:bg-surface-hover',
                faite
                  ? 'text-faint line-through'
                  : estDefi
                    ? 'font-medium text-[color-mix(in_oklab,var(--accent)_62%,var(--text))]'
                    : 'text-muted hover:text-ink',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  faite
                    ? 'border-[var(--q-best)] bg-[var(--q-best)] text-white'
                    : estDefi
                      ? 'border-accent'
                      : 'border-line',
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
