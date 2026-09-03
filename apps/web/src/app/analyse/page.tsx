'use client'

/**
 * Analyse de partie.
 *
 * L'écran clé de la plateforme. Deux moments :
 *
 *  1. **Import.** On colle un PGN, une FEN ou une liste de coups. Une partie
 *     qui vient de se terminer arrive automatiquement ici.
 *  2. **Relecture.** On navigue coup par coup ; à chaque position, le verdict,
 *     l'explication rédigée, le meilleur coup fléché sur l'échiquier, et la
 *     lecture à voix haute.
 *
 * Le parti pris est de ne jamais afficher un nombre sans le traduire : à côté
 * de « −2.4 » il y a toujours une phrase qui dit ce que ça signifie.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  ClipboardPaste,
  Download,
  Gauge,
  Crown,
  Footprints,
  Loader2,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import {
  QUALITY_STYLES,
  meriteUnMeilleurCoup,
  explainRecommendedMove,
  formatPgnDate,
  formatScore,
  gradePhases,
  weakestPhase,
  PHASE_LABELS,
  type FullGameReport,
  toPgn,
  type MoveQuality,
} from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { ANNOTATION_COLORS } from '@/components/board/boardKit.ts'
import { EvalBar, EvalGraph } from '@/components/game/EvalBar.tsx'
import { GameNav } from '@/components/game/GameNav.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { Button, ButtonLink, Card, Chip, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import {
  parseAnalysisInput,
  rejouerAnalyse,
  runAnalysis,
  type AnalysisOutcome,
  type AnalysisProgress,
} from '@/lib/analysis/runner.ts'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { ImportEnLigne } from '@/components/import/ImportEnLigne.tsx'
import { MesAnalyses } from '@/components/analysis/MesAnalyses.tsx'
import { MesParties } from '@/components/analysis/MesParties.tsx'
import { RelectureGuidee } from '@/components/analysis/RelectureGuidee.tsx'
import { TexteAvecTermes } from '@/components/analysis/TexteAvecTermes.tsx'
import { chargerAnalyse, enregistrerAnalyse } from '@/lib/analysis/enregistrees.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { QuestionLibre } from '@/components/ia/QuestionLibre.tsx'
import { contexteDuCoupAnalyse, questionApprofondir } from '@/lib/ia/contexte.ts'
import { useSan } from '@/lib/notation.ts'
import { speak, stopSpeaking } from '@/lib/speech.ts'
import { playSound } from '@/lib/sound.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'

export default function AnalysisPage() {
  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  /**
   * Camp du joueur, quand la partie lui appartient.
   *
   * Déposé par la boîte de fin de partie en même temps que le PGN ; l'écran
   * d'import le remonte ici, puisque c'est la relecture qui s'en sert.
   */
  const [side, setSide] = useState<Color | null>(null)

  if (!outcome) {
    return (
      <ImportScreen
        running={running}
        progress={progress}
        onStart={() => setRunning(true)}
        onProgress={setProgress}
        onSide={setSide}
        onDone={(result) => {
          setOutcome(result)
          setRunning(false)
          setProgress(null)
        }}
        onError={() => {
          setRunning(false)
          setProgress(null)
        }}
      />
    )
  }

  return <ReviewScreen outcome={outcome} side={side} onReset={() => setOutcome(null)} />
}

// ─────────────────────────────────────────────────────────────────────────────
//  Import
// ─────────────────────────────────────────────────────────────────────────────

function ImportScreen({
  running,
  progress,
  onStart,
  onProgress,
  onSide,
  onDone,
  onError,
}: {
  running: boolean
  progress: AnalysisProgress | null
  onStart: () => void
  /** Signale le camp du joueur trouvé dans la partie déposée. */
  onSide: (side: Color) => void
  onProgress: (progress: AnalysisProgress) => void
  onDone: (outcome: AnalysisOutcome) => void
  onError: () => void
}) {
  const [input, setInput] = useState('')
  /**
   * Dix-huit par défaut, et le curseur monte jusqu'à trente-quatre.
   *
   * Vingt-deux était le réglage précédent, choisi parce que c'est la profondeur
   * à partir de laquelle l'analyse départage deux *bons* coups. C'est vrai, et
   * ce n'est pas ce que vient chercher quelqu'un qui fait analyser sa partie :
   * il veut savoir où il s'est trompé, et dix-huit suffit à repérer toutes les
   * fautes d'un joueur de club — c'est d'ailleurs ce que dit l'aide affichée
   * sous le curseur, qui contredisait donc le réglage qu'elle accompagnait.
   *
   * Le gain est du temps, et le temps est ici le vrai coût : le moteur est
   * partagé, chaque niveau de profondeur supplémentaire allonge l'attente de
   * tout le monde. Qui cherche à départager deux bons coups pousse le curseur —
   * c'est un geste conscient, pour un besoin qui l'est aussi.
   */
  const [depth, setDepth] = useState(18)
  const { book } = useOpeningBook()
  const locale = usePreferences((state) => state.locale)
  const { marquer } = useQuotidien()

  // Une partie qui vient de se terminer est déposée ici par la boîte de fin de
  // partie : on la reprend automatiquement, sans copier-coller.
  // Le camp est déposé par `onSide` avant que l'analyse ne démarre ; on le lit
  // par référence pour ne pas refabriquer `start` à chaque fois.
  /**
   * Qui es-tu, dans cette partie ?
   *
   * Détermine à qui les explications s'adressent — voir `lecteur` dans
   * `explain.ts`. Trois provenances, par ordre de certitude :
   *
   *  1. **Une partie qu'on vient de jouer ici**, déposée avec son camp.
   *  2. **Une partie récupérée chez chess.com ou Lichess** : on connaît le
   *     pseudo cherché, donc le camp. C'était déjà transmis par `onChoisir` et
   *     cela s'arrêtait à `onSide` — la valeur remontait au parent sans jamais
   *     atteindre l'analyse.
   *  3. **Un PGN collé à la main** : on ne sait pas, et on demande.
   *
   * `null` reste possible et légitime : une partie entre deux inconnus n'a pas
   * de « toi », et les explications s'adressent alors à l'auteur de chaque
   * coup, comme avant.
   */
  const [camp, setCamp] = useState<Color | null>(null)
  /**
   * De quoi renoncer à une analyse en cours.
   *
   * Le `signal` était câblé jusqu'au moteur depuis toujours, et personne ne
   * l'utilisait : lancer une analyse de quarante coups engageait pour de bon,
   * sans autre issue que fermer l'onglet. C'est précisément le service gratuit
   * qui rend l'issue nécessaire — quand l'attente peut durer, il faut pouvoir
   * ne pas attendre.
   */
  const abandonRef = useRef<AbortController | null>(null)
  /**
   * Résultat annoncé par la partie qu'on vient de jouer.
   *
   * Sert de secours à l'en-tête `Result` du PGN, et non l'inverse : un PGN
   * collé à la main n'a que son en-tête, mais une partie jouée ici a en plus
   * cette valeur, qui n'a traversé ni une écriture ni une relecture de texte.
   */
  const resultatTransmis = useRef<string | null>(null)
  const [handedOver, setHandedOver] = useState(false)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('coupparfait.pendingAnalysis')
      if (pending) {
        setInput(pending)
        setHandedOver(true)
        sessionStorage.removeItem('coupparfait.pendingAnalysis')
      }
      const played = sessionStorage.getItem('coupparfait.pendingAnalysisSide')
      if (played === 'w' || played === 'b') {
        setCamp(played)
        onSide(played)
        sessionStorage.removeItem('coupparfait.pendingAnalysisSide')
      }
      const issue = sessionStorage.getItem('coupparfait.pendingAnalysisResult')
      if (issue && issue !== '*') {
        resultatTransmis.current = issue
        sessionStorage.removeItem('coupparfait.pendingAnalysisResult')
      }
    } catch {
      // Stockage de session indisponible : sans conséquence.
    }
  }, [])

  const parsed = useMemo(() => (input.trim() ? parseAnalysisInput(input) : null), [input])

  const start = useCallback(async () => {
    if (!parsed || parsed.moves.length === 0) {
      toast.error('Aucun coup reconnu.', 'Colle un PGN, une FEN ou une liste de coups.')
      return
    }

    onStart()
    const abandon = new AbortController()
    abandonRef.current = abandon
    try {
      const result = await runAnalysis({
        signal: abandon.signal,
        moves: parsed.moves,
        startFen: parsed.startFen,
        depth,
        book,
        locale,
        // Le camp du joueur, quand la partie vient de lui : les explications
        // s'adressent alors à lui d'un bout à l'autre, y compris sur les coups
        // de son adversaire. Un PGN collé n'a pas de « toi » — `lecteur` reste
        // nul, et l'on parle à l'auteur de chaque coup comme avant.
        lecteur: camp,
        headers:
          resultatTransmis.current && !estUnResultat(parsed.headers.Result)
            ? { ...parsed.headers, Result: resultatTransmis.current }
            : parsed.headers,
        onProgress,
      })
      onDone(result)
      marquer('analyse')
      toast.success(
        `Analyse terminée (${result.source === 'server' ? 'moteur serveur' : 'moteur navigateur'}).`,
      )

      /*
        On range l'analyse sans le demander, et sans attendre.
        Sans rien demander : personne ne coche « enregistrer » après avoir
        attendu une minute — on veut le résultat, pas un formulaire. Un visiteur
        anonyme n'a rien à refuser non plus, l'appel se termine chez lui sur un
        « pas de compte » silencieux.
        Sans attendre : l'analyse est déjà à l'écran et se lit. Faire patienter
        devant un rapport affiché pour une écriture en base serait absurde, et
        un échec d'écriture ne doit surtout pas ressembler à un échec d'analyse.
      */
      void enregistrerAnalyse(result, {
        moves: parsed.moves,
        startFen: parsed.startFen,
        depth,
        lecteur: camp,
        jouéeIci: handedOver,
      })
    } catch (error) {
      // Une analyse abandonnée n'est pas une panne : on ne s'en excuse pas.
      if (abandon.signal.aborted) {
        onError()
        return
      }
      console.error(error)
      toast.error(
        'L’analyse a échoué.',
        error instanceof Error ? error.message : 'Réessaie dans un instant.',
      )
      onError()
    } finally {
      abandonRef.current = null
    }
  }, [
    parsed,
    depth,
    book,
    locale,
    camp,
    handedOver,
    marquer,
    onStart,
    onProgress,
    onDone,
    onError,
  ])

  /**
   * Rouvre une analyse déjà faite.
   *
   * Rien n'est recalculé : on rapatrie les évaluations conservées et l'on
   * refabrique le rapport localement, ce qui prend quelques millisecondes. Le
   * texte est donc celui du code d'aujourd'hui, pas celui du jour où l'analyse
   * a été lancée — c'est la raison pour laquelle on stocke des chiffres et non
   * de la prose.
   */
  const ouvrirEnregistree = useCallback(
    async (id: string) => {
      onStart()
      try {
        const gardee = await chargerAnalyse(id)
        if (!gardee) {
          toast.error('Analyse introuvable.', 'Elle a peut-être été supprimée.')
          onError()
          return
        }

        if (gardee.lecteur) {
          setCamp(gardee.lecteur)
          onSide(gardee.lecteur)
        }

        onDone(
          await rejouerAnalyse({
            moves: gardee.moves,
            positions: gardee.positions,
            startFen: gardee.startFen ?? undefined,
            headers: gardee.headers,
            book,
            locale,
            lecteur: gardee.lecteur,
          }),
        )
      } catch (error) {
        console.error(error)
        toast.error('Impossible de rouvrir cette analyse.', 'Réessaie dans un instant.')
        onError()
      }
    },
    [book, locale, onStart, onDone, onError, onSide],
  )

  /**
   * L'analyse ne part plus toute seule.
   *
   * Elle démarrait dès l'arrivée quand la partie était transmise depuis la
   * boîte de fin de partie ou l'éditeur. Le raisonnement se tenait — on vient
   * de jouer, on veut voir — mais il décidait à la place du joueur : une
   * partie de quarante coups occupe le moteur une trentaine de secondes sur un
   * serveur partagé, et le seul moyen de ne pas la lancer était d'arriver puis
   * d'appuyer aussitôt sur « Abandonner l'analyse ». Passer par cet écran pour
   * ajuster la profondeur, corriger le camp, ou simplement relire son PGN,
   * était devenu impossible.
   *
   * Le champ est rempli, le camp est retenu, le bouton est juste là : il ne
   * manque qu'un clic, et ce clic appartient au joueur.
   *
   * Ne subsiste que l'avertissement : une partie transmise vide vient d'un
   * défaut de transmission, et le dire tout de suite épargne de chercher
   * pourquoi le bouton reste éteint.
   */
  const videPrevenu = useRef(false)
  useEffect(() => {
    if (!handedOver || videPrevenu.current) return
    if (parsed && parsed.moves.length > 0) return
    if (parsed === null && !input.trim()) return
    videPrevenu.current = true
    toast.warning(
      'La partie transmise ne contenait aucun coup.',
      'Colle le PGN à la main, ou rejoue une partie.',
    )
  }, [handedOver, parsed, input])

  /*
    Sauf quand le clic *est* le choix.

    Dans la liste des parties Chess.com ou Lichess, on a déjà désigné une
    partie parmi trente : la coller dans le champ pour demander ensuite de
    cliquer « Lancer l'analyse » ajoute un geste à quelqu'un qui vient de
    décider. Celle-là part dès qu'elle est lue. Le camp est celui du pseudo
    cherché, et la profondeur celle qui est réglée.
  */
  const lancerDesQueLue = useRef(false)
  useEffect(() => {
    if (!lancerDesQueLue.current) return
    if (!parsed || parsed.moves.length === 0) return
    lancerDesQueLue.current = false
    void start()
  }, [parsed, start])

  /*
    Le champ de collage est replié tant qu'il est vide.

    Sur téléphone, ses huit lignes et leur mode d'emploi repoussaient le
    réglage de profondeur et le bouton « Lancer l'analyse » sous le bord de
    l'écran : on arrivait devant une page qui semblait n'offrir qu'un champ
    vide. Replié, il tient sur une ligne qui dit toujours ce qu'il propose,
    et il s'ouvre de lui-même dès qu'une partie y arrive — collée, transmise
    depuis la fin d'une partie, ou choisie dans une liste.
  */
  const [collageOuvert, setCollageOuvert] = useState(false)
  useEffect(() => {
    if (input.trim() !== '') setCollageOuvert(true)
  }, [input])

  /*
    Et l'import en ligne s'ouvre de lui-même quand on sait déjà qui chercher.

    Replié, il ne coûtait rien à qui colle un PGN ; mais pour qui a noté son
    pseudo sur sa fiche, arriver ici, c'est vouloir ses parties. La section
    s'ouvre donc si un pseudo est mémorisé — et `/analyse?compte=chesscom`
    ou `?compte=lichess` l'ouvre sur ce service-là, quelle que soit la
    mémoire : c'est l'adresse que donne le bouton de la fiche. Lue dans un
    effet plutôt qu'avec `useSearchParams`, qui exigerait une frontière
    `Suspense` autour de toute la page.
  */
  const chesscomUsername = usePreferences((state) => state.chesscomUsername)
  const lichessUsername = usePreferences((state) => state.lichessUsername)
  // Les réglages mémorisés n'arrivent qu'après le premier rendu : avant, les
  // pseudos sont vides et l'on croirait n'en connaître aucun.
  const prefsHydratees = usePreferences((state) => state.hydrated)
  const [importOuvert, setImportOuvert] = useState(false)
  const [serviceDemande, setServiceDemande] = useState<'chesscom' | 'lichess' | null>(null)
  useEffect(() => {
    if (!prefsHydratees) return
    const compte = new URLSearchParams(window.location.search).get('compte')
    if (compte === 'chesscom' || compte === 'lichess') {
      setServiceDemande(compte)
      setImportOuvert(true)
      return
    }
    if (chesscomUsername.trim() || lichessUsername.trim()) setImportOuvert(true)
    // À l'arrivée seulement : ce qu'on tape ensuite ne doit pas rouvrir la section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsHydratees])

  const paste = useCallback(async () => {
    try {
      setInput(await navigator.clipboard.readText())
    } catch {
      toast.warning('Le presse-papiers est inaccessible.', 'Colle le texte à la main.')
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      {/* Titre et promesse tiennent en trois lignes sur téléphone.

          Ils en prenaient sept — un titre de trente-six points et quatre
          lignes de texte —, soit le quart de l'écran avant la moindre
          commande, à chaque visite. La phrase longue reste, mais à partir de
          `sm` : c'est là qu'elle ne coûte rien. */}
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
        Analyse expliquée
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted sm:mt-2 sm:text-base">
        <span className="sm:hidden">
          Coup par coup, ce qui a basculé et le meilleur coup, expliqué.
        </span>
        <span className="max-sm:hidden">
          Colle une partie et découvre, coup par coup, ce qui a basculé — avec le meilleur
          coup montré sur l’échiquier et la raison écrite en toutes lettres.
        </span>
      </p>

      {/* ── D'où vient la partie ? ───────────────────────────────────────
          Trois provenances, trois blocs, et c'est le sujet même de cet écran :
          une partie jouée ici, une partie jouée ailleurs, ou un texte qu'on
          colle. Elles étaient empilées dans une seule carte, séparées par des
          filets et deux volets repliés : on ne distinguait plus la liste de
          ses propres parties du champ de saisie, et le choix ressemblait à un
          formulaire à remplir de haut en bas. Chacune a maintenant sa carte et
          son titre.

          L'ordre suit ce qu'on vient chercher : ses parties d'ici d'abord —
          celle qu'on vient de perdre est la raison la plus fréquente d'ouvrir
          cette page —, puis celles d'ailleurs, puis le collage, qui est le
          recours de qui n'a ni compte ici ni compte là-bas. */}

      {/* Rien à choisir quand la partie vient d'être jouée : on arrive de la
          boîte de fin de partie, le texte est déjà là, et proposer d'aller en
          chercher une autre revient à demander « et sinon, laquelle ? » à
          quelqu'un qui vient de répondre. */}
      {/* `empty:hidden` et deux enfants directs, sans conteneur : les deux
          listes ne rendent rien tant qu'on n'est pas connecté, et une carte
          vide de cent points s'affichait au-dessus de tout le reste. Un
          `<div>` d'espacement autour d'elles aurait suffi à la rendre non
          vide, donc visible. L'écart vient de `space-y`. */}
      {!handedOver && (
        <Card className="mt-4 space-y-5 overflow-hidden p-5 empty:hidden empty:p-0 sm:mt-7">
          <MesAnalyses onOuvrir={(id) => void ouvrirEnregistree(id)} />
          <MesParties
            onChoisir={(pgn, campJoue) => {
              setInput(pgn)
              setCamp(campJoue)
              onSide(campJoue)
            }}
          />
        </Card>
      )}

      {!handedOver && (
        <Card className="mt-3 overflow-hidden p-5">
          <SectionTitle>Tes parties en ligne</SectionTitle>
          <p className="mt-1 text-xs text-muted">
            Chess.com ou Lichess, à partir du seul pseudo. Aucun compte n’est nécessaire ici,
            et rien n’est enregistré.
          </p>
          <div className="mt-3">
            <ImportEnLigne
              serviceInitial={serviceDemande ?? (chesscomUsername.trim() || !lichessUsername.trim() ? 'chesscom' : 'lichess')}
              onChoisir={(pgn, campImporte) => {
                // Le camp du joueur cherché : c'est lui qui lira l'analyse.
                setCamp(campImporte)
                onSide(campImporte)
                lancerDesQueLue.current = true
                setInput(pgn)
              }}
            />
          </div>
        </Card>
      )}

      <Card glow className="mt-3 overflow-hidden">
        <details
          className="group [&_summary::-webkit-details-marker]:hidden"
          open={collageOuvert}
          onToggle={(event) => setCollageOuvert(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm transition-colors hover:bg-surface-hover">
            <ChevronRight
              size={15}
              aria-hidden
              className="shrink-0 text-faint transition-transform group-open:rotate-90"
            />
            <span className="font-medium">Partie à analyser</span>
            <span className="min-w-0 flex-1 truncate text-xs text-faint">
              {parsed ? `${parsed.moves.length} demi-coups` : 'Colle un PGN, une liste de coups ou une FEN'}
            </span>
          </summary>
        <div className="px-5 pb-5">
          <label htmlFor="pgn" className="sr-only">
            Partie à analyser
          </label>
          <textarea
            id="pgn"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={
              '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6…\n\nou un PGN complet, ou une position FEN.'
            }
            className="w-full resize-y rounded-[var(--radius-sm)] border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" icon={<ClipboardPaste size={14} />} onClick={paste}>
              Coller
            </Button>
            {parsed && (
              <Chip tone="success">
                {parsed.moves.length} demi-coups reconnus
                {parsed.headers.White && parsed.headers.Black
                  ? ` · ${parsed.headers.White} – ${parsed.headers.Black}`
                  : ''}
              </Chip>
            )}
            {input.trim() && !parsed && (
              <Chip tone="danger">Format non reconnu</Chip>
            )}
          </div>
        </div>
        </details>

        {/* Qui es-tu dans cette partie ?
        
            La question ne se pose que si le PGN nomme ses deux joueurs — sinon
            il n'y a personne à désigner. Elle est déjà répondue quand la partie
            vient de la liste chess.com ou Lichess : on a saisi un pseudo, donc
            on sait de quel côté il était. Le choix reste affiché pour qu'on
            puisse le corriger, et parce qu'un réglage qu'on ne voit pas est un
            réglage qu'on ne soupçonne pas.
        
            Ce que ça change : les explications s'adressent à ce joueur d'un bout
            à l'autre, y compris sur les coups de l'adversaire — « son cavalier
            attaque » au lieu de « ton cavalier attaque » à propos d'une pièce
            qui n'est pas la tienne. Sans réponse, on parle à l'auteur de chaque
            coup, ce qui reste juste pour une partie qu'on regarde de
            l'extérieur. */}
        {parsed?.headers.White && parsed.headers.Black && (
          <div className="border-t border-line/60 px-5 py-4">
            <p className="mb-2 text-sm font-medium">Tu joues quel camp&nbsp;?</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { valeur: 'w' as const, label: parsed.headers.White },
                  { valeur: 'b' as const, label: parsed.headers.Black },
                  { valeur: null, label: 'Ni l’un ni l’autre' },
                ]
              ).map((choix) => (
                <button
                  key={choix.label}
                  type="button"
                  onClick={() => setCamp(choix.valeur)}
                  aria-pressed={camp === choix.valeur}
                  className={clsx(
                    'truncate rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors',
                    camp === choix.valeur
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {choix.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">
              Les explications s’adresseront à ce joueur, y compris sur les coups de son
              adversaire.
            </p>
          </div>
        )}

        <div className="border-t border-line/60 px-5 py-4">
          <label htmlFor="depth" className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">Profondeur d’analyse</span>
            <span className="tabular-nums text-muted">{depth} demi-coups</span>
          </label>
          <input
            id="depth"
            type="range"
            min={10}
            max={26}
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, var(--accent) ${((depth - 10) / 16) * 100}%, var(--surface-strong) ${((depth - 10) / 16) * 100}%)`,
            }}
          />
          <p className="mt-1.5 text-xs text-faint">
            Plus profond = plus fiable, mais plus long. 18 suffit pour repérer toutes les
            fautes d’un joueur de club ; 24 pour départager deux bons coups.
          </p>
        </div>

        <div className="border-t border-line/60 p-5">
          {/* La partie transmise s'annonce, puisqu'elle ne se lance plus seule.
              Sans cette ligne, on arrive sur un champ pré-rempli sans savoir
              d'où il sort ni ce qu'on attend de nous. */}
          {handedOver && !running && parsed && parsed.moves.length > 0 && (
            <p className="mb-2.5 text-[13px] leading-relaxed text-muted">
              Ta partie est prête, avec ton camp déjà retenu. Règle la profondeur si tu veux,
              puis lance l’analyse.
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={running}
            disabled={!parsed || running}
            onClick={start}
            icon={running ? undefined : <Gauge size={17} />}
          >
            {running ? 'Analyse en cours…' : 'Lancer l’analyse'}
          </Button>

          {/* Pourquoi c'est long, dit avant qu'on se le demande.
          
              L'analyse d'une partie de quarante coups occupe le moteur plusieurs
              dizaines de secondes, et la barre de progression ne dit que
              « 18 / 39 » — un chiffre qui avance sans expliquer pourquoi il
              n'avance pas plus vite. Quelqu'un qui vient de chess.com, où la
              relecture prend sept secondes, en conclut que quelque chose est
              cassé.
          
              La vraie raison est structurelle et il n'y a pas de honte à la
              dire : un serveur, pas de ferme de calcul, et une file partagée
              par tout le monde. C'est le prix de la gratuité, et l'annoncer
              transforme une lenteur inexpliquée en choix assumé. */}
          {running && (
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Le moteur analyse chaque position à la profondeur demandée, sur un serveur
              partagé — comptez une trentaine de secondes pour une partie complète. C’est le
              prix du service gratuit&nbsp;: aucune limite de nombre, aucune formule payante,
              mais une seule machine.
            </p>
          )}

          {running && progress && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>
                  {progress.phase === 'positions'
                    ? `Évaluation des positions (${progress.source === 'server' ? 'moteur serveur' : 'moteur navigateur'})`
                    : 'Rédaction des explications'}
                </span>
                <span className="tabular-nums">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>

              <button
                type="button"
                onClick={() => abandonRef.current?.abort()}
                className="mt-2.5 text-xs font-medium text-muted transition-colors hover:text-ink hover:underline"
              >
                Abandonner l’analyse
              </button>
            </div>
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-faint">
        L’analyse tourne d’abord sur le Stockfish natif du serveur. S’il est indisponible,
        elle se poursuit dans ton navigateur, un peu moins profondément.
      </p>

      <AutresDeLaSection section="analyser" />
    </div>
  )
}

/** Une étape de la démonstration : la position et le coup qui vient d'être joué. */
interface DemoFrame {
  fen: string
  from: Square
  to: Square
  san: string
}

/**
 * Déroule une suite en notation algébrique à partir d'une position.
 *
 * Un coup impossible interrompt la démonstration sans la faire échouer : on
 * montre ce qui a pu être montré. Une suite tronquée reste instructive, une
 * page blanche ne l'est pas.
 */
function buildDemoFrames(fen: string, line: string[]): DemoFrame[] {
  const board = new Chess(fen, { skipValidation: true })
  const frames: DemoFrame[] = []

  for (const san of line.slice(0, 8)) {
    try {
      const played = board.move(san)
      frames.push({ fen: board.fen(), from: played.from, to: played.to, san: played.san })
    } catch {
      break
    }
  }
  return frames
}

// ─────────────────────────────────────────────────────────────────────────────
//  Relecture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cadence du défilement automatique. Voir l'effet qui les emploie.
 *
 * 280 ms par mot correspond à une lecture posée — environ 215 mots à la minute.
 * On lit plus vite que cela sur un texte courant, mais pas sur une explication
 * d'échecs : chaque coup cité renvoie à une case qu'il faut retrouver sur le
 * plateau, et c'est ce va-et-vient qui prend le temps, pas les mots.
 */
const MS_PAR_MOT = 280

/** Un résultat exploitable : `*` veut dire « on ne sait pas », pas « nulle ». */
function estUnResultat(valeur: string | undefined): boolean {
  return valeur === '1-0' || valeur === '0-1' || valeur === '1/2-1/2'
}
const LECTURE_MIN = 3_500
const LECTURE_MAX = 14_000
/**
 * Le temps de reposer les yeux sur la position, une fois la phrase dite.
 *
 * Deux secondes, et non les 900 ms d'abord retenues. La différence n'est pas de
 * confort : la phrase se termine en nommant un coup ou une case, et c'est
 * seulement à ce moment-là qu'on va la chercher sur l'échiquier. Enchaîner
 * pendant ce trajet de l'oreille vers l'œil revient à ne rien montrer.
 */
const PAUSE_APRES_VOIX = 2_000
/** Au-delà, on considère que la synthèse ne répondra pas et on avance. */
const SECOURS_LECTURE = 15_000

/**
 * Exportée pour la page de lecture d'une analyse partagée.
 *
 * Elle vit ici et non dans `components/` : la sortir demanderait de déplacer
 * sept cents lignes et tous les fragments avec lesquels elle partage ce
 * fichier, pour un gain de rangement seul. On assume l'import entre pages, et
 * on le dit — c'est le seul du projet.
 */
export function ReviewScreen({
  outcome,
  side,
  onReset,
  lectureSeule = false,
}: {
  outcome: AnalysisOutcome
  /**
   * Camp du joueur, quand la partie vient de lui.
   *
   * Relire sa partie vue d'en face oblige à retourner mentalement chaque coup.
   * Un PGN collé, lui, n'a pas de « son » camp : on garde alors la vue des
   * Blancs, qui est la convention.
   */
  side: Color | null
  onReset: () => void
  /**
   * Analyse ouverte par un lien de partage.
   *
   * On masque alors tout ce qui suppose que l'analyse est à soi : la
   * conserver, la partager, l'oublier. Le reste — l'échiquier, les
   * explications, la navigation — est exactement le même, et c'est bien le
   * but : partager une analyse, c'est partager ce qu'on a vu.
   */
  lectureSeule?: boolean
}) {
  const { report, coach, source } = outcome
  const locale = usePreferences((state) => state.locale)
  const notation = usePreferences((state) => state.notation)
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)

  /**
   * Les noms des joueurs, quand le PGN les porte.
   *
   * `null` pour une liste de coups collée à la main : on retombe alors sur
   * « Blancs » et « Noirs », qui restent justes. Le repli est important — une
   * partie sans en-tête est un cas normal, pas une anomalie.
   */
  const noms = useMemo(
    () => ({
      w: outcome.headers?.White?.trim() || null,
      b: outcome.headers?.Black?.trim() || null,
    }),
    [outcome.headers],
  )

  /**
   * Qui a gagné.
   *
   * L'en-tête `Result` du PGN fait foi quand il existe : il couvre l'abandon et
   * la pendule, que la position finale ne raconte pas. Sans en-tête, on se
   * rabat sur l'échiquier — un mat se lit tout seul. `null` quand la partie
   * s'arrête en l'air, ce qui est le cas courant d'une liste de coups collée.
   */
  const issue = useMemo<'w' | 'b' | 'nulle' | null>(() => {
    switch (outcome.headers?.Result?.trim()) {
      case '1-0':
        return 'w'
      case '0-1':
        return 'b'
      case '1/2-1/2':
        return 'nulle'
    }
    const dernier = report.moves[report.moves.length - 1]
    if (!dernier) return null
    const finale = new Chess(dernier.fenAfter, { skipValidation: true })
    if (finale.isCheckmate()) return dernier.color
    if (finale.isStalemate() || finale.isDraw()) return 'nulle'
    return null
  }, [outcome.headers, report.moves])

  const format = useSan()
  const [cursor, setCursor] = useState(0)
  /**
   * Deux façons de relire, et le choix se retient.
   *
   * `detail` est le tableau de bord : courbe, alternatives, moments clés,
   * précision. Il suppose qu'on sait déjà lire une évaluation.
   *
   * `guide` ne montre qu'un échiquier, une phrase et un bouton. C'est l'écran
   * dont a besoin quelqu'un qui débute — et le seul des deux qui tienne sur un
   * téléphone, où notre grille à trois colonnes ne rentre pas.
   *
   * Le mode vit dans les préférences plutôt que dans l'état de la page : on ne
   * le rechoisit pas à chaque partie relue.
   */
  const relecture = usePreferences((state) => state.relectureGuidee)

  /**
   * « À toi de trouver le coup. »
   *
   * Sur une faute du lecteur, on cache la réponse et on lui rend l'échiquier
   * dans la position d'*avant* son coup. Lire une explication est passif ;
   * retrouver le coup soi-même ne l'est pas, et c'est toute la différence entre
   * une relecture qu'on suit et une relecture dont on se souvient.
   *
   * L'état est indexé par demi-coup : on ne repose pas la question à quelqu'un
   * qui vient d'y répondre, y compris s'il revient en arrière puis repart.
   */
  const [enigmes, setEnigmes] = useState<Record<number, 'ouverte' | 'trouvee' | 'revelee'>>({})
  const [essais, setEssais] = useState(0)
  const [orientation, setOrientation] = useState<Color>(side ?? 'w')
  const [autoplay, setAutoplay] = useState(false)

  const move = report.moves[cursor] ?? null
  const explanation = report.explanations[cursor] ?? null

  /**
   * Démonstration de la suite recommandée.
   *
   * Lire « Cf3 Cc6 d4 exd4 » demande de déplacer les pièces dans sa tête — ce
   * qu'un débutant ne sait précisément pas encore faire. On les déplace donc
   * pour lui, coup par coup, sur l'échiquier qu'il a sous les yeux.
   *
   * L'état contient toute la ligne pré-calculée : rejouer depuis le début à
   * chaque image coûterait cher et risquerait de diverger.
   */
  const [demo, setDemo] = useState<{ frames: DemoFrame[]; at: number } | null>(null)

  /**
   * Explication du coup recommandé, calculée à la demande.
   *
   * À la demande, et non à l'affichage : elle rejoue le coup sur la position et
   * détecte ses motifs, ce qui n'a aucune raison d'être fait pour chacun des
   * quarante coups qu'on traverse au défilement. Elle est mémoïsée sur le coup,
   * si bien qu'aller et revenir ne la recalcule pas.
   */
  const [pourquoiOuvert, setPourquoiOuvert] = useState(false)
  const pourquoi = useMemo(() => {
    if (!pourquoiOuvert || !move?.bestMove) return null
    return explainRecommendedMove({
      locale,
      fenBefore: move.fenBefore,
      bestSan: move.bestMove.san,
      mover: move.color,
      scoreBefore: move.scoreBefore,
      scoreAfter: move.bestMove.score,
      bestLine: move.bestLine,
    })
  }, [pourquoiOuvert, move, locale])

  // Changer de coup referme l'explication : elle parlerait du coup précédent.
  useEffect(() => setPourquoiOuvert(false), [cursor])

  const showBestLine = useCallback(() => {
    if (!move?.bestLine?.length) return
    const frames = buildDemoFrames(move.fenBefore, move.bestLine)
    if (frames.length === 0) return
    stopSpeaking()
    setDemo({ frames, at: 0 })
  }, [move])

  // Avance d'une image, puis s'efface pour rendre la position réelle.
  useEffect(() => {
    if (!demo) return
    const last = demo.at >= demo.frames.length - 1
    const timer = setTimeout(
      () => setDemo((current) => (current ? (last ? null : { ...current, at: current.at + 1 }) : null)),
      last ? 1400 : 850,
    )
    return () => clearTimeout(timer)
  }, [demo])

  // Changer de coup annule la démonstration : elle ne parlerait plus de rien.
  useEffect(() => setDemo(null), [cursor])

  // Lecture automatique du commentaire quand on change de coup.
  const spokenRef = useRef<number>(-1)
  const [lectureFinie, setLectureFinie] = useState(true)
  useEffect(() => {
    if (!explanation || spokenRef.current === cursor) return
    spokenRef.current = cursor
    if (!voiceEnabled) {
      setLectureFinie(true)
      return
    }
    setLectureFinie(false)
    // Le rappel est gardé par le rang du coup, et ce n'est pas de la prudence
    // décorative. `speak` annule la phrase en cours pour placer la sienne, et
    // `speech.ts` notifie quand même l'appelant de cette interruption — c'est
    // voulu, il attend sa notification. Mais l'annulation est asynchrone : elle
    // arrive **après** que le coup suivant a demandé la parole. Sans ce test,
    // le `onEnd` de la phrase précédente déclarerait terminée celle qui vient
    // de commencer, et le défilement repartirait aussitôt — exactement le
    // symptôme qu'on corrige.
    const lu = cursor
    speak(explanation.speech, {
      onEnd: () => setLectureFinie((finie) => (spokenRef.current === lu ? true : finie)),
    })
  }, [cursor, explanation, voiceEnabled])

  /**
   * En partant, on se tait — et on oublie ce qu'on avait dit.
   *
   * Sans la remise à zéro, le premier coup n'était **jamais** prononcé en
   * développement. Le mode strict de React monte le composant, exécute les
   * effets, les défait, puis les rejoue : la première passe demandait la
   * parole et notait « coup 0 déjà lu », le démontage simulé coupait le son,
   * et la seconde passe se voyait refuser l'accès par ce même garde. Les coups
   * suivants passaient, eux, puisque le rang changeait — d'où un défaut qui ne
   * touchait que le tout premier commentaire.
   */
  useEffect(
    () => () => {
      stopSpeaking()
      spokenRef.current = -1
    },
    [],
  )

  /**
   * Défilement automatique : il attend l'explication.
   *
   * Il avançait toutes les 2 600 ms, quel que soit le coup. C'est à peu près le
   * temps de lire « Cf3 — imprécision », et à peu près le tiers de ce qu'il
   * faut pour lire l'explication qui suit. On passait donc au coup d'après en
   * plein milieu du raisonnement — et si la voix était active, en plein milieu
   * de la phrase, `speak` coupant la précédente pour annoncer la suivante.
   * L'analyse défilait sans qu'on puisse en lire une seule ligne.
   *
   * Deux régimes, selon qu'on écoute ou qu'on lit :
   *
   *  - **Voix active** : on part deux secondes après la fin de la phrase,
   *    `speak` nous la signale par `onEnd`. Un minuteur de secours couvre le
   *    cas où cet événement ne vient jamais — synthèse indisponible, onglet en
   *    arrière-plan, voix système capricieuse — sans quoi la lecture resterait
   *    bloquée sur un coup.
   *  - **Voix éteinte** : la durée se calcule sur le texte, à 280 ms par mot,
   *    entre 3,5 et 14 secondes. Une explication de vingt mots a besoin de cinq
   *    secondes ; une de trois n'en mérite pas dix.
   */
  useEffect(() => {
    if (!autoplay) return
    if (cursor >= report.moves.length - 1) {
      setAutoplay(false)
      return
    }

    if (voiceEnabled && !lectureFinie) {
      const secours = setTimeout(() => setLectureFinie(true), SECOURS_LECTURE)
      return () => clearTimeout(secours)
    }

    const mots = explanation?.speech.trim().split(/\s+/).length ?? 0
    const attente = voiceEnabled
      ? PAUSE_APRES_VOIX
      : Math.min(LECTURE_MAX, Math.max(LECTURE_MIN, mots * MS_PAR_MOT))
    const timer = setTimeout(() => setCursor((c) => c + 1), attente)
    return () => clearTimeout(timer)
  }, [autoplay, cursor, lectureFinie, voiceEnabled, explanation, report.moves.length])

  const qualities = useMemo(() => {
    const map: Record<number, MoveQuality> = {}
    for (const analysed of report.moves) map[analysed.ply] = analysed.quality
    return map
  }, [report.moves])

  const playedMoves = useMemo<PlayedMove[]>(
    () =>
      report.moves.map((analysed) => ({
        san: analysed.san,
        uci: analysed.uci,
        from: analysed.uci.slice(0, 2) as never,
        to: analysed.uci.slice(2, 4) as never,
        piece: 'p' as never,
        color: analysed.color,
        before: analysed.fenBefore,
        after: analysed.fenAfter,
        at: 0,
        isCheck: analysed.san.includes('+'),
        isCheckmate: analysed.san.includes('#'),
        isCapture: analysed.san.includes('x'),
        isCastle: analysed.san.startsWith('O-O'),
        isPromotion: analysed.san.includes('='),
      })),
    [report.moves],
  )

  // Flèches : le coup joué en vert, le meilleur coup en bleu s'il diffère.
  /**
   * Le coup courant mérite-t-il une question ?
   *
   * Trois conditions, et les trois comptent. Il faut une **faute** — on
   * n'interroge pas sur un bon coup, la réponse serait celui qu'on a joué. Il
   * faut un **meilleur coup connu**, sans quoi il n'y a rien à trouver. Et il
   * faut que ce soit le coup du **lecteur** : demander à quelqu'un de rejouer
   * les fautes de son adversaire n'apprend rien à personne.
   *
   * Hors du pas à pas, jamais : la vue détaillée affiche déjà la réponse à
   * trois endroits, la cacher au quatrième serait absurde.
   */
  const enigme = useMemo(() => {
    if (!relecture || !move || demo) return null
    if (side !== null && move.color !== side) return null
    if (!meriteUnMeilleurCoup(move.quality, move.winLoss)) return null
    if (!move.bestMove) return null
    return { ply: move.ply, attendu: move.bestMove }
  }, [relecture, move, demo, side])

  const etatEnigme = enigme ? (enigmes[enigme.ply] ?? 'ouverte') : null

  /** Coups légaux de la position d'avant la faute, pour l'échiquier jouable. */
  const coupsLegaux = useLegalMoves(move?.fenBefore, Boolean(enigme) && etatEnigme === 'ouverte')

  /**
   * Réponse du lecteur.
   *
   * On compare en UCI et non en SAN : deux notations peuvent désigner le même
   * coup, l'UCI est sans ambiguïté. La promotion est ignorée dans la
   * comparaison — trouver la bonne case en sous-promouvant reste la bonne idée,
   * et le cas est assez rare pour ne pas justifier trois lignes de plus.
   */
  const repondre = useCallback(
    (from: Square, to: Square) => {
      if (!enigme) return
      const joue = `${from}${to}`
      if (enigme.attendu.uci.slice(0, 4) === joue) {
        setEnigmes((etat) => ({ ...etat, [enigme.ply]: 'trouvee' }))
        setEssais(0)
        playSound('victory')
      } else {
        setEssais((n) => n + 1)
      }
    },
    [enigme],
  )

  const reveler = useCallback(() => {
    if (!enigme) return
    setEnigmes((etat) => ({ ...etat, [enigme.ply]: 'revelee' }))
    setEssais(0)
  }, [enigme])

  // Changer de coup remet le compteur d'essais à zéro : il compte les tentatives
  // sur *cette* question, pas depuis le début de la partie.
  useEffect(() => setEssais(0), [cursor])

  const arrows = useMemo<Arrow[]>(() => {
    if (demo) {
      const frame = demo.frames[demo.at]
      return frame ? [{ from: frame.from, to: frame.to, color: 'blue', weight: 'bold' }] : []
    }
    if (!move) return []
    // Tant que la question est ouverte, aucune flèche : la verte montrerait le
    // coup joué et la bleue donnerait la réponse.
    if (etatEnigme === 'ouverte') return []
    const list: Arrow[] = [
      {
        from: move.uci.slice(0, 2) as never,
        to: move.uci.slice(2, 4) as never,
        color: move.quality === 'blunder' || move.quality === 'mistake' ? 'red' : 'green',
        weight: 'bold',
      },
    ]
    /*
     * La flèche du coup conseillé suit **la même règle que l'explication**.
     *
     * `SEUIL_MEILLEUR_COUP` vient de `explain.ts`, où il décide déjà si le texte
     * nomme un meilleur coup. Le partager est tout l'objet : la flèche n'avait
     * aucun seuil, si bien qu'on pouvait lire « coup conseillé » dans la légende
     * sans qu'aucune phrase ne dise lequel ni pourquoi. Deux affichages qui ne
     * s'accordent pas sur l'existence d'un meilleur coup valent moins que ni
     * l'un ni l'autre.
     *
     * Et une flèche sur un échiquier ne se lit pas comme une note de bas de
     * page : elle se lit comme une correction. Sous le seuil, il n'y a rien à
     * corriger — la suite recommandée reste dans le panneau, avec son bouton
     * « Pourquoi ? », pour qui veut aller la lire.
     */
    if (move.bestMove && meriteUnMeilleurCoup(move.quality, move.winLoss)) {
      list.push({
        from: move.bestMove.uci.slice(0, 2) as never,
        to: move.bestMove.uci.slice(2, 4) as never,
        color: 'blue',
        weight: 'normal',
      })
    }
    return list
  }, [move, demo])

  const check = useMemo(() => {
    if (!move) return { square: null, mate: false }
    const board = new Chess(move.fenAfter, { skipValidation: true })
    if (!board.inCheck()) return { square: null, mate: false }
    return {
      square: board.findPiece({ type: 'k', color: board.turn() })[0] ?? null,
      mate: board.isCheckmate(),
    }
  }, [move])
  const checkSquare = check.square

  /**
   * L'échiquier, une seule fois.
   *
   * Deux mises en page l'affichent — la vue détaillée et la relecture guidée —
   * et elles doivent montrer exactement la même chose : mêmes flèches, même
   * verdict, même démonstration en cours. Le dupliquer garantirait qu'un jour
   * l'une des deux oublie une correction apportée à l'autre.
   */
  const echiquier = (
            <ChessBoard
              fitParentHeight
              fen={
                // Pendant la question, on remonte d'un coup : c'est la position
                // où le choix se posait, pas celle qui a suivi.
                etatEnigme === 'ouverte' && move
                  ? move.fenBefore
                  : (demo?.frames[demo.at]?.fen ??
                    move?.fenAfter ??
                    report.moves[0]?.fenBefore ??
                    '')
              }
              orientation={orientation}
              playable={etatEnigme === 'ouverte' && move ? move.color : null}
              legalMoves={coupsLegaux}
              onMove={etatEnigme === 'ouverte' ? repondre : undefined}
              lastMove={
                demo || etatEnigme === 'ouverte'
                  ? null
                  : move
                    ? {
                        from: move.uci.slice(0, 2) as never,
                        to: move.uci.slice(2, 4) as never,
                      }
                    : null
              }
              checkSquare={demo || etatEnigme === 'ouverte' ? null : checkSquare}
              checkmate={!demo && etatEnigme !== 'ouverte' && check.mate}
              highlights={
                demo || etatEnigme === 'ouverte'
                  ? []
                  : (report.explanations[cursor]?.highlights ?? [])
              }
              /* Le verdict sur la case d'arrivée, sauf pendant la
                 démonstration d'une suite : les coups qu'on y déroule n'ont
                 pas été joués, les juger n'aurait aucun sens. */
              verdict={
                // Le verdict nomme la faute : l'afficher pendant qu'on cherche
                // reviendrait à désigner la case où elle a été commise.
                demo || !move || etatEnigme === 'ouverte'
                  ? null
                  : { square: move.uci.slice(2, 4) as Square, quality: move.quality }
              }
              arrows={arrows}
              // Cliquer la flèche bleue déroule la suite recommandée : c'est
              // la question qu'elle pose et à laquelle elle ne répondait pas.
              onArrowClick={(arrow) => {
                if (arrow.color === 'blue') showBestLine()
                else if (explanation) speak(explanation.speech)
              }}
              instant={!demo}
            />
  )

  const exportPgn = useCallback(() => {
    const pgn = toPgn(report.moves, {
      annotate: true,
      includeEvaluations: true,
      locale,
      headers: {
        Event: 'Analyse Le Coup Parfait',
        Date: formatPgnDate(new Date()),
        ECO: report.opening?.eco,
        Opening: report.opening?.name,
      },
      comments: Object.fromEntries(
        report.moves.map((analysed, index) => [
          analysed.ply,
          report.explanations[index]?.headline ?? '',
        ]),
      ),
    })

    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'partie-analysee.pgn'
    link.click()
    URL.revokeObjectURL(url)
  }, [report, locale])

  const style = move ? QUALITY_STYLES[move.quality] : null

  return (
    <div
      // En paysage sur téléphone, la vue détaillée se cale sur la fenêtre :
      // voir `.etude` et `.grille-analyse` dans `globals.css`. Le pas à pas
      // garde sa page qui défile.
      className={clsx(
        'mx-auto w-full max-w-[1600px] px-2 py-3 sm:px-4 lg:py-6',
        !relecture && 'etude',
      )}
    >
      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/*
          Le moteur employé et l'ouverture décrivent la partie, ils ne servent
          pas à la lire. En pas à pas sur téléphone, ils repoussaient la bulle
          du coach de trois lignes vers le bas — on les garde, mais à partir de
          la tablette.

          Le `hidden` est porté par ce conteneur et non par les pastilles
          elles-mêmes : `Chip` impose `inline-flex`, qui l'emportait sur
          `hidden` — les pastilles restaient affichées, `display` calculé à
          `flex`. Un conteneur neutre n'a pas ce conflit.
        */}
        <div
          className={clsx(
            // En paysage, la ligne qu'elles prennent vaut un tiers du plateau.
            'flex flex-wrap items-center gap-2 paysage:hidden',
            relecture && 'hidden sm:flex',
          )}
        >
          <Chip tone="accent">
            <Sparkles size={11} aria-hidden />
            {source === 'server' ? 'Stockfish serveur' : 'Stockfish navigateur'}
          </Chip>
          {report.opening && (
            <Chip>
              {report.opening.eco} · {report.opening.name}
            </Chip>
          )}
        </div>
        {/*
          Le score, à côté de l'ouverture et de la profondeur — les trois
          choses qui décrivent la partie qu'on relit. Il n'apparaît qu'ici :
          l'annoncer aussi dans le résumé de précision et sur chacune des deux
          cartes de bilan, c'était dire quatre fois le même fait.
        */}
        {issue && (
          <Chip
            tone={issue === 'nulle' ? 'neutral' : 'success'}
            style={{ textTransform: 'none' }}
            title="Résultat de la partie"
          >
            <Trophy size={11} aria-hidden />
            <span className={issue === 'w' ? 'font-bold' : 'opacity-70'}>
              {noms.w ?? 'Blancs'}
            </span>
            <span className="tabular-nums opacity-90">
              {issue === 'w' ? '1–0' : issue === 'b' ? '0–1' : '½–½'}
            </span>
            <span className={issue === 'b' ? 'font-bold' : 'opacity-70'}>
              {noms.b ?? 'Noirs'}
            </span>
          </Chip>
        )}
        {/* `flex-wrap`, et il manquait.

            Quatre boutons dans une rangée qui ne se replie pas : « Pas à
            pas », « Voix activée », « PGN », « Autre partie », soit environ
            370 points sur un téléphone qui en fait 360. Le dernier sortait du
            cadre — celui qui permet de changer de partie, donc de sortir de
            l'écran. Repliés, ils tiennent sur deux lignes et restent tous
            atteignables. */}
        <div className="ml-auto flex flex-wrap justify-end gap-1.5">
          {/* Le basculement en premier : c'est le réglage qui change tout
              l'écran, les autres n'en changent qu'un détail. */}
          <Button
            size="sm"
            variant={relecture ? 'primary' : 'ghost'}
            icon={<Footprints size={14} />}
            onClick={() => setPreference('relectureGuidee', !relecture)}
            title={
              relecture
                ? 'Revenir au tableau de bord : courbe, alternatives, moments clés'
                : 'Relire pas à pas : un échiquier, une phrase, un bouton'
            }
          >
            Pas à pas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            onClick={() => {
              if (voiceEnabled) stopSpeaking()
              setPreference('voiceEnabled', !voiceEnabled)
            }}
          >
            {voiceEnabled ? 'Voix activée' : 'Voix coupée'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download size={14} />}
            onClick={exportPgn}
            className={relecture ? 'max-sm:hidden' : undefined}
          >
            PGN
          </Button>
          {/* Une analyse ouverte par un lien n'a pas d'« autre partie » : il
              n'y a pas d'écran d'import derrière, on est arrivé directement
              ici. Le lien vers l'analyse prend sa place. */}
          {lectureSeule ? (
            <ButtonLink href="/analyse" size="sm" variant="secondary">
              Analyser une partie
            </ButtonLink>
          ) : (
            <Button size="sm" variant="secondary" onClick={onReset}>
              Autre partie
            </Button>
          )}
        </div>
      </div>

      {relecture ? (
        <RelectureGuidee
          echiquier={echiquier}
          report={report}
          cursor={cursor}
          onCursor={setCursor}
          explanation={explanation}
          move={move}
          onRetourner={() => setOrientation((c) => (c === 'w' ? 'b' : 'w'))}
          onMontrer={showBestLine}
          demo={demo !== null}
          format={format}
          enigme={etatEnigme}
          essais={essais}
          onReveler={reveler}
        />
      ) : (
      <div className="grille-analyse">
        {/* ── Échiquier ────────────────────────────────────────────── */}
          <div className="[grid-area:plateau] flex min-h-0 min-w-0 gap-2">
            <EvalBar
              score={move?.scoreAfter ?? null}
              orientation={orientation}
              className="hidden sm:block"
            />
            <div className="min-w-0 flex-1">
              {echiquier}
            </div>
          </div>


          {/* La courbe passe à la ligne sur téléphone.

              Les cinq flèches de navigation, le bouton « Retourner » et la
              courbe d'évaluation partageaient une rangée qui ne se replie pas :
              la courbe, dernière servie, débordait de l'écran par la droite et
              faisait défiler la page latéralement. Elle prend maintenant toute
              la largeur sous les commandes, ce qui la rend au passage lisible —
              c'est un graphique, il vit de sa largeur. */}
          <div className="[grid-area:barre] mt-2 flex flex-wrap items-center gap-2">
            {/*
              Ces boutons existaient déjà, mais au bas de la liste des coups —
              tout en bas à droite, hors de l'écran. Le bouton lecture, qui
              déroule la partie coup par coup, y était introuvable.
            */}
            <GameNav
              cursor={cursor}
              count={report.moves.length}
              onSeek={(ply) => setCursor(Math.max(0, Math.min(report.moves.length - 1, ply)))}
              autoplay={autoplay}
              onToggleAutoplay={() => setAutoplay((value) => !value)}
              // L'analyse commente un coup : elle n'a rien à dire avant le
              // premier, et s'arrête donc au demi-coup 0.
              min={0}
              // La position **affichée** : on recule jusqu'à l'endroit qui
              // pose question, puis on copie ce qu'on a sous les yeux.
              fen={move?.fenAfter ?? report.moves[0]?.fenBefore ?? null}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            >
              Retourner
            </Button>
            <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
              <EvalGraph
                values={report.evalCurve}
                cursor={cursor}
                turningPoints={report.turningPoints}
                onSeek={(ply) => setCursor(Math.max(0, Math.min(report.moves.length - 1, ply)))}
              />
            </div>
          </div>

          {/* ── Bilan ────────────────────────────────────────────── */}
          {/* En paysage, le résumé de la colonne de droite suffit : les deux
              cartes ne tiendraient pas sous le plateau. */}
          <div className="[grid-area:bilan] mt-4 grid gap-3 sm:grid-cols-2 paysage:hidden">
            {(['w', 'b'] as const).map((colour) => (
              <PlayerReport
                key={colour}
                colour={colour}
                nom={noms[colour]}
                accuracy={report.accuracy[colour]}
                acpl={report.acpl[colour]}
                counts={report.counts[colour]}
                estimatedElo={report.estimatedElo[colour]}
                coach={coach[colour]}
                issue={issue}
              />
            ))}
          </div>

        {/* ── Panneau latéral ──────────────────────────────────────── */}
        <div className="[grid-area:aside] mt-4 flex min-h-0 flex-col gap-3 lg:mt-0 paysage:mt-0 paysage:overflow-y-auto paysage:overscroll-contain">
          {/*
            Le bilan détaillé est sous l'échiquier, donc hors de l'écran : on
            ne voyait qu'une liste de coups, et l'analyse passait pour absente.
            Ce résumé la met là où le regard se pose.
          */}
          <AccuracySummary report={report} noms={noms} issue={issue} />

          {/*
            Une partie ne se perd pas partout : elle se perd à deux ou trois
            endroits. Les nommer vaut mieux que de laisser dérouler vingt coups
            pour les retrouver.
          */}
          <KeyMoments report={report} format={format} onSeek={setCursor} />

          {/* Verdict du coup courant */}
          {move && style && explanation && (
            <Card glow className="overflow-hidden">
              <div
                className="h-1"
                style={{ background: `var(--q-${style.token})` }}
                aria-hidden
              />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
                    style={{
                      background: `color-mix(in oklab, var(--q-${style.token}) 20%, transparent)`,
                      color: `var(--q-${style.token})`,
                    }}
                    aria-hidden
                    title={`${style.label.fr} — ${style.description.fr}`}
                  >
                    {style.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{explanation.headline}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-faint">
                      Coup {move.moveNumber} · {move.color === 'w' ? 'Blancs' : 'Noirs'} ·{' '}
                      {formatScore(move.scoreBefore)} → {formatScore(move.scoreAfter)}
                      {/* Même seuil que la flèche et que le texte : sous
                          `SEUIL_MEILLEUR_COUP`, on ne présente pas les
                          préférences du moteur comme une perte. */}
                      {meriteUnMeilleurCoup(move.quality, move.winLoss) &&
                        ` · −${move.winLoss.toFixed(0)} pts de victoire`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {explanation.body.map((paragraph, index) => (
                    <TexteAvecTermes
                      key={index}
                      texte={paragraph}
                      className="text-[13px] leading-relaxed text-muted"
                    />
                  ))}
                </div>

                {explanation.motifs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {explanation.motifs.map((motif) => (
                      <Chip key={motif.id} tone="accent" title={motif.definition}>
                        {motif.name}
                      </Chip>
                    ))}
                  </div>
                )}

                {move.bestLine && move.bestLine.length > 0 && move.bestMove && (
                  <div className="mt-3 rounded-[var(--radius-sm)] bg-surface p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                        Suite recommandée
                      </p>
                      <span className="flex shrink-0 items-center gap-3">
                        {/* Deux gestes, et ils ne demandent pas la même chose.
                            « Montrer » déplace les pièces — pour qui n'arrive
                            pas à lire une ligne en notation. « Pourquoi »
                            explique — pour qui la lit très bien mais ne voit
                            pas ce qu'elle apporte. */}
                        <button
                          type="button"
                          onClick={() => setPourquoiOuvert((ouvert) => !ouvert)}
                          aria-expanded={pourquoiOuvert}
                          className="text-[11px] font-semibold text-accent transition-colors hover:underline"
                        >
                          {pourquoiOuvert ? 'Masquer' : 'Pourquoi ?'}
                        </button>
                        {/* Lire « Cf3 Cc6 d4 exd4 » suppose de déplacer les
                            pièces dans sa tête. On les déplace pour de vrai. */}
                        <button
                          type="button"
                          onClick={showBestLine}
                          className="text-[11px] font-semibold text-accent transition-colors hover:underline"
                        >
                          {demo ? `${demo.at + 1} / ${demo.frames.length}` : '▶ Montrer'}
                        </button>
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[13px]">
                      {move.bestLine.map((san, index) => (
                        <span
                          key={index}
                          className={clsx(
                            'mr-2 rounded px-0.5',
                            demo && index === demo.at && 'bg-accent/25 text-ink',
                          )}
                        >
                          {format(san)}
                        </span>
                      ))}
                    </p>

                    {/* L'explication du coup du moteur, écrite par la même
                        machinerie que celle du coup joué — verdict, cause,
                        conséquence. Le liseré à gauche dit qu'elle porte sur le
                        coup recommandé et non sur celui de la partie : sans lui,
                        deux explications se suivraient sans qu'on sache laquelle
                        parle de quoi. */}
                    {pourquoiOuvert &&
                      (pourquoi ? (
                        <div className="mt-2.5 border-l-2 border-accent/50 pl-3">
                          <p className="text-[13px] font-semibold leading-snug">
                            {pourquoi.headline}
                          </p>
                          <div className="mt-1 space-y-1">
                            {pourquoi.body.map((paragraphe, index) => (
                              <p key={index} className="text-[13px] leading-relaxed text-muted">
                                {paragraphe}
                              </p>
                            ))}
                          </div>
                          {pourquoi.motifs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {pourquoi.motifs.map((motif) => (
                                <Chip key={motif.id} tone="accent" title={motif.definition}>
                                  {motif.name}
                                </Chip>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        // `explainRecommendedMove` rend `null` quand le coup du
                        // moteur ne se rejoue pas sur la position. On le dit
                        // plutôt que de laisser un bouton qui n'ouvre rien.
                        <p className="mt-2.5 text-[13px] leading-relaxed text-faint">
                          Ce coup ne se rejoue pas sur cette position : impossible de
                          l’expliquer sans risquer d’inventer.
                        </p>
                      ))}
                  </div>
                )}

                {/* Ce qu'on avait sous la main, classé par le moteur.
                
                    La relecture ne montrait que la suite recommandée : un seul
                    coup, présenté comme *le* bon. C'est insuffisant pour
                    comprendre, et parfois trompeur — savoir qu'un coup était le
                    meilleur n'apprend rien tant qu'on ignore ce qu'il y avait
                    d'autre. Trois lignes à 0,05 près décrivent une position où
                    le choix était libre ; un premier coup détaché de deux pions
                    décrit une position où il n'y en avait qu'un. Le verdict est
                    le même, la leçon est opposée.
                
                    La partie commentée le montrait déjà pendant la partie. Il
                    n'y avait aucune raison que la relecture, qui est le moment
                    où l'on prend le temps de comprendre, en montre moins. */}
                {move.alternatives && move.alternatives.length > 1 && (
                  <div className="mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-line/60">
                    <p className="border-b border-line/60 bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                      Ce que tu pouvais jouer
                    </p>
                    <ul>
                      {move.alternatives.map((option, rang) => {
                        const joue = option.uci === move.uci
                        // Mêmes teintes que les flèches de l'échiquier, et
                        // prises dans la même table : `ANNOTATION_COLORS`. Les
                        // recopier en dur ici les ferait diverger le jour où
                        // l'une des deux bougerait — c'est exactement ainsi que
                        // le rang 1 s'était retrouvé vert face à une flèche
                        // bleue.
                        const teinte = joue
                          ? ANNOTATION_COLORS.green
                          : rang === 0
                            ? ANNOTATION_COLORS.blue
                            : null
                        return (
                          <li
                            key={option.uci}
                            className="flex items-center gap-2.5 border-l-2 px-3 py-1.5"
                            style={{
                              borderLeftColor: teinte ?? 'transparent',
                              background: teinte
                                ? `color-mix(in oklab, ${teinte} 9%, transparent)`
                                : undefined,
                            }}
                          >
                            <span
                              className={clsx(
                                'grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold',
                                !teinte && 'bg-surface-strong text-faint',
                              )}
                              style={
                                teinte
                                  ? {
                                      background: `color-mix(in oklab, ${teinte} 25%, transparent)`,
                                      color: teinte,
                                    }
                                  : undefined
                              }
                              aria-hidden
                              title={`Coup classé ${rang + 1} sur ${move.alternatives!.length} par le moteur`}
                            >
                              {rang + 1}
                            </span>
                            <span
                              className="w-16 shrink-0 font-mono text-[13px] font-semibold"
                              title="Le coup, en notation d'échecs"
                            >
                              {format(option.san)}
                            </span>
                            <span
                              className="w-12 shrink-0 text-xs tabular-nums text-muted"
                              title="Évaluation de la position après ce coup, en pions. Positif : les Blancs sont mieux."
                            >
                              {formatScore(option.score)}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-[12px] text-faint"
                              title={`Suite prévue par le moteur : ${option.line.slice(1, 6).map((san) => format(san)).join(' ')}`}
                            >
                              {option.line.slice(1, 4).map((san) => format(san)).join(' ')}
                            </span>
                            {joue && (
                              <Chip
                                className="shrink-0 border-transparent"
                                title="Le coup que tu as joué dans la partie"
                              >
                                joué
                              </Chip>
                            )}
                            {!joue && rang === 0 && (
                              <Chip
                                className="shrink-0 border-transparent"
                                title="Le premier choix du moteur dans cette position — celui qu'il fallait jouer"
                              >
                                meilleur
                              </Chip>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* L'explication ci-dessus est complète et vérifiée. Ce qui
                    suit permet d'aller au-delà quand elle ne répond pas à la
                    question qu'on se pose — et n'apparaît que si l'assistant
                    a été configuré. */}
                <QuestionLibre
                  contexte={contexteDuCoupAnalyse(move, explanation, {
                    locale,
                    notation,
                    ouverture: report.opening?.name ?? null,
                  })}
                  questionParDefaut={questionApprofondir(locale)}
                />
              </div>
            </Card>
          )}

          <Card className="flex min-h-[240px] flex-1 flex-col overflow-hidden">
            <MoveList
              moves={playedMoves}
              cursor={cursor}
              onSeek={(ply) => setCursor(Math.max(0, Math.min(report.moves.length - 1, ply)))}
              qualities={qualities}
              autoplay={autoplay}
              onToggleAutoplay={() => setAutoplay((value) => !value)}
              className="min-h-0 flex-1"
            />
          </Card>
        </div>
      </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bilan par joueur
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Résumé de l'analyse, en tête de colonne.
 *
 * La précision et le compte des fautes sont ce qu'on vient chercher ; ils
 * n'avaient leur place que dans le bilan détaillé, sous l'échiquier — donc
 * sous la ligne de flottaison. Ici, deux lignes suffisent à répondre à « qui a
 * bien joué, et combien de fautes ». Le détail reste plus bas.
 */
function AccuracySummary({
  report,
  noms,
  issue,
}: {
  report: FullGameReport
  noms: { w: string | null; b: string | null }
  issue: 'w' | 'b' | 'nulle' | null
}) {
  return (
    <Card className="p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
        Précision de la partie
      </p>
      <div className="space-y-1.5">
        {(['w', 'b'] as const).map((colour) => (
          <div key={colour} className="flex items-center gap-2">
            <span
              className={clsx(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                colour === 'w' ? 'bg-[var(--eval-white)]' : 'bg-[var(--eval-black)] ring-1 ring-line',
              )}
              aria-hidden
            />
            {/* Le nom passe avant la couleur : dans une partie importée, on
                cherche « comment j'ai joué », pas « comment les Blancs ont
                joué ». La largeur fixe saute — un pseudo ne tient pas en douze
                pixels — et le débordement est tronqué plutôt que de pousser les
                chiffres hors du cadre. */}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {noms[colour] ?? (colour === 'w' ? 'Blancs' : 'Noirs')}
            </span>
            <span className="w-16 shrink-0 font-display text-lg font-bold tabular-nums leading-none">
              {report.accuracy[colour].toFixed(0)}
              <span className="text-[11px] font-normal text-muted"> %</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {SUMMARY_QUALITIES.filter((quality) => report.counts[colour][quality] > 0).map(
                (quality) => {
                  const style = QUALITY_STYLES[quality]
                  return (
                    <span
                      key={quality}
                      className="inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: `color-mix(in oklab, var(--q-${style.token}) 16%, transparent)`,
                        color: `var(--q-${style.token})`,
                      }}
                      title={`${style.label.fr} — ${style.description.fr}`}
                    >
                      {style.glyph} {report.counts[colour][quality]}
                    </span>
                  )
                },
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Les coups qui ont fait basculer la partie.
 *
 * Le graphique d'évaluation les montre déjà, mais sous forme de creux dans une
 * courbe : encore faut-il savoir la lire. Ici on les nomme, et un clic y mène.
 */
function KeyMoments({
  report,
  format,
  onSeek,
}: {
  report: FullGameReport
  format: (san: string) => string
  onSeek: (ply: number) => void
}) {
  const moments = report.turningPoints
    .map((ply) => report.moves.find((move) => move.ply === ply))
    .filter((move): move is NonNullable<typeof move> => move != null)

  if (moments.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-[13px] leading-snug text-muted">
          Aucun coup n’a fait basculer la partie : l’avantage n’a jamais changé de camp
          brutalement.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
        Moments clés
      </p>
      <div className="space-y-0.5">
        {moments.map((move) => {
          const style = QUALITY_STYLES[move.quality]
          return (
            <button
              key={move.ply}
              type="button"
              onClick={() => onSeek(move.ply)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-surface-hover"
            >
              <span className="w-9 shrink-0 tabular-nums text-faint">
                {move.moveNumber}
                {move.color === 'w' ? '.' : '…'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{format(move.san)}</span>
              <span
                className="shrink-0 font-bold"
                style={{ color: `var(--q-${style.token})` }}
                title={`${style.label.fr} — ${style.description.fr}`}
              >
                {style.glyph}
              </span>
              {meriteUnMeilleurCoup(move.quality, move.winLoss) && (
                <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-faint">
                  −{move.winLoss.toFixed(0)} pts
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** Catégories qui apportent une information — les coups corrects vont de soi. */
const SUMMARY_QUALITIES: MoveQuality[] = [
  'brilliant',
  'great',
  'inaccuracy',
  'mistake',
  'blunder',
  'miss',
]

function PlayerReport({
  colour,
  nom,
  accuracy,
  acpl,
  counts,
  estimatedElo,
  coach,
  issue,
}: {
  colour: Color
  /** Nom du joueur, s'il est connu. */
  nom?: string | null
  /** Issue de la partie, quand elle est connue. */
  issue?: 'w' | 'b' | 'nulle' | null
  accuracy: number
  acpl: number
  counts: Record<MoveQuality, number>
  estimatedElo: number
  coach: AnalysisOutcome['coach']['w']
}) {
  // On n'affiche que les catégories qui apportent une information.
  const shown: MoveQuality[] = [
    'brilliant',
    'great',
    'best',
    'book',
    'inaccuracy',
    'mistake',
    'blunder',
    'miss',
  ]

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <span
            className={clsx(
              'h-3 w-3 rounded-full',
              colour === 'w' ? 'bg-[var(--eval-white)]' : 'bg-[var(--eval-black)] ring-1 ring-line',
            )}
            aria-hidden
          />
          <span className="truncate">{nom ?? (colour === 'w' ? 'Blancs' : 'Noirs')}</span>
          {nom && (
            <span className="shrink-0 text-xs font-normal text-faint">
              {colour === 'w' ? 'Blancs' : 'Noirs'}
            </span>
          )}
          {/*
            Une couronne sur le vainqueur, et rien sur l'autre — pas de « perd »
            écrit en toutes lettres sur la carte de quelqu'un qui vient de
            relire sa défaite. Le score exact reste en tête de page ; ici, on
            se contente de désigner. Rien non plus sur une nulle, où il n'y a
            personne à désigner.
          */}
          {issue === colour && (
            <Crown size={14} className="shrink-0 text-accent" aria-label="Vainqueur de la partie" />
          )}
        </h3>
        <div className="text-right">
          <span className="font-display text-2xl font-bold tabular-nums">
            {accuracy.toFixed(1)}
            <span className="text-sm text-muted"> %</span>
          </span>
        </div>
      </div>

      <p className="mt-0.5 text-xs text-faint">
        perte moyenne {acpl} centipions ·{' '}
        {/*
          « Niveau estimé » était un mensonge poli : le chiffre ne mesure pas
          le niveau de quelqu'un mais la qualité de ses coups dans cette
          partie-là. On perd sur une gaffe unique en jouant proprement le
          reste, et face à un adversaire faible personne ne vous pose de
          problème — la mesure monte sans que rien ne l'ait mérité. Le dire
          coûte trois mots et évite qu'on se croie classé.
        */}
        <span title="Ce que valent les coups joués dans cette partie, pas ton classement. Une seule gaffe suffit à perdre une partie par ailleurs bien jouée, et un adversaire faible flatte la mesure.">
          performance sur cette partie ≈ {estimatedElo} Elo
        </span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {shown
          .filter((quality) => counts[quality] > 0)
          .map((quality) => {
            const style = QUALITY_STYLES[quality]
            return (
              <span
                key={quality}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background: `color-mix(in oklab, var(--q-${style.token}) 16%, transparent)`,
                  color: `var(--q-${style.token})`,
                }}
                title={`${style.label.fr} — ${style.description.fr}`}
              >
                {style.glyph} {counts[quality]}
              </span>
            )
          })}
      </div>

      <div className="mt-3 border-t border-line/60 pt-3">
        <p className="text-[13px] font-medium leading-snug">{coach.headline}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{coach.focus}</p>
      </div>
    </Card>
  )
}
