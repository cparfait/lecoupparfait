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
 * ── Ce qui reste à faire se voit, ce qui est fait s'efface ────────────────
 *
 * **Chaque quête à faire porte une couleur**, et deux couleurs suffisent :
 *
 *   - le défi du jour prend l'accent. C'est une quête comme les autres pour le
 *     décompte des points, et pas du tout comme les autres pour le reste : il
 *     est la seule position que tout le monde partage, et il a sa propre carte
 *     en haut de l'accueil. Écrit en gris au milieu de trois lignes grises, il
 *     devenait la quatrième d'une liste anonyme, et l'on ne savait plus si la
 *     grande carte violette du dessus parlait de cette ligne ou d'autre chose.
 *     Même accent des deux côtés : un regard suffit à les relier ;
 *   - les autres prennent l'ambre de la flamme, celle que ces quêtes
 *     nourrissent et que porte déjà la carte qui les contient.
 *
 * La couleur passe par `--teinte-quete`, posée sur la ligne : les classes
 * restent des chaînes littérales, ce qu'exige la compilation de Tailwind, et
 * une seule règle sert les deux cas.
 *
 * **Une quête faite se replie.** Elle gardait sa pleine hauteur, son fond et
 * son chevron pour dire une chose déjà dite par la coche verte. Quatre lignes
 * de même poids, dont trois sans objet, et la seule qui restait à faire se
 * cherchait. Faite, la ligne perd son fond, sa flèche, deux points de corps et
 * la moitié de son interligne : elle constate, elle n'appelle plus. Elle reste
 * un lien — on retourne volontiers sur une quête finie, et une ligne qui cesse
 * d'être cliquable au moment où elle se coche donne l'impression d'une porte
 * qu'on referme.
 */

import Link from 'next/link'
import type { CSSProperties } from 'react'
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
              // L'accent pour le défi, l'ambre de la flamme pour les autres.
              // Inutile de la poser quand la quête est faite : la ligne repliée
              // ne s'en sert plus.
              style={
                faite
                  ? undefined
                  : ({
                      '--teinte-quete': estDefi ? 'var(--accent)' : 'var(--q-inaccuracy)',
                    } as CSSProperties)
              }
              // Marges négatives : la zone touchable déborde des bords du
              // texte — il faut au moins un doigt de large — sans décaler la
              // liste par rapport au reste de la carte.
              className={clsx(
                '-mx-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 transition-colors',
                faite && 'py-0.5 text-[12px] text-faint line-through hover:bg-surface-hover',
                !faite && 'py-1 text-[14px] font-medium',
                !faite && 'bg-[color-mix(in_oklab,var(--teinte-quete)_12%,transparent)]',
                !faite && 'text-[color-mix(in_oklab,var(--teinte-quete)_62%,var(--text))]',
                !faite && 'hover:bg-[color-mix(in_oklab,var(--teinte-quete)_20%,transparent)]',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'flex shrink-0 items-center justify-center rounded-full border',
                  faite
                    ? 'h-3 w-3 border-[var(--q-best)] bg-[var(--q-best)] text-white'
                    : 'h-4 w-4 border-[color-mix(in_oklab,var(--teinte-quete)_55%,var(--border))]',
                )}
              >
                {faite && <Check size={9} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{quete.label}</span>
              {!faite && quete.objectif > 1 && (
                <span className="shrink-0 text-[12px] tabular-nums text-faint">
                  {avancement} / {quete.objectif}
                </span>
              )}
              {/* Le chevron ne dit pas seulement « c'est un lien » : sans lui,
                  rien ne distingue ces lignes de la liste des étapes de
                  carrière, juste à côté, qui n'en est pas une. Une quête faite
                  s'en passe — elle n'invite plus, elle constate. */}
              {!faite && (
                <span aria-hidden className="shrink-0 text-[12px] opacity-70">
                  →
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
