'use client'

/**
 * Échiquier commutable.
 *
 * Expose une seule interface pour les deux rendus et permet d'alterner en
 * pleine partie. Le composant 3D n'est chargé que si on le demande : sans cela,
 * Three.js pèserait sur le premier affichage de chaque page, y compris pour les
 * joueurs qui ne quitteront jamais la 2D.
 *
 * Le plein écran est proposé pour les deux vues, mais il compte surtout en 3D :
 * la perspective réclame de la place, et sur un ordinateur portable l'échiquier
 * partage l'écran avec la liste des coups et le panneau du coach.
 *
 * Les deux boutons vivent sous le plateau, jamais dessus : posés dans le coin
 * haut-droit, ils masquaient les cases qui s'y trouvent — h8 vu des blancs, a1
 * vu des noirs — et, se trouvant au-dessus, captaient aussi le clic. La pièce
 * était donc à la fois invisible et injouable.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { Box, Grid2x2, Maximize2, Minimize2 } from 'lucide-react'
import clsx from 'clsx'
import { AnnonceDuCoup } from './AnnonceDuCoup.tsx'
import { Board2D, type Board2DProps } from './Board2D.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useT } from '@/lib/i18n/index.tsx'

/**
 * Le carré d'attente pendant que Three.js arrive.
 *
 * Composant nommé, et non fonction anonyme passée à `loading` : son texte
 * était écrit en français dans la fabrique de module, où `useT` — qui est un
 * crochet — n'a pas le droit d'être appelé. Nommé et rendu comme un composant,
 * il lit le dictionnaire comme le reste de l'écran.
 */
function Chargement3D() {
  const t = useT()
  return (
    <div className="grid aspect-square w-full place-items-center rounded-[var(--radius)] glass">
      <span className="text-sm text-muted">{t('parts.loading3d')}</span>
    </div>
  )
}

const Board3D = dynamic(() => import('./Board3D.tsx').then((m) => m.Board3D), {
  ssr: false,
  loading: Chargement3D,
})

export interface ChessBoardProps extends Board2DProps {
  /** Affiche les boutons de bascule 2D / 3D et de plein écran. */
  showViewToggle?: boolean
  /**
   * Place réservée au reste de la page, en `rem`.
   *
   * Un échiquier dimensionné sur la seule largeur devient, sur un écran large
   * et peu haut, plus grand que la fenêtre : on ne voit plus les pendules, la
   * barre d'actions ni les boutons sous le plateau. On lui donne donc aussi
   * une borne en hauteur, calculée sur ce que la page occupe autour de lui.
   *
   * Mesuré sur la page « contre l'ordinateur » : en-tête 57 px, marges 48 px,
   * bandeau adverse 56 px, bandeau joueur et barre d'actions 100 px — soit
   * 261 px, arrondis à 17 rem.
   *
   * En portrait sous `lg`, la valeur est relevée à 20 rem au moins, quoi
   * qu'en dise la page : voir le calcul de la largeur, plus bas.
   */
  reservedHeight?: number
  /**
   * Prendre la place que le parent laisse, plutôt que de l'estimer.
   *
   * À réserver aux pages dont la colonne a une hauteur imposée : le plateau se
   * cale alors sur ce qui reste réellement, si bien qu'un bandeau apparaissant
   * au-dessous le rétrécit d'autant au lieu de pousser les pendules et la barre
   * d'actions hors de l'écran.
   *
   * On mesure au lieu d'écrire `max-height: 100%` : un pourcentage ne se
   * résout que contre une hauteur définie, et celle d'un élément flexible ne
   * l'est pas — la règle était donc ignorée. La mesure ne vaut que si le
   * parent tient sa hauteur du partage flex et non de son contenu ; en
   * dessous de `lg`, où les colonnes s'empilent, ce n'est plus le cas et l'on
   * retombe sur la borne en `dvh` — voir la mesure elle-même.
   */
  fitParentHeight?: boolean
  /**
   * Notation du dernier coup joué, pour l'annoncer.
   *
   * `lastMove` ne porte que deux cases : de quoi flécher, pas de quoi dire
   * « cavalier f3 ». Les écrans qui connaissent la notation la passent ici ;
   * les autres — l'éditeur, la vision — n'annoncent rien, ce qui est correct
   * puisqu'il n'y a pas de partie en cours.
   */
  dernierCoupSan?: string | null
  /**
   * Le côté du plateau, chaque fois qu'il est mesuré.
   *
   * Les bandeaux des joueurs sont posés hors du plateau, dans leurs propres
   * zones de grille : pour qu'ils s'alignent sur ses bords plutôt que sur
   * ceux de la colonne, la page a besoin de connaître sa largeur réelle.
   * `null` quand le plateau se règle sur la largeur, et non sur la hauteur.
   */
  onFit?: (cote: number | null) => void
  /**
   * Où poser la bascule 2D / 3D / plein écran, quand ce n'est pas sous le plateau.
   *
   * Sous le plateau, la bascule prend une rangée de quarante pixels, retirée
   * au plateau lui-même. Les pages qui ont de la place en tête — le titre
   * d'un puzzle, l'en-tête de la colonne des coups — la reçoivent là : le
   * plateau la dessine dans cet élément par un portail, ce qui garde le bouton
   * de plein écran, qui a besoin du plateau pour agir.
   *
   * `null` signifie « ailleurs, mais pas encore monté » : la rangée sous le
   * plateau ne réapparaît pas entre-temps. `undefined` : sous le plateau.
   */
  emplacementBascule?: HTMLElement | null
}

/**
 * Taille en deçà de laquelle un échiquier ne s'utilise plus.
 *
 * Sur une fenêtre très basse, la borne en hauteur seule finirait par produire
 * un plateau de quelques centimètres : mieux vaut alors laisser la page
 * défiler que rendre les pièces incliquables.
 */
const MIN_BOARD_PX = 260

/**
 * Hauteur de la rangée des boutons, sous le plateau.
 *
 * Elle se retranche de la place disponible : sans cela, le plateau garderait sa
 * taille et la rangée déborderait de la colonne — ce qui repousserait hors de
 * l'écran la barre d'actions, exactement ce que `fitParentHeight` évite.
 *
 * 32 px de bouton, 2 px de gouttière et 6 px de marge haute — 44 px de bouton
 * au doigt, voir `ViewToggle`.
 */
const TOGGLE_ROW_PX = 40
const TOGGLE_ROW_TACTILE_PX = 52

/**
 * Mémoïsé, et il fallait qu'il le soit.
 *
 * `Board2D` et `Board3D` le sont depuis longtemps, ce qui ne servait à rien :
 * un parent qui se rend rend ses enfants, mémoïsés ou non, dès lors qu'il leur
 * passe une prop neuve — et celui-ci passait tout ce qu'il recevait. La
 * mémoïsation des plateaux ne s'appliquait donc jamais depuis les écrans de
 * jeu ; c'est ici qu'elle se gagne ou se perd.
 *
 * La comparaison reste superficielle : elle ne vaut que si l'appelant tient
 * ses props stables. Voir `verdictDuCoup` dans l'écran contre l'ordinateur,
 * qui était le contre-exemple.
 */
export const ChessBoard = memo(function ChessBoard({
  showViewToggle = true,
  reservedHeight = 17,
  fitParentHeight = false,
  dernierCoupSan,
  onFit,
  emplacementBascule,
  ...props
}: ChessBoardProps) {
  const view = usePreferences((state) => state.view)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [fitSide, setFitSide] = useState<number | null>(null)

  /*
    Le plein écran n'existe pas partout : Safari sur iPhone ne l'accorde qu'aux
    vidéos. Le bouton appelait `requestFullscreen`, avalait le refus, et ne
    faisait donc rien — sans un mot. On ne le propose que là où le document
    le permet, lu après montage pour ne pas diverger du rendu serveur.
  */
  const [pleinEcranPossible, setPleinEcranPossible] = useState(false)
  useEffect(() => {
    setPleinEcranPossible(Boolean(document.fullscreenEnabled))
  }, [])

  /**
   * Sur téléphone, la bascule ne prend pas de ligne à elle.
   *
   * Trois boutons de trente-deux pixels, alignés à droite, occupaient une
   * rangée entière sous l'échiquier : quarante points de haut dont neuf
   * dixièmes de vide, et autant retiré au plateau, qui est la seule chose
   * qu'on regarde. Sur un grand écran la place ne manque pas et la bascule
   * reste où elle est ; en dessous de `sm`, les écrans de partie la reprennent
   * dans leur barre d'actions, où elle voisine avec des boutons plutôt qu'avec
   * du vide.
   *
   * L'état est mesuré ici en JavaScript et non en CSS : la hauteur réservée
   * entre dans le calcul de la taille du plateau, qui est un style en ligne.
   */
  const [compact, setCompact] = useState(false)
  const [tactile, setTactile] = useState(false)
  useEffect(() => {
    // Étroit, ou bas : en paysage sur téléphone la hauteur est la ressource
    // rare, et la rangée de boutons prendrait un sixième du plateau. La barre
    // d'actions reprend alors la bascule, comme sous `sm`.
    const etroit = window.matchMedia(
      '(max-width: 639px), ((orientation: landscape) and (max-height: 540px))',
    )
    const doigt = window.matchMedia('(pointer: coarse)')
    const sync = () => {
      setCompact(etroit.matches)
      setTactile(doigt.matches)
    }
    sync()
    etroit.addEventListener('change', sync)
    doigt.addEventListener('change', sync)
    return () => {
      etroit.removeEventListener('change', sync)
      doigt.removeEventListener('change', sync)
    }
  }, [])

  const externe = emplacementBascule !== undefined
  const barreVisible = showViewToggle && !compact && !externe
  const toggleRow = barreVisible ? (tactile ? TOGGLE_ROW_TACTILE_PX : TOGGLE_ROW_PX) : 0

  useEffect(() => {
    if (!fitParentHeight) return
    const area = containerRef.current?.parentElement
    if (!area) return

    const colonne = containerRef.current
    const measure = () => {
      if (!colonne) return
      const style = getComputedStyle(area)
      const marges = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

      /*
        Le parent tient-il sa hauteur de la fenêtre, ou du plateau lui-même ?

        Au-dessus de `lg`, la grille de la page a une hauteur imposée et la
        colonne reçoit ce qui reste : la mesure est saine. En dessous, les
        colonnes s'empilent et le parent n'a d'autre hauteur que celle de son
        contenu — c'est-à-dire du plateau. Mesurer, c'était alors se mesurer
        soi-même : le plateau pouvait rétrécir, jamais regrandir, et un
        téléphone tourné en paysage puis remis en portrait gardait un
        échiquier de la taille du paysage.

        On retire donc le plateau du flux le temps d'une lecture. S'il ne
        reste rien, le parent n'impose rien, et l'on s'en remet à la borne en
        `dvh` du rendu. Tout se passe dans la même tâche, sans image
        intermédiaire, et l'observateur ne voit aucune taille changer.
      */
      const affichage = colonne.style.display
      colonne.style.display = 'none'
      const sansLePlateau = area.getBoundingClientRect().height - marges
      colonne.style.display = affichage

      if (sansLePlateau < MIN_BOARD_PX) {
        setFitSide(null)
        onFit?.(null)
        return
      }

      const box = area.getBoundingClientRect()
      const height = box.height - marges
      const cote = Math.floor(Math.min(box.width, height - toggleRow))
      setFitSide(cote)
      onFit?.(Math.max(MIN_BOARD_PX, cote))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    return () => observer.disconnect()
  }, [fitParentHeight, toggleRow, onFit])

  // L'utilisateur peut sortir du plein écran par la touche Échap sans passer
  // par notre bouton : on suit donc l'état réel du document.
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current
    if (!element) return

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Sortie refusée : l'état sera resynchronisé par l'événement.
      })
      return
    }
    void element.requestFullscreen?.().catch(() => {
      // Certains navigateurs mobiles refusent le plein écran sur un élément
      // quelconque. Ce n'est pas bloquant, on reste en affichage normal.
    })
  }, [])

  return (
    <div
      ref={containerRef}
      className={clsx('relative w-full', fullscreen && 'grid place-items-center bg-[var(--bg)]')}
      // En plein écran, le conteneur occupe tout l'écran et centre le plateau.
      style={fullscreen ? { width: '100dvw', height: '100dvh' } : undefined}
    >
      {/*
        Le plateau est toujours carré, et la rangée de boutons se cale sur sa
        largeur. En affichage normal la colonne prend toute la largeur
        disponible ; en plein écran on lui impose explicitement le côté du plus
        petit bord de l'écran.

        C'est indispensable : `aspect-square w-full` seul donnerait, sur un
        écran large, un carré aussi haut que l'écran est large — donc un plateau
        qui déborde très largement vers le bas.
      */}
      <div
        className="colonne-plateau flex flex-col"
        style={
          fullscreen
            ? {
                width: `min(100dvw - 1.5rem, 100dvh - 1.5rem - ${toggleRow}px)`,
              }
            : // `dvh` plutôt que `vh` : sur mobile, la barre d'adresse se
              // rétracte au défilement et `vh` reste figé sur la hauteur
              // maximale, ce qui redonne un plateau trop grand.
              //
              // La réserve demandée par la page passe par une variable, et non
              // directement dans le calcul : en portrait sous `lg`, la feuille
              // de style la relève à 20 rem au moins (`.colonne-plateau` dans
              // `globals.css`). Les écrans de partie demandent 9 rem — juste
              // pour le paysage, où le plateau ne partage la hauteur qu'avec
              // l'en-tête —, mais en portrait tout s'empile au-dessus et
              // au-dessous. Mesuré au navigateur à 360×640 : 132 px au-dessus
              // du plateau (en-tête, marge, bandeau adverse) et 187 px
              // au-dessous (bandeau joueur, ruban, barre du pouce), soit
              // 319 px sans les zones sûres, arrondis à 20 rem. Avec 9 rem, un
              // téléphone de 640 px de haut recevait un plateau de 496 px et
              // la barre du pouce sortait de l'écran.
              //
              // Le choix se fait en CSS plutôt qu'avec une requête média lue
              // en JavaScript : celle-ci vaut `false` avant montage, et le
              // plateau aurait sauté d'une taille à l'autre au chargement.
              //
              // Les zones sûres se retranchent aussi : l'en-tête grandit de
              // l'encoche et la barre du pouce de la barre de gestes, et un
              // plateau calé sur `100dvh` sans elles débordait d'autant.
              {
                ['--reserve-demandee' as string]: `${reservedHeight}rem`,
                width:
                  fitSide != null
                    ? `${Math.max(MIN_BOARD_PX, fitSide)}px`
                    : `min(100%, max(${MIN_BOARD_PX}px, calc(100dvh - var(--reserve-plateau, var(--reserve-demandee)) - ${toggleRow}px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))))`,
                marginInline: 'auto',
              }
        }
      >
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          {view === '3d' ? <Board3D {...props} /> : <Board2D {...props} />}
        </div>

        {/* Invisible, et c'est tout l'intérêt : voir `AnnonceDuCoup`. */}
        <AnnonceDuCoup san={dernierCoupSan} />

        {barreVisible && (
          <ViewToggle
            className="mt-1.5 self-end"
            fullscreen={fullscreen}
            onToggleFullscreen={pleinEcranPossible ? toggleFullscreen : undefined}
          />
        )}
        {externe &&
          showViewToggle &&
          emplacementBascule &&
          createPortal(
            <ViewToggle
              fullscreen={fullscreen}
              onToggleFullscreen={pleinEcranPossible ? toggleFullscreen : undefined}
            />,
            emplacementBascule,
          )}
      </div>
    </div>
  )
})

/**
 * Bascule 2D / 3D et plein écran.
 *
 * Volontairement gardée près de l'échiquier plutôt que reléguée dans les
 * préférences : c'est un choix qu'on refait souvent — la 3D pour admirer, la 2D
 * pour calculer. Près, mais pas dessus : un plateau n'a pas de marge, chaque
 * pixel du carré appartient à une case.
 *
 * Trente-deux pixels à la souris, quarante-quatre au doigt : c'est la taille
 * en deçà de laquelle on rate un bouton une fois sur cinq sur un téléphone.
 * Le dessin ne change pas, la pilule grandit avec ses boutons.
 */
export function ViewToggle({
  className,
  fullscreen,
  onToggleFullscreen,
}: {
  className?: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  const t = useT()
  const view = usePreferences((state) => state.view)
  const setPreference = usePreferences((state) => state.set)

  return (
    <div
      className={clsx(
        'flex w-fit gap-0.5 rounded-full p-0.5',
        'popover !rounded-full shadow-[var(--shadow)]',
        className,
      )}
      role="group"
      aria-label={t('game.switchView')}
    >
      {(
        [
          { id: '2d', icon: Grid2x2, label: t('game.view2D') },
          { id: '3d', icon: Box, label: t('game.view3D') },
        ] as const
      ).map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setPreference('view', id)}
          aria-pressed={view === id}
          title={label}
          className={clsx(
            'grid h-8 w-8 place-items-center rounded-full transition-all pointer-coarse:h-11 pointer-coarse:w-11',
            view === id
              ? 'bg-accent text-[var(--accent-contrast)] shadow-[var(--glow)]'
              : 'text-muted hover:text-ink hover:bg-surface-hover',
          )}
        >
          <Icon size={15} strokeWidth={2.2} aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}

      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-pressed={fullscreen}
          title={t(fullscreen ? 'misc.exitFullscreen' : 'misc.fullscreen')}
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-all hover:bg-surface-hover hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11"
        >
          {fullscreen ? (
            <Minimize2 size={15} strokeWidth={2.2} aria-hidden />
          ) : (
            <Maximize2 size={15} strokeWidth={2.2} aria-hidden />
          )}
          <span className="sr-only">
            {t(fullscreen ? 'misc.exitFullscreen' : 'misc.fullscreen')}
          </span>
        </button>
      )}
    </div>
  )
}
