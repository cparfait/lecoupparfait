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
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
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
import clsx from 'clsx'
import { GameNav } from '@/components/game/GameNav.tsx'
import { RubanCoups, rubanDepuisLesCoups } from '@/components/game/RubanCoups.tsx'
import { useSan } from '@/lib/notation.ts'
import { Chess } from 'chess.js'
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
  niveauProche,
  createClock,
  flaggedColor,
  formatScore,
  normalizeTimeControlId,
  resultatAuDrapeau,
  sanToSpeech,
  remainingAt,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { CarteAdversaire } from '@/components/brand/CarteAdversaire.tsx'
import { ChessBoard, ViewToggle } from '@/components/board/ChessBoard.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import { EvalBar } from '@/components/game/EvalBar.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { ApprofondirCoup } from '@/components/ia/ApprofondirCoup.tsx'
import { Menu, MenuItem } from '@/components/ui/Menu.tsx'
import { Defilement } from '@/components/ui/Defilement.tsx'
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
import { noterSeance, releverLeTheme, seanceDeLUrl, type Seance } from '@/lib/game/seance.ts'
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
  annoncerPartieClassee,
  chargerPartieEnCours,
  depuis,
  archiverPartie,
  enregistrerPartieEnCours,
  oublierPartieEnCours,
  type PartieEnCours,
} from '@/lib/game/partieEnCours.ts'
import { requestHint, useBotPlayer } from '@/lib/game/useBotPlayer.ts'
import { usePrecoup } from '@/lib/game/usePrecoup.ts'
import {
  chapitreDeLUrl,
  deposerGains,
  signaler as signalerCarriere,
} from '@/lib/carriere/useCarriere.ts'
import { deposerResultat } from '@/lib/game/tournoiSolo.ts'
import {
  QUALITY_STYLES,
  chapitre as chapitreCarriere,
  niveauEffectif,
  type BotPersonalityId,
  type Chapitre,
  type MoveQuality,
} from '@coupparfait/core'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound, playSound } from '@/lib/sound.ts'
import { localeDuContenu } from '@/lib/i18n/dictionary.ts'
import { langue, useI18n } from '@/lib/i18n/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { usePreferences, usePreferencesDe } from '@/lib/store/preferences.ts'
import { speak } from '@/lib/speech.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { useFetchJson } from '@/lib/useFetchJson.ts'
import { useGrandEcran } from '@/lib/useMediaQuery.ts'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

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
  const t = useT()
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
   * Arrivé par une séance pédagogique : même parti pris que la carrière.
   *
   * L'écran de préparation a déjà répondu aux deux seules questions qui
   * comptent — à quel palier, sur quel thème — et il en a déduit le niveau de
   * l'adversaire. Repasser par le curseur de 1 à 25 annulerait exactement ce
   * que la séance venait d'épargner.
   *
   * `commente` voyage à part plutôt que d'écrire dans les préférences : allumer
   * le mode commenté pour une séance ne doit pas changer le réglage de
   * quelqu'un pour toutes ses parties suivantes. Voir son traitement dans
   * `GameScreen`.
   */
  const [seance, setSeance] = useState<Seance | null>(null)
  const [seanceCommentee, setSeanceCommentee] = useState(false)
  const seanceLancee = useRef(false)
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
  /**
   * L'adversaire demandé depuis sa fiche.
   *
   * `?perso=` n'était lu que dans l'effet du tournoi, derrière son
   * `if (tournoi !== '1') return` : arriver ici par « Jouer contre Mirage »
   * ignorait donc le paramètre en silence, et l'on tombait sur la personnalité
   * du niveau conseillé — Pion, la plupart du temps. La promesse du bouton
   * n'était pas tenue, et rien ne disait pourquoi.
   *
   * Il ne force pas un style par-dessus un niveau : il **choisit le niveau**
   * qui porte cette personnalité, au plus près de celui qu'on jouerait sinon.
   * C'est la seule façon d'être cohérent — le portrait, l'Elo annoncé et le
   * style viennent tous du niveau, et les faire diverger produirait un Pion de
   * 2 250 Elo qui joue comme Mirage.
   */
  const [persoDemande, setPersoDemande] = useState<BotPersonalityId | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tournoi') === '1') return
    const perso = params.get('perso')
    if (perso && perso in BOT_PERSONALITIES) setPersoDemande(perso as BotPersonalityId)
  }, [])
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
      // Même piège que pour la partie en direct : `+` se décode en espace.
      timeControlId: normalizeTimeControlId(params.get('tc') ?? '600+5'),
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
      setSetup({
        level: niveau,
        color: 'random',
        timeControlId: '600+5',
        human: false,
        classee: false,
      })
      setResolvedColor(Math.random() < 0.5 ? 'w' : 'b')
      setCoupsRepris(undefined)
      setHorlogeReprise(null)
      oublierPartieEnCours()
      setGameKey((key) => key + 1)
      setPhase('playing')
      playSound('start')
    }
  }, [])

  useEffect(() => {
    if (seanceLancee.current) return
    const demandee = seanceDeLUrl(window.location.search)
    if (!demandee) return

    seanceLancee.current = true
    setSeance(demandee)
    setSeanceCommentee(new URLSearchParams(window.location.search).get('commente') === '1')

    setSetup({
      level: demandee.palier.niveauBot,
      color: 'random',
      timeControlId: '600+5',
      // Stockfish et non Maia : la séance annonce une force en Elo, et c'est le
      // barème des niveaux qui la garantit.
      human: false,
      // Jamais classée, et pour la même raison que le duel de carrière : on y
      // joue avec le mode commenté allumé, c'est-à-dire avec le moteur qui
      // montre le meilleur coup. Porter cela au classement n'aurait aucun sens.
      classee: false,
    })
    setResolvedColor(Math.random() < 0.5 ? 'w' : 'b')
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  /**
   * Position composée dans l'éditeur, transmise par l'adresse.
   *
   * L'éditeur proposait « La jouer contre l'ordinateur » et pointait ici avec
   * `?fen=…`. Le paramètre n'était lu nulle part : on composait sa position, on
   * cliquait, et l'on tombait sur une partie qui commençait au coup un. Sans un
   * mot — le pire des cas, puisqu'on ne sait pas si l'on a mal fait ou si c'est
   * cassé.
   *
   * Comme la carrière et le tournoi, on saute l'écran de réglages : quelqu'un
   * qui vient de poser vingt pièces à la main a déjà répondu à la seule
   * question qui compte. La couleur, elle, n'est plus un choix — c'est le trait
   * de la position qui la donne.
   *
   * **Jamais classée** : une position fabriquée n'est pas une partie, et rien
   * n'empêcherait d'y composer une dame de plus.
   */
  const [fenImposee, setFenImposee] = useState<string | null>(null)
  const fenLancee = useRef(false)
  useEffect(() => {
    if (fenLancee.current) return
    const brut = new URLSearchParams(window.location.search).get('fen')
    if (!brut) return

    // Le paramètre n'est lu qu'une fois, quoi qu'il en sorte. Marqué après le
    // refus comme après l'acceptation : en développement, React monte deux fois,
    // et une garde posée seulement sur la réussite affichait le message d'erreur
    // en double.
    fenLancee.current = true

    // Une position illisible est ignorée plutôt qu'affichée : un plateau vide
    // sur lequel rien ne répond serait plus déroutant qu'un départ ordinaire.
    let position: string
    try {
      position = new Chess(brut).fen()
    } catch {
      toast.error(t('computer.badFen'), t('computer.badFenHint'))
      return
    }

    setFenImposee(position)
    setSetup((actuel) => ({
      ...actuel,
      color: position.split(' ')[1] === 'b' ? 'b' : 'w',
      classee: false,
    }))
    setResolvedColor(position.split(' ')[1] === 'b' ? 'b' : 'w')
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
    // `t` : le message de position illisible, au début du même effet.
  }, [t])

  /**
   * Le curseur a-t-il déjà été arbitré par le joueur ?
   *
   * Tant que non, l'écran de réglages le pose sur le dernier niveau battu :
   * c'est la seule valeur de départ qui veuille dire quelque chose, et elle
   * évite de faire redescendre le curseur à chaque visite. Dès qu'une partie a
   * été lancée ou reprise, le niveau retenu est un choix : on le garde tel
   * quel, et la suggestion ne repasse plus derrière.
   */
  const niveauArbitre = useRef(false)

  const start = useCallback((next: Setup) => {
    niveauArbitre.current = true
    setSetup(next)
    setResolvedColor(next.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : next.color)
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
    niveauArbitre.current = true
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
        suggererNiveau={!niveauArbitre.current}
        personnaliteVoulue={persoDemande}
      />
    )
  }

  return (
    <GameScreen
      key={gameKey}
      duel={duel}
      seance={seance}
      seanceCommentee={seanceCommentee}
      startFen={fenImposee}
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

/**
 * La teinte de chaque adversaire, prise sur la matière de sa sculpture.
 *
 * Ivoire pour le bois pâle de Pion, feu pour le bronze fendu de Brasier,
 * ardoise pour le granit de Rempart, glace pour le cristal d'Éclair, laiton
 * pour Boussole, eau pour le verre de Mirage, nuit pour l'obsidienne
 * d'Oracle. Des valeurs littérales, et c'est voulu : ces couleurs viennent
 * des portraits, qui ne changent pas avec le thème.
 */
const TEINTES_ADVERSAIRES: Record<BotPersonalityId, string> = {
  novice: '#e9d9b6',
  fonceur: '#ff7a3c',
  prudent: '#8aa0b8',
  tacticien: '#8fd8ff',
  positionnel: '#e2b84a',
  gambiteur: '#2fd1c8',
  machine: '#7c5cff',
}

function SetupScreen({
  initial,
  onStart,
  reprise,
  onReprendre,
  suggererNiveau = false,
  personnaliteVoulue = null,
}: {
  initial: Setup
  onStart: (setup: Setup) => void
  /** Partie interrompue à reprendre, `null` s'il n'y en a pas. */
  reprise: PartieEnCours | null
  onReprendre: (partie: PartieEnCours) => void
  /**
   * Poser le curseur sur le dernier niveau battu dès que la progression arrive.
   *
   * Faux dès qu'une partie a été lancée dans la session : le niveau affiché est
   * alors celui qu'on vient de choisir, et le remplacer serait défaire un choix.
   */
  suggererNiveau?: boolean
  /**
   * L'adversaire demandé depuis sa fiche, s'il y en a un.
   *
   * Il contraint le niveau de départ — et lui seul : le curseur reste libre,
   * et le déplacer change d'adversaire comme d'habitude. Une barre qui
   * refuserait de sortir des paliers de Mirage serait une barre cassée.
   */
  personnaliteVoulue?: BotPersonalityId | null
}) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  /* La langue du **contenu** pour les sept adversaires : leurs noms et leurs
     phrases sont écrits dans le cœur, qui ne les produit qu'en français et en
     anglais. Voir `localeDuContenu`. */
  const [level, setLevel] = useState(() =>
    personnaliteVoulue ? niveauProche(personnaliteVoulue, initial.level) : initial.level,
  )
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
  // `useIdentite` partage l'appel avec le reste de l'interface : l'en-tête, le
  // guetteur de défis et cet écran en faisaient trois, à chaque navigation.
  const identite = useIdentite()
  const connecte = identite === undefined ? null : identite !== null

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
  // `useFetchJson` porte l'abandon au démontage : ces trois appels partaient
  // au montage et posaient leur état sans se demander si l'écran existait
  // encore. Voir `lib/useFetchJson.ts`.
  const sante = useFetchJson<{ maia?: boolean }>('/api/sante')
  const maiaReady = sante.data?.maia === true

  /** Où en est le joueur dans l'échelle. `null` tant qu'on ne sait pas. */
  const { data: progress } = useFetchJson<Progression>('/api/progression')

  /**
   * Le curseur part du dernier niveau battu.
   *
   * Il partait de six, c'est-à-dire d'un nombre choisi une fois pour tous : pour
   * qui a déjà battu le niveau onze, c'est cinq crans à remonter à la main avant
   * chaque partie ; pour qui n'a encore rien battu, c'est un adversaire six fois
   * trop fort. La progression est justement la seule chose que l'application
   * sache de la force du joueur — autant s'en servir comme point de départ.
   *
   * Le *dernier battu* et non le suivant : le curseur propose ce qu'on sait
   * faire, et le bouton juste au-dessus propose de monter d'un cran. Deux
   * choses différentes, laissées toutes deux à un clic.
   *
   * `toucheRef` protège la course : la progression arrive du réseau, et il ne
   * faut pas qu'elle vienne écraser un curseur déjà déplacé entre-temps.
   */
  const toucheRef = useRef(false)
  const choisirNiveau = useCallback((valeur: number) => {
    toucheRef.current = true
    setLevel(valeur)
  }, [])

  /**
   * L'adversaire demandé arrive après le premier rendu.
   *
   * Il est lu dans l'adresse, donc dans un effet du composant parent : au
   * moment où l'état initial du curseur est calculé, il vaut encore `null`.
   * L'initialisateur de `useState` ne se rejoue pas — d'où cet effet, qui pose
   * le niveau une fois et une seule, et jamais par-dessus un curseur déjà
   * déplacé à la main.
   */
  const persoApplique = useRef(false)
  useEffect(() => {
    if (!personnaliteVoulue || persoApplique.current || toucheRef.current) return
    persoApplique.current = true
    setLevel((actuel) => niveauProche(personnaliteVoulue, actuel))
  }, [personnaliteVoulue])
  useEffect(() => {
    if (!suggererNiveau || toucheRef.current) return
    if (!progress?.tracked || progress.defeated < 1) return
    const habituel = Math.min(BOT_LEVELS.length, progress.defeated)
    // Venu d'une fiche, on garde l'adversaire demandé et l'on approche
    // seulement la force habituelle : la progression ne doit pas défaire le
    // clic sur « Jouer contre Mirage ».
    setLevel(personnaliteVoulue ? niveauProche(personnaliteVoulue, habituel) : habituel)
  }, [progress, suggererNiveau, personnaliteVoulue])

  const bot = botLevel(level)
  const personality = BOT_PERSONALITIES[bot.personality]
  /** Position du curseur sur la barre, de 0 à 100. */
  const pourcentNiveau = ((level - 1) / (BOT_LEVELS.length - 1)) * 100

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

  /**
   * Les sept personnalités, dans l'ordre où l'échelle les fait apparaître.
   *
   * C'est par elles qu'on choisit d'abord : « Pion », « Boussole », « Mirage »
   * disent un adversaire, là où « niveau 12 » ne dit qu'un rang. Elles ne
   * couvrent pas chacune une tranche : les niveaux les entremêlent — Pion aux
   * niveaux 1, 2, 3 et 6, Brasier aux 4, 7 et 14. Une fourchette d'Elo par
   * vignette mentait donc deux fois, en se chevauchant avec la voisine et en
   * laissant croire qu'on choisirait dans cette fourchette. Chaque vignette
   * annonce à la place le niveau qu'elle donnerait *maintenant* : le plus
   * proche du curseur, celui que le clic pose réellement.
   */
  const personnalites = useMemo(() => {
    const vues: BotPersonalityId[] = []
    for (const niveau of BOT_LEVELS) {
      if (!vues.includes(niveau.personality)) vues.push(niveau.personality)
    }
    return vues.map((id) => ({ id, personnalite: BOT_PERSONALITIES[id] }))
  }, [])

  /**
   * La vignette de l'adversaire en cours reste sous les yeux.
   *
   * La rangée défile : venu d'une fiche — « Jouer contre Mirage » — ou revenu
   * sur un niveau élevé, l'adversaire choisi était hors champ, et la rangée
   * montrait Pion et Brasier avec l'air de n'avoir rien sélectionné. On fait
   * défiler la rangée seule, jamais la page : centrer par `scrollIntoView`
   * aurait aussi déplacé le document.
   */
  const rangeePersonnalites = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rangee = rangeePersonnalites.current
    const actif = rangee?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!rangee || !actif) return
    // D'un coup, sans animation : un défilement animé lancé pendant que la
    // page finit de se construire est interrompu à mi-course par le premier
    // rendu suivant, et la vignette restait à moitié hors champ.
    rangee.scrollLeft = actif.offsetLeft - (rangee.clientWidth - actif.offsetWidth) / 2
  }, [bot.personality])

  const teinteCourante = TEINTES_ADVERSAIRES[bot.personality]

  /**
   * Le rail du curseur : vingt-cinq segments, un par niveau, dans la teinte
   * de l'adversaire qui le joue. Ceux déjà parcourus gardent leur couleur ;
   * les autres s'éteignent à trente pour cent, assez pour lire l'échelle,
   * pas assez pour disputer l'attention au pouce.
   */
  const rail = BOT_LEVELS.map((niveau, index) => {
    const teinte = TEINTES_ADVERSAIRES[niveau.personality]
    const couleur =
      niveau.level <= level ? teinte : `color-mix(in oklab, ${teinte} 30%, var(--surface-strong))`
    const debut = ((index / BOT_LEVELS.length) * 100).toFixed(2)
    const fin = (((index + 1) / BOT_LEVELS.length) * 100).toFixed(2)
    return `${couleur} ${debut}% ${fin}%`
  }).join(', ')

  const cadence = TIME_CONTROLS.find((tc) => tc.id === timeControlId)
  const couleurChoisie =
    color === 'w'
      ? t('settings.white')
      : color === 'b'
        ? t('settings.black')
        : t('computer.randomColour')

  return (
    /* Une seule colonne, trois pas, et un résumé qui suit.

       L'écran a été deux cartes côte à côte, resserrées quand la fenêtre
       était basse, pour que le bouton « Commencer la partie » reste visible
       sans défiler. Il ne l'était toujours pas partout, et l'on empilait des
       cartes dans des cartes — l'adversaire dans le portrait, le curseur sous
       l'adversaire, les cadences sous la couleur — jusqu'à trois niveaux de
       liseré. On ne savait plus par où commencer.

       Trois pas numérotés se lisent de haut en bas : qui l'on affronte, dans
       quelles conditions, avec quelles aides. Le bouton, lui, ne se cherche
       plus : il est collé au bas de la fenêtre avec le résumé de ce qu'on a
       choisi, et il y reste quelle que soit la hauteur de l'écran. */
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-6 sm:px-6 lg:pt-8">
      <Link
        href="/jouer"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        {t('computer.back')}
      </Link>

      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('nav.vsComputer')}
      </h1>
      <p className="mt-1.5 text-muted">{t('computer.intro')}</p>

      {/* ── Reprendre ──────────────────────────────────────────────────
          En tête, avant les réglages : quelqu'un qui a une partie en cours
          vient presque toujours pour elle. La lui faire chercher sous le
          formulaire reviendrait à lui demander de reconfigurer ce qu'il a
          déjà choisi. */}
      {reprise && (
        <Card glow className="mt-6 flex flex-wrap items-center gap-4 p-5">
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
          {/* `min-w-[14rem]` et non `min-w-0` : une colonne autorisée à se
              réduire à zéro absorbe toute la compression au lieu de pousser
              ses voisins à la ligne, et la phrase se pliait à un mot par
              ligne sur téléphone. Le plancher rend le repli possible. */}
          <div className="min-w-[14rem] flex-1">
            <p className="font-display text-lg font-semibold">{t('computer.resume')}</p>
            <p className="mt-0.5 text-sm text-muted">
              {t('computer.resumeDetail', {
                moteur: reprise.human ? 'Maia' : 'Stockfish',
                niveau: reprise.level,
                couleur: reprise.playerColor === 'w' ? t('settings.white') : t('settings.black'),
                coups: reprise.moves.length,
                depuis: depuis(reprise.enregistreLe, bcp47, t),
              })}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="primary"
              icon={<Play size={16} />}
              onClick={() => onReprendre(reprise)}
            >
              {t('learn.resume')}
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
              {t('computer.forget')}
            </Button>
          </div>
        </Card>
      )}

      {/* ── 1. L'adversaire ────────────────────────────────────────────── */}
      <Etape numero={1} titre={t('computer.step1')}>
        {/* Les personnalités défilent sur une rangée : sept vignettes, une
            par adversaire, et l'on voit d'un coup d'œil l'échelle entière.
            Choisir une vignette pose le curseur sur le niveau le plus proche
            de sa tranche — le curseur, en dessous, sert au réglage fin. */}
        <Defilement
          ref={rangeePersonnalites}
          className="-mx-4 sm:-mx-6"
          /* De l'air au-dessus et en dessous : les cartes se soulèvent et
             s'inclinent au survol, et la rangée, qui défile, couperait ce
             qui dépasse. */
          classeRangee="gap-3 px-4 py-3 sm:px-6"
          role="radiogroup"
          label={t('computer.opponentGroup')}
        >
          {personnalites.map((entree) => {
            const actif = entree.id === bot.personality
            /* Le niveau que le clic poserait, et son Elo : c'est ce que la
               vignette promet, et c'est ce qu'elle tient. */
            const cible = actif ? level : niveauProche(entree.id, level)
            return (
              <CarteAdversaire
                key={entree.id}
                personnalite={entree.personnalite}
                teinte={TEINTES_ADVERSAIRES[entree.id]}
                actif={actif}
                elo={botLevel(cible).elo}
                niveau={cible}
                onClick={() => choisirNiveau(cible)}
              />
            )
          })}
        </Defilement>

        {/* L'adversaire retenu, en une ligne : le portrait en grand, le nom,
            l'Elo, et sa phrase. C'est ce que le curseur fait changer, et
            c'est juste au-dessus de lui. */}
        <div className="mt-4 flex items-center gap-4">
          {/* Le portrait retenu, sous le même projecteur que sa carte. */}
          <span
            className="relative grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border"
            style={{
              background: `radial-gradient(70% 55% at 50% 20%, color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 55%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 26%, var(--surface)), color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 6%, var(--bg-elev)) 70%)`,
              borderColor: `color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 50%, var(--border))`,
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.18), 0 12px 28px -14px color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 70%, black)`,
            }}
            aria-hidden
          >
            <span
              style={{
                filter: `drop-shadow(0 10px 12px color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 65%, transparent))`,
              }}
            >
              <PortraitAdversaire personality={personality} size={60} />
            </span>
          </span>
          {/* Tout ce bloc change avec le curseur, et le curseur est juste en
              dessous : sa hauteur ne doit pas dépendre de l'adversaire, sinon
              la page saute d'un cran à l'autre et le pouce perd sa cible.
              Deux précautions donc. Le nom et les puces ne partagent une
              ligne qu'à partir de `sm` — sur téléphone, « Boussole · 1550 Elo
              · Niveau 10 » débordait et passait sur deux lignes, « Pion · 250
              · Niveau 2 » non. Et la phrase réserve ses lignes en unités de
              ligne : trois sur téléphone, deux au-delà, ce que demande la
              plus longue des sept. */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
              <h3 className="font-display text-xl font-semibold leading-tight">
                {tCoeur(t, personality.name)}
              </h3>
              <span className="flex flex-wrap gap-2">
                <Chip tone="accent">≈ {bot.elo} Elo</Chip>
                <Chip>Niveau {bot.level}</Chip>
              </span>
            </div>
            <p className="mt-1 min-h-[3lh] text-sm leading-relaxed text-muted sm:min-h-[2lh]">
              {tCoeur(t, personality.blurb)}
            </p>
          </div>
        </div>

        {/* ── Le curseur, et le repère qui suit le pouce ──────────────────
            Vingt-cinq crans, un par niveau, plus haut tous les cinq. Le
            repère se cale sur la position du pouce : un pouce mesure 22 px,
            son centre ne parcourt pas toute la largeur mais celle-ci moins
            sa propre taille, d'où la correction de onze pixels sur chaque
            bord. Le même décalage borne la graduation en dessous. */}
        <div className="mt-4">
          <label htmlFor="level" className="block text-sm font-medium">
            {t('bits.fineLevel')}
          </label>
          {/* Le repère prend la teinte de l'adversaire, éclaircie pour que
              l'encre reste lisible sur toutes les matières. */}
          <div className="relative mt-1 h-5">
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#101018] transition-[left,background-color] duration-150"
              style={{
                left: `calc(${pourcentNiveau}% + ${14 - pourcentNiveau * 0.28}px)`,
                background: `color-mix(in oklab, ${teinteCourante} 80%, white)`,
                boxShadow: `0 0 14px -2px ${teinteCourante}`,
              }}
              aria-hidden
            >
              {bot.level} · {tCoeur(t, personality.name)}
            </span>
          </div>
          {/* ── Le rail, peint adversaire par adversaire ───────────────────
              Un segment par niveau dans la teinte de la sculpture qui le joue :
              on voit d'un coup d'œil où Pion cède la place à Brasier, et où
              Oracle commence. La portion parcourue garde ses couleurs
              franches ; le reste s'éteint, sans disparaître. Le pouce porte le
              portrait de l'adversaire courant — voir `.curseur-adversaires`. */}
          <input
            id="level"
            type="range"
            min={1}
            max={BOT_LEVELS.length}
            step={1}
            value={level}
            onChange={(event) => choisirNiveau(Number(event.target.value))}
            /* La barre reste fine, la zone touchable ne l'est plus : le champ
               fait trente-deux points de haut et le rail est repeint au
               centre, sur huit. */
            className="curseur-adversaires h-8 w-full cursor-pointer appearance-none bg-transparent"
            style={
              {
                '--pouce-image': `url('${personality.portrait}')`,
                '--pouce-teinte': teinteCourante,
                backgroundImage: `linear-gradient(180deg, rgb(255 255 255 / 0.18), transparent 55%), linear-gradient(to right, ${rail})`,
                backgroundSize: '100% 8px',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '9999px',
              } as React.CSSProperties
            }
          />
          <div className="mx-[14px] flex items-end justify-between" aria-hidden>
            {BOT_LEVELS.map((niveau) => {
              const jalon = niveau.level === 1 || niveau.level % 5 === 0
              return (
                <span
                  key={niveau.level}
                  className={clsx('w-px rounded-full', jalon ? 'h-2' : 'h-1')}
                  style={{
                    background:
                      niveau.level <= level
                        ? TEINTES_ADVERSAIRES[niveau.personality]
                        : `color-mix(in oklab, ${TEINTES_ADVERSAIRES[niveau.personality]} 35%, var(--border-strong))`,
                  }}
                />
              )
            })}
          </div>
          {/* Les nombres sont posés à leur position réelle, et non répartis :
              quatre crans séparent 1 de 5, cinq les suivants. */}
          <div className="relative mx-[14px] mt-0.5 h-3.5" aria-hidden>
            {[1, 5, 10, 15, 20, 25].map((jalon) => (
              <span
                key={jalon}
                className="absolute -translate-x-1/2 text-[12px] tabular-nums text-faint"
                style={{ left: `${((jalon - 1) / (BOT_LEVELS.length - 1)) * 100}%` }}
              >
                {jalon}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-faint">
            <span>{t('computer.scaleLow')}</span>
            <span>{t('computer.scaleHigh')}</span>
          </div>

          {/* Cinq raccourcis nommés d'après le joueur. « Je débute » vaut 1 :
              un préréglage nommé d'après le joueur doit désigner le bout de
              l'échelle qui lui correspond, pas deux crans au-dessus. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: t('computer.presetBeginner'), level: 1 },
              { label: t('computer.presetCasual'), level: 7 },
              { label: t('computer.presetClub'), level: 12 },
              { label: t('computer.presetStrong'), level: 18 },
              { label: t('computer.presetRuthless'), level: 25 },
            ].map((preset) => {
              /* Chaque raccourci porte la teinte de l'adversaire qu'il
                 désigne : le chip « Fort » est du bronze parce que c'est
                 Brasier qui attend au niveau 18. */
              const teinte = TEINTES_ADVERSAIRES[botLevel(preset.level).personality]
              const choisi = level === preset.level
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => choisirNiveau(preset.level)}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-[background-color,box-shadow,color]',
                    choisi ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                  style={{
                    background: `color-mix(in oklab, ${teinte} ${choisi ? 30 : 10}%, var(--surface))`,
                    borderColor: choisi
                      ? 'var(--accent)'
                      : `color-mix(in oklab, ${teinte} 40%, var(--border))`,
                    boxShadow: choisi ? `0 0 16px -4px ${teinte}` : undefined,
                  }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {progress && progress.tracked && (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
            <Trophy size={15} className="shrink-0 text-accent" aria-hidden />
            {progress.defeated === 0 ? (
              <span>{t('computer.noneBeaten')}</span>
            ) : (
              <span>
                {t('computer.bestBeaten')}{' '}
                <strong className="font-semibold text-ink">{progress.defeated}</strong> (
                {botLevel(progress.defeated).elo} Elo) ·{' '}
                {t(progress.wins > 1 ? 'computer.winsOf' : 'computer.oneWinOf', {
                  victoires: progress.wins,
                  parties: progress.attempts,
                })}
              </span>
            )}
            {progress.defeated < BOT_LEVELS.length && (
              <button
                type="button"
                onClick={() => choisirNiveau(Math.min(BOT_LEVELS.length, progress.defeated + 1))}
                className="font-semibold text-accent hover:underline"
              >
                {t('computer.nextToBeat', {
                  niveau: Math.min(BOT_LEVELS.length, progress.defeated + 1),
                })}
              </button>
            )}
          </p>
        )}

        {/* ── Le style de jeu, en second ──────────────────────────────────
            Maia et Stockfish étaient deux cartes qui se disputaient la place
            au-dessus du curseur, et Maia, grisée hors de sa tranche, avait
            l'air en panne. Ce n'est pas un second adversaire, c'est une façon
            de jouer le niveau qu'on vient de choisir : une ligne, deux
            options, et l'explication quand l'une ne s'applique pas. N'existe
            que si le serveur a Maia. */}
        {maiaReady && (
          <div className="mt-5 border-t border-line/60 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm font-medium">{t('computer.playStyle')}</span>
              <SegmentedControl
                size="sm"
                value={humainRetenu ? 'humain' : 'moteur'}
                onChange={(valeur) => setHuman(valeur === 'humain')}
                label={t('computer.playStyle')}
                options={[
                  {
                    value: 'humain' as const,
                    label: t('computer.styleHuman'),
                    title: t('computer.styleHumanHint'),
                  },
                  {
                    value: 'moteur' as const,
                    label: t('computer.styleEngine'),
                    title: t('computer.styleEngineHint'),
                  },
                ]}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {maiaPossible
                ? humainRetenu
                  ? t('computer.styleHumanNote')
                  : t('computer.styleEngineNote')
                : t('computer.styleOutOfRange', {
                    min: MAIA_MIN_ELO,
                    max: MAIA_MAX_ELO,
                    niveau: bot.level,
                    premier: premierNiveauMaia,
                    dernier: dernierNiveauMaia,
                  })}
            </p>
          </div>
        )}
      </Etape>

      {/* ── 2. Les conditions ──────────────────────────────────────────── */}
      <Etape numero={2} titre={t('computer.step2')}>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <SectionTitle>{t('computer.yourColour')}</SectionTitle>
            <SegmentedControl
              value={color}
              onChange={setColor}
              label={t('computer.colour')}
              options={[
                { value: 'w' as const, label: t('friendGame.colourWhite') },
                { value: 'b' as const, label: t('friendGame.colourBlack') },
                { value: 'random' as const, label: t('friendGame.colourRandom') },
              ]}
            />
            <p className="mt-2 text-xs text-faint">{t('computer.whiteStarts')}</p>
          </div>

          {/* `min-w-[19rem]` et non `min-w-0` : une colonne qui s'autorise à
              descendre à zéro ne passe jamais à la ligne, elle se laisse
              écraser. Sur un téléphone un peu large — 400 px et plus, ce qui
              fait la moitié des modèles récents — la couleur tenait sur la
              première ligne et laissait cinquante pixels à la cadence : les
              huit pastilles s'empilaient une par ligne, « 5 | 3 » se coupait
              en trois, le titre débordait de l'écran, et la colonne à
              rallonge repoussait la rubrique 3 hors de vue. Le plancher dit
              la vraie condition : à côté de la couleur seulement s'il reste
              de quoi poser trois pastilles, sinon en pleine largeur dessous. */}
          <div className="min-w-[19rem] flex-1">
            <SectionTitle>{t('friendGame.timeControl')}</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
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
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    timeControlId === tc.id
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  <span aria-hidden>{SPEED_LABELS[tc.category].icon}</span>
                  {tc.label}
                </button>
              ))}
            </div>
            {/* Ramenée à un exemple : la règle générale se déduit de
                l'exemple, et prenait trois lignes pour le dire. */}
            <p className="mt-2 text-xs leading-relaxed text-faint">
              {t('computer.timeControlExample')}
            </p>
          </div>
        </div>
      </Etape>

      {/* ── 3. Les aides ───────────────────────────────────────────────── */}
      <Etape numero={3} titre={t('computer.step3')}>
        {/* La partie classée en tête, parce qu'elle commande les autres :
            cochée, elle retire le mode commenté, l'indice et l'annulation.
            Ce n'est pas une punition, c'est ce qui rend le résultat
            interprétable. Éteinte par défaut : on vient d'abord s'entraîner. */}
        <Toggle
          label={t('friendGame.ratedLabel')}
          description={
            connecte === false ? t('computer.ratedNeedsAccount') : t('computer.ratedHint')
          }
          checked={classee && connecte !== false}
          disabled={connecte === false}
          onChange={setClassee}
        />

        <div className="mt-3 border-t border-line/60 pt-3">
          <Toggle
            label={t('computer.commentaryEach')}
            description={classee ? t('computer.commentaryRated') : t('computer.commentaryHint')}
            checked={commentaryMode && !classee}
            disabled={classee}
            onChange={(valeur) => setPreference('commentaryMode', valeur)}
          />

          {/* Subordonné : il n'apparaît qu'une fois le mode commenté actif. */}
          {commentaryMode && !classee && (
            <div className="mt-3 border-t border-line/60 pt-3">
              <Toggle
                label={t('computer.commentaryOpponent')}
                description={t('computer.commentaryOpponentHint')}
                checked={commentaryOpponent}
                onChange={(valeur) => setPreference('commentaryOpponent', valeur)}
              />
            </div>
          )}
        </div>
      </Etape>

      {/* ── Le résumé, et le bouton ────────────────────────────────────────
          Collés au bas de la fenêtre : quelle que soit la hauteur de l'écran,
          le bouton est là, et le résumé dit ce qu'il va lancer sans avoir à
          remonter vérifier. Sous `sm`, le résumé se tait : le bouton prend
          la largeur, et c'est lui qu'on cherche du pouce. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line-strong bg-[var(--flottant)]/95 px-4 py-3 backdrop-blur-xl safe-bottom sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-4">
          <p className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">
            <strong className="font-semibold text-ink">{tCoeur(t, personality.name)}</strong> · ≈{' '}
            {bot.elo} Elo · {couleurChoisie} · {cadence?.label ?? timeControlId} ·{' '}
            {classee && connecte === true
              ? t('computer.summaryRated')
              : commentaryMode
                ? t('computer.summaryCoach')
                : t('computer.summaryPlain')}
          </p>
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={17} />}
            className="w-full sm:w-auto"
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
            {t('play.start')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Un pas du parcours : un numéro dans un disque, un titre, et le contenu.
 *
 * Pas de carte : c'est précisément ce qu'on retire. Un filet au-dessus
 * suffit à séparer les pas, et le numéro dit l'ordre dans lequel on lit.
 */
function Etape({
  numero,
  titre,
  children,
}: {
  numero: number
  titre: string
  children: ReactNode
}) {
  return (
    <section className="mt-7 border-t border-line/60 pt-6 first-of-type:border-t-0">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/20 text-[13px] font-bold text-accent"
          aria-hidden
        >
          {numero}
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{titre}</h2>
      </div>
      {children}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écran de jeu
// ─────────────────────────────────────────────────────────────────────────────

function GameScreen({
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

  /*
    L'annonce de la partie classée, faite au moment où l'écran de jeu s'ouvre.

    C'est le seul instant où elle a un sens : le résultat est encore inconnu de
    tout le monde, y compris de celui qui va jouer. Le serveur y fige le niveau,
    la cadence et le camp, et refusera de classer une partie qui reviendrait
    avec d'autres — voir `POST /api/parties/classee`.

    Une seule fois, sans dépendances : ni le niveau ni la cadence ne changent en
    cours de partie, et une partie reprise n'est jamais classée.
  */
  useEffect(() => {
    if (!classee) return
    annoncerPartieClassee({
      botLevel: level,
      playerColor,
      initialTime: timeControl.initial,
      increment: timeControl.increment,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [outcome, setOutcome] = useState<{
    status: GameStatus
    result: GameResult
  } | null>(null)
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null)
  /**
   * Une aide du moteur a-t-elle servi dans cette partie ?
   *
   * Si oui, la partie ne va au classement sous aucun prétexte — ni pour y
   * gagner des points, ni pour en faire perdre à l'adversaire.
   *
   * ── Pourquoi un état, alors que les boutons sont déjà masqués ────────────
   *
   * L'interface cache « Indice » et « Annuler » dès qu'une partie est classée,
   * et c'est très bien tant que l'interface est la seule porte. Ce n'en est pas
   * une garantie : la règle n'existait nulle part ailleurs que dans deux
   * conditions d'affichage, à deux endroits différents — la barre du pouce et
   * celle du grand écran —, et il suffisait qu'un rendu en retard, un raccourci
   * clavier ou une refonte en oublie une pour qu'une partie assistée arrive au
   * classement sans que rien ne s'y oppose.
   *
   * La règle est donc écrite là où elle se décide : au moment d'archiver. Le
   * serveur a d'ailleurs toujours décrit une partie classée comme une partie
   * jouée « sans Annuler, sans Indice et sans le mode commenté » — c'est cette
   * phrase-là qui devient exécutable.
   *
   * On retient **laquelle** des deux aides a servi : la boîte de fin le dit,
   * et « ta partie n'est pas classée » sans raison passe pour une panne.
   */
  const [aideUtilisee, setAideUtilisee] = useState<'indice' | 'annulation' | null>(null)
  /**
   * La même chose, lisible depuis les rappels du moteur de jeu.
   *
   * `onGameOver` est passé à `useChessGame` et capture les valeurs du rendu où
   * il a été créé : y lire l'état donnerait celui d'avant l'indice, c'est-à-dire
   * exactement le contraire de la règle. Le renvoi, lui, dit toujours la vérité.
   */
  const aideRef = useRef<'indice' | 'annulation' | null>(null)
  const noterAide = useCallback((quoi: 'indice' | 'annulation') => {
    // La première suffit : on retient laquelle, pas combien.
    aideRef.current ??= quoi
    setAideUtilisee((deja) => deja ?? quoi)
  }, [])

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
  /** Variation de classement d'une partie classée, une fois le serveur consulté. */
  const [variationClassement, setVariationClassement] = useState<number | null>(null)
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
      if (timed) {
        setClock((current) => applyMove(current, move.color, Date.now(), current.running === null))
      }
    },
    onGameOver: (status, result) => {
      setClock((current) => stopClock(current, Date.now()))
      setOutcome({ status, result })
      const won = result === (playerColor === 'w' ? '1-0' : '0-1')
      playResultSound(result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
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
    ── Chute du drapeau ─────────────────────────────────────────────────────

    Un rendez-vous, pas un sondage.

    Cet effet partageait un `setInterval` à 100 ms avec l'affichage de la
    pendule : dix fois par seconde, tout l'écran se re-rendait pour poser une
    question dont la réponse est « non » pendant plusieurs minutes d'affilée.
    L'affichage vit désormais dans `PenduleVive`, et il ne reste ici que la
    chute — qui a une **date connue d'avance**, puisque la pendule est tenue en
    horodatages absolus.

    On arme donc un unique `setTimeout` sur cette date. Il se réarme au coup,
    parce que `clock` change au coup. Une centaine de réveils par minute
    remplacée par un par coup.
  */
  useEffect(() => {
    if (!timed || state.isGameOver || outcome) return
    if (clock.running === null) return

    const echeance = remainingAt(clock, Date.now())[clock.running]

    const tomber = () => {
      const now = Date.now()
      const flagged = flaggedColor(clock, now)
      // Le garde n'est pas superflu : un onglet mis en veille rend la main en
      // retard, et un navigateur peut réveiller un minuteur un cheveu trop tôt.
      if (!flagged) return
      setClock((current) => stopClock(current, now))
      // Article 6.9 : celui dont le drapeau tombe perd, sauf si l'adversaire
      // ne pouvait plus mater — c'est alors nulle. Le cœur tranche, comme
      // pour le serveur et la partie locale.
      const result = resultatAuDrapeau(game.chess, flagged)
      setOutcome({ status: 'timeout', result })
      const nulle = result === '1/2-1/2'
      playResultSound(nulle ? 'draw' : flagged === playerColor ? 'loss' : 'win')
      // Gagner au temps compte comme une victoire : c'est une partie gagnée.
      // Sauf depuis une position composée — même raison que ci-dessus.
      if (!startFen) recordBotGame(level, !nulle && flagged !== playerColor)
      // Une partie jouée jusqu'à la chute du drapeau est une partie menée au
      // bout, comme un mat : elle compte pour la quête du jour. L'abandon,
      // lui, ne compte pas — c'est justement une partie qu'on n'a pas finie.
      // Et une partie jouée avec une aide du moteur ne compte pas non plus.
      if (aideRef.current === null) {
        marquer('partie')
        if (!nulle && flagged !== playerColor) marquer('victoire')
      }
      // La partie est finie : sans cet oubli, l'écran de départ proposait de
      // la reprendre, pendule à zéro.
      oublierPartieEnCours()
    }

    // `+50` : on se réveille juste après l'échéance, jamais juste avant, sans
    // quoi `flaggedColor` répondrait « personne » et la partie continuerait
    // sans que plus rien ne la surveille.
    const minuteur = setTimeout(tomber, Math.max(0, echeance) + 50)
    return () => clearTimeout(minuteur)
  }, [clock, timed, state.isGameOver, outcome, playerColor, level, startFen, game.chess, marquer])

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

  const handleResign = useCallback(() => {
    setClock((current) => stopClock(current, Date.now()))
    setOutcome({ status: 'resign', result: playerColor === 'w' ? '0-1' : '1-0' })
    // Un abandon compte comme une tentative, jamais comme une victoire — sauf
    // depuis une position composée, qui ne touche à aucune échelle. La fin de
    // partie et la chute du drapeau s'en gardaient déjà ; cette voie-ci, non,
    // et l'on gonflait son nombre de tentatives en abandonnant des positions
    // qu'on venait de fabriquer.
    if (!startFen) recordBotGame(level, false)
    playResultSound('loss')
    // Une partie abandonnée n'est plus à reprendre : sans cet oubli, l'écran
    // de départ la proposait comme si on l'avait quittée en cours.
    oublierPartieEnCours()
  }, [playerColor, level, startFen])

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
    if (duel && aideRef.current === null) {
      void signalerCarriere({
        type: 'partie',
        gagnee: issue === (playerColor === 'w' ? '1-0' : '0-1'),
        coups: state.moves.length,
      }).then((gains) => deposerGains(gains, duel.titre))
    }

    /*
      Le tournoi attend son résultat : on le dépose, le tableau le déroulera
      au retour. Le sens est celui des Blancs, comme partout ailleurs.

      Sauf si le moteur a aidé. Le tournoi masque déjà ses boutons — voir
      `sansAide` —, ce garde-fou couvre donc un cas qui ne devrait pas se
      produire ; c'est exactement pourquoi il est écrit ici plutôt que laissé à
      une condition d'affichage. Ne rien déposer laisse la ronde à jouer, ce
      que `deposerResultat` documente déjà comme sa panne bénigne.
    */
    if (tournoi && aideRef.current === null) deposerResultat(issue)

    void archiverPartie({
      mode: 'computer',
      /*
        Une aide du moteur retire la partie du classement.

        C'est la règle, et elle est ici plutôt que dans une condition
        d'affichage : celui qui a vu le meilleur coup, ou rejoué un coup en
        sachant ce qu'il donnait, n'a pas joué la même partie que son
        classement prétend mesurer. Ni pour gagner des points, ni pour en faire
        perdre à l'adversaire.
      */
      classee: classee && aideUtilisee === null,
      moves: state.moves.map((coup) => coup.san),
      result: issue,
      status: outcome?.status ?? state.status,
      playerColor,
      opponentName: tCoeur(t, personality.name),
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
    return {
      conseille: formatMove(meilleur.san),
      joue: formatMove(commentary.san),
      // « Le pion en d5 attaque en même temps le fou en c4 et le cavalier en
      // e4. Il est défendu par la dame en d8. » C'est ce qui manquait : on
      // montrait un coup sans jamais dire ce qu'il fait.
      pourquoi: meilleur.reason,
    }
  }, [verdictDuCoup, commentary, formatMove])

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
          Il s'ouvre vers le haut : la barre est en bas de fenêtre, un
          panneau déroulé vers le bas y sortirait du cadre. */}
      <Menu
        align="right"
        sens="haut"
        largeur="w-60"
        label={t('computer.gameOptions')}
        declencheur={() => <MoreHorizontal size={16} aria-hidden />}
      >
        <MenuItem
          onClick={onNewGame}
          icone={<RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />}
        >
          {t('game.newGame')}
        </MenuItem>
        <MenuItem
          onClick={handleResign}
          disabled={gameOver}
          danger
          icone={<Flag size={15} className="shrink-0" aria-hidden />}
        >
          {t('game.resign')}
        </MenuItem>

        {/* Absent en partie classée, comme dans la barre du pouce : le mode y
            est neutralisé de toute façon, et un interrupteur qui ne commute
            rien se lit comme une panne. */}
        {!classee && (
          <div data-garde-ouvert className="mt-1 border-t border-line/60 pt-1">
            {/* `data-garde-ouvert` : commuter le mode commenté ne doit pas refermer
    le menu, sinon on ne voit pas ce qu’on vient de changer. */}
            <CommentaryToggle
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
          clock={timed ? clock : null}
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
                une seule fois. */}
            {verdictDuCoup && (
              <LegendeDuVerdict quality={verdictDuCoup.quality} conseil={conseilDuCoup} />
            )}

            {reviewing && (
              <div className="mb-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 px-3 py-2 text-[14px]">
                <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1 leading-snug text-muted">
                  Tu revois la partie
                  {reviewedMove ? (
                    <>
                      {' '}
                      — coup{' '}
                      <strong className="font-semibold text-ink">
                        {formatMove(reviewedMove.san)}
                      </strong>
                    </>
                  ) : null}
                  . Rien n’est effacé.
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
              <div className="mb-1.5 h-10">
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
          clock={timed ? clock : null}
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

            <div className="mt-1 flex items-stretch justify-around gap-1 border-t border-line/60 pt-1">
              <Menu
                align="right"
                sens="haut"
                largeur="w-60"
                label={t('computer.gameOptions')}
                className="flex-1"
                declencheur={() => (
                  <span className="flex min-h-11 w-full flex-col items-center justify-center gap-0.5">
                    <MoreHorizontal size={19} aria-hidden />
                    <span className="text-[12px] font-medium leading-none">
                      {t('bits.options')}
                    </span>
                  </span>
                )}
              >
                <MenuItem
                  onClick={onNewGame}
                  icone={<RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />}
                >
                  {t('game.newGame')}
                </MenuItem>
                <MenuItem
                  href="/jouer"
                  icone={<LayoutGrid size={15} className="shrink-0 text-accent" aria-hidden />}
                >
                  {t('game.over.backToMenu')}
                </MenuItem>
                {!classee && (
                  <div data-garde-ouvert className="mt-1 border-t border-line/60 pt-1">
                    {/* `data-garde-ouvert` : commuter le mode commenté ne doit pas refermer
    le menu, sinon on ne voit pas ce qu’on vient de changer. */}
                    <CommentaryToggle
                      active={commentaryMode}
                      onChange={(value) => {
                        if (value) prefs.set('commentaryMode', true)
                        else couperLeCommentaire()
                      }}
                    />
                  </div>
                )}
              </Menu>

              {gameOver ? (
                <>
                  <ActionDuPouce
                    icone={<RefreshCw size={19} aria-hidden />}
                    libelle={t('rush.playAgain')}
                    onClick={onRematch}
                  />
                  <ActionDuPouce
                    icone={<LayoutGrid size={19} aria-hidden />}
                    libelle={t('nav.menu')}
                    href="/jouer"
                  />
                </>
              ) : (
                <>
                  <ActionDuPouce
                    icone={<Flag size={19} aria-hidden />}
                    libelle={t('game.resign')}
                    onClick={handleResign}
                    danger
                  />
                  {!sansAide && (
                    <>
                      <ActionDuPouce
                        icone={<Lightbulb size={19} aria-hidden />}
                        libelle={t('game.hint')}
                        onClick={handleHint}
                        disabled={state.turn !== playerColor}
                      />
                      <ActionDuPouce
                        icone={<Undo2 size={19} aria-hidden />}
                        libelle={t('bits.undo')}
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
            <CommentaryPanel
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

          <PhysicalBoardPanel state={physicalBoard} />

          {/* Sur téléphone, la liste se règle sur ce qu'elle contient, sans
              descendre plus bas que 45 % de la fenêtre. Elle réservait 220 px
              dès le premier coup : sous l'échiquier, cela faisait un cadre
              presque vide qui repoussait tout le reste hors de l'écran. Sur
              grand écran, la colonne est calée sur la fenêtre et c'est elle qui
              occupe la place restante — d'où le `flex-1` à partir de `lg`. */}
          {/* Sur grand écran, la carte des coups a trois zones à hauteur
              fixe : en tête la bascule de vue, au milieu la liste — la seule
              qui défile —, au pied la navigation et les actions. Le pouce et
              la souris savent toujours où retrouver « Indice ». */}
          <Card className="flex max-h-[45vh] flex-col overflow-hidden lg:max-h-none lg:min-h-[220px] lg:flex-1">
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
          nonClassee={
            aideUtilisee
              ? aideUtilisee === 'indice'
                ? t('computer.usedHint')
                : t('computer.usedTakeback')
              : null
          }
          seance={
            seance && releveDeSeance
              ? {
                  theme: `${seance.theme.icone} ${t(seance.theme.nom)}`,
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
                  libelle: mission.quete.label,
                  faite: mission.faite,
                  restantes: mission.restantes,
                }
              : undefined
          }
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
  icone: ReactNode
  libelle: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** Une action qu'on ne défait pas : l'abandon. */
  danger?: boolean
}) {
  const classe = clsx(
    // Quarante-quatre points de haut au minimum : la barre en faisait
    // quarante-trois, juste sous la taille où le pouce rate une fois sur cinq.
    'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5',
    'text-[12px] font-medium transition-colors',
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
  const t = useT()
  const style = QUALITY_STYLES[quality]
  const teinte = `var(--q-${style.token})`

  return (
    <div className="mb-1.5">
      <p className="flex items-baseline gap-1.5 text-[14px] leading-snug" style={{ color: teinte }}>
        <span aria-hidden>{style.glyph}</span>
        <span className="font-semibold">{tCoeur(t, style.label)}</span>
        <span className="hidden min-w-0 flex-1 truncate font-normal text-muted sm:inline">
          {tCoeur(t, style.description)}
        </span>
      </p>

      {/* Visible à toutes les tailles, contrairement à la description : c'est
          la clé de lecture de la flèche bleue, et elle manque surtout là où
          l'écran est petit. */}
      {conseil && (
        <p className="mt-0.5 text-[14px] leading-snug text-muted">
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
