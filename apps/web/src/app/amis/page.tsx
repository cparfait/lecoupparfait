'use client'

/**
 * Carnet d'adresses.
 *
 * Trois gestes, dans l'ordre où on en a besoin : inviter quelqu'un qui n'est
 * pas encore là, ajouter quelqu'un qui y est déjà, défier quelqu'un de son
 * carnet.
 *
 * Le défi n'ouvre pas la partie tout de suite : l'autre doit accepter. Tant
 * qu'il n'a pas répondu, on attend sur cette page — et dès qu'il accepte, on
 * est emmené sur l'échiquier sans avoir rien à surveiller.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Search,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import { Button, Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

interface Friend {
  id: string
  username: string
  avatar: string | null
  rating: number | null
  online: boolean
}

interface PendingRequest {
  id: string
  user: Friend
}

interface OutgoingChallenge {
  id: string
  slug: string
  to: string | null
  status: string
  initialTime: number
  increment: number
  rated: boolean
}

/** Rythme d'interrogation : assez vif pour ne pas laisser un ami attendre. */
const POLL_MS = 4000

/**
 * Lire les paramètres d'adresse suspend le rendu.
 *
 * `useSearchParams` ne peut pas être résolu à la construction : la page est
 * donc rendue une première fois sans, ce que Next impose de matérialiser par
 * une frontière. Sans elle, la construction échoue — et le lien de parrainage
 * `?ami=` passe précisément par là.
 */
export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
          <Spinner size={24} />
        </div>
      }
    >
      <FriendsBook />
    </Suspense>
  )
}

function FriendsBook() {
  const router = useRouter()
  const params = useSearchParams()

  const [me, setMe] = useState<{ username: string } | null | undefined>(undefined)
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<PendingRequest[]>([])
  const [outgoing, setOutgoing] = useState<PendingRequest[]>([])
  const [sent, setSent] = useState<OutgoingChallenge[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Friend[]>([])
  const [searching, setSearching] = useState(false)

  const [timeControlId, setTimeControlId] = useState('600+5')
  const [copied, setCopied] = useState(false)

  // ── Identité ────────────────────────────────────────────────────────────
  useEffect(() => {
    void fetch('/api/auth')
      .then((response) => response.json())
      .then((data: { user: { username: string } | null }) => setMe(data.user))
      .catch(() => setMe(null))
  }, [])

  // ── Carnet ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [book, duels] = await Promise.all([
        fetch('/api/amis').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/defis').then((r) => (r.ok ? r.json() : null)),
      ])
      if (book) {
        setFriends(book.friends ?? [])
        setIncoming(book.incoming ?? [])
        setOutgoing(book.outgoing ?? [])
      }
      if (duels) setSent(duels.outgoing ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (me === undefined || me === null) return
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [me, refresh])

  /**
   * Un défi accepté emmène celui qui l'a lancé sur l'échiquier.
   *
   * C'est la contrepartie de l'attente : celui qui propose n'a rien à
   * surveiller, la page l'y conduit d'elle-même.
   */
  const navigated = useRef(false)
  useEffect(() => {
    if (navigated.current) return
    const accepted = sent.find((challenge) => challenge.status === 'accepted')
    if (!accepted) return
    navigated.current = true
    const tc = `${accepted.initialTime}+${accepted.increment}`
    router.push(
      `/jouer/partie/${accepted.slug}?tc=${tc}${accepted.rated ? '&classee=1' : ''}`,
    )
  }, [sent, router])

  // ── Recherche ───────────────────────────────────────────────────────────
  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      void fetch(`/api/amis?q=${encodeURIComponent(needle)}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data: { results: Friend[] }) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // ── Actions ─────────────────────────────────────────────────────────────
  const post = useCallback(
    async (url: string, body: unknown) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error ?? 'Action impossible.')
        return null
      }
      await refresh()
      return data
    },
    [refresh],
  )

  const add = useCallback(
    async (username: string) => {
      const data = await post('/api/amis', { action: 'add', username })
      if (!data) return
      setQuery('')
      setResults([])
      toast.success(
        data.status === 'accepted'
          ? `${username} vous demandait aussi — vous voilà amis.`
          : `Demande envoyée à ${username}.`,
      )
    },
    [post],
  )

  const challenge = useCallback(
    async (friend: Friend) => {
      const control = TIME_CONTROLS.find((entry) => entry.id === timeControlId)
      const data = await post('/api/defis', {
        action: 'create',
        to: friend.id,
        initialTime: control?.initial ?? 600,
        increment: control?.increment ?? 5,
      })
      if (data) toast.info(`Défi envoyé à ${friend.username}.`, 'On attend sa réponse.')
    },
    [post, timeControlId],
  )

  // ── Lien d'invitation ───────────────────────────────────────────────────
  const inviteUrl =
    me && typeof window !== 'undefined'
      ? `${window.location.origin}/connexion?ami=${encodeURIComponent(me.username)}`
      : null

  const copyInvite = useCallback(async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copie refusée par le navigateur.', 'Sélectionne le lien à la main.')
    }
  }, [inviteUrl])

  // ── Ajout automatique par lien de parrainage ────────────────────────────
  const referrer = params.get('ami')
  const referred = useRef(false)
  useEffect(() => {
    if (!referrer || !me || referred.current) return
    referred.current = true
    void post('/api/amis', { action: 'add', username: referrer })
  }, [referrer, me, post])

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (me === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (me === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<Users size={28} />}
          title="Le carnet demande un compte"
          description="Les amis se retrouvent par leur pseudo : il faut donc en avoir un. La création prend dix secondes et ne demande pas d’adresse électronique."
          action={
            <Link href="/connexion">
              <Button variant="primary">Créer un compte</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <SectionTitle hint="Ajoute les gens avec qui tu joues, et lance une partie en un clic.">
        Mes amis
      </SectionTitle>

      {/* ── Invitation ─────────────────────────────────────────────── */}
      <Card className="mt-4 p-4">
        <div className="flex items-start gap-2.5">
          <Link2 size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Inviter quelqu’un qui n’est pas encore là</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              Envoie ce lien. La personne crée son compte et vous êtes amis directement, sans
              demande à accepter.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                readOnly
                value={inviteUrl ?? ''}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 font-mono text-[12px] text-muted"
              />
              <Button
                size="sm"
                variant={copied ? 'ghost' : 'secondary'}
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={copyInvite}
              >
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Demandes reçues ────────────────────────────────────────── */}
      {incoming.length > 0 && (
        <Card className="mt-3 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {incoming.length === 1 ? 'Une demande d’ami' : `${incoming.length} demandes d’ami`}
          </p>
          <div className="space-y-1.5">
            {incoming.map((request) => (
              <div key={request.id} className="flex items-center gap-2.5">
                <Avatar friend={request.user} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {request.user.username}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Check size={14} />}
                  onClick={() =>
                    void post('/api/amis', {
                      action: 'respond',
                      id: request.id,
                      accept: true,
                    })
                  }
                >
                  Accepter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X size={14} />}
                  onClick={() =>
                    void post('/api/amis', {
                      action: 'respond',
                      id: request.id,
                      accept: false,
                    })
                  }
                >
                  Refuser
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recherche ──────────────────────────────────────────────── */}
      <Card className="mt-3 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
          Ajouter quelqu’un déjà inscrit
        </p>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pseudo…"
            className="pl-8"
            aria-label="Chercher un joueur"
          />
          {searching && (
            <Loader2
              size={15}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-faint"
              aria-hidden
            />
          )}
        </div>

        {query.trim().length >= 2 && (
          <div className="mt-2 space-y-1">
            {results.length === 0 && !searching ? (
              <p className="px-1 py-2 text-[13px] text-faint">
                Personne de ce nom. Envoie plutôt le lien d’invitation ci-dessus.
              </p>
            ) : (
              results.map((person) => (
                <div key={person.id} className="flex items-center gap-2.5">
                  <Avatar friend={person} />
                  <span className="min-w-0 flex-1 truncate font-medium">{person.username}</span>
                  {person.rating != null && (
                    <span className="shrink-0 text-[12px] tabular-nums text-faint">
                      {person.rating}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<UserPlus size={14} />}
                    onClick={() => void add(person.username)}
                  >
                    Ajouter
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* ── Carnet ─────────────────────────────────────────────────── */}
      <Card className="mt-3 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Mon carnet {friends.length > 0 && `· ${friends.length}`}
          </p>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            Cadence
            <select
              value={timeControlId}
              onChange={(event) => setTimeControlId(event.target.value)}
              className="rounded-[var(--radius-sm)] border border-line px-1.5 py-1 text-[12px]"
            >
              {TIME_CONTROLS.map((control) => (
                <option key={control.id} value={control.id}>
                  {control.label} · {SPEED_LABELS[control.category]?.fr ?? ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid place-items-center py-6">
            <Spinner size={20} />
          </div>
        ) : friends.length === 0 ? (
          <p className="px-1 py-3 text-[13px] leading-relaxed text-faint">
            Personne pour l’instant. Envoie le lien d’invitation à quelqu’un, ou cherche son
            pseudo s’il est déjà inscrit.
          </p>
        ) : (
          <div className="space-y-1">
            {friends.map((friend) => {
              const waiting = sent.some(
                (entry) => entry.to === friend.id && entry.status === 'pending',
              )
              return (
                <div key={friend.id} className="flex items-center gap-2.5 py-0.5">
                  <Avatar friend={friend} />
                  <span className="min-w-0 flex-1 truncate font-medium">{friend.username}</span>
                  {friend.rating != null && (
                    <span className="shrink-0 text-[12px] tabular-nums text-faint">
                      {friend.rating}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={waiting ? 'ghost' : 'primary'}
                    icon={waiting ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                    disabled={waiting}
                    onClick={() => void challenge(friend)}
                  >
                    {waiting ? 'En attente' : 'Jouer'}
                  </Button>
                  <button
                    type="button"
                    title={`Retirer ${friend.username} du carnet`}
                    aria-label={`Retirer ${friend.username}`}
                    onClick={() => void post('/api/amis', { action: 'remove', id: friend.id })}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <UserMinus size={14} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {outgoing.length > 0 && (
          <p className="mt-3 border-t border-line/60 pt-2.5 text-[12px] text-faint">
            En attente de réponse : {outgoing.map((request) => request.user.username).join(', ')}.
          </p>
        )}
      </Card>
    </div>
  )
}

/** Pastille de présence collée à l'avatar : savoir qui est là évite d'attendre. */
function Avatar({ friend }: { friend: Friend }) {
  return (
    <span className="relative shrink-0">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-strong text-base">
        {friend.avatar ?? '♟️'}
      </span>
      <span
        className={clsx(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-elev)]',
          friend.online ? 'bg-[var(--accent-2)]' : 'bg-line',
        )}
        title={friend.online ? 'En ligne' : 'Hors ligne'}
        aria-label={friend.online ? 'En ligne' : 'Hors ligne'}
      />
    </span>
  )
}
