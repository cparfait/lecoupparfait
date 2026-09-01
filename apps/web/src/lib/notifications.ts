'use client'

/**
 * Les notifications, côté navigateur.
 *
 * Trois choses doivent se rencontrer pour qu'une notification arrive : un
 * travailleur de service enregistré, une permission accordée par la personne,
 * et un abonnement transmis au serveur. Ce module les enchaîne et rend un état
 * unique à afficher, parce que les distinguer à l'écran ne rendrait service à
 * personne — « travailleur enregistré mais permission refusée » n'est pas une
 * phrase qu'on met dans une interface.
 *
 * L'ordre compte, et il est contre-intuitif : **on ne demande la permission
 * qu'au moment où la personne clique**. Un navigateur qui reçoit une demande de
 * permission au chargement de la page la refuse d'office dans Firefox, et
 * l'inscrit comme un refus définitif dans Chrome — c'est-à-dire qu'on perd la
 * possibilité de demander plus tard, quand elle aurait dit oui.
 *
 * Le cas d'iOS mérite d'être connu : Safari n'autorise les notifications que
 * pour une application **installée sur l'écran d'accueil**. Sur un onglet
 * ordinaire, `PushManager` n'existe même pas, et l'interface doit expliquer
 * qu'il faut d'abord ajouter le site à l'écran d'accueil — sans quoi le bouton
 * ne fait visiblement rien.
 */

import { useCallback, useEffect, useState } from 'react'

/** Où en est cet appareil. */
export type EtatNotifications =
  /** On n'a pas encore regardé. */
  | 'inconnu'
  /** Le navigateur ne sait pas faire — ou, sous iOS, pas hors écran d'accueil. */
  | 'impossible'
  /** Le serveur n'a pas de clés VAPID : le réglage n'a pas lieu d'être. */
  | 'indisponible'
  /** Tout est prêt, personne n'a encore dit oui. */
  | 'a-activer'
  /** La permission a été refusée : seuls les réglages du navigateur la rendent. */
  | 'refuse'
  /** Abonné. */
  | 'actif'

/**
 * Convertit la clé publique du format que le serveur écrit vers celui que
 * `pushManager.subscribe` exige.
 *
 * La clé circule en base64url — sans remplissage, avec `-` et `_` — parce que
 * c'est ce qui passe dans une variable d'environnement et dans une URL. Le
 * navigateur, lui, veut les octets bruts.
 */
function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const remplissage = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + remplissage).replace(/-/g, '+').replace(/_/g, '/')
  const brut = window.atob(base64)
  /*
    Le tampon est créé explicitement, et le type le dit.

    `new Uint8Array(n)` a pour type `Uint8Array<ArrayBufferLike>`, qui englobe
    `SharedArrayBuffer` — que `pushManager.subscribe` refuse. L'application est
    isolée en `COEP: require-corp` pour Stockfish, donc `SharedArrayBuffer`
    existe bel et bien ici : ce n'est pas une subtilité théorique du système de
    types, c'est la raison pour laquelle il l'englobe.
  */
  const octets = new Uint8Array(new ArrayBuffer(brut.length))
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i)
  return octets
}

/** Vrai si le navigateur sait recevoir des notifications poussées. */
export function navigateurCompatible(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Vrai sur un iPhone ou un iPad hors écran d'accueil.
 *
 * Sert à afficher la bonne explication : sur ces appareils l'incompatibilité
 * n'est pas définitive, elle se règle en installant l'application.
 */
export function iosSansInstallation(): boolean {
  if (typeof window === 'undefined') return false
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (!ios) return false
  const installe =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return !installe
}

/**
 * Enregistre le travailleur de service.
 *
 * Appelé aussi bien par le réglage que par le démarrage de l'application : le
 * navigateur déduplique, un second appel sur le même fichier ne réinstalle
 * rien.
 */
export async function enregistrerTravailleur(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      // Sans cela, le navigateur peut servir une version du travailleur mise en
      // cache pendant vingt-quatre heures — et un correctif urgent y resterait
      // coincé une journée.
      updateViaCache: 'none',
    })
  } catch {
    return null
  }
}

export interface Reglages {
  invitations: boolean
  defiDuJour: boolean
}

const REGLAGES_PAR_DEFAUT: Reglages = { invitations: true, defiDuJour: true }

/**
 * Le réglage des notifications pour cet appareil.
 *
 * Rend l'état courant, et les deux actions qui le font changer. Tout se fait
 * en douceur : une erreur laisse l'état inchangé et remplit `erreur`, jamais
 * d'exception qui remonterait dans un gestionnaire de clic.
 */
export function useNotifications() {
  const [etat, setEtat] = useState<EtatNotifications>('inconnu')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [clePublique, setClePublique] = useState<string | null>(null)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [choix, setChoix] = useState<Reglages>(REGLAGES_PAR_DEFAUT)

  useEffect(() => {
    let vivant = true

    void (async () => {
      if (!navigateurCompatible()) {
        if (vivant) setEtat('impossible')
        return
      }

      // La disponibilité côté serveur d'abord : inutile d'enregistrer un
      // travailleur de service pour un serveur qui ne peut rien envoyer.
      let cle: string | null = null
      try {
        const reponse = await fetch('/api/notifications')
        const donnees = (await reponse.json()) as {
          disponible?: boolean
          clePublique?: string | null
        }
        if (!donnees.disponible || !donnees.clePublique) {
          if (vivant) setEtat('indisponible')
          return
        }
        cle = donnees.clePublique
      } catch {
        if (vivant) setEtat('indisponible')
        return
      }

      const inscription = await enregistrerTravailleur()
      if (!vivant) return
      if (!inscription) {
        setEtat('impossible')
        return
      }

      setClePublique(cle)

      const abonnement = await inscription.pushManager.getSubscription()
      if (!vivant) return

      if (abonnement) {
        setEndpoint(abonnement.endpoint)
        setEtat('actif')

        // Les deux cases doivent refléter ce qui est enregistré, pas le
        // défaut : quelqu'un qui a coupé le rappel du jour ne doit pas le
        // retrouver coché au chargement suivant.
        try {
          const reponse = await fetch(
            `/api/notifications?endpoint=${encodeURIComponent(abonnement.endpoint)}`,
          )
          const donnees = (await reponse.json()) as { abonnement?: Reglages | null }
          if (vivant && donnees.abonnement) setChoix(donnees.abonnement)
        } catch {
          // Les cases restent au défaut : sans conséquence, elles ne
          // s'écrivent qu'au prochain changement volontaire.
        }
      } else if (Notification.permission === 'denied') {
        setEtat('refuse')
      } else {
        setEtat('a-activer')
      }
    })()

    return () => {
      vivant = false
    }
  }, [])

  const activer = useCallback(
    async (reglages: Reglages = REGLAGES_PAR_DEFAUT) => {
      if (!clePublique) return
      setOccupe(true)
      setErreur(null)
      try {
        // La demande de permission est ici, dans le clic, et nulle part
        // ailleurs — voir l'en-tête du fichier.
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setEtat(permission === 'denied' ? 'refuse' : 'a-activer')
          return
        }

        const inscription = await navigator.serviceWorker.ready
        const abonnement = await inscription.pushManager.subscribe({
          // Obligatoire : le navigateur exige qu'on montre quelque chose pour
          // chaque message reçu. Aucun n'accepte encore l'inverse.
          userVisibleOnly: true,
          applicationServerKey: versOctets(clePublique),
        })

        const brut = abonnement.toJSON() as {
          endpoint?: string
          keys?: { p256dh?: string; auth?: string }
        }

        const reponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            abonnement: { endpoint: brut.endpoint, keys: brut.keys },
            invitations: reglages.invitations,
            defiDuJour: reglages.defiDuJour,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        })

        if (!reponse.ok) {
          // Le navigateur nous croirait abonnés alors que le serveur ne saurait
          // pas où écrire : on défait pour que le bouton dise la vérité.
          await abonnement.unsubscribe().catch(() => undefined)
          const donnees = (await reponse.json().catch(() => ({}))) as { error?: string }
          setErreur(donnees.error ?? 'L’abonnement n’a pas pu être enregistré.')
          return
        }

        setEndpoint(abonnement.endpoint)
        setChoix(reglages)
        setEtat('actif')
      } catch {
        setErreur('Le navigateur a refusé l’abonnement.')
      } finally {
        setOccupe(false)
      }
    },
    [clePublique],
  )

  /**
   * Change ce à quoi cet appareil est abonné, sans le désabonner.
   *
   * L'affichage est mis à jour avant la réponse du serveur : une case qui met
   * un demi-tour de réseau à basculer donne l'impression de n'avoir pas été
   * cliquée, et on la reclique. En cas d'échec on revient en arrière.
   */
  const changerChoix = useCallback(
    async (reglages: Reglages) => {
      const precedent = choix
      setChoix(reglages)
      setErreur(null)
      try {
        const inscription = await navigator.serviceWorker.ready
        const abonnement = await inscription.pushManager.getSubscription()
        if (!abonnement) return

        const brut = abonnement.toJSON() as {
          endpoint?: string
          keys?: { p256dh?: string; auth?: string }
        }
        const reponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            abonnement: { endpoint: brut.endpoint, keys: brut.keys },
            invitations: reglages.invitations,
            defiDuJour: reglages.defiDuJour,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        })
        if (!reponse.ok) {
          setChoix(precedent)
          setErreur('Le réglage n’a pas été enregistré.')
        }
      } catch {
        setChoix(precedent)
        setErreur('Le réglage n’a pas été enregistré.')
      }
    },
    [choix],
  )

  const desactiver = useCallback(async () => {
    setOccupe(true)
    setErreur(null)
    try {
      const inscription = await navigator.serviceWorker.ready
      const abonnement = await inscription.pushManager.getSubscription()
      const adresse = abonnement?.endpoint ?? endpoint

      await abonnement?.unsubscribe().catch(() => undefined)
      if (adresse) {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: adresse }),
        }).catch(() => undefined)
      }

      setEndpoint(null)
      setEtat('a-activer')
    } finally {
      setOccupe(false)
    }
  }, [endpoint])

  /** Envoie une notification à cet appareil, pour vérifier qu'elle arrive. */
  const essayer = useCallback(async () => {
    if (!endpoint) return
    setOccupe(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'essai', endpoint }),
      })
      if (!reponse.ok) {
        const donnees = (await reponse.json().catch(() => ({}))) as { error?: string }
        setErreur(donnees.error ?? 'L’envoi a échoué.')
      }
    } finally {
      setOccupe(false)
    }
  }, [endpoint])

  return { etat, occupe, erreur, choix, activer, desactiver, changerChoix, essayer }
}
