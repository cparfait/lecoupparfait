'use client'

/**
 * Tes statistiques.
 *
 * Une précision globale ne dit rien de ce qu'il faut faire. « Tu marques
 * 12 % avec le système London » se traduit tout de suite en « travaille cette
 * ligne-là, ou change-en ».
 *
 * On n'affiche donc que ce qui débouche sur une action, et on nomme
 * l'enseignement plutôt que de laisser le lecteur le tirer d'un tableau.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, HelpCircle, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS } from '@coupparfait/core'
import { Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { BoiteExplication, type DemandeExplication } from '@/components/stats/BoiteExplication.tsx'

interface Stats {
  days: number
  totals: {
    games: number
    rate: number
    white: { games: number; rate: number }
    black: { games: number; rate: number }
  }
  openings: Array<{
    eco: string | null
    name: string | null
    games: number
    asWhite: number
    rate: number
  }>
  speeds: Array<{ speed: string; games: number; rate: number }>
  hours: Array<{ hour: number; games: number; rate: number }>
  endings: Array<{ status: string; games: number; won: number }>
}

const ENDING_LABELS: Record<string, string> = {
  checkmate: 'Échec et mat',
  resigned: 'Abandon',
  timeout: 'Temps écoulé',
  draw: 'Nulle',
  stalemate: 'Pat',
  abandoned: 'Adversaire parti',
  aborted: 'Annulée',
}

/** Barre de score : verte au-dessus de la moitié, rouge en dessous. */
function Bar({ rate }: { rate: number }) {
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-line/60">
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.max(2, rate)}%`,
          background:
            rate >= 50 ? 'var(--q-best)' : rate >= 35 ? 'var(--q-inaccuracy)' : 'var(--q-blunder)',
        }}
      />
    </span>
  )
}

/**
 * Un libellé qui s'explique.
 *
 * Le point d'interrogation est **toujours visible**, jamais révélé au survol :
 * il n'y a pas de survol sur un téléphone, et une aide qu'on ne découvre qu'en
 * passant la souris dessus n'existe que pour ceux qui savaient déjà qu'elle
 * était là. Il reste discret — de la couleur des mentions secondaires — et
 * s'allume avec le libellé.
 */
function MotExplique({
  onClick,
  aide,
  className,
  children,
}: {
  onClick: () => void
  /** Complément du nom accessible : « Ce que veut dire … ». */
  aide: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ce que veut dire ${aide}`}
      className={clsx(
        'group inline-flex min-w-0 max-w-full items-center gap-1 rounded-[var(--radius-sm)] text-left transition-colors hover:text-accent',
        className,
      )}
    >
      <span className="min-w-0 truncate group-hover:underline">{children}</span>
      <HelpCircle
        size={11}
        className="shrink-0 text-faint transition-colors group-hover:text-accent"
        aria-hidden
      />
    </button>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null | undefined>(undefined)
  const [days, setDays] = useState(365)
  /**
   * Le mot dont on demande le sens, s'il y en a un.
   *
   * L'état vit dans la page et non dans chaque ligne : une seule boîte à la
   * fois, et elle se referme d'elle-même quand on change de période.
   */
  const [explication, setExplication] = useState<DemandeExplication | null>(null)

  const load = useCallback(async (period: number) => {
    const response = await fetch(`/api/statistiques?jours=${period}`)
    if (!response.ok) {
      setStats(null)
      return
    }
    setStats(await response.json())
  }, [])

  useEffect(() => {
    void load(days).catch(() => setStats(null))
  }, [load, days])

  if (stats === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (stats === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Les statistiques demandent un compte"
          description="Elles se calculent sur tes parties enregistrées : il faut donc savoir lesquelles sont les tiennes."
          action={
            <Link href="/connexion">
              <Button variant="primary">Se connecter</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (stats.totals.games === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Pas encore de partie classée"
          description="Joue quelques parties contre un ami : tes statistiques apparaîtront ici, ouverture par ouverture."
          action={
            <Link href="/jouer">
              <Button variant="primary">Jouer</Button>
            </Link>
          }
        />
      </div>
    )
  }

  // Ce qu'il faut retenir : l'ouverture où l'on marque le moins, à condition
  // d'y avoir joué assez pour que ce ne soit pas un accident.
  const worst = [...stats.openings].sort((a, b) => a.rate - b.rate)[0]
  const bestHour = [...stats.hours].filter((h) => h.games >= 3).sort((a, b) => b.rate - a.rate)[0]
  const worstHour = [...stats.hours].filter((h) => h.games >= 3).sort((a, b) => a.rate - b.rate)[0]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <SectionTitle
        hint={`Sur tes ${stats.totals.games} parties terminées.`}
        action={
          <div className="flex gap-1">
            {[30, 365, 3650].map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDays(period)}
                className={clsx(
                  'rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium transition-colors',
                  days === period ? 'bg-accent/18 text-ink' : 'text-muted hover:bg-surface-hover',
                )}
              >
                {period === 30 ? '30 jours' : period === 365 ? '1 an' : 'Tout'}
              </button>
            ))}
          </div>
        }
      >
        Mes statistiques
      </SectionTitle>

      {/* ── L'essentiel ─────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {[
          { label: 'Toutes parties', value: stats.totals.rate, games: stats.totals.games },
          {
            label: 'Avec les Blancs',
            value: stats.totals.white.rate,
            games: stats.totals.white.games,
          },
          {
            label: 'Avec les Noirs',
            value: stats.totals.black.rate,
            games: stats.totals.black.games,
          },
        ].map((entry) => (
          <Card key={entry.label} className="p-3">
            <p className="text-[12px] font-semibold text-faint">{entry.label}</p>
            <p className="mt-0.5 font-display text-2xl font-bold tabular-nums">
              {entry.value}
              <span className="text-sm font-normal text-muted"> %</span>
            </p>
            <p className="mt-0.5 text-[12px] text-faint">{entry.games} parties</p>
            <span className="mt-1.5 block">
              <Bar rate={entry.value} />
            </span>
          </Card>
        ))}
      </div>

      {/* ── Ce qu'il faut retenir ───────────────────────────────────── */}
      {worst && worst.games >= 3 && (
        <Card className="mt-3 p-3">
          <p className="flex items-start gap-2 text-[14px] leading-relaxed">
            <TrendingDown
              size={15}
              className="mt-0.5 shrink-0 text-[var(--q-blunder)]"
              aria-hidden
            />
            <span>
              Ton point faible :{' '}
              <MotExplique
                aide={worst.name ?? 'cette ouverture'}
                onClick={() =>
                  setExplication({
                    type: 'ouverture',
                    eco: worst.eco,
                    nom: worst.name ?? 'Ouverture non répertoriée',
                    parties: worst.games,
                    taux: worst.rate,
                    blancs: worst.asWhite,
                  })
                }
                className="align-baseline font-semibold"
              >
                {worst.name}
              </MotExplique>{' '}
              — tu y marques {worst.rate} % sur {worst.games} parties. C’est la ligne qui rapporte
              le plus à travailler.
            </span>
          </p>
        </Card>
      )}

      {/* ── Par ouverture ───────────────────────────────────────────── */}
      <Card className="mt-3 p-3">
        <p className="mb-2 text-[12px] font-semibold text-faint">Par ouverture</p>
        {stats.openings.length === 0 ? (
          <p className="text-[14px] text-faint">
            Aucune ouverture jouée au moins trois fois : trop tôt pour en tirer quoi que ce soit.
          </p>
        ) : (
          <div className="space-y-1.5">
            {stats.openings.map((opening) => (
              <div key={`${opening.eco}-${opening.name}`} className="flex items-center gap-2.5">
                <span className="w-10 shrink-0 font-mono text-[12px] text-faint">
                  {opening.eco ?? '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <MotExplique
                    aide={opening.name ?? 'cette ouverture'}
                    onClick={() =>
                      setExplication({
                        type: 'ouverture',
                        eco: opening.eco,
                        nom: opening.name ?? 'Ouverture non répertoriée',
                        parties: opening.games,
                        taux: opening.rate,
                        blancs: opening.asWhite,
                      })
                    }
                    className="block text-[14px]"
                  >
                    {opening.name}
                  </MotExplique>
                  <span className="mt-0.5 block">
                    <Bar rate={opening.rate} />
                  </span>
                </span>
                <span className="w-14 shrink-0 text-right text-[12px] tabular-nums">
                  {opening.rate} %
                </span>
                <span
                  className="w-16 shrink-0 text-right text-[12px] tabular-nums text-faint"
                  title={`${opening.asWhite} avec les Blancs, ${opening.games - opening.asWhite} avec les Noirs`}
                >
                  {opening.games} p.
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* ── Par cadence ───────────────────────────────────────────── */}
        <Card className="p-3">
          <p className="mb-2 text-[12px] font-semibold text-faint">Par cadence</p>
          <div className="space-y-1.5">
            {stats.speeds.map((entry) => (
              <div key={entry.speed} className="flex items-center gap-2">
                <MotExplique
                  aide={SPEED_LABELS[entry.speed as keyof typeof SPEED_LABELS]?.fr ?? entry.speed}
                  onClick={() =>
                    setExplication({
                      type: 'cadence',
                      cle: entry.speed,
                      parties: entry.games,
                      taux: entry.rate,
                    })
                  }
                  className="w-24 shrink-0 text-[14px]"
                >
                  {SPEED_LABELS[entry.speed as keyof typeof SPEED_LABELS]?.fr ?? entry.speed}
                </MotExplique>
                <span className="min-w-0 flex-1">
                  <Bar rate={entry.rate} />
                </span>
                <span className="w-12 shrink-0 text-right text-[12px] tabular-nums">
                  {entry.rate} %
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Comment ça se termine ─────────────────────────────────── */}
        <Card className="p-3">
          <p className="mb-2 text-[12px] font-semibold text-faint">Comment tes parties finissent</p>
          <div className="space-y-1">
            {stats.endings.map((entry) => (
              <div key={entry.status} className="flex items-center gap-2 text-[14px]">
                <MotExplique
                  aide={ENDING_LABELS[entry.status] ?? entry.status}
                  onClick={() =>
                    setExplication({
                      type: 'fin',
                      cle: entry.status,
                      parties: entry.games,
                      gagnees: entry.won,
                    })
                  }
                  className="min-w-0 flex-1"
                >
                  {ENDING_LABELS[entry.status] ?? entry.status}
                </MotExplique>
                <span className="shrink-0 tabular-nums text-faint">
                  {entry.games} · {entry.won} gagnée{entry.won > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Par heure ───────────────────────────────────────────────── */}
      {bestHour && worstHour && bestHour.hour !== worstHour.hour && (
        <Card className="mt-3 p-3">
          <p className="text-[14px] leading-relaxed text-muted">
            Tu marques <strong className="font-semibold text-ink">{bestHour.rate} %</strong> vers{' '}
            {bestHour.hour} h, contre{' '}
            <strong className="font-semibold text-ink">{worstHour.rate} %</strong> vers{' '}
            {worstHour.hour} h.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-faint">
            Heure du serveur, et non la tienne : le fuseau des joueurs n’est pas enregistré. L’écart
            reste parlant, l’heure exacte moins.
          </p>
        </Card>
      )}

      {/* Dit une fois, en bas : les points d'interrogation se voient, mais rien
          n'annonce qu'ils ouvrent une définition plutôt qu'une infobulle. */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-faint">
        <HelpCircle size={11} aria-hidden />
        Un nom d’ouverture, de cadence ou de fin de partie s’ouvre : on y trouve ce qu’il veut dire.
      </p>

      {explication && (
        <BoiteExplication demande={explication} onFermer={() => setExplication(null)} />
      )}
    </div>
  )
}
