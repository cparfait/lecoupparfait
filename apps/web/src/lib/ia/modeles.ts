'use client'

/**
 * Liste des modèles d'un fournisseur, avec cache et repli.
 *
 * La stratégie tient en une règle : **ne jamais renvoyer une liste vide**. Un
 * sélecteur vide donne à croire que le fournisseur ne propose rien, alors que
 * la cause est presque toujours ailleurs — hors ligne, clé pas encore saisie,
 * Ollama éteint. On préfère une liste peut-être un peu datée à un menu mort.
 *
 * D'où l'ordre : appel réel, sinon cache, sinon liste de repli du fournisseur.
 */

import type { AIProvider, ModelInfo } from './types.ts'
import { appelModeles } from './transport.ts'

const cleCache = (providerId: string) => `coupparfait.ia.modeles.${providerId}`

function lireCache(providerId: string): ModelInfo[] | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(cleCache(providerId))
    if (!brut) return null
    const parsed = JSON.parse(brut) as ModelInfo[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

function ecrireCache(providerId: string, modeles: ModelInfo[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(cleCache(providerId), JSON.stringify(modeles))
  } catch {
    // Le cache est un confort, pas une nécessité.
  }
}

/** Trie du plus récent au plus ancien quand la date est connue. */
function trierParRecence(modeles: ModelInfo[]): ModelInfo[] {
  return [...modeles].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/**
 * Liste les modèles utilisables d'un fournisseur.
 *
 * Ne lève jamais : au pire, renvoie le cache, puis le repli statique.
 */
export async function fetchModels(provider: AIProvider, apiKey: string): Promise<ModelInfo[]> {
  if (provider.needsKey && !apiKey) {
    return lireCache(provider.id) ?? provider.fallbackModels
  }

  try {
    const brut = await appelModeles(
      provider,
      provider.modelsUrl(apiKey),
      provider.buildHeaders(apiKey),
    )
    const modeles = trierParRecence(provider.parseModels(brut))
    if (modeles.length > 0) {
      ecrireCache(provider.id, modeles)
      return modeles
    }
  } catch (error) {
    console.warn(`[ia] liste des modèles indisponible pour ${provider.id} :`, error)
  }

  return lireCache(provider.id) ?? provider.fallbackModels
}
