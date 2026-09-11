'use client'

/**
 * Une arène, en cours.
 *
 * La page répond à une seule question : *dois-je faire quelque chose ?* Soit
 * une partie m'attend — et elle m'y emmène —, soit je suis en file et je
 * regarde le classement bouger.
 *
 * L'appariement se fait côté serveur, dans une boucle. Cette page ne décide de
 * rien : elle interroge, et suit.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Flame, LogOut, Pause, Play, Swords, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

interface Standing {
  userId: string
  username: string
  rating: number
  score: number
  games: number
  streak: number
  active: boolean
  playing: boolean
}

interface Tournament {
  id: string
  slug: string
  name: string
  initialTime: number
  increment: number
  durationMinutes: number
  startsAt: string
  status: string
  endsAt: string | null
}

/** La boucle serveur tourne toutes les 3 s : inutile de demander plus souvent. */
const POLL_MS = 3000

export default function ArenaPage() {
  const slug = String(useParams().slug ?? '')
  const router = useRouter()

  const [data, setData] = useState<
    | {
        tournament: Tournament
        standings: Standing[]
        game: string | null
        joined: boolean
      }
    | null
    | undefined
  >(undefined)
  const [me, setMe] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/tournois?slug=${encodeURIComponent(slug)}`)
    if (!response.ok) {
      setData(null)
      return
    }
    setData(await response.json())
  }, [slug])

  const identite = useIdentite()
  useEffect(() => {
    if (identite !== undefined) setMe(identite?.username ?? null)
  }, [identite])

  useEffect(() => {
    void refresh().catch(() => setData(null))
    const timer = setInterval(() => void refresh().catch(() => {}), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  /**
   * Une partie appariée emmène son joueur.
   *
   * C'est tout l'intérêt d'une arène : on ne surveille rien, on est conduit.
   * La référence évite d'y retourner en boucle si l'on est revenu exprès.
   */
  const sent = useRef<string | null>(null)
  useEffect(() => {
    const game = data?.game
    if (!game || sent.current === game) return
    sent.current = game
    const tc = `${data!.tournament.initialTime}+${data!.tournament.increment}`
    router.push(`/jouer/partie/${game}?tc=${tc}`)
  }, [data, router])

  const act = useCallback(
    async (action: 'join' | 'leave') => {
      const response = await fetch('/api/tournois', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, slug }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error ?? 'Action impossible.')
        return
      }
      await refresh()
    },
    [slug, refresh],
  )

  if (data === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="page-etroite">
        <EmptyState
          icon={<Trophy size={28} />}
          title="Arène introuvable"
          description="Elle n’existe pas, ou son adresse est incomplète."
          action={
            <Link href="/tournois">
              <Button variant="secondary">Toutes les arènes</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const { tournament, standings, joined } = data
  const mine = standings.find((s) => s.username === me)
  const finished = tournament.status === 'finished'
  const running = tournament.status === 'running'

  return (
    <div className="page-etroite">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Trophy size={18} className="text-accent" aria-hidden />
        <h1 className="font-display text-xl font-bold tracking-tight">{tournament.name}</h1>
        <span className="text-[12px] text-faint">
          {Math.round(tournament.initialTime / 60)} min
          {tournament.increment > 0 ? ` + ${tournament.increment} s` : ''} ·{' '}
          {tournament.durationMinutes} min
        </span>
      </div>

      {/* ── Ce qu'il y a à faire ─────────────────────────────────────── */}
      <Card className="p-3">
        {finished ? (
          <p className="text-[14px] text-muted">
            Arène terminée. Le classement ci-dessous est définitif.
          </p>
        ) : !me ? (
          <p className="text-[14px] text-muted">
            <Link href="/connexion" className="font-semibold text-accent hover:underline">
              Connecte-toi
            </Link>{' '}
            pour participer. Tu peux suivre le classement sans compte.
          </p>
        ) : !joined ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[14px] text-muted">
              {running
                ? 'L’arène a commencé : tu peux rejoindre en cours, tu seras apparié au prochain tour.'
                : `Départ ${new Date(tournament.startsAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`}
            </p>
            <Button variant="primary" icon={<Play size={15} />} onClick={() => void act('join')}>
              Rejoindre
            </Button>
          </div>
        ) : mine?.playing ? (
          <p className="flex items-center gap-2 text-[14px] font-medium text-[var(--q-best)]">
            <Swords size={15} aria-hidden />
            Ta partie est en cours — tu y es conduit automatiquement.
          </p>
        ) : mine?.active ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[14px] text-muted">
              {running
                ? 'En file d’attente. Dès qu’un adversaire est libre, tu es apparié.'
                : 'Inscrit. L’arène démarrera à l’heure prévue.'}
            </p>
            <Button
              size="sm"
              variant="ghost"
              icon={<Pause size={14} />}
              onClick={() => void act('leave')}
            >
              Faire une pause
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[14px] text-muted">
              En pause. Tes points sont conservés — reviens quand tu veux.
            </p>
            <Button
              size="sm"
              variant="primary"
              icon={<Play size={14} />}
              onClick={() => void act('join')}
            >
              Reprendre
            </Button>
          </div>
        )}
      </Card>

      {/* ── Classement ───────────────────────────────────────────────── */}
      <Card className="mt-3 p-3">
        <p className="mb-2 text-[12px] font-semibold text-faint">Classement</p>
        {standings.length === 0 ? (
          <p className="text-[14px] text-faint">Personne d’inscrit pour l’instant.</p>
        ) : (
          <div className="space-y-0.5">
            {standings.map((player, index) => (
              <div
                key={player.userId}
                className={clsx(
                  'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5',
                  player.username === me && 'bg-accent/12',
                )}
              >
                <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-faint">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                  {player.username}
                  <span className="ml-1.5 text-[12px] font-normal text-faint">{player.rating}</span>
                </span>
                {/* Une série en cours vaut le double : la signaler, c'est dire
                    à tout le monde qui est dangereux en ce moment. */}
                {player.streak >= 2 && (
                  <span
                    className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-[var(--q-inaccuracy)]"
                    title={`${player.streak} victoires d’affilée — ses points sont doublés`}
                  >
                    <Flame size={12} aria-hidden />
                    {player.streak}
                  </span>
                )}
                {player.playing && (
                  <Swords size={12} className="shrink-0 text-[var(--q-best)]" aria-hidden />
                )}
                {!player.active && !finished && (
                  <LogOut size={12} className="shrink-0 text-faint" aria-hidden />
                )}
                <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-faint">
                  {player.games} p.
                </span>
                <span className="w-8 shrink-0 text-right font-display text-sm font-bold tabular-nums">
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2.5 border-t border-line/60 pt-2.5 text-[12px] leading-relaxed text-faint">
          Deux points par victoire, un par nulle. À partir de la deuxième victoire d’affilée, les
          points doublent — c’est ce qui rend l’arène rattrapable jusqu’au bout.
        </p>
      </Card>
    </div>
  )
}
