'use client'

/**
 * Un mot du glossaire, montré sur l'échiquier.
 *
 * « Le roi fait deux pas vers une tour, qui saute par-dessus lui » suppose un
 * échiquier dans la tête — c'est-à-dire l'exercice que celui qui lit cette
 * définition ne sait justement pas encore faire. Le roque, la prise en passant
 * et la promotion ne sont pas des configurations mais des gestes : on les
 * comprend en les voyant se produire, pas en lisant leur description.
 *
 * Le coup se joue donc tout seul à l'ouverture, après une pause d'une seconde
 * — assez pour voir la position d'avant, sans quoi on ne voit que celle
 * d'après et le geste est perdu. « Rejouer » le repasse autant qu'on veut.
 *
 * Les mots qui ne se dessinent pas — Elo, cadence, précision — n'ouvrent rien :
 * leur carte reste une carte. Voir `glossaire-positions.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button } from '@/components/ui/index.tsx'
import { useDialogue } from '@/lib/useDialogue.ts'
import { renderBold } from '@/lib/gras.tsx'
import { playMoveFor } from '@/lib/sound.ts'
import { useSan } from '@/lib/notation.ts'
import type { PositionIllustree } from '@/lib/glossaire-positions.ts'

/** Le temps qu'on laisse à la position de départ avant de jouer. */
const AVANT_LE_COUP = 1000
/** Entre deux coups d'une même illustration. */
const ENTRE_DEUX_COUPS = 900

export function BoiteTerme({
  nom,
  definition,
  position,
  onFermer,
}: {
  nom: string
  definition: string
  position: PositionIllustree
  onFermer: () => void
}) {
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, { onFermer })
  const format = useSan()

  const [fen, setFen] = useState(position.fen)
  const [dernier, setDernier] = useState<{ from: Square; to: Square } | null>(null)
  /** Les coups déjà joués, en notation, pour les nommer sous l'échiquier. */
  const [joues, setJoues] = useState<string[]>([])

  /*
    Les minuteries en cours.

    « Rejouer » pendant une lecture laisserait la précédente poser ses coups sur
    la nouvelle position : deux séquences se marcheraient dessus, et l'échiquier
    afficherait n'importe quoi. On les annule avant de repartir.
  */
  const minuteries = useRef<ReturnType<typeof setTimeout>[]>([])
  const arreter = useCallback(() => {
    for (const minuterie of minuteries.current) clearTimeout(minuterie)
    minuteries.current = []
  }, [])

  const jouer = useCallback(() => {
    arreter()
    setFen(position.fen)
    setDernier(null)
    setJoues([])

    const coups = position.coups ?? []
    if (coups.length === 0) return

    const board = new Chess(position.fen)
    coups.forEach((san, index) => {
      minuteries.current.push(
        setTimeout(
          () => {
            try {
              const coup = board.move(san)
              setFen(board.fen())
              setDernier({ from: coup.from, to: coup.to })
              setJoues((liste) => [...liste, coup.san])
              playMoveFor(coup)
            } catch {
              // Le contrôle `scripts/check-glossaire.mjs` rejoue ces coups :
              // s'il en reste un d'illégal, on préfère un échiquier immobile à
              // une position fausse.
            }
          },
          AVANT_LE_COUP + index * ENTRE_DEUX_COUPS,
        ),
      )
    })
  }, [position, arreter])

  // À l'ouverture, et une seule fois : la position s'installe, puis le coup
  // part. On nettoie à la fermeture, sinon une minuterie survit au dialogue.
  useEffect(() => {
    jouer()
    return arreter
  }, [jouer, arreter])

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terme-titre"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onFermer} aria-hidden />

      <div
        ref={boite}
        className="popover animate-slide-up relative max-h-[88dvh] w-full max-w-sm overflow-y-auto p-5 shadow-[var(--shadow-lg)]"
      >
        <button
          type="button"
          onClick={onFermer}
          className="absolute right-3 top-3 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={16} aria-hidden />
        </button>

        <h2 id="terme-titre" className="pr-8 font-display text-xl font-bold tracking-tight">
          {nom}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{renderBold(definition)}</p>

        {/* L'échiquier est bridé à trois cent vingt points : au-delà, il pousse
            la légende hors de la boîte sur un téléphone, et c'est elle qui dit
            quoi regarder. */}
        <div className="mx-auto mt-4 w-full max-w-[320px]">
          <ChessBoard
            fen={fen}
            orientation={position.orientation ?? 'w'}
            playable={null}
            lastMove={dernier}
            highlights={(position.cases ?? []) as Square[]}
            showViewToggle={false}
          />
        </div>

        <p className="mt-3 text-[13px] leading-relaxed">
          {position.legende}
          {joues.length > 0 && (
            <span className="ml-1 font-semibold text-accent">
              {joues.map((san) => format(san)).join(' ')}
            </span>
          )}
        </p>

        {(position.coups ?? []).length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            icon={<RotateCcw size={14} />}
            onClick={jouer}
          >
            Rejouer le coup
          </Button>
        )}
      </div>
    </div>
  )
}
