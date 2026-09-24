'use client'

import { QUALITY_STYLES, type MoveQuality } from '@coupparfait/core'
import { avecElements, useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

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
  /** Le coup qu'il fallait jouer, celui qu'on a joué, et ce que le premier fait. */
  conseil?: { conseille: string; joue: string; pourquoi?: string | null } | null
}) {
  const t = useT()
  const style = QUALITY_STYLES[quality]
  const teinte = `var(--q-${style.token})`

  return (
    <div className="mb-1.5">
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
      {conseil && (
        <p className="mt-0.5 text-[14px] leading-snug text-muted">
          {avecElements(t('computer.shouldHavePlayed'), {
            conseille: <strong className="font-semibold text-accent">{conseil.conseille}</strong>,
            joue: <strong className="font-semibold text-ink">{conseil.joue}</strong>,
          })}
          {/* Et ce qu'il faisait. Sans cette phrase, on regarde un coup dont on
              ne comprend pas l'intérêt, et l'on n'apprend rien — la
              justification vaut mieux que le verdict. */}
          {conseil.pourquoi && <span className="text-ink"> {conseil.pourquoi}</span>}
        </p>
      )}
    </div>
  )
}
