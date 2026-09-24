'use client'

/**
 * Mes erreurs à revoir.
 *
 * Les gaffes et les erreurs relevées dans les analyses du joueur, reposées
 * une à une : « trouve mieux que le coup que tu as joué ». Retrouvée, une
 * position monte d'une boîte de Leitner et revient plus tard ; manquée, elle
 * retombe dans la première et revient demain. Le calendrier et le relevé sont
 * dans le cœur (`revision.ts`), le stockage derrière `/api/revoir`.
 *
 * Le geste est celui des puzzles — l'échiquier, le camp au trait, un coup —,
 * avec une différence qui compte : **un seul essai**. Un puzzle se cherche,
 * une révision se vérifie ; laisser réessayer jusqu'à tomber juste ferait
 * monter de boîte une position qu'on n'a pas retrouvée.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { Check, Lock, RotateCcw, SearchX, X } from 'lucide-react'
import {
  BOITE_MAX,
  QUALITY_STYLES,
  apresRevision,
  reponseJuste,
  type MoveQuality,
} from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  Spinner,
  TitreDePage,
} from '@/components/ui/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { jourLocal } from '@/lib/daily/quotidien.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import { useSan } from '@/lib/notation.ts'
import { playMoveFor, playSound } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

interface Explication {
  headline: string
  body: string[]
  betterMove: string | null
}

interface Carte {
  id: string
  fen: string
  playedSan: string
  playedUci: string
  bestSan: string
  bestUci: string
  accepted: string[]
  quality: string
  explanation: Record<'fr' | 'en', Explication> | null
  box: number
}

interface Donnees {
  jour: string
  dues: Carte[]
  total: number
  prochaine: string | null
  analyses: number
  enRetard: boolean
}

type Chargement =
  | { etat: 'chargement'; rattrapage: boolean }
  | { etat: 'anonyme' }
  | { etat: 'erreur' }
  | { etat: 'pret'; donnees: Donnees }

type Phase = 'cherche' | 'trouve' | 'rate'

/**
 * Passages de rattrapage au plus, à l'ouverture. Chacun relève trois analyses
 * anciennes ; au-delà, le reste attendra la visite suivante plutôt que de
 * faire patienter indéfiniment.
 */
const PASSAGES_MAX = 10

/** Le coup UCI appliqué à la position, ou `null` s'il ne s'y joue pas. */
function jouer(fen: string, uci: string) {
  try {
    const echiquier = new Chess(fen, { skipValidation: true })
    const coup = echiquier.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] ?? undefined,
    })
    return { fen: echiquier.fen(), coup }
  } catch {
    return null
  }
}

export default function ErreursARevoirPage() {
  const t = useT()
  const identite = useIdentite()
  const [chargement, setChargement] = useState<Chargement>({
    etat: 'chargement',
    rattrapage: false,
  })

  const charger = useCallback(async () => {
    setChargement({ etat: 'chargement', rattrapage: false })
    const jour = jourLocal()
    try {
      for (let passage = 0; passage < PASSAGES_MAX; passage++) {
        const reponse = await fetch(`/api/revoir?jour=${jour}`, { cache: 'no-store' })
        if (reponse.status === 401) {
          setChargement({ etat: 'anonyme' })
          return
        }
        if (!reponse.ok) throw new Error(String(reponse.status))
        const donnees = (await reponse.json()) as Donnees
        // Des analyses anciennes restent à relever : on redemande, en le
        // disant, plutôt que d'annoncer « rien à revoir » à tort.
        if (donnees.enRetard && passage < PASSAGES_MAX - 1) {
          setChargement({ etat: 'chargement', rattrapage: true })
          continue
        }
        setChargement({ etat: 'pret', donnees })
        return
      }
    } catch {
      setChargement({ etat: 'erreur' })
    }
  }, [])

  useEffect(() => {
    // `undefined` : on ne sait pas encore. Rien à demander à la route tant
    // qu'on ignore s'il y a un compte — elle répondrait 401 à un visiteur.
    if (identite === undefined) return
    if (identite === null) {
      setChargement({ etat: 'anonyme' })
      return
    }
    void charger()
  }, [identite, charger])

  const titre = <TitreDePage intro={t('revoir.intro')}>{t('revoir.title')}</TitreDePage>

  if (chargement.etat === 'anonyme') {
    return (
      <div className="page-etroite">
        {titre}
        <EmptyState
          icon={<Lock size={28} aria-hidden />}
          title={t('revoir.needsAccount')}
          description={t('revoir.needsAccountHint')}
          action={
            <ButtonLink href="/connexion" variant="primary">
              {t('nav.signIn')}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  if (chargement.etat === 'chargement') {
    return (
      <div className="page-etroite">
        {titre}
        <div className="grid place-items-center gap-3 py-16 text-sm text-muted" role="status">
          <Spinner size={24} />
          {chargement.rattrapage && <p>{t('revoir.catchingUp')}</p>}
        </div>
      </div>
    )
  }

  if (chargement.etat === 'erreur') {
    return (
      <div className="page-etroite">
        {titre}
        <EmptyState
          icon={<X size={28} aria-hidden />}
          title={t('revoir.loadFailed')}
          action={<Button onClick={() => void charger()}>{t('common.retry')}</Button>}
        />
      </div>
    )
  }

  const { donnees } = chargement
  if (donnees.dues.length === 0) {
    return (
      <div className="page-etroite">
        {titre}
        <RienARevoir donnees={donnees} />
      </div>
    )
  }

  return <Seance key={donnees.jour} donnees={donnees} titre={titre} />
}

/** Les trois façons de n'avoir rien à revoir, qui n'appellent pas le même geste. */
function RienARevoir({ donnees }: { donnees: Donnees }) {
  const t = useT()
  const date = useDate()

  if (donnees.analyses === 0) {
    return (
      <EmptyState
        icon={<SearchX size={28} aria-hidden />}
        title={t('revoir.noAnalysis')}
        description={t('revoir.noAnalysisHint')}
        action={
          <ButtonLink href="/analyse" variant="primary">
            {t('revoir.analyse')}
          </ButtonLink>
        }
      />
    )
  }

  if (donnees.total === 0) {
    return (
      <EmptyState
        icon={<Check size={28} aria-hidden />}
        title={t('revoir.noMistake')}
        description={t('revoir.noMistakeHint')}
        action={<ButtonLink href="/analyse">{t('revoir.analyse')}</ButtonLink>}
      />
    )
  }

  return (
    <EmptyState
      icon={<Check size={28} aria-hidden />}
      title={t('revoir.nothingDue')}
      description={
        donnees.prochaine
          ? t('revoir.nothingDueHint', { date: date(donnees.prochaine) })
          : undefined
      }
      action={<ButtonLink href="/progresser">{t('revoir.backToProgress')}</ButtonLink>}
    />
  )
}

/** Formate un jour `AAAA-MM-JJ` dans la langue de l'interface. */
function useDate() {
  const locale = usePreferences((state) => state.locale)
  return useCallback(
    (jour: string) => {
      const date = new Date(`${jour}T12:00:00`)
      try {
        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date)
      } catch {
        return jour
      }
    },
    [locale],
  )
}

function Seance({ donnees, titre }: { donnees: Donnees; titre: React.ReactNode }) {
  const t = useT()
  const san = useSan()
  const date = useDate()
  const locale = usePreferences((state) => localeDuContenu(state.locale))

  const [indice, setIndice] = useState(0)
  const [phase, setPhase] = useState<Phase>('cherche')
  const [erreurVue, setErreurVue] = useState(false)
  const [position, setPosition] = useState(donnees.dues[0]!.fen)
  const [dernierCoup, setDernierCoup] = useState<{ from: Square; to: Square } | null>(null)
  const [retrouvees, setRetrouvees] = useState(0)
  const [terminee, setTerminee] = useState(false)
  // Une révision n'est envoyée qu'une fois par position, quoi qu'il arrive à
  // l'écran : voir la garde du serveur, qui refuse de compter deux fois.
  const envoyees = useRef(new Set<string>())

  const carte = donnees.dues[indice]!
  const trait = carte.fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const legaux = useLegalMoves(position, phase === 'cherche')
  const restantes = donnees.dues.length - indice - (phase === 'cherche' ? 0 : 1)

  const echeanceSiRetrouvee = useMemo(
    () => apresRevision(carte.box, true, donnees.jour).echeance,
    [carte.box, donnees.jour],
  )

  const envoyer = useCallback(
    (reussie: boolean) => {
      if (envoyees.current.has(carte.id)) return
      envoyees.current.add(carte.id)
      void fetch('/api/revoir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: carte.id, reussie, jour: donnees.jour }),
        keepalive: true,
      }).catch(() => {
        // Hors ligne : la position reste due et reviendra à la prochaine
        // visite. Rien n'est perdu, rien n'est compté à tort.
      })
    },
    [carte.id, donnees.jour],
  )

  /** Montre le meilleur coup sur l'échiquier, après un échec. */
  const montrerLaSolution = useCallback(() => {
    const suite = jouer(carte.fen, carte.bestUci)
    if (suite) {
      setPosition(suite.fen)
      setDernierCoup({ from: suite.coup.from, to: suite.coup.to })
    }
  }, [carte.fen, carte.bestUci])

  const surCoup = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (phase !== 'cherche') return
      const uci = `${from}${to}${promotion ?? ''}`
      const suite = jouer(carte.fen, `${from}${to}${promotion ?? 'q'}`)
      if (!suite) return

      if (reponseJuste(carte.fen, uci, carte.accepted)) {
        setPosition(suite.fen)
        setDernierCoup({ from: suite.coup.from, to: suite.coup.to })
        playMoveFor(suite.coup)
        playSound('victory')
        setPhase('trouve')
        setRetrouvees((n) => n + 1)
        envoyer(true)
        return
      }

      // Un seul essai : le coup faux est montré, puis la solution.
      playSound('error')
      setErreurVue(true)
      setPhase('rate')
      envoyer(false)
      montrerLaSolution()
    },
    [phase, carte.fen, carte.accepted, envoyer, montrerLaSolution],
  )

  const abandonner = () => {
    setPhase('rate')
    envoyer(false)
    montrerLaSolution()
  }

  const suivante = () => {
    const prochaine = indice + 1
    if (prochaine >= donnees.dues.length) {
      setTerminee(true)
      return
    }
    setIndice(prochaine)
    setPhase('cherche')
    setErreurVue(false)
    setPosition(donnees.dues[prochaine]!.fen)
    setDernierCoup(null)
  }

  if (terminee) {
    return (
      <div className="page-etroite">
        {titre}
        <EmptyState
          icon={<Check size={28} aria-hidden />}
          title={t('revoir.doneTitle')}
          description={`${t('revoir.doneScore', { ok: retrouvees, n: donnees.dues.length })} ${t('revoir.doneHint')}`}
          action={
            <ButtonLink href="/progresser" variant="primary">
              {t('revoir.backToProgress')}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const explication = carte.explanation?.[locale] ?? null
  const qualite = QUALITY_STYLES[carte.quality as MoveQuality]

  return (
    <div className="page">
      {titre}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip tone="accent">
          <RotateCcw size={11} aria-hidden />
          {t('revoir.dueToday', { n: restantes })}
        </Chip>
        <Chip>{t('revoir.box', { n: carte.box, max: BOITE_MAX })}</Chip>
        {qualite && <Chip>{tCoeur(t, qualite.label)}</Chip>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto w-full min-w-0 max-w-[560px]">
          <ChessBoard
            fen={position}
            orientation={trait}
            playable={phase === 'cherche' ? trait : null}
            legalMoves={legaux}
            onMove={surCoup}
            lastMove={dernierCoup}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Card className="p-5">
            {phase === 'cherche' && (
              <>
                <p className="text-[13px] font-medium text-muted">
                  {t(trait === 'w' ? 'puzzles.whiteToPlay' : 'puzzles.blackToPlay')}
                </p>
                <h2 className="titre-affiche mt-1 text-[1.35rem]">
                  {t('revoir.findBetter', { coup: san(carte.playedSan) })}
                </h2>
                <p className="mt-1 text-[14px] leading-snug text-muted">
                  {t('revoir.findBetterHint')}
                </p>
                <Button className="mt-4 w-full" onClick={abandonner}>
                  {t('revoir.dontKnow')}
                </Button>
              </>
            )}

            {phase !== 'cherche' && (
              <div aria-live="polite">
                <p
                  className="titre-affiche flex items-center gap-2 text-[1.35rem]"
                  style={{ color: phase === 'trouve' ? 'var(--q-best)' : 'var(--q-blunder)' }}
                >
                  {phase === 'trouve' ? (
                    <Check size={20} strokeWidth={3} aria-hidden />
                  ) : (
                    <X size={20} strokeWidth={3} aria-hidden />
                  )}
                  {t(phase === 'trouve' ? 'revoir.foundTitle' : 'revoir.missedTitle')}
                </p>
                {erreurVue && <p className="mt-1 text-[14px] text-muted">{t('revoir.notThis')}</p>}
                <p className="mt-1 text-[14px] text-muted">
                  {phase === 'trouve'
                    ? t('revoir.foundHint', { date: date(echeanceSiRetrouvee) })
                    : t('revoir.missedHint')}
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[14px]">
                  <dt className="text-muted">{t('revoir.bestWas')}</dt>
                  <dd className="font-semibold">{san(carte.bestSan)}</dd>
                  <dt className="text-muted">{t('revoir.youPlayed')}</dt>
                  <dd>{san(carte.playedSan)}</dd>
                </dl>
                <Button variant="primary" className="mt-4 w-full" onClick={suivante}>
                  {t(indice + 1 < donnees.dues.length ? 'revoir.next' : 'revoir.finish')}
                </Button>
              </div>
            )}
          </Card>

          {phase !== 'cherche' && explication && (
            <Card className="p-5">
              <p className="mb-1.5 font-display text-[15px] font-bold tracking-tight">
                {t('revoir.why')}
              </p>
              <p className="text-[14px] font-medium leading-relaxed">{explication.headline}</p>
              {explication.body.map((phrase, i) => (
                <p key={i} className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  {phrase}
                </p>
              ))}
              {explication.betterMove && (
                <p className="mt-1.5 text-[14px] leading-relaxed">{explication.betterMove}</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
