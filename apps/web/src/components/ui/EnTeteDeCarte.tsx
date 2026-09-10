'use client'

/**
 * Le titre d'une carte, et de quoi le voir.
 *
 * Toutes les cartes de l'accueil ouvraient sur la même ligne : douze pixels,
 * gras, `--text-faint` — le niveau de texte le plus effacé de la palette — sur
 * le fond gris de la carte. « Ton parcours », « Tes dernières parties », « Tes
 * analyses » se lisaient donc moins bien que leur propre contenu, et il fallait
 * parcourir la page entière pour savoir ce qu'elle contenait.
 *
 * Ici le titre prend un bandeau : un fond dégradé dans la couleur du bloc, un
 * filet de la même teinte, une icône, et le texte dans cette couleur — assez
 * rapprochée du texte pour rester lisible dans les trois thèmes (voir
 * `.bandeau` dans `globals.css`, qui tient toute la recette).
 *
 * La couleur n'est pas décorative : chaque bloc reprend celle qu'il porte déjà
 * ailleurs — l'ambre de la flamme pour les quêtes du jour, la teinte du
 * chapitre pour le parcours, l'accent pour l'analyse. À défaut de `teinte`,
 * c'est l'accent, ou celle de la carte quand elle est elle-même teintée.
 *
 * Un seul composant pour tous ces bandeaux, parce qu'ils étaient recopiés à la
 * main d'une carte à l'autre : cinq copies de la même ligne de classes, dont
 * deux avaient déjà divergé sur l'alignement.
 */

import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

export function EnTeteDeCarte({
  titre,
  icone,
  teinte,
  fin,
  filet = true,
  onClick,
  ouvert,
  className,
}: {
  titre: ReactNode
  /** L'icône du bloc, à gauche du titre. Elle prend la couleur du titre. */
  icone?: ReactNode
  /**
   * Couleur du bandeau, en CSS.
   *
   * Omise, c'est celle de la carte si elle est teintée (`teinte-jour` et
   * consorts posent `--teinte`), et l'accent sinon.
   */
  teinte?: string
  /** Ce qui se lit à droite : un compteur, un lien « tout voir ». */
  fin?: ReactNode
  /**
   * Le filet du bas.
   *
   * À retirer quand le bandeau est seul — une carte repliée n'a rien à séparer,
   * et le filet y dessinerait un couvercle sur du vide.
   */
  filet?: boolean
  /** Donné, le bandeau devient le bouton qui replie la carte. */
  onClick?: () => void
  /** L'état de ce que replie `onClick`, pour le chevron et les lecteurs d'écran. */
  ouvert?: boolean
  className?: string
}) {
  const classes = clsx(
    'bandeau flex w-full items-center gap-2 px-4 py-3 text-left',
    // Deux pixels, dans la teinte : à un seul, le filet du bas se confondait
    // avec ceux qui séparent les lignes du contenu, et le bandeau n'était plus
    // qu'une ligne parmi d'autres.
    filet && 'border-b-2',
    className,
  )
  const style = teinte ? ({ '--teinte': teinte } as CSSProperties) : undefined

  const contenu = (
    <>
      {/* Le titre prend toute la place restante : ce qui suit se range à droite
          de lui-même, sans qu'aucun des deux ait à réclamer la marge. */}
      {/* Quatorze pixels et gras, là où le reste de la page écrit ses mentions
          en douze et demi-gras : un titre de bloc doit se voir avant ce qu'il
          annonce, et il restait plus discret que la ligne qu'il chapeaute.
          L'icône porte la couleur franche, le titre la garde diluée — voir
          `.bandeau` dans `globals.css`. */}
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[14px] font-bold tracking-[0.01em] text-[var(--teinte-texte)]">
        {icone && <span className="shrink-0 text-[var(--bandeau-icone)]">{icone}</span>}
        <span className="truncate">{titre}</span>
      </span>
      {fin != null && <span className="shrink-0 text-[12px] tabular-nums text-muted">{fin}</span>}
      {onClick &&
        (ouvert ? (
          <ChevronUp size={14} className="shrink-0 text-faint" aria-hidden />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-faint" aria-hidden />
        ))}
    </>
  )

  if (!onClick)
    return (
      <div className={classes} style={style}>
        {contenu}
      </div>
    )

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ouvert}
      className={clsx(classes, 'transition-colors hover:bg-surface-hover')}
      style={style}
    >
      {contenu}
    </button>
  )
}
