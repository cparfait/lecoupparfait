'use client'

/**
 * Regarder une partie.
 *
 * Le salon acceptait déjà un troisième arrivant — c'est ce que fait le serveur
 * quand les deux places sont prises — mais rien ne permettait d'en trouver un :
 * il fallait connaître l'adresse. Cette page les liste.
 *
 * Seules les parties commencées y figurent. Une partie qui attend encore son
 * adversaire n'a rien à montrer, et s'y installer prendrait la place de celui
 * qu'on attend.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Users } from 'lucide-react'
import { SPEED_LABELS, speedCategory, type TimeControl } from '@coupparfait/core'
import { Card, EmptyState, SectionTitle, Spinner } from '@/components/ui/index.tsx'

interface LiveGame {
  slug: string
  white: string
  black: string
  whiteRating: number | null
  blackRating: number | null
  moves: number
  timeControl: TimeControl
  rated: boolean
  spectators: number
}

/** La liste bouge à chaque partie qui commence ou se termine, pas à chaque coup. */
const POLL_MS = 6000

export default function WatchPage() {
  const [games, setGames] = useState<LiveGame[] | null>(null)
  const [offline, setOffline] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/parties')
      const data: { games?: LiveGame[] } = await response.json()
      setOffline(!response.ok)
      setGames(data.games ?? [])
    } catch {
      setOffline(true)
      setGames([])
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  if (games === null) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <SectionTitle hint="Les parties commencées, telles qu’elles se jouent en ce moment.">
        Regarder
      </SectionTitle>

      {offline ? (
        <EmptyState
          icon={<Eye size={28} />}
          title="Serveur de parties injoignable"
          description="Impossible de savoir qui joue en ce moment. Vérifie que le serveur temps réel tourne."
        />
      ) : games.length === 0 ? (
        <EmptyState
          icon={<Eye size={28} />}
          title="Personne ne joue en ce moment"
          description="Les parties commencées apparaîtront ici, et tu pourras les suivre coup par coup."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {games.map((game) => {
            const speed = speedCategory(game.timeControl)
            return (
              <Link key={game.slug} href={`/jouer/partie/${game.slug}`} className="block">
                <Card className="p-3 transition-colors hover:bg-surface-hover">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {game.white}
                        {game.whiteRating != null && (
                          <span className="text-faint"> {game.whiteRating}</span>
                        )}
                        <span className="mx-1.5 text-faint">contre</span>
                        {game.black}
                        {game.blackRating != null && (
                          <span className="text-faint"> {game.blackRating}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-faint">
                        {SPEED_LABELS[speed]?.icon} {SPEED_LABELS[speed]?.fr} · {game.moves}{' '}
                        demi-coup{game.moves > 1 ? 's' : ''}
                        {game.rated ? ' · classée' : ''}
                      </span>
                    </span>

                    {game.spectators > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-1 text-[12px] text-faint"
                        title={`${game.spectators} personne${game.spectators > 1 ? 's' : ''} regarde${game.spectators > 1 ? 'nt' : ''}`}
                      >
                        <Users size={13} aria-hidden />
                        {game.spectators}
                      </span>
                    )}
                    <Eye size={16} className="shrink-0 text-accent" aria-hidden />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
