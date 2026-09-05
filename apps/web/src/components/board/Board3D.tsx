'use client'

/**
 * Échiquier 3D.
 *
 * Même contrat que la vue 2D — mêmes propriétés, mêmes rappels — pour qu'on
 * puisse basculer de l'une à l'autre en pleine partie sans rien réinitialiser.
 *
 * Choix techniques :
 *  - **Aucune ressource externe.** Pas d'environnement HDR téléchargé : la
 *    lumière vient de trois sources placées à la main et d'un dégradé de fond.
 *    L'application reste donc entièrement auto-hébergeable — ce qui n'est pas
 *    la même chose que de fonctionner hors ligne, qu'elle ne fait pas.
 *  - **Les pièces glissent, elles ne sautent pas.** Chaque déplacement est
 *    interpolé, avec un léger arc pour le cavalier — qui saute vraiment.
 *  - **La caméra reste dressée.** L'orbite est bridée : on ne peut ni passer
 *    sous le plateau ni le regarder à plat, deux angles où l'on ne joue plus.
 */

import { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { MATERIALS, pieceGeometry, type Piece3DType } from './pieceGeometry.ts'
import {
  BOARD_SKINS,
  isLightSquare,
  orderedSquares,
  piecesFromFen,
  reconduireIdentites,
  type BoardPiece,
} from './boardKit.ts'
import { PromotionPicker } from './PromotionPicker.tsx'
import { resolvePieceColours, usePreferencesDe } from '@/lib/store/preferences.ts'
import type { Board2DProps } from './Board2D.tsx'

/**
 * Demi-largeur du plateau, cadre compris.
 *
 * Le damier fait 8 unités, le cadre déborde de 0,7 de chaque côté : 9,4 au
 * total, donc 4,7 de demi-largeur.
 */
const BOARD_HALF_WIDTH = 4.7

/** Marge autour du plateau, pour qu'il ne touche pas les bords du cadre. */
const FIT_MARGIN = 1.14

/** Ouverture verticale de la caméra, en degrés. */
const CAMERA_FOV = 42

/** Élévation de la caméra au-dessus de l'horizon, en degrés. */
const CAMERA_ELEVATION = 48

/**
 * Position de caméra qui fait tenir le plateau entier dans l'image.
 *
 * On calcule la distance nécessaire à partir de l'ouverture de l'objectif
 * plutôt que de la régler à vue : `distance = demi-largeur / tan(fov / 2)`.
 * Le canevas étant carré, l'ouverture horizontale égale la verticale, et un
 * seul calcul suffit pour les deux axes.
 */
function fittedCameraPosition(): [number, number, number] {
  const half = BOARD_HALF_WIDTH * FIT_MARGIN
  const distance = half / Math.tan((CAMERA_FOV * Math.PI) / 360)
  const elevation = (CAMERA_ELEVATION * Math.PI) / 180
  return [0, distance * Math.sin(elevation), distance * Math.cos(elevation)]
}

/** Convertit une case en coordonnées monde, plateau centré sur l'origine. */
function squareToWorld(square: Square, orientation: Color): [number, number] {
  const file = square.charCodeAt(0) - 97
  const rank = square.charCodeAt(1) - 49
  const x = orientation === 'w' ? file - 3.5 : 3.5 - file
  const z = orientation === 'w' ? 3.5 - rank : rank - 3.5
  return [x, z]
}

/*
  Mémoïsé, comme la vue 2D : la page de partie se re-rend à chaque seconde de
  pendule, et sans cela le plateau suivait — soixante-quatre cases et
  trente-deux pièces réconciliées, puis une image dessinée pour rien. Les
  propriétés que la page transmet sont stables tant que la position ne change
  pas ; c'est ce qui rend la mémoïsation efficace.
*/
export const Board3D = memo(function Board3D(props: Board2DProps) {
  // Trois réglages nommés, et non tout le store — voir `usePreferencesDe`.
  const prefs = usePreferencesDe('effects', 'pieceSet', 'set')
  const {
    fen,
    orientation = 'w',
    playable = null,
    legalMoves,
    onMove,
    lastMove,
    checkSquare,
    highlights = [],
    className,
  } = props

  const [selected, setSelected] = useState<Square | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: Color } | null>(
    null,
  )

  // Même appariement qu'en 2D : une pièce garde son identité d'une position à
  // l'autre, sans quoi React démonte l'ancienne et monte la nouvelle déjà en
  // place — et l'interpolation de `Piece3D` n'a jamais rien à faire glisser.
  const piecesPrecedentes = useRef<BoardPiece[]>([])
  const compteurIdentifiants = useRef(0)
  const pieces = useMemo(() => {
    const suivies = reconduireIdentites(
      piecesPrecedentes.current,
      piecesFromFen(fen),
      lastMove,
      () => `piece-${compteurIdentifiants.current++}`,
    )
    piecesPrecedentes.current = suivies
    return suivies
  }, [fen, lastMove])
  useEffect(() => setSelected(null), [fen])

  const targets = selected ? (legalMoves?.get(selected) ?? []) : []

  function handleSquareClick(square: Square) {
    const piece = pieces.find((p) => p.square === square)

    if (selected && targets.includes(square)) {
      const moving = pieces.find((p) => p.square === selected)
      const lastRank = moving?.color === 'w' ? '8' : '1'
      if (moving?.type === 'p' && square[1] === lastRank) {
        setPromotion({ from: selected, to: square, color: moving.color })
      } else {
        onMove?.(selected, square)
      }
      setSelected(null)
      return
    }

    if (!piece) {
      setSelected(null)
      return
    }
    const allowed = playable === 'both' || (playable !== null && piece.color === playable)
    setSelected(allowed ? square : null)
  }

  /**
   * Qualité de rendu, bridée sur les petits écrans tactiles.
   *
   * Le niveau d'effets se déduit du nombre de cœurs, et un téléphone récent en
   * annonce huit : il héritait donc du rendu complet — ombres portées, ombres
   * de contact, anti-crénelage, deux pixels par point, et surtout des matériaux
   * à transmission sur trente-deux pièces, chacun coûtant une copie de la
   * scène. C'est ce qui fait rendre l'âme au processus graphique au bout de
   * quelques secondes : l'échiquier s'affiche, puis l'image se fige ou
   * disparaît. Ces machines ont des cœurs, pas de dissipateur.
   */
  const petitEcranTactile = useMobileGPU()
  const quality = prefs.effects === 'high' && !petitEcranTactile ? 'high' : 'low'

  /**
   * La netteté se règle à part des effets.
   *
   * Le bridage mobile coupait tout d'un bloc, y compris la densité de pixels,
   * ramenée à 1. Sur un téléphone dont l'écran en compte trois par point, un
   * échiquier de trois cent soixante points est alors rendu en 360 × 360 puis
   * étiré : les arêtes des pièces bavent, et c'est ce qu'on voit en premier —
   * bien avant l'absence d'ombres portées.
   *
   * Or ce n'est pas la densité qui faisait rendre l'âme aux appareils, ce sont
   * les matériaux à transmission et les ombres, chacun coûtant une passe de
   * scène entière. On rend donc la moitié du chemin : une densité de 1,5 —
   * 2,25 fois plus de pixels qu'avant, moitié moins qu'un rendu complet — et
   * l'on garde éteint tout ce qui multiplie les passes.
   *
   * Seulement pour qui a demandé « effets complets » : le réglage économe
   * reste franchement économe.
   */
  const densite = quality === 'high' ? 2 : prefs.effects === 'high' && petitEcranTactile ? 1.5 : 1

  /**
   * Le contexte WebGL peut être repris par le système.
   *
   * Sur téléphone, l'onglet qui passe en arrière-plan ou la mémoire qui manque
   * suffisent : le navigateur reprend le contexte et le canevas devient un
   * rectangle vide, définitivement. Sans rien pour le dire, on croit
   * l'application cassée — on voyait l'échiquier, et puis plus rien.
   */
  const [contextePerdu, setContextePerdu] = useState(false)
  /** Incrémenté pour remonter le canevas de zéro. */
  const [reprise, setReprise] = useState(0)

  /*
    Et il peut ne pas exister du tout.

    Un navigateur sans WebGL — accélération désactivée, pilote sur liste
    noire, mode économie d'énergie — faisait échouer la création du canevas
    en plein rendu : un écran vide, ou une page qui saute. On vérifie avant
    de monter quoi que ce soit, après montage pour ne pas diverger du rendu
    serveur, et l'on dit ce qui se passe avec la seule sortie utile.
  */
  const [webglAbsent, setWebglAbsent] = useState(false)
  useEffect(() => {
    const essai = document.createElement('canvas')
    const contexte = essai.getContext('webgl2') ?? essai.getContext('webgl')
    setWebglAbsent(!contexte)
  }, [])

  // Dimensions mesurées du conteneur, en pixels.
  //
  // React Three Fiber mesure normalement son parent tout seul, mais cette
  // mesure initiale se perd quand le composant est chargé de façon différée :
  // le canevas reste alors à sa taille par défaut de 300 × 150 jusqu'au premier
  // redimensionnement de la fenêtre. On mesure donc nous-mêmes et on impose des
  // dimensions en pixels — sans ambiguïté possible.
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      // En plein écran le conteneur n'est plus forcément carré : on prend la
      // plus petite dimension pour que le plateau tienne entier.
      const width = element.clientWidth
      const height = element.clientHeight
      const side = height > 0 ? Math.min(width, height) : width
      if (side > 0) setSize(side)
      return side > 0
    }

    /*
      On insiste, image par image, tant que la mesure est nulle.

      Le canevas n'est monté qu'une fois le conteneur mesuré. Quand l'échiquier
      apparaît après coup — le composant est chargé en différé, et sur une
      partie en ligne il attend d'abord la connexion — cette première mesure
      tombe avant la mise en page et rend zéro. L'observateur de taille, lui, ne
      rappelle que si la taille *change* ensuite : elle ne change pas, donc plus
      rien n'arrivait. On restait devant un emplacement vide jusqu'à ce qu'un
      redimensionnement de la fenêtre réveille tout — c'est-à-dire jamais sur un
      téléphone qu'on ne tourne pas.
    */
    let abandonne = false
    let essais = 0
    const insister = () => {
      if (abandonne || measure() || ++essais > 60) return
      requestAnimationFrame(insister)
    }
    insister()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      abandonne = true
      observer.disconnect()
    }
  }, [])

  /**
   * Réveille la mesure de React Three Fiber.
   *
   * R3F ne monte le contenu de la scène qu'une fois son conteneur mesuré. Quand
   * le composant est chargé de façon différée, cette mesure initiale se perd et
   * le canevas reste bloqué à sa taille par défaut de 300 × 150 — écran noir.
   *
   * Un événement `resize` le fait remesurer correctement, mais il faut que son
   * écouteur soit déjà attaché : émettre le signal trop tôt ne sert à rien. On
   * réessaie donc quelques fois, en s'arrêtant dès que le canevas a la bonne
   * taille — et de toute façon au bout d'une seconde.
   *
   * On juge sur la **mémoire de rendu** (`canvas.width`), pas sur la taille
   * d'affichage (`canvas.clientWidth`). Cette dernière, c'est nous qui
   * l'imposons en pixels : elle était donc juste dès la première vérification,
   * la relance s'arrêtait aussitôt et n'émettait jamais le moindre signal. La
   * mémoire de rendu, elle, n'est fixée que par le moteur — tant qu'elle est
   * restée à ses 300 × 150 par défaut, c'est que rien n'a été rendu.
   */
  useEffect(() => {
    if (size <= 0) return
    const container = containerRef.current
    if (!container) return

    const dpr = Math.min(window.devicePixelRatio || 1, densite)
    const attendu = Math.round(size * dpr)

    let attempts = 0
    const timer = setInterval(() => {
      const canvas = container.querySelector('canvas')
      if (canvas && Math.abs(canvas.width - attendu) <= 2) {
        clearInterval(timer)
        return
      }
      window.dispatchEvent(new Event('resize'))
      if (++attempts >= 10) clearInterval(timer)
    }, 100)

    return () => clearInterval(timer)
  }, [size, densite])

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square w-full overflow-hidden rounded-[var(--radius)] ${className ?? ''}`}
    >
      {size > 0 && !webglAbsent && (
        <Canvas
          key={reprise}
          style={{ width: size, height: size }}
          /*
          Rendu à la demande, et non soixante images par seconde en continu.

          Un échiquier immobile rendait en boucle : deux cent soixante appels
          de dessin par image, sans que rien ne bouge — c'est ce qui vidait la
          batterie et chauffait le téléphone. En mode « demand », le moteur ne
          dessine que lorsqu'on le lui demande : React Three Fiber le fait à
          chaque changement de propriété, les contrôles de caméra à chaque
          mouvement, et les pièces elles-mêmes tant qu'elles glissent — voir
          `Piece3D`.
        */
          frameloop="demand"
          shadows={quality === 'high'}
          dpr={[1, densite]}
          gl={{
            antialias: quality === 'high',
            // `high-performance` réclame la carte dédiée quand il y en a une ;
            // sur un téléphone il n'y en a qu'une, et l'exiger n'apporte rien
            // qu'un contexte plus vite refusé quand la mémoire manque.
            powerPreference: quality === 'high' ? 'high-performance' : 'default',
            alpha: true,
          }}
          onCreated={({ gl }) => {
            const toile = gl.domElement
            // `preventDefault` est ce qui autorise le navigateur à rendre le
            // contexte plus tard : sans lui, la perte est définitive.
            toile.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              setContextePerdu(true)
            })
            toile.addEventListener('webglcontextrestored', () => setContextePerdu(false))
          }}
          camera={{ position: fittedCameraPosition(), fov: CAMERA_FOV, near: 0.1, far: 80 }}
          // `offsetSize` mesure la boîte de disposition plutôt que le rectangle
          // de rendu, et l'anti-rebond désactivé évite de perdre la toute
          // première mesure — sans quoi le canevas resterait à sa taille par
          // défaut de 300 × 150 jusqu'au premier redimensionnement de fenêtre.
          resize={{ offsetSize: true, debounce: 0, scroll: false }}
        >
          <CanvasSizer size={size} />
          <Suspense fallback={null}>
            <Scene
              pieces={pieces}
              orientation={orientation}
              selected={selected}
              targets={targets}
              lastMove={lastMove ?? null}
              checkSquare={checkSquare ?? null}
              highlights={highlights}
              quality={quality}
              onSquareClick={handleSquareClick}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.55}
            // On ne peut pas s'approcher au point de perdre le plateau de vue,
            // ni s'éloigner au point de ne plus distinguer les pièces.
            minDistance={10}
            maxDistance={26}
            // Ni sous le plateau, ni complètement à plat : on doit voir pour jouer.
            minPolarAngle={0.18}
            maxPolarAngle={Math.PI / 2.35}
            target={[0, 0, 0]}
          />
        </Canvas>
      )}

      {webglAbsent && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--bg)]/92 p-6 text-center">
          <div>
            <p className="text-sm font-semibold">La vue 3D n’est pas disponible ici</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
              Ce navigateur n’offre pas l’accélération graphique dont elle a besoin. La vue 2D joue
              exactement la même partie.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => prefs.set('view', '2d')}
                className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
              >
                Passer en 2D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Un canevas vide n'explique rien. On dit ce qui s'est passé et on
          propose les deux seules sorties utiles : réessayer, ou jouer en 2D —
          qui ne demande aucun processeur graphique. */}
      {contextePerdu && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--bg)]/92 p-6 text-center">
          <div>
            <p className="text-sm font-semibold">La vue 3D s’est interrompue</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
              Ton appareil a repris la mémoire graphique. La partie continue : rien n’est perdu.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setContextePerdu(false)
                  setReprise((valeur) => valeur + 1)
                }}
                className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={() => prefs.set('view', '2d')}
                className="rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-surface-hover"
              >
                Revenir en 2D
              </button>
            </div>
          </div>
        </div>
      )}

      {promotion && (
        <PromotionPicker
          color={promotion.color}
          square={promotion.to}
          orientation={orientation}
          pieceSet={prefs.pieceSet}
          // La colonne d'arrivée n'existe pas en perspective : voir `centre`.
          centre
          onSelect={(type: PieceSymbol) => {
            onMove?.(promotion.from, promotion.to, type)
            setPromotion(null)
          }}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  )
})

/**
 * Sommes-nous sur un appareil à écran tactile étroit ?
 *
 * On ne se fie pas au nombre de cœurs : un téléphone de 2024 en annonce huit et
 * passerait pour une station de travail. La combinaison « pointeur grossier et
 * écran étroit » désigne exactement les machines dont le processeur graphique
 * est partagé, sans ventilation, et qui rendent la main au bout de quelques
 * secondes de rendu soutenu.
 */
function useMobileGPU(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse) and (max-width: 900px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}

/**
 * Impose la taille du rendu.
 *
 * React Three Fiber mesure normalement son conteneur tout seul, mais cette
 * mesure ne se déclenche pas de façon fiable quand le composant est chargé de
 * façon différée : le canevas reste alors à sa taille par défaut de 300 × 150.
 *
 * Plutôt que de dépendre de ce comportement, on mesure le conteneur nous-mêmes
 * — dans le composant parent — et on transmet la taille au moteur de rendu par
 * l'API impérative prévue à cet effet. C'est déterministe et ça ne coûte qu'un
 * effet par redimensionnement.
 */
function CanvasSizer({ size }: { size: number }) {
  const setSize = useThree((state) => state.setSize)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (size <= 0) return
    setSize(size, size)
    // Le plateau est carré : le rapport d'aspect vaut toujours 1, mais la
    // caméra doit être prévenue explicitement après un changement de taille.
    if ('aspect' in camera) {
      ;(camera as THREE.PerspectiveCamera).aspect = 1
      camera.updateProjectionMatrix()
    }
  }, [size, setSize, camera])

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scène
// ─────────────────────────────────────────────────────────────────────────────

interface SceneProps {
  pieces: BoardPiece[]
  orientation: Color
  selected: Square | null
  targets: Square[]
  lastMove: { from: Square; to: Square } | null
  checkSquare: Square | null
  highlights: Square[]
  quality: 'high' | 'low'
  onSquareClick: (square: Square) => void
}

function Scene({
  pieces,
  orientation,
  selected,
  targets,
  lastMove,
  checkSquare,
  highlights,
  quality,
  onSquareClick,
}: SceneProps) {
  const prefs = usePreferencesDe('boardStyle', 'pieceMaterial')
  const skin = BOARD_SKINS[prefs.boardStyle] ?? BOARD_SKINS.aurore
  const squares = useMemo(() => orderedSquares('w'), [])
  const { scene } = useThree()

  // Fond dégradé, engendré une fois en mémoire : pas de fichier à charger.
  useEffect(() => {
    scene.background = makeGradientTexture(skin.dark, skin.light)
    return () => {
      const background = scene.background
      if (background instanceof THREE.Texture) background.dispose()
      scene.background = null
    }
  }, [scene, skin.dark, skin.light])

  const targetSet = useMemo(() => new Set(targets), [targets])
  const highlightSet = useMemo(() => new Set(highlights), [highlights])

  return (
    <group>
      {/* ── Lumières ──────────────────────────────────────────────────────
          Clé chaude en haut à gauche, remplissage froid à droite, contre-jour
          derrière : le schéma classique qui fait ressortir les volumes. */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={2.1}
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-6, 5, -3]} intensity={0.7} color="#9fd0ff" />
      <pointLight position={[0, 4, -7]} intensity={18} distance={18} color="#ffd9a0" />

      {/* ── Cadre du plateau ──────────────────────────────────────────── */}
      <RoundedBox
        args={[9.4, 0.4, 9.4]}
        radius={0.12}
        smoothness={4}
        position={[0, -0.24, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial color={skin.dark} roughness={0.55} metalness={0.15} clearcoat={0.4} />
      </RoundedBox>

      {/* ── Cases ─────────────────────────────────────────────────────── */}
      {squares.map((square) => {
        const [x, z] = squareToWorld(square, orientation)
        const light = isLightSquare(square)
        const isLast = lastMove?.from === square || lastMove?.to === square
        const isTarget = targetSet.has(square)
        const isSelected = selected === square
        const isHighlight = highlightSet.has(square)
        const isCheck = checkSquare === square

        const emissive = isCheck
          ? skin.check
          : isSelected
            ? skin.selected
            : isHighlight
              ? '#7c5cff'
              : isLast
                ? skin.lastMove
                : null

        return (
          <group key={square}>
            <mesh
              position={[x, -0.02, z]}
              receiveShadow
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation()
                onSquareClick(square)
              }}
            >
              <boxGeometry args={[1, 0.08, 1]} />
              <meshPhysicalMaterial
                color={light ? skin.light : skin.dark}
                roughness={light ? 0.45 : 0.55}
                metalness={0.05}
                clearcoat={quality === 'high' ? 0.35 : 0}
                emissive={emissive ?? '#000000'}
                emissiveIntensity={emissive ? 0.55 : 0}
              />
            </mesh>

            {/* Pastille de coup légal, flottant juste au-dessus de la case. */}
            {isTarget && (
              <mesh position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.16, 0.24, 24]} />
                <meshBasicMaterial
                  color={skin.selected}
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        )
      })}

      {/* ── Pièces ────────────────────────────────────────────────────── */}
      {/* La clé sur l'orientation remonte toutes les pièces quand on retourne
          le plateau : elles ne doivent pas le traverser en glissant. */}
      <group key={orientation}>
        {pieces.map((piece) => (
          <Piece3D
            key={piece.id}
            piece={piece}
            orientation={orientation}
            quality={quality}
            selected={selected === piece.square}
            material={prefs.pieceMaterial}
            onClick={() => onSquareClick(piece.square)}
          />
        ))}
      </group>

      {/* Ombre de contact : ce qui « pose » vraiment les pièces sur le bois. */}
      {quality === 'high' && (
        <ContactShadows
          position={[0, 0.03, 0]}
          opacity={0.42}
          scale={11}
          blur={2.4}
          far={2.2}
          resolution={512}
        />
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pièce animée
// ─────────────────────────────────────────────────────────────────────────────

function Piece3D({
  piece,
  orientation,
  quality,
  selected,
  material,
  onClick,
}: {
  piece: BoardPiece
  orientation: Color
  quality: 'high' | 'low'
  selected: boolean
  material: string
  onClick: () => void
}) {
  // Les trois derniers ne sont pas lus ici mais par `resolvePieceColours`,
  // plus bas : une lecture indirecte reste une lecture.
  const prefs = usePreferencesDe(
    'boardStyle',
    'animationMs',
    'pieceColours',
    'pieceWhiteCustom',
    'pieceBlackCustom',
  )
  const invalidate = useThree((state) => state.invalidate)
  const groupRef = useRef<THREE.Group>(null)
  const [x, z] = squareToWorld(piece.square, orientation)
  const target = useRef(new THREE.Vector3(x, 0.02, z))
  const [hovered, setHovered] = useState(false)

  const skin = BOARD_SKINS[prefs.boardStyle] ?? BOARD_SKINS.aurore
  const recipe = MATERIALS[material] ?? MATERIALS.ivoire!
  const geometry = useMemo(
    () => pieceGeometry(piece.type as Piece3DType, quality),
    [piece.type, quality],
  )

  target.current.set(x, 0.02, z)

  // La position n'est posée qu'au montage : ensuite, c'est l'interpolation qui
  // conduit la pièce. Passée en propriété, React Three Fiber la réappliquerait
  // à chaque changement de case, et la pièce sauterait au lieu de glisser.
  const posee = useRef(false)
  useLayoutEffect(() => {
    if (posee.current) return
    posee.current = true
    groupRef.current?.position.set(x, 0.02, z)
  }, [x, z])

  // Interpolation vers la case cible : c'est ce qui fait glisser la pièce
  // plutôt que de la téléporter, sans avoir à orchestrer d'animation.
  //
  // Le rendu étant à la demande, c'est la pièce qui réclame l'image suivante
  // tant qu'elle n'est pas arrivée — et se tait dès qu'elle est posée. Une
  // interpolation ne « finit » jamais tout à fait : on la coupe au millième,
  // invisible à l'écran, sans quoi le plateau rendrait indéfiniment.
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const speed = prefs.animationMs === 0 ? 1 : Math.min(1, delta * 11)
    group.position.lerp(target.current, speed)

    // Lévitation discrète de la pièce sélectionnée.
    const lift = selected ? 0.22 : hovered ? 0.06 : 0
    const hauteur = 0.02 + lift
    group.position.y += (hauteur - group.position.y) * Math.min(1, delta * 12)

    // La rotation continue de la pièce choisie est réservée au rendu complet :
    // sur un téléphone, elle maintiendrait le moteur en marche tant que la
    // pièce est sélectionnée.
    const tourne = selected && quality === 'high'
    if (tourne) {
      group.rotation.y += delta * 0.7
    } else {
      group.rotation.y += (0 - group.rotation.y) * Math.min(1, delta * 6)
    }

    const posee =
      Math.abs(group.position.x - target.current.x) < 0.001 &&
      Math.abs(group.position.z - target.current.z) < 0.001 &&
      Math.abs(group.position.y - hauteur) < 0.001 &&
      (tourne || Math.abs(group.rotation.y) < 0.001)
    if (!posee) {
      invalidate()
    } else {
      // On pose exactement, pour que la comparaison suivante soit franche.
      group.position.set(target.current.x, hauteur, target.current.z)
      if (!tourne) group.rotation.y = 0
    }
    if (tourne) invalidate()
  })

  const isWhite = piece.color === 'w'
  // Les couleurs de pièces sont indépendantes du damier : un thème violet ne
  // doit pas rendre les Noirs violets.
  const palette = resolvePieceColours(prefs, skin.light, skin.dark)
  const colour = isWhite ? palette.white : palette.black

  return (
    <group
      ref={groupRef}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onClick()
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      {/* Les Noirs regardent dans l'autre sens — visible surtout au cavalier. */}
      <mesh
        geometry={geometry}
        castShadow={quality === 'high'}
        receiveShadow={quality === 'high'}
        rotation={[0, isWhite ? 0 : Math.PI, 0]}
      >
        <meshPhysicalMaterial
          color={colour}
          roughness={recipe.roughness}
          metalness={recipe.metalness}
          clearcoat={quality === 'high' ? recipe.clearcoat : 0}
          clearcoatRoughness={recipe.clearcoatRoughness}
          transmission={quality === 'high' ? recipe.transmission : 0}
          ior={recipe.ior}
          thickness={recipe.thickness}
          sheen={quality === 'high' ? recipe.sheen : 0}
          sheenColor={isWhite ? '#ffe9c9' : '#7f8cff'}
          emissive={selected ? skin.selected : '#000000'}
          emissiveIntensity={selected ? 0.22 : 0}
        />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fond
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dégradé vertical peint dans un canevas hors écran et transformé en texture.
 * Deux cents octets en mémoire, aucun aller-retour réseau.
 */
function makeGradientTexture(top: string, bottom: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, shade(top, -0.55))
  gradient.addColorStop(0.55, shade(top, -0.75))
  gradient.addColorStop(1, shade(bottom, -0.88))
  context.fillStyle = gradient
  context.fillRect(0, 0, 4, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Éclaircit (`amount > 0`) ou assombrit (`amount < 0`) une couleur. */
function shade(colour: string, amount: number): string {
  const c = new THREE.Color(colour)
  if (amount < 0) c.multiplyScalar(1 + amount)
  else c.lerp(new THREE.Color('#ffffff'), amount)
  return `#${c.getHexString()}`
}
