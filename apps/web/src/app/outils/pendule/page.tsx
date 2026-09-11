'use client'

/**
 * La pendule.
 *
 * Un téléphone ou une tablette posé à côté d'un vrai échiquier, et qui fait le
 * travail d'une pendule de tournoi : deux temps, un incrément, on tape son
 * côté après avoir joué. Rien de neuf — sauf ce qui suit.
 *
 * ── Ce qu'elle fait qu'une pendule ne fait pas ───────────────────────────
 *
 * Branchée sur un échiquier électronique, elle **n'a plus besoin qu'on la
 * touche** : la carte voit le coup, la pendule bascule. Et comme elle voit les
 * coups, elle les note : à la fin, la partie jouée sur le bois existe en PGN,
 * et s'ouvre dans l'analyse. C'est le seul geste que le matériel ne sait pas
 * faire — on joue une partie sérieuse sur un vrai plateau, et il n'en reste
 * rien qu'une feuille de score à recopier.
 *
 * Les pilotes existaient déjà (`lib/board/`), et servaient les trois écrans de
 * jeu. Ici, l'écran ne joue pas : il regarde.
 *
 * ── Trois choix de comportement ───────────────────────────────────────────
 *
 *  1. **On tape son propre côté**, comme sur une pendule mécanique : appuyer
 *     arrête *sa* pendule et lance celle d'en face. Toucher le côté de
 *     l'adversaire ne fait rien, exactement comme un levier déjà baissé.
 *  2. **Le premier appui ne consomme rien.** Une partie commence quand les
 *     Blancs jouent, pas quand on pose la tablette sur la table.
 *  3. **L'écran reste allumé** tant que la pendule tourne. Une pendule qui
 *     s'éteint au bout de trente secondes n'est pas une pendule.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gauge, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import clsx from 'clsx'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  TIME_CONTROLS,
  applyMove,
  createClock,
  flaggedColor,
  formatClock,
  formatTimeControl,
  remainingAt,
  stopClock,
  type ClockState,
  type TimeControl,
} from '@coupparfait/core'
import { Button, Card, Chip } from '@/components/ui/index.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import { usePhysicalBoard } from '@/lib/board/usePhysicalBoard.ts'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { useEcranAllume } from '@/lib/ecranAllume.ts'
import { playSound } from '@/lib/sound.ts'
import { toast } from '@/components/ui/Toast.tsx'

/**
 * Les cadences proposées.
 *
 * Un sous-ensemble de `TIME_CONTROLS` : celles qu'on joue en face de quelqu'un.
 * Le bullet et l'ultra-bullet n'ont pas de sens sur un plateau en bois — le
 * temps de déplacer la pièce et d'appuyer coûte déjà une seconde — et « sans
 * limite » n'a pas de sens dans une pendule.
 */
const CADENCES = TIME_CONTROLS.filter(
  (cadence) => cadence.initial >= 180 && !(cadence.initial === 0 && cadence.increment === 0),
)

export default function PendulePage() {
  const router = useRouter()
  const [control, setControl] = useState<TimeControl>(
    () => CADENCES.find((cadence) => cadence.id === '600+5') ?? CADENCES[0]!,
  )
  const [clock, setClock] = useState<ClockState | null>(null)
  const [tombe, setTombe] = useState<Color | null>(null)
  const [enPause, setEnPause] = useState(false)
  /** Re-rendu à dix images par seconde, tant que quelque chose tourne. */
  const [, tic] = useState(0)

  const partieLancee = clock !== null

  // ── La partie notée, quand un plateau la dicte ───────────────────────────
  const jeu = useChessGame()
  const { state, chess, play, reset: rejouer } = jeu

  /**
   * Le coup vu par la carte fait basculer la pendule.
   *
   * L'ordre compte : on joue le coup pour connaître le camp qui vient de jouer
   * — `state.turn` a déjà changé au moment où l'on rend — puis on bascule.
   */
  const surCoupPhysique = useCallback(
    (from: Square, to: Square, promo?: PieceSymbol) => {
      const camp = chess.turn()
      const joue = play(from, to, promo)
      if (joue) basculer(camp)
      return joue
    },
    // `basculer` est stable par `useCallback` plus bas ; la référence circulaire
    // est levée par la déclaration en fonction, pas par une dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [play, chess],
  )

  const plateau = usePhysicalBoard({
    chess,
    fen: state.currentFen,
    isLive: state.isLive && !state.isGameOver,
    play: surCoupPhysique,
    lastMove: state.lastMove,
    enabled: partieLancee && !enPause && tombe === null,
  })

  /**
   * Basculer.
   *
   * `camp` est celui qui vient de jouer. Le premier appui démarre la partie —
   * `createClock` laisse les deux pendules à l'arrêt, personne ne perd de temps
   * avant le premier coup.
   */
  const basculer = useCallback(
    (camp: Color) => {
      if (tombe) return
      setClock((actuelle) => {
        const maintenant = Date.now()
        if (!actuelle) return applyMove(createClock(control, maintenant), camp, maintenant, true)
        // Une pendule mécanique ignore l'appui sur le levier déjà baissé.
        if (actuelle.running !== null && actuelle.running !== camp) return actuelle
        return applyMove(actuelle, camp, maintenant, actuelle.running === null)
      })
      setEnPause(false)
      playSound('move')
    },
    [control, tombe],
  )

  /**
   * Le bouton de départ n'est pas un coup.
   *
   * Il passait par `basculer('b')`, ce qui revenait à annoncer « les Noirs
   * viennent de jouer » : la cadence Fischer ajoute l'incrément après chaque
   * coup, et les Noirs commençaient donc la partie avec cinq secondes de plus
   * que les Blancs. Le départ met simplement la pendule des Blancs en marche,
   * sans rien créditer à personne.
   */
  const demarrer = useCallback(() => {
    const maintenant = Date.now()
    setClock({ ...createClock(control, maintenant), running: 'w', updatedAt: maintenant })
    setTombe(null)
    setEnPause(false)
  }, [control])

  /*
    Le battement, et la chute du drapeau dans le même intervalle.

    Deux effets séparés seraient plus lisibles et faux : le drapeau ne tombe
    pas à un changement d'état mais au passage du temps, et un effet qui
    n'écoute que `clock` ne se rejouerait jamais entre deux coups. C'est donc
    le minuteur qui regarde, dix fois par seconde, et qui arrête tout.
  */
  useEffect(() => {
    if (!clock?.running || tombe) return
    const minuterie = setInterval(() => {
      const maintenant = Date.now()
      const perdant = flaggedColor(clock, maintenant)
      if (perdant) {
        setTombe(perdant)
        setClock((actuelle) => (actuelle ? stopClock(actuelle, maintenant) : actuelle))
        playSound('defeat')
        return
      }
      tic((n) => n + 1)
    }, 100)
    return () => clearInterval(minuterie)
  }, [clock, tombe])

  useEcranAllume(partieLancee && !enPause && tombe === null)

  /*
    Recalculé à chaque rendu, sans mémoïsation : `remainingAt` est une
    soustraction, et le seul argument qui change est l'instant — qui ne peut
    pas figurer dans une liste de dépendances. Un `useMemo` ici gèlerait
    l'affichage sur la valeur du dernier coup.
  */
  const restant = clock
    ? remainingAt(clock, Date.now())
    : { w: control.initial * 1000, b: control.initial * 1000 }

  const basculerPause = useCallback(() => {
    setClock((actuelle) => {
      if (!actuelle) return actuelle
      const maintenant = Date.now()
      if (actuelle.running) {
        setEnPause(true)
        return stopClock(actuelle, maintenant)
      }
      return actuelle
    })
  }, [])

  const reprendre = useCallback((camp: Color) => {
    setEnPause(false)
    setClock((actuelle) =>
      actuelle ? { ...actuelle, running: camp, updatedAt: Date.now() } : actuelle,
    )
  }, [])

  const remettre = useCallback(() => {
    setClock(null)
    setTombe(null)
    setEnPause(false)
    rejouer()
  }, [rejouer])

  /** Envoie la partie notée vers l'analyse, comme le fait l'accueil. */
  const analyser = useCallback(() => {
    const pgn = chess.pgn()
    if (state.moves.length === 0) {
      toast.info(
        'Aucun coup noté.',
        'Branche un échiquier électronique pour que la partie s’écrive.',
      )
      return
    }
    try {
      sessionStorage.setItem('coupparfait.pendingAnalysis', pgn)
    } catch {
      // Stockage refusé : l'écran d'analyse s'ouvrira vide, et il sait le dire.
    }
    router.push('/analyse')
  }, [chess, state.moves.length, router])

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      {!partieLancee && (
        <>
          <Link
            href="/outils"
            className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden />
            Outils
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Pendule</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Pose l’appareil entre les deux joueurs. Chacun tape son propre côté après avoir joué —
            comme sur une pendule mécanique. Avec un échiquier électronique branché, tu n’as rien à
            toucher : la carte voit le coup, la pendule bascule, et la partie s’écrit toute seule.
          </p>

          <Card className="mt-5 p-4">
            <p className="text-[12px] font-semibold text-faint">Cadence</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CADENCES.map((cadence) => (
                <button
                  key={cadence.id}
                  type="button"
                  onClick={() => setControl(cadence)}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm font-medium transition-colors',
                    cadence.initial === control.initial && cadence.increment === control.increment
                      ? 'border-accent bg-accent/20 text-accent ring-1 ring-accent'
                      : 'border-line hover:bg-surface-hover',
                  )}
                >
                  {cadence.label}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-4">
            <PhysicalBoardPanel state={plateau} />
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-4"
            icon={<Timer size={17} />}
            onClick={demarrer}
          >
            Démarrer — les Blancs jouent
          </Button>
          <p className="mt-2 text-center text-[12px] leading-relaxed text-faint">
            Le premier appui lance la pendule des Blancs sans rien leur décompter.
          </p>
        </>
      )}

      {partieLancee && (
        <div className="flex flex-col gap-2">
          {/* ── Les deux côtés ───────────────────────────────────────────
              Celui d'en face est retourné : les deux joueurs sont assis face
              à face, et une pendule ne se lit pas de travers. */}
          <CoteJoueur
            camp="b"
            ms={restant.b}
            actif={clock.running === 'b'}
            tombe={tombe === 'b'}
            retourne
            onTaper={() => basculer('b')}
          />

          <div className="flex items-center justify-center gap-2 py-1">
            <Chip>{formatTimeControl(control)}</Chip>
            <Chip tone="neutral">coup {Math.floor(state.moves.length / 2) + 1}</Chip>
            {clock.running && !tombe && (
              <Button variant="ghost" size="sm" icon={<Pause size={14} />} onClick={basculerPause}>
                Pause
              </Button>
            )}
            {enPause && !tombe && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Play size={14} />}
                onClick={() => reprendre(clock.running ?? 'w')}
              >
                Reprendre
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={remettre}>
              Remettre
            </Button>
          </div>

          <CoteJoueur
            camp="w"
            ms={restant.w}
            actif={clock.running === 'w'}
            tombe={tombe === 'w'}
            onTaper={() => basculer('w')}
          />

          {tombe && (
            <Card className="mt-2 p-4 text-center">
              <p className="font-display text-lg font-bold">
                Temps écoulé — {tombe === 'w' ? 'les Blancs' : 'les Noirs'} tombent.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={remettre}>
                  Nouvelle partie
                </Button>
                {state.moves.length > 0 && (
                  <Button variant="primary" icon={<Gauge size={15} />} onClick={analyser}>
                    Analyser la partie
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Le plateau reste accessible pendant la partie : c'est là qu'on
              rebranche une carte qui a décroché, et là que s'affiche ce
              qu'elle ne comprend pas. */}
          <PhysicalBoardPanel state={plateau} className="mt-2" />

          {state.moves.length > 0 && (
            <Card className="mt-2 p-3">
              <p className="text-[12px] font-semibold text-faint">
                La partie, telle que la carte l’a vue
              </p>
              <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-muted">
                {state.moves.map((coup) => coup.san).join(' ')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                icon={<Gauge size={14} />}
                onClick={analyser}
              >
                Analyser
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Un côté de la pendule.
 *
 * Toute la surface est le bouton : on tape avec la paume, sans viser, souvent
 * sans regarder. Un bouton de la taille d'un doigt au milieu d'une carte
 * obligerait à quitter l'échiquier des yeux pour trouver la cible.
 */
function CoteJoueur({
  camp,
  ms,
  actif,
  tombe,
  retourne = false,
  onTaper,
}: {
  camp: Color
  ms: number
  actif: boolean
  tombe: boolean
  retourne?: boolean
  onTaper: () => void
}) {
  return (
    <button
      type="button"
      onClick={onTaper}
      aria-label={`${camp === 'w' ? 'Blancs' : 'Noirs'} — ${formatClock(ms)}`}
      className={clsx(
        'grid min-h-[30dvh] w-full place-items-center rounded-[var(--radius)] border transition-colors',
        retourne && 'rotate-180',
        tombe
          ? 'border-[var(--q-blunder)] bg-[color-mix(in_oklab,var(--q-blunder)_18%,transparent)]'
          : actif
            ? 'border-accent bg-accent/15'
            : 'border-line bg-surface',
      )}
    >
      <span className="flex flex-col items-center gap-1">
        <span className="text-[12px] font-semibold text-faint">
          {camp === 'w' ? 'Blancs' : 'Noirs'}
        </span>
        <span
          className={clsx(
            'font-display text-[clamp(3rem,16vw,6rem)] font-bold leading-none tabular-nums',
            tombe ? 'text-[var(--q-blunder)]' : actif ? 'text-accent' : 'text-ink',
          )}
        >
          {formatClock(ms)}
        </span>
      </span>
    </button>
  )
}
