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
import { I18nProvider, langue, useLangueChargee, type Locale } from '@/lib/i18n/index.tsx'
import { TEMOIN_LANGUE } from '@/lib/i18n/temoin.ts'
import { detectEffectsCapability, usePreferences } from '@/lib/store/preferences.ts'
import { unlockAudio } from '@/lib/sound.ts'
import { loadNeuralVoices, loadVoices } from '@/lib/speech.ts'
import { enregistrerTravailleur } from '@/lib/notifications.ts'
import { ToastHost } from '@/components/ui/Toast.tsx'

/**
 * @param localeInitiale La langue décidée au serveur — témoin, sinon
 *   `Accept-Language`, sinon le français. Elle ne sert qu'au rendu serveur et
 *   au tout premier rendu du navigateur : dès que le magasin a relu le stockage
 *   local, c'est lui qui décide. Sans cette propriété, le serveur rendait la
 *   page en français quoi qu'annonce le navigateur, et le texte changeait sous
 *   les yeux du lecteur une fois la page affichée.
 */
export function Providers({
  children,
  localeInitiale,
}: {
  children: ReactNode
  localeInitiale: Locale
}) {
  const choisie = usePreferences((state) => state.locale)
  const theme = usePreferences((state) => state.theme)
  const effects = usePreferences((state) => state.effects)
  const hydrated = usePreferences((state) => state.hydrated)
  const patch = usePreferences((state) => state.patch)

  // La langue réellement affichée, qui peut retarder d'un chargement sur celle
  // qu'on a choisie : le sens de lecture, l'attribut `lang` et le témoin la
  // suivent, pour ne jamais retourner la page avant que son texte ne change.
  const locale = useLangueChargee(hydrated ? choisie : localeInitiale, localeInitiale)

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

  /*
    La langue choisie, déposée dans un témoin.

    C'est le seul moyen pour les routes d'`app/api` de savoir à qui elles
    répondent : la préférence vit dans le navigateur, et le serveur ne la voyait
    jamais. Leurs quatre-vingt-quinze messages d'erreur arrivaient donc en
    français au milieu d'un écran en japonais — voir `lib/i18n/serveur.ts`.

    Un témoin plutôt qu'un en-tête : il part tout seul avec chaque requête, là où
    un en-tête aurait demandé de modifier la centaine d'appels `fetch` du projet
    et d'en oublier au moins un. Il ne porte qu'un code de langue, ne sert qu'à
    cela, et `SameSite=Lax` suffit puisqu'il n'autorise rien.
  */
  useEffect(() => {
    const an = 60 * 60 * 24 * 365
    document.cookie = `${TEMOIN_LANGUE}=${encodeURIComponent(locale)}; path=/; max-age=${an}; SameSite=Lax`
  }, [locale])

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
