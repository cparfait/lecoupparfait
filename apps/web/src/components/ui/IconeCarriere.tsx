/**
 * L'icône d'un chapitre, d'un rang ou d'un haut fait de la carrière.
 *
 * Le cœur nomme l'icône (`IconeCarriere`, dans `carriere.ts`) parce qu'il ne
 * peut pas importer lucide ; c'est ici qu'un nom devient un tracé. Ils
 * étaient des emojis — 🐣 🐎 🏇 ⚔️ 🧠 👑 pour les rangs — dont le dessin
 * changeait d'un système à l'autre et qui ne prenaient aucune teinte. Le
 * `Record` sur le type fermé fait échouer la compilation si le cœur ajoute
 * un nom qu'on n'a pas prévu.
 */

import {
  Binoculars,
  BookOpen,
  Brain,
  ChessKnight,
  ChessPawn,
  Compass,
  Crown,
  Drama,
  Eye,
  Flag,
  Flame,
  Library,
  Mountain,
  MountainSnow,
  Scale,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Swords,
  Target,
  Utensils,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconeCarriere as NomDIcone } from '@coupparfait/core'

const ICONES: Record<NomDIcone, LucideIcon> = {
  balance: Scale,
  bouclier: Shield,
  boussole: Compass,
  cavalier: ChessKnight,
  cerveau: Brain,
  cible: Target,
  couronne: Crown,
  drapeau: Flag,
  eclair: Zap,
  epees: Swords,
  etincelles: Sparkles,
  etoile: Star,
  flamme: Flame,
  fourchette: Utensils,
  jumelles: Binoculars,
  livre: BookOpen,
  livres: Library,
  masque: Drama,
  montagne: Mountain,
  oeil: Eye,
  pion: ChessPawn,
  pousse: Sprout,
  sommet: MountainSnow,
  vent: Wind,
}

export function IconeCarriere({
  nom,
  size = 16,
  className,
}: {
  nom: NomDIcone
  size?: number
  className?: string
}) {
  const Icone = ICONES[nom]
  return <Icone size={size} className={className} aria-hidden />
}
