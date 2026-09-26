'use client'

/**
 * Le bouton « Brancher un échiquier électronique » de la bascule du plateau.
 *
 * Le branchement occupait une ligne permanente dans la colonne de chaque écran
 * de partie, à côté de l'échiquier, pour un matériel que presque personne ne
 * possède. Il devient un bouton Bluetooth dans la pastille 2D / 3D / plein
 * écran — un réglage du plateau parmi les autres —, et le panneau ne paraît
 * que demandé, ou dès qu'un plateau est branché : c'est là qu'on en a besoin.
 *
 * Le crochet rend de quoi brancher les deux bouts : `action` pour la bascule
 * (`ChessBoard` ou `ViewToggle`), `ouvert` et `fermer` pour le panneau. Il
 * suppose que le panneau est posé dans un élément d'identifiant
 * `PANNEAU_PLATEAU_ID`, vers lequel il fait défiler à l'ouverture.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bluetooth } from 'lucide-react'
import type { ActionBascule } from '@/components/board/ChessBoard.tsx'
import { availableDrivers } from '@/lib/board/registry.ts'
import type { PhysicalBoardState } from '@/lib/board/usePhysicalBoard.ts'
import { useT } from '@/lib/i18n/index.tsx'

export const PANNEAU_PLATEAU_ID = 'panneau-plateau'

export function useBranchementPlateau(etat: PhysicalBoardState): {
  action: ActionBascule | undefined
  ouvert: boolean
  fermer: () => void
} {
  const t = useT()

  // Les pilotes se lisent sur `navigator` : on attend le navigateur, comme le
  // panneau lui-même, pour ne proposer que ce que ce navigateur sait faire.
  const [disponible, setDisponible] = useState(false)
  useEffect(() => setDisponible(availableDrivers().length > 0), [])

  const [ouvert, setOuvert] = useState(false)
  const fermer = useCallback(() => setOuvert(false), [])

  const basculer = useCallback(() => {
    setOuvert(!ouvert)
    if (ouvert) return
    // Sur téléphone la colonne est loin sous l'échiquier : on y descend,
    // sinon on toucherait le bouton sans rien voir changer à l'écran.
    requestAnimationFrame(() =>
      document
        .getElementById(PANNEAU_PLATEAU_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    )
  }, [ouvert])

  const branche = etat.board !== null

  // Mémorisé : le plateau est `memo`, et un objet neuf à chaque rendu le
  // redessinerait à chaque battement de l'écran.
  const action = useMemo<ActionBascule | undefined>(
    () =>
      disponible || branche
        ? {
            icone: <Bluetooth size={15} strokeWidth={2.2} aria-hidden />,
            libelle: t('board.connect'),
            actif: ouvert || branche,
            onClick: basculer,
          }
        : undefined,
    [disponible, branche, ouvert, basculer, t],
  )

  return { action, ouvert, fermer }
}
