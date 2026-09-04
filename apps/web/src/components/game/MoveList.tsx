'use client'

/**
 * Liste des coups.
 *
 * Deux colonnes, numérotées comme dans un livre — c'est la présentation que
 * tout joueur d'échecs sait lire. Chaque coup peut porter une pastille de
 * qualité issue de l'analyse.
 *
 * La liste défile automatiquement pour garder le coup courant visible, et se
 * pilote entièrement au clavier : flèches pour naviguer, Origine et Fin pour
 * les extrémités.
 */

import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { MoveQuality } from '@coupparfait/core'
import { QUALITY_STYLES, isNotableQuality } from '@coupparfait/core'
import { groupMoves, type PlayedMove } from '@/lib/game/useChessGame.ts'
import { useMoveWords, useSan } from '@/lib/notation.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

export interface MoveListProps {
  moves: PlayedMove[]
  cursor: number
  onSeek: (ply: number) => void
  /** Qualité de chaque demi-coup, si la partie a été analysée. */
  qualities?: Record<number, MoveQuality>
  startFen?: string
  className?: string
  /** Affiche la barre de navigation sous la liste. */
  controls?: boolean
  autoplay?: boolean
  onToggleAutoplay?: () => void
}

export function MoveList({
  moves,
  cursor,
  onSeek,
  qualities,
  startFen,
  className,
  controls = true,
  autoplay,
  onToggleAutoplay,
}: MoveListProps) {
  const locale = usePreferences((state) => state.locale)
  const format = useSan()
  const dire = useMoveWords()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  const rows = groupMoves(moves, startFen)

  /**
   * Le coup courant, écrit en français ordinaire.
   *
   * « ♕xd5+ » ne se lit pas : il faut savoir que le `x` est une prise et que le
   * `+` est un échec. L'application le savait déjà — chaque coup porte sa
   * traduction en attribut `title` —, mais un attribut `title` ne s'ouvre qu'au
   * survol, geste qui n'existe pas sur un téléphone. La notation restait donc
   * illisible précisément pour qui ne la connaît pas encore.
   *
   * Une ligne sous les commandes, qui suit le coup sélectionné : on lit
   * « la dame prend en d5, avec échec » en même temps qu'on voit « ♕xd5+ », et
   * la notation s'apprend toute seule, sans leçon.
   */
  const coupCourant = cursor >= 0 ? (moves[cursor] ?? null) : null

  /**
   * Garde le coup courant visible **dans la liste**, et seulement là.
   *
   * C'était un `scrollIntoView({ block: 'nearest' })`, qui a un défaut qu'on
   * ne voit pas en le lisant : il fait défiler *tous* les ancêtres scrollables
   * jusqu'au document. Sur grand écran la liste est un panneau à hauteur fixe
   * déjà entièrement visible, donc rien ne bougeait. Sur téléphone elle est
   * empilée sous l'échiquier — et à chaque coup joué, la page descendait d'elle
   * même pour la montrer. En mode commenté, où un coup succède à l'autre, on
   * passait la partie à remonter vers son propre échiquier.
   *
   * On calcule donc le décalage à la main et on ne touche qu'au `scrollTop` de
   * la boîte. Le document n'est jamais sollicité : c'est au joueur de décider
   * s'il veut aller voir la liste.
   *
   * `getBoundingClientRect` plutôt qu'`offsetTop` : ce dernier se mesure depuis
   * le premier ancêtre positionné, qui n'est pas forcément la boîte, et donnait
   * un décalage faux dès qu'on changeait l'habillage.
   */
  useEffect(() => {
    const boite = scrollRef.current
    const actif = activeRef.current
    if (!boite || !actif) return

    const cadre = boite.getBoundingClientRect()
    const coup = actif.getBoundingClientRect()

    if (coup.top < cadre.top) {
      boite.scrollTo({ top: boite.scrollTop - (cadre.top - coup.top), behavior: 'smooth' })
    } else if (coup.bottom > cadre.bottom) {
      boite.scrollTo({ top: boite.scrollTop + (coup.bottom - cadre.bottom), behavior: 'smooth' })
    }
  }, [cursor])

  // Navigation au clavier, active dès que la page a le focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // On ne détourne pas les flèches si l'utilisateur écrit quelque part.
      if (target && /input|textarea|select/i.test(target.tagName)) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          onSeek(Math.max(-1, cursor - 1))
          break
        case 'ArrowRight':
          event.preventDefault()
          onSeek(Math.min(moves.length - 1, cursor + 1))
          break
        case 'Home':
          event.preventDefault()
          onSeek(-1)
          break
        case 'End':
          event.preventDefault()
          onSeek(moves.length - 1)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cursor, moves.length, onSeek])

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      {/* Au-dessus de la liste, et non en dessous : posés en bas, ils
          finissaient sous la ligne de flottaison dès que la partie
          s’allongeait — c’est-à-dire exactement quand on en a besoin. */}
      {controls && (
        <div className="flex items-center justify-center gap-0.5 border-b border-line/60 p-1.5">
          <NavButton onClick={() => onSeek(-1)} disabled={cursor < 0} label="Début">
            <ChevronFirst size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(cursor - 1)}
            disabled={cursor < 0}
            label="Coup précédent"
          >
            <ChevronLeft size={17} aria-hidden />
          </NavButton>
          {/* Le même disque d'accent que sous l'échiquier : c'est la même
              commande, et rien ne justifierait qu'elle se dessine autrement
              selon qu'on la trouve en tête de la liste ou sous le plateau. */}
          {onToggleAutoplay && (
            <button
              type="button"
              onClick={onToggleAutoplay}
              aria-pressed={autoplay}
              aria-label={autoplay ? 'Interrompre la lecture' : 'Dérouler la partie'}
              title={autoplay ? 'Interrompre la lecture' : 'Dérouler la partie'}
              className={clsx(
                'mx-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all pointer-coarse:h-11 pointer-coarse:w-11',
                autoplay
                  ? 'bg-accent text-[var(--accent-contrast)] shadow-[var(--glow)]'
                  : 'bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent hover:bg-[color-mix(in_oklab,var(--accent)_28%,transparent)]',
              )}
            >
              {autoplay ? (
                <Pause size={15} aria-hidden fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={15} aria-hidden fill="currentColor" strokeWidth={0} className="ml-px" />
              )}
            </button>
          )}
          <NavButton
            onClick={() => onSeek(cursor + 1)}
            disabled={cursor >= moves.length - 1}
            label="Coup suivant"
          >
            <ChevronRight size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(moves.length - 1)}
            disabled={cursor >= moves.length - 1}
            label="Fin"
          >
            <ChevronLast size={17} aria-hidden />
          </NavButton>
        </div>
      )}

      {controls && coupCourant && (
        <p className="border-b border-line/60 px-3 py-1.5 text-[12px] leading-snug text-muted">
          <strong className="font-semibold text-ink">{format(coupCourant.san)}</strong>{' '}
          <span className="text-faint">·</span> {dire(coupCourant.san)}
        </p>
      )}
      {/* `overscroll-contain` seulement à partir de `lg`.

          Il empêche le défilement de se propager au parent, ce qui est juste
          sur grand écran : la liste y est un panneau à hauteur fixe dans une
          mise en page calée sur la fenêtre, et faire glisser la page derrière
          en arrivant au bout serait déroutant.

          Sous `lg`, les colonnes s'empilent et la liste n'est qu'un bloc dans
          une page qui défile. Contenir le débordement y piège le doigt : on
          pose le pouce sur la liste, on atteint son extrémité, et plus rien ne
          bouge — ni la liste, ni la page. On ne peut alors plus remonter vers
          l'échiquier autrement qu'en visant les quelques pixels de marge. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-auto lg:overscroll-contain"
        role="list"
        aria-label="Liste des coups"
      >
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-faint">
            Les coups joués apparaîtront ici.
          </p>
        ) : (
          <ol className="text-[13px]">
            {rows.map((row) => (
              <li
                key={row.number}
                className="grid grid-cols-[2.4rem_1fr_1fr] items-stretch border-b border-line/40 last:border-0"
              >
                <span className="grid place-items-center bg-surface/40 text-[11px] font-semibold tabular-nums text-faint">
                  {row.number}
                </span>
                <MoveCell
                  move={row.white}
                  ply={row.whitePly}
                  active={cursor === row.whitePly}
                  quality={qualities?.[row.whitePly]}
                  locale={locale}
                  format={format}
                  dire={dire}
                  onSeek={onSeek}
                  ref={cursor === row.whitePly ? activeRef : undefined}
                />
                <MoveCell
                  move={row.black}
                  ply={row.blackPly}
                  active={cursor === row.blackPly}
                  quality={qualities?.[row.blackPly]}
                  locale={locale}
                  format={format}
                  dire={dire}
                  onSeek={onSeek}
                  ref={cursor === row.blackPly ? activeRef : undefined}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

const MoveCell = function MoveCell({
  move,
  ply,
  active,
  quality,
  locale,
  format,
  dire,
  onSeek,
  ref,
}: {
  move: PlayedMove | null
  ply: number
  active: boolean
  quality?: MoveQuality
  locale: 'fr' | 'en'
  /** Écriture des coups, accordée aux préférences. */
  format: (san: string) => string
  /** Le même coup en français ordinaire, pour l'info-bulle. */
  dire: (san: string) => string
  onSeek: (ply: number) => void
  ref?: React.Ref<HTMLButtonElement>
}) {
  if (!move) return <span className="px-2 py-1.5" />

  const san = format(move.san)
  const style = quality ? QUALITY_STYLES[quality] : null
  // Les coups ordinaires ne méritent pas de pastille : on ne signale que ce qui
  // sort de l'ordinaire, sinon la liste devient un sapin de Noël illisible.
  // La théorie garde son 📖 : ce n'est pas un jugement, c'est un repère.
  const worthShowing =
    style && quality !== 'excellent' && quality !== 'good' && quality !== 'forced'
  /*
    La notation prend la couleur de son verdict — « Cé6 » en vert quand c'était
    le meilleur coup, en rouge quand c'était une gaffe.

    Le glyphe seul ne suffisait pas : il fait onze pixels, il est posé à droite
    de la cellule, et l'œil qui parcourt la colonne des coups ne le rencontre
    jamais. La couleur, elle, se lit sans être cherchée — c'est tout l'intérêt
    d'une liste qu'on relit après coup pour retrouver *où* ça a basculé.

    On ne colore que la notation, pas la cellule : un fond teinté par ligne
    donnait une colonne bariolée où le coup sélectionné ne se distinguait plus
    de son voisin. Et on laisse en gris les coups corrects — `good`,
    `excellent`, `forced`, la théorie —, faute de quoi tout est coloré et plus
    rien ne ressort.
  */
  const teinte =
    style && quality && isNotableQuality(quality) ? `var(--q-${style.token})` : undefined

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSeek(ply)}
      // « Tg2+ » ne veut rien dire tant qu'on ne l'a pas apprise, et c'est en
      // survolant qu'on l'apprend.
      // Et le verdict avec, sans quoi la couleur reste une devinette : « rouge,
      // d'accord, mais rouge de quoi ? ».
      title={style ? `${dire(move.san)} — ${style.label[locale]}` : dire(move.san)}
      className={clsx(
        // Au doigt, la ligne s'épaissit jusqu'à la taille d'un pouce ; la
        // liste s'allonge d'autant, mais elle défile.
        'flex items-center gap-1 px-2 py-1.5 text-left font-medium transition-colors pointer-coarse:py-3',
        active
          ? 'bg-accent/18 text-ink ring-1 ring-inset ring-accent/40'
          : 'hover:bg-surface-hover',
      )}
      aria-current={active ? 'true' : undefined}
    >
      <span
        className={clsx('truncate', teinte && 'font-semibold')}
        style={teinte ? { color: teinte } : undefined}
      >
        {san}
      </span>
      {worthShowing && (
        <span
          className="ml-auto shrink-0 text-[11px] font-bold leading-none"
          style={{ color: `var(--q-${style.token})` }}
          title={`${style.label[locale]} — ${style.description[locale]}`}
        >
          {style.glyph}
        </span>
      )}
    </button>
  )
}

function NavButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-8 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-30 pointer-coarse:h-11 pointer-coarse:w-11"
    >
      {children}
    </button>
  )
}
