'use client'

/**
 * Indicateur de trait.
 *
 * Une seule ligne, mais c'est l'information la plus consultée d'une partie :
 * est-ce à moi de jouer ? La pastille pulse quand c'est le cas — sur téléphone,
 * on la voit du coin de l'œil sans lire.
 */

import clsx from 'clsx'
import type { Color } from 'chess.js'

/** Indique quel camp joue et l'état de la partie, en une ligne. */
export function TurnIndicator({
  turn,
  yourColor,
  thinking,
  gameOver,
  className,
}: {
  turn: Color
  yourColor: Color | null
  thinking?: boolean
  gameOver?: boolean
  className?: string
}) {
  if (gameOver) return null
  const yours = yourColor !== null && turn === yourColor

  return (
    <div className={clsx('flex items-center gap-2 text-sm', className)}>
      <span
        className={clsx(
          'h-2.5 w-2.5 rounded-full',
          turn === 'w' ? 'bg-[var(--eval-white)]' : 'bg-[var(--eval-black)] ring-1 ring-line',
          // La pulsation anime une ombre, donc repeint en boucle : on la coupe
          // en mode « performance », comme les autres.
          yours && 'animate-[pulse-ring_1.8s_ease-in-out_infinite] [[data-effects=low]_&]:animate-none',
        )}
        aria-hidden
      />
      <span className={yours ? 'font-semibold' : 'text-muted'}>
        {thinking
          ? 'L’adversaire réfléchit…'
          : yours
            ? 'À toi de jouer'
            : turn === 'w'
              ? 'Trait aux Blancs'
              : 'Trait aux Noirs'}
      </span>
    </div>
  )
}
