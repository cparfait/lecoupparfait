'use client'

/**
 * Chercher un adversaire inconnu, sur le serveur de parties.
 *
 * Le pendant client de la file d'attente (`apps/server/src/appariement.ts`,
 * protocole dans l'en-tête de `apps/server/src/index.ts`) : on s'inscrit par
 * `seek`, on attend `matched`, et la partie elle-même se joue ensuite par
 * `useLiveGame`, comme une partie ouverte par lien. Ce crochet ne tient donc
 * sa connexion que le temps de l'attente.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Color } from 'chess.js'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'
import { adresseDuServeurDeParties, getClientId } from '@/lib/game/useLiveGame.ts'

/** La partie trouvée, telle que le serveur l'annonce. */
export interface Appariement {
  slug: string
  color: Color
  /** Identifiant de cadence, `'180+2'`. */
  timeControl: string
  rated: boolean
  opponent: { name: string; rating: number | null }
}

export type EtatDeRecherche =
  | { phase: 'repos' }
  /** `depuis` est l'instant du clic : c'est l'attente que ressent le joueur. */
  | { phase: 'attente'; cadence: string; depuis: number }
  | { phase: 'trouve'; partie: Appariement }

/**
 * Les refus du serveur, par code. Ceux qu'on partage avec la partie en direct
 * gardent leur phrase ; les deux propres à la file ont la leur.
 */
const CLES_D_ERREUR: Record<string, TranslationKey> = {
  tooFast: 'live.errors.tooFast',
  serverFull: 'live.errors.serverFull',
  tooManyRooms: 'live.errors.tooManyRooms',
  badTimeControl: 'appariement.errors.badTimeControl',
  queueFull: 'appariement.errors.queueFull',
}

/** Le jeton du temps réel, comme sur la page de partie. `null` en invité. */
async function obtenirJeton(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/token', { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { token?: string | null }
    return data.token ?? null
  } catch {
    return null
  }
}

export function useAppariement() {
  const t = useT()
  const socketRef = useRef<Socket | null>(null)
  const [etat, setEtat] = useState<EtatDeRecherche>({ phase: 'repos' })
  const [erreur, setErreur] = useState<string | null>(null)

  const fermer = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.removeAllListeners()
    socket.disconnect()
    socketRef.current = null
  }, [])

  // Quitter la page, c'est quitter la file : la déconnexion suffit au serveur.
  useEffect(() => fermer, [fermer])

  const chercher = useCallback(
    (cadence: string) => {
      fermer()
      setErreur(null)
      setEtat({ phase: 'attente', cadence, depuis: Date.now() })

      const socket = io(adresseDuServeurDeParties(), {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 12,
        reconnectionDelay: 800,
        withCredentials: true,
      })
      socketRef.current = socket

      const abandonner = (message: string) => {
        fermer()
        setErreur(message)
        setEtat({ phase: 'repos' })
      }

      /*
        À chaque connexion, et donc à chaque reconnexion : le serveur a retiré
        de la file la connexion tombée, il faut s'y réinscrire. L'attente
        affichée, elle, continue depuis le clic.
      */
      socket.on('connect', () => {
        void (async () => {
          const jeton = await obtenirJeton()
          if (socketRef.current !== socket || !socket.connected) return
          let name: string | undefined
          try {
            name = localStorage.getItem('coupparfait.guestName') ?? undefined
          } catch {
            // Sans stockage, le serveur nommera l'invité.
          }
          socket.emit('seek', {
            timeControl: cadence,
            token: jeton ?? undefined,
            clientId: getClientId(),
            name,
          })
        })()
      })

      socket.on('connect_error', () => abandonner(t('rest.liveServerDown')))

      socket.on('matched', (partie: Appariement) => {
        fermer()
        setEtat({ phase: 'trouve', partie })
      })

      socket.on('seekCancelled', (payload: { reason?: string }) => {
        // `refused` suit toujours un `error` qui dit déjà pourquoi.
        if (payload?.reason === 'replaced') abandonner(t('appariement.errors.replaced'))
        else if (payload?.reason === 'refused') {
          fermer()
          setEtat({ phase: 'repos' })
        }
      })

      socket.on('error', (payload: { code?: string }) => {
        if (!payload?.code) return
        abandonner(t(CLES_D_ERREUR[payload.code] ?? 'live.errors.unknown'))
      })
    },
    [fermer, t],
  )

  const annuler = useCallback(() => {
    socketRef.current?.emit('cancelSeek')
    fermer()
    setEtat({ phase: 'repos' })
  }, [fermer])

  return { etat, erreur, chercher, annuler, effacerErreur: () => setErreur(null) }
}
