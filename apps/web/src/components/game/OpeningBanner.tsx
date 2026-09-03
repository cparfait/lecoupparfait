'use client'

/**
 * Nom de l'ouverture en cours.
 *
 * S'affiche pendant la phase d'ouverture et se met à jour à chaque coup qui
 * précise la variante. C'est le moyen le plus efficace d'apprendre les noms :
 * on les voit apparaître sur ses propres parties, associés à des positions
 * qu'on vient de jouer, plutôt que dans une liste à mémoriser.
 *
 * Deux détails qui comptent :
 *  - le bandeau **disparaît** dès qu'on sort de la théorie, au lieu de figer un
 *    nom devenu faux ;
 *  - il s'annonce à la voix quand le nom change, une seule fois par nom.
 *
 * L'affichage est désactivable : en partie classée, connaître le nom de la
 * variante qu'on joue est une aide que certains ne veulent pas.
 */

import { useEffect, useRef } from 'react'
import { BookOpen, X } from 'lucide-react'
import clsx from 'clsx'
import { ECO_VOLUMES } from '@coupparfait/core'
import { Chip } from '@/components/ui/index.tsx'
import { speak } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

export interface OpeningBannerProps {
  opening: { eco: string; name: string; ply: number } | null
  /** Nombre de demi-coups joués, pour savoir si on est encore en ouverture. */
  moveCount: number
  /** Masque le bandeau. */
  onDismiss?: () => void
  className?: string
}

/**
 * Au-delà de ce nombre de demi-coups sans nouveau nom, on considère qu'on a
 * quitté la théorie et le bandeau s'efface.
 */
const STALE_AFTER_PLIES = 6

export function OpeningBanner({ opening, moveCount, onDismiss, className }: OpeningBannerProps) {
  const showOpeningName = usePreferences((state) => state.showOpeningName)
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const announceOpenings = usePreferences((state) => state.announceOpenings)
  const spokenRef = useRef<string | null>(null)

  // Annonce vocale à chaque nouveau nom, jamais deux fois le même.
  useEffect(() => {
    if (!opening || !showOpeningName || !voiceEnabled || !announceOpenings) return
    if (spokenRef.current === opening.name) return
    spokenRef.current = opening.name
    speak(opening.name)
  }, [opening, showOpeningName, voiceEnabled, announceOpenings])

  if (!showOpeningName || !opening) return null

  // Sorti de la théorie depuis un moment : le nom n'a plus de sens.
  const stale = moveCount - opening.ply > STALE_AFTER_PLIES
  if (stale) return null

  const volume = ECO_VOLUMES.find((entry) => entry.id === opening.eco[0])

  return (
    <div
      className={clsx(
        'animate-slide-up flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2',
        'glass border border-line',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <BookOpen size={15} className="shrink-0 text-accent" aria-hidden />
      <Chip tone="accent" className="shrink-0">
        {opening.eco}
      </Chip>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{opening.name}</span>
        {volume && <span className="block truncate text-[11px] text-faint">{volume.name.fr}</span>}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label="Masquer le nom de l’ouverture"
          title="Masquer — réactivable dans les préférences"
        >
          <X size={13} aria-hidden />
        </button>
      )}
    </div>
  )
}
