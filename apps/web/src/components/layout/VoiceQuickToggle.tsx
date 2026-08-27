'use client'

/**
 * Coupure rapide de la voix.
 *
 * Le coach parle sur presque toutes les pages — leçons, puzzles, partie
 * commentée. Aller chercher l'interrupteur dans les préférences à chaque fois
 * qu'on veut le silence est une friction inutile : le bouton vit donc dans
 * l'en-tête, visible partout.
 *
 * Couper la voix interrompt aussi la phrase en cours. Attendre la fin d'une
 * explication qu'on vient de faire taire serait absurde.
 */

import { Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { stopSpeaking } from '@/lib/speech.ts'

export function VoiceQuickToggle({ className }: { className?: string }) {
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)

  const label = voiceEnabled ? 'Couper la voix du coach' : 'Activer la voix du coach'

  return (
    <button
      type="button"
      onClick={() => {
        // Toujours faire taire : que l'on coupe la voix ou qu'on la rallume, une
        // phrase restée en attente n'a plus lieu d'être prononcée.
        stopSpeaking()
        setPreference('voiceEnabled', !voiceEnabled)
      }}
      aria-pressed={voiceEnabled}
      aria-label={label}
      title={label}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] transition-colors',
        voiceEnabled
          ? 'text-accent hover:bg-surface-hover'
          : 'text-faint hover:bg-surface-hover hover:text-muted',
        className,
      )}
    >
      {voiceEnabled ? <Volume2 size={17} aria-hidden /> : <VolumeX size={17} aria-hidden />}
    </button>
  )
}
