/**
 * L'icône d'une famille de finales.
 *
 * Les données (`public/data/endgames.json`, produites par
 * `scripts/build-endgames.mjs`) portent un emoji ou un glyphe de pièce par
 * famille : 👑 ♙ ♝ ♞ ⚔️ ♜ ⚖️ ♛. L'écran passe par ici, comme les cadences et
 * les leçons, pour que toutes les icônes soient de la même famille de tracés.
 * Une famille inconnue retombe sur la couronne plutôt que sur rien.
 */

import {
  ChessBishop,
  ChessKnight,
  ChessPawn,
  ChessQueen,
  ChessRook,
  Crown,
  Scale,
  Swords,
  type LucideIcon,
} from 'lucide-react'

const ICONES: Record<string, LucideIcon> = {
  basic: Crown,
  pawn: ChessPawn,
  bishop: ChessBishop,
  knight: ChessKnight,
  'knight-bishop': Swords,
  'rook-pawn': ChessRook,
  'rook-pieces': Scale,
  queen: ChessQueen,
}

export function IconeFinale({
  famille,
  size = 20,
  className,
}: {
  famille: string
  size?: number
  className?: string
}) {
  const Icone = ICONES[famille] ?? Crown
  return <Icone size={size} className={className} aria-hidden />
}
