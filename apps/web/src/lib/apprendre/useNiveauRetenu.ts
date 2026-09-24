'use client'

/**
 * Le niveau qu'on retient pour le joueur, lu comme la page du palier le lit.
 *
 * Même source (`/api/palier`, puis le test gardé dans le navigateur), même
 * arbitrage (`niveauRetenu`) : l'accueil et la page du palier doivent placer
 * le joueur sur le même palier, sinon l'un des deux ment.
 *
 * `undefined` tant qu'on ne sait pas, `null` quand on ne sait rien du joueur
 * — ni partie classée, ni puzzle, ni test.
 */

import { useEffect, useState } from 'react'
import { lireNiveauEstime, niveauRetenu, type NiveauEstime } from './palier.ts'

interface ReponsePalier {
  partie: { cote: number } | null
  puzzle: { cote: number } | null
}

export function useNiveauRetenu(): NiveauEstime | null | undefined {
  const [niveau, setNiveau] = useState<NiveauEstime | null | undefined>(undefined)

  useEffect(() => {
    let vivant = true
    const test = lireNiveauEstime()
    void fetch('/api/palier', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? (reponse.json() as Promise<ReponsePalier>) : null))
      .catch(() => null)
      .then((data) => {
        if (!vivant) return
        setNiveau(
          niveauRetenu({
            partie: data?.partie?.cote ?? null,
            puzzle: data?.puzzle?.cote ?? null,
            test,
          }),
        )
      })
    return () => {
      vivant = false
    }
  }, [])

  return niveau
}
