/**
 * L'icône d'une catégorie de cadence.
 *
 * Le cœur porte encore un emoji par catégorie (`SPEED_LABELS[…].icon`) :
 * 🔫 ⚡ 🐇 🐢 ✉️. Ils étaient les derniers de l'interface, et ils ne se
 * ressemblent entre eux que par hasard — un pistolet, un éclair, deux
 * animaux, une enveloppe. Les écrans passent désormais par ici : un tracé
 * lucide, de la même famille que tout le reste. Le champ du cœur reste pour
 * les textes où une icône ne peut pas s'afficher.
 */

import { Flame, Hourglass, Mail, Rocket, Timer, Zap, type LucideIcon } from 'lucide-react'
import type { SpeedCategory } from '@coupparfait/core'

const ICONES: Record<SpeedCategory, LucideIcon> = {
  ultraBullet: Rocket,
  bullet: Zap,
  blitz: Flame,
  rapid: Timer,
  classical: Hourglass,
  correspondence: Mail,
}

export function IconeCadence({
  categorie,
  size = 12,
  className,
}: {
  categorie: SpeedCategory
  size?: number
  className?: string
}) {
  const Icone = ICONES[categorie]
  return <Icone size={size} className={className} aria-hidden />
}
