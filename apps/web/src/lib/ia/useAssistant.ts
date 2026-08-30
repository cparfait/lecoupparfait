'use client'

/**
 * Accès à l'assistant depuis l'interface.
 *
 * Regroupe en un seul endroit les quatre réglages dispersés qu'il faut réunir
 * pour poser une question — fournisseur, modèle, clé, longueur — et surtout la
 * réponse à la seule question que se posent les composants appelants : est-ce
 * que l'assistant est utilisable, là, maintenant ?
 *
 * Sans ce point unique, chaque composant réimplémenterait le même test en
 * trois lignes, et l'un d'eux finirait par en oublier une — typiquement la
 * clé, qui n'est pas dans les préférences.
 */

import { useCallback, useEffect, useState } from 'react'
import { usePreferences } from '@/lib/store/preferences.ts'
import { getProvider } from './providers/index.ts'
import { setCustomProviders } from './providers/custom.ts'
import { getCle } from './cle.ts'
import { demanderEnFlux, messageErreur } from './coach.ts'
import type { AIMessage } from './types.ts'

export interface Assistant {
  /** Vrai si une question peut réellement partir. */
  disponible: boolean
  /** Nom du fournisseur configuré, pour l'afficher. `null` si aucun. */
  nomFournisseur: string | null
  /**
   * Pose une question et renvoie la réponse complète.
   *
   * `onFragment` est appelé au fil de l'eau : c'est ce qui permet d'afficher
   * la réponse pendant qu'elle s'écrit plutôt qu'après.
   */
  demander: (options: {
    historique: AIMessage[]
    onFragment: (texte: string) => void
  }) => Promise<string>
}

export function useAssistant(): Assistant {
  const enabled = usePreferences((state) => state.iaEnabled)
  const providerId = usePreferences((state) => state.iaProvider)
  const model = usePreferences((state) => state.iaModel)
  const maxTokens = usePreferences((state) => state.iaMaxTokens)
  const customDefs = usePreferences((state) => state.iaCustomProviders)
  const locale = usePreferences((state) => state.locale)

  // Les fournisseurs personnalisés vivent dans les préférences ; le registre,
  // lui, est un module. Il faut donc le réalimenter à chaque montage — sans
  // quoi un fournisseur ajouté par l'utilisateur resterait introuvable partout
  // sauf sur la page des préférences.
  const signature = JSON.stringify(customDefs)
  useEffect(() => {
    setCustomProviders(customDefs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const [pret, setPret] = useState(false)
  useEffect(() => {
    // La clé est lue depuis le stockage local : inaccessible au rendu serveur,
    // d'où le passage par un effet pour éviter une divergence d'hydratation.
    if (!enabled || !providerId || !model) {
      setPret(false)
      return
    }
    const provider = getProvider(providerId)
    if (!provider) {
      setPret(false)
      return
    }
    setPret(!provider.needsKey || getCle(providerId).length > 0)
  }, [enabled, providerId, model, signature])

  const provider = enabled ? getProvider(providerId) : undefined

  const demander = useCallback(
    async ({
      historique,
      onFragment,
    }: {
      historique: AIMessage[]
      onFragment: (texte: string) => void
    }) => {
      const courant = getProvider(providerId)
      if (!courant) throw new Error('Aucun fournisseur configuré.')
      try {
        return await demanderEnFlux({
          provider: courant,
          model,
          apiKey: getCle(courant.id),
          locale,
          messages: historique,
          maxTokens,
          onFragment,
        })
      } catch (erreur) {
        throw new Error(messageErreur(erreur))
      }
    },
    [providerId, model, locale, maxTokens],
  )

  return {
    disponible: pret,
    nomFournisseur: provider?.name ?? null,
    demander,
  }
}
