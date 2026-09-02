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
  Home,
  Swords,
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
import { Button, ButtonLink, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { playMoveSound, playSound } from '@/lib/sound.ts'
import { speak } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'
import { VoiceQuickToggle } from '@/components/layout/VoiceQuickToggle.tsx'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import {
  chapitreDeLUrl,
  deposerGains,
  progressionActuelle,
  signaler,
} from '@/lib/carriere/useCarriere.ts'
import { chapitre as chapitreCarriereNumero } from '@coupparfait/core'
import { useRouter } from 'next/navigation'
import { jourLocal, queteFaite } from '@/lib/daily/quotidien.ts'
import type { Locale } from '@/lib/i18n/dictionary.ts'

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
   * La catégorie est demandée.
   *
   * L'état vit ici et non dans la pastille : elle est rendue deux fois — sur
   * la ligne au-dessus du plateau et dans le panneau —, et les deux doivent
   * répondre au même geste. Sans quoi on la révèle d'un côté et l'autre
   * continue de la proposer.
   */
  const [categorieVisible, setCategorieVisible] = useState(false)

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
   * Les puzzles déjà comptés pendant cette visite.
   *
   * Un même puzzle ne doit compter qu'une fois, et rien ne l'empêchait. Le cas
   * criant est le défi du jour : il n'existe **qu'une** position par jour et
   * par tranche, tirée de façon déterministe, et le bouton « Puzzle suivant »
   * rechargeait donc exactement la même. On la résolvait en boucle, et chaque
   * tour comptait — la série de réussites montait, la quête « enchaîner trois
   * puzzles » se validait toute seule, et le classement de puzzles gagnait des
   * points pour un puzzle déjà résolu.
   *
   * Le bouton est corrigé plus bas, mais le garde reste : « Recommencer » après
   * un échec rejoue lui aussi la même position, et il est explicitement là pour
   * comprendre, pas pour se refaire un score.
   *
   * Rangé dans le stockage de session, pour la même raison que `vusRef` : sans
   * cela, sortir de la page et y revenir suffisait à repartir d'une ardoise
   * vierge — et la quête « enchaîner trois puzzles » se validait en résolvant
   * trois fois le défi du jour, avec un aller-retour par l'accueil entre chaque.
   * Le classement, lui, est protégé côté serveur, où il doit l'être.
   */
  const COMPTES_CLE = 'coupparfait.puzzlesComptes'
  const comptes = useRef<Set<string>>(new Set())
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(COMPTES_CLE)
      if (brut) comptes.current = new Set(JSON.parse(brut) as string[])
    } catch {
      // Stockage refusé : le garde vaut pour la page en cours.
    }
  }, [])

  const compter = useCallback((id: string) => {
    comptes.current.add(id)
    try {
      sessionStorage.setItem(COMPTES_CLE, JSON.stringify([...comptes.current].slice(-200)))
    } catch {
      // Idem.
    }
  }, [])

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

  /**
   * Les puzzles qu'on vient de voir, hors du cycle de rendu.
   *
   * Ils sont annoncés au serveur à chaque demande : la tentative est bien
   * enregistrée en base, mais par un appel distinct, et qui enchaîne aussitôt
   * peut arriver avant que l'écriture ne soit visible. Le navigateur, lui,
   * sait toujours ce qu'il vient d'afficher.
   *
   * Rangés dans le stockage de session, et pas seulement en mémoire : un
   * chapitre de carrière fait des allers-retours — on résout, on revient à la
   * carte, on repart — et chaque retour monte un composant neuf qui aurait
   * tout oublié de la série en cours.
   *
   * Une référence plutôt qu'un état : `load` est reconstruit à chaque
   * changement de thème, et lire une valeur d'état dedans l'obligerait à se
   * reconstruire à chaque puzzle chargé, donc à relancer l'effet qui charge.
   */
  const VUS_CLE = 'coupparfait.puzzlesVus'
  const VUS_MAX = 30
  const vusRef = useRef<string[]>([])
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(VUS_CLE)
      if (brut) vusRef.current = (JSON.parse(brut) as string[]).slice(-VUS_MAX)
    } catch {
      // Stockage refusé : on se contente de la mémoire de la page.
    }
  }, [])

  const retenirPuzzle = useCallback((id: string) => {
    vusRef.current = [...vusRef.current.filter((autre) => autre !== id), id].slice(-VUS_MAX)
    try {
      sessionStorage.setItem(VUS_CLE, JSON.stringify(vusRef.current))
    } catch {
      // Idem : la liste vaut alors pour la page en cours.
    }
  }, [])

  const { etat: journee, marquer } = useQuotidien()

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
  /** Tranche du défi du jour, quand on arrive par un lien qui en désigne une. */
  const [trancheDefi, setTrancheDefi] = useState<string | null>(null)
  /**
   * Le défi du jour est-il déjà relevé ?
   *
   * Rien ne le disait sur cet écran : on y revenait par un lien, par
   * l'historique ou par curiosité, on retrouvait la position — la même, le
   * tirage étant déterministe — et rien n'indiquait qu'elle avait déjà été
   * résolue. On la cherchait donc une seconde fois sans savoir qu'on la
   * refaisait, et sans que ça compte : ni série, ni quête, ni classement.
   *
   * On le dit, et on n'interdit rien : refaire une position pour la comprendre
   * est légitime, c'est la comptabiliser deux fois qui ne l'était pas.
   */
  const defiDejaFait = modeDefi === true && journee != null && queteFaite(journee, 'defi')
  /**
   * Chapitre de carrière en cours, s'il y en a un.
   *
   * Lu de la même façon et pour la même raison que `modeDefi`. Sa présence est
   * ce qui distingue « je m'entraîne aux fourchettes » de « je passe le
   * chapitre 4 » : sans lui, chaque puzzle résolu où que ce soit sur le site
   * ferait avancer une carrière à laquelle on ne pensait pas.
   */
  const [chapitreCarriere, setChapitreCarriere] = useState<number | null>(null)
  /** Difficulté imposée par le chapitre, en Elo. `null` en entraînement libre. */
  const [coteDemandee, setCoteDemandee] = useState<number | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setModeDefi(params.get('defi') === '1')
    setTrancheDefi(params.get('tranche'))
    setChapitreCarriere(chapitreDeLUrl(params))

    /*
      Le thème demandé par l'adresse.

      Un chapitre de carrière envoie ici sur `?theme=fork&carriere=4` : le
      thème *est* l'exercice du chapitre — on y travaille les fourchettes,
      puis les clouages, puis les mats du couloir. La page l'ignorait
      complètement et repartait sur « Tous », si bien que les puzzles d'un
      chapitre n'avaient aucun rapport avec la leçon qui les précède.

      On ne retient qu'un thème de la liste proposée : une valeur inventée
      dans l'adresse laisserait un filtre actif que rien n'affiche.
    */
    const demande = params.get('theme')
    if (demande && THEMES.some((entree) => entree.id === demande)) setTheme(demande)

    /*
      La difficulté imposée par un chapitre de carrière.

      Sans elle, le service vise le classement de puzzles du joueur plus
      cinquante points. C'est juste pour l'entraînement libre — on cherche à
      progresser — et faux pour un parcours : le chapitre 1 apprend à déplacer
      les pièces, et servait des mats en un à 1 150 Elo parce que c'est là que
      se trouve un classement après quelques réussites ailleurs.
    */
    const cote = Number(params.get('cote'))
    if (Number.isFinite(cote) && cote > 0) setCoteDemandee(Math.round(cote))
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
    setCategorieVisible(false)
    setWrongAttempts(0)
    const demande = generation.current

    try {
      // Le défi du jour est servi par sa propre route : c'est un tirage
      // déterministe partagé par tout le monde, pas un puzzle calibré sur le
      // niveau du joueur.
      // On dit au serveur ce qu'on vient de faire : l'enregistrement de la
      // tentative part par un autre appel, et enchaîner sans attendre pouvait
      // ramener la position qu'on vient de résoudre.
      const precedents = vusRef.current.join(',')
      const response = await fetch(
        modeDefi
          ? `/api/defi-du-jour?jour=${jourLocal()}${trancheDefi ? `&tranche=${encodeURIComponent(trancheDefi)}` : ''}`
          : `/api/puzzles?theme=${encodeURIComponent(theme)}${coteDemandee ? `&rating=${coteDemandee}` : ''}${precedents ? `&exclure=${encodeURIComponent(precedents)}` : ''}`,
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
      retenirPuzzle(loaded.id)
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
  }, [theme, voiceEnabled, modeDefi, retenirPuzzle, coteDemandee, trancheDefi])

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
      // Une position ne se compte qu'une fois : voir `comptes`.
      if (comptes.current.has(puzzle.id)) return
      compter(puzzle.id)

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
    [puzzle, moveIndex, marquer, compter, modeDefi, chapitreCarriere, router],
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

      /*
        La pièce de promotion fait partie de la réponse.

        La comparaison portait sur les seules cases de départ et d'arrivée, et
        laissait donc passer n'importe quelle promotion : sur un puzzle de
        sous-promotion — thème `underPromotion`, où choisir le cavalier *est*
        l'exercice —, promouvoir en dame était compté juste. Pire, le reste de
        la solution devenait alors illégal sur un échiquier qui ne correspondait
        plus, et le puzzle se déclarait résolu au coup suivant. Vu du joueur :
        un puzzle qui accepte un mauvais coup puis s'arrête sans explication.

        On ne l'exige que si la solution en mentionne une : partout ailleurs, le
        sélecteur n'apparaît pas et `promotion` reste vide.
      */
      const promotionAttendue = expected.length > 4 ? expected[4] : null
      const joue = `${from}${to}${promotionAttendue ? (promotion ?? 'q') : ''}`

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

      const isCorrect = joue === expected || matesAnyway

      // Une position déjà comptée ne touche plus au score : ni la série, ni le
      // classement, ni les quêtes. On la rejoue pour comprendre — voir `comptes`.
      const dejaCompte = comptes.current.has(puzzle.id)

      if (!isCorrect) {
        setWrongAttempts((count) => count + 1)
        playSound('error')
        if (wrongAttempts >= 1) {
          setStatus('failed')
          void report(false)
          if (!dejaCompte) setStreak(0)
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
        if (!dejaCompte) setStreak((value) => value + 1)
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
    setCategorieVisible(false)
    setStatus('playing')
    startedAt.current = Date.now()
  }, [puzzle, load])

  /**
   * Sortir du défi du jour, sans quitter la page.
   *
   * Il n'y a **qu'une** position par jour et par tranche — le tirage est
   * déterministe, et la carte de l'accueil l'annonce en toutes lettres : « une
   * seule position », « reviens demain ». « Puzzle suivant » rechargeait
   * pourtant la route du défi, donc rendait la même position, indéfiniment.
   *
   * Le bouton dit maintenant ce qu'il fait, et fait ce qu'il dit : il passe aux
   * puzzles ordinaires, calibrés sur le classement du joueur. L'adresse suit,
   * sinon un rechargement ramènerait le défi déjà résolu.
   */
  const quitterLeDefi = useCallback(() => {
    setModeDefi(false)
    setTrancheDefi(null)
    router.replace('/puzzles')
  }, [router])

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
    <div className="etude mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-5 lg:py-8">
      <div className="etude-tete">
      {/* ── Filtres et score ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Le titre dit où l'on est.

            Il affichait « Puzzles » dans les deux cas, et proposait juste à
            côté une manche chronométrée : rien ne distinguait le défi du jour
            — une position unique, partagée, qui compte pour la série — d'une
            séance d'entraînement libre. C'est ce qui rendait « Puzzle suivant »
            crédible là où il n'y a pas de suivant. */}
        <h1 className="font-display text-xl font-bold tracking-tight">
          {modeDefi ? 'Défi du jour' : 'Puzzles'}
        </h1>
        {modeDefi ? (
          <Chip tone={defiDejaFait ? 'success' : 'accent'}>
            {defiDejaFait ? <Check size={11} aria-hidden /> : <Swords size={11} aria-hidden />}
            {defiDejaFait ? 'déjà relevé aujourd’hui' : 'une seule position'}
          </Chip>
        ) : (
          /* L'autre façon de travailler les mêmes puzzles : vite, et à la
             chaîne. Elle entraîne la reconnaissance là où celle-ci entraîne la
             recherche. */
          <Link
            href="/puzzles/rush"
            className="flex h-7 items-center gap-1.5 rounded-full bg-accent/15 px-2.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/25"
          >
            <Timer size={12} aria-hidden />
            Manche chronométrée
          </Link>
        )}
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

        {/* La voix annonce la position et lit la solution. Le bouton est ici,
            à côté de ce qu'il fait taire, et non dans la barre de navigation
            où un haut-parleur ne dit pas ce qu'il coupe. */}
        <VoiceQuickToggle className="ml-auto" />
      </div>

      {/* ── Les thèmes, sur une seule rangée ─────────────────────────────
          Douze pastilles qui se replient, cela fait quatre rangées sur un
          téléphone : trois cent quarante points, soit 42 % de l'écran, avant
          d'apercevoir l'échiquier. On vient pourtant ici pour la position, et
          l'on change de thème une fois sur vingt.

          Elles défilent donc latéralement sous `sm` — le débordement est ici
          voulu et se manipule au doigt, ce qui n'est pas la même chose qu'une
          page qui déborde. Les marges négatives font courir la bande d'un bord
          à l'autre, pour qu'on voie qu'elle continue. */}
      {/* Masqués dans le défi du jour : le filtre de thème n'y change rien,
          la position est tirée par la date et la tranche de niveau. Douze
          pastilles qui ne font rien se cliquent quand même, une fois. */}
      <div
        className={clsx(
          '-mx-3 mb-4 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0',
          modeDefi && 'hidden',
        )}
      >
        {THEMES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTheme(entry.id)}
            /* `min-h-9` : les pastilles mesuraient 26 points de haut, soit
               presque moitié moins que le pouce qui les vise. On ne les
               agrandit pas en typographie — elles resteraient discrètes, ce
               qui est leur rôle — mais en zone touchable. */
            className={clsx(
              'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              theme === entry.id
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      </div>

      {/* ── La catégorie de ce puzzle ────────────────────────────────────
          On cherche mieux en sachant ce qu'on cherche : « clouage » ne donne
          pas le coup, mais dit où regarder, et c'est ce qui transforme un
          essai au hasard en reconnaissance de motif.

          Nuance qui compte : un puzzle porte plusieurs motifs, et le premier
          est parfois l'issue elle-même — « mat en 1 » enlève tout à chercher.
          Quand on a choisi un filtre, la catégorie est déjà connue : on
          l'affiche. Sinon elle reste sous un bouton, offerte à qui la
          demande, comme un indice avoué. */}
      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Échiquier ──────────────────────────────────────────── */}
        <div className="etude-plateau min-w-0">
          {/* Qui joue, au-dessus du plateau et non en dessous.

              C'est la première chose à savoir devant une position — avant même
              de chercher —, et elle vivait dans le panneau de droite, c'est-à-
              dire sous l'échiquier une fois les colonnes empilées, donc hors de
              l'écran. Sur grand écran le panneau est à côté et dit déjà tout :
              la ligne n'apparaît qu'en dessous de `lg`. */}
          {status === 'playing' && (
            <p className="mb-1.5 flex items-center gap-2 text-[13px] font-medium lg:hidden paysage:hidden">
              <span
                className={clsx(
                  'h-2.5 w-2.5 rounded-full',
                  orientation === 'w'
                    ? 'bg-[var(--eval-white)]'
                    : 'bg-[var(--eval-black)] ring-1 ring-line',
                )}
                aria-hidden
              />
              {orientation === 'w' ? 'Les Blancs jouent' : 'Les Noirs jouent'}
              <span className="truncate font-normal text-muted">
                — trouve le meilleur coup
              </span>
              <CategorieDuPuzzle
                puzzle={puzzle}
                filtre={theme}
                locale={locale}
                visible={categorieVisible}
                onDemander={() => setCategorieVisible(true)}
                className="ml-auto"
              />
            </p>
          )}

          <div className="etude-cadre">
          {status === 'loading' ? (
            <div className="grid aspect-square w-full place-items-center rounded-[var(--radius)] glass">
              <Spinner size={26} />
            </div>
          ) : (
            <ChessBoard
              fitParentHeight
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
        </div>

        {/* ── Panneau ────────────────────────────────────────────── */}
        <div className="etude-aside flex flex-col gap-3">
          <Card className="p-4">
            {status === 'playing' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">
                    {orientation === 'w' ? 'Les Blancs jouent' : 'Les Noirs jouent'}
                  </p>
                  <CategorieDuPuzzle
                    puzzle={puzzle}
                    filtre={theme}
                    locale={locale}
                    visible={categorieVisible}
                    onDemander={() => setCategorieVisible(true)}
                  />
                </div>
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
                  <p className="text-sm font-semibold text-[var(--q-best)]">
                    {modeDefi ? 'Défi du jour relevé !' : 'Résolu !'}
                  </p>
                  {/* Dans le défi, on ne conseille pas « refais-en un du même
                      thème » : il n'y a pas de suivant avant demain, et c'est
                      justement la promesse du format. */}
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {modeDefi
                      ? 'C’était la position du jour, la même pour tout le monde de ton niveau. La prochaine arrive à minuit.'
                      : wrongAttempts === 0 && !revealed
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
                  {/* La solution reste offerte, jamais imposée.

                      Elle s'affichait d'elle-même dès la seconde erreur, et
                      c'était trop tôt : on ne peut plus chercher une fois
                      qu'on a lu la réponse, et le puzzle est perdu comme
                      exercice. Le bouton « Solution » est juste dessous, il
                      n'attend qu'un geste — et refuser ce geste, c'est encore
                      chercher. */}
                  {solutionRatee && revealed && (
                    <p className="mt-1.5 rounded-[var(--radius-sm)] bg-surface px-2.5 py-2 text-[13px]">
                      Il fallait jouer{' '}
                      <strong className="text-accent">{format(solutionRatee)}</strong>
                    </p>
                  )}
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {revealed
                      ? 'Rejoue la position : c’est en refaisant le coup soi-même qu’on finit par reconnaître le motif d’instinct.'
                      : 'Rejoue la position, ou demande la solution si tu sèches : c’est en refaisant le coup soi-même qu’on finit par reconnaître le motif d’instinct.'}
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

          {/* ── Les actions, collées en bas sur téléphone ──────────────
              Elles vivent sous l'échiquier, après le panneau de verdict et la
              carte des thèmes : sur un mobile, « Puzzle suivant » se trouvait
              donc à un écran de défilement du moment où l'on vient de
              résoudre. On enchaîne les puzzles par dizaines — un geste de
              défilement entre chacun, c'est la moitié du temps passé à
              chercher le bouton plutôt qu'à chercher le coup.

              `bottom-16` dégage la barre de navigation basse. À partir de
              `lg`, la colonne est à côté de l'échiquier et tient dans l'écran :
              la barre redevient un élément ordinaire du flux. */}
          <div className="sticky bottom-16 z-10 -mx-1 flex gap-2 rounded-[var(--radius)] bg-bg/85 px-1 py-2 backdrop-blur-sm lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            {/* Y compris après un échec : la solution ne s'affiche plus
                d'elle-même, il faut donc pouvoir la demander là aussi. */}
            {(status === 'playing' || status === 'failed') && !revealed && (
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
                // Dans le défi, « Passer » ne peut pas mener au suivant : il
                // n'y en a pas. Il quitte donc le défi pour les puzzles
                // ordinaires, et le libellé le dit.
                onClick={modeDefi ? quitterLeDefi : () => void load()}
                fullWidth={revealed}
              >
                {modeDefi ? 'Passer au libre' : 'Passer'}
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
            {/* ── La sortie, une fois la position finie ────────────────
                Dans le défi du jour, « Puzzle suivant » était un mensonge : la
                route rend une position déterministe par jour et par tranche, si
                bien que le bouton rechargeait celle qu'on venait de résoudre.
                On la rejouait en boucle, et chaque tour comptait — série,
                quêtes, classement de puzzles.

                Deux sorties, donc, et aucune ne repasse par le défi : rentrer
                voir ses quêtes, ou enchaîner sur des puzzles calibrés. */}
            {(status === 'solved' || status === 'failed') && modeDefi && (
              <>
                <ButtonLink
                  href="/"
                  variant={status === 'failed' ? 'ghost' : 'secondary'}
                  icon={<Home size={15} />}
                  fullWidth
                >
                  Mes quêtes
                </ButtonLink>
                <Button
                  variant={status === 'failed' ? 'ghost' : 'primary'}
                  icon={<ArrowRight size={15} />}
                  onClick={quitterLeDefi}
                  fullWidth
                >
                  Continuer en libre
                </Button>
              </>
            )}
            {(status === 'solved' || status === 'failed') && !modeDefi && (
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

          {/* En paysage, la colonne défile déjà et l'écran est plein : on ne
              lui ajoute pas une liste de liens. */}
          <AutresDeLaSection section="entrainer" className="paysage:hidden" />
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

/**
 * La catégorie du puzzle qu'on est en train de chercher.
 *
 * Savoir qu'on cherche un clouage ne donne pas le coup, mais dit où regarder :
 * c'est la différence entre essayer des coups et reconnaître un motif. C'est
 * d'ailleurs ce que fait un livre d'exercices, dont chaque chapitre porte un
 * titre.
 *
 * On ne montre que les catégories du filtre ci-dessus — le vocabulaire que
 * l'application enseigne. Les puzzles importés portent aussi les étiquettes de
 * Lichess : « endgame », « short », « master », qui décrivent la partie et non
 * le motif, et ne diraient rien à personne devant l'échiquier.
 *
 * Deux cas, et le second est le seul qui demandait réflexion :
 *  - **un filtre est actif** — la catégorie est celle qu'on a choisie, la
 *    montrer ne révèle rien qu'on ne sache déjà ;
 *  - **« Tous »** — l'afficher d'office reviendrait à souffler la réponse sur
 *    les motifs qui *sont* la solution : « mat en 1 » ne laisse plus rien à
 *    trouver. Elle se demande donc, d'un bouton, comme un indice assumé.
 */
function CategorieDuPuzzle({
  puzzle,
  filtre,
  locale,
  visible,
  onDemander,
  className,
}: {
  puzzle: Puzzle | null
  filtre: string
  locale: Locale
  /** Vrai quand on a demandé à la voir — l'état vit dans la page. */
  visible: boolean
  onDemander: () => void
  className?: string
}) {
  if (!puzzle) return null

  const choisi = filtre !== 'all' && puzzle.themes.includes(filtre) ? filtre : null
  const motif =
    choisi ?? THEMES.find((entree) => entree.id !== 'all' && puzzle.themes.includes(entree.id))?.id
  if (!motif) return null

  const label = THEMES.find((entree) => entree.id === motif)?.label ?? motif
  const definition = motifCopy(motif as MotifId, locale)?.definition

  if (!choisi && !visible) {
    return (
      <button
        type="button"
        onClick={onDemander}
        className={clsx(
          'shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted',
          'transition-colors hover:bg-surface-hover hover:text-ink',
          className,
        )}
      >
        Voir la catégorie
      </button>
    )
  }

  return (
    <Chip tone="accent" className={clsx('shrink-0', className)} title={definition}>
      {label}
    </Chip>
  )
}
