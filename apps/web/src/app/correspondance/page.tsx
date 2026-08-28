'use client'

/**
 * Parties par correspondance.
 *
 * Un coup par jour ou deux : le mode qui convient à des amis qui ne sont
 * jamais connectés en même temps. Toute la page tient dans une question —
 * *où dois-je jouer ?* — d'où le tri : à toi d'abord, en attente ensuite,
 * terminées à la fin.
 *
 * L'échiquier est sur la même page que la liste : une correspondance se joue
 * en trente secondes, et faire naviguer pour un coup serait absurde.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Clock, Flag, Mailbox, Plus } from 'lucide-react'
import clsx from 'clsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

interface Game {
  id: string
  slug: string
  fen: string
  moves: string[]
  colour: 'w' | 'b'
  yourTurn: boolean
  opponent: string
  status: string
  result: string
  daysPerMove: number
  deadline: string | null
}

interface Friend {
  id: string
  username: string
}

/** Reste avant de perdre par dépassement, dit en clair. */
function remaining(deadline: string | null): string {
  if (!deadline) return ''
  const ms = Date.parse(deadline) - Date.now()
  if (ms <= 0) return 'délai dépassé'
  const hours = Math.round(ms / 3600_000)
  if (hours < 24) return `${hours} h restantes`
  return `${Math.round(hours / 24)} j restants`
}

export default function CorrespondencePage() {
  const [games, setGames] = useState<Game[] | null | undefined>(undefined)
  const [friends, setFriends] = useState<Friend[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [days, setDays] = useState(2)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/correspondance')
    if (response.status === 401) {
      setGames(null)
      return
    }
    const data: { games: Game[] } = await response.json()
    setGames(data.games ?? [])
    setCurrent((slug) => slug ?? data.games?.find((g) => g.yourTurn)?.slug ?? data.games?.[0]?.slug ?? null)
  }, [])

  useEffect(() => {
    void refresh().catch(() => setGames(null))
    void fetch('/api/amis')
      .then((r) => (r.ok ? r.json() : { friends: [] }))
      .then((d: { friends: Friend[] }) => setFriends(d.friends ?? []))
      .catch(() => setFriends([]))
  }, [refresh])

  const game = games?.find((entry) => entry.slug === current) ?? null

  const play = useCallback(
    async (from: Square, to: Square, promotion?: string) => {
      if (!game) return
      const response = await fetch('/api/correspondance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'move', slug: game.slug, from, target: to, promotion }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error ?? 'Coup refusé.')
        return
      }
      await refresh()
    },
    [game, refresh],
  )

  const start = useCallback(
    async (friendId: string) => {
      const response = await fetch('/api/correspondance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', to: friendId, days }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error ?? 'Création impossible.')
        return
      }
      setCurrent(data.slug)
      await refresh()
      toast.success('Partie lancée.', 'Les couleurs ont été tirées au sort.')
    },
    [days, refresh],
  )

  if (games === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (games === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<Mailbox size={28} />}
          title="La correspondance demande un compte"
          description="Une partie qui dure des semaines doit te retrouver d’une session à l’autre."
          action={
            <Link href="/connexion">
              <Button variant="primary">Se connecter</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const board = game ? new Chess(game.fen) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <SectionTitle hint="Un coup quand tu peux. Personne n’attend devant son écran.">
        Correspondance
      </SectionTitle>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ── Parties et nouvelle partie ────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Card className="p-2">
            {games.length === 0 ? (
              <p className="px-1 py-2 text-[13px] leading-relaxed text-faint">
                Aucune partie. Lance-en une avec quelqu’un de ton carnet.
              </p>
            ) : (
              <div className="space-y-0.5">
                {games.map((entry) => (
                  <button
                    key={entry.slug}
                    type="button"
                    onClick={() => setCurrent(entry.slug)}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors',
                      entry.slug === current ? 'bg-accent/18' : 'hover:bg-surface-hover',
                    )}
                  >
                    <span
                      className={clsx(
                        'h-2 w-2 shrink-0 rounded-full',
                        entry.result !== '*'
                          ? 'bg-line'
                          : entry.yourTurn
                            ? 'bg-[var(--accent-2)]'
                            : 'bg-[var(--q-inaccuracy)]',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {entry.opponent}
                      </span>
                      <span className="block text-[11px] text-faint">
                        {entry.result !== '*'
                          ? `terminée · ${entry.result}`
                          : entry.yourTurn
                            ? `à toi · ${remaining(entry.deadline)}`
                            : 'en attente'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Nouvelle partie
            </p>
            <label className="mb-2 flex items-center gap-2 text-[12px] text-muted">
              Délai par coup
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="rounded-[var(--radius-sm)] border border-line px-1.5 py-1 text-[12px]"
              >
                {[1, 2, 3, 7, 14].map((d) => (
                  <option key={d} value={d}>
                    {d} jour{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>
            {friends.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-faint">
                Ton carnet est vide.{' '}
                <Link href="/amis" className="text-accent hover:underline">
                  Ajoute quelqu’un
                </Link>{' '}
                pour lancer une correspondance.
              </p>
            ) : (
              <div className="space-y-0.5">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => void start(friend.id)}
                    className="flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-hover"
                  >
                    <Plus size={13} className="shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{friend.username}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          {game && board ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-medium">contre {game.opponent}</span>
                <span className="text-faint">
                  · tu joues les {game.colour === 'w' ? 'Blancs' : 'Noirs'} · {game.daysPerMove}{' '}
                  jour{game.daysPerMove > 1 ? 's' : ''} par coup
                </span>
                {game.result === '*' && (
                  <span
                    className={clsx(
                      'ml-auto flex items-center gap-1',
                      game.yourTurn ? 'font-semibold text-[var(--accent-2)]' : 'text-faint',
                    )}
                  >
                    <Clock size={13} aria-hidden />
                    {game.yourTurn ? `À toi — ${remaining(game.deadline)}` : 'En attente'}
                  </span>
                )}
              </div>

              <ChessBoard
                fen={game.fen}
                orientation={game.colour}
                playable={game.yourTurn && game.result === '*' ? game.colour : null}
                onMove={play}
                showViewToggle={false}
                reservedHeight={13}
              />

              {game.result !== '*' ? (
                <p className="mt-2 text-center text-[13px] text-muted">
                  Partie terminée — {game.result}.
                </p>
              ) : (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Flag size={14} />}
                    onClick={async () => {
                      if (!confirm('Abandonner cette partie ?')) return
                      await fetch('/api/correspondance', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ action: 'resign', slug: game.slug }),
                      })
                      await refresh()
                    }}
                  >
                    Abandonner
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="grid min-h-[300px] place-items-center p-6 text-center">
              <p className="text-sm text-muted">
                Choisis une partie à gauche, ou lance-en une avec quelqu’un de ton carnet.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
