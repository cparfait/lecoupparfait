/**
 * Registre des fournisseurs d'IA.
 *
 * L'ordre de cette liste est celui des préférences. On ouvre sur OpenRouter et
 * Ollama : le premier propose des modèles gratuits, le second ne demande ni
 * clé ni compte ni connexion. Ce sont les deux seules façons d'essayer
 * l'assistant sans rien payer, elles méritent d'être vues en premier.
 */

import type { AIProvider } from '../types.ts'
import { anthropicProvider } from './anthropic.ts'
import { googleProvider } from './google.ts'
import { ollamaProvider } from './ollama.ts'
import { getCustomProviders } from './custom.ts'
import {
  deepseekProvider,
  mistralProvider,
  openaiProvider,
  openrouterProvider,
} from './openai-compat.ts'

/** Fournisseurs intégrés. Les personnalisés viennent s'y ajouter. */
export const PROVIDERS: AIProvider[] = [
  ollamaProvider,
  openrouterProvider,
  anthropicProvider,
  openaiProvider,
  googleProvider,
  mistralProvider,
  deepseekProvider,
]

/** Intégrés et personnalisés réunis, pour les menus de sélection. */
export function allProviders(): AIProvider[] {
  return [...PROVIDERS, ...getCustomProviders()]
}

export function getProvider(id: string): AIProvider | undefined {
  return allProviders().find((provider) => provider.id === id)
}
