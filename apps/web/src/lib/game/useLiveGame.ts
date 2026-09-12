'use client'

/**
 * Client des parties en direct.
 *
 * Le serveur fait autorité : ce module n'est qu'un relais. Il envoie l'intention
 * de coup, il reçoit l'état, il l'affiche. Aucune règle n'est appliquée ici —
 * si le serveur refuse, le coup n'a pas eu lieu.
 *
 * Deux précautions rendent l'expérience fluide malgré la latence :
 *
 *  - **Affichage optimiste.** Le coup s'affiche immédiatement, avant l'accusé de
 *    réception. Le serveur corrige si nécessaire — ce qui n'arrive presque
 *    jamais puisque le navigateur vérifie déjà la légalité de son côté.
 *  - **Pendules en horodatages.** Le serveur envoie des temps de référence ;
 *    on les date à la réception, et c'est la pastille elle-même qui décompte
 *    jusqu'au message suivant. Sans cela, l'horloge sauterait.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Color, PieceSymbol, Square } from 'chess.js'
import type { ClockState, GameResult, GameStatus, TimeControl } from '@coupparfait/core'

export interface LivePlayer {
  name: string
  rating: number | null
  connected: boolean
}

export interface ChatMessage {
  from: string
  text: string
  at: number
  system?: boolean
}

export interface GameSnapshot {
  slug: string
  fen: string
  moves: string[]
  lastMove: { from: Square; to: Square } | null
  turn: Color
  status: GameStatus
  result: GameResult
  players: { w: LivePlayer | null; b: LivePlayer | null }
  clock: { w: number; b: number; running: Color | null } | null
  timeControl: TimeControl
  rated: boolean
  drawOfferFrom: Color | null
  takebackFrom: Color | null
  chat: ChatMessage[]
  startedAt: number | null
  /** Nombre de personnes qui regardent sans jouer. */
  spectators: number
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface UseLiveGameOptions {
  slug: string
  /** Pseudo utilisé si l'on joue sans compte. */
  guestName?: string
  timeControl?: string
  rated?: boolean
  /** Jeton de session, transmis par le serveur Next au montage. */
  token?: string | null
  /**
   * Redemande un jeton frais avant chaque `join`.
   *
   * Le jeton remis au navigateur ne vit que quinze minutes. Une reconnexion
   * après ce délai — réseau coupé, onglet mis en veille — repartirait avec
   * le jeton du montage, périmé, et le joueur reviendrait en invité dans sa
   * propre partie. On le renouvelle donc à chaque présentation ; en cas
   * d'échec, on se présente avec celui qu'on a.
   */
  obtenirJeton?: () => Promise<string | null>
  /**
   * Faux tant que la page n'a pas résolu ce qu'elle veut envoyer au `join`.
   *
   * Le jeton et le pseudo d'invité arrivent après le montage — un appel
   * réseau, une lecture du stockage. Se connecter avant, c'était envoyer un
   * premier `join` anonyme, puis un second une fois le jeton connu ; or le
   * souhait de couleur est consommé au premier envoi, et c'est donc le
   * `join` anonyme qui le dépensait. La page attend d'être prête.
   */
  enabled?: boolean
}

export function useLiveGame({
  slug,
  guestName,
  timeControl,
  rated,
  token,
  obtenirJeton,
  enabled = true,
}: UseLiveGameOptions) {
  const socketRef = useRef<Socket | null>(null)
  const obtenirJetonRef = useRef(obtenirJeton)
  obtenirJetonRef.current = obtenirJeton
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [color, setColor] = useState<Color | null>(null)
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>([])

  /**
   * La pendule, figée en horodatages absolus.
   *
   * Elle ne change qu'à chaque message du serveur : c'est `PenduleVive` qui
   * la fait battre, dans la seule pastille qui l'affiche. Avant, ce crochet
   * tenait un compte à rebours dans son état et le décrémentait toutes les
   * 100 ms — dix rendus par seconde de toute la page de jeu pour deux nombres.
   */
  const [pendule, setPendule] = useState<ClockState | null>(null)

  // ── Connexion ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    /*
      L'adresse du serveur de parties.

      Elle est fixée à la construction : ce code tourne dans le navigateur, et
      Next remplace `process.env.NEXT_PUBLIC_*` par sa valeur pendant le
      `next build`. Une variable posée sur le conteneur n'y change rien — c'est
      ce qui a mis les parties en direct en panne en production, avec un
      serveur parfaitement sain en face. Voir `apps/web/Dockerfile`, qui refuse
      désormais de construire sans elle.

      Le repli ne vaut donc que pour le développement, où le serveur écoute sur
      la même machine.
    */
    const url =
      process.env.NEXT_PUBLIC_SERVER_URL ??
      `${window.location.protocol}//${window.location.hostname}:3001`

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 12,
      reconnectionDelay: 800,
      withCredentials: true,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnection('connected')
      setError(null)
      void (async () => {
        let jeton = token ?? undefined
        if (obtenirJetonRef.current) {
          try {
            jeton = (await obtenirJetonRef.current()) ?? undefined
          } catch {
            // Réseau capricieux : on se présente avec le jeton qu'on a.
          }
        }
        // Le socket a pu être remplacé ou fermé pendant l'attente.
        if (socketRef.current !== socket || !socket.connected) return
        socket.emit('join', {
          slug,
          name: guestName,
          token: jeton,
          clientId: getClientId(),
          // Couleur demandée par l'hôte à la création, s'il en a demandé une.
          //
          // Elle transite par le stockage de session et **jamais par le lien** :
          // le lien est fait pour être envoyé, et l'invité qui l'ouvrirait
          // réclamerait la même couleur que celui qui le lui a envoyé.
          //
          // Elle est consommée au premier envoi. Une reconnexion n'en a pas
          // besoin : le serveur reconnaît un joueur déjà assis et lui rend son
          // siège, quelle que soit la demande.
          souhait: souhaitPourCePartie(slug),
          timeControl,
          rated,
        })
      })()
    })

    socket.on('connect_error', () => {
      setConnection('error')
      setError(
        'Le serveur de parties est injoignable. Vérifie qu’il est démarré, ou joue contre l’ordinateur en attendant.',
      )
    })

    socket.on('disconnect', () => setConnection('disconnected'))

    socket.on('joined', (payload: { color: Color | null; snapshot: GameSnapshot }) => {
      setColor(payload.color)
      applySnapshot(payload.snapshot)
    })

    socket.on('state', (event: { snapshot: GameSnapshot }) => applySnapshot(event.snapshot))
    socket.on('move', (event: { snapshot: GameSnapshot }) => applySnapshot(event.snapshot))
    socket.on('end', (event: { snapshot: GameSnapshot }) => applySnapshot(event.snapshot))

    socket.on('chat', (event: { message: ChatMessage }) => {
      setChat((current) => [...current.slice(-80), event.message])
    })

    socket.on('error', (payload: { message?: string }) => {
      if (payload?.message) setError(payload.message)
    })

    function applySnapshot(next: GameSnapshot): void {
      setSnapshot(next)
      setChat(next.chat ?? [])
      // Les temps reçus valent à l'instant de réception : on les date ici,
      // et la pastille décompte depuis cette date jusqu'au message suivant.
      setPendule(
        next.clock
          ? {
              remaining: { w: next.clock.w, b: next.clock.b },
              running: next.clock.running,
              updatedAt: Date.now(),
              control: next.timeControl,
            }
          : null,
      )
    }

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [slug, guestName, timeControl, rated, token, enabled])

  // ── Actions ─────────────────────────────────────────────────────────────
  const move = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    socketRef.current?.emit('move', { from, to, promotion })
  }, [])

  const resign = useCallback(() => socketRef.current?.emit('resign'), [])
  const offerDraw = useCallback(() => socketRef.current?.emit('offerDraw'), [])
  const declineDraw = useCallback(() => socketRef.current?.emit('declineDraw'), [])
  const requestTakeback = useCallback(() => socketRef.current?.emit('requestTakeback'), [])
  const acceptTakeback = useCallback(() => socketRef.current?.emit('acceptTakeback'), [])
  const sendChat = useCallback((text: string) => {
    if (text.trim()) socketRef.current?.emit('chat', { text })
  }, [])

  /**
   * Annonce à la table qu'on vient de demander un indice au moteur.
   *
   * Ce n'est pas une demande d'autorisation : l'indice est calculé dans le
   * navigateur de celui qui le demande, et rien ne pourrait l'en empêcher — un
   * moteur d'analyse tourne dans l'autre onglet. Ce qu'on peut faire, et qu'on
   * fait ici, c'est **le dire**. Une partie amicale où l'un des deux se fait
   * souffler reste une partie amicale ; une partie amicale où l'un se fait
   * souffler en cachette, non.
   *
   * L'annonce part du client parce que lui seul sait qu'il a cliqué. Un joueur
   * malintentionné peut donc ne pas l'envoyer — mais un joueur malintentionné
   * n'utiliserait pas le bouton, il ouvrirait un autre onglet. On s'adresse à
   * celui qui joue de bonne foi, et pour lui le bouton est la voie facile.
   */
  const annoncerIndice = useCallback(() => socketRef.current?.emit('indice'), [])

  return {
    connection,
    color,
    snapshot,
    pendule,
    chat,
    error,
    dismissError: () => setError(null),
    move,
    resign,
    offerDraw,
    declineDraw,
    requestTakeback,
    acceptTakeback,
    sendChat,
    annoncerIndice,
  }
}

/**
 * Identifiant stable du navigateur.
 *
 * Sert à retrouver sa place dans une partie après un rafraîchissement, et à
 * distinguer deux invités qui portent le même pseudo. Il n'identifie personne :
 * c'est une valeur aléatoire locale, jamais transmise ailleurs qu'au serveur de
 * parties, et effaçable en vidant le stockage du navigateur.
 */
export function getClientId(): string {
  const key = 'coupparfait.clientId'
  try {
    const existing = localStorage.getItem(key)
    if (existing && existing.length >= 8) return existing
    const created = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem(key, created)
    return created
  } catch {
    // Stockage refusé : un identifiant de session suffit, on perdra seulement
    // la reprise de partie après rafraîchissement.
    return crypto.randomUUID().replace(/-/g, '')
  }
}

/**
 * Identifiant de partie court et lisible.
 *
 * Volontairement sans les caractères qu'on confond en le dictant au téléphone :
 * ni « 0 » ni « O », ni « 1 » ni « l » ni « I ».
 */
/** Clé du souhait de couleur, propre à une partie. */
const CLE_SOUHAIT = (slug: string) => `coupparfait.souhait.${slug}`

/** Enregistre la couleur demandée à la création. */
export function retenirSouhaitDeCouleur(slug: string, couleur: 'w' | 'b' | null): void {
  try {
    if (couleur) sessionStorage.setItem(CLE_SOUHAIT(slug), couleur)
    else sessionStorage.removeItem(CLE_SOUHAIT(slug))
  } catch {
    // Stockage refusé : la couleur sera simplement tirée au sort.
  }
}

/** Lit et efface le souhait : il ne vaut que pour la première prise de siège. */
function souhaitPourCePartie(slug: string): 'w' | 'b' | undefined {
  try {
    const valeur = sessionStorage.getItem(CLE_SOUHAIT(slug))
    if (valeur === 'w' || valeur === 'b') {
      sessionStorage.removeItem(CLE_SOUHAIT(slug))
      return valeur
    }
  } catch {
    // Stockage indisponible : on laisse le hasard décider.
  }
  return undefined
}

export function generateGameSlug(): string {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
  let slug = ''
  const values = new Uint32Array(8)
  crypto.getRandomValues(values)
  for (const value of values) slug += alphabet[value % alphabet.length]
  return slug
}
