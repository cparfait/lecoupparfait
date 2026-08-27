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

export interface LegendItem {
  color: AnnotationColor
  /** Libellé court, lisible d'un coup d'œil. */
  label: string
  /** Précision facultative, affichée en survol. */
  title?: string
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
}: {
  items: LegendItem[]
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <ul
      className={clsx(
        'flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-[var(--radius-sm)]',
        'bg-surface px-3 py-2 text-[11px] leading-none text-muted',
        className,
      )}
      aria-label="Signification des flèches"
    >
      {items.map((item) => (
        <li key={`${item.color}-${item.label}`} className="flex items-center gap-1.5" title={item.title}>
          {item.shape === 'dot' ? (
            <MiniDot colour={item.swatch ?? ANNOTATION_COLORS[item.color]} />
          ) : (
            <MiniArrow color={item.color} weight={item.weight ?? 'bold'} />
          )}
          <span className="whitespace-nowrap">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

/** Flèche miniature, dessinée comme celles de l'échiquier. */
function MiniArrow({ color, weight }: { color: AnnotationColor; weight: 'thin' | 'normal' | 'bold' }) {
  const stroke = ANNOTATION_COLORS[color]
  const width = weight === 'bold' ? 3.4 : weight === 'normal' ? 2.4 : 1.6

  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden className="shrink-0 overflow-visible">
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
    label: 'Tu gagnes du matériel',
    title: 'Ce coup remporte plus qu’il ne risque.',
  },
  {
    color: 'green',
    swatch: 'var(--q-best)',
    shape: 'dot',
    label: 'Case sûre',
    title: 'La pièce n’y est pas attaquée, ou elle y est défendue.',
  },
  {
    color: 'orange',
    swatch: 'var(--q-forced)',
    shape: 'dot',
    label: 'Échange équilibré',
    title: 'Tu perds autant que tu prends.',
  },
  {
    color: 'red',
    swatch: 'var(--q-blunder)',
    shape: 'dot',
    label: 'Tu perds la pièce',
    title: 'La pièce y serait prise sans compensation suffisante.',
  },
]

/** Vocabulaire commun à toutes les vues, pour ne pas dire deux fois la même chose autrement. */
export const LEGEND = {
  played: { color: 'green', label: 'Ton coup', title: 'Le coup que tu viens de jouer.' },
  playedBad: {
    color: 'red',
    label: 'Ton coup (erreur)',
    title: 'Le coup joué : le moteur le juge nettement inférieur.',
  },
  best: {
    color: 'blue',
    label: 'Coup conseillé',
    weight: 'normal',
    title: 'Ce que le moteur aurait joué à ta place.',
  },
  hint: { color: 'orange', label: 'Indice', title: 'Le coup suggéré par l’indice.' },
  opponent: {
    color: 'accent',
    label: 'Coup de l’adversaire',
    title: 'Ce que ton adversaire vient de jouer.',
  },
  look: { color: 'green', label: 'À observer', title: 'Ce que le coach te montre.' },
  danger: { color: 'red', label: 'Menace', title: 'Un coup adverse dont il faut se méfier.' },
  solution: { color: 'blue', label: 'La solution', title: 'Le coup attendu.' },
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
