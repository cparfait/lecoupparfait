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
import { I18nProvider, langue } from '@/lib/i18n/index.tsx'
import { detectEffectsCapability, usePreferences } from '@/lib/store/preferences.ts'
import { unlockAudio } from '@/lib/sound.ts'
import { loadNeuralVoices, loadVoices } from '@/lib/speech.ts'
import { enregistrerTravailleur } from '@/lib/notifications.ts'
import { ToastHost } from '@/components/ui/Toast.tsx'

export function Providers({ children }: { children: ReactNode }) {
  const locale = usePreferences((state) => state.locale)
  const theme = usePreferences((state) => state.theme)
  const effects = usePreferences((state) => state.effects)
  const hydrated = usePreferences((state) => state.hydrated)
  const patch = usePreferences((state) => state.patch)

  /*
    Répercute thème, langue et sens de lecture sur l'élément racine.

    `lang` portait le code seul — « fr », « ar » — et vaut mieux avec sa
    région : c'est cette étiquette que lisent la synthèse vocale du navigateur,
    les correcteurs orthographiques et les lecteurs d'écran.

    `dir` est nouveau, et c'est le plus important des trois : l'arabe, l'hébreu
    et le persan se lisent de droite à gauche. Une interface affichée dans
    l'autre sens ne se lit pas — les boutons sont inversés, les listes se
    déroulent du mauvais côté, la ponctuation atterrit en tête de phrase. Le
    seul attribut suffit : tout le reste est en flux normal, et le navigateur
    retourne la mise en page.
  */
  useEffect(() => {
    const choisie = langue(locale)
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = choisie.bcp47
    document.documentElement.dir = choisie.rtl ? 'rtl' : 'ltr'
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

  /*
    Le travailleur de service, dès la première visite.

    Il ne fait rien tant que personne ne s'abonne, mais il doit être *déjà là*
    au moment où l'on s'abonne : sans lui, `pushManager.subscribe` échoue, et
    l'enregistrer dans le même clic ferait attendre une seconde entre le
    « oui » du navigateur et la confirmation à l'écran.

    C'est aussi ce qui rend l'application installable sur Android — le
    navigateur refuse la proposition « ajouter à l'écran d'accueil » à un site
    qui n'en a pas.
  */
  useEffect(() => {
    void enregistrerTravailleur()
  }, [])

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
