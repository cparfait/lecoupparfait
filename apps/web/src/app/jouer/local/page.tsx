'use client'

/**
 * Partie sur le même écran.
 *
 * Deux personnes, un seul appareil. C'est le mode le plus simple — aucun
 * réseau, aucun compte, aucun moteur — et c'est souvent celui par lequel on
 * apprend à quelqu'un à jouer.
 *
 * Le seul réglage qui compte : la **rotation automatique**. Sur un téléphone
 * posé entre deux joueurs, retourner l'échiquier à chaque coup change tout ;
 * sur un grand écran où l'on est côte à côte, c'est insupportable.
 */

/**
 * Le temps qu'on laisse à un coup pour être vu, avant de retourner le plateau.
 *
 * La rotation partait dans le même souffle que le coup : on lâchait la pièce et
 * l'échiquier basculait, si bien qu'on ne voyait jamais son propre coup en
 * place. C'est le seul moment de la partie où l'on regarde ce qu'on vient de
 * faire, et c'était précisément celui qu'on supprimait.
 *
 * 900 ms : assez pour que l'œil se pose sur la case d'arrivée et sur le
 * surlignage du dernier coup, trop peu pour qu'on ait le temps de s'impatienter
 * — au-delà d'une seconde, une attente imposée cesse d'être une respiration et
 * devient une latence.
 */
const PAUSE_AVANT_ROTATION = 900

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { ChessBoard, ViewToggle } from '@/components/board/ChessBoard.tsx'
import { PhysicalBoardPanel } from '@/components/board/PhysicalBoardPanel.tsx'
import {
  CommentaryPanel,
  CommentaryToggle,
  commentaryArrows,
  commentaryLegend,
  useLiveCommentary,
  type Alternative,
} from '@/components/game/LiveCommentary.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { PourquoiPanel } from '@/components/game/PourquoiPanel.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { useQualitesDesCoups } from '@/lib/game/useQualitesDesCoups.ts'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { Button, Card, Chip, Toggle } from '@/components/ui/index.tsx'
import { usePhysicalBoard } from '@/lib/board/usePhysicalBoard.ts'
import { useEcranAllume } from '@/lib/ecranAllume.ts'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound } from '@/lib/sound.ts'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useGrandEcran } from '@/lib/useMediaQuery.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function LocalGamePage() {
  const t = useT()
  const autoFlip = usePreferences((state) => state.autoFlip)
  const setPreference = usePreferences((state) => state.set)
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

  const { book } = useOpeningBook()
  const { marquer } = useQuotidien()
  const [orientation, setOrientation] = useState<Color>('w')
  const [finished, setFinished] = useState(false)
  const [gameKey, setGameKey] = useState(0)

  // Rotation en attente : le coup est joué, le plateau n'a pas encore basculé.
  const [rotationEnAttente, setRotationEnAttente] = useState(false)
  /** Côté du plateau, pour aligner les bandeaux dessus. */
  const [cotePlateau, setCotePlateau] = useState<number | null>(null)
  /** L'en-tête de la colonne des coups, où le plateau pose sa bascule de vue. */
  const [emplacementBascule, setEmplacementBascule] = useState<HTMLElement | null>(null)
  const grandEcran = useGrandEcran()
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  const annulerRotation = useCallback(() => {
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = null
    setRotationEnAttente(false)
  }, [])

  // Une partie qu'on quitte pendant la pause ne doit pas faire tourner un
  // `setState` sur un composant démonté.
  useEffect(() => annulerRotation, [annulerRotation])

  const game = useChessGame({
    onMove: (move) => {
      playMoveSound(move)
      if (!autoFlip) return
      // Le plateau reste du côté de celui qui vient de jouer, le temps qu'il
      // voie son coup — voir `PAUSE_AVANT_ROTATION`. Pendant cette pause,
      // l'échiquier n'accepte plus rien : sans ce verrou, l'adversaire pourrait
      // jouer sur un plateau encore tourné à l'envers, ce qui est la meilleure
      // façon de déplacer une pièce qu'on ne visait pas.
      const cible: Color = move.color === 'w' ? 'b' : 'w'
      if (minuterie.current) clearTimeout(minuterie.current)
      setRotationEnAttente(true)
      minuterie.current = setTimeout(() => {
        minuterie.current = null
        setOrientation(cible)
        setRotationEnAttente(false)
      }, PAUSE_AVANT_ROTATION)
    },
    onGameOver: (_, result) => {
      setFinished(true)
      playResultSound(result === '1/2-1/2' ? 'draw' : 'win')
      // Seulement « jouer une partie » : à deux sur le même écran, il y a bien
      // un vainqueur, mais rien ne dit lequel des deux tient l'appareil.
      marquer('partie')
    },
  })

  const { state, play, undo, reset, goTo } = game

  // Un téléphone posé entre deux joueurs est le cas où l'écran s'éteint le plus
  // vite : c'est l'autre qui réfléchit, et personne ne touche l'appareil.
  useEcranAllume(!state.isGameOver)

  const opening = useCurrentOpening(
    state.moves.map((move) => move.san),
    locale,
  )

  // La couleur des coups dans la liste. Ici moins que partout ailleurs il n'y a
  // de question d'assistance : les deux joueurs partagent l'écran, et le mode
  // commenté juste en dessous leur dit déjà bien davantage.
  const { parRang: qualites, bilan } = useQualitesDesCoups({ moves: state.moves, book })

  // ── Mode commenté ───────────────────────────────────────────────────────
  //
  // Autorisé ici, contrairement à la partie contre un ami : les deux joueurs
  // sont devant le même écran et voient la même chose. Ce n'est pas de
  // l'assistance, c'est un échiquier qui explique — exactement l'usage qu'on
  // en fait quand on apprend à deux.
  const commentaryMode = usePreferences((prefs) => prefs.commentaryMode)
  const [hoveredAlternative, setHoveredAlternative] = useState<Alternative | null>(null)
  const [showBestMove, setShowBestMove] = useState(true)

  const lastMove = state.moves[state.moves.length - 1] ?? null
  const { commentary, loading: coachLoading } = useLiveCommentary({
    move: lastMove,
    enabled: commentaryMode && state.isLive && !state.isGameOver,
    alternatives: 3,
    book,
  })

  const arrows = useMemo(() => {
    if (!commentaryMode) return []
    // Les flèches décrivent la position d'avant le dernier coup : dès qu'un
    // coup de plus tombe, elles pointeraient des cases qui ont changé.
    const current = commentary?.fenAfter === state.currentFen || hoveredAlternative
    if (!current) return []
    return commentaryArrows(commentary, hoveredAlternative, showBestMove)
  }, [commentaryMode, commentary, state.currentFen, hoveredAlternative, showBestMove])

  const arrowLegend = useMemo(
    () =>
      arrows.length === 0 ? [] : commentaryLegend(commentary, hoveredAlternative, showBestMove),
    [arrows, commentary, hoveredAlternative, showBestMove],
  )

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!state.isLive || rotationEnAttente) return
      play(from, to, promotion)
    },
    [play, state.isLive, rotationEnAttente],
  )

  // ── Échiquier électronique ──────────────────────────────────────────────
  //
  // C'est ici que le branchement a le plus de sens : deux joueurs autour d'un
  // vrai plateau, l'écran servant d'arbitre et de carnet de partie.
  const physicalBoard = usePhysicalBoard({
    chess: game.chess,
    fen: state.currentFen,
    isLive: state.isLive && !state.isGameOver,
    play: handleMove,
    lastMove: state.lastMove,
  })

  const newGame = useCallback(() => {
    annulerRotation()
    reset()
    setOrientation('w')
    setFinished(false)
    setGameKey((key) => key + 1)
  }, [reset, annulerRotation])

  // Annuler un coup annule aussi la rotation qu'il avait déclenchée : sinon le
  // plateau bascule une seconde plus tard vers un joueur dont ce n'est plus le
  // tour.
  const annulerCoup = useCallback(() => {
    const dernier = state.moves[state.moves.length - 1]
    annulerRotation()
    undo(1)
    // Le trait revient à celui qui avait joué : avec la rotation automatique,
    // le plateau se remet de son côté. Sans cela, il restait tourné vers
    // l'adversaire et le coup suivant se jouait à l'envers.
    if (autoFlip && dernier) setOrientation(dernier.color)
  }, [undo, annulerRotation, state.moves, autoFlip])

  /**
   * Les actions, rendues une seule fois : sous le plateau jusqu'à `lg`, au
   * pied de la colonne des coups au-delà — voir la partie contre
   * l'ordinateur, qui suit la même règle.
   *
   * Les libellés tombent sous `sm` : quatre boutons à texte plein
   * débordaient sur une seconde ligne, qui poussait l'échiquier hors de
   * l'écran sur un téléphone. Les icônes restent, et `title` avec elles —
   * voir la barre de la partie en ligne, qui applique la même règle.
   */
  const actions = (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon={<RotateCcw size={14} />}
        onClick={() => {
          // Retourner à la main pendant la pause doit gagner : sans cette
          // annulation, la minuterie basculerait le plateau une seconde
          // plus tard et défairait le geste.
          annulerRotation()
          setOrientation((value) => (value === 'w' ? 'b' : 'w'))
        }}
        title={t('local.flipBoard')}
        aria-label={t('local.flipBoard')}
      >
        <span className="max-sm:hidden">{t('bits.flip')}</span>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        icon={<Undo2 size={14} />}
        onClick={annulerCoup}
        disabled={state.moves.length === 0}
        title={t('local.undoLast')}
        aria-label={t('local.undoLast')}
      >
        <span className="max-sm:hidden">{t('bits.undo')}</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<RefreshCw size={14} />}
        onClick={newGame}
        title={t('game.newGame')}
        aria-label={t('game.newGame')}
      >
        <span className="max-sm:hidden">{t('game.newGame')}</span>
      </Button>
      <CommentaryToggle
        active={commentaryMode}
        onChange={(value) => setPreference('commentaryMode', value)}
      />
    </>
  )

  const etatDuTrait = state.isGameOver
    ? t('local.gameOver')
    : rotationEnAttente
      ? t('local.boardTurning')
      : t('local.turnTo', {
          couleur: t(state.turn === 'w' ? 'settings.white' : 'settings.black'),
        })

  return (
    <div className="mx-auto w-full max-w-[1300px] px-2 py-3 sm:px-4 lg:py-6">
      {/* Les zones sont placées par nom : voir `.grille-partie` dans
          `globals.css`. Même grille que la partie contre l'ordinateur — en
          paysage, le plateau à gauche et tout le reste à droite. */}
      <div
        className="grille-partie [--aside:320px]"
        style={
          cotePlateau
            ? ({ '--cote-plateau': `${cotePlateau}px` } as React.CSSProperties)
            : undefined
        }
      >
        <PlayerBar
          className="[grid-area:pion]"
          name={orientation === 'w' ? 'Noirs' : 'Blancs'}
          color={orientation === 'w' ? 'b' : 'w'}
          avatar={orientation === 'w' ? '♚' : '♔'}
          active={state.turn !== orientation && !state.isGameOver}
          status={
            state.turn !== orientation && !state.isGameOver && !rotationEnAttente
              ? t('local.toMove')
              : undefined
          }
          captured={state.material[orientation === 'w' ? 'b' : 'w']}
          materialLead={
            orientation === 'w'
              ? Math.max(0, -state.material.balance)
              : Math.max(0, state.material.balance)
          }
        />

        <div className="[grid-area:plateau] my-1.5 flex min-h-0 min-w-0 items-center justify-center">
          <ChessBoard
            key={gameKey}
            fitParentHeight
            reservedHeight={9}
            onFit={setCotePlateau}
            // Sur grand écran, la bascule vit en tête de la colonne des coups — dessinée

            // par le plateau, qui garde ainsi son bouton de plein écran. En dessous,

            // elle reprend sa rangée sous le plateau.

            emplacementBascule={grandEcran ? emplacementBascule : undefined}
            fen={state.fen}
            orientation={orientation}
            playable={state.isLive && !state.isGameOver && !rotationEnAttente ? 'both' : null}
            legalMoves={state.legalMoves}
            onMove={handleMove}
            lastMove={state.lastMove}
            dernierCoupSan={state.moves[state.moves.length - 1]?.san ?? null}
            checkSquare={state.checkSquare}
            checkmate={state.status === 'checkmate'}
            arrows={arrows}
            highlights={commentaryMode ? (commentary?.highlights ?? []) : []}
          />
        </div>

        <PlayerBar
          className="[grid-area:moi]"
          name={orientation === 'w' ? 'Blancs' : 'Noirs'}
          color={orientation}
          avatar={orientation === 'w' ? '♔' : '♚'}
          active={state.turn === orientation && !state.isGameOver}
          status={
            state.turn === orientation && !state.isGameOver && !rotationEnAttente
              ? t('local.toMove')
              : undefined
          }
          captured={state.material[orientation]}
          materialLead={
            orientation === 'w'
              ? Math.max(0, state.material.balance)
              : Math.max(0, -state.material.balance)
          }
        />

        {/* Jusqu'à `lg` seulement : au-delà, les actions vivent au pied de la
            colonne des coups et le plateau récupère la hauteur de la barre. */}
        {!grandEcran && (
          <div className="[grid-area:barre] mt-3 flex flex-wrap gap-1.5">
            {/* La bascule 2D / 3D sous `sm` et en paysage : ailleurs elle
                occupait une rangée entière sous l'échiquier pour trois
                boutons alignés à droite. */}
            <ViewToggle className="sm:hidden paysage:flex" />
            <span className="mr-auto flex items-center gap-2 pl-1 text-sm">
              <span
                className={
                  state.turn === 'w'
                    ? 'h-2.5 w-2.5 rounded-full bg-[var(--eval-white)]'
                    : 'h-2.5 w-2.5 rounded-full bg-[var(--eval-black)] ring-1 ring-line'
                }
                aria-hidden
              />
              {etatDuTrait}
            </span>
            {actions}
          </div>
        )}

        <div className="[grid-area:aside] mt-4 flex min-h-0 flex-col gap-3 lg:mt-0 paysage:mt-0 paysage:overflow-y-auto paysage:overscroll-contain">
          {commentaryMode ? (
            <CommentaryPanel
              legende={arrowLegend}
              commentary={commentary}
              loading={coachLoading}
              onHoverAlternative={setHoveredAlternative}
              showBestMove={showBestMove}
              onToggleBestMove={() => setShowBestMove((value) => !value)}
            />
          ) : (
            // Le mode commenté est éteint : on ne dit rien de soi-même, mais on
            // laisse la porte ouverte à qui bloque sur un coup précis.
            <PourquoiPanel
              // En revue — on a cliqué un coup de la liste —, la question porte
              // sur le coup consulté, pas sur le dernier joué.
              move={state.isLive ? lastMove : (state.moves[state.cursor] ?? null)}
              enRevue={!state.isLive}
              book={book}
              openingName={opening?.name ?? null}
            />
          )}

          <PhysicalBoardPanel state={physicalBoard} />

          <Card className="p-4">
            <Toggle
              label={t('local.autoFlip')}
              description={t('local.autoFlipHint')}
              checked={autoFlip}
              onChange={(value) => setPreference('autoFlip', value)}
            />
          </Card>

          {opening && (
            <Card className="flex items-center gap-2.5 px-3.5 py-2.5">
              <Chip tone="accent">{opening.eco}</Chip>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{opening.name}</span>
            </Card>
          )}

          {/* Même règle qu'en partie contre l'ordinateur : douze rangées, la
              carte se règle sur ce qu'elle contient, et le reste de la colonne
              n'est pas un cadre vide. */}
          <Card className="flex max-h-[45vh] flex-col overflow-hidden lg:max-h-none">
            {grandEcran && (
              <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2">
                <span className="text-[12px] font-semibold text-faint">{t('game.moves')}</span>
                {(state.isGameOver || rotationEnAttente) && (
                  <span className="truncate text-[12px] text-muted">· {etatDuTrait}</span>
                )}
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
            />
            {grandEcran && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-line/60 p-2.5">
                {actions}
              </div>
            )}
          </Card>
        </div>
      </div>

      {finished && (
        <GameOverDialog
          status={state.status}
          result={state.result}
          playerColor={null}
          opponentName={t('rest.theOpponent')}
          moves={state.moves}
          bilan={bilan}
          onNewGame={newGame}
        />
      )}
    </div>
  )
}
