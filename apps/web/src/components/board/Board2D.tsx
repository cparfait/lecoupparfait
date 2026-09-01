'use client'

/**
 * Échiquier 2D.
 *
 * Trois façons de jouer un coup, toutes actives en même temps :
 *  - **glisser-déposer** — le geste naturel à la souris comme au doigt ;
 *  - **clic-clic** — sélectionner la pièce, puis la case d'arrivée ; c'est plus
 *    précis sur petit écran et c'est ce qu'utilisent la plupart des joueurs
 *    rapides ;
 *  - **pré-coup** — jouer pendant le tour de l'adversaire ; le coup part dès
 *    qu'il a joué le sien.
 *
 * Le clic droit glissé trace des flèches et entoure des cases, comme sur les
 * grandes plateformes : c'est l'outil de réflexion le plus utilisé pendant
 * l'analyse.
 *
 * L'échiquier ne connaît pas les règles : il reçoit la liste des coups légaux
 * et signale une intention de coup. C'est l'appelant qui décide.
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Color, PieceSymbol, Square } from 'chess.js'
import clsx from 'clsx'
import {
  ANNOTATION_COLORS,
  BOARD_SKINS,
  type Arrow,
  type AnnotationColor,
  type BoardPiece,
  type CircleMark,
  arrowPath,
  isLightSquare,
  orderedSquares,
  pieceUrl,
  piecesFromFen,
  squareAt,
  squareCentre,
  squarePosition,
} from './boardKit.ts'
import { QUALITY_STYLES, type MoveQuality } from '@coupparfait/core'
import { PromotionPicker } from './PromotionPicker.tsx'
import {
  SAFETY_COLOURS,
  describeSafety,
  evaluateMoveSafety,
  type SafetyVerdict,
} from './moveSafety.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { BoardStyleId } from '@/lib/store/preferences.ts'

export interface Board2DProps {
  fen: string
  orientation?: Color
  /** Couleur que l'utilisateur a le droit de déplacer. `null` = lecture seule. */
  playable?: Color | 'both' | null
  /** Coups légaux, indexés par case de départ. */
  legalMoves?: Map<Square, Square[]>
  /** Appelé quand l'utilisateur veut jouer un coup. */
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void
  /**
   * Appelé quand l'utilisateur enregistre un pré-coup.
   *
   * `promotion` est demandée **au moment de l'enregistrement**, et non quand le
   * coup part : le sélecteur s'ouvre sur la case d'arrivée, et cette case
   * n'aura plus la même signification une fois le tour de l'adversaire passé.
   * Sans cela, un pré-coup de promotion aurait promu en dame d'office — le
   * contraire de ce que le sélecteur existe pour éviter.
   */
  onPremove?: (from: Square, to: Square, promotion?: PieceSymbol) => void
  /**
   * Oublier le pré-coup en attente.
   *
   * Appelé au premier geste sur le plateau : c'est la convention partout
   * ailleurs, et c'est la seule façon d'en changer d'avis. Un pré-coup qu'on ne
   * peut pas retirer devient un piège dès que l'adversaire joue autre chose que
   * prévu. Si le geste en pose un nouveau, il remplace celui-ci de toute façon.
   */
  onPremoveCancel?: () => void
  /**
   * Clic simple sur une case, quel qu'en soit le contenu.
   *
   * Sert aux usages qui ne sont pas « déplacer une pièce » — l'éditeur de
   * position, où cliquer pose ou retire. Quand ce crochet est fourni, il
   * remplace entièrement la sélection et le déplacement : les deux logiques ne
   * peuvent pas cohabiter sur le même geste.
   */
  onSquareClick?: (square: Square) => void
  /** Dernier coup joué, pour le surlignage. */
  lastMove?: { from: Square; to: Square } | null
  /** Case du roi en échec. */
  checkSquare?: Square | null
  /**
   * Vrai si cet échec est un mat.
   *
   * La partie s'arrête sur ce coup, et rien ne le distinguait jusqu'ici d'un
   * échec ordinaire — même halo, même silence visuel. Or c'est le seul moment
   * où l'échiquier a quelque chose à annoncer.
   */
  checkmate?: boolean
  /** Cases mises en avant par l'analyse (motifs tactiques). */
  highlights?: Square[]
  /**
   * Verdict porté par la case d'arrivée du coup.
   *
   * Le jugement d'un coup s'affichait uniquement dans le panneau de commentaire,
   * c'est-à-dire à côté de l'échiquier — parfois sous la ligne de flottaison sur
   * un écran étroit. Or on regarde la case où la pièce vient d'arriver : c'est
   * là que le verdict doit être, et pas ailleurs.
   *
   * La case prend la teinte du barème et porte une pastille. Rien d'autre :
   * l'explication reste dans le panneau, on ne met sur le plateau que ce qui se
   * lit d'un coup d'œil.
   */
  verdict?: { square: Square; quality: MoveQuality } | null
  /** Flèches permanentes (meilleur coup, menaces…). */
  arrows?: Arrow[]
  /** Cercles permanents. */
  circles?: CircleMark[]
  /** Autorise les annotations au clic droit. */
  allowAnnotations?: boolean
  /**
   * Impose un habillage de damier, au lieu de suivre la préférence du joueur.
   *
   * Réservé aux échiquiers décoratifs — la bannière d'accueil, où le damier
   * doit s'accorder au thème affiché. Sur un échiquier jouable, écraser le
   * choix de l'utilisateur serait un contresens.
   */
  skinId?: BoardStyleId
  /**
   * Appelé quand on clique une flèche permanente.
   *
   * Sert à répondre à la question naturelle devant une flèche bleue : « et
   * pourquoi ce coup-là ? ». Sans cela la flèche affirme sans expliquer.
   */
  onArrowClick?: (arrow: Arrow) => void
  /** Pré-coup en attente, affiché en surbrillance. */
  premove?: { from: Square; to: Square } | null
  /** Cases grisées (mode leçon : « joue ici »). */
  spotlight?: Square[]
  className?: string
  /** Désactive toute animation, pour la navigation rapide dans une partie. */
  instant?: boolean
  /**
   * Durée d'animation imposée, en millisecondes.
   *
   * Sert à ralentir la réponse de l'adversaire : son coup arrive sans qu'on
   * l'ait anticipé, et à la vitesse d'un coup qu'on joue soi-même il se réduit
   * à un clignotement. On ne voit pas *quelle* pièce a bougé, seulement que la
   * position a changé.
   */
  animationMs?: number
}

type DragState = {
  piece: BoardPiece
  /** Position du curseur en pourcentage du plateau. */
  x: number
  y: number
  pointerId: number
  /** Vrai dès que le pointeur a bougé : distingue un clic d'un glisser. */
  moved: boolean
}

type AnnotationDraft = {
  from: Square
  to: Square | null
  color: AnnotationColor
}

export const Board2D = memo(function Board2D({
  fen,
  orientation = 'w',
  playable = null,
  legalMoves,
  onMove,
  onPremove,
  onPremoveCancel,
  onSquareClick,
  lastMove,
  checkSquare,
  checkmate = false,
  highlights = [],
  verdict = null,
  arrows = [],
  circles = [],
  allowAnnotations = true,
  onArrowClick,
  premove,
  spotlight,
  className,
  instant = false,
  animationMs: animationOverride,
  skinId,
}: Board2DProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const prefs = usePreferences()
  // La surcharge ne sert qu'aux échiquiers de démonstration, qui illustrent
  // l'habillage courant plutôt que d'obéir au réglage du joueur. Partout
  // ailleurs `skinId` est absent et la préférence gagne.
  const skin = BOARD_SKINS[skinId ?? prefs.boardStyle] ?? BOARD_SKINS.aurore

  const pieces = useMemo(() => piecesFromFen(fen), [fen])
  const squares = useMemo(() => orderedSquares(orientation), [orientation])

  const [selected, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverSquare, setHoverSquare] = useState<Square | null>(null)
  /**
   * Promotion en cours d'arbitrage.
   *
   * `precoup` distingue les deux usages du même sélecteur : on choisit la pièce
   * pour un coup qu'on joue maintenant, ou pour un pré-coup qu'on enregistre.
   * Le rendu est identique — c'est la destination du choix qui change.
   */
  const [promotion, setPromotion] = useState<{
    from: Square
    to: Square
    color: Color
    precoup?: boolean
  } | null>(null)

  // Annotations dessinées par l'utilisateur, effacées à chaque nouveau coup.
  const [userArrows, setUserArrows] = useState<Arrow[]>([])
  const [userCircles, setUserCircles] = useState<CircleMark[]>([])
  const [draft, setDraft] = useState<AnnotationDraft | null>(null)

  // Le plateau change de position : on nettoie sélection et annotations.
  useEffect(() => {
    setSelected(null)
    setUserArrows([])
    setUserCircles([])
  }, [fen])

  // Le réglage de l'utilisateur reste la référence ; une durée imposée ne peut
  // que l'allonger. Quelqu'un qui a choisi « instantané » l'a voulu.
  const preferred = prefs.animationMs
  const animationMs =
    instant || preferred === 0 ? 0 : Math.max(preferred, animationOverride ?? 0)

  // ── Utilitaires ───────────────────────────────────────────────────────────

  const canMove = useCallback(
    (piece: BoardPiece): boolean => {
      if (playable === null) return false
      if (playable === 'both') return true
      return piece.color === playable
    },
    [playable],
  )

  const targetsFor = useCallback(
    (square: Square): Square[] => legalMoves?.get(square) ?? [],
    [legalMoves],
  )

  /** Coordonnées relatives (0–1) d'un événement pointeur dans le plateau. */
  const relativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }, [])

  /** Détecte une promotion et ouvre le sélecteur au lieu de jouer directement. */
  const commitMove = useCallback(
    (from: Square, to: Square) => {
      const piece = pieces.find((p) => p.square === from)
      if (!piece) return
      const lastRank = piece.color === 'w' ? '8' : '1'
      if (piece.type === 'p' && to[1] === lastRank) {
        setPromotion({ from, to, color: piece.color })
        return
      }
      onMove?.(from, to)
    },
    [onMove, pieces],
  )

  const attemptMove = useCallback(
    (from: Square, to: Square) => {
      if (from === to) return
      const legal = targetsFor(from)

      if (legal.includes(to)) {
        commitMove(from, to)
        setSelected(null)
        return
      }

      /*
        Coup illégal maintenant, mais peut-être jouable au tour suivant : c'est
        un pré-coup. On ne le propose que si la pièce appartient au joueur.

        `legal.length === 0` restreint volontairement aux cas où la pièce n'a
        *aucun* coup légal, c'est-à-dire, en pratique, quand ce n'est pas notre
        trait. Sans cette borne, viser une case interdite pendant son propre
        tour enregistrerait un pré-coup au lieu de ne rien faire.
      */
      const piece = pieces.find((p) => p.square === from)
      if (prefs.premove && onPremove && piece && canMove(piece) && legal.length === 0) {
        // Un pion qui vise la dernière rangée : on demande la pièce tout de
        // suite. Attendre le départ du pré-coup reviendrait à promouvoir en
        // dame d'office, et le sélecteur s'ouvrirait sur une position qui a
        // changé entre-temps.
        const derniere = piece.color === 'w' ? '8' : '1'
        if (piece.type === 'p' && to[1] === derniere) {
          setPromotion({ from, to, color: piece.color, precoup: true })
          setSelected(null)
          return
        }
        onPremove(from, to)
        setSelected(null)
        return
      }

      setSelected(null)
    },
    [targetsFor, commitMove, pieces, prefs.premove, onPremove, canMove],
  )

  // ── Glisser-déposer ───────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Clic droit ou clic secondaire : annotation.
      if (event.button === 2) {
        if (!allowAnnotations) return
        const point = relativePoint(event.clientX, event.clientY)
        const square = point ? squareAt(point.x, point.y, orientation) : null
        if (square) {
          const color: AnnotationColor = event.shiftKey
            ? 'blue'
            : event.altKey
              ? 'orange'
              : event.ctrlKey
                ? 'red'
                : 'green'
          setDraft({ from: square, to: null, color })
          boardRef.current?.setPointerCapture(event.pointerId)
        }
        return
      }
      if (event.button !== 0) return

      // Un clic gauche annule le pré-coup en attente. Voir `onPremoveCancel`.
      if (premove) onPremoveCancel?.()

      const point = relativePoint(event.clientX, event.clientY)
      if (!point) return
      const square = squareAt(point.x, point.y, orientation)
      if (!square) return

      // L'éditeur de position prend la main sur tout le reste : poser une
      // pièce et en déplacer une sont deux gestes incompatibles.
      if (onSquareClick) {
        onSquareClick(square)
        return
      }

      // Une annotation en cours disparaît au premier clic gauche.
      if (userArrows.length > 0 || userCircles.length > 0) {
        setUserArrows([])
        setUserCircles([])
      }

      const piece = pieces.find((p) => p.square === square)

      // Deuxième clic : on tente le coup vers la case cliquée.
      if (selected && selected !== square) {
        const legal = targetsFor(selected)
        if (legal.includes(square)) {
          commitMove(selected, square)
          setSelected(null)
          return
        }
        // Cliquer sur une autre de ses pièces change la sélection.
        if (!piece || !canMove(piece)) {
          attemptMove(selected, square)
          return
        }
      }

      if (!piece || !canMove(piece)) {
        setSelected(null)
        return
      }

      setSelected(square)
      setDrag({
        piece,
        x: point.x * 100,
        y: point.y * 100,
        pointerId: event.pointerId,
        moved: false,
      })
      boardRef.current?.setPointerCapture(event.pointerId)
    },
    [
      allowAnnotations,
      relativePoint,
      orientation,
      pieces,
      selected,
      targetsFor,
      commitMove,
      canMove,
      attemptMove,
      userArrows.length,
      userCircles.length,
      onSquareClick,
      premove,
      onPremoveCancel,
    ],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const point = relativePoint(event.clientX, event.clientY)
      if (!point) return

      if (draft) {
        const square = squareAt(point.x, point.y, orientation)
        setDraft((current) => (current ? { ...current, to: square } : null))
        return
      }

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      setDrag((current) =>
        current ? { ...current, x: point.x * 100, y: point.y * 100, moved: true } : null,
      )
      setHoverSquare(squareAt(point.x, point.y, orientation))
    },
    [relativePoint, draft, drag, orientation],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const point = relativePoint(event.clientX, event.clientY)
      const square = point ? squareAt(point.x, point.y, orientation) : null

      // Fin d'une annotation.
      if (draft) {
        if (square && square !== draft.from) {
          const arrow: Arrow = { from: draft.from, to: square, color: draft.color }
          setUserArrows((current) => toggleArrow(current, arrow))
        } else if (square) {
          setUserCircles((current) => toggleCircle(current, { square, color: draft.color }))
        }
        setDraft(null)
        return
      }

      if (!drag || drag.pointerId !== event.pointerId) return

      // Un simple clic laisse la pièce sélectionnée ; un glisser joue le coup.
      if (drag.moved && square) {
        attemptMove(drag.piece.square, square)
      }
      setDrag(null)
      setHoverSquare(null)
    },
    [relativePoint, orientation, draft, drag, attemptMove],
  )

  const handlePointerCancel = useCallback(() => {
    setDrag(null)
    setDraft(null)
    setHoverSquare(null)
  }, [])

  // ── Accessibilité clavier ─────────────────────────────────────────────────

  const [focusSquare, setFocusSquare] = useState<Square>('e4')

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const file = focusSquare.charCodeAt(0) - 97
      const rank = focusSquare.charCodeAt(1) - 49
      const step = orientation === 'w' ? 1 : -1
      let next: Square | null = null

      switch (event.key) {
        case 'ArrowRight':
          next = shift(file + step, rank)
          break
        case 'ArrowLeft':
          next = shift(file - step, rank)
          break
        case 'ArrowUp':
          next = shift(file, rank + step)
          break
        case 'ArrowDown':
          next = shift(file, rank - step)
          break
        case 'Enter':
        case ' ': {
          event.preventDefault()
          const piece = pieces.find((p) => p.square === focusSquare)
          if (selected) {
            attemptMove(selected, focusSquare)
          } else if (piece && canMove(piece)) {
            setSelected(focusSquare)
          }
          return
        }
        case 'Escape':
          setSelected(null)
          return
        default:
          return
      }

      if (next) {
        event.preventDefault()
        setFocusSquare(next)
      }
    },
    [focusSquare, orientation, pieces, selected, attemptMove, canMove],
  )

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const selectedTargets = selected ? targetsFor(selected) : []

  /**
   * Verdict de sûreté de chaque case d'arrivée.
   *
   * Calculé seulement quand l'option est active et qu'une pièce est
   * sélectionnée : une trentaine d'échanges statiques, imperceptibles, mais
   * inutiles à faire en permanence.
   */
  const safety = useMemo<Map<Square, SafetyVerdict>>(() => {
    if (!prefs.moveSafetyHints || !selected || selectedTargets.length === 0) {
      return new Map()
    }
    return evaluateMoveSafety(fen, selected, selectedTargets)
  }, [prefs.moveSafetyHints, selected, selectedTargets, fen])
  const occupied = useMemo(() => new Set(pieces.map((p) => p.square)), [pieces])
  const allArrows = [...arrows, ...userArrows]
  const allCircles = [...circles, ...userCircles]
  const highlightSet = useMemo(() => new Set(highlights), [highlights])
  const spotlightSet = useMemo(() => (spotlight ? new Set(spotlight) : null), [spotlight])

  return (
    <div
      className={clsx(
        'relative aspect-square w-full select-none no-select',
        'rounded-[var(--radius)] overflow-hidden',
        className,
      )}
      style={{
        boxShadow: prefs.effects === 'high' ? 'var(--shadow-lg)' : undefined,
        outline: `1px solid ${skin.frame}`,
        // Contexte de conteneur : les coordonnées se dimensionnent en `cqw`,
        // donc relativement à la largeur de l'échiquier et non de la fenêtre.
        // Volontairement porté ici et non par le composant parent : la
        // containment CSS perturbe la mesure initiale du canevas WebGL.
        containerType: 'inline-size',
      }}
    >
      <div
        ref={boardRef}
        role="grid"
        aria-label="Échiquier"
        tabIndex={0}
        className="absolute inset-0 touch-none outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        {/* ── Cases ─────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {squares.map((square) => {
            const light = isLightSquare(square)
            const isSpotlit = spotlightSet ? spotlightSet.has(square) : true
            return (
              <div
                key={square}
                role="gridcell"
                aria-label={square}
                className="relative"
                style={{
                  background: light ? skin.light : skin.dark,
                  backgroundImage: !light ? skin.texture : undefined,
                  opacity: isSpotlit ? 1 : 0.42,
                  transition: 'opacity .3s ease',
                }}
              />
            )
          })}
        </div>

        {/* ── Surlignages ───────────────────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0">
          {prefs.highlightLastMove && lastMove && (
            <>
              <SquareOverlay square={lastMove.from} orientation={orientation} color={skin.lastMove} />
              <SquareOverlay square={lastMove.to} orientation={orientation} color={skin.lastMove} />
              {/* Le sillage se rejoue à chaque coup grâce à la clé : React
                  remonte l'élément, et l'animation CSS repart de zéro. */}
              {prefs.effects === 'high' && (
                <MoveTrail
                  key={`${lastMove.from}${lastMove.to}`}
                  from={lastMove.from}
                  to={lastMove.to}
                  orientation={orientation}
                  colour={skin.lastMove}
                />
              )}
            </>
          )}

          {premove && (
            <>
              <SquareOverlay square={premove.from} orientation={orientation} color="rgba(90,140,255,.45)" />
              <SquareOverlay square={premove.to} orientation={orientation} color="rgba(90,140,255,.45)" />
            </>
          )}

          {selected && (
            <SquareOverlay square={selected} orientation={orientation} color={skin.selected} />
          )}

          {hoverSquare && drag && selectedTargets.includes(hoverSquare) && (
            <SquareOverlay
              square={hoverSquare}
              orientation={orientation}
              color="rgba(255,255,255,.16)"
              ring
            />
          )}

          {[...highlightSet].map((square) => (
            <SquareOverlay
              key={`hl-${square}`}
              square={square}
              orientation={orientation}
              color="color-mix(in oklab, var(--accent) 42%, transparent)"
              pulse
            />
          ))}

          {verdict && <VerdictDeCase verdict={verdict} orientation={orientation} />}

          {prefs.highlightCheck && checkSquare && (
            <div
              className={clsx('absolute', checkmate && 'animate-mate-glow')}
              style={{
                ...percentBox(checkSquare, orientation),
                background: `radial-gradient(circle, ${skin.check} ${checkmate ? '22%' : '12%'}, transparent 72%)`,
              }}
            />
          )}

          {/* Trois ondes décalées partent du roi maté. La clé les rejoue quand
              le mat change de case — en analyse, on navigue d'une partie à
              l'autre sans que le composant soit démonté. */}
          {checkSquare &&
            checkmate &&
            prefs.effects === 'high' &&
            [0, 1, 2].map((index) => (
              <div
                key={`${checkSquare}-${index}`}
                className="animate-mate-ring absolute rounded-full"
                style={{
                  ...percentBox(checkSquare, orientation),
                  border: `2px solid ${skin.check}`,
                  animationDelay: `${index * 260}ms`,
                }}
                aria-hidden
              />
            ))}
        </div>

        {/* ── Coordonnées ───────────────────────────────────────────────── */}
        {prefs.showCoordinates && (
          <Coordinates orientation={orientation} skin={skin} />
        )}

        {/* ── Pièces ────────────────────────────────────────────────────── */}
        {pieces.map((piece) => {
          const isDragged = drag?.piece.square === piece.square && drag.moved
          const position = squarePosition(piece.square, orientation)
          return (
            <div
              key={piece.id}
              className={clsx(
                'absolute pointer-events-none will-change-transform',
                isDragged && 'z-30',
              )}
              style={{
                width: '12.5%',
                height: '12.5%',
                left: 0,
                top: 0,
                // Les pourcentages d'une translation se rapportent à la taille
                // de l'élément (12,5 % du plateau) : un déplacement de X % du
                // plateau vaut donc X × 8 % ici.
                transform: isDragged
                  ? `translate(${(drag.x - 6.25) * 8}%, ${(drag.y - 6.25) * 8}%) scale(1.16)`
                  : `translate(${position.left * 8}%, ${position.top * 8}%)`,
                transition: isDragged ? 'none' : `transform ${animationMs}ms cubic-bezier(.2,.9,.25,1)`,
                filter: isDragged ? 'drop-shadow(0 12px 18px rgb(0 0 0 / .45))' : undefined,
                zIndex: isDragged ? 30 : 10,
              }}
            >
              <img
                src={pieceUrl(prefs.pieceSet, piece.color, piece.type)}
                alt=""
                draggable={false}
                className="h-full w-full"
                style={{ imageRendering: prefs.pieceSet === 'pixel' ? 'pixelated' : undefined }}
              />
            </div>
          )
        })}

        {/* ── Indications de coups légaux ───────────────────────────────── */}
        {prefs.showLegalMoves && selected && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {selectedTargets.map((target) => {
              const isCapture = occupied.has(target)
              const verdict = safety.get(target)
              // Sans l'option, on garde la couleur neutre de l'habillage.
              const colour = verdict ? SAFETY_COLOURS[verdict.safety] : null

              return (
                <div
                  key={`t-${target}`}
                  className="absolute grid place-items-center"
                  style={percentBox(target, orientation)}
                  title={verdict ? describeSafety(verdict) : undefined}
                >
                  {isCapture ? (
                    <span
                      className="block h-[86%] w-[86%] rounded-full"
                      style={{
                        boxShadow: `inset 0 0 0 4px ${colour ?? skin.capture}`,
                        opacity: 0.9,
                      }}
                    />
                  ) : (
                    <span
                      className={clsx('block rounded-full', colour ? 'h-[38%] w-[38%]' : 'h-[30%] w-[30%]')}
                      style={{
                        background: colour ?? skin.hint,
                        boxShadow: colour ? '0 0 0 2px rgb(0 0 0 / .25)' : undefined,
                      }}
                    />
                  )}

                  {/* Un liseré signale les coups qui donnent échec. */}
                  {verdict?.check && (
                    <span
                      className="pointer-events-none absolute inset-[6%] rounded-[20%]"
                      style={{ boxShadow: 'inset 0 0 0 2px var(--q-great)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Flèches et cercles ────────────────────────────────────────── */}
        <AnnotationLayer
          arrows={allArrows}
          circles={allCircles}
          draft={draft}
          orientation={orientation}
          onArrowClick={onArrowClick}
        />
      </div>

      {promotion && (
        <PromotionPicker
          color={promotion.color}
          square={promotion.to}
          orientation={orientation}
          pieceSet={prefs.pieceSet}
          onSelect={(type) => {
            // Même sélecteur, deux destinations : le coup qu'on joue, ou le
            // pré-coup qu'on met en attente.
            if (promotion.precoup) onPremove?.(promotion.from, promotion.to, type)
            else onMove?.(promotion.from, promotion.to, type)
            setPromotion(null)
            setSelected(null)
          }}
          onCancel={() => {
            setPromotion(null)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
//  Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

function percentBox(square: Square, orientation: Color) {
  const { left, top } = squarePosition(square, orientation)
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: '12.5%',
    height: '12.5%',
  } as const
}

/**
 * Sillage du dernier coup.
 *
 * Deux cases colorées disent *où* la pièce est passée, jamais *dans quel sens*.
 * Sur l'échiquier d'un débutant, c'est la question la plus fréquente devant un
 * coup adverse : « qu'est-ce qui a bougé ? ». Le trait se dessine de la case de
 * départ vers celle d'arrivée, puis s'efface — il informe sans encombrer.
 *
 * Le tracé emprunte le même coude que les flèches pour les cavaliers : c'est
 * ainsi qu'on lit leur déplacement dans les livres.
 */
function MoveTrail({
  from,
  to,
  orientation,
  colour,
}: {
  from: Square
  to: Square
  orientation: Color
  colour: string
}) {
  const { path } = arrowPath(from, to, orientation)

  // Longueur approchée du tracé, pour amorcer le pointillé animé. La mesure
  // exacte demanderait le DOM ; l'écart ne se voit pas à cette vitesse.
  const a = squareCentre(from, orientation)
  const b = squareCentre(to, orientation)
  const length = Math.hypot(b.x - a.x, b.y - a.y) + 12

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={colour}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-move-trail"
        style={
          {
            strokeDasharray: length,
            '--trail-length': String(length),
          } as React.CSSProperties
        }
      />
    </svg>
  )
}

/**
 * La qualité du coup, posée sur sa case d'arrivée.
 *
 * Deux éléments, et pas un de plus : la case prend la teinte du barème, et une
 * pastille porte le symbole. La teinte reste discrète — dix-huit pour cent —
 * parce qu'elle se superpose au sillage du dernier coup et aux motifs mis en
 * avant ; plus opaque, elle les effacerait au lieu de s'y ajouter.
 *
 * La pastille déborde volontairement sur le coin haut-droit de la case, comme
 * une pastille de notification : à l'intérieur, elle masquerait la pièce qui
 * vient de bouger, qui est précisément ce qu'on regarde.
 *
 * Fond blanc et symbole coloré, et non l'inverse. Un symbole blanc sur la
 * teinte du barème est très lisible sur la gaffe — rouge vif — et illisible sur
 * l'imprécision, dont le jaune `#f7c631` ne fait pas 2 contre 1 avec du blanc.
 * Plutôt que de choisir la couleur du texte selon la luminance de onze teintes,
 * on prend le parti qui marche pour toutes, et qui est déjà celui des pastilles
 * de qualité ailleurs dans l'application.
 */
function VerdictDeCase({
  verdict,
  orientation,
}: {
  verdict: { square: Square; quality: MoveQuality }
  orientation: Color
}) {
  const style = QUALITY_STYLES[verdict.quality]
  const teinte = `var(--q-${style.token})`
  const boite = percentBox(verdict.square, orientation)

  return (
    <>
      <div
        className="absolute"
        style={{ ...boite, background: `color-mix(in oklab, ${teinte} 18%, transparent)` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute" style={boite} aria-hidden>
        <span
          className="animate-piece-drop absolute -right-[14%] -top-[14%] grid h-[48%] w-[48%] place-items-center rounded-full text-[min(2.6vw,0.95rem)] font-bold leading-none shadow-[var(--shadow-md)]"
          style={{ background: '#fff', color: teinte, boxShadow: `0 0 0 2px ${teinte}` }}
          title={`${style.label.fr} — ${style.description.fr}`}
        >
          {style.glyph}
        </span>
      </div>
    </>
  )
}

function SquareOverlay({
  square,
  orientation,
  color,
  ring,
  pulse,
}: {
  square: Square
  orientation: Color
  color: string
  ring?: boolean
  pulse?: boolean
}) {
  return (
    <div
      className={clsx('absolute', pulse && 'animate-[pulse-ring_1.8s_ease-in-out_infinite]')}
      style={{
        ...percentBox(square, orientation),
        background: ring ? 'transparent' : color,
        boxShadow: ring ? `inset 0 0 0 3px ${color}` : undefined,
      }}
    />
  )
}

function Coordinates({
  orientation,
  skin,
}: {
  orientation: Color
  skin: (typeof BOARD_SKINS)[keyof typeof BOARD_SKINS]
}) {
  // Capitales pour les colonnes, et seulement pour l'affichage : la notation
  // reste en minuscules partout ailleurs — `lib/board/types.ts` engendre les
  // cases, `chess.js` lit et écrit les coups. Ce qui change ici est le repère
  // imprimé sur le plateau, pas le nom de la case.
  const files = orientation === 'w' ? 'ABCDEFGH' : 'HGFEDCBA'
  const ranks = orientation === 'w' ? '87654321' : '12345678'

  return (
    /*
      La taille suit celle du plateau — 2,2 % de sa largeur — au lieu d'être
      plafonnée à onze pixels. Ce plafond était l'erreur : il convenait sur un
      téléphone et rendait les repères minuscules sur un écran d'ordinateur,
      précisément là où l'échiquier est grand et où l'on a le plus de mal à
      situer une case citée par le coach.

      Les bornes ne servent plus qu'aux extrêmes : lisible sur une miniature,
      jamais démesuré en plein écran.
    */
    <div className="pointer-events-none absolute inset-0 z-[15] text-[clamp(9px,2.2cqw,22px)] font-bold leading-none">
      {[...ranks].map((rank, index) => (
        <span
          key={rank}
          className="absolute left-[0.45cqw]"
          style={{
            top: `${index * 12.5 + 0.5}%`,
            color: index % 2 === 0 ? skin.coordLight : skin.coordDark,
          }}
        >
          {rank}
        </span>
      ))}
      {[...files].map((file, index) => (
        <span
          key={file}
          className="absolute bottom-[0.45cqw]"
          style={{
            // Calé sur le bord droit de la case, comme dans les diagrammes
            // imprimés : le chiffre en haut à gauche, la lettre en bas à droite,
            // sans jamais se gêner l'un l'autre.
            left: `${index * 12.5 + 12.5}%`,
            transform: 'translateX(calc(-100% - 0.45cqw))',
            color: index % 2 === 0 ? skin.coordDark : skin.coordLight,
          }}
        >
          {file}
        </span>
      ))}
    </div>
  )
}

/**
 * Couche SVG des annotations.
 *
 * Un seul SVG en coordonnées 0–100 superposé au plateau : il se redimensionne
 * avec lui sans le moindre calcul en JavaScript.
 */
function AnnotationLayer({
  arrows,
  circles,
  draft,
  orientation,
  onArrowClick,
}: {
  arrows: Arrow[]
  circles: CircleMark[]
  draft: AnnotationDraft | null
  orientation: Color
  /** Rend les flèches cliquables — pour demander « pourquoi ce coup ? ». */
  onArrowClick?: (arrow: Arrow) => void
}) {
  const drafted: Arrow | null =
    draft?.to && draft.to !== draft.from
      ? { from: draft.from, to: draft.to, color: draft.color }
      : null
  const draftCircle: CircleMark | null =
    draft && !draft.to ? { square: draft.from, color: draft.color } : null

  const visibleArrows = drafted ? [...arrows, drafted] : arrows
  const visibleCircles = draftCircle ? [...circles, draftCircle] : circles

  if (visibleArrows.length === 0 && visibleCircles.length === 0) return null

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-40 h-full w-full"
    >
      <defs>
        {(Object.keys(ANNOTATION_COLORS) as AnnotationColor[]).map((name) => (
          <marker
            key={name}
            id={`arrowhead-${name}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="3.2"
            markerHeight="3.2"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={ANNOTATION_COLORS[name]} />
          </marker>
        ))}
      </defs>

      {visibleCircles.map((circle) => {
        const centre = squareCentre(circle.square, orientation)
        return (
          <circle
            key={`c-${circle.square}-${circle.color}`}
            cx={centre.x}
            cy={centre.y}
            r={5.3}
            fill="none"
            stroke={ANNOTATION_COLORS[circle.color]}
            strokeWidth={0.9}
            opacity={0.85}
          />
        )
      })}

      {visibleArrows.map((arrow, index) => {
        const { path } = arrowPath(arrow.from, arrow.to, orientation)
        const width = arrow.weight === 'thin' ? 1.1 : arrow.weight === 'bold' ? 2.4 : 1.7
        const clickable = Boolean(onArrowClick) && arrow !== drafted

        const line = (
          <path
            d={path}
            fill="none"
            stroke={ANNOTATION_COLORS[arrow.color]}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#arrowhead-${arrow.color})`}
            opacity={0.82}
          />
        )

        if (!clickable) {
          return <g key={`a-${arrow.from}-${arrow.to}-${index}`}>{line}</g>
        }

        return (
          <g
            key={`a-${arrow.from}-${arrow.to}-${index}`}
            // Le trait visible est fin ; on lui superpose une zone de clic plus
            // large et invisible, sinon viser une flèche à la souris relève de
            // l'adresse plutôt que de l'intention.
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={(event) => {
              event.stopPropagation()
              onArrowClick?.(arrow)
            }}
            role="button"
            tabIndex={-1}
            aria-label={`Explication du coup ${arrow.from}${arrow.to}`}
          >
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(width, 4)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {line}
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aides
// ─────────────────────────────────────────────────────────────────────────────

function shift(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square
}

/** Retracer la même flèche l'efface — c'est le comportement attendu. */
function toggleArrow(current: Arrow[], arrow: Arrow): Arrow[] {
  const index = current.findIndex((a) => a.from === arrow.from && a.to === arrow.to)
  if (index === -1) return [...current, arrow]
  if (current[index]!.color === arrow.color) {
    return current.filter((_, i) => i !== index)
  }
  const next = [...current]
  next[index] = arrow
  return next
}

function toggleCircle(current: CircleMark[], circle: CircleMark): CircleMark[] {
  const index = current.findIndex((c) => c.square === circle.square)
  if (index === -1) return [...current, circle]
  if (current[index]!.color === circle.color) {
    return current.filter((_, i) => i !== index)
  }
  const next = [...current]
  next[index] = circle
  return next
}
