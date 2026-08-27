'use client'

/**
 * Sélecteur de promotion.
 *
 * Apparaît sur la colonne où le pion arrive, comme un menu qui se déroule
 * depuis la case de promotion. La dame est en premier parce qu'elle est choisie
 * dans plus de 99 % des cas ; les trois autres restent accessibles, car la
 * sous-promotion existe et peut être décisive.
 */

import type { Color, PieceSymbol, Square } from 'chess.js'
import { pieceUrl, squarePosition } from './boardKit.ts'

const CHOICES: Array<{ type: PieceSymbol; labelFr: string }> = [
  { type: 'q', labelFr: 'Dame' },
  { type: 'r', labelFr: 'Tour' },
  { type: 'b', labelFr: 'Fou' },
  { type: 'n', labelFr: 'Cavalier' },
]

export function PromotionPicker({
  color,
  square,
  orientation,
  pieceSet,
  onSelect,
  onCancel,
}: {
  color: Color
  square: Square
  orientation: Color
  pieceSet: string
  onSelect: (type: PieceSymbol) => void
  onCancel: () => void
}) {
  const { left, top } = squarePosition(square, orientation)
  // Le menu se déroule vers le bas s'il y a la place, vers le haut sinon.
  const downwards = top < 50

  return (
    <div
      className="absolute inset-0 z-50"
      onClick={onCancel}
      onContextMenu={(event) => {
        event.preventDefault()
        onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Choix de la pièce de promotion"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <div
        className="absolute flex flex-col"
        style={{
          left: `${left}%`,
          top: downwards ? `${top}%` : undefined,
          bottom: downwards ? undefined : `${87.5 - top}%`,
          width: '12.5%',
          flexDirection: downwards ? 'column' : 'column-reverse',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {CHOICES.map(({ type, labelFr }, index) => (
          <button
            key={type}
            type="button"
            title={labelFr}
            aria-label={labelFr}
            onClick={() => onSelect(type)}
            className="group relative aspect-square w-full transition-transform hover:scale-105 focus-visible:scale-105"
            style={{
              animation: `slide-up .18s cubic-bezier(.16,1,.3,1) ${index * 35}ms both`,
            }}
          >
            <span
              className="absolute inset-[6%] rounded-[var(--radius-sm)] border border-line-strong bg-bg-elev shadow-[var(--shadow)] transition-colors group-hover:bg-surface-strong"
              style={{ boxShadow: 'var(--glow)' }}
            />
            <img
              src={pieceUrl(pieceSet, color, type)}
              alt=""
              draggable={false}
              className="relative h-full w-full p-[8%]"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
