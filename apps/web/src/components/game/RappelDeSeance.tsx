'use client'

/**
 * Le thème de la séance, rappelé à côté de l'échiquier.
 *
 * Une séance pédagogique annonce un thème avant de commencer — « aujourd'hui,
 * les colonnes ouvertes » — et c'est ce qui la distingue d'une partie
 * ordinaire : les trente commentaires du mode commenté deviennent trente
 * exemples de la même idée au lieu de trente idées différentes.
 *
 * Encore faut-il s'en souvenir au vingtième coup. Le bandeau reste donc en haut
 * de la colonne pendant toute la partie, et il se replie pour ceux qui ont la
 * consigne en tête — son état ne se conserve pas d'une séance à l'autre, et
 * c'est voulu : une nouvelle séance annonce un nouveau thème, qu'on veut voir.
 */

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { useT } from '@/lib/i18n/index.tsx'

export function RappelDeSeance({
  nom,
  icone: Icone,
  consigne,
}: {
  nom: string
  /** L'icône du thème, dans la pastille du bandeau : un repère, pas un décor. */
  icone: LucideIcon
  consigne: string
}) {
  const t = useT()
  const [ouvert, setOuvert] = useState(true)

  return (
    <Card>
      <EnTeteDeCarte
        titre={nom}
        icone={<Icone size={14} aria-hidden />}
        teinte="var(--rub-apprendre)"
        filet={ouvert}
        fin={t('session.badge')}
        onClick={() => setOuvert((etat) => !etat)}
        ouvert={ouvert}
      />
      {ouvert && <p className="p-3 text-[13px] leading-relaxed text-muted">{consigne}</p>}
    </Card>
  )
}
