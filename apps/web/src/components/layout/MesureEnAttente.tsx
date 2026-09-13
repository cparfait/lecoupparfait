'use client'

/**
 * Le test de niveau passé avant d'avoir un compte, repris au moment où il y en
 * a un.
 *
 * ── Ce que ça répare ─────────────────────────────────────────────────────────
 *
 * Le test marche sans compte — c'est délibéré, et l'écran d'inscription y
 * envoie lui-même ceux qui ne savent pas quel niveau déclarer. Mais sa mesure
 * n'amorce le classement que pour un compte connecté : quelqu'un qui se
 * mesurait à 1 400 *puis* s'inscrivait repartait de 100, et sa mesure ne vivait
 * plus que dans son navigateur. **L'ordre recommandé par l'application était
 * celui qui perdait le résultat.**
 *
 * Ce composant ne rend rien. Il attend de savoir qui est connecté, regarde s'il
 * reste un relevé en attente, et l'envoie une fois. Le serveur en fait ce qu'il
 * en fait — il le recoupe, le mesure et amorce ce qui n'a jamais servi.
 *
 * ── Pourquoi ici et pas à l'inscription ─────────────────────────────────────
 *
 * Parce que ce n'est pas le seul chemin : on peut se mesurer puis se connecter
 * à un compte qui existait déjà, ou fermer l'onglet entre les deux. Dans la
 * coque, le cas est couvert quel que soit le détour. Le coût est nul quand il
 * n'y a rien à reprendre : on ne lit que le stockage local avant de décider.
 */

import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/Toast.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { lireReleveEnAttente, oublierReleveEnAttente } from '@/lib/apprendre/palier.ts'

export function MesureEnAttente() {
  const identite = useIdentite()
  const t = useT()
  /** Une seule tentative par chargement, quoi qu'il arrive ensuite. */
  const tentee = useRef(false)

  useEffect(() => {
    // `undefined` = on ne sait pas encore qui est connecté. `null` = personne,
    // et le relevé attend alors son tour sans qu'on touche à rien.
    if (!identite || tentee.current) return
    const releve = lireReleveEnAttente()
    if (!releve) return
    tentee.current = true

    void fetch('/api/niveau', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positions: releve.positions }),
    })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((donnees: { partie?: number; enregistre?: boolean } | null) => {
        // Un relevé refusé — positions inconnues, escalier incohérent, test
        // trop vieux — ne sera pas accepté davantage demain : on l'oublie
        // plutôt que de le représenter à chaque chargement.
        oublierReleveEnAttente()
        if (!donnees?.enregistre || !donnees.partie) return
        toast.success(t('level.pickedUp'), t('level.pickedUpHint', { elo: donnees.partie }))
      })
      .catch(() => {
        // Réseau coupé : le relevé reste en attente, et le prochain chargement
        // réessaiera. C'est le seul cas où le garder a un sens.
        tentee.current = false
      })
  }, [identite, t])

  return null
}
