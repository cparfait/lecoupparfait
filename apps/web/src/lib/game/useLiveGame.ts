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
 *  - **Interpolation des pendules.** Le serveur envoie des temps de référence ;
 *    le navigateur les décompte localement entre deux messages, puis se
 *    resynchronise à chaque mise à jour. Sans cela, l'horloge sauterait.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Color, PieceSymbol, Square } from 'chess.js'
import type { GameResult, GameStatus, TimeControl } from '@coupparfait/core'

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
}

export function useLiveGame({
  slug,
  guestName,
  timeControl,
  rated,
  token,
}: UseLiveGameOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [color, setColor] = useState<Color | null>(null)
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>([])

  /** Horloge interpolée localement entre deux messages du serveur. */
  const [clock, setClock] = useState<{ w: number; b: number } | null>(null)
  const clockRef = useRef<{ w: number; b: number; running: Color | null; at: number } | null>(null)

  // ── Connexion ───────────────────────────────────────────────────────────
  useEffect(() => {
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
      socket.emit('join', {
        slug,
        name: guestName,
        token: token ?? undefined,
        clientId: getClientId(),
        timeControl,
        rated,
      })
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
      if (next.clock) {
        clockRef.current = { ...next.clock, at: Date.now() }
        setClock({ w: next.clock.w, b: next.clock.b })
      } else {
        clockRef.current = null
        setClock(null)
      }
    }

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [slug, guestName, timeControl, rated, token])

  // ── Interpolation des pendules ──────────────────────────────────────────
  useEffect(() => {
    if (!clockRef.current) return
    const interval = setInterval(() => {
      const reference = clockRef.current
      if (!reference?.running) return
      const elapsed = Date.now() - reference.at
      setClock({
        w: reference.running === 'w' ? Math.max(0, reference.w - elapsed) : reference.w,
        b: reference.running === 'b' ? Math.max(0, reference.b - elapsed) : reference.b,
      })
    }, 100)
    return () => clearInterval(interval)
  }, [snapshot])

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

  return {
    connection,
    color,
    snapshot,
    clock,
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
export function generateGameSlug(): string {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
  let slug = ''
  const values = new Uint32Array(8)
  crypto.getRandomValues(values)
  for (const value of values) slug += alphabet[value % alphabet.length]
  return slug
}
