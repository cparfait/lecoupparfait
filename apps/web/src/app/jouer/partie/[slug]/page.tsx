'use client'

/**
 * Partie en direct.
 *
 * L'écran de jeu en ligne. Tout ce qui touche aux règles et aux pendules vient
 * du serveur ; cette page se contente d'afficher l'état reçu et d'envoyer les
 * intentions du joueur.
 *
 * Un point d'attention particulier : la **reconnexion**. Une partie d'échecs
 * dure plusieurs minutes, un téléphone passe du Wi-Fi à la 4G, un onglet se met
 * en veille. La bannière de connexion est donc toujours visible quand quelque
 * chose ne va pas, et le serveur garde la place du joueur pendant une minute.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Eye,
  Flag,
  Handshake,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Undo2,
  WifiOff,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { formatTimeControl, parseTimeControl } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { Button, Card, Chip, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useLiveGame } from '@/lib/game/useLiveGame.ts'
import { playMoveSound, playResultSound, playSound } from '@/lib/sound.ts'
import { useCurrentOpening } from '@/lib/game/useOpeningBook.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'

export default function LiveGamePage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const locale = usePreferences((state) => state.locale)

  const timeControlId = search.get('tc') ?? '600+5'
  const rated = search.get('classee') === '1'

  const [guestName, setGuestName] = useState<string | undefined>()
  const [token, setToken] = useState<string | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  // Pseudo d'invité et jeton de session, tous deux côté navigateur.
  useEffect(() => {
    try {
      setGuestName(localStorage.getItem('coupparfait.guestName') ?? undefined)
    } catch {
      // Sans stockage local, on jouera sous le nom « Invité ».
    }
    void fetch('/api/auth/token')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setToken(data?.token ?? null))
      .catch(() => setToken(null))
  }, [])

  const game = useLiveGame({
    slug: params.slug,
    guestName,
    timeControl: timeControlId,
    rated,
    token,
  })

  const { snapshot, color, clock, connection, chat } = game

  // ── Effets sonores ──────────────────────────────────────────────────────
  const lastMoveCount = useRef(0)
  useEffect(() => {
    if (!snapshot) return
    if (snapshot.moves.length > lastMoveCount.current) {
      const board = new Chess()
      for (const san of snapshot.moves) {
        try {
          board.move(san)
        } catch {
          break
        }
      }
      const last = snapshot.moves[snapshot.moves.length - 1] ?? ''
      playMoveSound({
        isCapture: last.includes('x'),
        isCheck: last.includes('+'),
        isCheckmate: last.includes('#'),
        isCastle: last.startsWith('O-O'),
        isPromotion: last.includes('='),
      })
    }
    lastMoveCount.current = snapshot.moves.length
  }, [snapshot])

  const finished = useRef(false)
  useEffect(() => {
    if (!snapshot || finished.current) return
    if (snapshot.status === 'playing' || snapshot.status === 'waiting') return
    finished.current = true
    const won = color !== null && snapshot.result === (color === 'w' ? '1-0' : '0-1')
    playResultSound(snapshot.result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
  }, [snapshot, color])

  // Proposition de nulle reçue.
  useEffect(() => {
    if (!snapshot?.drawOfferFrom || !color) return
    if (snapshot.drawOfferFrom === color) return
    playSound('notify')
    toast.info('Ton adversaire propose la nulle.', 'Accepte ou refuse ci-dessous.')
  }, [snapshot?.drawOfferFrom, color])

  useEffect(() => {
    if (game.error) {
      toast.error(game.error)
      game.dismissError()
    }
  }, [game])

  // ── Coups légaux ────────────────────────────────────────────────────────
  const legalMoves = useMemo(() => {
    const map = new Map<Square, Square[]>()
    if (!snapshot || !color || snapshot.turn !== color || snapshot.status !== 'playing') {
      return map
    }
    try {
      const board = new Chess(snapshot.fen, { skipValidation: true })
      for (const move of board.moves({ verbose: true })) {
        const list = map.get(move.from) ?? []
        if (!list.includes(move.to)) list.push(move.to)
        map.set(move.from, list)
      }
    } catch {
      // Position inattendue : aucun coup proposé, le serveur reste maître.
    }
    return map
  }, [snapshot, color])

  const checkSquare = useMemo(() => {
    if (!snapshot) return null
    try {
      const board = new Chess(snapshot.fen, { skipValidation: true })
      if (!board.inCheck()) return null
      return board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
    } catch {
      return null
    }
  }, [snapshot])

  const playedMoves = useMemo<PlayedMove[]>(() => {
    if (!snapshot) return []
    const board = new Chess()
    const list: PlayedMove[] = []
    for (const san of snapshot.moves) {
      try {
        const move = board.move(san)
        list.push({
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion ?? ''}`,
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          color: move.color,
          before: move.before,
          after: move.after,
          at: 0,
          isCheck: move.san.includes('+'),
          isCheckmate: move.san.includes('#'),
          isCapture: move.isCapture(),
          isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
        })
      } catch {
        break
      }
    }
    return list
  }, [snapshot])

  const opening = useCurrentOpening(snapshot?.moves ?? [], locale)

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      game.move(from, to, promotion)
    },
    [game],
  )

  // ── États d'attente ─────────────────────────────────────────────────────
  if (connection === 'connecting' || !snapshot) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4">
        <Card className="w-full p-8 text-center">
          <Spinner size={26} className="mx-auto text-accent" />
          <p className="mt-4 text-sm font-medium">Connexion à la partie…</p>
          <p className="mt-1 text-xs text-muted">Partie {params.slug}</p>
        </Card>
      </div>
    )
  }

  if (connection === 'error') {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4">
        <Card className="w-full p-8 text-center">
          <WifiOff size={28} className="mx-auto text-[var(--q-blunder)]" aria-hidden />
          <p className="mt-4 font-medium">Serveur de parties injoignable</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Le service temps réel ne répond pas. Vérifie qu’il est démarré, ou joue contre
            l’ordinateur en attendant — cela fonctionne entièrement dans ton navigateur.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </Card>
      </div>
    )
  }

  const orientation: Color = color ?? 'w'
  const opponentColor: Color = orientation === 'w' ? 'b' : 'w'
  const me = snapshot.players[orientation]
  const opponent = snapshot.players[opponentColor]
  const waiting = snapshot.status === 'waiting'
  const over = snapshot.status !== 'playing' && snapshot.status !== 'waiting'
  const timeControl = parseTimeControl(timeControlId) ?? { initial: 600, increment: 5 }
  const drawOfferedToMe =
    snapshot.drawOfferFrom !== null && color !== null && snapshot.drawOfferFrom !== color

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 lg:py-6">
      {connection === 'disconnected' && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-inaccuracy)_16%,transparent)] px-3 py-2 text-sm text-[var(--q-inaccuracy)]">
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Connexion perdue — reconnexion en cours. Ta place est gardée une minute.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Échiquier ──────────────────────────────────────────── */}
        <div className="min-w-0">
          <PlayerBar
            name={opponent?.name ?? 'En attente…'}
            rating={opponent?.rating ?? null}
            color={opponentColor}
            timeMs={clock ? clock[opponentColor] : null}
            timeControl={timeControl}
            active={snapshot.turn === opponentColor && !over}
            status={opponent && !opponent.connected ? 'déconnecté' : undefined}
          />

          <div className="my-1.5">
            <ChessBoard
              fen={snapshot.fen}
              orientation={orientation}
              playable={
                color !== null && snapshot.turn === color && snapshot.status === 'playing'
                  ? color
                  : null
              }
              legalMoves={legalMoves}
              onMove={handleMove}
              lastMove={snapshot.lastMove}
              checkSquare={checkSquare}
              // Cinq autres pages l'annonçaient, celle-ci non : le mat qu'on
              // vient de porter à un ami passait donc inaperçu, alors que
              // c'est le seul moment de la partie qui mérite une animation.
              checkmate={snapshot.status === 'checkmate'}
            />
          </div>

          <PlayerBar
            name={me?.name ?? 'Toi'}
            rating={me?.rating ?? null}
            color={orientation}
            timeMs={clock ? clock[orientation] : null}
            timeControl={timeControl}
            active={snapshot.turn === orientation && !over}
          />

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {drawOfferedToMe ? (
              <>
                <Button size="sm" variant="primary" onClick={game.offerDraw}>
                  Accepter la nulle
                </Button>
                <Button size="sm" variant="ghost" onClick={game.declineDraw}>
                  Refuser
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={<Handshake size={14} />}
                onClick={game.offerDraw}
                disabled={over || waiting || color === null}
              >
                {snapshot.drawOfferFrom === color ? 'Nulle proposée' : 'Proposer nulle'}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              onClick={
                snapshot.takebackFrom && snapshot.takebackFrom !== color
                  ? game.acceptTakeback
                  : game.requestTakeback
              }
              disabled={over || waiting || color === null || snapshot.moves.length < 2}
            >
              {snapshot.takebackFrom && snapshot.takebackFrom !== color
                ? 'Accepter la reprise'
                : 'Reprendre'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              icon={<Flag size={14} />}
              onClick={() => {
                if (confirm('Abandonner la partie ?')) game.resign()
              }}
              disabled={over || waiting || color === null}
            >
              Abandonner
            </Button>

            <Button
              size="sm"
              variant="ghost"
              icon={<MessageSquare size={14} />}
              onClick={() => setChatOpen((value) => !value)}
              className="ml-auto lg:hidden"
            >
              Tchat
            </Button>
          </div>
        </div>

        {/* ── Panneau latéral ────────────────────────────────────── */}
        <div className={clsx('flex min-h-0 flex-col gap-3', !chatOpen && 'max-lg:hidden')}>
          {/*
            Spectateur : les deux places étaient prises à l'arrivée. Le dire
            évite de chercher pourquoi l'échiquier ne répond pas.
          */}
          {color === null && !waiting && (
            <Card className="p-3">
              <p className="flex items-center gap-2 text-[13px] leading-relaxed text-muted">
                <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                <span>
                  Tu regardes cette partie.{' '}
                  {snapshot.spectators > 1 &&
                    `Vous êtes ${snapshot.spectators} à la suivre. `}
                  Tu peux écrire dans le tchat, mais pas jouer.
                </span>
              </p>
            </Card>
          )}

          {waiting && (
            <Card glow className="p-4 text-center">
              <Spinner size={20} className="mx-auto text-accent" />
              <p className="mt-3 text-sm font-medium">En attente de ton adversaire…</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Partage l’adresse de cette page. La partie démarrera dès qu’il arrivera.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href)
                  toast.success('Lien copié')
                }}
              >
                Copier le lien
              </Button>
            </Card>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Chip>{formatTimeControl(timeControl)}</Chip>
            <Chip tone={snapshot.rated ? 'accent' : 'neutral'}>
              {snapshot.rated ? 'Classée' : 'Amicale'}
            </Chip>
            {opening && <Chip>{opening.eco}</Chip>}
          </div>

          {opening && (
            <p className="-mt-1 truncate text-xs text-muted">{opening.name}</p>
          )}

          {/* La liste cède la place : c'est elle qui peut se réduire, pas le
              tchat — deux lignes de coups restent lisibles, deux lignes de
              conversation ne sont plus une conversation. */}
          <Card className="flex min-h-[120px] flex-1 flex-col overflow-hidden">
            <MoveList
              moves={playedMoves}
              cursor={playedMoves.length - 1}
              onSeek={() => {
                /* la navigation dans l'historique est désactivée en direct */
              }}
              controls={false}
              className="min-h-0 flex-1"
            />
          </Card>

          {/* ── Tchat ──────────────────────────────────────────── */}
          {/*
            Hauteur imposée plutôt que plafonnée.
            
            Avec un simple plafond, le tchat était le premier à céder sous la
            liste des coups : mesuré à 92 px de haut en fin de colonne, dont la
            moitié pour la saisie — il restait une ligne de messages, ce qui
            n'est plus un tchat mais une fente.
          */}
          <Card className="flex h-56 shrink-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 text-[13px]">
              {chat.length === 0 ? (
                <p className="text-xs text-faint">Dis bonjour à ton adversaire.</p>
              ) : (
                chat.map((message, index) => (
                  <p
                    key={`${message.at}-${index}`}
                    className={message.system ? 'text-xs italic text-faint' : ''}
                  >
                    {!message.system && (
                      <span className="font-semibold text-accent">{message.from} : </span>
                    )}
                    {message.text}
                  </p>
                ))
              )}
            </div>
            <form
              className="flex gap-1.5 border-t border-line/60 p-2"
              onSubmit={(event) => {
                event.preventDefault()
                game.sendChat(chatDraft)
                setChatDraft('')
              }}
            >
              <input
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Message…"
                maxLength={300}
                aria-label="Message de tchat"
                className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[13px] placeholder:text-faint focus:border-accent focus:outline-none"
              />
              <Button size="sm" type="submit" variant="secondary" aria-label="Envoyer">
                <Send size={13} aria-hidden />
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {over && (
        <GameOverDialog
          status={snapshot.status}
          result={snapshot.result}
          playerColor={color}
          opponentName={opponent?.name ?? 'Adversaire'}
          moves={playedMoves}
          onNewGame={() => window.location.assign('/jouer/ami')}
        />
      )}
    </div>
  )
}
