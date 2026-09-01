'use client'

/**
 * L'installation sur l'appareil.
 *
 * Le manifeste était complet, le travailleur de service enregistré dès la
 * première visite, les icônes en place — bref, tout ce qu'un navigateur exige
 * pour proposer « ajouter à l'écran d'accueil » était réuni. Et rien n'était
 * proposé.
 *
 * La raison tient à une décision de Chrome, prise en 2018 : depuis, le
 * navigateur ne montre plus de bandeau de lui-même. Il se contente d'émettre
 * `beforeinstallprompt`, et **si personne ne le retient, la proposition est
 * perdue** — reste une icône dans la barre d'adresse que presque personne ne
 * remarque, et rien du tout sur Android. C'est au site de retenir l'événement
 * et de rouvrir la proposition au moment qu'il juge bon.
 *
 * D'où ce module : il capte l'événement dès le chargement du module — donc
 * avant qu'un composant ait pu être monté, ce qui compte car l'événement part
 * tôt et ne se rejoue jamais — et le garde jusqu'à ce qu'on s'en serve.
 *
 * Safari fait exception : il n'émet rien du tout, et l'installation passe par
 * le menu de partage. On ne peut alors que l'expliquer, d'où `iosSansInstallation`
 * dans `notifications.ts`, qui répond à la même question pour les mêmes raisons.
 */

import { useCallback, useEffect, useState } from 'react'

/**
 * L'événement que Chrome émet, et que les types du DOM ne connaissent pas :
 * il n'est pas standardisé, seuls les navigateurs Chromium l'implémentent.
 */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let differe: EvenementInstallation | null = null
const abonnes = new Set<() => void>()

function prevenir() {
  for (const abonne of abonnes) abonne()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evenement) => {
    // Sans cela, les navigateurs qui montrent encore quelque chose d'eux-mêmes
    // le feraient au pire moment, et l'événement ne serait plus utilisable.
    evenement.preventDefault()
    differe = evenement as EvenementInstallation
    prevenir()
  })

  // Installée depuis la barre d'adresse, ou depuis notre propre bouton : la
  // proposition n'a plus lieu d'être et l'événement ne se rejouera pas.
  window.addEventListener('appinstalled', () => {
    differe = null
    prevenir()
  })
}

/** L'application tourne-t-elle déjà depuis l'écran d'accueil ? */
export function dejaInstallee(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export interface EtatInstallation {
  /** Le navigateur a proposé l'installation : on peut la rouvrir d'un clic. */
  possible: boolean
  /** Déjà installée — ou lancée depuis l'écran d'accueil. */
  installee: boolean
  /**
   * Installation manuelle seulement, faute d'événement à retenir.
   *
   * C'est le cas d'iPhone et d'iPad, où l'on ne peut qu'expliquer le geste :
   * bouton de partage, puis « Sur l'écran d'accueil ».
   */
  manuelle: boolean
  /** Rouvre la proposition du navigateur. Rend vrai si elle a été acceptée. */
  installer: () => Promise<boolean>
}

export function useInstallation(): EtatInstallation {
  const [possible, setPossible] = useState(false)
  const [installee, setInstallee] = useState(false)
  const [manuelle, setManuelle] = useState(false)

  useEffect(() => {
    const synchroniser = () => {
      setPossible(differe !== null)
      setInstallee(dejaInstallee())
    }
    synchroniser()

    // iOS n'émet pas l'événement : sans ce test, l'application y paraîtrait
    // simplement non installable, ce qui est faux — elle l'est, à la main.
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setManuelle(ios && !dejaInstallee())

    abonnes.add(synchroniser)
    // Le mode d'affichage change sans rechargement quand on lance l'icône.
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', synchroniser)
    return () => {
      abonnes.delete(synchroniser)
      media.removeEventListener('change', synchroniser)
    }
  }, [])

  const installer = useCallback(async () => {
    const evenement = differe
    if (!evenement) return false
    // L'événement ne se réutilise pas : accepté ou refusé, il est consommé.
    differe = null
    prevenir()
    try {
      await evenement.prompt()
      const { outcome } = await evenement.userChoice
      return outcome === 'accepted'
    } catch {
      return false
    }
  }, [])

  return { possible, installee, manuelle, installer }
}
