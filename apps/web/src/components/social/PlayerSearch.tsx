'use client'

/**
 * Chercher quelqu'un dans l'annuaire.
 *
 * La seule recherche existante était celle du carnet d'adresses : elle
 * demandait une session, et ne servait qu'à ajouter un ami. On ne pouvait donc
 * pas simplement regarder le profil de quelqu'un dont on avait entendu le
 * pseudo — ni le trouver avant d'avoir un compte.
 *
 * Celle-ci cherche dans tout l'annuaire, sans condition, et mène au profil.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, X } from 'lucide-react'
import clsx from 'clsx'

interface Player {
  username: string
  avatar: string | null
  countryCode: string | null
  rating: number | null
  games: number | null
}

/** Le temps de finir de taper avant d'interroger le serveur. */
const DEBOUNCE_MS = 250

export function PlayerSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setPlayers([])
      return
    }

    setSearching(true)
    const timer = setTimeout(() => {
      void fetch(`/api/joueurs?q=${encodeURIComponent(needle)}`)
        .then((response) => (response.ok ? response.json() : { players: [] }))
        .then((data: { players: Player[] }) => {
          setPlayers(data.players ?? [])
          setOpen(true)
        })
        .catch(() => setPlayers([]))
        .finally(() => setSearching(false))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // Un clic ailleurs referme la liste : sans cela elle recouvre le classement
  // qu'on voulait consulter.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={container} className={clsx('relative', className)}>
      <Search
        size={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => players.length > 0 && setOpen(true)}
        placeholder="Chercher un joueur…"
        aria-label="Chercher un joueur dans l’annuaire"
        className="h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-8 pr-8 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setPlayers([])
          }}
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink"
          aria-label="Effacer"
        >
          {searching ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <X size={13} aria-hidden />
          )}
        </button>
      )}

      {open && query.trim().length >= 2 && (
        // Opaque : la liste se superpose au classement, qu'on ne doit pas lire
        // au travers.
        <div className="popover absolute left-0 right-0 top-11 z-50 max-h-80 overflow-y-auto p-1 shadow-[var(--shadow-lg)]">
          {players.length === 0 ? (
            <p className="px-2.5 py-3 text-[14px] text-faint">
              {searching ? 'Recherche…' : 'Personne de ce nom dans l’annuaire.'}
            </p>
          ) : (
            players.map((player) => (
              <Link
                key={player.username}
                href={`/profil/${player.username}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-surface-hover"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-strong text-sm">
                  <span aria-hidden>{player.avatar ?? '♟️'}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                  {player.username}
                </span>
                {player.rating != null && (
                  <span className="shrink-0 text-[12px] tabular-nums text-faint">
                    {player.rating}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
