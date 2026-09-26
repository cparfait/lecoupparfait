'use client'

import clsx from 'clsx'
import { QUALITY_STYLES, type MoveQuality } from '@coupparfait/core'
import { avecElements, useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

/** Le coup qu'il fallait jouer, celui qu'on a joué, et ce que le premier fait. */
export interface Conseil {
  conseille: string
  joue: string
  pourquoi?: string | null
  /** La suite attendue après le coup conseillé : ce qu'il devient. */
  suite?: string | null
  /**
   * Le coup joué ne méritait pas de correction.
   *
   * « Il fallait jouer Cf6 au lieu de g6 » sous le verdict « théorie
   * d'ouverture », ou sous « excellent — aussi bon que le meilleur » : les
   * deux phrases se démentaient. Sous le seuil où un meilleur coup vaut d'être
   * signalé (`meriteUnMeilleurCoup`), on dit la même chose sans corriger : le
   * coup se joue, le moteur en préférait de peu un autre.
   */
  leger?: boolean
}

/**
 * Ce que dit la pastille posée sur la case d'arrivée, écrit.
 *
 * Le libellé suffit à la plupart — « Théorie », « Gaffe » — et la phrase qui
 * suit répond à la question d'après, « et alors ? ». Elle disparaît sous
 * 640 px, où la largeur ne permet pas les deux sans repousser l'échiquier.
 */
export function LegendeDuVerdict({
  quality,
  conseil,
}: {
  quality: MoveQuality
  conseil?: Conseil | null
}) {
  const t = useT()
  const style = QUALITY_STYLES[quality]
  const teinte = `var(--q-${style.token})`

  return (
    <div>
      <p className="flex items-baseline gap-1.5 text-[14px] leading-snug" style={{ color: teinte }}>
        <span aria-hidden>{style.glyph}</span>
        <span className="font-semibold">{tCoeur(t, style.label)}</span>
        <span className="hidden min-w-0 flex-1 truncate font-normal text-muted sm:inline">
          {tCoeur(t, style.description)}
        </span>
      </p>

      {/* Visible à toutes les tailles, contrairement à la description : c'est
          la clé de lecture de la flèche bleue, et elle manque surtout là où
          l'écran est petit. */}
      {conseil && <PhraseDuConseil conseil={conseil} className="mt-0.5" />}
    </div>
  )
}

/**
 * « Il fallait jouer… », avec sa raison et sa suite.
 *
 * Sous l'échiquier sur téléphone, dans le panneau du coach ailleurs : la même
 * phrase aux deux endroits, écrite une fois.
 */
export function PhraseDuConseil({ conseil, className }: { conseil: Conseil; className?: string }) {
  const t = useT()
  return (
    <p className={clsx('text-[14px] leading-snug text-muted', className)}>
      {avecElements(t(conseil.leger ? 'computer.enginePreferred' : 'computer.shouldHavePlayed'), {
        conseille: <strong className="font-semibold text-accent">{conseil.conseille}</strong>,
        joue: <strong className="font-semibold text-ink">{conseil.joue}</strong>,
      })}
      {/* Et ce qu'il faisait. Sans cette phrase, on regarde un coup dont on
          ne comprend pas l'intérêt, et l'on n'apprend rien — la
          justification vaut mieux que le verdict. */}
      {conseil.pourquoi && <span className="text-ink"> {conseil.pourquoi}</span>}
      {conseil.suite && <span> {conseil.suite}</span>}
    </p>
  )
}
