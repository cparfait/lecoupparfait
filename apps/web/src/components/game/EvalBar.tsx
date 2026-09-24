'use client'

/**
 * Barre d'évaluation.
 *
 * Traduit le score du moteur en une jauge : blanc en bas, noir en haut, la
 * frontière indiquant qui domine. La hauteur suit les **chances de victoire**,
 * pas les centipions — sinon la barre resterait figée au milieu pendant tout
 * le milieu de partie puis basculerait d'un coup, ce qui n'apprend rien.
 *
 * Elle sait aussi se replier en une version horizontale sur mobile, où la
 * hauteur est la ressource rare.
 */

import { memo } from 'react'
import clsx from 'clsx'
import type { Color, Score } from '@coupparfait/core'
import { formatScore, winPercent } from '@coupparfait/core'
import { useT } from '@/lib/i18n/index.tsx'

export const EvalBar = memo(function EvalBar({
  score,
  orientation = 'w',
  orientationAxis = 'vertical',
  showLabel = true,
  className,
  loading,
}: {
  score: Score | null
  orientation?: Color
  orientationAxis?: 'vertical' | 'horizontal'
  showLabel?: boolean
  className?: string
  loading?: boolean
}) {
  const white = score ? winPercent(score) : 50
  // Vue depuis les Noirs : la barre se retourne pour que « mon camp » reste en bas.
  const bottomShare = orientation === 'w' ? white : 100 - white
  const label = score ? formatScore(score) : '—'
  const t = useT()
  const decisive = score?.type === 'mate'

  if (orientationAxis === 'horizontal') {
    return (
      <div
        className={clsx('relative h-6 w-full overflow-hidden rounded-full', className)}
        style={{ background: 'var(--eval-black)' }}
        role="meter"
        aria-valuenow={Math.round(white)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('common.evaluation', { valeur: label })}
      >
        {/* La jauge est une mise à l'échelle, pas une largeur qui change :
            une transition sur `width` refait la mise en page à chaque image
            pendant une demi-seconde, `transform` ne touche qu'au compositeur. */}
        <div
          className="absolute inset-0 origin-left transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${bottomShare / 100})`, background: 'var(--eval-white)' }}
        />
        {showLabel && (
          <span
            className={clsx(
              'absolute inset-0 grid place-items-center text-[12px] font-bold tabular-nums',
              'mix-blend-difference text-white',
            )}
          >
            {loading ? '…' : label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'relative w-7 shrink-0 overflow-hidden rounded-[var(--radius-sm)] transition-opacity',
        loading && 'opacity-60',
        className,
      )}
      style={{ background: 'var(--eval-black)' }}
      role="meter"
      aria-valuenow={Math.round(white)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('common.evaluation', { valeur: label })}
    >
      {/* Même principe qu'en horizontal : `scaleY` depuis le bas, et non une
          hauteur animée. */}
      <div
        className="absolute inset-0 origin-bottom transition-transform duration-500 ease-out"
        style={{
          transform: `scaleY(${bottomShare / 100})`,
          background: 'var(--eval-white)',
          boxShadow: decisive ? '0 0 12px var(--accent)' : undefined,
        }}
      />

      {/* Repère du milieu : l'égalité parfaite. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-black/25" aria-hidden />

      {showLabel && (
        <span
          className={clsx(
            'absolute inset-x-0 text-center text-[12px] font-bold tabular-nums leading-none',
            // L'étiquette se place du côté du camp qui mène, pour rester lisible.
            bottomShare > 50 ? 'bottom-1 text-black/80' : 'top-1 text-white/85',
          )}
        >
          {loading ? '…' : label}
        </span>
      )}
    </div>
  )
})

/**
 * Courbe d'évaluation de toute la partie.
 *
 * Une aire remplie plutôt qu'une ligne : on lit d'un coup d'œil qui a mené et
 * pendant combien de temps. Les moments de bascule sont marqués d'un point.
 */
export function EvalGraph({
  values,
  cursor,
  turningPoints = [],
  onSeek,
  className,
}: {
  /** Chances de victoire des Blancs (0–100) après chaque demi-coup. */
  values: number[]
  cursor?: number
  turningPoints?: number[]
  onSeek?: (ply: number) => void
  className?: string
}) {
  const t = useT()
  if (values.length < 2) return null

  const width = 100
  const height = 32
  const step = width / (values.length - 1)

  // Aire sous la courbe, refermée sur la ligne d'équilibre.
  const points = values.map((value, index) => {
    const x = index * step
    const y = height - (value / 100) * height
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const area = `M 0,${height / 2} L ${points.join(' L ')} L ${width},${height / 2} Z`
  const line = `M ${points.join(' L ')}`

  return (
    <div className={clsx('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-16 w-full cursor-pointer"
        onClick={(event) => {
          if (!onSeek) return
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - rect.left) / rect.width
          onSeek(Math.round(ratio * (values.length - 1)) - 1)
        }}
        role="img"
        aria-label={t('rest.evalOverTime')}
      >
        <rect width={width} height={height} fill="var(--eval-black)" opacity="0.5" />
        <path d={area} fill="var(--eval-white)" opacity="0.9" />
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.55"
        />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="0.4" opacity="0.7" />

        {turningPoints.map((ply) => {
          const x = (ply + 1) * step
          const y = height - ((values[ply + 1] ?? 50) / 100) * height
          return (
            <circle
              key={ply}
              cx={x}
              cy={y}
              r="0.9"
              fill="var(--q-blunder)"
              stroke="var(--bg)"
              strokeWidth="0.3"
            />
          )
        })}

        {cursor !== undefined && cursor >= -1 && (
          <line
            x1={(cursor + 1) * step}
            y1="0"
            x2={(cursor + 1) * step}
            y2={height}
            stroke="var(--accent-2)"
            strokeWidth="0.5"
          />
        )}
      </svg>
    </div>
  )
}
