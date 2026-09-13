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
import { QUALITY_STYLES, isNotableQuality, type MoveQuality } from '@coupparfait/core'
import { useSan } from '@/lib/notation.ts'
import { useT } from '@/lib/i18n/index.tsx'

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
  /** Verdicts par demi-coup, quand on en a. */
  qualites?: Record<number, MoveQuality>,
): CoupDuRuban[] {
  return coups.map((coup, index) => ({
    san: coup.san,
    color: coup.color,
    moveNumber: Math.floor(index / 2) + 1,
    quality: qualites?.[index],
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
  const t = useT()
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
      <p className={clsx('py-2 text-center text-[14px] text-faint', className)}>
        {t('moves.empty')}
      </p>
    )
  }

  const moitie = Math.floor(combien / 2)
  const debut = Math.max(0, Math.min(cursor - moitie, coups.length - combien))
  const visibles = coups.slice(Math.max(0, debut), Math.max(0, debut) + combien)
  const premier = Math.max(0, debut)

  return (
    /*
      Les deux flèches se voient et se visent.

      Elles étaient grises sur le fond, sans surface ni contour : deux
      chevrons de dix-huit pixels qu'on ne distinguait pas d'une décoration, et
      qu'on ratait une fois sur deux au pouce. Ce sont pourtant les seules
      commandes de ce ruban — tout le reste est du texte. Surface, liseré, et
      quarante-huit points de côté au doigt.
    */
    <div className={clsx('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onSeek(Math.max(0, cursor - 1))}
        disabled={cursor <= 0}
        aria-label={t('rest.previousMove')}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong text-ink ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-hover disabled:opacity-30 disabled:ring-line pointer-coarse:h-12 pointer-coarse:w-12"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {visibles.map((coup, rang) => {
          const index = premier + rang
          // Même règle que la liste complète : la teinte pleine pour ce qui est
          // remarquable, un vert atténué pour ce qui est simplement correct.
          const style = coup.quality ? QUALITY_STYLES[coup.quality] : null
          const remarquable = coup.quality ? isNotableQuality(coup.quality) : false
          const bon = coup.quality === 'excellent' || coup.quality === 'good'
          const courant = index === cursor
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSeek(index)}
              aria-current={courant ? 'true' : undefined}
              className={clsx(
                'flex min-w-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[14px] transition-colors pointer-coarse:min-h-11',
                courant
                  ? 'bg-surface-strong font-bold text-ink'
                  : 'text-muted hover:bg-surface-hover',
              )}
            >
              {/* Le numéro n'apparaît que sur les coups des Blancs et sur le
                  coup courant : répété sur chacun, il double la largeur du
                  ruban pour une information qu'on lit une fois. */}
              {(coup.color === 'w' || courant) && (
                <span className="shrink-0 text-[12px] tabular-nums text-faint">
                  {coup.moveNumber}
                  {coup.color === 'w' ? '.' : '…'}
                </span>
              )}
              {masque && courant ? (
                <span className="font-mono text-accent">? ? ?</span>
              ) : (
                <>
                  {/* Comme dans la liste complète : la notation porte la
                      couleur de son verdict. Le ruban est ce qu'on a sous les
                      yeux sur téléphone, il ne peut pas être le seul endroit
                      où l'information se réduit à un glyphe de onze pixels. */}
                  <span
                    className="truncate font-mono"
                    style={
                      remarquable
                        ? { color: `var(--q-${style?.token})` }
                        : bon
                          ? {
                              color: `color-mix(in oklab, var(--q-${style?.token}) 78%, var(--text))`,
                            }
                          : undefined
                    }
                  >
                    {format(coup.san)}
                  </span>
                  {/* Le glyphe, lui, reste réservé au remarquable : une bande
                      où chaque coup porte une coche n'a plus de relief, et il
                      n'y a de la place que pour cinq coups. */}
                  {style && remarquable && (
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
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong text-ink ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-hover disabled:opacity-30 disabled:ring-line pointer-coarse:h-12 pointer-coarse:w-12"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  )
}
