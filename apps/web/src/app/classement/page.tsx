'use client'

/**
 * Classement général.
 *
 * Un point expliqué en toutes lettres sur la page : le tri se fait sur un
 * classement **conservateur**, pas sur le classement brut. Sans cela, un joueur
 * ayant gagné trois parties par chance trônerait en tête avec une incertitude
 * énorme. Le dire évite l'incompréhension quand on ne se voit pas au rang qu'on
 * espérait.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Medal, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { PlayerSearch } from '@/components/social/PlayerSearch.tsx'
import { SPEED_LABELS } from '@coupparfait/core'
import { Card, EmptyState, Skeleton } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'

interface LeaderboardPlayer {
  rank: number
  username: string
  avatar: string | null
  rating: number
  provisional: boolean
  elo: number
  games: number
  wins: number
  losses: number
  draws: number
  winRate: number
  peak: number
}

const CATEGORIES = [
  { id: 'bullet', label: 'Bullet' },
  { id: 'blitz', label: 'Blitz' },
  { id: 'rapid', label: 'Rapide' },
  { id: 'classical', label: 'Classique' },
  { id: 'puzzle', label: 'Puzzles' },
] as const

export default function LeaderboardPage() {
  const t = useT()
  const [category, setCategory] = useState<string>('rapid')
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [minGames, setMinGames] = useState(5)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setUnavailable(false)
    try {
      const response = await fetch(`/api/classement?categorie=${id}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        setUnavailable(true)
        setPlayers([])
        return
      }
      setPlayers(data.players ?? [])
      setMinGames(data.minGames ?? 5)
    } catch {
      setUnavailable(true)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(category)
  }, [category, load])

  return (
    <div className="page-etroite">
      <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        <Trophy size={26} className="text-accent" aria-hidden />
        Classement
      </h1>
      <p className="mt-2 text-sm text-muted">
        Classement Glicko-2, comme sur les grandes plateformes. Il faut au moins {minGames} parties
        pour y figurer.
      </p>

      {/*
        Le classement écarte qui n'a pas joué cinq parties classées : chercher
        quelqu'un ne doit pas en dépendre. Cette recherche-là interroge tout
        l'annuaire, y compris les comptes du premier jour.
      */}
      <PlayerSearch className="mt-4" />

      <div className="mt-5 flex flex-wrap gap-1.5">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setCategory(entry.id)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              category === entry.id
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            {entry.id !== 'puzzle' && (
              <span className="mr-1" aria-hidden>
                {SPEED_LABELS[entry.id as keyof typeof SPEED_LABELS]?.icon}
              </span>
            )}
            {entry.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : unavailable ? (
          <EmptyState
            icon={<Trophy size={26} />}
            title={t('leaderboard.unavailable')}
            description={t('leaderboard.unavailableHint')}
          />
        ) : players.length === 0 ? (
          <EmptyState
            icon={<Medal size={26} />}
            title={t('leaderboard.empty')}
            description={t('leaderboard.emptyHint', { n: minGames })}
          />
        ) : (
          <ul>
            {players.map((player) => (
              <li key={player.username}>
                <Link
                  href={`/profil/${player.username}`}
                  className="flex items-center gap-3 border-b border-line/40 px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-hover"
                >
                  <span
                    className={clsx(
                      'w-7 shrink-0 text-center text-sm font-bold tabular-nums',
                      player.rank === 1 && 'text-[#f0b429]',
                      player.rank === 2 && 'text-[#c0c8d0]',
                      player.rank === 3 && 'text-[#cd7f32]',
                      player.rank > 3 && 'text-faint',
                    )}
                  >
                    {player.rank}
                  </span>

                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong"
                    aria-hidden
                  >
                    {player.avatar ?? '♟️'}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{player.username}</span>
                    <span className="block text-[12px] text-faint">
                      {player.games} parties · {player.winRate} % de victoires
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg font-bold tabular-nums">
                      {player.rating}
                      {player.provisional && <span className="text-faint">?</span>}
                    </span>
                    <span className="block text-[12px] text-faint">Elo {player.elo}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-[12px] font-semibold text-faint">{t('last.howRatingWorks')}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {t('leaderboard.conservativeBefore')}{' '}
          <strong className="text-ink">{t('leaderboard.conservativeStrong')}</strong>
          {t('leaderboard.conservativeAfter')}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {t('leaderboard.provisionalNote')}
        </p>
      </Card>
    </div>
  )
}
