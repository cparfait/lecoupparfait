'use client'

/**
 * Fournisseurs globaux.
 *
 * Assure trois choses au démarrage :
 *  - la langue et le thème choisis sont appliqués au document ;
 *  - le niveau d'effets est déduit de la machine si l'utilisateur n'a rien
 *    imposé ;
 *  - l'audio est débloqué au premier geste de l'utilisateur.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n/index.tsx'
import { detectEffectsCapability, usePreferences } from '@/lib/store/preferences.ts'
import { unlockAudio } from '@/lib/sound.ts'
import { loadNeuralVoices, loadVoices } from '@/lib/speech.ts'
import { ToastHost } from '@/components/ui/Toast.tsx'

export function Providers({ children }: { children: ReactNode }) {
  const locale = usePreferences((state) => state.locale)
  const theme = usePreferences((state) => state.theme)
  const effects = usePreferences((state) => state.effects)
  const hydrated = usePreferences((state) => state.hydrated)
  const patch = usePreferences((state) => state.patch)

  // Répercute thème et langue sur l'élément racine, où le CSS les lit.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = locale
  }, [theme, locale])

  useEffect(() => {
    document.documentElement.dataset.effects = effects
  }, [effects])

  // Première visite : on devine ce que la machine peut encaisser.
  useEffect(() => {
    if (!hydrated) return
    const stored = window.localStorage.getItem('coupparfait.preferences')
    const hasChoice = stored ? 'effects' in (JSON.parse(stored).state ?? {}) : false
    if (!hasChoice) patch({ effects: detectEffectsCapability() })
  }, [hydrated, patch])

  // Le catalogue des voix neuronales est interrogé une seule fois, sans
  // attendre d'interaction : il ne fait pas de bruit, et le savoir tôt évite
  // que la première phrase du coach parte sur la mauvaise voix.
  useEffect(() => {
    void loadNeuralVoices()
  }, [])

  // Les navigateurs interdisent le son tant que l'utilisateur n'a rien touché.
  useEffect(() => {
    const unlock = () => {
      unlockAudio()
      void loadVoices()
    }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']
    for (const event of events) {
      window.addEventListener(event, unlock, { once: true, passive: true })
    }
    return () => {
      for (const event of events) window.removeEventListener(event, unlock)
    }
  }, [])

  return (
    <I18nProvider locale={locale}>
      {children}
      <ToastHost />
    </I18nProvider>
  )
}
