'use client'

/**
 * L'écran de la partie contre l'ordinateur : l'échiquier, les pendules, la
 * barre d'actions, la colonne du coach et la boîte de fin. Il reçoit de la
 * page tout ce que l'écran de réglages ou l'adresse ont décidé.
 */

import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Eye,
  Flag,
  LayoutGrid,
  Lightbulb,
  MoreHorizontal,
  Play,
  RefreshCw,
  Trophy,
  Undo2,
} from 'lucide-react'
import { GameNav } from '@/components/game/GameNav.tsx'
import { RubanCoups, rubanDepuisLesCoups } from '@/components/game/RubanCoups.tsx'
import { useSan } from '@/lib/notation.ts'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  BOT_PERSONALITIES,
  SEUIL_SUITE_BREVE,
  TIME_CONTROLS,
  applyMove,
  botLevel,
  createClock,
  explainRecommendedMove,
  formatScore,
  meriteUnMeilleurCoup,
  sanToSpeech,
  remainingAt,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'
import { ChessBoard, ViewToggle } from '@/components/board/ChessBoard.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import { EvalBar } from '@/components/game/EvalBar.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { ApprofondirCoup } from '@/components/ia/ApprofondirCoup.tsx'
import { Menu, MenuItem } from '@/components/ui/Menu.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { useMission } from '@/lib/daily/useMission.ts'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { useQualitesDesCoups } from '@/lib/game/useQualitesDesCoups.ts'
import { OpeningBanner } from '@/components/game/OpeningBanner.tsx'
import {
  CommentaryPanel,
  CommentaryToggle,
  commentaryArrows,
  commentaryLegend,
  useLiveCommentary,
  type Alternative,
} from '@/components/game/LiveCommentary.tsx'
import { PourquoiPanel } from '@/components/game/PourquoiPanel.tsx'
import { AideMemoire } from '@/components/game/AideMemoire.tsx'
import { RappelDeSeance } from '@/components/game/RappelDeSeance.tsx'
import { noterSeance, releverLeTheme, type Seance } from '@/lib/game/seance.ts'
import { LEGEND, legendFor, type LegendItem } from '@/components/board/ArrowLegend.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { BoiteConfirmation } from '@/components/ui/BoiteConfirmation.tsx'
import { Button, ButtonLink, Card, Chip } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { usePhysicalBoard } from '@/lib/board/usePhysicalBoard.ts'
import { PANNEAU_PLATEAU_ID, useBranchementPlateau } from '@/lib/board/useBranchementPlateau.tsx'
import { useEcranAllume } from '@/lib/ecranAllume.ts'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { oublierPartieEnCours, type PartieEnCours } from '@/lib/game/partieEnCours.ts'
import { requestHint, useBotPlayer } from '@/lib/game/useBotPlayer.ts'
import { usePrecoup } from '@/lib/game/usePrecoup.ts'
import { type BotPersonalityId, type Chapitre } from '@coupparfait/core'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound, playSound } from '@/lib/sound.ts'
import { localeDuContenu } from '@/lib/i18n/dictionary.ts'
import { avecElements } from '@/lib/i18n/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { usePreferencesDe } from '@/lib/store/preferences.ts'
import { speak } from '@/lib/speech.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import { useGrandEcran, useMediaQuery } from '@/lib/useMediaQuery.ts'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import { BarreDuPouce } from './BarreDuPouce.tsx'
import { LegendeDuVerdict, PhraseDuConseil } from './LegendeDuVerdict.tsx'
import { motifDeRefus } from './motifDeRefus.ts'
import { useAideUtilisee } from './useAideUtilisee.ts'
import { useAnnonceClassee } from './useAnnonceClassee.ts'
import { useChuteDuDrapeau } from './useChuteDuDrapeau.ts'
import { useArchivageDeFin, useSauvegardeEnCours } from './useEnregistrementDeLaPartie.ts'
import { recordBotGame } from './progression.ts'

export function GameScreen({
  duel,
  seance,
  seanceCommentee,
  tournoi,
  styleImpose,
  startFen,
  level,
  playerColor,
  timeControlId,
  human,
  classee,
  initialMoves,
  initialClock,
  onNewGame,
  onPartieLaissee,
  onRematch,
}: {
  /** Chapitre de carrière en cours, quand la partie en est le duel. */
  duel: Chapitre | null
  /** Séance pédagogique en cours : un palier, et un thème annoncé. */
  seance: Seance | null
  /**
   * La séance a demandé le mode commenté.
   *
   * Un drapeau de partie, et non la préférence : on allume le commentaire pour
   * *cette* séance sans toucher au réglage de quelqu'un qui joue d'habitude
   * sans. Il se coupe comme l'autre, par le même bouton.
   */
  seanceCommentee: boolean
  /** Vrai quand la partie est une ronde de tournoi contre l'ordinateur. */
  tournoi: boolean
  /** Style imposé par le tournoi, en dépit de celui du barème. */
  styleImpose: BotPersonalityId | null
  /** Position de départ composée dans l'éditeur. `null` pour une partie ordinaire. */
  startFen: string | null
  level: number
  playerColor: Color
  timeControlId: string
  /** Maia plutôt que Stockfish : décidé à la configuration. */
  human: boolean
  /** Partie classée : aides retirées, résultat porté au classement. */
  classee: boolean
  /** Coups déjà joués, quand on reprend une partie interrompue. */
  initialMoves?: string[]
  /** Temps restant à la reprise, en millisecondes. */
  initialClock?: { w: number; b: number } | null
  onNewGame: () => void
  /**
   * La partie qu'on quitte en cours de route, telle qu'on pourra la reprendre.
   * Voir `laisserLaPartie`.
   */
  onPartieLaissee: (partie: PartieEnCours) => void
  onRematch: () => void
}) {
  // Huit réglages nommés, et non tout le store : régler la profondeur du
  // moteur ou le volume re-rendait tout l'écran de jeu.
  const prefs = usePreferencesDe(
    'commentaryMode',
    'commentaryOpponent',
    'commentaryPauses',
    'locale',
    'memoAvantCoup',
    'set',
    'showEvalDuringGame',
    'whiteAlwaysBottom',
  )
  const t = useT()
  const { book } = useOpeningBook()
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'

  const timeControl = useMemo<TimeControl>(() => {
    const found = TIME_CONTROLS.find((tc) => tc.id === timeControlId)
    return found
      ? { initial: found.initial, increment: found.increment }
      : { initial: 600, increment: 5 }
  }, [timeControlId])
  const timed = timeControl.initial > 0

  // L'annonce de la partie classée, à l'ouverture de l'écran : voir
  // `useAnnonceClassee`.
  const annonceManquee = useAnnonceClassee({ classee, level, playerColor, timeControl })

  const [outcome, setOutcome] = useState<{
    status: GameStatus
    result: GameResult
  } | null>(null)
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null)
  // L'aide du moteur qui a servi, s'il y en a une : voir `useAideUtilisee`.
  const { aideUtilisee, aideRef, noterAide } = useAideUtilisee()
  /**
   * La partie se poursuit après sa fin — chute du drapeau, ou mat défait.
   *
   * Le résultat a été compté au moment où il est tombé — progression, quêtes,
   * historique. La suite se joue sans pendule et **ne compte nulle part** : ni
   * l'échelle des adversaires, ni les quêtes, ni l'archive, qui a déjà reçu la
   * partie une fois. On la joue pour savoir, pas pour marquer.
   *
   * Doublé d'un renvoi pour la même raison que `aideRef` : `onGameOver` lit les
   * valeurs du rendu où il a été créé.
   */
  const [prolongation, setProlongation] = useState(false)
  const prolongationRef = useRef(false)
  /** La pendule compte-t-elle ? Plus après une reprise. */
  const pendule = timed && !prolongation
  const penduleRef = useRef(pendule)
  penduleRef.current = pendule

  /**
   * Les parties où le moteur ne souffle rien : ni indice, ni reprise de coup.
   *
   * Trois situations, et une seule raison : **il y a un résultat qui compte
   * pour quelqu'un d'autre que soi.** Une partie classée déplace un
   * classement, une ronde de tournoi décide un tableau. Contre un ami, la
   * question ne se pose même pas — l'écran de partie en direct n'a jamais eu
   * ces boutons, et c'est délibéré : ce serait de l'assistance moteur en
   * direct contre quelqu'un qui n'en a pas.
   *
   * Restent les parties libres, la carrière et les séances : là, l'aide est le
   * but. Elle coûte simplement les points de la partie — voir `aideUtilisee`.
   *
   * Une seule valeur pour les trois endroits qui affichent ces boutons — la
   * barre du grand écran, celle du pouce, le menu : la règle vivait en trois
   * conditions recopiées, et il suffisait d'en oublier une.
   */
  const sansAide = classee || tournoi
  // Lue par les effets d'analyse, qui s'exécutent avant que `gameOver` ne soit
  // recalculé dans le corps du composant.
  const gameOverRef = useRef(false)

  // Quêtes du jour : marquées à la fin de la partie, sans jamais interrompre.
  const { marquer } = useQuotidien()
  /*
    La quête qui a envoyé jouer, quand on arrive par `?quete=`.

    Elle ne change rien à la partie : elle sert uniquement à la boîte de fin,
    qui propose alors la bonne suite — rentrer voir sa journée si la quête est
    remplie, enchaîner une partie s'il s'en faut encore d'une victoire.
  */
  const mission = useMission()

  // ── Mode commenté ───────────────────────────────────────────────────────
  // Déclaré ici, avant le pilote de l'adversaire artificiel : celui-ci consulte
  // l'état de pause pour savoir s'il doit patienter.
  /*
    Le mode commenté n'existe pas dans une partie classée.

    On lit la préférence, puis on l'annule : le réglage du joueur est conservé
    pour ses parties d'entraînement, mais il ne s'applique pas ici. Tout ce qui
    en découle — les flèches sur l'échiquier, la pastille de verdict, le
    panneau du coach, la voix — s'éteint du même coup, puisque tout part de
    cette valeur.
  */
  /*
    La séance l'allume sans l'écrire dans les réglages.

    `commenteParSeance` part à `true` quand la séance l'a demandé, et tombe dès
    qu'on coupe le commentaire — sans quoi la croix du panneau n'aurait aucun
    effet ici, puisqu'elle éteint la préférence et que le drapeau de séance
    reprendrait la main au rendu suivant.
  */
  const [commenteParSeance, setCommenteParSeance] = useState(seanceCommentee)
  const commentaryMode = (prefs.commentaryMode || commenteParSeance) && !classee
  const [hoveredAlternative, setHoveredAlternative] = useState<Alternative | null>(null)
  const [commentaryPaused, setCommentaryPaused] = useState(false)
  // Vrai tant que le coach prononce son commentaire. L'adversaire s'y range :
  // une explication ne vaut que si la position dont elle parle est encore à
  // l'écran quand la phrase se termine.
  const [coachSpeaking, setCoachSpeaking] = useState(false)
  // Le coup proposé reste fléché sur l'échiquier tant qu'on ne le masque pas.
  const [showBestMove, setShowBestMove] = useState(true)

  /**
   * Couper le mode commenté sans quitter la partie.
   *
   * Trois endroits l'appellent — le menu de la barre grand écran, celui de la
   * barre du pouce, et la croix du panneau lui-même — et les trois doivent
   * faire exactement la même chose : rendre la main tout de suite, sans qu'une
   * pause ou une phrase entamée ne retienne l'adversaire.
   */
  const couperLeCommentaire = useCallback(() => {
    prefs.set('commentaryMode', false)
    setCommenteParSeance(false)
    setCommentaryPaused(false)
    setCoachSpeaking(false)
  }, [prefs])
  const [clock, setClock] = useState<ClockState>(() => {
    const depart = createClock(timeControl, Date.now())
    // Reprise d'une partie chronométrée : on rend à chaque camp le temps qu'il
    // lui restait. Sans cela, reprendre offrirait une pendule neuve, ce qui
    // transformerait l'interruption en avantage.
    if (!initialClock) return depart
    return { ...depart, remaining: { w: initialClock.w, b: initialClock.b } }
  })

  const game = useChessGame({
    // Une position composée remplace le départ ordinaire. `useChessGame` sait
    // déjà faire — l'écran des finales s'en sert de la même façon.
    ...(startFen ? { startFen } : {}),
    initialMoves,
    onMove: (move) => {
      playMoveSound(move)
      setHintArrow(null)
      if (penduleRef.current) {
        setClock((current) => applyMove(current, move.color, Date.now(), current.running === null))
      }
    },
    onGameOver: (status, result) => {
      setClock((current) => stopClock(current, Date.now()))
      setOutcome({ status, result })
      const won = result === (playerColor === 'w' ? '1-0' : '0-1')
      playResultSound(result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
      // La fin d'une partie rouverte ne compte pas : le résultat est celui
      // d'avant la reprise, et il est déjà enregistré.
      if (prolongationRef.current) return
      // Une partie partie d'une position composée ne fait avancer aucune
      // échelle : rien n'empêche de s'y donner une dame de plus.
      if (!startFen) recordBotGame(level, won)
      /*
        Une partie menée jusqu'au bout compte, gagnée ou non : la quête
        récompense d'avoir joué, pas d'avoir eu de la chance.

        Sauf si le moteur a soufflé. Une seule règle, la même partout : une
        partie jouée avec une aide ne rapporte rien — ni classement, ni
        progression de carrière, ni quête, ni série. Un demi-crédit — la quête
        « joue une partie » oui, « gagne une partie » non — serait plus subtil
        et impossible à expliquer en une phrase.
      */
      if (aideRef.current === null) {
        marquer('partie')
        if (won) marquer('victoire')
      }
      // La partie est finie : il n'y a plus rien à reprendre.
      oublierPartieEnCours()
    },
  })

  const { state, play, undo, goTo } = game

  // Pendant que l'ordinateur réfléchit, personne ne touche l'écran : sur
  // téléphone il s'éteignait au beau milieu de la partie, pendule comprise.
  useEcranAllume(!state.isGameOver && outcome === null)

  // ── Pause d'étude du mode commenté ──────────────────────────────────────
  //
  // Sans elle, l'adversaire répond dans la seconde qui suit : le commentaire
  // s'affiche, les flèches apparaissent, et la position a déjà changé. On
  // suspend donc la partie après chaque coup du joueur, jusqu'à ce qu'il dise
  // qu'il a fini de regarder.
  //
  // C'est une valeur **calculée**, pas un état : elle se remet d'elle-même à
  // chaque nouveau coup, sans effet ni synchronisation à tenir.
  const [reviewedFen, setReviewedFen] = useState<string | null>(null)
  /** Côté du plateau, pour aligner les bandeaux dessus. */
  const [cotePlateau, setCotePlateau] = useState<number | null>(null)
  /** L'en-tête de la colonne des coups, où le plateau pose sa bascule de vue. */
  const [emplacementBascule, setEmplacementBascule] = useState<HTMLElement | null>(null)
  const grandEcran = useGrandEcran()
  /*
    Sous `sm`, le coach quitte la colonne latérale pour un panneau compact posé
    sous l'échiquier : voir `compact` dans `CommentaryPanel`. Le choix se fait
    ici, en JavaScript, et non par deux copies masquées en CSS : chaque panneau
    porte la voix, et deux panneaux montés parleraient deux fois.
  */
  const telephone = useMediaQuery('(max-width: 639px)')
  const lastPlayed = state.moves[state.moves.length - 1] ?? null
  // Le gestionnaire de touches est posé une fois pour toutes : il lit la
  // position courante ici plutôt que de se réabonner à chaque coup.
  const cursorRef = useRef(state.cursor)
  cursorRef.current = state.cursor
  const movesRef = useRef(state.moves.length)
  movesRef.current = state.moves.length
  const studyPause = commentaryMode && prefs.commentaryPauses
  const awaitingReview =
    studyPause &&
    state.isLive &&
    !state.isGameOver &&
    outcome === null &&
    lastPlayed?.color === playerColor &&
    reviewedFen !== state.currentFen
  const opening = useCurrentOpening(
    state.moves.map((m) => m.san),
    localeDuContenu(prefs.locale),
  )

  // ── Coach ───────────────────────────────────────────────────────────────
  //
  // Déclaré avant le pilote de l'adversaire, qui a besoin de savoir si le
  // commentaire est encore en train de se calculer.
  /**
   * Le coup à commenter.
   *
   * Le sien, par défaut. Les deux si l'on a demandé l'analyse des coups
   * adverses — auquel cas c'est simplement le dernier coup joué, quel qu'en
   * soit l'auteur.
   *
   * Les explications restent adressées au joueur dans les deux cas : c'est le
   * rôle de `lecteur`, passé plus bas. Sans lui, un coup de l'ordinateur se
   * serait commenté en tutoyant l'ordinateur.
   */
  const lastPlayerMove = useMemo(() => {
    if (prefs.commentaryOpponent) return state.moves[state.moves.length - 1] ?? null
    for (let i = state.moves.length - 1; i >= 0; i--) {
      const move = state.moves[i]!
      if (move.color === playerColor) return move
    }
    return null
  }, [state.moves, playerColor, prefs.commentaryOpponent])

  // Le mode commenté analyse la position **d'avant** le coup en MultiPV : c'est
  // là que se trouvent les options qu'on avait et qu'on n'a pas vues.
  const {
    commentary,
    loading: coachLoading,
    history: commentaryHistory,
  } = useLiveCommentary({
    move: lastPlayerMove,
    lecteur: playerColor,
    // Le niveau de l'adversaire choisi sert de repère pour savoir s'il faut
    // détailler les suites — voir `SEUIL_SUITE_BREVE`. C'est une approximation,
    // et la seule dont on dispose pendant la partie.
    //
    // `botLevel(level)` et non `bot` : celui-ci est déclaré plus bas, avec le
    // pilote de l'adversaire, et le coach doit être monté avant lui — c'est le
    // pilote qui a besoin de savoir si le coach parle encore, pas l'inverse.
    suiteDetaillee: botLevel(level).elo < SEUIL_SUITE_BREVE,
    /*
      Le coach ne travaille que si quelqu'un lit ce qu'il écrit.

      Il analysait deux positions — celle d'avant le coup en MultiPV, celle
      d'après — à chaque coup du joueur, quel que soit l'état des réglages. Or
      les deux réglages qui affichent son travail, le mode commenté et la barre
      d'évaluation, sont éteints par défaut : dans une partie ordinaire, ces
      deux recherches ne servaient à rien.

      Elles coûtaient pourtant le tour de l'adversaire. Le moteur est unique et
      ses recherches sont sérialisées : la demande de l'ordinateur attendait la
      fin des deux analyses avant même de commencer. Sur un téléphone, à
      profondeur 14, cela fait plusieurs secondes d'attente entre le coup du
      joueur et la réponse — pour un texte que personne ne verra.
    */
    enabled:
      (commentaryMode || (prefs.showEvalDuringGame && !classee)) &&
      state.isLive &&
      !gameOverRef.current,
    alternatives: commentaryMode ? 3 : 1,
    book,
  })

  /**
   * Le coach a-t-il encore quelque chose à dire sur la position affichée ?
   *
   * Deux temps, et il faut les deux. Retenir l'adversaire seulement pendant la
   * lecture ne servait à rien : le commentaire n'existe qu'une fois le coup
   * analysé, si bien que l'ordinateur répondait *avant* que la phrase ne
   * commence — mesuré à 0,9 s contre 1,6 s. On attend donc d'abord que le
   * commentaire soit calculé, ensuite qu'il soit prononcé.
   */
  const coachBusy = commentaryMode && (coachLoading || coachSpeaking)

  // ── Adversaire artificiel ───────────────────────────────────────────────
  const playRef = useRef(play)
  playRef.current = play

  const botPlayer = useBotPlayer({
    fen: state.currentFen,
    botColor,
    level,
    // Le chapitre choisit un style, pas seulement une force : c'est ce style
    // qui *est* l'exercice. Hors carrière, on laisse le barème décider.
    personality: duel?.adversaire ?? styleImpose ?? undefined,
    turn: state.turn,
    human,
    ply: state.moves.length,
    // En pause de lecture — ou tant que le coach a la parole — l'ordinateur
    // patiente : on veut pouvoir lire *et* entendre le commentaire avant que la
    // position ne change.
    active:
      !state.isGameOver &&
      outcome === null &&
      !commentaryPaused &&
      !coachBusy &&
      !awaitingReview &&
      // Remonter dans la liste des coups met la partie en attente. Sans cela,
      // l'ordinateur jouait pendant qu'on regardait le passé : on revenait au
      // présent devant une position changée, avec l'impression d'avoir perdu
      // ses coups.
      state.isLive,
    onMove: (from, to, promotion) => playRef.current(from, to, promotion),
  })

  /*
    ── La pendule s'arrête pendant l'explication ────────────────────────────

    L'adversaire patientait déjà pendant qu'on lisait le commentaire — mais sa
    pendule, elle, tournait : on lisait l'explication en regardant fondre des
    secondes qui n'étaient à personne. Même condition que ci-dessus, donc :
    tant que la partie est retenue pour le coach, le temps est gelé.

    On arrête la pendule avec `stopClock` en retenant le camp dont elle
    tournait, et on la relance du même côté au moment où la lecture se
    termine. Si l'on joue pendant la suspension — le commentaire d'un coup
    adverse s'affiche sur son propre temps de jeu —, `applyMove` voit une
    pendule arrêtée et ne décompte rien : c'est le comportement voulu, et elle
    repart d'elle-même du côté de l'adversaire. Il n'y a alors rien à relancer.
  */
  const penduleSuspendue =
    pendule &&
    commentaryMode &&
    !state.isGameOver &&
    outcome === null &&
    (commentaryPaused || coachBusy || awaitingReview)
  const campSuspendu = useRef<Color | null>(null)
  useEffect(() => {
    if (penduleSuspendue) {
      if (clock.running === null) return
      campSuspendu.current = clock.running
      setClock((current) => stopClock(current, Date.now()))
      return
    }
    const camp = campSuspendu.current
    campSuspendu.current = null
    // Une partie finie pendant la suspension — abandon — ne se relance pas.
    if (!camp || state.isGameOver || outcome !== null) return
    setClock((current) =>
      current.running === null ? { ...current, running: camp, updatedAt: Date.now() } : current,
    )
  }, [penduleSuspendue, clock.running, state.isGameOver, outcome])

  // La chute du drapeau : un minuteur armé sur l'échéance, réarmé au coup.
  // Voir `useChuteDuDrapeau`. Plus de drapeau après une reprise.
  useChuteDuDrapeau({
    clock,
    setClock,
    timed: pendule,
    isGameOver: state.isGameOver,
    outcome,
    setOutcome,
    playerColor,
    level,
    startFen,
    chess: game.chess,
    marquer,
    aideRef,
  })

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      // `outcome` couvre ce que le moteur de jeu ignore : l'abandon et la
      // chute du drapeau. Sans lui, on pouvait continuer à jouer après.
      if (state.turn !== playerColor || !state.isLive || outcome !== null) return
      play(from, to, promotion)
    },
    [play, state.turn, state.isLive, playerColor, outcome],
  )

  /*
    Le pré-coup vaut aussi contre l'ordinateur.

    Moins pour la pendule que pour le rythme : l'adversaire simule un temps de
    réflexion — de deux à plusieurs secondes selon son niveau — et devoir
    attendre la fin de cette pause avant de poser un coup qu'on a déjà décidé
    casse l'enchaînement. Dans une finale gagnée où l'on pousse un pion case
    après case, c'est la moitié du temps passé à regarder l'échiquier ne rien
    faire.
  */
  const {
    precoup,
    enregistrer: enregistrerPrecoup,
    annuler: annulerPrecoup,
  } = usePrecoup({
    fen: state.currentFen,
    couleur: playerColor,
    // `gameOver` n'est calculé que plus bas ; ses deux composantes, elles, sont
    // déjà là. On les relit plutôt que de déplacer une déclaration dont
    // dépendent une vingtaine de lignes.
    actif: state.isLive && !state.isGameOver && outcome === null,
    jouer: handleMove,
  })

  // Face à l'ordinateur, les LEDs prennent tout leur sens : elles montrent le
  // coup que la machine vient de jouer, à reproduire sur le plateau.
  const physicalBoard = usePhysicalBoard({
    chess: game.chess,
    fen: state.currentFen,
    isLive: state.isLive && !state.isGameOver && outcome === null && state.turn === playerColor,
    play: handleMove,
    lastMove: state.lastMove,
  })
  // Le branchement d'un échiquier électronique : un bouton de la bascule du
  // plateau, et le panneau seulement à la demande. Voir le crochet.
  const branchement = useBranchementPlateau(physicalBoard)

  const handleHint = useCallback(async () => {
    if (state.turn !== playerColor) return
    try {
      const hint = await requestHint(state.currentFen, 16)
      if (hint) {
        // Le moteur a parlé : cette partie ne comptera plus. Marqué ici et non
        // au clic, pour qu'un indice qui n'a rien rendu — moteur injoignable —
        // ne coûte pas une partie.
        noterAide('indice')
        // Orange, et non bleu : le bleu est déjà celui du coup conseillé par le
        // mode commenté. Deux sens pour une même couleur, c'est une couleur
        // qui n'en a plus aucun.
        setHintArrow({ from: hint.from, to: hint.to, color: 'orange', weight: 'bold' })
        playSound('notify')
      }
    } catch {
      toast.error(t('computer.hintFailed'))
    }
  }, [state.currentFen, state.turn, playerColor, noterAide, t])

  // La fonction seule, et non `botPlayer` entier : l'objet est recréé à chaque
  // rendu, la fonction est stable.
  const { oublier: oublierPositionDuBot } = botPlayer
  const handleUndo = useCallback(() => {
    // Une partie finie ne se rouvre pas : le bouton est masqué, mais un
    // raccourci ou un rendu en retard ne doit pas ressusciter un abandon.
    if (state.isGameOver || outcome !== null) return
    // On annule deux demi-coups : le sien et la réponse de l'ordinateur.
    const count = state.moves.length >= 2 ? 2 : 1
    // Reprendre un coup est une aide au même titre qu'un indice : on rejoue
    // une position en sachant ce qu'elle donne. La partie ne rapporte donc
    // plus rien, comme le serveur l'a toujours décrit.
    noterAide('annulation')
    undo(count)
    // La position revient à une que l'ordinateur croit déjà traitée : on la
    // lui fait oublier, sinon il ne rejouait plus jamais après une annulation
    // et l'écran restait sur « réfléchit… ».
    oublierPositionDuBot()
    playSound('confirm')
  }, [undo, state.moves.length, state.isGameOver, outcome, oublierPositionDuBot, noterAide])

  /**
   * La question posée avant d'abandonner ou de quitter, dans une boîte du jeu.
   *
   * C'était `window.confirm` : une boîte du navigateur, en haut de l'écran,
   * titrée « coupparfait.cparfait.ovh indique », qu'on prenait pour un message
   * étranger à la partie. Voir `BoiteConfirmation`.
   */
  const [question, setQuestion] = useState<'abandonner' | 'quitter' | null>(null)

  // Une confirmation, comme en ligne et en correspondance. Le bouton vit dans
  // la barre du pouce, à un doigt d'« Indice » : un seul appui perdait la
  // partie, et en partie classée la défaite s'enregistrait.
  const handleResign = useCallback(() => setQuestion('abandonner'), [])

  const abandonner = useCallback(() => {
    setQuestion(null)
    setClock((current) => stopClock(current, Date.now()))
    setOutcome({ status: 'resign', result: playerColor === 'w' ? '0-1' : '1-0' })
    // Un abandon compte comme une tentative, jamais comme une victoire — sauf
    // depuis une position composée, qui ne touche à aucune échelle. La fin de
    // partie et la chute du drapeau s'en gardaient déjà ; cette voie-ci, non,
    // et l'on gonflait son nombre de tentatives en abandonnant des positions
    // qu'on venait de fabriquer.
    // Et rien du tout dans une partie rouverte : le résultat est déjà compté.
    if (!startFen && !prolongation) recordBotGame(level, false)
    playResultSound('loss')
    // Une partie abandonnée n'est plus à reprendre : sans cet oubli, l'écran
    // de départ la proposait comme si on l'avait quittée en cours.
    oublierPartieEnCours()
  }, [playerColor, level, startFen, prolongation])

  /**
   * Rouvrir une partie finie, sans pendule et hors statistiques.
   *
   * Le résultat est déjà écrit partout où il devait l'être ; on rouvre
   * seulement l'échiquier. L'archive ne repartira pas — `useArchivageDeFin`
   * n'archive qu'une fois —, et `prolongation` coupe le reste : échelle,
   * quêtes, reprise.
   *
   * `annuler` : combien de demi-coups défaire avant de rendre la main. Zéro
   * après la chute du drapeau — la position est encore à jouer. Deux après un
   * mat : le coup qui mate et celui qui l'a permis, pour chercher ce qu'on
   * aurait pu jouer à sa place. « Annuler » remonte ensuite plus loin.
   */
  const reprendreHorsStats = useCallback(
    (annuler: number) => {
      prolongationRef.current = true
      setProlongation(true)
      setClock((current) => stopClock(current, Date.now()))
      if (annuler > 0) undo(annuler)
      setOutcome(null)
      // Le drapeau a pu tomber pendant que l'ordinateur réfléchissait, et le
      // mat défait ramène une position qu'il croit déjà traitée : sans cet
      // oubli, il ne jouerait plus.
      oublierPositionDuBot()
    },
    [undo, oublierPositionDuBot],
  )

  /** Ce que la boîte de fin propose pour rouvrir la partie, s'il y a lieu. */
  const repriseProposee = (() => {
    const statut = outcome?.status ?? state.status
    if (statut === 'timeout' && !state.isGameOver) {
      return {
        libelle: t('game.over.continueUntimed'),
        precision: t('game.over.continueUntimedHint'),
        icone: <Play size={16} />,
        action: () => reprendreHorsStats(0),
      }
    }
    // Le mat qu'on a subi, pas celui qu'on a donné : c'est la défaite qu'on
    // veut comprendre. Deux demi-coups au moins, sans quoi il n'y a pas de coup
    // à soi à défaire.
    const resultat = outcome?.result ?? state.result
    const perdu = resultat === (playerColor === 'w' ? '0-1' : '1-0')
    if (statut === 'checkmate' && perdu && state.moves.length >= 2) {
      return {
        libelle: t('game.over.rewindMate'),
        precision: t('game.over.rewindMateHint'),
        icone: <Undo2 size={16} />,
        action: () => reprendreHorsStats(2),
      }
    }
    return undefined
  })()

  /**
   * Sens de lecture de l'échiquier.
   *
   * Par défaut on voit de son propre côté, comme sur un vrai échiquier. Le
   * réglage « Blancs toujours en bas » fige l'orientation : les diagrammes des
   * livres, des leçons et des puzzles sont presque tous vus des Blancs, et
   * alterner brouille les repères qu'on est en train de construire.
   */
  const orientation: Color = prefs.whiteAlwaysBottom ? 'w' : playerColor

  const bot = botPlayer.bot
  const personality = BOT_PERSONALITIES[bot.personality]
  const gameOver = state.isGameOver || outcome !== null

  // La partie en cours, sauvegardée après chaque coup : voir
  // `useSauvegardeEnCours`.
  useSauvegardeEnCours({
    // Une partie rouverte n'est pas à reprendre : elle reviendrait comme une
    // partie neuve, et sa fin compterait.
    gameOver: gameOver || prolongation,
    moves: state.moves,
    level,
    playerColor,
    timeControlId,
    human,
    timed,
    clock,
  })
  gameOverRef.current = gameOver

  /**
   * Quitter la partie pour l'écran de réglages — après confirmation si elle
   * est en cours.
   *
   * Une partie commencée ne se quitte pas sur un clic égaré, pas plus qu'on
   * n'abandonne sans confirmer — les deux sont voisins dans le même menu.
   * Finie, ou pas encore entamée, il n'y a rien à perdre et l'on part
   * directement.
   */
  const enCours = !gameOver && state.moves.length > 0
  /** `false` quand une question est posée : l'appelant n'a pas encore quitté. */
  const quitterLaPartie = useCallback(() => {
    if (enCours) {
      setQuestion('quitter')
      return false
    }
    onNewGame()
    return true
  }, [enCours, onNewGame])
  /**
   * Quitter pour de bon, en laissant la partie à reprendre.
   *
   * L'écran de réglages ne relisait la partie sauvegardée qu'à son premier
   * affichage : on quittait une partie en cours, et le bandeau « Reprendre »
   * n'apparaissait qu'après un rechargement. On la lui passe donc directement,
   * dans l'état exact où on la laisse — sans attendre le serveur, dont la
   * dernière écriture peut être encore en route, et sans compte : la reprise
   * vaut alors pour la visite en cours.
   *
   * Deux parties ne se laissent pas. Une partie rouverte après sa fin : son
   * résultat est compté, elle n'est jamais sauvegardée. Une position composée :
   * la reprise rejoue les coups depuis le départ ordinaire, et ceux-ci n'y
   * seraient pas légaux.
   */
  const laisserLaPartie = () => {
    setQuestion(null)
    if (!prolongation && !startFen) {
      onPartieLaissee({
        moves: state.moves.map((coup) => coup.san),
        level,
        playerColor,
        timeControlId,
        human,
        clock: timed ? remainingAt(clock, Date.now()) : null,
        enregistreLe: new Date().toISOString(),
      })
    }
    onNewGame()
  }
  const quitterRef = useRef(quitterLaPartie)
  quitterRef.current = quitterLaPartie

  /*
    « Jouer → Contre l'ordinateur » depuis une partie ne faisait rien.

    Le lien mène à la page où l'on est déjà : Next ne la recharge pas, et
    l'écran de partie n'est qu'un état de la page, que l'adresse ignore. Le clic
    se perdait, en partie comme après la boîte de fin. On l'intercepte donc ici,
    une fois pour tous les endroits qui portent ce lien — menu de l'en-tête,
    barre du téléphone, liens de la rubrique.

    La page nue seulement : une adresse avec paramètres (`?seance=`, `?perso=`)
    demande autre chose qu'un retour aux réglages.
  */
  useEffect(() => {
    function surClic(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const lien = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(lien instanceof HTMLAnchorElement) || lien.target === '_blank') return
      const cible = new URL(lien.href)
      if (cible.origin !== window.location.origin) return
      if (cible.pathname !== window.location.pathname || cible.search !== '') return
      // Partie en cours : le lien ne navigue pas, la boîte pose la question,
      // et c'est sa réponse qui ramène aux réglages — ou nulle part.
      if (!quitterRef.current()) event.preventDefault()
    }
    // En capture : avant le gestionnaire du lien, qui navigue.
    document.addEventListener('click', surClic, true)
    return () => document.removeEventListener('click', surClic, true)
  }, [])

  // La partie finie, archivée une fois : voir `useArchivageDeFin`.
  const { variationClassement, refusClassement } = useArchivageDeFin({
    gameOver,
    outcome,
    state,
    duel,
    tournoi,
    classee,
    aideUtilisee,
    aideRef,
    playerColor,
    personality,
    level,
    timeControl,
    opening,
  })

  // ── Revue des coups joués ───────────────────────────────────────────────
  //
  // Naviguer dans la liste des coups replace la position sur l'échiquier, mais
  // une position seule ne dit pas *quel* coup y a mené : on flèche donc le coup
  // consulté, et le coup que le moteur préférait si on l'a déjà calculé.
  /*
    La qualité de chaque coup, pour colorer la notation.

    Le mode commenté ne juge que le coup courant, et son verdict s'efface au
    coup suivant : la liste, elle, se relit d'un bout à l'autre, et c'est là
    qu'on cherche *où* la partie a basculé. Le crochet garde donc tous les
    verdicts, y compris ceux des coups du bot.
  */
  const { parRang: qualites, bilan } = useQualitesDesCoups({ moves: state.moves, book })

  /*
    Le relevé du thème de la séance, une fois la partie finie.

    Calculé à la fin et pas à chaque coup : le relevé rejoue toute la partie
    pour interroger chaque position, et le refaire quarante fois pour n'afficher
    le résultat qu'une seule, à l'arrivée, serait du travail jeté. Aucun appel
    au moteur là-dedans — `detectPositionMotifs` lit un plateau.

    La séance est notée au même moment, dans le navigateur : c'est ce qui permet
    à l'écran de préparation d'afficher « 3 séances » sur un thème déjà
    travaillé.
  */
  const releveDeSeance = useMemo(() => {
    if (!seance || !gameOver || state.moves.length === 0) return null
    return releverLeTheme(
      state.moves.map((coup) => coup.san),
      playerColor,
      seance.theme.motifs,
      startFen ?? undefined,
    )
  }, [seance, gameOver, state.moves, playerColor, startFen])

  const seanceNotee = useRef(false)
  useEffect(() => {
    if (!seance || !gameOver || seanceNotee.current) return
    seanceNotee.current = true
    noterSeance(seance.theme.id)
  }, [seance, gameOver])

  // Les coups tels que le ruban les attend : le numéro se déduit du rang.
  const rubanCoups = useMemo(
    () => rubanDepuisLesCoups(state.moves, qualites),
    [state.moves, qualites],
  )

  const reviewing = !state.isLive
  const reviewedMove = reviewing ? (state.moves[state.cursor] ?? null) : null
  const formatMove = useSan()

  // Un commentaire reste lisible longtemps après le coup qu'il décrit, mais ses
  // flèches, elles, deviennent fausses dès le coup suivant : elles pointeraient
  // des cases qui ont changé. On les efface donc quand la partie a avancé, sans
  // effacer le texte.
  // Quand les flèches disparaissent-elles ?
  //
  //  - avec la pause d'étude : au clic sur « Continuer ». Ce bouton veut dire
  //    « j'ai fini de regarder » — c'est le moment exact où elles n'ont plus
  //    lieu d'être, et les garder pendant la réponse de l'adversaire les
  //    laisserait pointer des cases qui ont changé ;
  //  - sans la pause : au coup suivant du joueur, faute de meilleur signal.
  const arrowsMatchPosition =
    commentary != null &&
    commentary.fenAfter === lastPlayerMove?.after &&
    (studyPause ? awaitingReview : true)
  const reviewedCommentary = reviewedMove ? (commentaryHistory[reviewedMove.after] ?? null) : null

  // Le commentaire porte-t-il encore sur ce qu'on a sous les yeux ? Sans la
  // pause d'étude, l'adversaire répond avant qu'on ait fini de lire, et le
  // texte se retrouve à décrire la position précédente. Plutôt que de l'effacer
  // — il reste ce qu'on avait demandé —, on dit de quel coup il parle.
  const commentaryStale =
    !reviewedMove && commentary != null && commentary.fenAfter !== state.currentFen

  const reviewCommented = useCallback(() => {
    if (!commentary) return
    const index = state.moves.findIndex((move) => move.after === commentary.fenAfter)
    if (index >= 0) goTo(index)
  }, [commentary, state.moves, goTo])

  const arrows = useMemo<Arrow[]>(() => {
    if (reviewedMove) {
      const bad =
        reviewedCommentary?.quality === 'blunder' ||
        reviewedCommentary?.quality === 'mistake' ||
        reviewedCommentary?.quality === 'miss'

      const list: Arrow[] = [
        {
          from: reviewedMove.from,
          to: reviewedMove.to,
          color: bad ? 'red' : 'green',
          weight: 'bold',
        },
      ]

      const best = reviewedCommentary?.alternatives.find(
        (alternative) => alternative.rank === 1 && !alternative.played,
      )
      if (best && showBestMove) {
        list.push({
          from: best.uci.slice(0, 2) as Square,
          to: best.uci.slice(2, 4) as Square,
          color: 'blue',
          weight: 'normal',
        })
      }
      return list
    }

    if (hintArrow) return [hintArrow]

    // Survoler une alternative dans la liste la montre même si la partie a
    // avancé : c'est un geste délibéré, pas un reliquat à l'écran.
    if (!commentaryMode) return []
    if (!arrowsMatchPosition && !hoveredAlternative) return []
    return commentaryArrows(commentary, hoveredAlternative, showBestMove)
  }, [
    reviewedMove,
    reviewedCommentary,
    hintArrow,
    commentaryMode,
    commentary,
    hoveredAlternative,
    showBestMove,
    arrowsMatchPosition,
  ])

  /**
   * Clic sur une flèche : « pourquoi ce coup ? ».
   *
   * Une flèche bleue affirme quelque chose sans le justifier. Le moteur a
   * pourtant la réponse — son évaluation, le motif tactique, la suite prévue :
   * il suffisait de la rendre atteignable au clic.
   */
  const handleArrowClick = useCallback(
    (arrow: Arrow) => {
      const source = reviewedMove ? reviewedCommentary : commentary
      const uci = `${arrow.from}${arrow.to}`
      const alternative = source?.alternatives.find((candidate) => candidate.uci.startsWith(uci))
      if (!alternative) return

      const san = formatMove(alternative.san)
      const role = alternative.played
        ? t('computer.yourMove')
        : t('computer.advisedMove', { rang: alternative.rank })

      const parts = [
        alternative.reason ?? t('computer.engineTop'),
        t('computer.evaluation', { score: formatScore(alternative.score, playerColor) }),
      ]
      // La suite s'écrivait telle que le moteur la rend, c'est-à-dire en anglais :
      // « Suite prévue : Nf3 Nc6 Bb5 » sous un titre qui disait « Cf3 ».
      if (alternative.line.length > 1) {
        parts.push(
          t('computer.expectedLine', {
            coups: alternative.line.slice(0, 4).map(formatMove).join(' '),
          }),
        )
      }

      toast.info(`${san} — ${role}`, parts.join(' '))
      // La voix épelle le coup : un glyphe de figurine ne se prononce pas.
      speak(`${sanToSpeech(alternative.san, localeDuContenu(prefs.locale))}. ${parts[0]}`)
    },
    [reviewedMove, reviewedCommentary, commentary, prefs.locale, playerColor, formatMove, t],
  )

  const arrowLegend = useMemo<LegendItem[]>(() => {
    if (reviewedMove) {
      return legendFor(arrows, [
        {
          ...LEGEND.played,
          labelKey: 'legend.playedNamed' as const,
          vars: { coup: reviewedMove.san },
        },
        {
          ...LEGEND.playedBad,
          labelKey: 'legend.mistakeNamed' as const,
          vars: { coup: reviewedMove.san },
        },
        LEGEND.best,
      ])
    }
    if (hintArrow) return [LEGEND.hint]
    if (!commentaryMode || arrows.length === 0) return []
    return commentaryLegend(commentary, hoveredAlternative, showBestMove)
  }, [
    reviewedMove,
    arrows,
    hintArrow,
    commentaryMode,
    commentary,
    hoveredAlternative,
    showBestMove,
  ])

  /**
   * Le verdict du dernier coup, calculé **une fois**.
   *
   * Il alimente la pastille sur l'échiquier et la légende écrite juste en
   * dessous. Les deux dérivaient de la même expression recopiée, ce qui est la
   * meilleure façon de les voir un jour se contredire : un glyphe pour une
   * qualité, un mot pour une autre.
   *
   * Périmé, il ne s'affiche pas : il jugerait le coup précédent sur la case du
   * dernier — à la fois visible et faux.
   *
   * **Mémoïsé, et ce n'est pas du zèle.** C'était un littéral d'objet, donc un
   * objet neuf à chaque rendu, passé en prop à `ChessBoard`. Une prop neuve à
   * chaque rendu annule un `memo` : `Board2D` avait beau être mémoïsé, il se
   * rendait en entier chaque fois que quoi que ce soit bougeait sur cette
   * page. Le `useMemo` de `conseilDuCoup`, qui en dépend, ne servait à rien
   * non plus pour la même raison.
   */
  const verdictDuCoup = useMemo(
    () =>
      commentaryMode && commentary && !commentaryStale && state.lastMove
        ? { square: state.lastMove.to, quality: commentary.quality }
        : null,
    // Les deux champs lus, et non les deux objets : `commentary` et
    // `lastMove` changent d'identité plus souvent que leur contenu, et
    // dépendre d'eux redonnerait un objet neuf sans qu'il ait changé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commentaryMode, commentary?.quality, commentaryStale, state.lastMove?.to],
  )

  /**
   * Le coup qu'il fallait jouer, écrit en toutes lettres.
   *
   * La flèche bleue portait cette information toute seule, et elle la portait
   * mal : elle est calculée sur la position **d'avant** le coup joué, et
   * dessinée sur celle d'après. On la lit donc comme « joue ça maintenant »,
   * puis on constate que ce coup-là perd une pièce dans la position affichée —
   * ce qui est vrai, et n'a rien à voir avec ce que le moteur voulait dire.
   *
   * Sa légende existait, mais dans la colonne latérale, c'est-à-dire sous la
   * ligne de flottaison d'un téléphone. On la remonte sous l'échiquier, avec le
   * verdict, et on nomme les deux coups : « il fallait jouer d5 au lieu de Cf6 »
   * ne se prête à aucune autre lecture.
   *
   * Rien à afficher quand le coup joué était déjà le meilleur : la flèche bleue
   * n'apparaît pas non plus dans ce cas.
   */
  const conseilDuCoup = useMemo(() => {
    if (!verdictDuCoup || !commentary) return null
    const meilleur = commentary.alternatives.find(
      (alternative) => alternative.rank === 1 && !alternative.played,
    )
    if (!meilleur) return null

    /*
      Pourquoi ce coup-là, en phrases et non en un mot.

      On n'affichait que `reason` : une phrase quand `pourquoiCeCoup` en
      trouvait une — « Le pion en d5 attaque en même temps le fou en c4… » —,
      sinon le nom d'un motif relevé **sur la position**, pas sur le coup. D'où
      « Il fallait jouer Td8… Clouage » : le clouage était celui de la dame sur
      le pion g5, déjà là avant Td8, et qui n'expliquait rien.

      On y ajoute donc l'explication complète du coup conseillé — celle que
      donne déjà le haut-parleur du panneau, `explainRecommendedMove` : le coup
      rejoué et raconté comme s'il avait été joué, avec les seuls motifs qu'il
      crée. Puis la suite attendue, qui montre ce qu'il devient. Le nom du motif
      ne sert plus qu'en dernier recours.

      Seulement pour ses propres coups : l'explication tutoie celui qui joue,
      et elle tutoierait l'ordinateur sur les siens.
    */
    const phrases: string[] = []
    if (meilleur.reason && /[.!?…]$/.test(meilleur.reason)) phrases.push(meilleur.reason)
    if (commentary.color === playerColor) {
      const explication = explainRecommendedMove({
        locale: localeDuContenu(prefs.locale),
        fenBefore: commentary.fenBefore,
        bestSan: meilleur.sanEn,
        mover: commentary.color,
        scoreBefore: commentary.scoreBefore,
        scoreAfter: meilleur.score,
        bestLine: meilleur.line,
      })
      for (const paragraphe of explication?.body ?? []) {
        const propre = paragraphe.replace(/\*\*/g, '')
        if (!phrases.includes(propre)) phrases.push(propre)
      }
    }
    if (phrases.length === 0 && meilleur.reason) phrases.push(meilleur.reason)

    return {
      conseille: formatMove(meilleur.san),
      joue: formatMove(commentary.san),
      pourquoi: phrases.length > 0 ? phrases.join(' ') : null,
      leger: !meriteUnMeilleurCoup(commentary.quality, commentary.winLoss),
      suite:
        meilleur.line.length > 1
          ? t('computer.expectedLine', {
              coups: meilleur.line.slice(0, 4).map(formatMove).join(' '),
            })
          : null,
    }
  }, [verdictDuCoup, commentary, formatMove, playerColor, prefs.locale, t])

  /**
   * Pièces prises et avantage matériel — ou rien du tout.
   *
   * Le décompte se fait **par rapport au départ standard** : dans une position
   * composée, il annonçait donc une vingtaine de pièces prises avant même le
   * premier coup, et un avantage matériel qui ne correspondait à rien. Rien ne
   * cassait, mais les deux mentaient — et c'est pire, parce qu'on les croit.
   *
   * On les masque plutôt que de les recalculer sur la position de départ :
   * « ce que tu as pris depuis cette position-là » est une notion qui n'a
   * d'intérêt pour personne, et une barre vide se comprend toute seule.
   */
  const matiereAffichee = (couleur: Color) =>
    startFen
      ? {}
      : {
          captured: state.material[couleur],
          materialLead:
            couleur === 'w'
              ? Math.max(0, state.material.balance)
              : Math.max(0, -state.material.balance),
        }

  /**
   * Le rappel qu'elle compte.
   *
   * Sans lui, une partie classée ressemble à une partie ordinaire dont on
   * aurait perdu trois boutons : on cherche « Annuler », on ne le trouve pas,
   * et l'on croit à une panne. La pastille répond à la question avant qu'elle
   * ne se pose.
   */
  const pastilleClassee = (
    <Chip tone="accent">
      <Trophy size={11} aria-hidden />
      {t('friendGame.rated')}
    </Chip>
  )

  /**
   * Les flèches, rendues une seule fois.
   *
   * Elles écoutent le clavier ; deux exemplaires — un sous le plateau, un au
   * pied de la colonne — avanceraient de deux coups par pression. C'est la
   * mesure `grandEcran` qui décide où elles vont, jamais une classe masquée.
   */
  const navigation = (
    <GameNav cursor={state.cursor} count={state.moves.length} onSeek={goTo} fen={state.fen} />
  )

  /**
   * Les actions de la partie, au même endroit que les flèches.
   *
   * La sortie, une fois la partie finie : elle existait, cachée derrière les
   * trois petits points, à côté de l'abandon et du mode commenté. Or c'est le
   * moment où l'on en a le plus besoin — la boîte de résultat refermée, tous
   * les boutons se sont désactivés d'un coup, et rien ne dit qu'un menu
   * contient encore quelque chose d'utile. Elle prend la place de l'indice,
   * qui n'a plus rien à conseiller sur une partie terminée.
   *
   * « Annuler » reste à portée directe : on annule un coup souvent, on
   * abandonne une fois. « Annuler » et « Indice » disparaissent en partie
   * classée — ce sont les deux aides qui rendraient le résultat
   * ininterprétable, et une case cochée avant la partie vaut mieux qu'un
   * bouton grisé qu'on regarde pendant toute la partie.
   */
  const actions = (
    <>
      {gameOver ? (
        <>
          <Button
            size="sm"
            variant="primary"
            icon={<RefreshCw size={14} />}
            onClick={onNewGame}
            title={t('game.newGame')}
            aria-label={t('game.newGame')}
          >
            <span className="max-sm:hidden">{t('game.newGame')}</span>
          </Button>
          <ButtonLink
            href="/jouer"
            size="sm"
            variant="ghost"
            icon={<LayoutGrid size={14} />}
            title={t('nav.menu')}
          >
            <span className="max-sm:hidden">{t('nav.menu')}</span>
          </ButtonLink>
        </>
      ) : sansAide ? null : (
        <Button
          size="sm"
          variant="secondary"
          icon={<Lightbulb size={14} />}
          onClick={handleHint}
          disabled={state.turn !== playerColor}
          title={t('computer.hintTitle')}
          aria-label={t('live.hintAria')}
        >
          {/* Le libellé disparaît sous `sm` : l'icône est parlante, le titre
              reste, et la barre tient sur une ligne au lieu de trois. */}
          <span className="max-sm:hidden">{t('game.hint')}</span>
        </Button>
      )}
      {/* Masqué une fois la partie finie, comme sur la barre du pouce : on
          n'annule pas un abandon ni une chute de drapeau. */}
      {!sansAide && !gameOver && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Undo2 size={14} />}
          onClick={handleUndo}
          disabled={state.moves.length === 0}
          // « Reprendre » est le terme du jeu, mais il se lit aussi
          // « reprendre la partie ». On dit donc ce que fait le bouton.
          title={t('computer.undoTitle')}
          aria-label={t('computer.undoAria')}
        >
          <span className="max-sm:hidden">{t('bits.undo')}</span>
        </Button>
      )}

      {/* Ne restent au menu que les gestes rares ou définitifs.

          Le sens dépend d'où vit la barre. Sur téléphone elle est collée en
          bas de fenêtre : le panneau monte, sinon il sortirait du cadre. Sur
          grand écran elle est au pied de la carte des coups, qui se règle
          désormais sur son contenu et s'arrête au milieu de la colonne : un
          panneau qui monterait recouvrirait la liste qu'on vient de lire,
          alors qu'il y a tout l'espace voulu en dessous. `Menu` corrige de
          lui-même si la place manque du côté demandé. */}
      <Menu
        align="right"
        sens={grandEcran ? 'bas' : 'haut'}
        largeur="w-60"
        label={t('computer.gameOptions')}
        declencheur={() => <MoreHorizontal size={16} aria-hidden />}
      >
        <MenuItem
          onClick={quitterLaPartie}
          icone={<RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />}
        >
          {t('game.newGame')}
        </MenuItem>
        <MenuItem
          onClick={handleResign}
          disabled={gameOver}
          /* Encre discrète et non rouge, comme dans la barre du pouce : voir
             `ActionDuPouce`. La confirmation de `handleResign` reste. */
          className="text-muted"
          icone={<Flag size={15} className="shrink-0 text-faint" aria-hidden />}
        >
          {t('game.resign')}
        </MenuItem>

        {/* Absent en partie classée, comme dans la barre du pouce : le mode y
            est neutralisé de toute façon, et un interrupteur qui ne commute
            rien se lit comme une panne.

            Le menu se referme au clic, comme pour toute autre entrée : on
            voit le changement sur l'écran lui-même — le panneau du coach qui
            paraît ou s'efface —, pas sur un interrupteur. */}
        {!classee && (
          <div className="mt-1 border-t border-line/60 pt-1">
            <CommentaryToggle
              variante="menu"
              active={commentaryMode}
              onChange={(value) => {
                // Quitter le mode commenté rend la main tout de suite : ni
                // pause ni phrase en cours ne doivent retenir l'adversaire.
                if (value) prefs.set('commentaryMode', true)
                else couperLeCommentaire()
              }}
            />
          </div>
        )}
      </Menu>
    </>
  )

  return (
    <div className="mx-auto w-full max-w-[1500px] px-2 py-3 sm:px-4 lg:py-6">
      {/*
        Les zones de la grille — pendule adverse, plateau, pendule, barre,
        colonne — sont placées par nom : voir `.grille-partie` dans
        `globals.css`. Sur grand écran la zone de jeu tient dans la fenêtre,
        et un bandeau qui apparaît sous l'échiquier le rétrécit d'autant au
        lieu de pousser les pendules hors de l'écran ; sur téléphone en
        portrait tout s'empile et la page défile ; en paysage le plateau
        prend la gauche et tout le reste la droite.

        `--cote-plateau` est la largeur mesurée du plateau : les deux bandeaux
        s'y alignent au lieu de courir sur toute la colonne.
      */}
      <div
        className="grille-partie xl:[--aside:400px]"
        style={
          cotePlateau
            ? ({ '--cote-plateau': `${cotePlateau}px` } as React.CSSProperties)
            : undefined
        }
      >
        {/* ── Plateau ──────────────────────────────────────────────── */}
        <PlayerBar
          className="[grid-area:pion]"
          name={tCoeur(t, personality.name)}
          rating={bot.elo}
          color={botColor}
          avatar={personality.portrait}
          clock={pendule ? clock : null}
          timeControl={timeControl}
          active={state.turn === botColor && !gameOver}
          {...matiereAffichee(botColor)}
          status={
            botPlayer.loading
              ? t('computer.engineLoading')
              : botPlayer.thinking
                ? t('computer.thinking')
                : // Le moteur reste affiché pendant toute la partie :
                  // choisi une fois à la configuration, on l'oublie
                  // aussitôt, et l'on ne sait plus qui l'on affronte.
                  t('computer.engineLevel', {
                    moteur: human ? 'Maia' : 'Stockfish',
                    niveau: bot.level,
                  })
          }
        />
        <div className="[grid-area:plateau] flex min-h-0 min-w-0 gap-2">
          {/* La barre d'évaluation dit, à chaque coup, si l'on vient de se
              tromper. C'est une aide au même titre que l'indice : elle
              disparaît en partie classée. */}
          {prefs.showEvalDuringGame && !classee && (
            <EvalBar
              score={commentary?.scoreAfter ?? null}
              orientation={orientation}
              loading={coachLoading}
              className="hidden sm:block"
            />
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="my-1.5 flex min-h-0 flex-1 items-center justify-center">
              <ChessBoard
                // La colonne a une hauteur imposée : c'est elle qui borne
                // le plateau. L'estimation en `dvh` ne sert plus qu'aux
                // petits écrans, où les colonnes s'empilent et défilent.
                fitParentHeight
                reservedHeight={9}
                onFit={setCotePlateau}
                // Sur grand écran, la bascule de vue vit en tête de la
                // colonne des coups : sous le plateau, sa rangée lui prenait
                // quarante pixels de hauteur.
                // Sur grand écran, la bascule vit en tête de la colonne des coups — dessinée

                // par le plateau, qui garde ainsi son bouton de plein écran. En dessous,

                // elle reprend sa rangée sous le plateau.

                emplacementBascule={grandEcran ? emplacementBascule : undefined}
                actionBascule={branchement.action}
                fen={state.fen}
                orientation={orientation}
                playable={state.isLive && !gameOver ? playerColor : null}
                legalMoves={state.legalMoves}
                onMove={handleMove}
                onPremove={enregistrerPrecoup}
                onPremoveCancel={annulerPrecoup}
                premove={precoup}
                lastMove={state.lastMove}
                dernierCoupSan={state.moves[state.moves.length - 1]?.san ?? null}
                checkSquare={state.checkSquare}
                checkmate={state.status === 'checkmate'}
                highlights={(commentaryMode ? commentary?.highlights : undefined) as never}
                /* Le verdict sur la case d'arrivée, tant que le commentaire
                   parle bien de la position affichée. Périmé, il jugerait le
                   coup précédent sur la case du dernier — le pire des deux
                   mondes, puisque la pastille serait à la fois visible et
                   fausse. */
                verdict={verdictDuCoup}
                arrows={arrows}
                onArrowClick={handleArrowClick}
                // Le coup de l'adversaire arrive sans qu'on l'ait anticipé :
                // à la vitesse d'un coup qu'on joue soi-même, on ne voit pas
                // quelle pièce a bougé. On lui laisse le temps d'être vu.
                animationMs={lastPlayed?.color === botColor ? 420 : undefined}
              />
            </div>

            {/* ── Le verdict, en toutes lettres ─────────────────────────
                La pastille posée sur la case porte un glyphe — 📖, !!, ?? —
                et rien n'en donnait la clé. Elle contenait bien son
                explication dans un attribut `title`, mais inatteignable :
                son conteneur est en `pointer-events-none`, donc l'élément ne
                reçoit jamais le survol. Et sur un téléphone il n'y a pas de
                survol du tout. Une légende écrite ne dépend d'aucun geste.

                Elle rend du même coup la pastille franchement décorative,
                ce qui justifie enfin son `aria-hidden` : le mot est lu ici,
                une seule fois.

                Sa place est réservée tant que le mode commenté est allumé,
                qu'il y ait un verdict ou non : une légende qui paraissait après
                l'analyse et s'effaçait au coup suivant faisait bouger tout ce
                qui est dessous. La hauteur est fixe, et une explication plus
                longue défile dans sa case.

                Et seulement en portrait sous `lg`. Partout où le panneau du
                coach est à côté de l'échiquier — grand écran, paysage —, cette
                légende le répétait en rognant le plateau de cent pixels ; le
                conseil passe alors dans le panneau (voir `complement`).

                Calée sur la largeur du plateau, comme le bouton « Continuer » :
                elle courait sur toute la colonne et débordait des deux côtés. */}
            {commentaryMode && (
              <div className="mx-auto mb-1.5 h-24 w-full max-w-[var(--cote-plateau)] overflow-y-auto overscroll-contain lg:hidden paysage:hidden">
                {verdictDuCoup && (
                  <LegendeDuVerdict quality={verdictDuCoup.quality} conseil={conseilDuCoup} />
                )}
              </div>
            )}

            {reviewing && (
              <div className="mx-auto mb-1.5 flex w-full max-w-[var(--cote-plateau)] items-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 px-3 py-2 text-[14px]">
                <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1 leading-snug text-muted">
                  {reviewedMove
                    ? avecElements(t('computer.reviewingMove'), {
                        coup: (
                          <strong className="font-semibold text-ink">
                            {formatMove(reviewedMove.san)}
                          </strong>
                        ),
                      })
                    : t('computer.reviewingGame')}
                </span>
                <button
                  type="button"
                  onClick={() => goTo(state.moves.length - 1)}
                  // Au doigt, la cible fait 44 px : c'est le bouton qu'on
                  // cherche quand l'ordinateur attend.
                  className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110 pointer-coarse:min-h-11"
                >
                  {t('computer.backToGame')}
                </button>
              </div>
            )}

            {studyPause && (
              <div className="mx-auto mb-1.5 h-10 w-full max-w-[var(--cote-plateau)]">
                {awaitingReview && (
                  <button
                    type="button"
                    onClick={() => setReviewedFen(state.currentFen)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
                  >
                    <Play size={15} aria-hidden />
                    {t('computer.continuePlays', { adversaire: tCoeur(t, personality.name) })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <PlayerBar
          className="[grid-area:moi]"
          name={t('common.you')}
          color={playerColor}
          avatar="🙂"
          clock={pendule ? clock : null}
          timeControl={timeControl}
          active={state.turn === playerColor && !gameOver}
          {...matiereAffichee(playerColor)}
          // L'état du tour, dans le bandeau plutôt qu'en ligne à part : c'est
          // ce bandeau qu'on regarde pour savoir si c'est à soi.
          status={!gameOver && state.turn === playerColor ? t('game.yourTurn') : undefined}
        />

        {/* ── Barre d'actions ──────────────────────────────────────── */}
        <div className="[grid-area:barre]">
          {/* ── Écrans moyens ─────────────────────────────────────────
              Entre `sm` et `lg` : une tablette en portrait, un téléphone en
              paysage. Sous `sm`, elle cède la place au ruban et à la barre
              du bas, plus bas dans ce fichier — les mêmes actions, disposées
              pour un pouce plutôt que pour une souris. À partir de `lg`,
              elle n'existe plus : la navigation et les actions vivent au
              pied de la colonne des coups, où le regard les trouve sans
              descendre sous le plateau, et le plateau récupère la hauteur
              qu'elle prenait. La condition est en JavaScript et non en CSS
              parce que les flèches écoutent le clavier : rendues deux fois,
              elles avanceraient de deux coups. */}
          {!grandEcran && (
            <div className="mt-3 hidden flex-wrap items-center gap-1.5 sm:flex">
              {/* Plus d'indicateur de trait ici : le bandeau du joueur dit
                  déjà « À toi de jouer », juste au-dessus. Deux fois la même
                  phrase à trois centimètres d'écart, c'est une de trop. */}
              <span className="mr-auto">{classee && pastilleClassee}</span>

              {navigation}

              {/* Visible en paysage seulement : le plateau y cède sa rangée
                  de bascule pour garder la hauteur, et c'est ici qu'elle
                  revient. */}
              <ViewToggle className="hidden paysage:flex" />

              {actions}
            </div>
          )}

          {/* ── Téléphone : le ruban, puis la barre du pouce ──────────
              Deux emprunts assumés aux applications d'échecs mobiles, parce
              qu'ils répondent mieux que ce qu'on avait.

              Le **ruban** remplace les cinq flèches de navigation : il montre
              où l'on en est plutôt que de proposer d'y aller. La liste
              complète reste plus bas dans la page, pour l'autre usage — la
              parcourir.

              La **barre du bas** aligne les mêmes actions que la version
              grand écran, mais en colonnes égales, icône au-dessus du mot.
              C'est ce qui permet de viser sans regarder : chaque cible fait un
              quart de la largeur au lieu d'un bouton de texte serré contre son
              voisin. Elle suit l'état de la partie — les aides disparaissent
              en partie classée, les sorties remplacent tout une fois la partie
              finie. */}
          <div className="mt-2 sm:hidden">
            <div className="flex items-center gap-2 px-1">
              {classee && (
                <Chip tone="accent">
                  <Trophy size={11} aria-hidden />
                  {t('friendGame.rated')}
                </Chip>
              )}
              <div ref={setEmplacementBascule} className="ml-auto" />
            </div>

            <RubanCoups coups={rubanCoups} cursor={state.cursor} onSeek={goTo} className="mt-1" />

            {/* ── Le coach, sous l'échiquier ─────────────────────────────
                Sur téléphone, le panneau complet restait au fond de la
                colonne latérale : on faisait défiler la page pour le lire, et
                l'échiquier dont il parlait sortait de l'écran. Il se tient ici,
                fixe et compact, entre les coups et la barre du pouce. */}
            {commentaryMode && telephone && (
              <CommentaryPanel
                compact
                className="mt-2"
                commentary={reviewedMove ? reviewedCommentary : commentary}
                loading={reviewedMove ? false : coachLoading}
                voix={commentaryMode}
                onSpeakingChange={setCoachSpeaking}
                onHoverAlternative={setHoveredAlternative}
                stale={commentaryStale}
                onReview={reviewCommented}
              />
            )}

            <BarreDuPouce
              classee={classee}
              gameOver={gameOver}
              sansAide={sansAide}
              commentaryMode={commentaryMode}
              onCommentaryChange={(value) => {
                if (value) prefs.set('commentaryMode', true)
                else couperLeCommentaire()
              }}
              // Même question qu'au menu « … » du grand écran : sur téléphone,
              // c'est ici que « Nouvelle partie » se touche, en pleine partie.
              onNewGame={quitterLaPartie}
              onRematch={onRematch}
              onResign={handleResign}
              onHint={handleHint}
              onUndo={handleUndo}
              hintDisabled={state.turn !== playerColor}
              undoDisabled={state.moves.length === 0}
            />
          </div>
        </div>

        {/* ── Colonne latérale ─────────────────────────────────────── */}
        <div className="[grid-area:aside] mt-4 flex min-h-0 flex-col gap-3 lg:mt-0 paysage:mt-0 paysage:overflow-y-auto paysage:overscroll-contain">
          {/*
            Rien de tout cela ne veut dire quoi que ce soit dans une position
            composée. Le bandeau reconnaissait une « Ouverture Clemenz » sur un
            h3 joué dans une finale de pions : le livre compare des suites de
            coups depuis le départ standard, et on ne part pas du départ.
          */}
          {!startFen && <OpeningBanner opening={opening} moveCount={state.moves.length} />}

          {/* ── Le mémo d'avant chaque coup ───────────────────────────────
              La seule aide de la page qui n'appelle pas le moteur : elle pose
              quatre questions et ne répond à aucune. C'est pour cela qu'elle
              reste là même en partie classée, là où le mode commenté et le
              bouton « pourquoi ce coup ? » sont coupés — lire « qu'est-ce
              qu'il attaque ? » n'est pas une assistance.

              Elle disparaît une fois la partie finie : il n'y a plus de coup à
              préparer, et la place revient au bilan. */}
          {prefs.memoAvantCoup && !gameOver && <AideMemoire actif={state.turn === playerColor} />}

          {/* ── Le thème de la séance, rappelé pendant la partie ──────────
              Une séance sans rappel n'est qu'une partie : on lit la consigne
              sur l'écran de préparation, on joue quarante coups, et au
              vingtième on ne sait plus ce qu'on cherchait. Le bandeau reste
              donc là, replié ou non, jusqu'à la fin. */}
          {seance && !gameOver && (
            <RappelDeSeance
              nom={t(seance.theme.nom)}
              icone={seance.theme.icone}
              consigne={t(seance.theme.consigne)}
            />
          )}

          {/* ── Le coach, seulement si on l'a demandé ─────────────────────
              Le panneau était posé sans condition : mode commenté éteint et
              aucun coup analysé, il affichait quand même « Mode commenté
              actif. Après chaque coup… » — une annonce fausse, en tête de la
              colonne, sous laquelle se trouve la liste des coups qu'elle
              repoussait d'autant.

              Éteint, on retombe donc sur ce que fait déjà la partie à deux sur
              un écran : rien, sauf un bouton « Pourquoi ce coup ? » pour qui
              bloque sur un coup précis. Sauf en partie classée, où montrer le
              meilleur coup à la demande reviendrait à annuler ce que la case
              « classée » vient de garantir. */}
          {commentaryMode ? (
            telephone ? null : (
              <CommentaryPanel
                // Sur grand écran, le panneau prend toute la hauteur que la
                // colonne lui laisse. Elle ne dépend plus de son contenu — un ou
                // deux paragraphes, trois ou quatre options, la légende des
                // flèches ou non — mais de ce qui l'entoure, qui ne bouge pas
                // d'un coup à l'autre : la carte des coups a une hauteur fixe,
                // plus bas. Rien ne saute, et quand la place est là on la prend
                // — une hauteur plafonnée laissait les options sous le pli, avec
                // un grand vide dessous. L'explication défile ; les options
                // restent visibles au pied du panneau.
                className="lg:min-h-[14rem] lg:flex-1"
                /*
                  Le conseil, là où la légende sous l'échiquier n'est plus :
                  grand écran et paysage. Seulement quand l'explication ne le
                  donne pas déjà — sur une faute, elle dit elle-même « mieux
                  valait… », avec sa raison et un exemple ; le répéter en
                  dessous ne ferait que doubler le texte.
                */
                complement={
                  conseilDuCoup &&
                  commentary &&
                  !reviewedMove &&
                  !meriteUnMeilleurCoup(commentary.quality, commentary.winLoss) ? (
                    <PhraseDuConseil
                      conseil={conseilDuCoup}
                      className="hidden lg:block paysage:block"
                    />
                  ) : undefined
                }
                legende={arrowLegend}
                voix={commentaryMode}
                // En revue, on montre le commentaire du coup consulté plutôt que
                // celui du dernier coup joué : sinon le texte et l'échiquier
                // parlent de deux positions différentes.
                commentary={reviewedMove ? reviewedCommentary : commentary}
                loading={reviewedMove ? false : coachLoading}
                paused={commentaryPaused}
                onTogglePause={() => setCommentaryPaused((value) => !value)}
                onSpeakingChange={setCoachSpeaking}
                onHoverAlternative={setHoveredAlternative}
                showBestMove={showBestMove}
                onToggleBestMove={() => setShowBestMove((value) => !value)}
                stale={commentaryStale}
                onReview={reviewCommented}
                onDesactiver={couperLeCommentaire}
              />
            )
          ) : classee ? null : (
            /* En revue, la question porte sur le coup qu'on regarde — pas sur
               le dernier de la partie. Sans quoi le panneau expliquait une
               position qui n'était plus à l'écran. Revenu au départ, il n'y a
               aucun coup à expliquer : le panneau s'efface. */
            <PourquoiPanel
              move={reviewing ? reviewedMove : lastPlayed}
              enRevue={reviewing}
              book={book}
              openingName={opening?.name ?? null}
            />
          )}

          <ApprofondirCoup
            commentary={reviewedMove ? reviewedCommentary : commentary}
            openingName={opening?.name ?? null}
          />

          <div id={PANNEAU_PLATEAU_ID} className="empty:hidden">
            <PhysicalBoardPanel
              state={physicalBoard}
              ouvert={branchement.ouvert}
              onFermer={branchement.fermer}
            />
          </div>

          {/* ── La liste garde les derniers coups, pas tous ───────────────
              Elle prenait toute la hauteur restante de la colonne
              (`lg:flex-1`). Sur un grand écran, cela veut dire neuf cents
              pixels de cadre pour quatorze coups : la liste occupait le tiers
              haut, et les deux autres tiers étaient un rectangle vide que les
              commandes attendaient tout en bas.

              Douze rangées suffisent — c'est ce qu'on relit en jouant, et la
              partie en ligne applique déjà la même règle pour rendre la place
              au tchat. Au-delà, la liste défile et se cale d'elle-même sur le
              coup courant ; les coups d'avant sont à un cran de molette. La
              carte se règle donc sur ce qu'elle contient, ici comme sur
              téléphone, et cesse de réserver une place qu'elle n'utilise
              pas. */}
          {/* La carte garde ses trois zones : en tête la bascule de vue, au
              milieu la liste — la seule qui défile —, au pied la navigation
              et les actions.

              Sur grand écran, elle laisse déborder : le menu « … » de son pied
              s'ouvre vers le haut quand la place manque en bas, et la carte le
              coupait à son bord — « Nouvelle partie » à moitié caché. La liste
              défile déjà seule.

              Et elle a une hauteur fixe : c'est ce qui laisse au panneau du
              coach, au-dessus, une place qui ne change pas d'un coup à l'autre.
              La liste s'allongeait à chaque coup, et le panneau rétrécissait
              d'autant. Quatre rangées y tiennent ; au-delà, elle défile et se
              cale d'elle-même sur le coup courant. */}
          <Card
            className={clsx(
              'flex max-h-[45vh] flex-col overflow-hidden lg:max-h-none lg:overflow-visible',
              commentaryMode && 'lg:h-[min(19rem,30dvh)] lg:shrink-0',
            )}
          >
            {grandEcran && (
              <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2">
                <span className="text-[12px] font-semibold text-faint">{t('game.moves')}</span>
                {classee && pastilleClassee}
                <div ref={setEmplacementBascule} className="ml-auto" />
              </div>
            )}
            <MoveList
              moves={state.moves}
              cursor={state.cursor}
              onSeek={goTo}
              qualities={qualites}
              maxRows={12}
              className="min-h-0 flex-1"
              controls={!grandEcran}
            />
            {grandEcran && (
              <div className="border-t border-line/60 p-2.5">
                <div className="flex justify-center">{navigation}</div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {actions}
                </div>
              </div>
            )}
          </Card>

          {botPlayer.error && (
            <Card className="border-[var(--q-blunder)]/50 p-3 text-sm text-[var(--q-blunder)]">
              {botPlayer.error}
            </Card>
          )}
        </div>
      </div>

      {/* La partie a pu finir pendant la question — un mat, le drapeau : on
          n'abandonne pas une partie terminée. */}
      {question === 'abandonner' && !gameOver && (
        <BoiteConfirmation
          titre={t('live.resignConfirm')}
          confirmer={t('game.resign')}
          danger
          onConfirmer={abandonner}
          onAnnuler={() => setQuestion(null)}
        />
      )}
      {question === 'quitter' && (
        <BoiteConfirmation
          titre={t('computer.leaveTitle')}
          texte={t('computer.leaveHint')}
          confirmer={t('computer.leaveAction')}
          onConfirmer={laisserLaPartie}
          onAnnuler={() => setQuestion(null)}
        />
      )}

      {gameOver && (
        <GameOverDialog
          status={outcome?.status ?? state.status}
          result={outcome?.result ?? state.result}
          retour={
            duel
              ? { href: '/carriere', libelle: t('computer.backToChapter', { n: duel.numero }) }
              : tournoi
                ? { href: '/tournois/ordinateur', libelle: t('computer.backToTournament') }
                : seance
                  ? // On ne renvoie pas aux réglages de partie, qu'on vient
                    // justement d'épargner : on renvoie au choix du thème, qui
                    // est la seule décision d'une séance.
                    { href: '/jouer/pedagogique', libelle: t('computer.otherSession') }
                  : undefined
          }
          playerColor={playerColor}
          opponentName={tCoeur(t, personality.name)}
          moves={state.moves}
          bilan={bilan}
          // Dit seulement si l'on attendait des points : une partie
          // d'entraînement n'a rien à justifier.
          /*
            Pourquoi cette partie ne compte pas, quand on attendait qu'elle
            compte. L'aide du moteur d'abord — c'est la seule raison que le
            joueur a lui-même provoquée, et la seule qu'il puisse éviter la
            prochaine fois —, puis le verdict du serveur, qui ne parlait à
            personne : sa réponse était jetée à l'arrivée.
          */
          // Rien à redire sur une partie rouverte : la première boîte a déjà
          // dit si elle comptait, et la mention `prolongee` dit que cette
          // fin-ci ne compte pas. « Tu as annulé un coup » y serait du bruit.
          nonClassee={
            prolongation
              ? null
              : aideUtilisee
                ? aideUtilisee === 'indice'
                  ? t('computer.usedHint')
                  : t('computer.usedTakeback')
                : refusClassement
                  ? motifDeRefus(t, refusClassement)
                  : annonceManquee && classee
                    ? t('computer.ratedAnnounceFailed')
                    : null
          }
          seance={
            seance && releveDeSeance
              ? {
                  theme: t(seance.theme.nom),
                  pour: releveDeSeance.pour,
                  contre: releveDeSeance.contre,
                  coups: releveDeSeance.coups.slice(0, 8),
                }
              : undefined
          }
          ratingDelta={variationClassement}
          quete={
            mission.quete
              ? {
                  libelle: t(mission.quete.label),
                  faite: mission.faite,
                  restantes: mission.restantes,
                }
              : undefined
          }
          onRematch={onRematch}
          onNewGame={onNewGame}
          reprise={repriseProposee}
          prolongee={prolongation}
        />
      )}
    </div>
  )
}
