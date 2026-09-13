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
import { useNavigationClavier } from './GameNav.tsx'
import { useMoveWords, useSan } from '@/lib/notation.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export interface MoveListProps {
  moves: PlayedMove[]
  cursor: number
  onSeek: (ply: number) => void
  /** Qualité de chaque demi-coup, si la partie a été analysée. */
  qualities?: Record<number, MoveQuality>
  startFen?: string
  className?: string
  /**
   * Nombre de rangées visibles au maximum — les plus récentes.
   *
   * Sans plafond, la liste grandit d'une rangée tous les deux coups et pousse
   * vers le bas ce qui la suit dans la colonne : au vingtième coup, le tchat
   * d'une partie en ligne n'était plus qu'une fente sous la ligne de
   * flottaison, alors qu'il sert justement pendant la partie.
   *
   * On ne tronque rien : la liste défile déjà toute seule sur le coup courant,
   * et l'historique complet reste à un geste de molette. Ce sont les dix
   * derniers coups qu'on relit — pour les autres, il y a la page d'analyse.
   */
  maxRows?: number
  /** Affiche la barre de navigation sous la liste. */
  controls?: boolean
  autoplay?: boolean
  onToggleAutoplay?: () => void
}

/**
 * La couleur d'un verdict, ou rien.
 *
 * Trois familles : ce qui est remarquable prend sa teinte pleine, ce qui est
 * simplement correct prend un vert atténué — présent, mais qui ne dispute pas
 * l'attention à une gaffe deux lignes plus bas —, et le reste garde la couleur
 * du texte.
 */
function couleurDuVerdict(
  quality: MoveQuality | undefined,
  style: { token: string } | null | undefined,
): string | undefined {
  if (!quality || !style) return undefined
  if (isNotableQuality(quality)) return `var(--q-${style.token})`
  if (quality === 'excellent' || quality === 'good') {
    return `color-mix(in oklab, var(--q-${style.token}) 78%, var(--text))`
  }
  return undefined
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
  maxRows,
}: MoveListProps) {
  const t = useT()
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
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

  // Navigation au clavier, active dès que la page a le focus — et seulement
  // quand la liste porte ses commandes : sans elles, ce sont les flèches de
  // `GameNav` qui écoutent, et une touche ne doit avancer que d'un coup. Voir
  // `useNavigationClavier`, qui ne sert qu'un seul gestionnaire par page.
  useNavigationClavier(controls, (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        onSeek(Math.max(-1, cursor - 1))
        return true
      case 'ArrowRight':
        onSeek(Math.min(moves.length - 1, cursor + 1))
        return true
      case 'Home':
        onSeek(-1)
        return true
      case 'End':
        onSeek(moves.length - 1)
        return true
      default:
        return false
    }
  })

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      {/* Au-dessus de la liste, et non en dessous : posés en bas, ils
          finissaient sous la ligne de flottaison dès que la partie
          s’allongeait — c’est-à-dire exactement quand on en a besoin. */}
      {controls && (
        <div className="flex items-center justify-center gap-0.5 border-b border-line/60 p-1.5">
          <NavButton onClick={() => onSeek(-1)} disabled={cursor < 0} label={t('moves.start')}>
            <ChevronFirst size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(cursor - 1)}
            disabled={cursor < 0}
            label={t('moves.previous')}
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
              aria-label={t(autoplay ? 'moves.stopPlayback' : 'moves.playThrough')}
              title={t(autoplay ? 'moves.stopPlayback' : 'moves.playThrough')}
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
            label={t('bits.nextMove')}
          >
            <ChevronRight size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(moves.length - 1)}
            disabled={cursor >= moves.length - 1}
            label={t('bits.toEnd')}
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
      {/* La hauteur d'une rangée passe par une variable plutôt que par un
          nombre écrit dans le style : au doigt, les cellules s'épaississent
          (`pointer-coarse:py-3`, soit douze pixels de plus), et dix rangées
          n'y font plus la même hauteur. La variable suit la même requête de
          média que la cellule.

          Mesurée, pas devinée : 34,7 px à la souris pour `text-[14px]` et
          `py-1.5`, bordure comprise. Arrondie au-dessus, la dixième rangée
          reste entière et l'on aperçoit le haut de la onzième — ce qui dit
          justement qu'il y a des coups au-dessus. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-auto [--hauteur-rangee:35px] lg:overscroll-contain pointer-coarse:[--hauteur-rangee:47px]"
        style={maxRows ? { maxHeight: `calc(var(--hauteur-rangee) * ${maxRows})` } : undefined}
        role="list"
        aria-label={t('moves.list')}
      >
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-faint">{t('moves.empty')}</p>
        ) : (
          <ol className="text-[14px]">
            {rows.map((row) => (
              <li
                key={row.number}
                className="grid grid-cols-[2.4rem_1fr_1fr] items-stretch border-b border-line/40 last:border-0"
              >
                <span className="grid place-items-center bg-surface/40 text-[12px] font-semibold tabular-nums text-faint">
                  {row.number}
                </span>
                <MoveCell
                  move={row.white}
                  ply={row.whitePly}
                  active={cursor === row.whitePly}
                  quality={qualities?.[row.whitePly]}
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
  format,
  dire,
  onSeek,
  ref,
}: {
  move: PlayedMove | null
  ply: number
  active: boolean
  quality?: MoveQuality
  /** Écriture des coups, accordée aux préférences. */
  format: (san: string) => string
  /** Le même coup en français ordinaire, pour l'info-bulle. */
  dire: (san: string) => string
  onSeek: (ply: number) => void
  ref?: React.Ref<HTMLButtonElement>
}) {
  const t = useT()
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
    de son voisin.

    **Les bons coups sont colorés eux aussi**, et c'est un changement d'avis.
    On les laissait gris au motif que tout colorer revient à ne rien colorer.
    C'est vrai d'une couleur criarde ; c'est faux d'un vert discret. Une liste
    où seules les fautes ont une couleur ne dit qu'une moitié de la partie —
    on relit pour savoir où ça a basculé, mais aussi pour voir ce qu'on a bien
    joué, et un joueur qui n'a fait aucune faute se retrouvait devant une
    colonne entièrement grise, comme s'il n'avait rien fait.

    Restent sans couleur `forced` — un coup obligé n'est le mérite de personne
    — et la théorie, qui garde son glyphe de livre.
  */
  const teinte = couleurDuVerdict(quality, style)

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSeek(ply)}
      // « Tg2+ » ne veut rien dire tant qu'on ne l'a pas apprise, et c'est en
      // survolant qu'on l'apprend.
      // Et le verdict avec, sans quoi la couleur reste une devinette : « rouge,
      // d'accord, mais rouge de quoi ? ».
      title={style ? `${dire(move.san)} — ${tCoeur(t, style.label)}` : dire(move.san)}
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
          className="ml-auto shrink-0 text-[12px] font-bold leading-none"
          style={{ color: `var(--q-${style.token})` }}
          title={`${tCoeur(t, style.label)} — ${tCoeur(t, style.description)}`}
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
