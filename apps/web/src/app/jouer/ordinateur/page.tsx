'use client'

/**
 * Partie contre l'ordinateur.
 *
 * Deux écrans successifs : le choix de l'adversaire, puis la partie elle-même.
 * Le choix reste volontairement court — un curseur de niveau, une couleur, une
 * cadence — parce qu'un formulaire de douze champs est le meilleur moyen de
 * décourager quelqu'un qui voulait juste jouer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Eye,
  Flag,
  Handshake,
  LayoutGrid,
  Lightbulb,
  MoreHorizontal,
  Play,
  RefreshCw,
  Trophy,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import clsx from 'clsx'
import { GameNav } from '@/components/game/GameNav.tsx'
import { RubanCoups, rubanDepuisLesCoups } from '@/components/game/RubanCoups.tsx'
import { useSan } from '@/lib/notation.ts'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  BOT_LEVELS,
  BOT_PERSONALITIES,
  MAIA_MAX_ELO,
  MAIA_MIN_ELO,
  maiaCouvre,
  SEUIL_SUITE_BREVE,
  SPEED_LABELS,
  TIME_CONTROLS,
  applyMove,
  botLevel,
  createClock,
  flaggedColor,
  formatScore,
  sanToFrench,
  remainingAt,
  speedCategory,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { ChessBoard, ViewToggle } from '@/components/board/ChessBoard.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import { EvalBar } from '@/components/game/EvalBar.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { ApprofondirCoup } from '@/components/ia/ApprofondirCoup.tsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { TurnIndicator } from '@/components/game/TurnIndicator.tsx'
import { OpeningBanner } from '@/components/game/OpeningBanner.tsx'
import {
  CommentaryPanel,
  CommentaryToggle,
  commentaryArrows,
  commentaryLegend,
  useLiveCommentary,
  type Alternative,
} from '@/components/game/LiveCommentary.tsx'
import { LEGEND, legendFor, type LegendItem } from '@/components/board/ArrowLegend.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  SegmentedControl,
  SectionTitle,
  Toggle,
} from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { usePhysicalBoard } from '@/lib/board/usePhysicalBoard.ts'
import { getEngine } from '@/lib/engine/client.ts'
import { useEcranAllume } from '@/lib/ecranAllume.ts'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import {
  chargerPartieEnCours,
  depuis,
  archiverPartie,
  enregistrerPartieEnCours,
  oublierPartieEnCours,
  type PartieEnCours,
} from '@/lib/game/partieEnCours.ts'
import { requestHint, useBotPlayer } from '@/lib/game/useBotPlayer.ts'
import {
  chapitreDeLUrl,
  deposerGains,
  signaler as signalerCarriere,
} from '@/lib/carriere/useCarriere.ts'
import { deposerResultat } from '@/lib/game/tournoiSolo.ts'
import {
  CHAPITRES,
  QUALITY_STYLES,
  chapitre as chapitreCarriere,
  niveauEffectif,
  type BotPersonalityId,
  type Chapitre,
  type MoveQuality,
} from '@coupparfait/core'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound, playSound } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { speak } from '@/lib/speech.ts'
import type { Arrow } from '@/components/board/boardKit.ts'

type Phase = 'setup' | 'playing'

interface Setup {
  level: number
  color: Color | 'random'
  timeControlId: string
  /** Affronter Maia — un réseau humain — plutôt que Stockfish bridé. */
  human: boolean
  /**
   * Partie classée : le résultat met à jour le classement de la cadence.
   *
   * Elle se demande **avant** de commencer, et elle a un prix : ni annulation,
   * ni indice, ni mode commenté. Ces trois aides sont ce qui rend une partie
   * contre l'ordinateur ininterprétable — on ne peut pas mesurer quelqu'un qui
   * reprend ses coups et à qui l'on montre le meilleur. On les retire donc au
   * lieu d'essayer de les comptabiliser après coup.
   */
  classee: boolean
}

export default function PlayComputerPage() {
  const [phase, setPhase] = useState<Phase>('setup')

  /**
   * Passer à la partie ramène en haut de la page.
   *
   * Un changement de phase est une navigation : on remplace tout l'écran. Le
   * navigateur, lui, ne voit qu'un rendu de plus et garde la position de
   * défilement de l'écran précédent. Sur téléphone, où les colonnes s'empilent,
   * on cliquait « Reprendre » depuis un écran de réglages déroulé et l'on
   * arrivait au milieu de la liste des coups, l'échiquier hors champ au-dessus.
   *
   * `instant` et non `smooth` : ce n'est pas un déplacement dans la page, c'est
   * son point de départ. L'animer donnerait à voir un défilement que personne
   * n'a demandé.
   */
  useEffect(() => {
    if (phase === 'playing') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [phase])
  const [setup, setSetup] = useState<Setup>({
    level: 6,
    // Le hasard par défaut, et non les Blancs.
    //
    // Jouer toujours du même côté fait progresser de travers : on apprend les
    // ouvertures d'un camp, on ne voit jamais les positions de l'autre, et le
    // demi-avantage du trait finit par se confondre avec son propre niveau.
    // Choisir reste possible d'un clic — c'est le défaut qui change.
    color: 'random',
    timeControlId: '600+5',
    // Par défaut : un adversaire qui se trompe comme un humain. C'est ce
    // qu'on veut faire affronter à quelqu'un qui débute.
    human: true,
    // Non par défaut : on vient d'abord s'entraîner, et s'entraîner suppose de
    // pouvoir revenir en arrière.
    classee: false,
  })
  const [resolvedColor, setResolvedColor] = useState<Color>('w')
  const [gameKey, setGameKey] = useState(0)

  /**
   * Partie laissée en plan, s'il y en a une.
   *
   * `undefined` tant qu'on n'a pas demandé, `null` quand il n'y a rien : sans
   * cette distinction, le bandeau de reprise apparaîtrait après coup chez tout
   * le monde, y compris ceux qui n'ont rien à reprendre.
   */
  const [reprise, setReprise] = useState<PartieEnCours | null | undefined>(undefined)
  const [coupsRepris, setCoupsRepris] = useState<string[] | undefined>(undefined)
  const [horlogeReprise, setHorlogeReprise] = useState<{ w: number; b: number } | null>(null)

  useEffect(() => {
    void chargerPartieEnCours().then(setReprise)
  }, [])

  /**
   * Arrivé par la carrière : on saute l'écran de réglages.
   *
   * Le chapitre a déjà tout choisi — l'adversaire, sa force, son style — et
   * c'est justement ce qui fait de lui un chapitre. Redemander « quel niveau ?
   * quelle couleur ? » à quelqu'un qui vient de cliquer « Affronter
   * l'adversaire » lui ferait défaire ce que le mode venait de décider pour
   * lui.
   *
   * `null` quand on n'y est pas, et c'est le cas ordinaire.
   */
  const [duel, setDuel] = useState<Chapitre | null>(null)
  const duelLance = useRef(false)
  /**
   * Cette partie appartient-elle à un tournoi contre l'ordinateur ?
   *
   * Même principe que le duel de carrière : le tournoi a déjà choisi
   * l'adversaire, sa force, la couleur et la cadence — les redemander
   * reviendrait à défaire ce qu'il vient de décider. La différence est qu'ici
   * on ne rend pas un « fait » au serveur mais un résultat au tableau, qui vit
   * dans le navigateur.
   */
  const [tournoi, setTournoi] = useState(false)
  const [styleImpose, setStyleImpose] = useState<BotPersonalityId | null>(null)
  const tournoiLance = useRef(false)
  useEffect(() => {
    if (tournoiLance.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tournoi') !== '1') return
    const niveau = Number(params.get('niveau'))
    const couleur = params.get('couleur') === 'b' ? 'b' : 'w'
    if (!Number.isInteger(niveau) || niveau < 1) return

    tournoiLance.current = true
    setTournoi(true)
    const perso = params.get('perso')
    if (perso && perso in BOT_PERSONALITIES) setStyleImpose(perso as BotPersonalityId)
    setSetup({
      level: niveau,
      color: couleur,
      timeControlId: params.get('tc') ?? '600+5',
      // Stockfish et non Maia : le tournoi annonce une force en Elo, et c'est
      // le barème des niveaux qui la garantit.
      human: false,
      // Un tournoi tient son propre tableau : il n'alimente pas le classement.
      classee: false,
    })
    setResolvedColor(couleur)
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])
  useEffect(() => {
    if (duelLance.current) return
    const numero = chapitreDeLUrl(window.location.search)
    if (numero === null) return
    const chapitre = chapitreCarriere(numero)
    if (!chapitre) return

    duelLance.current = true
    setDuel(chapitre)
    // La force effective tient compte du coup de main : trois défaites
    // d'affilée allègent l'adversaire, et c'est l'écran de carrière qui
    // l'annonce. On relit la progression pour appliquer la même règle.
    void fetch('/api/carriere', { cache: 'no-store' })
      .then((reponse) => reponse.json())
      .then((data: { progression: { losingStreak: number; helpUsed: number } | null }) => {
        const niveau = data.progression
          ? niveauEffectif(chapitre, {
              ...data.progression,
              chapter: chapitre.numero,
              lessonDone: true,
              puzzlesDone: 0,
              winsInChapter: 0,
              stars: {},
              xp: 0,
              badges: [],
            })
          : chapitre.niveau
        demarrerDuel(niveau)
      })
      .catch(() => demarrerDuel(chapitre.niveau))

    function demarrerDuel(niveau: number) {
      setSetup({ level: niveau, color: 'random', timeControlId: '600+5', human: false, classee: false })
      setResolvedColor(Math.random() < 0.5 ? 'w' : 'b')
      setCoupsRepris(undefined)
      setHorlogeReprise(null)
      oublierPartieEnCours()
      setGameKey((key) => key + 1)
      setPhase('playing')
      playSound('start')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback((next: Setup) => {
    setSetup(next)
    setResolvedColor(
      next.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : next.color,
    )
    // Commencer une partie remplace celle qu'on gardait : on ne conserve que la
    // dernière, et la nouvelle l'écrasera de toute façon au premier coup.
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  const reprendre = useCallback((partie: PartieEnCours) => {
    setSetup({
      level: partie.level,
      color: partie.playerColor,
      timeControlId: partie.timeControlId,
      // Une partie enregistrée avant que la plage de Maia ne soit respectée
      // pouvait demander un niveau qu'elle ne sait pas jouer : elle reprend
      // alors avec Stockfish, à la force annoncée.
      human: partie.human && maiaCouvre(botLevel(partie.level).elo),
      // Une partie reprise n'est pas classée : rien ne dit ce qui s'est passé
      // pendant la séance précédente, ni quelles aides on y a utilisées.
      classee: false,
    })
    setResolvedColor(partie.playerColor)
    setCoupsRepris(partie.moves)
    setHorlogeReprise(partie.clock)
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  if (phase === 'setup') {
    return (
      <SetupScreen
        initial={setup}
        onStart={start}
        reprise={reprise ?? null}
        onReprendre={reprendre}
      />
    )
  }

  return (
    <GameScreen
      key={gameKey}
      duel={duel}
      tournoi={tournoi}
      styleImpose={styleImpose}
      level={setup.level}
      playerColor={resolvedColor}
      timeControlId={setup.timeControlId}
      human={setup.human}
      classee={setup.classee}
      initialMoves={coupsRepris}
      initialClock={horlogeReprise}
      onNewGame={() => setPhase('setup')}
      onRematch={() => {
        setResolvedColor(
          setup.color === 'random'
            ? Math.random() < 0.5
              ? 'w'
              : 'b'
            : resolvedColor === 'w'
              ? 'b'
              : 'w',
        )
        setCoupsRepris(undefined)
        setHorlogeReprise(null)
        setGameKey((key) => key + 1)
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écran de configuration
// ─────────────────────────────────────────────────────────────────────────────

function SetupScreen({
  initial,
  onStart,
  reprise,
  onReprendre,
}: {
  initial: Setup
  onStart: (setup: Setup) => void
  /** Partie interrompue à reprendre, `null` s'il n'y en a pas. */
  reprise: PartieEnCours | null
  onReprendre: (partie: PartieEnCours) => void
}) {
  const [level, setLevel] = useState(initial.level)
  const [color, setColor] = useState<Color | 'random'>(initial.color)
  const [timeControlId, setTimeControlId] = useState(initial.timeControlId)
  const [human, setHuman] = useState(initial.human)
  const [classee, setClassee] = useState(initial.classee)

  /**
   * A-t-on un compte ?
   *
   * Une partie classée met à jour un classement, et un classement se range
   * quelque part. `null` tant qu'on ne sait pas : on n'affiche pas une case
   * grisée à quelqu'un qui est peut-être connecté.
   */
  const [connecte, setConnecte] = useState<boolean | null>(null)
  useEffect(() => {
    void fetch('/api/auth')
      .then((reponse) => reponse.json())
      .then((data: { user: unknown }) => setConnecte(data.user != null))
      .catch(() => setConnecte(false))
  }, [])

  // Le mode commenté n'est pas un réglage de la partie mais une préférence
  // durable : on le lit et on l'écrit là où il vit, pour que le bouton de la
  // barre d'outils et cette case disent toujours la même chose.
  const commentaryMode = usePreferences((state) => state.commentaryMode)
  const commentaryOpponent = usePreferences((state) => state.commentaryOpponent)
  const setPreference = usePreferences((state) => state.set)

  /**
   * Le moteur se télécharge pendant qu'on choisit son adversaire.
   *
   * Sept mégaoctets de WebAssembly, chargés à la première demande — c'est-à-dire
   * au moment exact où l'ordinateur doit jouer son premier coup. Sur une
   * connexion moyenne, l'échiquier restait donc figé plusieurs secondes après
   * le coup d'ouverture, sans autre signe qu'un « Chargement du moteur… » en
   * petit sous le nom de l'adversaire.
   *
   * Cet écran-ci dure, lui : on y règle un niveau, une couleur, une cadence.
   * Autant s'en servir. Si le chargement échoue, on ne dit rien — la partie le
   * retentera d'elle-même, et c'est là que le message a un sens.
   */
  useEffect(() => {
    void getEngine()
      .start()
      .catch(() => undefined)
  }, [])

  /**
   * Maia est-elle installée sur ce serveur ?
   *
   * On ne propose pas un adversaire qu'on ne peut pas fournir : la case
   * n'apparaît que si le serveur a Lc0 et les poids.
   */
  const [maiaReady, setMaiaReady] = useState(false)
  useEffect(() => {
    void fetch('/api/sante')
      .then((response) => response.json())
      .then((data: { maia?: boolean }) => setMaiaReady(data.maia === true))
      .catch(() => setMaiaReady(false))
  }, [])

  /** Où en est le joueur dans l'échelle. `null` tant qu'on ne sait pas. */
  const [progress, setProgress] = useState<Progression | null>(null)
  useEffect(() => {
    void fetch('/api/progression')
      .then((response) => response.json())
      .then(setProgress)
      .catch(() => setProgress(null))
  }, [])

  const bot = botLevel(level)
  const personality = BOT_PERSONALITIES[bot.personality]

  /**
   * Maia peut-elle jouer *ce* niveau-là ?
   *
   * Ses réseaux s'arrêtent à 1100 en bas et à 1900 en haut. En dehors, le
   * serveur retombait sur le palier le plus proche sans rien dire : le curseur
   * de niveau ne changeait plus rien, et l'on se faisait battre par un joueur
   * de 1100 après avoir demandé un débutant complet. C'est Stockfish qui joue
   * dans ce cas — lui sait descendre — et l'écran l'annonce plutôt que de
   * laisser croire à un choix qui n'existe pas.
   */
  const maiaPossible = maiaReady && maiaCouvre(bot.elo)
  const niveauxMaia = BOT_LEVELS.filter((entree) => maiaCouvre(entree.elo))
  const premierNiveauMaia = niveauxMaia[0]?.level ?? 1
  const dernierNiveauMaia = niveauxMaia[niveauxMaia.length - 1]?.level ?? BOT_LEVELS.length
  /** L'adversaire réellement retenu, une fois Maia écartée si elle ne peut pas. */
  const humainRetenu = human && maiaPossible

  return (
    /* `max-w-5xl` et non plus `3xl`, `py-8` et non plus `py-14` : l'écran doit
       tenir sans défilement, et il ne tenait pas — 1 447 px de contenu. Voir le
       commentaire de la grille plus bas. */
    /* Et il ne tenait toujours pas : mesuré à 1280 × 720, 884 points de contenu
       pour 720 de fenêtre, soit 164 de trop — le bouton « Commencer la partie »
       passait sous le pli, sur l'écran dont c'est l'unique raison d'être.
       Plutôt que de retirer un réglage, on resserre les espacements quand la
       fenêtre est basse. La condition porte sur la *hauteur* et non sur la
       largeur : c'est bien elle qui manque, et un portable 1280 × 720 n'est pas
       un téléphone. */
    <div
      className={clsx(
        // Plus large quand la fenêtre est basse : la place manque en hauteur,
        // pas en largeur. Deux colonnes plus larges font tenir les descriptions
        // des réglages sur une ligne de moins chacune, ce qui rend des points
        // sans retirer un mot.
        'mx-auto w-full px-4 sm:px-6',
        'max-w-5xl [@media(max-height:820px)]:max-w-7xl',
        'py-6 lg:py-8',
        '[@media(max-height:820px)]:py-3 [@media(max-height:820px)]:lg:py-3',
        '[@media(max-height:820px)]:pb-2 [@media(max-height:820px)]:lg:pb-2',
      )}
    >
      <Link
        href="/jouer"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink [@media(max-height:820px)]:mb-1.5"
      >
        <ArrowLeft size={15} aria-hidden />
        Retour au choix du mode
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight [@media(max-height:820px)]:text-2xl">
        Contre l’ordinateur
      </h1>
      {/* Une ligne, contre trois auparavant. La phrase coupée — « c'est là
          qu'on progresse le plus vite » — était un conseil, pas une consigne :
          elle se lit une fois et se relit jamais, alors qu'elle coûtait
          vingt-quatre pixels à chaque visite. */}
      {/* Masquée quand la fenêtre est basse : c'est un conseil, il se lit une
          fois, et il coûte vingt-six points à chaque visite sur un écran où ils
          manquent. Le choix de l'adversaire, lui, reste entièrement visible. */}
      <p className="mt-1.5 text-sm text-muted [@media(max-height:820px)]:hidden">
        Vingt-cinq niveaux, sept personnalités. Choisis un adversaire un peu au-dessus de toi.
      </p>

      {/* ── Reprendre ──────────────────────────────────────────────────
          En tête, avant les réglages : quelqu'un qui a une partie en cours
          vient presque toujours pour elle. La lui faire chercher sous le
          formulaire reviendrait à lui demander de reconfigurer ce qu'il a
          déjà choisi. */}
      {reprise && (
        <Card glow className="mt-7 flex flex-wrap items-center gap-4 p-5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius)]"
            style={{ background: 'color-mix(in oklab, var(--accent) 15%, transparent)' }}
            aria-hidden
          >
            <PortraitAdversaire
              personality={BOT_PERSONALITIES[botLevel(reprise.level).personality]}
              size={40}
            />
          </span>
          {/* `min-w-[14rem]` et non `min-w-0`.

              Le rang était déjà en `flex-wrap`, et il ne se repliait jamais :
              une colonne autorisée à se réduire à zéro absorbe toute la
              compression au lieu de pousser ses voisins à la ligne. Sur un
              téléphone, l'avatar et les deux boutons prenaient environ 260 des
              300 pixels utiles, et la phrase se pliait dans les quarante
              restants — un mot par ligne. Le plancher rend le repli possible. */}
          <div className="min-w-[14rem] flex-1">
            <p className="font-display text-lg font-semibold">Tu as une partie en cours</p>
            <p className="mt-0.5 text-sm text-muted">
              Contre {reprise.human ? 'Maia' : 'Stockfish'}, niveau {reprise.level} · avec les{' '}
              {reprise.playerColor === 'w' ? 'Blancs' : 'Noirs'} · {reprise.moves.length}{' '}
              demi-coups joués, {depuis(reprise.enregistreLe)}.
            </p>
          </div>
          {/* Une ligne à eux sur téléphone, leur place à droite au-delà. */}
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="primary" icon={<Play size={16} />} onClick={() => onReprendre(reprise)}>
              Reprendre
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                oublierPartieEnCours()
                // On ne recharge pas : la partie vient d'être effacée, et
                // masquer le bandeau sur-le-champ est la réponse attendue.
                location.reload()
              }}
            >
              Oublier
            </Button>
          </div>
        </Card>
      )}

      {/* ── Adversaire ─────────────────────────────────────────────── */}
      {/* ── Les deux cartes côte à côte ──────────────────────────────────
      
          L'écran demandait 1 447 pixels de haut : on ne voyait ni la cadence ni
          le bouton sans faire défiler, alors qu'il s'agit de trois choix et
          d'un clic. Empilées, les deux cartes additionnaient leurs hauteurs —
          430 et 596. Côte à côte, elles ne coûtent plus que la plus haute.
      
          Les deux cartes sont **étirées à la même hauteur**, et j'avais d'abord
          fait l'inverse. Le raisonnement était qu'elles traitent deux sujets
          distincts et n'ont donc aucune raison de s'aligner ; à l'écran, ce
          raisonnement ne tient pas. Deux encadrés côte à côte qui s'arrêtent à
          des hauteurs différentes ne se lisent pas comme deux sujets
          indépendants, ils se lisent comme un alignement raté.
      
          Le vide se déplace donc *à l'intérieur* de la carte la plus courte,
          sous son dernier réglage, là où il passe pour de la marge. C'est le
          même vide, et il ne se voit plus. */}
      <div className="mt-5 grid gap-4 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:gap-3 lg:grid-cols-2">
      <Card glow className="overflow-hidden">
        <div className="flex items-center gap-4 p-5 [@media(max-height:820px)]:p-3">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius)]"
            style={{
              background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
              boxShadow: 'var(--glow)',
            }}
            aria-hidden
          >
            <PortraitAdversaire personality={personality} size={56} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-xl font-semibold">{personality.name.fr}</h2>
              <Chip tone="accent">≈ {bot.elo} Elo</Chip>
              <Chip>Niveau {bot.level}</Chip>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{personality.blurb.fr}</p>
          </div>
        </div>

        {/*
          Les vingt-cinq niveaux s'offraient tous d'emblée : un débutant
          choisissait au hasard, tombait sur trop fort, et en concluait qu'il
          était mauvais. On montre donc où il en est, et jusqu'où il peut
          monter — sans rien interdire, la barre reste entière.
        */}
        {/*
          Le choix de l'adversaire, et non une case à cocher.
          
          « Qui vais-je affronter » est une question à deux réponses, pas une
          option à activer : une case laisse croire à un réglage accessoire
          alors que c'est ce qui change tout dans la partie.
        */}
        {maiaReady && (
          <div className="border-t border-line/60 px-5 py-4 [@media(max-height:820px)]:py-2.5">
            <p className="mb-2 text-sm font-medium">Adversaire</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[
                {
                  id: true,
                  nom: 'Maia',
                  resume: 'Joue comme un humain',
                  detail:
                    'Réseau entraîné sur des millions de parties réelles. Il se trompe comme on se trompe vraiment à ce niveau.',
                },
                {
                  id: false,
                  nom: 'Stockfish',
                  resume: 'Le moteur classique',
                  detail:
                    'Le plus fort du monde, bridé au niveau voulu. Joue juste, puis lâche un coup faible d’un coup.',
                },
              ].map((choix) => {
                // Maia écartée par le niveau reste affichée, mais éteinte et
                // non cochée : la faire disparaître laisserait croire que le
                // choix n'a jamais existé, et cocher un adversaire qui ne
                // jouera pas serait un mensonge de plus.
                const indisponible = choix.id === true && !maiaPossible
                const actif = humainRetenu === choix.id && !indisponible
                return (
                  <button
                    key={choix.nom}
                    type="button"
                    onClick={() => setHuman(choix.id)}
                    disabled={indisponible}
                    aria-pressed={actif}
                    /*
                      L'état choisi se voyait à peine : une bordure d'un pixel
                      et un fond à 10 % d'accent sur une surface déjà sombre.
                      Entre deux cartes côte à côte, l'écart tenait dans
                      quelques pour cent de luminance — on ne savait pas qui
                      l'on allait affronter.

                      Trois marques cumulées plutôt qu'une seule renforcée :
                      l'anneau double l'épaisseur du contour, le fond monte à
                      20 %, et le nom passe en couleur d'accent. Aucune ne
                      repose sur la seule teinte, ce qui laisse le choix
                      lisible en vision daltonienne comme en plein soleil.
                    */
                    className={clsx(
                      'rounded-[var(--radius-sm)] border p-3 text-left transition-colors',
                      actif
                        ? 'border-accent bg-accent/20 ring-1 ring-accent'
                        : 'border-line hover:bg-surface-hover',
                      indisponible && 'cursor-not-allowed opacity-45 hover:bg-transparent',
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span
                        className={clsx(
                          'text-sm font-semibold',
                          actif ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {choix.nom}
                      </span>
                      <span className="text-[11px] text-faint">{choix.resume}</span>
                      {/* La quatrième marque, et la seule qui se lise sans
                          comparer les deux cartes entre elles. */}
                      {actif && (
                        <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent">
                          <Check size={12} aria-hidden />
                          choisi
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {choix.detail}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Pourquoi Maia est éteinte, dit au moment où on le constate. */}
            {!maiaPossible && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Maia a appris sur des parties humaines de {MAIA_MIN_ELO} à {MAIA_MAX_ELO} Elo,
                et ne sait rien jouer en dehors. Au niveau {bot.level} ({bot.elo} Elo), c’est
                donc <strong className="font-semibold text-ink">Stockfish</strong> qui joue —
                lui se règle sur n’importe quelle force. Pour affronter Maia, choisis un niveau
                entre {premierNiveauMaia} et {dernierNiveauMaia}.
              </p>
            )}
          </div>
        )}

        {progress && progress.tracked && (
          <div className="border-t border-line/60 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <Trophy size={15} className="shrink-0 text-accent" aria-hidden />
              {progress.defeated === 0 ? (
                <span className="text-muted">
                  Aucun niveau battu pour l’instant. Commence par le premier — il apprend en
                  même temps que toi.
                </span>
              ) : (
                <span className="text-muted">
                  Plus haut niveau battu :{' '}
                  <strong className="font-semibold text-ink">{progress.defeated}</strong>{' '}
                  ({botLevel(progress.defeated).elo} Elo) · {progress.wins} victoire
                  {progress.wins > 1 ? 's' : ''} sur {progress.attempts} parties
                </span>
              )}
            </div>
            {progress.defeated < BOT_LEVELS.length && (
              <button
                type="button"
                onClick={() => setLevel(Math.min(BOT_LEVELS.length, progress.defeated + 1))}
                className="mt-1.5 text-[12px] font-semibold text-accent hover:underline"
              >
                Affronter le niveau {Math.min(BOT_LEVELS.length, progress.defeated + 1)} — le
                prochain à battre
              </button>
            )}
          </div>
        )}

        <div className="border-t border-line/60 px-5 py-4 [@media(max-height:820px)]:py-2.5">
          {/* ── Qui l'on choisit, à côté du curseur ──────────────────────
              Le portrait, le nom et l'Elo sont en tête de cette carte ; le
              curseur, lui, est tout en bas, après le choix de l'adversaire et
              le rappel de progression. Sur un téléphone, les deux ne tiennent
              pas ensemble à l'écran : on fait glisser le curseur en regardant
              un chiffre qui a disparu vers le haut, et l'on ne sait donc pas
              qui l'on est en train de choisir — ce qui est la seule question
              que pose ce réglage.

              On répète donc l'identité ici, en petit. Masqué à partir de `lg`,
              où la carte tient entière dans l'écran et où répéter reviendrait
              à dire deux fois la même chose à dix centimètres d'intervalle. */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="level" className="block text-sm font-medium">
              Niveau de difficulté
            </label>
            <span className="flex items-center gap-1.5 lg:hidden">
              <PortraitAdversaire personality={personality} size={22} />
              <span className="text-[12px] font-semibold text-ink">{personality.name.fr}</span>
              <span className="text-[12px] tabular-nums text-accent">≈ {bot.elo} Elo</span>
              <span className="text-[12px] text-faint">n°{bot.level}</span>
            </span>
          </div>
          <input
            id="level"
            type="range"
            min={1}
            max={BOT_LEVELS.length}
            step={1}
            value={level}
            onChange={(event) => setLevel(Number(event.target.value))}
            /* La barre reste fine, la zone touchable ne l'est plus.

               Le champ faisait huit points de haut : c'est la hauteur du rail,
               et c'était aussi toute la surface qu'on pouvait viser du pouce.
               On lui donne trente-deux points et l'on repeint le rail au
               centre, sans le grossir — `background-size` borne le dégradé à
               huit points de haut, `center` le pose au milieu. */
            className="h-8 w-full cursor-pointer appearance-none bg-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, var(--accent) ${((level - 1) / (BOT_LEVELS.length - 1)) * 100}%, var(--surface-strong) ${((level - 1) / (BOT_LEVELS.length - 1)) * 100}%)`,
              backgroundSize: '100% 8px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '9999px',
            }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-faint">
            <span>1 · débutant complet (100)</span>
            <span>25 · surhumain (3200)</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {/* « Je débute » vaut 1, et non 3.

                Il valait 3, c'est-à-dire 550 Elo, sur une échelle qui annonce
                100 tout en bas. Quelqu'un qui se déclare débutant appuie sur ce
                bouton et se retrouve deux crans au-dessus du plus faible
                adversaire disponible, sans savoir qu'il existe : le bouton dit
                « je débute », donc on le croit sur parole et l'on ne touche
                plus au curseur. Un préréglage nommé d'après le joueur doit
                désigner le bout de l'échelle qui lui correspond. */}
            {[
              { label: 'Je débute', level: 1 },
              { label: 'Occasionnel', level: 7 },
              { label: 'Club', level: 12 },
              { label: 'Fort', level: 18 },
              { label: 'Sans pitié', level: 25 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setLevel(preset.level)}
                className={clsx(
                  'rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors',
                  level === preset.level
                    ? 'border-accent bg-accent/15 text-ink'
                    : 'border-line text-muted hover:bg-surface-hover',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Les réglages de la partie, dans une seule carte ──────────────
      
          Ils occupaient quatre cartes empilées — couleur, commentaires, cadence
          — dans une grille à deux colonnes. Chaque carte se défendait ; leur
          somme ne se défendait plus. La colonne de gauche montait à deux fois la
          hauteur de la droite, ouvrant un vide sous la cadence, et l'on comptait
          cinq encadrés sur un écran qui pose trois questions.
      
          Une carte, trois sections séparées d'un filet. Les bordures qui
          disparaissent ne portaient aucune information : elles séparaient des
          réglages que rien ne sépare, puisqu'on les remplit tous avant de
          cliquer sur le même bouton. */}
      <Card className="divide-y divide-line/60 p-0">
        <div className="p-4 [@media(max-height:820px)]:p-2">
          <SectionTitle>Ta couleur</SectionTitle>
          <SegmentedControl
            value={color}
            onChange={setColor}
            label="Couleur"
            options={[
              { value: 'w' as const, label: '♔ Blancs' },
              { value: 'b' as const, label: '♚ Noirs' },
              { value: 'random' as const, label: '🎲 Hasard' },
            ]}
          />
          <p className="mt-2 text-xs text-faint">Les Blancs commencent. Pour apprendre, alterne.</p>
        </div>

        <div className="p-4 [@media(max-height:820px)]:p-2">
          <SectionTitle>Cadence</SectionTitle>
          {/* Récupéré de `/jouer`, où la même liste s'affichait sans être
              cliquable : une explication sert au moment du choix, pas dans un
              catalogue qu'on traverse. */}
          {/* Ramenée à un exemple. La règle générale — « le premier nombre est
              le temps de départ, le second ce que chaque coup rapporte » — se
              déduit de l'exemple, et prenait trois lignes pour le dire. */}
          <p className="-mt-1 mb-2 text-xs leading-relaxed text-muted">
            « 5 | 3 » : cinq minutes au départ, trois secondes gagnées à chaque coup.
          </p>
          {/* Quatre colonnes plutôt que trois : les huit cadences tiennent alors
              sur deux rangées pleines au lieu de trois dont une à moitié vide. */}
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_CONTROLS.filter((tc) =>
              ['180+0', '300+0', '300+3', '600+0', '600+5', '900+10', '1800+0', '0+0'].includes(
                tc.id,
              ),
            ).map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => setTimeControlId(tc.id)}
                className={clsx(
                  'rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors',
                  timeControlId === tc.id
                    ? 'border-accent bg-accent/15 text-ink'
                    : 'border-line text-muted hover:bg-surface-hover',
                )}
              >
                <span className="block">{SPEED_LABELS[tc.category].icon}</span>
                {tc.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 [@media(max-height:820px)]:p-2">
          <SectionTitle>Pendant la partie</SectionTitle>

          {/* ── Partie classée ────────────────────────────────────────────
              En tête des réglages de partie, parce qu'elle commande les deux
              autres : cochée, elle retire le mode commenté, l'indice et
              l'annulation. Ce n'est pas une punition, c'est ce qui rend le
              résultat interprétable — on ne mesure pas quelqu'un qui reprend
              ses coups et à qui l'on montre le meilleur.

              Elle est éteinte par défaut : on vient d'abord s'entraîner, et
              s'entraîner suppose de pouvoir revenir en arrière. */}
          <Toggle
            label="Partie classée"
            description={
              connecte === false
                ? 'Demande un compte : c’est lui qui porte le classement.'
                : 'Le résultat met à jour ton classement dans cette cadence. En échange, pas d’annulation, pas d’indice, pas de commentaires.'
            }
            checked={classee && connecte !== false}
            disabled={connecte === false}
            onChange={setClassee}
          />

          <div className="mt-3.5 border-t border-line/60 pt-3.5">
          {/* Descriptions resserrées. Elles faisaient trois lignes chacune et
              expliquaient le mode commenté deux fois — une fois pour l'activer,
              une fois pour l'étendre. Un réglage qu'on lit plus longtemps qu'on
              ne met à le comprendre est mal écrit. */}
            <Toggle
              label="Commenter chaque coup"
              description={
                classee
                  ? 'Indisponible en partie classée : le commentaire montre le meilleur coup.'
                  : 'Ce que vaut ton coup, les meilleures options et leur raison, lus à voix haute. Recommandé pour débuter.'
              }
              checked={commentaryMode && !classee}
              disabled={classee}
              onChange={(valeur) => setPreference('commentaryMode', valeur)}
            />

          {/* Subordonné : il n'apparaît qu'une fois le mode commenté actif.
              Le proposer avant reviendrait à offrir le détail d'une chose qu'on
              n'a pas encore choisie. */}
          {commentaryMode && !classee && (
            <div className="mt-3.5 border-t border-line/60 pt-3.5">
              <Toggle
                label="Commenter aussi l’adversaire"
                description="Deux fois plus de commentaires. Pour décortiquer une partie plutôt que la jouer."
                checked={commentaryOpponent}
                onChange={(valeur) => setPreference('commentaryOpponent', valeur)}
              />
            </div>
          )}
          </div>
        </div>
      </Card>
      </div>


      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-4 [@media(max-height:820px)]:mt-2"
        onClick={() =>
          onStart({
            level,
            color,
            timeControlId,
            human: humainRetenu,
            classee: classee && connecte === true,
          })
        }
      >
        Commencer la partie
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écran de jeu
// ─────────────────────────────────────────────────────────────────────────────

function GameScreen({
  duel,
  tournoi,
  styleImpose,
  level,
  playerColor,
  timeControlId,
  human,
  classee,
  initialMoves,
  initialClock,
  onNewGame,
  onRematch,
}: {
  /** Chapitre de carrière en cours, quand la partie en est le duel. */
  duel: Chapitre | null
  /** Vrai quand la partie est une ronde de tournoi contre l'ordinateur. */
  tournoi: boolean
  /** Style imposé par le tournoi, en dépit de celui du barème. */
  styleImpose: BotPersonalityId | null
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
  onRematch: () => void
}) {
  const prefs = usePreferences()
  const { book } = useOpeningBook()
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'

  const timeControl = useMemo<TimeControl>(() => {
    const found = TIME_CONTROLS.find((tc) => tc.id === timeControlId)
    return found ? { initial: found.initial, increment: found.increment } : { initial: 600, increment: 5 }
  }, [timeControlId])
  const timed = timeControl.initial > 0

  const [outcome, setOutcome] = useState<{
    status: GameStatus
    result: GameResult
  } | null>(null)
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null)
  /** Variation de classement d'une partie classée, une fois le serveur consulté. */
  const [variationClassement, setVariationClassement] = useState<number | null>(null)
  // Lue par les effets d'analyse, qui s'exécutent avant que `gameOver` ne soit
  // recalculé dans le corps du composant.
  const gameOverRef = useRef(false)

  // Quêtes du jour : marquées à la fin de la partie, sans jamais interrompre.
  const { marquer } = useQuotidien()

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
  const commentaryMode = prefs.commentaryMode && !classee
  const [hoveredAlternative, setHoveredAlternative] = useState<Alternative | null>(null)
  const [commentaryPaused, setCommentaryPaused] = useState(false)
  // Vrai tant que le coach prononce son commentaire. L'adversaire s'y range :
  // une explication ne vaut que si la position dont elle parle est encore à
  // l'écran quand la phrase se termine.
  const [coachSpeaking, setCoachSpeaking] = useState(false)
  // Le coup proposé reste fléché sur l'échiquier tant qu'on ne le masque pas.
  const [showBestMove, setShowBestMove] = useState(true)
  const [clock, setClock] = useState<ClockState>(() => {
    const depart = createClock(timeControl, Date.now())
    // Reprise d'une partie chronométrée : on rend à chaque camp le temps qu'il
    // lui restait. Sans cela, reprendre offrirait une pendule neuve, ce qui
    // transformerait l'interruption en avantage.
    if (!initialClock) return depart
    return { ...depart, remaining: { w: initialClock.w, b: initialClock.b } }
  })
  const [displayClock, setDisplayClock] = useState(() => remainingAt(clock, Date.now()))

  const game = useChessGame({
    initialMoves,
    onMove: (move) => {
      playMoveSound({
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
        isCastle: move.isCastle,
        isPromotion: !!move.promotion,
      })
      setHintArrow(null)
      if (timed) {
        setClock((current) =>
          applyMove(current, move.color, Date.now(), current.running === null),
        )
      }
    },
    onGameOver: (status, result) => {
      setClock((current) => stopClock(current, Date.now()))
      setOutcome({ status, result })
      const won = result === (playerColor === 'w' ? '1-0' : '0-1')
      playResultSound(result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
      recordBotGame(level, won)
      // Une partie menée jusqu'au bout compte, gagnée ou non : la quête
      // récompense d'avoir joué, pas d'avoir eu de la chance.
      marquer('partie')
      if (won) marquer('victoire')
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
    prefs.locale,
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
  const { commentary, loading: coachLoading, history: commentaryHistory } = useLiveCommentary({
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

  // ── Pendules ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timed || state.isGameOver || outcome) return
    const interval = setInterval(() => {
      const now = Date.now()
      setDisplayClock(remainingAt(clock, now))
      const flagged = flaggedColor(clock, now)
      if (flagged) {
        setClock((current) => stopClock(current, now))
        setOutcome({
          status: 'timeout',
          result: flagged === 'w' ? '0-1' : '1-0',
        })
        playResultSound(flagged === playerColor ? 'loss' : 'win')
        // Gagner au temps compte comme une victoire : c'est une partie gagnée.
        recordBotGame(level, flagged !== playerColor)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [clock, timed, state.isGameOver, outcome, playerColor])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (state.turn !== playerColor || !state.isLive) return
      play(from, to, promotion)
    },
    [play, state.turn, state.isLive, playerColor],
  )

  // Face à l'ordinateur, les LEDs prennent tout leur sens : elles montrent le
  // coup que la machine vient de jouer, à reproduire sur le plateau.
  const physicalBoard = usePhysicalBoard({
    chess: game.chess,
    fen: state.currentFen,
    isLive: state.isLive && !state.isGameOver && state.turn === playerColor,
    play: handleMove,
    lastMove: state.lastMove,
  })

  const handleHint = useCallback(async () => {
    if (state.turn !== playerColor) return
    try {
      const hint = await requestHint(state.currentFen, 16)
      if (hint) {
        // Orange, et non bleu : le bleu est déjà celui du coup conseillé par le
        // mode commenté. Deux sens pour une même couleur, c'est une couleur
        // qui n'en a plus aucun.
        setHintArrow({ from: hint.from, to: hint.to, color: 'orange', weight: 'bold' })
        playSound('notify')
      }
    } catch {
      toast.error('Impossible de calculer un indice pour le moment.')
    }
  }, [state.currentFen, state.turn, playerColor])

  const handleUndo = useCallback(() => {
    // On annule deux demi-coups : le sien et la réponse de l'ordinateur.
    const count = state.moves.length >= 2 ? 2 : 1
    undo(count)
    setOutcome(null)
    playSound('confirm')
  }, [undo, state.moves.length])

  const handleResign = useCallback(() => {
    setClock((current) => stopClock(current, Date.now()))
    setOutcome({ status: 'resign', result: playerColor === 'w' ? '0-1' : '1-0' })
    // Un abandon compte comme une tentative, jamais comme une victoire.
    recordBotGame(level, false)
    playResultSound('loss')
  }, [playerColor])

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

  /**
   * Sauvegarde de la partie en cours, après chaque coup.
   *
   * Déclenchée sur le nombre de demi-coups et non sur le tableau lui-même :
   * `state.moves` est une nouvelle référence à chaque rendu, et l'effet
   * partirait à chaque battement de pendule.
   *
   * Sans compte, l'appel n'écrit rien et ne dit rien — c'est voulu, la
   * plateforme s'utilise sans s'inscrire.
   */
  const nombreDeCoups = state.moves.length
  useEffect(() => {
    if (gameOver || nombreDeCoups === 0) return
    enregistrerPartieEnCours(
      state.moves.map((coup) => coup.san),
      {
        level,
        playerColor,
        timeControlId,
        human,
        clock: timed ? remainingAt(clock, Date.now()) : null,
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreDeCoups, gameOver])
  gameOverRef.current = gameOver

  /**
   * Archivage de la partie finie.
   *
   * Un effet plutôt que le rappel `onGameOver` : celui-ci se déclenche au fond
   * du moteur de jeu, avant que l'ouverture identifiée et la pendule n'aient
   * été recalculées pour ce rendu. Ici, tout est à jour.
   *
   * Le garde n'est pas décoratif. Le mode strict de React rejoue les effets
   * après les avoir défaits, et l'écran de fin peut se rendre plusieurs fois :
   * sans lui, la même partie serait écrite deux ou trois fois dans
   * l'historique — avec un identifiant différent à chaque fois, donc sans
   * moyen de s'en apercevoir.
   */
  const archivee = useRef(false)
  useEffect(() => {
    if (!gameOver || archivee.current) return
    const issue = outcome?.result ?? state.result
    if (issue !== '1-0' && issue !== '0-1' && issue !== '1/2-1/2') return
    if (state.moves.length === 0) return
    archivee.current = true

    /*
      Le duel de carrière annonce son issue.
      Gagnée ou perdue : une défaite alimente la série qui déclenche le coup de
      main, et c'est précisément ce qu'il ne faut pas perdre. On dépose ensuite
      les gains pour que la carte les fête au retour.
    */
    if (duel) {
      void signalerCarriere({
        type: 'partie',
        gagnee: issue === (playerColor === 'w' ? '1-0' : '0-1'),
        coups: state.moves.length,
      }).then((gains) => deposerGains(gains, duel.titre))
    }

    // Le tournoi attend son résultat : on le dépose, le tableau le déroulera
    // au retour. Le sens est celui des Blancs, comme partout ailleurs.
    if (tournoi) deposerResultat(issue)

    void archiverPartie({
      mode: 'computer',
      classee,
      moves: state.moves.map((coup) => coup.san),
      result: issue,
      status: outcome?.status ?? state.status,
      playerColor,
      opponentName: personality.name.fr,
      botLevel: level,
      initialTime: timeControl.initial,
      increment: timeControl.increment,
      eco: opening?.eco ?? null,
      opening: opening?.name ?? null,
    }).then((classement) => {
      // Rien à annoncer sur une partie d'entraînement : le serveur ne renvoie
      // de variation que pour une partie classée.
      if (classement) setVariationClassement(classement.variation)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver])

  // ── Revue des coups joués ───────────────────────────────────────────────
  //
  // Naviguer dans la liste des coups replace la position sur l'échiquier, mais
  // une position seule ne dit pas *quel* coup y a mené : on flèche donc le coup
  // consulté, et le coup que le moteur préférait si on l'a déjà calculé.
  // Les coups tels que le ruban les attend : le numéro se déduit du rang.
  const rubanCoups = useMemo(() => rubanDepuisLesCoups(state.moves), [state.moves])

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
  const reviewedCommentary = reviewedMove
    ? (commentaryHistory[reviewedMove.after] ?? null)
    : null

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
      const alternative = source?.alternatives.find((candidate) =>
        candidate.uci.startsWith(uci),
      )
      if (!alternative) return

      const san = prefs.locale === 'fr' ? sanToFrench(alternative.san) : alternative.san
      const role = alternative.played ? 'Ton coup' : `Coup conseillé (n°${alternative.rank})`

      const parts = [
        alternative.reason ?? 'Le moteur le place en tête à cette profondeur.',
        `Évaluation : ${formatScore(alternative.score, playerColor)}.`,
      ]
      if (alternative.line.length > 1) {
        parts.push(`Suite prévue : ${alternative.line.slice(0, 4).join(' ')}.`)
      }

      toast.info(`${san} — ${role}`, parts.join(' '))
      speak(`${san}. ${parts[0]}`)
    },
    [reviewedMove, reviewedCommentary, commentary, prefs.locale, playerColor],
  )

  const arrowLegend = useMemo<LegendItem[]>(() => {
    if (reviewedMove) {
      return legendFor(arrows, [
        { ...LEGEND.played, label: `${reviewedMove.san} — le coup joué` },
        { ...LEGEND.playedBad, label: `${reviewedMove.san} — erreur` },
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
   */
  const verdictDuCoup =
    commentaryMode && commentary && !commentaryStale && state.lastMove
      ? { square: state.lastMove.to, quality: commentary.quality }
      : null

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
    return {
      conseille: formatMove(meilleur.san),
      joue: formatMove(commentary.san),
      // « Le pion en d5 attaque en même temps le fou en c4 et le cavalier en
      // e4. Il est défendu par la dame en d8. » C'est ce qui manquait : on
      // montrait un coup sans jamais dire ce qu'il fait.
      pourquoi: meilleur.reason,
    }
  }, [verdictDuCoup, commentary, formatMove])

  return (
    <div className="mx-auto w-full max-w-[1500px] px-2 py-3 sm:px-4 lg:py-6">
      <div className="grid gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Colonne échiquier ────────────────────────────────────── */}
        {/*
          Sur grand écran, la zone de jeu tient dans la fenêtre : on lui donne
          une hauteur, et chaque colonne se partage ce qui reste. Un bandeau qui
          apparaît sous l'échiquier le rétrécit alors d'autant, au lieu de
          pousser les pendules et la barre d'actions hors de l'écran. En dessous
          de `lg`, les colonnes s'empilent et la page défile — c'est ce qu'on
          attend d'un téléphone.
        */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 flex-1 gap-2">
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
              <PlayerBar
                name={personality.name.fr}
                rating={bot.elo}
                color={botColor}
                avatar={personality.portrait}
                timeMs={timed ? displayClock[botColor] : null}
                timeControl={timeControl}
                active={state.turn === botColor && !gameOver}
                captured={state.material[botColor]}
                materialLead={
                  botColor === 'w' ? Math.max(0, state.material.balance) : Math.max(0, -state.material.balance)
                }
                status={
                  botPlayer.loading
                    ? 'Chargement du moteur…'
                    : botPlayer.thinking
                      ? 'réfléchit…'
                      : // Le moteur reste affiché pendant toute la partie :
                        // choisi une fois à la configuration, on l'oublie
                        // aussitôt, et l'on ne sait plus qui l'on affronte.
                        `${human ? 'Maia' : 'Stockfish'} · niveau ${bot.level}`
                }
              />

              <div className="my-1.5 flex min-h-0 flex-1 items-center justify-center">
                <ChessBoard
                  // La colonne a une hauteur imposée : c'est elle qui borne
                  // le plateau. L'estimation en `dvh` ne sert plus qu'aux
                  // petits écrans, où les colonnes s'empilent et défilent.
                  fitParentHeight
                  reservedHeight={9}
                  fen={state.fen}
                  orientation={orientation}
                  playable={state.isLive && !gameOver ? playerColor : null}
                  legalMoves={state.legalMoves}
                  onMove={handleMove}
                  lastMove={state.lastMove}
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
                  une seule fois. */}
              {verdictDuCoup && (
                <LegendeDuVerdict quality={verdictDuCoup.quality} conseil={conseilDuCoup} />
              )}

              {reviewing && (
                <div className="mb-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 px-3 py-2 text-[13px]">
                  <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug text-muted">
                    Tu revois la partie{reviewedMove ? <> — coup <strong className="font-semibold text-ink">{formatMove(reviewedMove.san)}</strong></> : null}. Rien n’est effacé.
                  </span>
                  <button
                    type="button"
                    onClick={() => goTo(state.moves.length - 1)}
                    className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
                  >
                    Retour à la partie
                  </button>
                </div>
              )}

              {studyPause && (
                <div className="mb-1.5 h-10">
                  {awaitingReview && (
                    <button
                      type="button"
                      onClick={() => setReviewedFen(state.currentFen)}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
                    >
                      <Play size={15} aria-hidden />
                      Continuer — {personality.name.fr} joue
                    </button>
                  )}
                </div>
              )}


              <PlayerBar
                name="Toi"
                color={playerColor}
                avatar="🙂"
                timeMs={timed ? displayClock[playerColor] : null}
                timeControl={timeControl}
                active={state.turn === playerColor && !gameOver}
                captured={state.material[playerColor]}
                materialLead={
                  playerColor === 'w'
                    ? Math.max(0, state.material.balance)
                    : Math.max(0, -state.material.balance)
                }
              />
            </div>
          </div>

          {/* ── Barre d'actions, grands écrans ───────────────────────
              Sous `sm`, elle cède la place au ruban et à la barre du bas, plus
              bas dans ce fichier : les mêmes actions, disposées pour un pouce
              plutôt que pour une souris. */}
          <div className="mt-3 hidden flex-wrap items-center gap-1.5 sm:flex">
            <TurnIndicator
              turn={state.turn}
              yourColor={playerColor}
              thinking={botPlayer.thinking}
              gameOver={gameOver}
              className={classee ? 'pl-1' : 'mr-auto pl-1'}
            />

            {/* Le rappel qu'elle compte.

                Sans lui, une partie classée ressemble à une partie ordinaire
                dont on aurait perdu trois boutons : on cherche « Annuler », on
                ne le trouve pas, et l'on croit à une panne. La pastille répond
                à la question avant qu'elle ne se pose. */}
            {classee && (
              <Chip tone="accent" className="mr-auto">
                <Trophy size={11} aria-hidden />
                Classée
              </Chip>
            )}

            <GameNav cursor={state.cursor} count={state.moves.length} onSeek={goTo} />

            {/* La bascule 2D / 3D, reprise ici sous `sm`.
                Sous l'échiquier, elle occupait une rangée entière pour trois
                boutons alignés à droite — quarante points de haut dont neuf
                dixièmes de vide, pris sur le plateau. Ici elle voisine avec
                des boutons. Le plein écran n'y figure pas : c'est le seul des
                trois que les navigateurs mobiles refusent le plus souvent. */}
            <ViewToggle className="sm:hidden" />

            {/* ── La sortie, une fois la partie finie ───────────────────
                Elle existait, cachée derrière les trois petits points, à côté
                de l'abandon et du mode commenté. Or c'est le moment où l'on a
                le plus besoin d'elle : la boîte de résultat refermée, tous les
                boutons de la barre se sont désactivés d'un coup, et rien ne
                dit qu'un menu contient encore quelque chose d'utile. Elles
                prennent la place de l'indice, qui n'a plus rien à conseiller
                sur une partie terminée. */}
            {gameOver ? (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<RefreshCw size={14} />}
                  onClick={onNewGame}
                >
                  <span className="max-sm:hidden">Nouvelle partie</span>
                </Button>
                <ButtonLink href="/jouer" size="sm" variant="ghost" icon={<LayoutGrid size={14} />}>
                  <span className="max-sm:hidden">Menu</span>
                </ButtonLink>
              </>
            ) : classee ? null : (
              <Button
                size="sm"
                variant="ghost"
                icon={<Lightbulb size={14} />}
                onClick={handleHint}
                disabled={state.turn !== playerColor}
                title="Demander le meilleur coup au moteur"
              >
                {/* Le libellé disparaît sous `sm` : l'icône est parlante, le
                    titre reste, et la barre tient sur une ligne au lieu de
                    trois. */}
                <span className="max-sm:hidden">Indice</span>
              </Button>
            )}
            {/* « Annuler » reste à portée directe.
                Il était parti dans le menu avec le reste, mais il ne joue pas
                dans la même catégorie : on annule un coup en cours de partie,
                souvent, alors qu'on abandonne une fois. Une action fréquente
                cachée derrière un bouton supplémentaire, c'est un geste de plus
                à chaque fois. */}
            {/* « Annuler » et « Indice » disparaissent en partie classée : ce
                sont les deux aides qui rendraient le résultat ininterprétable,
                et une case cochée avant la partie vaut mieux qu'un bouton
                grisé qu'on regarde pendant toute la partie. */}
            {!classee && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              onClick={handleUndo}
              disabled={state.moves.length === 0}
              // « Reprendre » est le terme du jeu, mais il se lit aussi
              // « reprendre la partie ». On dit donc ce que fait le bouton.
              title="Annule ton dernier coup et la réponse de l’ordinateur"
            >
              <span className="max-sm:hidden">Annuler</span>
            </Button>
            )}

            {/* Ne restent au menu que les gestes rares ou définitifs.
                Il s'ouvre vers le haut : la barre est en bas de fenêtre, un
                panneau déroulé vers le bas y sortirait du cadre. */}
            <Menu
              align="right"
              sens="haut"
              largeur="w-60"
              label="Options de la partie"
              declencheur={() => <MoreHorizontal size={16} aria-hidden />}
            >
              <button
                type="button"
                onClick={onNewGame}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />
                Nouvelle partie
              </button>
              <button
                type="button"
                onClick={handleResign}
                disabled={gameOver}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-[var(--q-blunder)] transition-colors hover:bg-surface-hover disabled:opacity-40"
              >
                <Flag size={15} className="shrink-0" aria-hidden />
                Abandonner
              </button>

              <div className="mt-1 border-t border-line/60 pt-1">
                <CommentaryToggle
                  active={commentaryMode}
                  onChange={(value) => {
                    prefs.set('commentaryMode', value)
                    // Quitter le mode commenté rend la main tout de suite : ni
                    // pause ni phrase en cours ne doivent retenir l'adversaire.
                    if (!value) {
                      setCommentaryPaused(false)
                      setCoachSpeaking(false)
                    }
                  }}
                />
              </div>
            </Menu>
          </div>

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
              <TurnIndicator
                turn={state.turn}
                yourColor={playerColor}
                thinking={botPlayer.thinking}
                gameOver={gameOver}
              />
              {classee && (
                <Chip tone="accent">
                  <Trophy size={11} aria-hidden />
                  Classée
                </Chip>
              )}
              <ViewToggle className="ml-auto" />
            </div>

            <RubanCoups
              coups={rubanCoups}
              cursor={state.cursor}
              onSeek={goTo}
              className="mt-1"
            />

            <div className="mt-1 flex items-stretch justify-around gap-1 border-t border-line/60 pt-1">
              <Menu
                align="right"
                sens="haut"
                largeur="w-60"
                label="Options de la partie"
                className="flex-1"
                declencheur={() => (
                  <span className="flex w-full flex-col items-center gap-0.5">
                    <MoreHorizontal size={19} aria-hidden />
                    <span className="text-[10px] font-medium leading-none">Options</span>
                  </span>
                )}
              >
                <button
                  type="button"
                  onClick={onNewGame}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                >
                  <RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />
                  Nouvelle partie
                </button>
                <Link
                  href="/jouer"
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                >
                  <LayoutGrid size={15} className="shrink-0 text-accent" aria-hidden />
                  Retour au menu
                </Link>
                {!classee && (
                  <div className="mt-1 border-t border-line/60 pt-1">
                    <CommentaryToggle
                      active={commentaryMode}
                      onChange={(value) => {
                        prefs.set('commentaryMode', value)
                        if (!value) {
                          setCommentaryPaused(false)
                          setCoachSpeaking(false)
                        }
                      }}
                    />
                  </div>
                )}
              </Menu>

              {gameOver ? (
                <>
                  <ActionDuPouce
                    icone={<RefreshCw size={19} aria-hidden />}
                    libelle="Rejouer"
                    onClick={onRematch}
                  />
                  <ActionDuPouce
                    icone={<LayoutGrid size={19} aria-hidden />}
                    libelle="Menu"
                    href="/jouer"
                  />
                </>
              ) : (
                <>
                  <ActionDuPouce
                    icone={<Flag size={19} aria-hidden />}
                    libelle="Abandonner"
                    onClick={handleResign}
                    danger
                  />
                  {!classee && (
                    <>
                      <ActionDuPouce
                        icone={<Lightbulb size={19} aria-hidden />}
                        libelle="Indice"
                        onClick={handleHint}
                        disabled={state.turn !== playerColor}
                      />
                      <ActionDuPouce
                        icone={<Undo2 size={19} aria-hidden />}
                        libelle="Annuler"
                        onClick={handleUndo}
                        disabled={state.moves.length === 0}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Colonne latérale ─────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col gap-3">
          <OpeningBanner opening={opening} moveCount={state.moves.length} />

          <CommentaryPanel
              legende={arrowLegend}
            // Pas de commentaire demandé, pas de voix : le panneau reste
            // consultable, mais il ne prend plus la parole tout seul.
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
          />

          <ApprofondirCoup
            commentary={reviewedMove ? reviewedCommentary : commentary}
            openingName={opening?.name ?? null}
          />

          <PhysicalBoardPanel state={physicalBoard} />

          {/* Sur téléphone, la liste se règle sur ce qu'elle contient, sans
              descendre plus bas que 45 % de la fenêtre. Elle réservait 220 px
              dès le premier coup : sous l'échiquier, cela faisait un cadre
              presque vide qui repoussait tout le reste hors de l'écran. Sur
              grand écran, la colonne est calée sur la fenêtre et c'est elle qui
              occupe la place restante — d'où le `flex-1` à partir de `lg`. */}
          <Card className="flex max-h-[45vh] flex-col overflow-hidden lg:max-h-none lg:min-h-[220px] lg:flex-1">
            <MoveList
              moves={state.moves}
              cursor={state.cursor}
              onSeek={goTo}
              className="min-h-0 flex-1"
            />
          </Card>

          {botPlayer.error && (
            <Card className="border-[var(--q-blunder)]/50 p-3 text-sm text-[var(--q-blunder)]">
              {botPlayer.error}
            </Card>
          )}
        </div>
      </div>

      {gameOver && (
        <GameOverDialog
          status={outcome?.status ?? state.status}
          result={outcome?.result ?? state.result}
          retour={
            duel
              ? { href: '/carriere', libelle: `Retour au chapitre ${duel.numero}` }
              : tournoi
                ? { href: '/tournois/ordinateur', libelle: 'Retour au tournoi' }
                : undefined
          }
          playerColor={playerColor}
          opponentName={personality.name.fr}
          moves={state.moves}
          ratingDelta={variationClassement}
          onRematch={onRematch}
          onNewGame={onNewGame}
        />
      )}
    </div>
  )
}

/** Ce que l'API de progression renvoie. */
interface Progression {
  defeated: number
  unlocked: number
  attempts: number
  wins: number
  tracked: boolean
}

/**
 * Enregistre une partie terminée contre l'ordinateur.
 *
 * Appelé au moment où la partie s'achève, et jamais bloquant : une progression
 * qu'on n'a pas pu écrire ne doit pas empêcher de voir son résultat.
 */
export function recordBotGame(level: number, won: boolean): void {
  void fetch('/api/progression', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level, won }),
  }).catch(() => {
    // Hors ligne ou sans compte : la partie reste jouée, simplement pas comptée.
  })
}

/**
 * Une case de la barre du pouce.
 *
 * Icône au-dessus, mot en dessous, largeur égale : c'est ce qui permet de
 * viser sans regarder. Un bouton de texte, même bien espacé, demande de lire
 * avant de toucher — et pendant une partie on regarde l'échiquier.
 *
 * Elle rend un lien quand on lui donne une adresse, un bouton sinon : les deux
 * se ressemblent à l'écran et n'ont rien à voir pour le navigateur, qui doit
 * pouvoir ouvrir une destination dans un nouvel onglet.
 */
function ActionDuPouce({
  icone,
  libelle,
  onClick,
  href,
  disabled,
  danger,
}: {
  icone: React.ReactNode
  libelle: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** Une action qu'on ne défait pas : l'abandon. */
  danger?: boolean
}) {
  const classe = clsx(
    'flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5',
    'text-[10px] font-medium transition-colors',
    disabled
      ? 'pointer-events-none text-faint opacity-40'
      : danger
        ? 'text-[var(--q-blunder)] hover:bg-surface-hover'
        : 'text-muted hover:bg-surface-hover hover:text-ink',
  )

  if (href) {
    return (
      <Link href={href} className={classe}>
        {icone}
        <span className="leading-none">{libelle}</span>
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classe}>
      {icone}
      <span className="leading-none">{libelle}</span>
    </button>
  )
}

/**
 * Ce que dit la pastille posée sur la case d'arrivée, écrit.
 *
 * Le libellé suffit à la plupart — « Théorie », « Gaffe » — et la phrase qui
 * suit répond à la question d'après, « et alors ? ». Elle disparaît sous
 * 640 px, où la largeur ne permet pas les deux sans repousser l'échiquier.
 */
function LegendeDuVerdict({
  quality,
  conseil,
}: {
  quality: MoveQuality
  /** Le coup qu'il fallait jouer, celui qu'on a joué, et ce que le premier fait. */
  conseil?: { conseille: string; joue: string; pourquoi?: string | null } | null
}) {
  const style = QUALITY_STYLES[quality]
  const teinte = `var(--q-${style.token})`

  return (
    <div className="mb-1.5">
      <p
        className="flex items-baseline gap-1.5 text-[13px] leading-snug"
        style={{ color: teinte }}
      >
        <span aria-hidden>{style.glyph}</span>
        <span className="font-semibold">{style.label.fr}</span>
        <span className="hidden min-w-0 flex-1 truncate font-normal text-muted sm:inline">
          {style.description.fr}
        </span>
      </p>

      {/* Visible à toutes les tailles, contrairement à la description : c'est
          la clé de lecture de la flèche bleue, et elle manque surtout là où
          l'écran est petit. */}
      {conseil && (
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Il fallait jouer{' '}
          <strong className="font-semibold text-accent">{conseil.conseille}</strong> au lieu de{' '}
          <strong className="font-semibold text-ink">{conseil.joue}</strong> — la flèche bleue
          montre ce coup-là dans la position d’avant, pas un coup à jouer maintenant.
          {/* Et ce qu'il faisait. Sans cette phrase, on regarde un coup dont on
              ne comprend pas l'intérêt, et l'on n'apprend rien — la
              justification vaut mieux que le verdict. */}
          {conseil.pourquoi && <span className="text-ink"> {conseil.pourquoi}</span>}
        </p>
      )}
    </div>
  )
}
