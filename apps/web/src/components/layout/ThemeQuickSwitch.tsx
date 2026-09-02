'use client'

/**
 * Sélecteur de thème rapide.
 *
 * Placé dans la barre supérieure parce que changer de thème n'est pas un
 * réglage qu'on fait une fois : on passe du sombre au clair selon l'heure et
 * la lumière de la pièce. L'enterrer dans une page de préférences serait une
 * erreur d'ergonomie.
 */

import { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import clsx from 'clsx'
import { THEME_LIST, usePreferences, type ThemeId } from '@/lib/store/preferences.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function ThemeQuickSwitch() {
  const theme = usePreferences((state) => state.theme)
  const setPreference = usePreferences((state) => state.set)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const t = useT()

  // Referme au clic extérieur et à la touche Échap.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
        aria-label={t('settings.theme')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette size={17} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-slide-up absolute right-0 top-11 z-50 w-52 popover p-1.5 shadow-[var(--shadow-lg)]"
        >
          {THEME_LIST.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === entry.id}
              onClick={() => {
                setPreference('theme', entry.id as ThemeId)
                setOpen(false)
              }}
              className={clsx(
                'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors',
                theme === entry.id ? 'bg-surface-strong text-ink' : 'text-muted hover:bg-surface-hover',
              )}
            >
              <span className="flex shrink-0 gap-0.5" aria-hidden>
                {entry.swatch.map((colour) => (
                  <span
                    key={colour}
                    className="h-4 w-2 rounded-[2px] ring-1 ring-black/20"
                    style={{ background: colour }}
                  />
                ))}
              </span>
              <span className="flex-1 font-medium">
                {t(`settings.themes.${entry.id}` as never)}
              </span>
              {theme === entry.id && <span className="text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
