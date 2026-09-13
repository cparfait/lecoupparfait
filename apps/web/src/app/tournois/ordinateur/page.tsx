'use client'

/**
 * Tournoi contre l'ordinateur.
 *
 * Un toutes rondes où l'on est le seul humain : on affronte chaque adversaire
 * une fois, et le classement se fait aux points.
 *
 * Deux écrans en un. Tant qu'aucun tournoi n'est en cours, on compose le
 * plateau — combien d'adversaires, à quelle force, à quelle cadence. Une fois
 * lancé, la page devient le tableau du tournoi : classement, ronde en cours, et
 * un bouton pour aller jouer sa partie.
 *
 * **Les parties entre robots sont tirées, pas jouées**, et l'écran le dit. Les
 * faire jouer pour de vrai demanderait plusieurs minutes de calcul par ronde ;
 * le tirage suit la formule d'Elo, ce qui donne le même classement sur la durée
 * — voir `packages/core/src/tournoi-solo.ts`.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dices, Play, RotateCcw, Trophy } from 'lucide-react'
import clsx from 'clsx'
import {
  BOT_LEVELS,
  BOT_PERSONALITIES,
  HUMAIN,
  SPEED_LABELS,
  TIME_CONTROLS,
  botLevel,
  classement,
  composerCalendrier,
  composerPlateau,
  concurrent as trouverConcurrent,
  enregistrer,
  estTermine,
  nombreDeRondes,
  prochainDuel,
  type ChoixDeForce,
  type TournoiSolo,
} from '@coupparfait/core'
import { Button, Card, Chip, SectionTitle } from '@/components/ui/index.tsx'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import {
  ecrireTournoi,
  lireTournoi,
  oublierTournoi,
  reprendreResultat,
} from '@/lib/game/tournoiSolo.ts'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export default function TournoiOrdinateurPage() {
  const t = useT()
  /** `undefined` tant qu'on n'a pas lu le stockage : on n'affiche rien avant. */
  const [tournoi, setTournoi] = useState<TournoiSolo | null | undefined>(undefined)

  /**
   * Reprise et enregistrement, en une seule fois.
   *
   * L'écran de jeu dépose son résultat en chemin ; on le récupère au retour et
   * on déroule la ronde. Faire les deux dans le même effet garantit qu'on ne
   * lit jamais un tournoi sans avoir appliqué la partie qui vient d'être jouée
   * — sinon le classement afficherait un tour de retard.
   */
  useEffect(() => {
    const garde = lireTournoi()
    const resultat = reprendreResultat()
    if (garde && resultat) {
      const suite = enregistrer(garde, resultat)
      ecrireTournoi(suite)
      setTournoi(suite)
      return
    }
    setTournoi(garde)
  }, [])

  if (tournoi === undefined) return null

  return (
    <div className="page-etroite">
      <Link
        href="/tournois"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        {t('arena.back')}
      </Link>

      {tournoi === null ? (
        <Composition
          onLancer={(nouveau) => {
            ecrireTournoi(nouveau)
            setTournoi(nouveau)
          }}
        />
      ) : (
        <Tableau
          tournoi={tournoi}
          onAbandonner={() => {
            oublierTournoi()
            setTournoi(null)
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Composition du plateau
// ─────────────────────────────────────────────────────────────────────────────

function Composition({ onLancer }: { onLancer: (tournoi: TournoiSolo) => void }) {
  const t = useT()
  const contenu = usePreferences((state) => localeDuContenu(state.locale))
  const [adversaires, setAdversaires] = useState(5)
  const [niveau, setNiveau] = useState(6)
  const [aleatoire, setAleatoire] = useState(true)
  const [cadence, setCadence] = useState('600+5')

  const palier = botLevel(niveau)

  const lancer = useCallback(() => {
    const force: ChoixDeForce = { type: aleatoire ? 'aleatoire' : 'fixe', niveau }
    const concurrents = composerPlateau({ adversaires, force })
    onLancer({
      cadence,
      concurrents,
      duels: composerCalendrier(concurrents),
      ronde: 1,
      commenceLe: new Date().toISOString(),
    })
  }, [adversaires, niveau, aleatoire, cadence, onLancer])

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('arena.soloTitle')}
      </h1>
      <p className="mt-2 max-w-prose text-muted max-lg:text-[14px] max-lg:leading-relaxed">
        {t('arena.onlyHuman')}
      </p>

      <Card className="mt-6 p-5">
        <SectionTitle>{t('arena.howMany')}</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5">
          {[3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAdversaires(n)}
              aria-pressed={adversaires === n}
              className={clsx(
                'rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm font-medium transition-colors',
                adversaires === n
                  ? 'border-accent bg-accent/15 text-ink'
                  : 'border-line text-muted hover:bg-surface-hover',
              )}
            >
              {t('arena.opponentsCount', { n })}
              <span className="mt-0.5 block text-[12px] font-normal text-faint">
                {t('arena.gamesToPlay', { n })}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle hint={t('arena.levelHint')}>{t('arena.theirStrength')}</SectionTitle>

        {/*
          Le hasard par défaut, et ce n'est pas une facilité.
          Un plateau où tous les adversaires ont la même force revient à jouer
          cinq fois la même partie : on ne découvre pas où se situe sa limite.
          Un plateau étalé produit des parties qu'on gagne, d'autres qu'on perd,
          et c'est l'écart entre les deux qui renseigne.
        */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setAleatoire(true)}
            aria-pressed={aleatoire}
            className={clsx(
              'flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm font-medium transition-colors',
              aleatoire
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            <Dices size={15} aria-hidden />
            {t('arena.variedStrengths')}
          </button>
          <button
            type="button"
            onClick={() => setAleatoire(false)}
            aria-pressed={!aleatoire}
            className={clsx(
              'rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm font-medium transition-colors',
              !aleatoire
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            {t('arena.sameLevel')}
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {t(aleatoire ? 'arena.aroundLevel' : 'arena.level')}
            </span>
            <span className="text-muted">
              {niveau} · {palier.elo} Elo
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={BOT_LEVELS.length}
            value={niveau}
            onChange={(event) => setNiveau(Number(event.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <p className="mt-1 text-xs text-faint">
          {aleatoire
            ? t('arena.randomRange', {
                min: botLevel(Math.max(1, niveau - 4)).elo,
                max: botLevel(Math.min(BOT_LEVELS.length, niveau + 4)).elo,
              })
            : t('arena.sameStrength', { elo: palier.elo })}
        </p>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle>{t('friendGame.timeControl')}</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {TIME_CONTROLS.filter((tc) =>
            ['180+2', '300+3', '600+5', '900+10', '1800+20'].includes(tc.id),
          ).map((tc) => (
            <button
              key={tc.id}
              type="button"
              onClick={() => setCadence(tc.id)}
              aria-pressed={cadence === tc.id}
              className={clsx(
                'rounded-[var(--radius-sm)] border px-2 py-2.5 text-xs font-medium transition-colors',
                cadence === tc.id
                  ? 'border-accent bg-accent/15 text-ink'
                  : 'border-line text-muted hover:bg-surface-hover',
              )}
            >
              <span className="block text-[12px] font-normal leading-tight text-faint">
                {SPEED_LABELS[tc.category][contenu]}
              </span>
              <span className="mt-0.5 block text-sm">{tc.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-5"
        icon={<Trophy size={17} />}
        onClick={lancer}
      >
        {t('arena.composeField')}
      </Button>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le tableau du tournoi
// ─────────────────────────────────────────────────────────────────────────────

function Tableau({ tournoi, onAbandonner }: { tournoi: TournoiSolo; onAbandonner: () => void }) {
  const t = useT()
  const router = useRouter()
  const table = classement(tournoi)
  const duel = prochainDuel(tournoi)
  const fini = estTermine(tournoi)
  const rondes = nombreDeRondes(tournoi)
  const moi = table.find((l) => l.concurrent.id === HUMAIN)

  const jouer = useCallback(() => {
    if (!duel) return
    const adverse = duel.blancs === HUMAIN ? duel.noirs : duel.blancs
    const bot = trouverConcurrent(tournoi, adverse)
    if (!bot?.niveau) {
      toast.error(t('arena.opponentMissing'), t('arena.recompose'))
      return
    }
    const couleur = duel.blancs === HUMAIN ? 'w' : 'b'
    // Le style part avec la force : sans lui, l'adversaire jouerait comme le
    // barème le prévoit pour ce palier, et non comme le plateau l'annonce.
    router.push(
      `/jouer/ordinateur?tournoi=1&niveau=${bot.niveau}&couleur=${couleur}` +
        `&tc=${tournoi.cadence}&perso=${bot.personnalite ?? ''}`,
    )
  }, [duel, tournoi, router, t])

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('arena.yourTournament')}
        </h1>
        <Chip tone="accent">
          {t('arena.roundOf', { n: Math.min(tournoi.ronde, rondes), total: rondes })}
        </Chip>
      </div>

      {fini ? (
        <Card className="mt-5 border-accent/50 p-5 text-center">
          <p className="text-4xl">{moi?.rang === 1 ? '🏆' : moi?.rang === 2 ? '🥈' : '🎯'}</p>
          <p className="mt-2 font-display text-xl font-bold">
            {moi?.rang === 1
              ? t('arena.youWin')
              : t((moi?.points ?? 0) > 1 ? 'arena.rankOf' : 'arena.rankOfOne', {
                  rang: moi?.rang ?? 0,
                  total: table.length,
                  points: moi?.points ?? 0,
                })}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(moi?.rang === 1 ? 'arena.tryStronger' : 'arena.fullStandings')}
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            icon={<RotateCcw size={14} />}
            onClick={onAbandonner}
          >
            {t('arena.newTournament')}
          </Button>
        </Card>
      ) : (
        duel && <ProchaineRonde tournoi={tournoi} duel={duel} onJouer={jouer} />
      )}

      <Card className="mt-4 overflow-hidden">
        <p className="border-b border-line/60 px-4 py-2.5 text-[12px] font-semibold text-faint">
          {t('arena.standings')}
        </p>
        <ul>
          {table.map((ligne) => {
            const moiMeme = ligne.concurrent.id === HUMAIN
            return (
              <li
                key={ligne.concurrent.id}
                className={clsx(
                  'flex items-center gap-3 border-b border-line/40 px-4 py-2.5 last:border-0',
                  moiMeme && 'bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]',
                )}
              >
                <span className="w-5 shrink-0 text-sm tabular-nums text-faint">{ligne.rang}</span>
                <VisageDuConcurrent concurrent={ligne.concurrent} taille={38} />
                <span className="min-w-0 flex-1">
                  <span className={clsx('block truncate text-sm', moiMeme && 'font-bold')}>
                    {ligne.concurrent.nom ?? tCoeur(t, ligne.concurrent.nomKey ?? '')}
                  </span>
                  <span className="block text-[12px] text-faint">
                    {ligne.concurrent.elo} Elo ·{' '}
                    {t(ligne.joues > 1 ? 'arena.gamesPlayed' : 'arena.oneGamePlayed', {
                      n: ligne.joues,
                    })}
                  </span>
                </span>
                <span className="shrink-0 font-display text-lg font-bold tabular-nums">
                  {ligne.points}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Resultats tournoi={tournoi} />

      {!fini && (
        <button
          type="button"
          onClick={onAbandonner}
          className="mt-4 text-sm text-faint transition-colors hover:text-muted"
        >
          {t('arena.abandon')}
        </button>
      )}
    </>
  )
}

function ProchaineRonde({
  tournoi,
  duel,
  onJouer,
}: {
  tournoi: TournoiSolo
  duel: { blancs: string; noirs: string; ronde: number }
  onJouer: () => void
}) {
  const t = useT()
  const adverse = duel.blancs === HUMAIN ? duel.noirs : duel.blancs
  const bot = trouverConcurrent(tournoi, adverse)
  const couleur = t(duel.blancs === HUMAIN ? 'settings.white' : 'settings.black')

  return (
    <Card className="mt-5 p-5">
      <p className="text-[12px] font-semibold text-faint">
        {t('arena.yourRound', { n: duel.ronde })}
      </p>
      <div className="mt-2 flex items-center gap-3">
        {bot && <VisageDuConcurrent concurrent={bot} taille={56} />}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">{bot?.nom}</p>
          <p className="text-[14px] text-muted">
            {t('arena.youPlay', { elo: bot?.elo ?? 0, couleur })}
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-4"
        icon={<Play size={17} />}
        onClick={onJouer}
      >
        {t('arena.playThisGame')}
      </Button>
    </Card>
  )
}

/**
 * Le visage d'un concurrent.
 *
 * Les sept adversaires ont un portrait rendu, généré avec le reste de
 * l'identité visuelle et déjà employé sur `/jouer` — le tableau du tournoi se
 * contentait de leur émoji, ce qui donnait un classement de pictogrammes là où
 * les personnages existent. `PortraitAdversaire` retombe de lui-même sur
 * l'émoji si le fichier manque, ce qui rend le remplacement sans risque.
 *
 * Le joueur humain n'a pas de portrait : il prend la tuile de la marque, qui
 * le distingue nettement des six autres sans lui inventer un visage.
 *
 * Les portraits sont posés sur une pastille claire. Sans elle, ces sculptures
 * sombres sur fond transparent disparaissaient purement et simplement dans une
 * ligne de classement — mesuré à l'écran : les images étaient chargées, à la
 * bonne taille, et invisibles. C'est le même piège que le portrait du coach en
 * relecture guidée, et la même parade : ne jamais compter sur le fond de la
 * page pour faire ressortir un visuel qu'on n'a pas dessiné pour lui.
 */
function VisageDuConcurrent({
  concurrent,
  taille,
}: {
  concurrent: { personnalite: string | null; emoji: string }
  taille: number
}) {
  if (!concurrent.personnalite) {
    return (
      <Image
        src="/brand/logo-cavale.webp"
        alt=""
        width={128}
        height={128}
        className="shrink-0 rounded-[28%] object-cover"
        style={{ width: taille, height: taille }}
        aria-hidden
      />
    )
  }
  const personnalite = BOT_PERSONALITIES[concurrent.personnalite as keyof typeof BOT_PERSONALITIES]
  if (!personnalite) {
    return (
      <span className="shrink-0 text-lg" aria-hidden>
        {concurrent.emoji}
      </span>
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-surface-strong ring-1 ring-line"
      style={{ width: taille, height: taille }}
      aria-hidden
    >
      <PortraitAdversaire personality={personnalite} size={Math.round(taille * 0.82)} />
    </span>
  )
}

/**
 * Les résultats ronde par ronde.
 *
 * Les parties tirées portent la mention « simulé ». C'est le point sur lequel
 * il ne faut pas être ambigu : quelqu'un qui croirait que les robots se sont
 * réellement affrontés se ferait une fausse idée de la valeur du classement.
 */
function Resultats({ tournoi }: { tournoi: TournoiSolo }) {
  const t = useT()
  const rondes = nombreDeRondes(tournoi)
  const jouees = tournoi.duels.filter((d) => d.resultat !== '*')
  if (jouees.length === 0) return null

  return (
    <Card className="mt-4 overflow-hidden">
      <p className="border-b border-line/60 px-4 py-2.5 text-[12px] font-semibold text-faint">
        {t('arena.results')}
      </p>
      <div className="max-h-80 overflow-y-auto">
        {Array.from({ length: rondes }, (_, i) => i + 1).map((ronde) => {
          const duels = tournoi.duels.filter((d) => d.ronde === ronde && d.resultat !== '*')
          if (duels.length === 0) return null
          return (
            <div key={ronde} className="border-b border-line/40 px-4 py-2 last:border-0">
              <p className="mb-1 text-[12px] font-semibold text-faint">
                {t('arena.round', { n: ronde })}
              </p>
              {duels.map((duel, index) => {
                const blancs = trouverConcurrent(tournoi, duel.blancs)
                const noirs = trouverConcurrent(tournoi, duel.noirs)
                const mien = duel.blancs === HUMAIN || duel.noirs === HUMAIN
                return (
                  <p
                    key={index}
                    className={clsx(
                      'flex items-center gap-2 py-0.5 text-[14px]',
                      !mien && 'text-muted',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {blancs?.nom} — {noirs?.nom}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {duel.resultat === '1/2-1/2' ? '½–½' : duel.resultat.replace('-', '–')}
                    </span>
                    {duel.simule && (
                      <span
                        className="shrink-0 text-[12px] text-faint"
                        title={t('arena.simulatedTitle')}
                      >
                        {t('arena.simulated')}
                      </span>
                    )}
                  </p>
                )
              })}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
