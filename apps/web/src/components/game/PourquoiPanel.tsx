'use client'

/**
 * « Pourquoi ? » — l'explication à la demande.
 *
 * Le mode commenté analyse chaque coup, qu'on l'ait demandé ou non. C'est
 * précieux quand on débute et pesant quand on progresse : on finit par lire en
 * diagonale une explication qu'on connaissait déjà, et l'habitude de la sauter
 * s'étend à celles qui auraient servi.
 *
 * Ce panneau fait l'inverse : il ne dit rien tant qu'on n'a pas demandé. Le
 * calcul est identique — même moteur, même `explainMove`, même analyse — seul
 * le déclencheur change. Il reste donc disponible quand le mode commenté est
 * éteint, et c'est précisément là qu'il sert.
 */

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import type { OpeningBook } from '@coupparfait/core'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import { Button } from '@/components/ui/index.tsx'
import { CommentaryPanel, useLiveCommentary } from './LiveCommentary.tsx'
import { ApprofondirCoup } from '@/components/ia/ApprofondirCoup.tsx'

export function PourquoiPanel({
  move,
  book,
  openingName,
  className,
}: {
  /** Coup sur lequel porte la question — le dernier joué, en général. */
  move: PlayedMove | null
  book?: OpeningBook | null
  openingName?: string | null
  className?: string
}) {
  // La demande porte sur une position précise. En la mémorisant plutôt qu'un
  // simple booléen, un nouveau coup referme le panneau de lui-même : sans
  // cela, une réponse resterait affichée sous un coup qu'elle ne décrit plus.
  const [demandeSur, setDemandeSur] = useState<string | null>(null)
  const active = move !== null && demandeSur === move.after

  const { commentary, loading } = useLiveCommentary({ move, enabled: active, book })

  if (!move) return null

  if (!active) {
    return (
      <div className={className}>
        <Button
          size="sm"
          variant="ghost"
          fullWidth
          icon={<HelpCircle size={14} aria-hidden />}
          onClick={() => setDemandeSur(move.after)}
        >
          Pourquoi ce coup ?
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <CommentaryPanel commentary={commentary} loading={loading} />
      <ApprofondirCoup commentary={commentary} openingName={openingName} />
    </div>
  )
}
