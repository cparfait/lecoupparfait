'use client'

/**
 * Parties par correspondance — la boîte de réception.
 *
 * Un coup par jour ou deux : le mode qui convient à des amis qui ne sont
 * jamais connectés en même temps. Toute la page tient dans une question —
 * *où dois-je jouer ?* — d'où le tri : à toi d'abord, en attente ensuite,
 * terminées à la fin.
 *
 * On ne crée plus de partie ici. Cet écran n'est pas un mode de jeu mais une
 * liste d'obligations, et il était rangé au même niveau que « Contre un ami »,
 * ce qui obligeait à trancher « ami ou correspondance ? » avant de savoir à
 * quel rythme on voulait jouer. La création vit désormais avec les autres
 * cadences, dans `/jouer/ami`.
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
import { useT } from '@/lib/i18n/index.tsx'
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

/** Reste avant de perdre par dépassement, dit en clair. */
/*
  Le traducteur passe en argument.

  La fonction est pure et vit hors de tout composant : elle ne peut pas
  appeler `useT()` elle-même, comme `libelleDeLaCible` de la page du palier.
*/
function remaining(deadline: string | null, t: ReturnType<typeof useT>): string {
  if (!deadline) return ''
  const ms = Date.parse(deadline) - Date.now()
  if (ms <= 0) return t('correspondence.overdue')
  const hours = Math.round(ms / 3600_000)
  if (hours < 24) return t('correspondence.hoursLeft', { n: hours })
  const jours = Math.round(hours / 24)
  return t(jours > 1 ? 'correspondence.daysLeft' : 'correspondence.dayLeftOne', { n: jours })
}

export default function CorrespondencePage() {
  const t = useT()
  const [games, setGames] = useState<Game[] | null | undefined>(undefined)
  const [current, setCurrent] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/correspondance')
    if (response.status === 401) {
      setGames(null)
      return
    }
    const data: { games: Game[] } = await response.json()
    setGames(data.games ?? [])
    setCurrent(
      (slug) => slug ?? data.games?.find((g) => g.yourTurn)?.slug ?? data.games?.[0]?.slug ?? null,
    )
  }, [])

  // Le carnet d'amis était chargé ici pour la création de partie, qui a
  // déménagé : une requête de moins à chaque ouverture de la boîte.
  useEffect(() => {
    void refresh().catch(() => setGames(null))
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
        toast.error(data.error ?? t('correspondence.moveRefused'))
        // 409 : la partie a bougé entre-temps (abandon, autre coup). On la
        // relit, sans quoi l'échiquier resterait sur la position périmée.
        if (response.status === 409) await refresh()
        return
      }
      await refresh()
    },
    [game, refresh, t],
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
      <div className="page-etroite">
        <EmptyState
          icon={<Mailbox size={28} />}
          title={t('correspondence.needsAccount')}
          description={t('correspondence.needsAccountHint')}
          action={
            <Link href="/connexion">
              <Button variant="primary">{t('nav.signIn')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const board = game ? new Chess(game.fen) : null

  return (
    <div className="page">
      <SectionTitle hint={t('correspondence.hint')}>{t('correspondence.title')}</SectionTitle>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ── Parties et nouvelle partie ────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Card className="p-2">
            {games.length === 0 ? (
              <p className="px-1 py-2 text-[14px] leading-relaxed text-faint">
                {t('correspondence.noGame')}
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
                            ? 'bg-[var(--q-best)]'
                            : 'bg-[var(--q-inaccuracy)]',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">
                        {entry.opponent}
                      </span>
                      <span className="block text-[12px] text-faint">
                        {entry.result !== '*'
                          ? t('correspondence.finished', { resultat: entry.result })
                          : entry.yourTurn
                            ? t('correspondence.yourTurnShort', {
                                temps: remaining(entry.deadline, t),
                              })
                            : t('correspondence.waitingShort')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/*
            Créer une partie se fait ailleurs.
            Cet écran répond à une seule question — « où dois-je jouer ? » — et
            c'est une boîte de réception, pas un mode de jeu. Y loger aussi la
            création obligeait à choisir « correspondance » avant de choisir un
            rythme, alors que c'est le rythme qui distingue une correspondance
            d'une partie en direct. Les deux se choisissent donc au même endroit.
          */}
          <Card className="p-3">
            <p className="mb-2 text-[12px] font-semibold text-faint">
              {t('correspondence.newGame')}
            </p>
            <p className="mb-2 text-[12px] leading-relaxed text-muted">
              {t('correspondence.newGameHint')}
            </p>
            <Link
              href="/jouer/ami"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline"
            >
              <Plus size={13} aria-hidden />
              {t('correspondence.playSomeone')}
            </Link>
          </Card>
        </div>

        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          {game && board ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[14px]">
                <span className="font-medium">
                  {t('correspondence.versus', { nom: game.opponent })}
                </span>
                <span className="text-faint">
                  {t(
                    game.daysPerMove > 1
                      ? 'correspondence.youPlayDays'
                      : 'correspondence.youPlayDay',
                    {
                      couleur: t(game.colour === 'w' ? 'play.white' : 'play.black'),
                      n: game.daysPerMove,
                    },
                  )}
                </span>
                {game.result === '*' && (
                  <span
                    className={clsx(
                      'ml-auto flex items-center gap-1',
                      game.yourTurn ? 'font-semibold text-[var(--q-best)]' : 'text-faint',
                    )}
                  >
                    <Clock size={13} aria-hidden />
                    {game.yourTurn
                      ? t('correspondence.yourTurnIn', { temps: remaining(game.deadline, t) })
                      : t('correspondence.waiting')}
                  </span>
                )}
              </div>

              <ChessBoard
                fen={game.fen}
                orientation={game.colour}
                playable={game.yourTurn && game.result === '*' ? game.colour : null}
                onMove={play}
                checkmate={game.status === 'checkmate'}
                showViewToggle={false}
                reservedHeight={13}
              />

              {game.result !== '*' ? (
                <p className="mt-2 text-center text-[14px] text-muted">
                  {t('correspondence.gameOver', { resultat: game.result })}
                </p>
              ) : (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Flag size={14} />}
                    onClick={async () => {
                      if (!confirm(t('correspondence.resignConfirm'))) return
                      await fetch('/api/correspondance', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ action: 'resign', slug: game.slug }),
                      })
                      await refresh()
                    }}
                  >
                    {t('game.resign')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="grid min-h-[300px] place-items-center p-6 text-center">
              <p className="text-sm text-muted">{t('correspondence.pickAGame')}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
