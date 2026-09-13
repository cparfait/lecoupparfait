'use client'

/**
 * Légende des flèches.
 *
 * Une flèche verte et une flèche bleue sur le même échiquier, sans rien pour
 * les distinguer, ne veulent rien dire : on voit deux traits de couleur et on
 * devine. La légende dit ce que chacune signifie, et **uniquement celles qui
 * sont réellement affichées** — une légende qui décrit des couleurs absentes
 * est aussi déroutante que pas de légende du tout.
 */

import clsx from 'clsx'
import { ANNOTATION_COLORS, type AnnotationColor, type Arrow } from './boardKit.ts'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'

export interface LegendItem {
  color: AnnotationColor
  /*
    Le libellé, par clé de dictionnaire.

    Les entrées prêtes à l'emploi — voir `LEGEND` plus bas — sont des
    constantes de module : elles ne peuvent pas appeler `t()` elles-mêmes, et
    portaient donc leur texte français en dur. C'est la légende qui le résout
    au rendu, avec ses variables éventuelles : « Cf3 — ton coup » se compose
    d'une clé et du coup, pas d'une phrase entière.
  */
  labelKey: TranslationKey
  /** Valeurs à interpoler dans le libellé et le titre. */
  vars?: Record<string, string | number>
  /** Précision facultative, affichée en survol. */
  titleKey?: TranslationKey
  weight?: 'thin' | 'normal' | 'bold'
  /**
   * Forme du repère.
   *
   * Une flèche pour les coups montrés, une pastille pour les cases colorées —
   * on ne peut pas illustrer une case d'arrivée par une flèche sans induire en
   * erreur sur ce qu'on décrit.
   */
  shape?: 'arrow' | 'dot'
  /** Couleur littérale, quand elle sort de la palette des annotations. */
  swatch?: string
}

export function ArrowLegend({
  items,
  className,
  reserve = false,
}: {
  items: LegendItem[]
  className?: string
  /**
   * Garde la place quand il n'y a rien à légender.
   *
   * En partie commentée, les flèches vont et viennent d'un coup à l'autre —
   * d'autant plus depuis qu'on ne flèche plus le coup conseillé sur un bon
   * coup. La légende suivait, apparaissant et disparaissant sous l'échiquier ;
   * et comme la taille du plateau est déterminée par la hauteur de sa colonne,
   * il rétrécissait puis regrandissait à chaque fois.
   *
   * On réserve donc la ligne. Le gabarit est le même `<ul>`, rendu invisible
   * avec un caractère insécable : c'est la seule façon d'obtenir *exactement* la
   * même hauteur, sans la recopier en dur et sans qu'elle dérive le jour où l'on
   * touchera aux marges.
   */
  reserve?: boolean
}) {
  const t = useT()

  if (items.length === 0) {
    if (!reserve) return null
    return (
      <ul
        aria-hidden
        className={clsx(
          'invisible flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-[var(--radius-sm)]',
          'bg-surface px-3 py-2 text-[12px] leading-none text-muted',
          className,
        )}
      >
        <li>&nbsp;</li>
      </ul>
    )
  }

  return (
    <ul
      className={clsx(
        'flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-[var(--radius-sm)]',
        'bg-surface px-3 py-2 text-[12px] leading-none text-muted',
        className,
      )}
      aria-label={t('legend.aria')}
    >
      {items.map((item) => (
        <li
          key={`${item.color}-${item.labelKey}`}
          className="flex items-center gap-1.5"
          title={item.titleKey ? t(item.titleKey, item.vars) : undefined}
        >
          {item.shape === 'dot' ? (
            <MiniDot colour={item.swatch ?? ANNOTATION_COLORS[item.color]} />
          ) : (
            <MiniArrow color={item.color} weight={item.weight ?? 'bold'} />
          )}
          <span className="whitespace-nowrap">{t(item.labelKey, item.vars)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Flèche miniature, dessinée comme celles de l'échiquier. */
function MiniArrow({
  color,
  weight,
}: {
  color: AnnotationColor
  weight: 'thin' | 'normal' | 'bold'
}) {
  const stroke = ANNOTATION_COLORS[color]
  const width = weight === 'bold' ? 3.4 : weight === 'normal' ? 2.4 : 1.6

  return (
    <svg
      width="20"
      height="10"
      viewBox="0 0 20 10"
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      <line
        x1="1"
        y1="5"
        x2="12.5"
        y2="5"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        opacity="0.95"
      />
      <path d="M 12 1.4 L 18.5 5 L 12 8.6 Z" fill={stroke} opacity="0.95" />
    </svg>
  )
}

/** Pastille miniature, dessinée comme les repères de cases d'arrivée. */
function MiniDot({ colour }: { colour: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: colour }}
      aria-hidden
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Légendes prêtes à l'emploi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cases d'arrivée colorées selon le danger.
 *
 * Quatre couleurs sur un échiquier sans clé de lecture, c'est un jeu de
 * devinettes. La formulation évite le vocabulaire du moteur : « tu perds la
 * pièce » se comprend, « évaluation négative » non.
 */
export const SAFETY_LEGEND: LegendItem[] = [
  {
    color: 'green',
    swatch: 'var(--q-brilliant)',
    shape: 'dot',
    labelKey: 'legend.safeWins',
    titleKey: 'legend.safeWinsTitle',
  },
  {
    color: 'green',
    swatch: 'var(--q-best)',
    shape: 'dot',
    labelKey: 'legend.safeSquare',
    titleKey: 'legend.safeSquareTitle',
  },
  {
    color: 'orange',
    swatch: 'var(--q-forced)',
    shape: 'dot',
    labelKey: 'legend.evenTrade',
    titleKey: 'legend.evenTradeTitle',
  },
  {
    color: 'red',
    swatch: 'var(--q-blunder)',
    shape: 'dot',
    labelKey: 'legend.losesPiece',
    titleKey: 'legend.losesPieceTitle',
  },
]

/** Vocabulaire commun à toutes les vues, pour ne pas dire deux fois la même chose autrement. */
export const LEGEND = {
  played: { color: 'green', labelKey: 'legend.played', titleKey: 'legend.playedTitle' },
  playedBad: {
    color: 'red',
    labelKey: 'legend.playedBad',
    titleKey: 'legend.playedBadTitle',
  },
  /*
    « À la place », et non « conseillé ».

    Cette flèche est calculée sur la position **d'avant** le coup joué, et
    dessinée sur celle d'après : c'est l'option qu'on avait, pas celle qu'on a.
    Étiquetée « Coup conseillé » sur l'échiquier courant, elle se lit
    inévitablement comme « joue ça maintenant » — et l'on se demande pourquoi
    le coach conseille un coup qui perd une pièce dans la position affichée.
    C'est un vrai retour d'usage, pas une hypothèse.

    Le titre, lui, ne se lit qu'au survol : il n'existe pas sur un téléphone.
    Le libellé doit donc porter l'essentiel à lui seul.
  */
  best: {
    color: 'blue',
    labelKey: 'legend.best',
    weight: 'normal',
    titleKey: 'legend.bestTitle',
  },
  hint: { color: 'orange', labelKey: 'legend.hint', titleKey: 'legend.hintTitle' },
  look: { color: 'green', labelKey: 'legend.look', titleKey: 'legend.lookTitle' },
  danger: { color: 'red', labelKey: 'legend.danger', titleKey: 'legend.dangerTitle' },
  solution: { color: 'blue', labelKey: 'legend.solution', titleKey: 'legend.solutionTitle' },
} satisfies Record<string, LegendItem>

/**
 * Légende déduite des flèches réellement présentes.
 *
 * Sert de filet aux vues qui composent leurs flèches librement : on ne décrit
 * jamais une couleur qui n'est pas à l'écran.
 */
export function legendFor(arrows: Arrow[], catalogue: LegendItem[]): LegendItem[] {
  const present = new Set(arrows.map((arrow) => arrow.color))
  return catalogue.filter((item) => present.has(item.color))
}
