'use client'

/**
 * Les arènes.
 *
 * Un seul format, et c'est délibéré : on arrive quand on veut, on part quand
 * on veut, et dès qu'une partie finit on est réapparié. C'est le seul format
 * praticable pour un cercle d'amis — un tournoi à rondes fixes suppose que
 * tout le monde soit là à l'heure dite.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Timer, Users } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

interface Tournament {
  slug: string
  name: string
  initialTime: number
  increment: number
  durationMinutes: number
  startsAt: string
  status: string
  players: number
}

const STATUS: Record<string, { label: string; tone: string }> = {
  running: { label: 'En cours', tone: 'text-[var(--accent-2)]' },
  scheduled: { label: 'À venir', tone: 'text-accent' },
  finished: { label: 'Terminé', tone: 'text-faint' },
}

export default function TournamentsPage() {
  const [list, setList] = useState<Tournament[] | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const identite = useIdentite()
  useEffect(() => {
    if (identite !== undefined) setSignedIn(identite !== null)
  }, [identite])

  const refresh = useCallback(async () => {
    const data: { tournaments: Tournament[] } = await (await fetch('/api/tournois')).json()
    setList(data.tournaments ?? [])
  }, [])

  useEffect(() => {
    void refresh().catch(() => setList([]))
    // Une arène démarre toute seule : la liste doit suivre sans qu'on
    // rafraîchisse la page.
    const timer = setInterval(() => void refresh().catch(() => {}), 10_000)
    return () => clearInterval(timer)
  }, [refresh])

  const create = useCallback(async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/tournois', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          initialTime: 180,
          increment: 0,
          durationMinutes: 45,
          startsInMinutes: 5,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error ?? 'Création impossible.')
        return
      }
      setName('')
      await refresh()
      toast.success('Arène créée.', 'Elle commence dans cinq minutes.')
    } finally {
      setBusy(false)
    }
  }, [name, refresh])

  if (list === null) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/*
        Le tournoi solo en premier, et c'est délibéré.
        Une arène n'a d'intérêt qu'avec du monde connecté en même temps —
        `docs/tournois.md` le dit dès sa première ligne. Tant que ce n'est pas le
        cas, un visiteur qui ouvre cette page ne trouve rien à faire. Le tournoi
        contre l'ordinateur, lui, se joue seul et tout de suite.
      */}
      <Link href="/tournois/ordinateur" className="block">
        <Card className="mb-5 p-4 transition-colors hover:bg-surface-hover">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl"
              style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)' }}
              aria-hidden
            >
              🏆
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold leading-tight">
                Tournoi contre l’ordinateur
              </p>
              <p className="text-[13px] text-muted">
                Tu es le seul humain. Trois à sept adversaires, de force choisie ou variée, et un
                classement aux points.
              </p>
            </div>
            <span className="shrink-0 text-muted" aria-hidden>
              →
            </span>
          </div>
        </Card>
      </Link>

      <SectionTitle hint="On arrive quand on veut, on part quand on veut. Dès qu’une partie finit, on est réapparié.">
        Arènes
      </SectionTitle>

      {signedIn && (
        <Card className="mt-4 p-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <div className="min-w-0 flex-1">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nom de l’arène — « Blitz du jeudi »"
                aria-label="Nom de la nouvelle arène"
                maxLength={80}
              />
            </div>
            <Button type="submit" variant="primary" disabled={busy}>
              Créer
            </Button>
          </form>
          <p className="mt-1.5 text-[11px] text-faint">
            3 minutes par partie, 45 minutes d’arène, départ dans 5 minutes.
          </p>
        </Card>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<Swords size={28} />}
          title="Aucune arène"
          description={
            signedIn
              ? 'Crée-en une : elle commencera dans cinq minutes, le temps que les autres arrivent.'
              : 'Connecte-toi pour en créer une.'
          }
        />
      ) : (
        <div className="mt-3 space-y-2">
          {list.map((entry) => {
            const status = STATUS[entry.status] ?? STATUS.scheduled!
            return (
              <Link key={entry.slug} href={`/tournois/${entry.slug}`} className="block">
                <Card className="p-3 transition-colors hover:bg-surface-hover">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{entry.name}</span>
                      <span className="mt-0.5 block text-[12px] text-faint">
                        {Math.round(entry.initialTime / 60)} min
                        {entry.increment > 0 ? ` + ${entry.increment} s` : ''} ·{' '}
                        {entry.durationMinutes} min d’arène ·{' '}
                        {new Date(entry.startsAt).toLocaleString('fr-FR', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-faint">
                      <Users size={13} aria-hidden />
                      {entry.players}
                    </span>
                    <span className={clsx('shrink-0 text-[12px] font-semibold', status.tone)}>
                      {status.label}
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
        <Timer size={13} className="mt-0.5 shrink-0" aria-hidden />
        Une arène n’a d’intérêt qu’à plusieurs : à trois joueurs, c’est un salon d’attente déguisé.
        Préviens tes amis avant d’en lancer une.
      </p>
    </div>
  )
}
