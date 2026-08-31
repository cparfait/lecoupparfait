'use client'

/**
 * Profil d'un joueur.
 *
 * Ce qu'on veut voir en arrivant : où j'en suis, est-ce que je progresse, et
 * qu'est-ce que j'ai joué récemment. Dans cet ordre. Le reste — biographie,
 * pays, date d'inscription — est secondaire et occupe donc peu de place.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  Gauge,
  LogOut,
  MailCheck,
  MailWarning,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, ratingTitle } from '@coupparfait/core'
import { Button, Card, Chip, EmptyState, Skeleton } from '@/components/ui/index.tsx'
import { AvatarPicker } from '@/components/profile/AvatarPicker.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { effacerPartie } from '@/lib/game/partieEnCours.ts'
import { useCourrielDisponible } from '@/lib/auth/useIdentite.ts'

interface Profile {
  user: {
    username: string
    avatar: string | null
    bio: string | null
    countryCode: string | null
    memberSince: string
  }
  ratings: Array<{
    category: string
    rating: number
    deviation: number
    provisional: boolean
    elo: number
    games: number
    wins: number
    losses: number
    draws: number
    peak: number
  }>
  games: Array<{
    slug: string
    speed: string
    rated: boolean
    colour: 'w' | 'b'
    opponent: string
    outcome: 'win' | 'loss' | 'draw'
    status: string
    eco: string | null
    opening: string | null
    moveCount: number
    ratingDelta: number | null
    /** Précision du joueur sur cette partie, si elle a été analysée. */
    accuracy: number | null
    playedAt: string
  }>
  history: Array<{ category: string; rating: number; at: string }>
}

const CATEGORY_LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapide',
  classical: 'Classique',
  correspondence: 'Correspondance',
  puzzle: 'Puzzles',
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [email, setEmail] = useState<{ email: string | null; verified: boolean } | null>(null)
  /** Partie en cours d'envoi vers l'analyse : le temps d'aller chercher son PGN. */
  const [envoi, setEnvoi] = useState<string | null>(null)

  useEffect(() => {
    void fetch(`/api/profil/${encodeURIComponent(params.username)}`)
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true)
          return null
        }
        return response.ok ? ((await response.json()) as Profile) : null
      })
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))

    void fetch('/api/auth')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setMe(data?.user?.username ?? null)
        setEmail(data?.email ?? null)
      })
      .catch(() => setMe(null))
  }, [params.username])

  const signOut = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signout' }),
    })
    toast.success('À bientôt !')
    window.location.assign('/')
  }, [])

  /**
   * Efface une partie, à l'écran d'abord.
   *
   * Attendre la réponse du serveur pour faire disparaître la ligne donne
   * l'impression que le clic a raté. En cas de refus on la remet, avec un mot
   * qui dit pourquoi.
   *
   * Déclaré **avant** les retours anticipés : le placer plus bas, à côté du
   * code qui s'en sert, changeait le nombre de hooks entre le rendu de
   * chargement et le suivant — « Rendered more hooks than during the previous
   * render », et la page ne s'affichait plus du tout.
   */
  const oublier = useCallback(
    async (slug: string) => {
      // Retrait immédiat : attendre le serveur donne l'impression que le clic
      // a raté. En cas de refus on relit le profil plutôt que de restaurer un
      // instantané capturé au vol — un tel instantané n'est pas fiable, React
      // n'appelant pas forcément la fonction de mise à jour tout de suite.
      setProfile((actuel) =>
        actuel ? { ...actuel, games: actuel.games.filter((g) => g.slug !== slug) } : actuel,
      )
      if (await effacerPartie(slug)) return
      toast.error('Suppression impossible.', 'Réessaie dans un instant.')
      try {
        const reponse = await fetch(`/api/profil/${params.username}`, { cache: 'no-store' })
        if (reponse.ok) setProfile(await reponse.json())
      } catch {
        // Serveur injoignable : la ligne réapparaîtra au prochain chargement.
      }
    },
    [params.username],
  )

  /**
   * Envoie une partie de l'historique vers l'écran d'analyse.
   *
   * Une liste de parties qu'on ne peut pas rouvrir est un mur : on voyait
   * qu'on avait perdu contre Cavale le 12 août, et c'était tout ce qu'on
   * pouvait en apprendre. Le PGN n'est pas dans le profil public — il ne doit
   * pas y être — on va donc le chercher sur la route privée, qui ne rend que
   * ses propres parties.
   */
  const analyser = useCallback(async (slug: string, colour: 'w' | 'b') => {
    setEnvoi(slug)
    try {
      const reponse = await fetch(`/api/parties/terminee?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      })
      const partie = reponse.ok ? (await reponse.json()).parties?.[0] : null
      if (!partie?.pgn) {
        toast.error('Partie introuvable.', 'Elle a peut-être été effacée.')
        setEnvoi(null)
        return
      }
      // Même dépôt que la boîte de fin de partie : l'écran d'analyse le ramasse
      // au chargement et démarre tout seul.
      sessionStorage.setItem('coupparfait.pendingAnalysis', partie.pgn)
      sessionStorage.setItem('coupparfait.pendingAnalysisSide', colour)
      if (partie.result) sessionStorage.setItem('coupparfait.pendingAnalysisResult', partie.result)
    } catch {
      // Stockage refusé ou serveur muet : on n'ira nulle part, et le message
      // ci-dessus vaut mieux qu'un écran d'analyse vide.
      toast.error('Analyse impossible.', 'Réessaie dans un instant.')
      setEnvoi(null)
      return
    }
    window.location.assign('/analyse')
  }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card>
          <EmptyState
            title={notFound ? 'Joueur introuvable' : 'Profil indisponible'}
            description={
              notFound
                ? `Aucun compte au pseudo « ${params.username} ».`
                : 'Le service de profils ne répond pas. Réessaie dans un instant.'
            }
            action={
              <Link href="/classement">
                <Button variant="secondary">Voir le classement</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const isMe = me !== null && me.toLowerCase() === profile.user.username.toLowerCase()

  const best = [...profile.ratings].sort((a, b) => b.games - a.games)[0]
  const title = best ? ratingTitle(best.rating) : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {/* ── Identité ─────────────────────────────────────────────── */}
      <Card glow className="p-5">
        {/* Les deux boutons passent à la ligne sous 640 px.
            Ils étaient en `shrink-0` sur la même ligne que le pseudo : à
            375 px ils occupaient environ deux cents pixels des trois cents
            disponibles, et le pseudo venait buter contre « Statistiques »
            pendant que « Membre depuis » se repliait sur trois lignes. Ce
            n'est pas le pseudo qui doit céder la place à une commande.

            `flex-wrap` sur le rang, `w-full sm:w-auto` sur le groupe de
            boutons : ils prennent une ligne à eux sur téléphone, et
            retrouvent leur place à droite dès qu'il y en a une. */}
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius)] bg-surface-strong text-3xl"
            aria-hidden
          >
            {profile.user.avatar ?? '♟️'}
          </span>
          {/* `min-w-[12rem]` et non `min-w-0` : sans plancher, cette colonne se
              laisse comprimer jusqu'à zéro et le rang ne se replie jamais. */}
          <div className="min-w-[12rem] flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {profile.user.username}
              </h1>
              {title && <Chip tone="accent">{title.fr}</Chip>}
            </div>
            {profile.user.bio && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{profile.user.bio}</p>
            )}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
              <CalendarDays size={12} aria-hidden />
              Membre depuis {formatMonth(profile.user.memberSince)}
            </p>
          </div>
          {isMe && (
            <div className="flex w-full shrink-0 flex-wrap gap-1 border-t border-line/60 pt-3 sm:w-auto sm:border-0 sm:pt-0">
              {/* Les statistiques ne concernent que soi : leur porte est ici. */}
              <Link href="/statistiques">
                <Button size="sm" variant="ghost" icon={<BarChart3 size={14} />}>
                  Statistiques
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Chez soi seulement : ni l'adresse ni l'avatar des autres ne
            regardent qui que ce soit. */}
        {isMe && email?.email && <EmailStatus email={email} />}

        {isMe && (
          <div className="mt-4 border-t border-line/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Ton avatar
            </p>
            <AvatarPicker
              current={profile.user.avatar}
              onChange={(avatar) =>
                setProfile((current) =>
                  current ? { ...current, user: { ...current.user, avatar } } : current,
                )
              }
            />
          </div>
        )}

        {/* ── Se déconnecter ────────────────────────────────────────
            Elle était en haut, en bouton fantôme, coincée entre le pseudo et
            « Statistiques » : trois mots gris dans une rangée d'actions, qu'on
            ne trouvait pas en la cherchant. C'est pourtant la seule action de
            cette page qu'on vienne y faire exprès — le reste s'y consulte.

            En bas, à sa place : on descend la fiche, et elle ferme la visite.
            Pleine largeur sur téléphone, où viser un bouton de trois mots dans
            un coin n'a rien d'évident. */}
        {isMe && (
          <div className="mt-4 flex justify-end border-t border-line/60 pt-4">
            <Button
              variant="secondary"
              icon={<LogOut size={15} />}
              onClick={signOut}
              className="max-sm:w-full"
            >
              Se déconnecter
            </Button>
          </div>
        )}
      </Card>

      {/* ── Classements ──────────────────────────────────────────── */}
      {profile.ratings.length > 0 ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {profile.ratings.map((rating) => (
            <Card key={rating.category} className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                {rating.category !== 'puzzle' && (
                  <span aria-hidden>
                    {SPEED_LABELS[rating.category as keyof typeof SPEED_LABELS]?.icon}
                  </span>
                )}
                {CATEGORY_LABELS[rating.category] ?? rating.category}
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                {rating.rating}
                {rating.provisional && <span className="text-faint">?</span>}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Elo {rating.elo} · record {rating.peak}
              </p>
              <div className="mt-2 flex gap-1 text-[11px] font-medium">
                <span className="text-[var(--q-best)]">{rating.wins} V</span>
                <span className="text-faint">{rating.draws} N</span>
                <span className="text-[var(--q-blunder)]">{rating.losses} D</span>
              </div>
              {/* Barre de répartition victoires / nulles / défaites */}
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-strong">
                <span
                  className="bg-[var(--q-best)]"
                  style={{ width: `${(rating.wins / rating.games) * 100}%` }}
                />
                <span
                  className="bg-[var(--q-forced)]"
                  style={{ width: `${(rating.draws / rating.games) * 100}%` }}
                />
                <span
                  className="bg-[var(--q-blunder)]"
                  style={{ width: `${(rating.losses / rating.games) * 100}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-4">
          <EmptyState
            icon={<TrendingUp size={26} />}
            title="Aucune partie classée"
            description="Les classements apparaîtront après la première partie classée contre un autre compte."
            action={
              <Link href="/jouer/ami">
                <Button variant="primary">Défier un ami</Button>
              </Link>
            }
          />
        </Card>
      )}

      {/* ── Courbe de progression ────────────────────────────────── */}
      {profile.history.length > 3 && (
        <Card className="mt-4 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Évolution du classement
          </p>
          <RatingChart history={profile.history} />
        </Card>
      )}

      {/* ── Parties récentes ─────────────────────────────────────── */}
      <Card className="mt-4 overflow-hidden">
        <p className="border-b border-line/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
          Parties récentes
        </p>
        {profile.games.length === 0 ? (
          <EmptyState title="Aucune partie enregistrée" />
        ) : (
          <ul>
            {profile.games.map((game) => (
              <li
                key={game.slug}
                className="flex items-center gap-3 border-b border-line/40 px-4 py-2.5 last:border-0"
              >
                <span
                  className={clsx(
                    'w-1 shrink-0 self-stretch rounded-full',
                    game.outcome === 'win' && 'bg-[var(--q-best)]',
                    game.outcome === 'loss' && 'bg-[var(--q-blunder)]',
                    game.outcome === 'draw' && 'bg-[var(--q-forced)]',
                  )}
                  aria-hidden
                />
                <span
                  className={clsx(
                    'h-3 w-3 shrink-0 rounded-full',
                    game.colour === 'w'
                      ? 'bg-[var(--eval-white)]'
                      : 'bg-[var(--eval-black)] ring-1 ring-line',
                  )}
                  aria-label={game.colour === 'w' ? 'Blancs' : 'Noirs'}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    contre <strong className="font-semibold">{game.opponent}</strong>
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {game.opening ?? 'ouverture non répertoriée'} · {game.moveCount} demi-coups
                    {game.accuracy != null && ` · ${Math.round(game.accuracy)} % de précision`}
                  </span>
                </span>
                {game.ratingDelta !== null && (
                  <span
                    className={clsx(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      game.ratingDelta >= 0 ? 'text-[var(--q-best)]' : 'text-[var(--q-blunder)]',
                    )}
                  >
                    {game.ratingDelta >= 0 ? '+' : ''}
                    {game.ratingDelta}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-faint">
                  {formatDate(game.playedAt)}
                </span>
                {/*
                  La porte de sortie de cette liste. Sans elle, l'historique ne
                  sert qu'à constater : on sait qu'on a perdu, jamais pourquoi.
                  Chez soi uniquement — le PGN d'un autre ne se prend pas depuis
                  son profil.
                */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => void analyser(game.slug, game.colour)}
                    disabled={envoi !== null}
                    title="Analyser cette partie"
                    aria-label={`Analyser la partie contre ${game.opponent}`}
                    className="shrink-0 rounded-[var(--radius-sm)] p-1 text-faint transition-colors hover:bg-surface-strong hover:text-accent disabled:opacity-40"
                  >
                    <Gauge
                      size={13}
                      className={clsx(envoi === game.slug && 'animate-pulse text-accent')}
                      aria-hidden
                    />
                  </button>
                )}
                {/*
                  Effaçable seulement chez soi, et seulement si la partie n'est
                  pas classée : une partie classée a bougé le classement d'un
                  adversaire, et la faire disparaître d'un côté laisserait de
                  l'autre des points sans partie pour les expliquer.
                */}
                {isMe && !game.rated && (
                  <button
                    type="button"
                    onClick={() => void oublier(game.slug)}
                    title="Effacer cette partie de ton historique"
                    aria-label={`Effacer la partie contre ${game.opponent}`}
                    className="shrink-0 rounded-[var(--radius-sm)] p-1 text-faint transition-colors hover:bg-surface-strong hover:text-[var(--q-blunder)]"
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/**
 * Courbe de progression.
 *
 * Volontairement minimaliste : pas d'axes, pas de graduations, pas de légende.
 * Ce qui compte visuellement est la **pente**, pas les valeurs exactes — celles-ci
 * sont déjà affichées au-dessus.
 */
function RatingChart({ history }: { history: Profile['history'] }) {
  const values = history.map((entry) => entry.rating)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(40, max - min)

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100
      const y = 30 - ((value - min) / range) * 28
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' L ')

  return (
    <div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label="Courbe de classement">
        <path
          d={`M ${points} L 100,30 L 0,30 Z`}
          fill="color-mix(in oklab, var(--accent) 18%, transparent)"
        />
        <path
          d={`M ${points}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.7"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-faint">
        <span>{min}</span>
        <span>{values.length} parties classées</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-')
  const names = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ]
  const index = Number(month) - 1
  return `${names[index] ?? ''} ${year}`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/**
 * L'état de son adresse.
 *
 * Une adresse non confirmée ne prouve rien : elle peut être mal tapée, ou
 * appartenir à quelqu'un d'autre. Le dire ici, avec le moyen de renvoyer le
 * lien, évite de le découvrir le jour où l'on a perdu son mot de passe.
 */
/**
 * L'état de l'adresse, et l'invitation à la confirmer.
 *
 * La confirmation ne part plus toute seule à l'inscription : elle est
 * volontaire, et c'est ici qu'on la demande. Ce bloc porte donc à lui seul tout
 * le parcours, ce qui l'oblige à dire deux choses — à quoi sert l'adresse, et
 * si le serveur est seulement capable d'envoyer le lien.
 */

/**
 * La confirmation par courriel est-elle en service ?
 *
 * Non, et tant qu'elle ne l'est pas le bandeau reste muet. Il demandait
 * d'ouvrir un lien que personne ne reçoit, faute d'expéditeur : une consigne
 * qu'on ne peut pas suivre n'est pas une information, c'est un reproche
 * permanent en haut de son propre profil, et le bouton « Confirmer »
 * promettait un envoi qui n'a jamais lieu.
 *
 * L'adresse reste enregistrée, et rien n'est perdu. Le jour où la messagerie
 * fonctionnera, ce drapeau passe à `true` : tout ce qu'il masque est écrit
 * juste en dessous, intact.
 */
const CONFIRMATION_PAR_COURRIEL: boolean = false

function EmailStatus({ email }: { email: { email: string | null; verified: boolean } }) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const courriel = useCourrielDisponible()

  if (email.verified) {
    return (
      <p className="mt-4 flex items-center gap-1.5 border-t border-line/60 pt-4 text-xs text-faint">
        <MailCheck size={13} className="text-[var(--accent-2)]" aria-hidden />
        Adresse confirmée : {email.email}
      </p>
    )
  }

  // Rien à dire tant qu'aucun courriel ne part — voir CONFIRMATION_PAR_COURRIEL.
  if (!CONFIRMATION_PAR_COURRIEL) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
      <MailWarning size={14} className="shrink-0 text-[var(--q-inaccuracy)]" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-ink">Adresse à confirmer</strong> — {email.email}.
        {courriel === false
          ? ' Ce serveur n’envoie pas encore de courriel : la confirmation n’est pas possible pour l’instant, et l’adresse ne sert donc à rien. Rien n’est perdu, elle reste enregistrée.'
          : ' Tant que ce n’est pas fait, elle ne pourra pas servir à retrouver ton mot de passe.'}
      </p>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || sent || courriel === false}
        onClick={async () => {
          setBusy(true)
          try {
            const response = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'resendVerification' }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
              toast.error(data.error ?? 'Renvoi impossible.')
              return
            }
            setSent(true)
            toast.success('Lien renvoyé.', 'Regarde ta boîte de réception.')
          } finally {
            setBusy(false)
          }
        }}
      >
        {/* « Confirmer » et non « Renvoyer » : plus rien n'a été envoyé
            auparavant, l'inscription n'expédiant plus de lien d'elle-même. */}
        {sent ? 'Envoyé' : courriel === false ? 'Indisponible' : 'Confirmer'}
      </Button>
    </div>
  )
}
