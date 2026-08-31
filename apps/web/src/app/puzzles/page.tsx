'use client'

/**
 * Entraînement tactique.
 *
 * Le format classique, éprouvé : une position, un coup à trouver, une solution
 * de plusieurs coups. Le premier coup de la séquence est joué automatiquement
 * — c'est celui de l'adversaire, celui qui crée le motif — puis le joueur
 * enchaîne.
 *
 * Deux choix pédagogiques :
 *  - **on ne dit jamais quel est le thème avant.** Savoir qu'il s'agit d'une
 *    fourchette rend le puzzle trivial ; le thème s'affiche après coup, comme
 *    une explication ;
 *  - **une erreur ne termine pas le puzzle.** On peut réessayer. Le classement
 *    en tient compte, mais l'apprentissage prime sur le score.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  Flame,
  Loader2,
  RotateCcw,
  Target,
  Timer,
  X,
} from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { motifCopy, sanToFrench, type MotifId } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { playMoveSound, playSound } from '@/lib/sound.ts'
import { speak } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import {
  chapitreDeLUrl,
  deposerGains,
  progressionActuelle,
  signaler,
} from '@/lib/carriere/useCarriere.ts'
import { chapitre as chapitreCarriereNumero } from '@coupparfait/core'
import { useRouter } from 'next/navigation'
import { jourLocal } from '@/lib/daily/quotidien.ts'

interface Puzzle {
  id: string
  fen: string
  moves: string[]
  rating: number
  ratingDeviation: number
  themes: string[]
  gameUrl: string | null
}

type Status = 'loading' | 'playing' | 'solved' | 'failed' | 'error'

/** Thèmes proposés en filtre, avec leur libellé français. */
const THEMES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'fork', label: 'Fourchette' },
  { id: 'pin', label: 'Clouage' },
  { id: 'skewer', label: 'Enfilade' },
  { id: 'discoveredAttack', label: 'Découverte' },
  { id: 'hangingPiece', label: 'Pièce en prise' },
  { id: 'mateIn1', label: 'Mat en 1' },
  { id: 'mateIn2', label: 'Mat en 2' },
  { id: 'backRankMate', label: 'Mat du couloir' },
  { id: 'sacrifice', label: 'Sacrifice' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'zugzwang', label: 'Zugzwang' },
]

export default function PuzzlesPage() {
  const locale = usePreferences((state) => state.locale)
  const format = useSan()
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /**
   * L'échec vient-il du puzzle lui-même plutôt que du service ?
   *
   * Les deux s'affichent au même endroit, mais ne se réparent pas de la même
   * façon : l'un se passe, l'autre demande un import. Proposer la commande
   * d'import à quelqu'un qui vient de tomber sur une position bancale, c'est
   * l'envoyer réparer ce qui n'est pas cassé.
   */
  const [puzzleIllisible, setPuzzleIllisible] = useState(false)
  const [theme, setTheme] = useState('all')

  const [fen, setFen] = useState('')
  const [orientation, setOrientation] = useState<Color>('w')
  const [moveIndex, setMoveIndex] = useState(0)
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [revealed, setRevealed] = useState(false)

  /**
   * L'adversaire est-il en train de répondre ?
   *
   * Sa réponse est différée de 420 ms pour qu'on la voie passer. Pendant ce
   * temps l'échiquier restait jouable alors que le coup attendu était déjà
   * celui de l'adversaire : qui enchaîne vite se voyait compter une erreur pour
   * un coup juste, puis une seconde, et le puzzle se soldait par un échec qu'il
   * n'avait pas commis.
   */
  const [repliqueEnCours, setRepliqueEnCours] = useState(false)

  const [playerRating, setPlayerRating] = useState<number | null>(null)
  const [ratingDelta, setRatingDelta] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)

  const startedAt = useRef(Date.now())

  /**
   * Numéro de la position en cours.
   *
   * La réponse de l'adversaire est posée dans un `setTimeout` de 420 ms. Si
   * l'on change de puzzle entre-temps — un filtre de thème suffit —, ce rappel
   * survivait à la position qui l'avait déclenché et réécrivait l'échiquier
   * avec l'ancienne : le nouveau puzzle s'affichait alors sur la position du
   * précédent, plus rien ne correspondait aux coups attendus, et le joueur ne
   * pouvait ni le résoudre ni comprendre pourquoi.
   */
  const generation = useRef(0)

  const { marquer } = useQuotidien()
  const router = useRouter()

  /**
   * Vient-on du défi du jour ?
   *
   * Lu depuis l'adresse dans un effet plutôt qu'avec `useSearchParams` : le
   * paramètre n'est utile qu'au premier chargement, et cette forme évite
   * d'imposer une frontière de suspense à toute la page pour un booléen.
   * `null` tant qu'on ne sait pas — voir l'effet de chargement plus bas.
   */
  const [modeDefi, setModeDefi] = useState<boolean | null>(null)
  /**
   * Chapitre de carrière en cours, s'il y en a un.
   *
   * Lu de la même façon et pour la même raison que `modeDefi`. Sa présence est
   * ce qui distingue « je m'entraîne aux fourchettes » de « je passe le
   * chapitre 4 » : sans lui, chaque puzzle résolu où que ce soit sur le site
   * ferait avancer une carrière à laquelle on ne pensait pas.
   */
  const [chapitreCarriere, setChapitreCarriere] = useState<number | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setModeDefi(params.get('defi') === '1')
    setChapitreCarriere(chapitreDeLUrl(params))
  }, [])

  // ── Chargement ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    generation.current += 1
    setRepliqueEnCours(false)
    setStatus('loading')
    setErrorMessage(null)
    setPuzzleIllisible(false)
    setRatingDelta(null)
    setRevealed(false)
    setWrongAttempts(0)
    const demande = generation.current

    try {
      // Le défi du jour est servi par sa propre route : c'est un tirage
      // déterministe partagé par tout le monde, pas un puzzle calibré sur le
      // niveau du joueur.
      const response = await fetch(
        modeDefi
          ? `/api/defi-du-jour?jour=${jourLocal()}`
          : `/api/puzzles?theme=${encodeURIComponent(theme)}`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      // Un puzzle demandé entre-temps a pris la place : cette réponse-ci est
      // périmée, l'afficher ferait reculer le joueur d'une position.
      if (demande !== generation.current) return

      if (!response.ok) {
        setErrorMessage(data.error ?? 'Impossible de charger un puzzle.')
        setStatus('error')
        return
      }

      const loaded = data.puzzle as Puzzle
      setPlayerRating(data.playerRating ?? null)

      // Le premier coup est celui de l'adversaire : il crée la position du
      // puzzle. On le joue tout de suite, avec une pause pour qu'on le voie.
      const board = new Chess(loaded.fen, { skipValidation: true })
      const opening = loaded.moves[0]
      if (opening) {
        try {
          const move = board.move({
            from: opening.slice(0, 2) as Square,
            to: opening.slice(2, 4) as Square,
            promotion: (opening[4] as PieceSymbol) ?? undefined,
          })
          setLastMove({ from: move.from, to: move.to })
        } catch {
          /*
            Le coup d'ouverture n'entre pas dans la position.

            On partait alors de la position brute — et c'est le pire des choix :
            le trait revient à l'adversaire, donc `orientation` désigne sa
            couleur, donc l'échiquier n'accepte que ses pièces à lui. Le joueur
            se retrouvait devant un plateau qui ne répond à rien, sans erreur
            comptée, sans échec, sans bouton : rien à faire que recharger.

            Un puzzle dont la position et la solution ne se recoupent pas n'est
            pas jouable. On le dit, et on en propose un autre.
          */
          setPuzzleIllisible(true)
          setErrorMessage(
            'La position de ce puzzle ne correspond pas à sa solution — il est inutilisable. Le suivant sera bon.',
          )
          setStatus('error')
          return
        }
      }

      setPuzzle(loaded)
      setFen(board.fen())
      setOrientation(board.turn())
      setMoveIndex(1)
      setStatus('playing')
      startedAt.current = Date.now()

      if (voiceEnabled) {
        speak(
          board.turn() === 'w'
            ? 'Les Blancs jouent. Trouve le meilleur coup.'
            : 'Les Noirs jouent. Trouve le meilleur coup.',
        )
      }
    } catch {
      setErrorMessage('Le service de puzzles est injoignable.')
      setStatus('error')
    }
  }, [theme, voiceEnabled, modeDefi])

  useEffect(() => {
    // On attend de savoir si l'on vient du défi du jour : charger d'abord un
    // puzzle ordinaire ferait clignoter une position pour rien.
    if (modeDefi === null) return
    void load()
  }, [load, modeDefi])

  // ── Enregistrement du résultat ──────────────────────────────────────────
  const report = useCallback(
    async (solved: boolean) => {
      if (!puzzle) return

      // La journée se met à jour avant l'appel réseau : elle vit dans le
      // navigateur et ne dépend ni du compte ni de la connexion.
      if (solved) {
        marquer('puzzles')
        if (modeDefi) marquer('defi')
      }

      /*
        Un puzzle de carrière fait avancer le chapitre.
        Avant l'appel au serveur des puzzles et sans l'attendre : les deux sont
        indépendants, et faire dépendre la progression de carrière du classement
        de puzzles reviendrait à la perdre chaque fois que ce dernier hoquette.
      */
      if (solved && chapitreCarriere !== null) {
        void signaler({ type: 'puzzle' }).then((gains) => {
          const chapitre = chapitreCarriereNumero(chapitreCarriere)
          if (!chapitre) return
          const apres = progressionActuelle()
          // On ne ramène à la carte qu'une fois le compte atteint : enchaîner
          // les puzzles *est* l'exercice, et interrompre après chaque réussite
          // en ferait une formalité administrative.
          const compteAtteint =
            gains?.chapitreTermine === true ||
            (apres != null &&
              apres.chapter === chapitre.numero &&
              apres.puzzlesDone >= chapitre.puzzles)
          if (compteAtteint) {
            deposerGains(gains, chapitre.titre)
            router.push('/carriere')
          }
        })
      }

      try {
        const response = await fetch('/api/puzzles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            solved,
            correctMoves: Math.floor((moveIndex - 1) / 2),
            timeMs: Date.now() - startedAt.current,
          }),
        })
        const data = await response.json()
        if (typeof data.rating === 'number') {
          setPlayerRating(data.rating)
          setRatingDelta(data.delta ?? null)
        }
      } catch {
        // Sans compte ou hors ligne : le puzzle reste jouable, rien n'est perdu.
      }
    },
    [puzzle, moveIndex, marquer, modeDefi, chapitreCarriere, router],
  )

  // ── Coup du joueur ──────────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!puzzle || status !== 'playing') return

      if (repliqueEnCours) return

      const expected = puzzle.moves[moveIndex]
      // Plus rien à jouer alors que le puzzle se croit en cours : la séquence
      // est épuisée. On le déclare résolu plutôt que de laisser un échiquier
      // qui ne répond plus, sans bouton pour en sortir — c'est la seule façon
      // dont cet écran pouvait rester bloqué.
      if (!expected) {
        setStatus('solved')
        return
      }

      const played = `${from}${to}${promotion ?? ''}`
      const expectedFrom = expected.slice(0, 2)
      const expectedTo = expected.slice(2, 4)

      const board = new Chess(fen, { skipValidation: true })

      // Tolérance : si le coup joué mate, on l'accepte même s'il diffère de la
      // solution. Il existe souvent plusieurs mats, et refuser le sien serait
      // incompréhensible.
      let matesAnyway = false
      try {
        const probe = new Chess(fen, { skipValidation: true })
        probe.move({ from, to, promotion: promotion ?? 'q' })
        matesAnyway = probe.isCheckmate()
      } catch {
        return
      }

      const isCorrect =
        (from === expectedFrom && to === expectedTo) || matesAnyway

      if (!isCorrect) {
        setWrongAttempts((count) => count + 1)
        playSound('error')
        if (wrongAttempts >= 1) {
          setStatus('failed')
          void report(false)
          setStreak(0)
        }
        return
      }

      // Coup juste : on l'applique.
      const move = board.move({ from, to, promotion: promotion ?? 'q' })
      setLastMove({ from: move.from, to: move.to })
      playMoveSound({
        isCapture: move.isCapture(),
        isCheck: board.inCheck(),
        isCheckmate: board.isCheckmate(),
        isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
        isPromotion: !!move.promotion,
      })

      const nextIndex = moveIndex + 1

      // Puzzle terminé ?
      if (nextIndex >= puzzle.moves.length || board.isCheckmate()) {
        setFen(board.fen())
        setMoveIndex(nextIndex)
        setStatus('solved')
        setStreak((value) => value + 1)
        playSound('victory')
        void report(wrongAttempts === 0 && !revealed)
        return
      }

      // Réponse de l'adversaire, après une courte pause pour qu'on la voie.
      const reply = puzzle.moves[nextIndex]!
      setFen(board.fen())
      setMoveIndex(nextIndex)
      setRepliqueEnCours(true)

      const position = generation.current
      setTimeout(() => {
        // On a changé de puzzle pendant la pause : ce coup-là n'a plus de
        // plateau où se poser.
        if (position !== generation.current) return
        setRepliqueEnCours(false)
        const after = new Chess(board.fen(), { skipValidation: true })
        try {
          const replyMove = after.move({
            from: reply.slice(0, 2) as Square,
            to: reply.slice(2, 4) as Square,
            promotion: (reply[4] as PieceSymbol) ?? undefined,
          })
          setLastMove({ from: replyMove.from, to: replyMove.to })
          playMoveSound({
            isCapture: replyMove.isCapture(),
            isCheck: after.inCheck(),
            isCheckmate: after.isCheckmate(),
            isCastle: replyMove.isKingsideCastle() || replyMove.isQueensideCastle(),
            isPromotion: !!replyMove.promotion,
          })
          setFen(after.fen())
          setMoveIndex(nextIndex + 1)
        } catch {
          setStatus('solved')
        }
      }, 420)
    },
    [puzzle, status, moveIndex, fen, wrongAttempts, revealed, report, repliqueEnCours],
  )

  /**
   * Refaire *ce* puzzle, depuis le début.
   *
   * Deux essais manqués et l'écran se fermait : l'échiquier cesse d'accepter
   * les pièces, le panneau conseille de « rejouer la position mentalement », et
   * les deux boutons proposés — « Puzzle suivant » et « Autre » — font la même
   * chose, passer à autre chose. On restait donc devant une position figée
   * qu'on n'avait pas comprise, sans aucun moyen d'y revenir : c'est le
   * sentiment de blocage.
   *
   * Rien à recharger, tout est déjà là : on rejoue le coup d'ouverture de
   * l'adversaire et l'on remet les compteurs à zéro. Le résultat a déjà été
   * envoyé au classement — un puzzle raté reste raté, le refaire s'adresse à
   * celui qui apprend, pas à son score.
   */
  const recommencer = useCallback(() => {
    if (!puzzle) return

    const board = new Chess(puzzle.fen, { skipValidation: true })
    const opening = puzzle.moves[0]
    if (opening) {
      try {
        const move = board.move({
          from: opening.slice(0, 2) as Square,
          to: opening.slice(2, 4) as Square,
          promotion: (opening[4] as PieceSymbol) ?? undefined,
        })
        setLastMove({ from: move.from, to: move.to })
      } catch {
        // La position s'est chargée une première fois, ce coup passait alors :
        // s'il ne passe plus, mieux vaut un autre puzzle qu'un plateau muet.
        void load()
        return
      }
    }

    // La réplique différée du puzzle précédent ne doit pas se poser ici.
    generation.current += 1
    setRepliqueEnCours(false)
    setFen(board.fen())
    setOrientation(board.turn())
    setMoveIndex(1)
    setWrongAttempts(0)
    setRevealed(false)
    setStatus('playing')
    startedAt.current = Date.now()
  }, [puzzle, load])

  const reveal = useCallback(() => {
    if (!puzzle) return
    setRevealed(true)
    const expected = puzzle.moves[moveIndex]
    if (!expected) return
    const board = new Chess(fen, { skipValidation: true })
    try {
      const move = board.move({
        from: expected.slice(0, 2) as Square,
        to: expected.slice(2, 4) as Square,
        promotion: (expected[4] as PieceSymbol) ?? undefined,
      })
      speak(`La solution est ${sanToSpeechSafe(move.san, locale)}`)
    } catch {
      // Position inattendue : on ne montre rien plutôt que d'afficher un coup faux.
    }
  }, [puzzle, moveIndex, fen, locale])

  const legalMoves = useLegalMoves(fen, status === 'playing')

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <EmptyState
            icon={<Target size={30} />}
            title={puzzleIllisible ? 'Ce puzzle est inutilisable' : 'Aucun puzzle disponible'}
            description={
              errorMessage ??
              'La base de puzzles est vide. Lance l’import depuis le serveur pour récupérer les six millions de positions de Lichess.'
            }
            action={
              <Button variant="secondary" onClick={() => void load()}>
                {puzzleIllisible ? 'Puzzle suivant' : 'Réessayer'}
              </Button>
            }
          />
          {!puzzleIllisible && (
            <div className="border-t border-line/60 px-5 py-4">
              <p className="text-xs text-faint">Commande d’import :</p>
              <code className="mt-1 block rounded bg-surface px-2 py-1.5 font-mono text-[12px]">
                node scripts/import-puzzles.mjs
              </code>
            </div>
          )}
        </Card>
      </div>
    )
  }

  const revealedSan = revealed && puzzle ? sanOf(fen, puzzle.moves[moveIndex]) : null
  /** Le coup qu'il fallait trouver, une fois le puzzle manqué. */
  const solutionRatee = status === 'failed' && puzzle ? sanOf(fen, puzzle.moves[moveIndex]) : null

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-5 lg:py-8">
      {/* ── Filtres et score ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-bold tracking-tight">Puzzles</h1>
        {/* L'autre façon de travailler les mêmes puzzles : vite, et à la
            chaîne. Elle entraîne la reconnaissance là où celle-ci entraîne la
            recherche. */}
        <Link
          href="/puzzles/rush"
          className="flex h-7 items-center gap-1.5 rounded-full bg-accent/15 px-2.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/25"
        >
          <Timer size={12} aria-hidden />
          Manche chronométrée
        </Link>
        {playerRating !== null && (
          <Chip tone="accent">
            <Target size={11} aria-hidden />
            {playerRating}
            {ratingDelta !== null && (
              <span className={ratingDelta >= 0 ? 'text-[var(--q-best)]' : 'text-[var(--q-blunder)]'}>
                {ratingDelta >= 0 ? ' +' : ' '}
                {ratingDelta}
              </span>
            )}
          </Chip>
        )}
        {streak > 1 && (
          <Chip tone="warning">
            <Flame size={11} aria-hidden />
            série de {streak}
          </Chip>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {THEMES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTheme(entry.id)}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              theme === entry.id
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Échiquier ──────────────────────────────────────────── */}
        <div className="min-w-0">
          {status === 'loading' ? (
            <div className="grid aspect-square w-full place-items-center rounded-[var(--radius)] glass">
              <Spinner size={26} />
            </div>
          ) : (
            <ChessBoard
              fen={fen}
              orientation={orientation}
              playable={status === 'playing' && !repliqueEnCours ? orientation : null}
              legalMoves={legalMoves}
              onMove={handleMove}
              lastMove={lastMove}
              allowAnnotations
            />
          )}
        </div>

        {/* ── Panneau ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            {status === 'playing' && (
              <>
                <p className="text-sm font-semibold">
                  {orientation === 'w' ? 'Les Blancs jouent' : 'Les Noirs jouent'}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Trouve le meilleur coup. Il y en a un seul.
                </p>
                {wrongAttempts > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--q-blunder)]">
                    <X size={13} aria-hidden />
                    Ce n’est pas ça. Encore un essai.
                  </p>
                )}
                {revealedSan && (
                  <p className="mt-2 rounded-[var(--radius-sm)] bg-surface px-2.5 py-2 text-[13px]">
                    Solution :{' '}
                    <strong className="text-accent">
                      {format(revealedSan)}
                    </strong>
                  </p>
                )}
              </>
            )}

            {status === 'solved' && (
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_20%,transparent)]"
                  aria-hidden
                >
                  <Check size={14} className="text-[var(--q-best)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--q-best)]">Résolu !</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {wrongAttempts === 0 && !revealed
                      ? 'Trouvé du premier coup. C’est exactement ce qu’il fallait voir.'
                      : 'Bien joué. Refais-en un du même thème pour ancrer le motif.'}
                  </p>
                </div>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-blunder)_20%,transparent)]"
                  aria-hidden
                >
                  <X size={14} className="text-[var(--q-blunder)]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--q-blunder)]">Raté</p>
                  {/* La solution, écrite.
                      Le texte disait « regarde la solution » sans jamais la
                      montrer : elle n'apparaissait qu'à qui avait cliqué sur
                      « Solution » *avant* de se tromper deux fois, c'est-à-dire
                      à peu près personne. On la donne donc ici, où elle est la
                      seule chose qui reste à apprendre. */}
                  {solutionRatee && (
                    <p className="mt-1.5 rounded-[var(--radius-sm)] bg-surface px-2.5 py-2 text-[13px]">
                      Il fallait jouer{' '}
                      <strong className="text-accent">{format(solutionRatee)}</strong>
                    </p>
                  )}
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    Rejoue la position : c’est en refaisant le coup soi-même qu’on finit par
                    reconnaître le motif d’instinct.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Thèmes : révélés seulement après coup */}
          {(status === 'solved' || status === 'failed') && puzzle && (
            <Card className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Ce qu’il fallait voir
              </p>
              <div className="flex flex-wrap gap-1.5">
                {puzzle.themes.slice(0, 6).map((themeId) => {
                  const copy = motifCopy(themeId as MotifId, locale)
                  return (
                    <Chip key={themeId} tone="accent" title={copy?.definition}>
                      {copy?.name ?? themeId}
                    </Chip>
                  )
                })}
              </div>
              {puzzle.themes[0] && (
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
                  {motifCopy(puzzle.themes[0] as MotifId, locale)?.definition}
                </p>
              )}
              <p className="mt-3 text-[11px] text-faint">
                Niveau du puzzle : {puzzle.rating}
              </p>
            </Card>
          )}

          <div className="flex gap-2">
            {status === 'playing' && !revealed && (
              <Button variant="ghost" icon={<Eye size={14} />} onClick={reveal} fullWidth>
                Solution
              </Button>
            )}
            {/* Une sortie de secours, toujours disponible.
                Un puzzle qui ne réagit plus — position inattendue, coup que la
                séquence n'accepte pas — n'offrait aucun bouton : « Puzzle
                suivant » n'apparaît qu'une fois résolu ou raté, et l'on se
                retrouvait devant un échiquier muet, sans autre issue que de
                recharger la page. */}
            {status === 'playing' && (
              <Button
                variant="ghost"
                icon={<ArrowRight size={14} />}
                onClick={() => void load()}
                fullWidth={revealed}
              >
                Passer
              </Button>
            )}
            {/* « Recommencer » d'abord, et il ne recharge rien : c'est la même
                position, remise à son début. Il remplace un bouton « Autre »
                qui était le jumeau de « Puzzle suivant » — deux libellés
                différents pour la même action, aucun pour celle qui manquait. */}
            {status === 'failed' && (
              <Button
                variant="secondary"
                icon={<RotateCcw size={14} />}
                onClick={recommencer}
                fullWidth
              >
                Recommencer
              </Button>
            )}
            {(status === 'solved' || status === 'failed') && (
              <Button
                variant={status === 'failed' ? 'ghost' : 'primary'}
                icon={<ArrowRight size={15} />}
                onClick={() => void load()}
                fullWidth
              >
                Puzzle suivant
              </Button>
            )}
          </div>

          {playerRating === null && status !== 'loading' && (
            <p className="text-center text-[11px] leading-relaxed text-faint">
              Crée un compte pour suivre ton classement puzzles et éviter de revoir les mêmes
              positions.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aides
// ─────────────────────────────────────────────────────────────────────────────

function useLegalMoves(fen: string, active: boolean) {
  const [map, setMap] = useState<Map<Square, Square[]>>(new Map())

  useEffect(() => {
    if (!active || !fen) {
      setMap(new Map())
      return
    }
    const next = new Map<Square, Square[]>()
    try {
      const board = new Chess(fen, { skipValidation: true })
      for (const move of board.moves({ verbose: true })) {
        const list = next.get(move.from) ?? []
        if (!list.includes(move.to)) list.push(move.to)
        next.set(move.from, list)
      }
    } catch {
      // Position inattendue : on n'autorise aucun coup plutôt que de planter.
    }
    setMap(next)
  }, [fen, active])

  return map
}

/** Notation algébrique d'un coup UCI dans une position, ou `null`. */
function sanOf(fen: string, uci: string | undefined): string | null {
  if (!uci) return null
  try {
    const board = new Chess(fen, { skipValidation: true })
    return board.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as PieceSymbol) ?? undefined,
    }).san
  } catch {
    return null
  }
}

function sanToSpeechSafe(san: string, locale: 'fr' | 'en'): string {
  return locale === 'fr' ? sanToFrench(san) : san
}
