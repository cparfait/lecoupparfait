'use client'

/**
 * La carte d'un adversaire, comme une pièce sous vitrine.
 *
 * Sept rectangles gris avec un portrait au milieu, c'était un formulaire. Les
 * portraits sont des sculptures photographiées en studio — bois, bronze,
 * cristal, obsidienne — et une sculpture se présente sous un projecteur, pas
 * dans une case. La carte devient donc une vitrine : un faisceau de lumière
 * tombe du haut dans la teinte de la matière, la pièce projette une ombre
 * colorée, et la carte s'incline légèrement vers la souris comme un objet
 * qu'on tourne entre ses doigts, avec un reflet qui glisse sur le verre.
 *
 * Tout est en CSS et en trois variables mises à jour au survol : aucun rendu
 * React par mouvement de souris. Sur un écran tactile, il n'y a pas de survol
 * et la carte reste d'aplomb — le projecteur et l'ombre suffisent.
 */

import { useCallback, useRef } from 'react'
import type { PointerEvent } from 'react'
import clsx from 'clsx'
import type { BotPersonality } from '@coupparfait/core'
import { PortraitAdversaire } from './PortraitAdversaire.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import { useT } from '@/lib/i18n/index.tsx'

/** Inclinaison maximale, en degrés. Au-delà, la carte a l'air de tomber. */
const INCLINAISON = 9

export function CarteAdversaire({
  personnalite,
  teinte,
  actif,
  elo,
  niveau,
  onClick,
}: {
  personnalite: BotPersonality
  /** La teinte de la matière — voir `TEINTES_ADVERSAIRES`. */
  teinte: string
  actif: boolean
  elo: number
  niveau: number
  onClick: () => void
}) {
  const t = useT()
  const carte = useRef<HTMLButtonElement>(null)

  const suivre = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const element = carte.current
    if (!element || event.pointerType !== 'mouse') return
    const cadre = element.getBoundingClientRect()
    const x = (event.clientX - cadre.left) / cadre.width
    const y = (event.clientY - cadre.top) / cadre.height
    element.style.setProperty('--rx', `${((0.5 - y) * 2 * INCLINAISON).toFixed(2)}deg`)
    element.style.setProperty('--ry', `${((x - 0.5) * 2 * INCLINAISON).toFixed(2)}deg`)
    element.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    element.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }, [])

  const relacher = useCallback(() => {
    const element = carte.current
    if (!element) return
    element.style.setProperty('--rx', '0deg')
    element.style.setProperty('--ry', '0deg')
  }, [])

  return (
    <button
      ref={carte}
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onClick}
      onPointerMove={suivre}
      onPointerLeave={relacher}
      style={
        {
          '--teinte': teinte,
          '--rx': '0deg',
          '--ry': '0deg',
          '--mx': '50%',
          '--my': '30%',
          transform: 'perspective(700px) rotateX(var(--rx)) rotateY(var(--ry))',
          transformStyle: 'preserve-3d',
          // Le fond : la matière en haut, la nuit en bas — comme une vitrine
          // éclairée par le dessus.
          background: [
            'radial-gradient(70% 55% at 50% 18%, color-mix(in oklab, var(--teinte) 55%, transparent), transparent 70%)',
            'linear-gradient(180deg, color-mix(in oklab, var(--teinte) 26%, var(--surface)), color-mix(in oklab, var(--teinte) 6%, var(--bg-elev)) 70%)',
          ].join(', '),
          borderColor: actif
            ? 'var(--accent)'
            : 'color-mix(in oklab, var(--teinte) 50%, var(--border))',
          boxShadow: actif
            ? '0 0 0 1px var(--accent), 0 0 34px -6px var(--accent), inset 0 1px 0 rgb(255 255 255 / 0.22)'
            : 'inset 0 1px 0 rgb(255 255 255 / 0.16), 0 10px 24px -14px color-mix(in oklab, var(--teinte) 70%, black)',
        } as React.CSSProperties
      }
      className={clsx(
        'group relative flex w-[7.25rem] shrink-0 flex-col items-center overflow-hidden rounded-[var(--radius)] border px-2 pb-2.5 pt-3 text-center',
        'transition-[transform,box-shadow,filter] duration-150 ease-out will-change-transform',
        'hover:-translate-y-1 hover:brightness-110',
        actif ? 'scale-[1.04]' : 'saturate-[.85] hover:saturate-100',
      )}
    >
      {/* Le reflet qui glisse sur le verre, sous la souris. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(60% 45% at var(--mx) var(--my), rgb(255 255 255 / 0.22), transparent 70%)',
        }}
      />

      {/* Le socle lumineux sous la pièce : un disque de la teinte, écrasé. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[3.6rem] h-3 w-14 -translate-x-1/2 rounded-full blur-md"
        style={{ background: 'color-mix(in oklab, var(--teinte) 80%, transparent)' }}
      />

      <span
        className="relative transition-transform duration-200 ease-out group-hover:scale-110"
        style={{
          transform: 'translateZ(24px)',
          filter: 'drop-shadow(0 10px 12px color-mix(in oklab, var(--teinte) 65%, transparent))',
        }}
      >
        <PortraitAdversaire personality={personnalite} size={56} />
      </span>

      <span
        className={clsx(
          'mt-2 font-display text-[15px] font-semibold tracking-tight',
          actif ? 'text-ink' : 'text-ink/85',
        )}
        style={{ transform: 'translateZ(12px)' }}
      >
        {tCoeur(t, personnalite.name)}
      </span>
      <span
        className={clsx(
          'mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
          actif
            ? 'bg-accent/25 text-ink'
            : 'bg-[color-mix(in_oklab,var(--teinte)_22%,transparent)] text-ink/70',
        )}
      >
        ≈ {elo} · n°{niveau}
      </span>
    </button>
  )
}
