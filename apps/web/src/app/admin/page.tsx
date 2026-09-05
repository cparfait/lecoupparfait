'use client'

/**
 * Administration.
 *
 * Six onglets, dans l'ordre où l'on s'en sert : le **tableau de bord** (ce
 * qu'on regarde en arrivant), les **comptes** (c'est souvent pour eux qu'on
 * vient), les **contenus** (on y va quand quelque chose est signalé), le
 * **journal** (on le relit quand on se demande qui a fait quoi), le **système**
 * (une fois par mois, ou quand ça va mal), les **outils** (moins souvent
 * encore, mais il faut bien un endroit où voir qu'une dépendance a trois
 * versions de retard et qu'un paquet n'est crédité nulle part).
 *
 * **Elle n'existe pas pour qui n'y a pas droit.** Toutes les routes répondent
 * 404 plutôt que 403, et cette page se comporte pareil : sans droits, on voit
 * la page « introuvable » ordinaire. Distinguer « tu n'es pas administrateur »
 * de « cette page n'existe pas » apprendrait à un visiteur qu'il y a ici une
 * porte et un compte à trouver derrière.
 *
 * **L'onglet est dans l'adresse.** `#comptes` se met en favori, se recharge
 * sans revenir au tableau de bord, et survit au bouton « précédent » — trois
 * choses qu'un onglet gardé en mémoire seule fait perdre à chaque fois.
 */

import { useEffect, useState } from 'react'
import { Skeleton, EmptyState, SegmentedControl } from '@/components/ui/index.tsx'
import { Comptes } from './Comptes.tsx'
import { Contenus } from './Contenus.tsx'
import { Journal } from './Journal.tsx'
import { Outils } from './Outils.tsx'
import { Systeme } from './Systeme.tsx'
import { TableauDeBord } from './TableauDeBord.tsx'

const ONGLETS = [
  { value: 'bord', label: 'Tableau de bord' },
  { value: 'comptes', label: 'Comptes' },
  { value: 'contenus', label: 'Contenus' },
  { value: 'journal', label: 'Journal' },
  { value: 'systeme', label: 'Système' },
  { value: 'outils', label: 'Outils' },
] as const

type Onglet = (typeof ONGLETS)[number]['value']

function ongletValide(valeur: string): valeur is Onglet {
  return ONGLETS.some((onglet) => onglet.value === valeur)
}

export default function AdminPage() {
  const [onglet, setOnglet] = useState<Onglet>('bord')
  /** `undefined` tant qu'on ne sait pas, `false` = pas administrateur. */
  const [autorise, setAutorise] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    void fetch('/api/admin/sante', { cache: 'no-store' })
      .then((reponse) => setAutorise(reponse.ok))
      .catch(() => setAutorise(false))
  }, [])

  // Le fragment est lu après le montage et non pendant le rendu : le serveur ne
  // le reçoit jamais, et l'y lire ferait diverger le premier rendu du client de
  // celui du serveur.
  useEffect(() => {
    const lire = () => {
      const fragment = window.location.hash.slice(1)
      if (ongletValide(fragment)) setOnglet(fragment)
    }
    lire()
    window.addEventListener('hashchange', lire)
    return () => window.removeEventListener('hashchange', lire)
  }, [])

  if (autorise === undefined) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!autorise) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <EmptyState
          title="Cette page n’existe pas"
          description="Vérifie l’adresse, ou reviens à l’accueil."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Administration</h1>
      <p className="mt-1.5 text-sm text-muted">
        Ce que tu fais ici s’applique à de vraies personnes. Les actes irréversibles demandent
        d’écrire le pseudo, et tous sont consignés dans le journal.
      </p>

      {/* Six onglets ne tiennent pas dans 375 pixels : les libellés se
          coupaient, et « Système » sortait du cadre. On leur donne leur largeur
          et l'on fait glisser la bande — plutôt que d'abréger des intitulés,
          qui sont ici la seule indication de ce que chaque onglet contient. */}
      <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="min-w-[38rem] sm:min-w-0">
          <SegmentedControl
            value={onglet}
            onChange={(valeur: Onglet) => {
              setOnglet(valeur)
              // `replaceState` et non `push` : l'onglet n'est pas une étape de
              // navigation, et empiler six entrées d'historique obligerait à
              // cliquer six fois sur « précédent » pour quitter la page.
              window.history.replaceState(null, '', `#${valeur}`)
            }}
            options={[...ONGLETS]}
          />
        </div>
      </div>

      <div className="mt-5">
        {onglet === 'bord' && <TableauDeBord />}
        {onglet === 'comptes' && <Comptes />}
        {onglet === 'contenus' && <Contenus />}
        {onglet === 'journal' && <Journal />}
        {onglet === 'systeme' && <Systeme />}
        {onglet === 'outils' && <Outils />}
      </div>
    </div>
  )
}
