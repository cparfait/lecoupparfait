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
import { Button, Card, EmptyState, Spinner, TitreDePage } from '@/components/ui/index.tsx'
import { BoiteExplication, type DemandeExplication } from '@/components/stats/BoiteExplication.tsx'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

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

/*
  Les fins de partie que le serveur sait nommer.

  Leur libellé vit dans le dictionnaire, sous `stats.endings` : un état qui
  n'y figure pas s'affiche tel quel, ce qui reste lisible et signale au passage
  qu'il manque une traduction.
*/
const FINS = [
  'checkmate',
  'resigned',
  'timeout',
  'draw',
  'stalemate',
  'abandoned',
  'aborted',
] as const

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
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('stats.whatMeans', { mot: aide })}
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
  const t = useT()
  /* Les noms de cadence viennent du cœur : voir `localeDuContenu`. */
  const contenu = usePreferences((state) => localeDuContenu(state.locale))

  /* Le libellé d'une fin de partie, ou son identifiant brut si le dictionnaire
     ne la connaît pas — ce qui reste lisible et signale l'oubli. */
  const nommerLaFin = (statut: string) =>
    (FINS as readonly string[]).includes(statut) ? t(`stats.endings.${statut}` as never) : statut

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
      <div className="page-etroite">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title={t('stats.needsAccount')}
          description={t('stats.needsAccountHint')}
          action={
            <Link href="/connexion">
              <Button variant="primary">{t('nav.signIn')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (stats.totals.games === 0) {
    return (
      <div className="page-etroite">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title={t('stats.noGame')}
          description={t('stats.noGameHint')}
          action={
            <Link href="/jouer">
              <Button variant="primary">{t('nav.play')}</Button>
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
    <div className="page-etroite">
      <TitreDePage
        intro={t('stats.hint', { n: stats.totals.games })}
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
                {t(period === 30 ? 'stats.days30' : period === 365 ? 'stats.year1' : 'stats.all')}
              </button>
            ))}
          </div>
        }
      >
        {t('stats.title')}
      </TitreDePage>

      {/* ── L'essentiel ─────────────────────────────────────────────── */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          { label: t('stats.allGames'), value: stats.totals.rate, games: stats.totals.games },
          {
            label: t('stats.asWhite'),
            value: stats.totals.white.rate,
            games: stats.totals.white.games,
          },
          {
            label: t('stats.asBlack'),
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
            <p className="mt-0.5 text-[12px] text-faint">
              {t('stats.gamesCount', { n: entry.games })}
            </p>
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
              {t('stats.weakSpot')}{' '}
              <MotExplique
                aide={worst.name ?? t('stats.thisOpening')}
                onClick={() =>
                  setExplication({
                    type: 'ouverture',
                    eco: worst.eco,
                    nom: worst.name ?? t('stats.unlistedOpening'),
                    parties: worst.games,
                    taux: worst.rate,
                    blancs: worst.asWhite,
                  })
                }
                className="align-baseline font-semibold"
              >
                {worst.name}
              </MotExplique>{' '}
              {t('stats.weakSpotAfter', { taux: worst.rate, parties: worst.games })}
            </span>
          </p>
        </Card>
      )}

      {/* ── Par ouverture ───────────────────────────────────────────── */}
      <Card className="mt-3 p-3">
        <p className="mb-2 text-[12px] font-semibold text-faint">{t('stats.byOpening')}</p>
        {stats.openings.length === 0 ? (
          <p className="text-[14px] text-faint">{t('stats.noOpening')}</p>
        ) : (
          <div className="space-y-1.5">
            {stats.openings.map((opening) => (
              <div key={`${opening.eco}-${opening.name}`} className="flex items-center gap-2.5">
                <span className="w-10 shrink-0 font-mono text-[12px] text-faint">
                  {opening.eco ?? '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <MotExplique
                    aide={opening.name ?? t('stats.thisOpening')}
                    onClick={() =>
                      setExplication({
                        type: 'ouverture',
                        eco: opening.eco,
                        nom: opening.name ?? t('stats.unlistedOpening'),
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
                  title={t('stats.colourSplit', {
                    blancs: opening.asWhite,
                    noirs: opening.games - opening.asWhite,
                  })}
                >
                  {t('common.gamesShort', { n: opening.games })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* ── Par cadence ───────────────────────────────────────────── */}
        <Card className="p-3">
          <p className="mb-2 text-[12px] font-semibold text-faint">{t('stats.bySpeed')}</p>
          <div className="space-y-1.5">
            {stats.speeds.map((entry) => (
              <div key={entry.speed} className="flex items-center gap-2">
                <MotExplique
                  aide={
                    SPEED_LABELS[entry.speed as keyof typeof SPEED_LABELS]?.[contenu] ?? entry.speed
                  }
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
                  {SPEED_LABELS[entry.speed as keyof typeof SPEED_LABELS]?.[contenu] ?? entry.speed}
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
          <p className="mb-2 text-[12px] font-semibold text-faint">{t('stats.howGamesEnd')}</p>
          <div className="space-y-1">
            {stats.endings.map((entry) => (
              <div key={entry.status} className="flex items-center gap-2 text-[14px]">
                <MotExplique
                  aide={nommerLaFin(entry.status)}
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
                  {nommerLaFin(entry.status)}
                </MotExplique>
                <span className="shrink-0 tabular-nums text-faint">
                  {entry.games} ·{' '}
                  {t(entry.won > 1 ? 'stats.wonCount' : 'stats.wonOne', { n: entry.won })}
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
            {t('stats.scoreBefore')}{' '}
            <strong className="font-semibold text-ink">{bestHour.rate} %</strong>{' '}
            {t('stats.scoreAround', { heure: bestHour.hour })}{' '}
            <strong className="font-semibold text-ink">{worstHour.rate} %</strong>{' '}
            {t('stats.scoreAgainst', { heure: worstHour.hour })}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-faint">{t('stats.serverHour')}</p>
        </Card>
      )}

      {/* Dit une fois, en bas : les points d'interrogation se voient, mais rien
          n'annonce qu'ils ouvrent une définition plutôt qu'une infobulle. */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-faint">
        <HelpCircle size={11} aria-hidden />
        {t('stats.clickToExplain')}
      </p>

      {explication && (
        <BoiteExplication demande={explication} onFermer={() => setExplication(null)} />
      )}
    </div>
  )
}
