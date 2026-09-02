'use client'

/**
 * Les coups en ruban : une ligne, centrée sur celui où l'on se trouve.
 *
 * C'est la forme qui convient au téléphone, et elle n'a rien d'un pis-aller.
 * Une liste en deux colonnes est faite pour être parcourue du regard — on y
 * cherche « le coup 14 » —, ce qui suppose de la voir en entier. Sous
 * l'échiquier d'un mobile, elle n'a jamais que trois lignes visibles et pousse
 * tout le reste dehors. Le ruban, lui, répond à l'autre question, celle qu'on
 * se pose pendant une partie : **où j'en suis, et qu'est-ce qui vient d'être
 * joué ?** Trois coups suffisent à y répondre, et deux flèches suffisent à s'y
 * déplacer.
 *
 * Il ne remplace pas la liste complète, qui reste plus bas dans la page et sur
 * la colonne de droite des grands écrans : on n'y range pas la même chose.
 *
 * Le composant est partagé entre la relecture guidée et les écrans de partie.
 * Les deux affichaient la même bande, écrite deux fois — et elles avaient déjà
 * commencé à diverger.
 */

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { Color } from 'chess.js'
import { QUALITY_STYLES, type MoveQuality } from '@coupparfait/core'
import { useSan } from '@/lib/notation.ts'

/** Ce que le ruban a besoin de savoir d'un coup. */
export interface CoupDuRuban {
  san: string
  color: Color
  /** Numéro du coup entier — « 14 » pour 14. e4 comme pour 14… e5. */
  moveNumber: number
  /** Pastille de qualité, quand la partie a été analysée. */
  quality?: MoveQuality
}

/**
 * Construit le ruban à partir d'une suite de demi-coups.
 *
 * Le numéro se déduit du rang : c'est vrai de toute partie commencée à la
 * position initiale, ce qui est le cas de tous les écrans qui s'en servent.
 */
export function rubanDepuisLesCoups(
  coups: Array<{ san: string; color: Color }>,
): CoupDuRuban[] {
  return coups.map((coup, index) => ({
    san: coup.san,
    color: coup.color,
    moveNumber: Math.floor(index / 2) + 1,
  }))
}

export function RubanCoups({
  coups,
  cursor,
  onSeek,
  masque,
  className,
}: {
  coups: CoupDuRuban[]
  /** Demi-coup affiché. `-1` avant le premier coup. */
  cursor: number
  onSeek: (index: number) => void
  /**
   * Cache le coup courant pendant qu'on cherche à le remplacer.
   *
   * Sans cela le ruban affichait « 3… Cf6 ?? » en rouge juste sous
   * l'échiquier : la question était posée et la réponse — enfin, la mauvaise
   * réponse, celle qu'il ne fallait pas jouer — était donnée dans le même
   * écran. On masque la notation et le verdict, on garde le numéro pour ne pas
   * perdre le repère.
   */
  masque?: boolean
  className?: string
}) {
  /*
    Trois coups sur téléphone, cinq à partir d'une tablette.

    Cinq partout était le premier choix, et il tronquait les coups jusqu'à
    l'absurde sur 375 points de large : « 3. [ ?! », « 4. D… ! ». Un ruban qui
    n'affiche plus la notation ne sert plus à se repérer, ce qui est son unique
    fonction.
  */
  // L'écriture des coups suit les préférences — figurine ou lettres — comme
  // partout ailleurs : le ruban n'a pas à recevoir un formateur de l'appelant,
  // il en existe un seul pour toute l'application.
  const format = useSan()

  const [combien, setCombien] = useState(5)
  useEffect(() => {
    const mesurer = () => setCombien(window.innerWidth < 640 ? 3 : 5)
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [])

  if (coups.length === 0) {
    return (
      <p className={clsx('py-2 text-center text-[13px] text-faint', className)}>
        Les coups joués apparaîtront ici.
      </p>
    )
  }

  const moitie = Math.floor(combien / 2)
  const debut = Math.max(0, Math.min(cursor - moitie, coups.length - combien))
  const visibles = coups.slice(Math.max(0, debut), Math.max(0, debut) + combien)
  const premier = Math.max(0, debut)

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onSeek(Math.max(0, cursor - 1))}
        disabled={cursor <= 0}
        aria-label="Coup précédent"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover disabled:opacity-30 pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {visibles.map((coup, rang) => {
          const index = premier + rang
          const style = coup.quality ? QUALITY_STYLES[coup.quality] : null
          const courant = index === cursor
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSeek(index)}
              aria-current={courant ? 'true' : undefined}
              className={clsx(
                'flex min-w-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] transition-colors pointer-coarse:min-h-11',
                courant ? 'bg-surface-strong font-bold text-ink' : 'text-muted hover:bg-surface-hover',
              )}
            >
              {/* Le numéro n'apparaît que sur les coups des Blancs et sur le
                  coup courant : répété sur chacun, il double la largeur du
                  ruban pour une information qu'on lit une fois. */}
              {(coup.color === 'w' || courant) && (
                <span className="shrink-0 text-[11px] tabular-nums text-faint">
                  {coup.moveNumber}
                  {coup.color === 'w' ? '.' : '…'}
                </span>
              )}
              {masque && courant ? (
                <span className="font-mono text-accent">? ? ?</span>
              ) : (
                <>
                  <span className="truncate font-mono">{format(coup.san)}</span>
                  {style && (
                    <span
                      className="shrink-0"
                      style={{ color: `var(--q-${style.token})` }}
                      aria-hidden
                    >
                      {style.glyph}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onSeek(Math.min(coups.length - 1, cursor + 1))}
        disabled={cursor >= coups.length - 1}
        aria-label="Coup suivant"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover disabled:opacity-30 pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  )
}
