/**
 * Le gras `**mot**` des définitions.
 *
 * Les définitions du glossaire et des motifs sont écrites avec une seule
 * marque de mise en forme — deux astérisques autour de ce qui compte — plutôt
 * qu'avec une bibliothèque Markdown de trente kilo-octets pour un seul usage.
 *
 * Cette fonction vivait dans la page du glossaire, seule à s'en servir. La
 * boîte d'explication des statistiques affiche les mêmes textes : sans mise en
 * commun, on lisait « **3 | 2** veut dire » avec ses astérisques à l'écran.
 */

import type { ReactNode } from 'react'

export function renderBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={index} className="font-semibold text-accent-soft">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  )
}
