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
import { Card } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'

export function RappelDeSeance({
  nom,
  icone,
  consigne,
}: {
  nom: string
  /** L'emoji du thème : il sert de repère, pas de décoration. */
  icone: string
  consigne: string
}) {
  const [ouvert, setOuvert] = useState(true)

  return (
    <Card>
      <EnTeteDeCarte
        titre={
          <>
            <span aria-hidden>{icone}</span> {nom}
          </>
        }
        teinte="var(--rub-apprendre)"
        filet={ouvert}
        fin="séance"
        onClick={() => setOuvert((etat) => !etat)}
        ouvert={ouvert}
      />
      {ouvert && <p className="p-3 text-[13px] leading-relaxed text-muted">{consigne}</p>}
    </Card>
  )
}
