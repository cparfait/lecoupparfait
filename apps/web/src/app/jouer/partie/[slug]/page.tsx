'use client'

/**
 * Partie en direct.
 *
 * L'écran de jeu en ligne. Tout ce qui touche aux règles et aux pendules vient
 * du serveur ; cette page se contente d'afficher l'état reçu et d'envoyer les
 * intentions du joueur.
 *
 * Un point d'attention particulier : la **reconnexion**. Une partie d'échecs
 * dure plusieurs minutes, un téléphone passe du Wi-Fi à la 4G, un onglet se met
 * en veille. La bannière de connexion est donc toujours visible quand quelque
 * chose ne va pas, et le serveur garde la place du joueur tant que personne ne
 * l'attend.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Eye,
  Flag,
  Handshake,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  Swords,
  WifiOff,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  SIMPLE_VALUES,
  START_FEN,
  capturedPieces,
  formatTimeControl,
  normalizeTimeControlId,
  parseTimeControl,
} from '@coupparfait/core'
import { ChessBoard, ViewToggle } from '@/components/board/ChessBoard.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import { usePhysicalBoard } from '@/lib/board/usePhysicalBoard.ts'
import { useEcranAllume } from '@/lib/ecranAllume.ts'
import { MoveList } from '@/components/game/MoveList.tsx'
import { RubanCoups, rubanDepuisLesCoups } from '@/components/game/RubanCoups.tsx'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { Button, ButtonLink, Card, Chip, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useLiveGame } from '@/lib/game/useLiveGame.ts'
import { oublierPartieEnLigne, retenirPartieEnLigne } from '@/lib/game/partieEnLigne.ts'
import { usePrecoup } from '@/lib/game/usePrecoup.ts'
import { playMoveForSan, playResultSound, playSound } from '@/lib/sound.ts'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { useQualitesDesCoups } from '@/lib/game/useQualitesDesCoups.ts'
import { useGrandEcran } from '@/lib/useMediaQuery.ts'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { ChatMessage } from '@/lib/game/useLiveGame.ts'
import { toPlayedMove, type PlayedMove } from '@/lib/game/useChessGame.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'
import { requestHint } from '@/lib/game/useBotPlayer.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import { useDialogue } from '@/lib/useDialogue.ts'

/**
 * De quoi reconnaître un message parmi les autres.
 *
 * Les messages n'ont pas d'identifiant : on prend ce qui les distingue —
 * l'instant, l'auteur, le texte. Deux messages identiques envoyés dans la même
 * milliseconde se confondraient ; c'est le même message, à toutes fins utiles.
 */
function cleDuMessage(message: ChatMessage): string {
  return `${message.at}·${message.from}·${message.text}`
}

/**
 * Combien de temps un coup optimiste reste affiché sans réponse du serveur.
 *
 * Passé ce délai, la pièce revient : mieux vaut un retour tardif qu'une
 * position que le serveur n'a jamais confirmée.
 */
const DELAI_COUP_EN_ATTENTE_MS = 3000

/** Un paramètre de l'adresse, lu directement du navigateur. `null` côté serveur. */
function parametreDeLAdresse(nom: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(nom)
}

export default function LiveGamePage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
  const locale = usePreferences((state) => localeDuContenu(state.locale))

  /**
   * La cadence demandée, lue sans jamais se contenter du défaut.
   *
   * C'est ce paramètre qui *crée* le salon : le premier arrivant l'annonce au
   * serveur, qui règle les pendules dessus une fois pour toutes. Un salon né
   * sur la valeur de repli ne se rattrape donc plus — la partie se jouait en
   * 10|5 quelle que soit la cadence choisie à l'écran d'avant.
   *
   * `useSearchParams` peut rendre une collection vide au tout premier rendu
   * d'une page pré-rendue ; l'adresse du navigateur, elle, est toujours juste.
   * On la relit donc en second recours, avant de tomber sur le défaut.
   */
  const timeControlId = normalizeTimeControlId(
    search.get('tc') ?? parametreDeLAdresse('tc') ?? '600+5',
  )
  const rated = (search.get('classee') ?? parametreDeLAdresse('classee')) === '1'

  const [guestName, setGuestName] = useState<string | undefined>()
  const [token, setToken] = useState<string | null>(null)
  /**
   * Vrai quand on sait sous quel nom et avec quel jeton se présenter.
   *
   * Le socket ne s'ouvre qu'à ce moment-là. Ouvert plus tôt, il envoyait un
   * premier `join` sans jeton — qui consommait le souhait de couleur de
   * l'hôte — puis un second, le bon, qui n'en avait plus. On attend que la
   * réponse soit là, réussie ou non : sans jeton on joue en invité, mais on
   * ne se présente qu'une fois.
   */
  const [pret, setPret] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  /**
   * La flèche du dernier indice demandé, et le fait de l'avoir annoncé.
   *
   * L'indice existe ici à découvert : on peut le demander, et l'adversaire est
   * prévenu dans le tchat de la partie. Interdire l'aide ne l'empêche pas — le
   * moteur tourne dans le navigateur, la page d'analyse est à un onglet — alors
   * que l'annoncer, si.
   */
  const [flecheIndice, setFlecheIndice] = useState<Arrow | null>(null)
  const [indiceAnnonce, setIndiceAnnonce] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  /**
   * Le jeton du temps réel, demandé au serveur Next avec le cookie de session.
   * Il ne vit que quinze minutes : le crochet de partie le redemande avant
   * chaque `join`, donc à chaque reconnexion.
   */
  const obtenirJeton = useCallback(async (): Promise<string | null> => {
    const response = await fetch('/api/auth/token', { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { token?: string | null }
    return data.token ?? null
  }, [])

  // Pseudo d'invité et jeton de session, tous deux côté navigateur.
  useEffect(() => {
    try {
      setGuestName(localStorage.getItem('coupparfait.guestName') ?? undefined)
    } catch {
      // Sans stockage local, on jouera sous le nom « Invité ».
    }
    obtenirJeton()
      .then((jeton) => setToken(jeton))
      .catch(() => setToken(null))
      .finally(() => setPret(true))
  }, [obtenirJeton])

  const game = useLiveGame({
    slug: params.slug,
    guestName,
    timeControl: timeControlId,
    rated,
    token,
    obtenirJeton,
    enabled: pret,
  })

  const { snapshot, color, pendule, connection, chat } = game

  /**
   * Demander le meilleur coup au moteur, et le dire à l'adversaire.
   *
   * L'ordre compte : on annonce **avant** d'afficher la flèche, pour que le
   * message parte même si le moteur met deux secondes ou échoue. Annoncer après
   * coup laisserait une fenêtre — courte, mais réelle — où l'on a vu le coup
   * sans que l'autre le sache.
   *
   * La confirmation n'est pas une formalité : c'est le seul moment où l'on peut
   * renoncer, et le libellé dit exactement ce qui va se passer.
   */
  const demanderIndice = useCallback(async () => {
    if (!snapshot || color === null || snapshot.turn !== color) return
    if (
      !confirm(
        'Demander le meilleur coup au moteur ?\n\nTon adversaire en sera informé dans le tchat de la partie.',
      )
    ) {
      return
    }

    game.annoncerIndice()
    setIndiceAnnonce(true)

    try {
      const indice = await requestHint(snapshot.fen, 14)
      if (!indice) return
      // Orange, comme dans la partie contre l'ordinateur : une seule couleur
      // pour une seule idée, d'un écran à l'autre.
      setFlecheIndice({ from: indice.from, to: indice.to, color: 'orange', weight: 'bold' })
      playSound('notify')
    } catch {
      toast.error('Impossible de calculer un indice pour le moment.')
    }
  }, [snapshot, color, game])

  // La flèche ne survit pas au coup suivant : elle pointerait des cases qui ont
  // changé, ce qui est pire que pas de flèche du tout.
  const coupsAuDernierIndice = useRef(0)
  useEffect(() => {
    if (!snapshot) return
    if (flecheIndice === null) {
      coupsAuDernierIndice.current = snapshot.moves.length
      return
    }
    if (snapshot.moves.length !== coupsAuDernierIndice.current) setFlecheIndice(null)
  }, [snapshot, flecheIndice])

  // ── Effets sonores ──────────────────────────────────────────────────────
  // Le son se choisit sur la notation du dernier coup seule : rien ici n'a
  // besoin de rejouer la partie entière pour ça.
  const lastMoveCount = useRef(0)
  useEffect(() => {
    if (!snapshot) return
    if (snapshot.moves.length > lastMoveCount.current) {
      const last = snapshot.moves[snapshot.moves.length - 1] ?? ''
      playMoveForSan(last)
    }
    lastMoveCount.current = snapshot.moves.length
  }, [snapshot])

  const finished = useRef(false)
  useEffect(() => {
    if (!snapshot || finished.current) return
    if (snapshot.status === 'playing' || snapshot.status === 'waiting') return
    finished.current = true
    const won = color !== null && snapshot.result === (color === 'w' ? '1-0' : '0-1')
    playResultSound(snapshot.result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
  }, [snapshot, color])

  /*
    Le chemin du retour, retenu tant que la partie dure.

    Une partie en direct n'existe qu'en mémoire du serveur : rien ne permet de
    la retrouver depuis un autre écran, et quelqu'un qui quittait l'onglet
    n'avait plus que son historique de navigation — ou la conversation où le
    lien avait été reçu. Le siège, lui, reste gardé tant que l'adversaire
    n'attend pas devant l'échiquier : le retour est
    donc possible, il n'était simplement pas trouvable.

    Réservé à qui joue : un spectateur n'a pas de partie à reprendre. Et effacé
    dès qu'elle est finie, pour que le bandeau ne propose pas de retourner
    quelque part où il n'y a plus rien à faire.
  */
  useEffect(() => {
    if (!snapshot || !color) return
    if (snapshot.status !== 'playing' && snapshot.status !== 'waiting') {
      oublierPartieEnLigne()
      return
    }
    const adverse = color === 'w' ? 'b' : 'w'
    retenirPartieEnLigne({
      slug: snapshot.slug,
      // L'adresse complète : la cadence en fait partie, et c'est elle qui crée
      // le salon si l'on revient avant l'adversaire.
      href: `${window.location.pathname}${window.location.search}`,
      adversaire: snapshot.players[adverse]?.name ?? null,
    })
  }, [snapshot, color])

  // Proposition de nulle reçue.
  useEffect(() => {
    if (!snapshot?.drawOfferFrom || !color) return
    if (snapshot.drawOfferFrom === color) return
    playSound('notify')
    toast.info('Ton adversaire propose la nulle.', 'Accepte ou refuse ci-dessous.')
  }, [snapshot?.drawOfferFrom, color])

  useEffect(() => {
    if (game.error) {
      toast.error(game.error)
      game.dismissError()
    }
  }, [game])

  // ── Le tchat, quand on ne le regarde pas ────────────────────────────────
  //
  // Un message arrivait sans un bruit ni un signe : sur téléphone le panneau
  // est replié, et sur grand écran il vit en bas d'une colonne qu'on ne
  // regarde pas — on joue, on fixe l'échiquier. L'adversaire écrivait « bien
  // joué » et n'obtenait jamais de réponse.
  //
  // Trois signaux, du plus discret au plus visible : un son, une pastille sur
  // le bouton « Tchat », et le message lui-même en notification.

  /** Le panneau est-il sous les yeux ? Il est toujours là à partir de `lg`. */
  const grandEcran = useGrandEcran()
  const chatVisible = grandEcran || chatOpen
  /** Côté du plateau, pour aligner les bandeaux dessus. */
  const [cotePlateau, setCotePlateau] = useState<number | null>(null)
  /** L'en-tête de la colonne des coups, où le plateau pose sa bascule de vue. */
  const [emplacementBascule, setEmplacementBascule] = useState<HTMLElement | null>(null)

  const [nonLus, setNonLus] = useState(0)
  useEffect(() => {
    if (chatVisible) setNonLus(0)
  }, [chatVisible, chat.length])

  /**
   * Le dernier message déjà vu, désigné par son contenu et non par un rang.
   *
   * Le fil ne garde que ses quatre-vingts dernières entrées : passé ce seuil,
   * il en perd une par message reçu et sa longueur ne bouge plus. Compter les
   * messages aurait donc rendu le guetteur muet au plus mauvais moment, celui
   * d'une conversation nourrie.
   */
  const dernierVu = useRef<string | null>(null)
  const chatCharge = useRef(false)
  const monNom = color ? (snapshot?.players[color]?.name ?? null) : null

  // L'instantané et le fil de discussion arrivent par le même message du
  // serveur, donc dans le même rendu : ce qui s'y trouve est du passé, et
  // l'annoncer ferait sonner dix fois une conversation qu'on rejoint.
  useEffect(() => {
    if (!snapshot || chatCharge.current) return
    chatCharge.current = true
    dernierVu.current = chat.length > 0 ? cleDuMessage(chat[chat.length - 1]!) : null
  }, [snapshot, chat])

  useEffect(() => {
    if (!chatCharge.current) return

    // Où s'était-on arrêté ? Introuvable, le repère est tombé du fil : on s'en
    // tient alors au dernier message, plutôt que d'annoncer tout l'historique.
    let depuis = 0
    if (dernierVu.current !== null) {
      depuis = chat.length > 0 ? chat.length - 1 : 0
      for (let i = chat.length - 1; i >= 0; i -= 1) {
        if (cleDuMessage(chat[i]!) === dernierVu.current) {
          depuis = i + 1
          break
        }
      }
    }

    const arrives = chat
      .slice(depuis)
      // Ses propres mots ne sont pas une nouvelle, et les messages système —
      // « la partie commence » — ont déjà leur place à l'écran.
      .filter((message) => !message.system && message.from !== monNom)
    if (chat.length > 0) dernierVu.current = cleDuMessage(chat[chat.length - 1]!)

    const dernier = arrives[arrives.length - 1]
    if (!dernier) return

    playSound('notify')
    if (!chatVisible) setNonLus((total) => total + arrives.length)
    toast.info(`${dernier.from} t’écrit`, dernier.text)
  }, [chat, monNom, chatVisible])

  // Le fil ne se déroule pas tout seul : sans cela le dernier message se
  // déposait sous le bord du cadre, et la pastille annonçait un message
  // qu'ouvrir le tchat ne montrait pas.
  const filDuChat = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fil = filDuChat.current
    if (fil) fil.scrollTop = fil.scrollHeight
  }, [chat, chatOpen])

  /**
   * Sur téléphone, le tchat s'ouvre **par-dessus** la partie.
   *
   * Il était un bloc de plus au bas de la colonne, derrière la liste des
   * coups : on appuyait sur « Tchat », rien ne semblait se passer, et le
   * panneau s'ouvrait bien — à un écran et demi plus bas. On rattrapait cela
   * en faisant défiler la page jusqu'à lui, ce qui emmenait l'échiquier hors
   * de l'écran : pour écrire un mot, on perdait la partie de vue.
   *
   * Une conversation pendant une partie est une surcouche, pas une section :
   * elle vient devant, elle se referme, et l'échiquier reste là-dessous.
   * `useDialogue` fournit ce qu'on attend d'une surcouche — Échap, le focus
   * posé dans la saisie, le piège à tabulation, et le focus rendu en partant.
   *
   * Sur grand écran, rien ne change : le panneau vit dans la colonne, en
   * permanence, et le bouton « Tchat » n'existe pas.
   */
  const cadreDuChat = useRef<HTMLDivElement>(null)
  const saisieDuChat = useRef<HTMLInputElement>(null)
  const tchatEnSurcouche = chatOpen && !grandEcran
  useDialogue(cadreDuChat, {
    onFermer: () => setChatOpen(false),
    focusInitial: saisieDuChat,
    actif: tchatEnSurcouche,
  })

  // ── Coups légaux ────────────────────────────────────────────────────────
  // Hors de son tour, aucun : le serveur reste maître, mais autant ne pas
  // laisser croire le contraire au plateau.
  /*
    ── Le coup optimiste ────────────────────────────────────────────────────

    Sans lui, la pièce faisait l'aller-retour : lâchée sur sa case d'arrivée,
    elle retournait à son départ le temps que le serveur réponde, puis
    repartait. Sur une bonne connexion c'est un clignotement ; sur la 4G,
    c'est un coup qu'on croit refusé.

    On garde donc **un** coup en attente, avec la position qu'il doit donner,
    calculée ici avec chess.js. L'échiquier affiche cette position tant que
    le serveur n'a pas parlé ; dès que l'instantané change — le coup accepté,
    ou n'importe quoi d'autre —, ou qu'une erreur arrive, on l'oublie. Une
    expiration ferme le tout si le serveur ne répond pas.

    Le serveur reste maître : on n'affiche que ce qu'il va presque sûrement
    confirmer, et jamais plus d'un coup d'avance.
  */
  const [coupEnAttente, setCoupEnAttente] = useState<{
    from: Square
    to: Square
    fenDepart: string
    fenAttendu: string
  } | null>(null)

  useEffect(() => {
    if (!coupEnAttente) return
    if (snapshot && snapshot.fen !== coupEnAttente.fenDepart) {
      setCoupEnAttente(null)
      return
    }
    const minuteur = setTimeout(() => setCoupEnAttente(null), DELAI_COUP_EN_ATTENTE_MS)
    return () => clearTimeout(minuteur)
  }, [coupEnAttente, snapshot])

  useEffect(() => {
    if (game.error) setCoupEnAttente(null)
  }, [game.error])

  /** La position du direct telle que l'échiquier la montre, coup en attente compris. */
  const fenAffichee = coupEnAttente?.fenAttendu ?? snapshot?.fen
  const dernierCoupAffiche = coupEnAttente
    ? { from: coupEnAttente.from, to: coupEnAttente.to }
    : (snapshot?.lastMove ?? null)

  // Pendant qu'un coup attend sa confirmation, aucun n'est légal : le geste
  // suivant retombe sur la branche pré-coup de l'échiquier, ce qui est
  // exactement ce qu'on veut en blitz.
  const legalMoves = useLegalMoves(
    snapshot?.fen,
    Boolean(snapshot) &&
      Boolean(color) &&
      snapshot?.turn === color &&
      snapshot?.status === 'playing' &&
      coupEnAttente === null,
  )

  const checkSquare = useMemo(() => {
    if (!fenAffichee) return null
    try {
      const board = new Chess(fenAffichee, { skipValidation: true })
      if (!board.inCheck()) return null
      return board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
    } catch {
      return null
    }
  }, [fenAffichee])

  const playedMoves = useMemo<PlayedMove[]>(() => {
    if (!snapshot) return []
    const board = new Chess()
    const list: PlayedMove[] = []
    for (const san of snapshot.moves) {
      try {
        // `at` vaut l'heure de la reconstruction et non celle du coup : la
        // liste est rebâtie depuis l'instantané du serveur, qui ne transporte
        // pas les horodatages. Rien ici ne les lit.
        list.push(toPlayedMove(board.move(san)))
      } catch {
        break
      }
    }
    return list
  }, [snapshot])

  const opening = useCurrentOpening(snapshot?.moves ?? [], locale)

  /*
    La qualité de chaque coup, pour colorer la notation dans la liste.

    Le moteur tourne dans le navigateur et ne juge que les coups **déjà
    joués** : il ne propose jamais celui qui vient. Cela reste une aide — savoir
    en direct qu'on vient de gaffer est une information que la partie ne donnait
    pas —, et c'est un choix assumé de cet écran, qui est celui des parties
    entre amis.
  */
  const { book } = useOpeningBook()
  const { parRang: qualites, bilan } = useQualitesDesCoups({ moves: playedMoves, book })

  // ── Revoir les coups sans quitter la partie ─────────────────────────────
  //
  // La liste des coups était figée : on ne pouvait ni revenir sur la position
  // d'il y a trois coups, ni simplement revoir celui de l'adversaire qu'on a
  // manqué en regardant ailleurs. C'est pourtant en direct qu'on en a le plus
  // besoin — après, la partie est finie et l'analyse prend le relais.
  //
  // La pendule, elle, continue de tourner : rien n'est suspendu, on regarde en
  // arrière pendant que le direct avance, et le bandeau le rappelle.

  /** Demi-coup que l'on revoit ; `null` quand on suit le direct. */
  const [revu, setRevu] = useState<number | null>(null)
  const dernierDemiCoup = playedMoves.length - 1

  /** Les coups tels que le ruban les attend, verdicts compris. */
  const rubanCoups = useMemo(
    () => rubanDepuisLesCoups(playedMoves, qualites),
    [playedMoves, qualites],
  )

  const revoir = useCallback(
    (ply: number) => {
      // Revenir au dernier coup, c'est revenir au direct — sinon la position
      // resterait figée sur ce coup-là et le coup suivant ne s'afficherait pas.
      setRevu(ply >= dernierDemiCoup ? null : Math.max(-1, ply))
    },
    [dernierDemiCoup],
  )

  // Une partie qui reprend à zéro — reprise acceptée, revanche — ne doit pas
  // laisser le regard sur un coup qui n'existe plus.
  useEffect(() => {
    setRevu((actuel) => (actuel !== null && actuel > dernierDemiCoup ? null : actuel))
  }, [dernierDemiCoup])

  /** La position regardée, quand ce n'est pas celle du direct. */
  const revue = useMemo(() => {
    if (revu === null) return null
    const coup = revu >= 0 ? playedMoves[revu] : undefined
    const fen = coup?.after ?? playedMoves[0]?.before ?? START_FEN
    let echec: Square | null = null
    try {
      const board = new Chess(fen, { skipValidation: true })
      if (board.inCheck()) {
        echec = board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
      }
    } catch {
      // Position inattendue : on affiche sans marquer d'échec.
    }
    return {
      fen,
      lastMove: coup ? { from: coup.from, to: coup.to } : null,
      checkSquare: echec,
    }
  }, [revu, playedMoves])

  /*
    Le matériel capturé, comme en partie locale et contre l'ordinateur.

    Il manquait ici seul : le serveur n'envoie que la position, et cet écran se
    contentait de l'afficher. Il n'y a pourtant rien à demander au réseau — les
    pièces manquantes d'une position se comptent depuis le FEN.

    On compte sur la position *regardée* et non sur celle du direct : quand on
    remonte les coups, les bandeaux doivent raconter le même moment que
    l'échiquier.
  */
  const material = useMemo(() => {
    const fen = revue?.fen ?? snapshot?.fen ?? START_FEN
    try {
      const captured = capturedPieces(new Chess(fen, { skipValidation: true }))
      const valeur = (pieces: PieceSymbol[]) =>
        pieces.reduce((somme, piece) => somme + SIMPLE_VALUES[piece], 0)
      return { ...captured, balance: valeur(captured.w) - valeur(captured.b) }
    } catch {
      return { w: [] as PieceSymbol[], b: [] as PieceSymbol[], balance: 0 }
    }
  }, [revue, snapshot?.fen])

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!snapshot || snapshot.status !== 'playing' || snapshot.turn !== color) return
      // Un coup illégal ici ne part pas : le serveur le refuserait de toute
      // façon, et l'échiquier a déjà signalé le refus. Sans cette garde, on
      // afficherait une position que le serveur ne confirmera jamais.
      const board = new Chess(snapshot.fen, { skipValidation: true })
      try {
        board.move({ from, to, promotion })
      } catch {
        return
      }
      setCoupEnAttente({ from, to, fenDepart: snapshot.fen, fenAttendu: board.fen() })
      game.move(from, to, promotion)
    },
    [game, snapshot, color],
  )

  /*
    Les pré-coups, enfin branchés.

    C'est ici qu'ils comptent le plus : une partie en direct a une pendule, et
    l'aller-retour réseau s'ajoute au temps de réflexion. Poser son coup pendant
    que l'adversaire réfléchit est ce qui rend le blitz jouable.

    L'échiquier reste « jouable » même quand ce n'est pas notre trait — sans
    cela on ne pourrait pas saisir ses propres pièces, et aucun pré-coup ne
    serait enregistrable. Rien ne part pour autant : `legalMoves` est vide en
    dehors de son tour, donc tout geste retombe sur la branche pré-coup.
  */
  const { precoup, enregistrer, annuler } = usePrecoup({
    fen: snapshot?.fen ?? START_FEN,
    couleur: color,
    actif: revu === null && snapshot?.status === 'playing',
    jouer: handleMove,
  })

  // ── Échiquier électronique ──────────────────────────────────────────────
  //
  // En direct, on ne dispose pas de l'objet chess.js de la partie — c'est le
  // serveur qui fait foi. On en reconstruit un sur la position courante : le
  // rapprochement n'a besoin que des coups légaux d'une position.
  //
  // Les crochets se déclarent avant les retours anticipés d'attente, d'où
  // cette position dans le fichier plutôt qu'à côté de l'affichage.
  const liveFen = snapshot?.fen ?? START_FEN
  const liveChess = useMemo(() => new Chess(liveFen, { skipValidation: true }), [liveFen])
  const physicalBoard = usePhysicalBoard({
    chess: liveChess,
    fen: liveFen,
    isLive:
      color !== null &&
      snapshot?.turn === color &&
      snapshot?.status === 'playing' &&
      coupEnAttente === null,
    play: handleMove,
    lastMove: snapshot?.lastMove ?? null,
  })

  // L'adversaire réfléchit, on ne touche à rien, et l'écran du téléphone
  // s'éteint : au retour, la pendule a tourné. Le crochet se déclare avant les
  // retours anticipés, comme tous les autres.
  useEcranAllume(snapshot?.status === 'playing' || snapshot?.status === 'waiting')

  // ── États d'attente ─────────────────────────────────────────────────────
  if (connection === 'connecting' || !snapshot) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4">
        <Card className="w-full p-8 text-center">
          <Spinner size={26} className="mx-auto text-accent" />
          <p className="mt-4 text-sm font-medium">Connexion à la partie…</p>
          <p className="mt-1 text-xs text-muted">Partie {params.slug}</p>
        </Card>
      </div>
    )
  }

  if (connection === 'error') {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4">
        <Card className="w-full p-8 text-center">
          <WifiOff size={28} className="mx-auto text-[var(--q-blunder)]" aria-hidden />
          <p className="mt-4 font-medium">Serveur de parties injoignable</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Le service temps réel ne répond pas. Vérifie qu’il est démarré, ou joue contre
            l’ordinateur en attendant — cela fonctionne entièrement dans ton navigateur.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Card>
      </div>
    )
  }

  const orientation: Color = color ?? 'w'
  const opponentColor: Color = orientation === 'w' ? 'b' : 'w'
  const me = snapshot.players[orientation]
  const opponent = snapshot.players[opponentColor]
  const waiting = snapshot.status === 'waiting'
  const over = snapshot.status !== 'playing' && snapshot.status !== 'waiting'
  /*
    La cadence affichée est celle du salon, pas celle de l'adresse.

    Les deux se ressemblent tant qu'on arrive par le lien qui a créé la partie.
    Elles divergent dès qu'on arrive autrement — depuis « Regarder », depuis
    l'accueil, depuis un lien recopié à la main sans son paramètre —, et
    l'écran affichait alors une pendule de 10 minutes au-dessus d'une partie de
    trois, avec l'alerte de temps réglée sur le mauvais seuil.

    Le serveur, lui, sait : c'est lui qui tient les pendules.
  */
  const timeControl = snapshot.timeControl ??
    parseTimeControl(timeControlId) ?? { initial: 600, increment: 5 }
  const drawOfferedToMe =
    snapshot.drawOfferFrom !== null && color !== null && snapshot.drawOfferFrom !== color

  /**
   * Les actions, rendues une seule fois : sous le plateau jusqu'à `lg`, au
   * pied de la colonne des coups au-delà.
   *
   * Une partie finie n'a plus rien à proposer : « Proposer nulle » et
   * « Abandonner » se désactivent en même temps, et il ne reste qu'une barre
   * grise. La boîte de résultat refermée, on est devant un échiquier mort
   * sans aucune porte — celles-ci prennent la place des autres.
   *
   * Plus de « Reprendre » entre deux joueurs : le bouton demandait une
   * reprise de coup à l'adversaire, qui pouvait l'accepter. C'est courtois
   * entre amis et douteux partout ailleurs — sur une partie classée, cela
   * revient à négocier le résultat une fois le coup vu. Le geste existe
   * toujours côté serveur ; simplement, plus rien ici ne le propose.
   */
  const actions = (
    <>
      {over ? (
        <>
          <ButtonLink href="/jouer/ami" size="sm" variant="primary" icon={<Swords size={14} />}>
            Nouvelle partie
          </ButtonLink>
          <ButtonLink href="/jouer" size="sm" variant="ghost" icon={<LayoutGrid size={14} />}>
            Menu
          </ButtonLink>
        </>
      ) : drawOfferedToMe ? (
        <>
          <Button size="sm" variant="primary" onClick={game.offerDraw}>
            Accepter la nulle
          </Button>
          <Button size="sm" variant="ghost" onClick={game.declineDraw}>
            Refuser
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          icon={<Handshake size={14} />}
          onClick={game.offerDraw}
          disabled={over || waiting || color === null}
        >
          {snapshot.drawOfferFrom === color ? 'Nulle proposée' : 'Proposer nulle'}
        </Button>
      )}

      {/* ── L'indice, à découvert ────────────────────────────────────────
          Il n'existait pas ici, et pour une bonne raison : demander le meilleur
          coup au moteur pendant qu'on joue contre quelqu'un, c'est jouer à deux
          contre un.

          Sauf que l'interdire ne l'empêche pas. Le moteur tourne dans le
          navigateur, la page d'analyse est à un onglet, et celui qui veut
          tricher trichait déjà — sans que l'autre en sache rien. La seule chose
          que l'application puisse vraiment garantir, ce n'est pas l'absence
          d'aide, c'est **la transparence** : le bouton existe, et l'adversaire
          est prévenu à l'instant où on l'utilise, par un message dans le tchat
          de la partie.

          D'où la confirmation avant : ce n'est pas un geste anodin, et personne
          ne doit l'apprendre après coup.

          Le premier clic suffit à prévenir — le serveur n'annonce qu'une fois
          par joueur et par partie —, mais le bouton reste utilisable ensuite :
          l'information est déjà passée, et une aide qui se refuse au deuxième
          coup n'aurait aucun sens. */}
      <Button
        size="sm"
        variant="secondary"
        icon={<Lightbulb size={14} />}
        onClick={demanderIndice}
        disabled={over || waiting || color === null || snapshot.turn !== color}
        title={
          indiceAnnonce
            ? 'Ton adversaire a déjà été prévenu. Demander un autre indice.'
            : 'Demander le meilleur coup au moteur. Ton adversaire en sera informé.'
        }
      >
        <span className="max-sm:hidden">Indice</span>
      </Button>

      <Button
        size="sm"
        variant="secondary"
        icon={<Flag size={14} />}
        onClick={() => {
          if (confirm('Abandonner la partie ?')) game.resign()
        }}
        disabled={over || waiting || color === null}
      >
        Abandonner
      </Button>
    </>
  )

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 lg:py-6">
      {connection === 'disconnected' && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-inaccuracy)_16%,transparent)] px-3 py-2 text-sm text-[var(--q-inaccuracy)]">
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Connexion perdue — reconnexion en cours. Ta place est gardée : tu ne perds la partie que
          si ton adversaire attend, et pas avant la moitié de la cadence.
        </div>
      )}

      {/* Les zones sont placées par nom : voir `.grille-partie` dans
          `globals.css`. Même grille que la partie contre l'ordinateur — en
          paysage, le plateau à gauche et tout le reste à droite. */}
      <div
        className="grille-partie [--aside:340px]"
        style={
          cotePlateau
            ? ({ '--cote-plateau': `${cotePlateau}px` } as React.CSSProperties)
            : undefined
        }
      >
        {/* ── Échiquier ──────────────────────────────────────────── */}
        <PlayerBar
          className="[grid-area:pion]"
          name={opponent?.name ?? 'En attente…'}
          rating={opponent?.rating ?? null}
          color={opponentColor}
          clock={pendule}
          timeControl={timeControl}
          active={snapshot.turn === opponentColor && !over}
          captured={material[opponentColor]}
          materialLead={
            opponentColor === 'w' ? Math.max(0, material.balance) : Math.max(0, -material.balance)
          }
          status={opponent && !opponent.connected ? 'déconnecté' : undefined}
        />

        <div className="[grid-area:plateau] flex min-h-0 min-w-0 flex-col">
          <div className="my-1.5 flex min-h-0 flex-1 items-center justify-center">
            <ChessBoard
              fitParentHeight
              reservedHeight={9}
              onFit={setCotePlateau}
              // Sur grand écran, la bascule vit en tête de la colonne des coups — dessinée

              // par le plateau, qui garde ainsi son bouton de plein écran. En dessous,

              // elle reprend sa rangée sous le plateau.

              emplacementBascule={grandEcran ? emplacementBascule : undefined}
              fen={revue?.fen ?? fenAffichee ?? snapshot.fen}
              orientation={orientation}
              playable={
                revue === null && color !== null && snapshot.status === 'playing' ? color : null
              }
              legalMoves={legalMoves}
              onMove={handleMove}
              onPremove={enregistrer}
              onPremoveCancel={annuler}
              premove={precoup}
              lastMove={revue ? revue.lastMove : dernierCoupAffiche}
              dernierCoupSan={snapshot.moves[snapshot.moves.length - 1] ?? null}
              checkSquare={revue ? revue.checkSquare : checkSquare}
              // Cinq autres pages l'annonçaient, celle-ci non : le mat qu'on
              // vient de porter à un ami passait donc inaperçu, alors que
              // c'est le seul moment de la partie qui mérite une animation.
              checkmate={snapshot.status === 'checkmate'}
              // La flèche de l'indice, quand on en a demandé un. Elle s'efface
              // au coup suivant : voir `demanderIndice`.
              arrows={flecheIndice ? [flecheIndice] : undefined}
            />
          </div>

          {/* ── Le ruban des coups, sous l'échiquier ──────────────────────
            Revoir le coup précédent demandait de descendre : les flèches
            vivent dans la liste des coups, qui est dans la colonne de droite —
            c'est-à-dire, sur téléphone, sous l'échiquier, sous la barre
            d'actions et sous le tchat. On quittait donc la position des yeux
            pour aller chercher le bouton qui sert à la revoir.

            Le ruban est celui de la partie contre l'ordinateur, où il rend ce
            service depuis toujours : trois coups, deux flèches, à portée de
            pouce et immédiatement sous le plateau. À partir de `lg`, la liste
            complète est à côté de l'échiquier et le ruban n'a plus lieu
            d'être. */}
          {rubanCoups.length > 0 && (
            <RubanCoups
              coups={rubanCoups}
              cursor={revu ?? dernierDemiCoup}
              onSeek={revoir}
              className="mt-1.5 lg:hidden"
            />
          )}

          {/* Le retour au direct, en clair et à portée de pouce : sans lui, on
            se retrouve devant un échiquier qui refuse les coups sans dire
            pourquoi — et l'adversaire attend. */}
          {revue !== null && (
            <div className="mb-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 px-3 py-2 text-[14px]">
              <Eye size={15} className="shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 flex-1 leading-snug text-muted">
                {/* La pendule ne tourne plus quand la partie est finie :
                  l'écrire quand même ferait courir un temps qui n'existe
                  pas, et presserait quelqu'un qui a tout le sien. */}
                {over
                  ? 'Tu revois un coup passé. La partie est terminée, rien ne presse.'
                  : 'Tu revois un coup passé. La pendule, elle, continue.'}
              </span>
              <button
                type="button"
                onClick={() => setRevu(null)}
                // Au doigt, la cible fait 44 px : c'est le bouton qu'on
                // cherche en urgence, la pendule tourne.
                className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110 pointer-coarse:min-h-11"
              >
                Revenir au direct
              </button>
            </div>
          )}
        </div>

        <PlayerBar
          className="[grid-area:moi]"
          name={me?.name ?? 'Toi'}
          rating={me?.rating ?? null}
          color={orientation}
          clock={pendule}
          timeControl={timeControl}
          active={snapshot.turn === orientation && !over}
          // L'état du tour, dans le bandeau : c'est lui qu'on regarde pour
          // savoir si c'est à soi.
          status={snapshot.turn === orientation && !over && !waiting ? 'À toi de jouer' : undefined}
          captured={material[orientation]}
          materialLead={
            orientation === 'w' ? Math.max(0, material.balance) : Math.max(0, -material.balance)
          }
        />

        {/* ── Actions ────────────────────────────────────────── */}
        {/* Jusqu'à `lg` seulement : au-delà, les actions vivent au pied de la
            colonne des coups et le plateau récupère la hauteur de la barre. */}
        {!grandEcran && (
          <div className="[grid-area:barre] mt-3 flex flex-wrap gap-1.5">
            {/* La bascule 2D / 3D sous `sm` et en paysage : ailleurs elle
                occupait une rangée entière sous l'échiquier pour trois
                boutons alignés à droite. */}
            <ViewToggle className="sm:hidden paysage:flex" />
            {actions}

            <Button
              size="sm"
              variant="ghost"
              icon={<MessageSquare size={14} />}
              onClick={() => setChatOpen((value) => !value)}
              className="relative ml-auto"
            >
              Tchat
              {/* La pastille compte ce qu'on n'a pas lu. Elle est aussi
                  annoncée dans le nom du bouton, sans quoi un lecteur d'écran
                  n'y verrait qu'un chiffre posé à côté d'un mot. */}
              {nonLus > 0 && (
                <span
                  className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[12px] font-bold text-[var(--accent-contrast)]"
                  aria-label={`${nonLus} message${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}`}
                >
                  {nonLus > 9 ? '9+' : nonLus}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* ── Panneau latéral ────────────────────────────────────── */}
        {/*
        Visible sur téléphone, et c'est un changement.

        Toute la colonne était masquée sous `lg` et n'apparaissait qu'en
        appuyant sur « Tchat ». La liste des coups vit dedans : sur téléphone,
        elle n'existait donc pas — sauf à deviner qu'elle se cache derrière un
        bouton qui annonce une conversation.

        On s'en aperçoit surtout à la fin. La partie perdue, les trois boutons
        d'action se désactivent d'un coup et il ne reste rien à toucher :
        impossible de revoir le coup qui a tout fait basculer, au moment
        précis où c'est la seule chose qu'on veuille faire.

        Seul le tchat garde son bouton : une conversation qu'on n'a pas
        ouverte n'a pas à pousser la liste des coups hors de l'écran.
        */}
        <div className="[grid-area:aside] mt-4 flex min-h-0 flex-col gap-3 lg:mt-0 paysage:mt-0 paysage:overflow-y-auto paysage:overscroll-contain">
          {/*
            Spectateur : les deux places étaient prises à l'arrivée. Le dire
            évite de chercher pourquoi l'échiquier ne répond pas.
          */}
          {color === null && !waiting && (
            <Card className="p-3">
              <p className="flex items-center gap-2 text-[14px] leading-relaxed text-muted">
                <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                <span>
                  Tu regardes cette partie.{' '}
                  {snapshot.spectators > 1 && `Vous êtes ${snapshot.spectators} à la suivre. `}
                  Tu peux écrire dans le tchat, mais pas jouer.
                </span>
              </p>
            </Card>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Chip>{formatTimeControl(timeControl)}</Chip>
            <Chip tone={snapshot.rated ? 'accent' : 'neutral'}>
              {snapshot.rated ? 'Classée' : 'Amicale'}
            </Chip>
            {opening && <Chip>{opening.eco}</Chip>}
          </div>

          {opening && <p className="-mt-1 truncate text-xs text-muted">{opening.name}</p>}

          {/* La liste cède la place : c'est elle qui peut se réduire, pas le
              tchat — deux lignes de coups restent lisibles, deux lignes de
              conversation ne sont plus une conversation. */}
          <PhysicalBoardPanel state={physicalBoard} className="p-3.5" />

          {/* Sur téléphone, la liste prend la hauteur de ce qu'elle contient,
              plafonnée à 40 % de la fenêtre. Elle réservait 120 px et poussait
              — trois coups joués, une boîte aux trois quarts vide, et le reste
              du panneau repoussé d'autant.

              Sur grand écran, elle prenait tout ce qui restait : une partie de
              vingt coups remplissait la colonne du haut en bas, et le tchat
              finissait en bande de deux lignes coincée sous la ligne de
              flottaison. Elle s'arrête maintenant à dix rangées — les dix
              derniers coups, c'est ce qu'on relit en jouant — et rend le reste
              au tchat, qui en a plus besoin qu'elle pendant la partie. Les
              coups d'avant sont toujours là, un cran de molette plus haut. */}
          <Card className="flex max-h-[40vh] flex-col overflow-hidden lg:max-h-none lg:min-h-[120px]">
            {grandEcran && (
              <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2">
                <span className="text-[12px] font-semibold text-faint">Coups</span>
                <div ref={setEmplacementBascule} className="ml-auto" />
              </div>
            )}
            <MoveList
              moves={playedMoves}
              cursor={revu ?? dernierDemiCoup}
              onSeek={revoir}
              qualities={qualites}
              maxRows={10}
              className="min-h-0 flex-1"
            />
            {grandEcran && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-line/60 p-2.5">
                {actions}
              </div>
            )}
          </Card>

          {/* ── Tchat ──────────────────────────────────────────── */}
          {/*
            Hauteur imposée plutôt que plafonnée.
            
            Avec un simple plafond, le tchat était le premier à céder sous la
            liste des coups : mesuré à 92 px de haut en fin de colonne, dont la
            moitié pour la saisie — il restait une ligne de messages, ce qui
            n'est plus un tchat mais une fente.
          */}
          {/* Le voile, sous la surcouche : il dit que le reste attend, et un
              geste à côté referme — c'est le réflexe devant tout ce qui
              s'ouvre par-dessus. */}
          {tchatEnSurcouche && (
            <div
              className="fixed inset-0 z-[80] bg-black/45 lg:hidden"
              onClick={() => setChatOpen(false)}
              aria-hidden
            />
          )}
          {/* Un `div` et non une `Card` : la surcouche porte `role="dialog"` et
              son étiquette, que la carte partagée n'a pas à connaître. Elle
              garde son habillage, qui tient dans une classe. */}
          <div
            ref={cadreDuChat}
            role={tchatEnSurcouche ? 'dialog' : undefined}
            aria-modal={tchatEnSurcouche ? true : undefined}
            aria-label={tchatEnSurcouche ? 'Tchat de la partie' : undefined}
            className={clsx(
              'flex flex-col overflow-hidden',
              // `popover` et non `glass` en surcouche : le verre est un voile à
              // 4,5 % d'opacité, fait pour laisser deviner la page qu'il
              // recouvre. Posé sur un échiquier, il laissait passer les pièces
              // au travers des messages. Une surface qui recouvre est opaque.
              // Le bas de la surcouche respecte l'encoche du téléphone : sans
              // cela, la saisie se glissait sous la barre du système.
              tchatEnSurcouche
                ? 'popover animate-slide-up fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[81] h-[60dvh] shadow-[var(--shadow-lg)]'
                : // Dans la colonne, le tchat prend maintenant la place que la
                  // liste des coups ne réclame plus — 224 px restent son
                  // plancher, pas son plafond.
                  'glass h-56 shrink-0 lg:h-auto lg:min-h-56 lg:flex-1',
              // Le bouton « Tchat » ne commande plus que le tchat : c'est ce
              // qu'il annonce, et la liste des coups n'a plus à en dépendre.
              !chatOpen && 'max-lg:hidden',
            )}
          >
            {/* L'en-tête n'existe que dans la surcouche : dans la colonne, le
                tchat est bordé par ses voisins et n'a rien à annoncer. */}
            {tchatEnSurcouche && (
              <div className="flex items-center justify-between border-b border-line/60 px-3 py-2">
                <p className="text-[12px] font-semibold text-faint">Tchat</p>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="flex items-center justify-center rounded p-1 text-faint transition-colors hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  aria-label="Fermer le tchat"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            )}
            <div
              ref={filDuChat}
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 text-[14px]"
            >
              {chat.length === 0 ? (
                <p className="text-xs text-faint">Dis bonjour à ton adversaire.</p>
              ) : (
                chat.map((message, index) => (
                  <p
                    key={`${message.at}-${index}`}
                    className={message.system ? 'text-xs italic text-faint' : ''}
                  >
                    {!message.system && (
                      <span className="font-semibold text-accent">{message.from} : </span>
                    )}
                    {message.text}
                  </p>
                ))
              )}
            </div>
            <form
              className="flex gap-1.5 border-t border-line/60 p-2"
              onSubmit={(event) => {
                event.preventDefault()
                game.sendChat(chatDraft)
                setChatDraft('')
              }}
            >
              <input
                ref={saisieDuChat}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Message…"
                maxLength={300}
                aria-label="Message de tchat"
                className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[14px] placeholder:text-faint focus:border-accent focus:outline-none"
              />
              <Button
                size="sm"
                type="submit"
                variant="secondary"
                aria-label="Envoyer"
                className="pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              >
                <Send size={13} aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* ── L'attente, au milieu de l'écran ────────────────────────────
          Elle était une carte de plus dans la colonne de droite : sur
          téléphone, elle atterrissait donc sous l'échiquier, sous la barre
          d'actions, à demi coupée par le bord de la fenêtre — on lisait « La
          partie démarrera dès qu'il arriv… ». C'est pourtant le seul message
          de l'écran tant que personne n'est en face, et il n'y a rien d'autre
          à faire que le lire et copier le lien.

          Il passe donc au milieu, par-dessus le reste. Pas de `role="dialog"`
          ni de piège à focus : rien n'est à décider, et l'on doit pouvoir
          continuer à tourner l'échiquier ou ouvrir le tchat pendant qu'on
          attend. */}
      {waiting && (
        <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center p-4">
          <div className="popover pointer-events-auto animate-slide-up w-full max-w-xs p-5 text-center shadow-[var(--shadow-lg)]">
            <Spinner size={22} className="mx-auto text-accent" />
            <p className="mt-3 text-sm font-medium">En attente de ton adversaire…</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Partage l’adresse de cette page. La partie démarrera dès qu’il arrivera.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-4"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href)
                toast.success('Lien copié')
              }}
            >
              Copier le lien
            </Button>
          </div>
        </div>
      )}

      {over && (
        <GameOverDialog
          status={snapshot.status}
          result={snapshot.result}
          playerColor={color}
          opponentName={opponent?.name ?? 'Adversaire'}
          moves={playedMoves}
          bilan={bilan}
          onNewGame={() => window.location.assign('/jouer/ami')}
        />
      )}
    </div>
  )
}
