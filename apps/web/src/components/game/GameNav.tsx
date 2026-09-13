'use client'

/**
 * Navigation dans une partie : début, précédent, lecture, suivant, fin.
 *
 * Ces boutons existaient déjà, mais au bas de la liste des coups — c'est-à-dire
 * tout en bas à droite, hors du champ de vision de qui regarde l'échiquier, et
 * souvent hors de l'écran. On les place ici sous le plateau, là où le regard
 * est.
 *
 * Ils ne changent jamais la partie : reculer n'annule rien.
 */

import { useEffect, useRef } from 'react'
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Pause,
  Play,
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useT } from '@/lib/i18n/index.tsx'

// ─────────────────────────────────────────────────────────────────────────────
//  Les flèches du clavier, écoutées une seule fois par page
// ─────────────────────────────────────────────────────────────────────────────

/** Reçoit la touche ; répond vrai s'il l'a prise, et elle est alors consommée. */
type GestionnaireClavier = (event: KeyboardEvent) => boolean

/**
 * Les écouteurs inscrits, dans l'ordre de montage. Seul le **dernier** reçoit
 * la touche.
 *
 * `GameNav` et `MoveList` écoutaient chacun `keydown` sur la fenêtre. Sur un
 * écran de partie où les deux sont montés — la liste avec ses commandes sous
 * `lg`, les flèches sous le plateau —, une flèche avançait de deux coups, et
 * deux `preventDefault` partaient pour une touche. Un seul écouteur global,
 * un seul gestionnaire servi, un seul `preventDefault` : ici.
 */
const inscrits: Array<{ current: GestionnaireClavier }> = []

/**
 * On laisse les champs de saisie tranquilles, et les raccourcis système
 * intacts. Ctrl+Maj+C est le seul raccourci à modificateur qu'on laisse
 * passer — la copie de la position ; tous les autres appartiennent au
 * navigateur et au système. La cible n'est pas toujours un élément : une
 * touche pressée sans rien de focalisé vise `document`, qui n'a pas `closest`.
 */
function surToucheGlobale(event: KeyboardEvent): void {
  const dernier = inscrits[inscrits.length - 1]
  if (!dernier) return
  const copieDeLaPosition = (event.ctrlKey || event.metaKey) && event.shiftKey
  if ((event.metaKey || event.ctrlKey || event.altKey) && !copieDeLaPosition) return
  const target = event.target
  if (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable="true"]')
  ) {
    return
  }
  if (dernier.current(event)) event.preventDefault()
}

/**
 * Inscrit un gestionnaire des flèches tant que `actif` est vrai.
 *
 * Le gestionnaire est lu à travers une référence, mise à jour à chaque rendu :
 * l'inscription se fait au montage et ne bouge plus, si bien que l'ordre —
 * donc qui reçoit la touche — ne dépend que de l'ordre de montage, jamais du
 * coup courant.
 */
export function useNavigationClavier(actif: boolean, gestionnaire: GestionnaireClavier): void {
  const reference = useRef(gestionnaire)
  reference.current = gestionnaire

  useEffect(() => {
    if (!actif) return
    inscrits.push(reference)
    if (inscrits.length === 1) window.addEventListener('keydown', surToucheGlobale)
    return () => {
      const index = inscrits.indexOf(reference)
      if (index >= 0) inscrits.splice(index, 1)
      if (inscrits.length === 0) window.removeEventListener('keydown', surToucheGlobale)
    }
  }, [actif])
}

export interface GameNavProps {
  /** Demi-coup affiché. `-1` = position de départ. */
  cursor: number
  /** Nombre de demi-coups joués. */
  count: number
  onSeek: (index: number) => void
  /** Défilement automatique — omis, le bouton lecture ne s'affiche pas. */
  autoplay?: boolean
  onToggleAutoplay?: () => void
  /**
   * Borne basse du curseur.
   *
   * L'analyse commente un coup : elle n'a rien à dire avant le premier, et
   * s'arrête donc à `0`. Une partie en cours, elle, sait montrer l'échiquier
   * initial, où le curseur vaut `-1`.
   */
  min?: number
  /**
   * Position **affichée**, à copier.
   *
   * Affichée et non réelle : quand on remonte dans la liste des coups, c'est
   * la position qu'on a sous les yeux qu'on veut poser ailleurs, pas celle où
   * la partie en est. C'est d'ailleurs le geste principal — on recule jusqu'à
   * l'endroit qui pose question, puis on copie.
   *
   * Omise, le bouton ne s'affiche pas : l'éditeur montre déjà la position en
   * clair, il n'a pas besoin d'un second chemin.
   */
  fen?: string | null
  className?: string
}

export function GameNav({
  cursor,
  count,
  onSeek,
  autoplay,
  onToggleAutoplay,
  min = -1,
  fen,
  className,
}: GameNavProps) {
  const t = useT()
  const last = count - 1
  const atStart = cursor <= min
  const atEnd = cursor >= last

  // Les flèches du clavier sont le réflexe acquis partout ailleurs. Les
  // gardes — champs de saisie, modificateurs — sont dans l'écouteur commun.
  useNavigationClavier(true, (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        onSeek(Math.max(min, cursor - 1))
        return true
      case 'ArrowRight':
        onSeek(Math.min(last, cursor + 1))
        return true
      case 'Home':
        onSeek(min)
        return true
      case 'End':
        onSeek(last)
        return true
      // Ctrl+Maj+C : le raccourci de copie enrichi, qui ne prend la place
      // d'aucun raccourci du navigateur — Ctrl+C copie la sélection, et
      // c'est très bien ainsi.
      case 'C':
        if (!fen || !event.shiftKey) return false
        void copierLaPosition(fen, t)
        return true
      default:
        return false
    }
  })

  return (
    /*
      Une pastille, et non quatre carrés dans un cadre.

      Le rang gardait le dessin d'un champ de formulaire — coins droits,
      contour d'un pixel, boutons de vingt-huit points collés bord à bord — au
      milieu d'un écran d'analyse où tout le reste est arrondi : la bascule 2D /
      3D, les puces, les cartes. Il se lisait comme un vestige, et sa commande la
      plus utile — la lecture, qui déroule la partie toute seule — n'y avait pas
      plus de poids qu'une flèche.

      La barre reprend donc la même pilule que la bascule de vue, avec laquelle
      elle voisine, et la lecture y prend le centre : disque plein aux couleurs
      d'accent, la seule marque de cette intensité dans la rangée. On sait d'un
      coup d'œil où appuyer, et l'on voit sans lire si ça défile.
    */
    <div
      className={clsx(
        'flex w-fit items-center gap-0.5 rounded-full p-1',
        'popover !rounded-full shadow-[var(--shadow)]',
        className,
      )}
      role="group"
      aria-label={t('moves.reviewGroup')}
    >
      <SeekButton onClick={() => onSeek(min)} disabled={atStart} label={t('moves.firstMove')}>
        <ChevronFirst size={16} aria-hidden />
      </SeekButton>
      <SeekButton
        onClick={() => onSeek(cursor - 1)}
        disabled={atStart}
        label={t('moves.previousArrow')}
      >
        <ChevronLeft size={16} aria-hidden />
      </SeekButton>
      {onToggleAutoplay && (
        <button
          type="button"
          onClick={onToggleAutoplay}
          aria-pressed={autoplay}
          title={t(autoplay ? 'moves.stopPlayback' : 'moves.playThroughLong')}
          aria-label={t(autoplay ? 'moves.stopPlayback' : 'moves.playThroughLong')}
          className={clsx(
            'mx-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all pointer-coarse:h-11 pointer-coarse:w-11',
            autoplay
              ? 'bg-accent text-[var(--accent-contrast)] shadow-[var(--glow)]'
              : 'bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent hover:bg-[color-mix(in_oklab,var(--accent)_28%,transparent)]',
          )}
        >
          {/* Le triangle est décentré par sa propre géométrie : le rempli
              pousse la masse à gauche du carré qui le contient. On le décale
              d'un point pour qu'il paraisse au milieu du disque. */}
          {autoplay ? (
            <Pause size={15} aria-hidden fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={15} aria-hidden fill="currentColor" strokeWidth={0} className="ml-px" />
          )}
        </button>
      )}
      <SeekButton onClick={() => onSeek(cursor + 1)} disabled={atEnd} label={t('moves.nextArrow')}>
        <ChevronRight size={16} aria-hidden />
      </SeekButton>
      <SeekButton onClick={() => onSeek(last)} disabled={atEnd} label={t('moves.lastMove')}>
        <ChevronLast size={16} aria-hidden />
      </SeekButton>

      {fen && (
        <>
          {/* Un trait : copier n'est pas naviguer, et les deux ne doivent pas
              se confondre sous le doigt. */}
          <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
          <SeekButton onClick={() => void copierLaPosition(fen, t)} label={t('rest.copyPosition')}>
            <ClipboardCopy size={15} aria-hidden />
          </SeekButton>
        </>
      )}
    </div>
  )
}

/**
 * Copie une FEN dans le presse-papiers.
 *
 * La FEN est le premier geste quand on veut poser une question ailleurs — sur
 * un forum, dans un message, à un logiciel d'analyse. Elle n'était visible que
 * dans l'éditeur de position : depuis l'analyse ou une partie, il fallait la
 * reconstruire à la main.
 *
 * `navigator.clipboard` demande un contexte sécurisé et n'existe pas partout ;
 * l'échec se dit, plutôt que de laisser croire que c'est copié.
 */
async function copierLaPosition(fen: string, t: ReturnType<typeof useT>): Promise<void> {
  try {
    await navigator.clipboard.writeText(fen)
    toast.success(t('rest.positionCopied'), fen)
  } catch {
    toast.error(t('rest.copyFailed'), t('rest.clipboardRefused'))
  }
}

/**
 * Bouton de navigation.
 *
 * Volontairement discret : reculer d'un coup n'est pas une action de jeu, et
 * ces boutons voisinent avec « Abandonner ». Ce qu'il ne faut pas confondre,
 * c'est leur effet — d'où l'infobulle, qui nomme aussi la touche.
 */
function SeekButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-default disabled:text-faint/40 disabled:hover:bg-transparent pointer-coarse:h-11 pointer-coarse:w-11"
    >
      {children}
    </button>
  )
}
