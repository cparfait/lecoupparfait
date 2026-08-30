/**
 * Fournisseurs personnalisés — n'importe quel service compatible OpenAI ajouté
 * par l'utilisateur : Groq, xAI, Together, LM Studio, vLLM, une passerelle
 * d'entreprise, ou un Ollama qui n'écoute pas sur le port habituel.
 *
 * On ne stocke que le nom et l'URL de base ; la clé, comme celle des
 * fournisseurs intégrés, vit dans `cle.ts` et jamais dans les préférences.
 *
 * Les définitions sont conservées dans les préférences (`iaCustomProviders`) et
 * injectées ici par le composant qui les affiche. Les fournisseurs restent
 * volontairement en dehors du magasin d'état : autrement, `providers/index.ts`
 * importerait le magasin, qui importe les préférences, qui importent les
 * types — un cycle pour rien.
 */

import type { AIProvider } from '../types.ts'
import { urlEstLocale } from '../hote.ts'
import { makeOpenAICompatProvider } from './openai-compat.ts'

/** Définition conservée dans les préférences — la partie non secrète. */
export interface CustomProviderDef {
  /** Identifiant stable, sûr comme clé de stockage (`custom-xxxxxxxx`). */
  id: string
  /** Nom affiché dans les menus, choisi par l'utilisateur. */
  name: string
  /** Racine de l'API compatible OpenAI, ex. `https://api.groq.com/openai/v1`. */
  baseUrl: string
}

/** Fabrique un identifiant stable pour un nouveau fournisseur personnalisé. */
export function newCustomProviderId(): string {
  const alea =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10)
  return `custom-${alea}`
}

function buildProvider(def: CustomProviderDef): AIProvider {
  const base = def.baseUrl.trim().replace(/\/+$/, '')
  const inner = makeOpenAICompatProvider({
    id: def.id,
    name: def.name || 'Service compatible OpenAI',
    chatEndpoint: `${base}/chat/completions`,
    modelsEndpoint: `${base}/models`,
    fallbackModels: [],
    docsUrl: '',
  })

  return {
    ...inner,
    // Beaucoup de cibles locales (LM Studio, vLLM…) n'exigent aucune clé : on
    // ne bloque donc pas dessus, et l'en-tête d'autorisation n'est envoyé que
    // s'il y a effectivement une clé à envoyer.
    needsKey: false,
    custom: true,
    local: urlEstLocale(base),
    buildHeaders: (apiKey) => [
      ['Content-Type', 'application/json'],
      ...(apiKey ? ([['Authorization', `Bearer ${apiKey}`]] as Array<[string, string]>) : []),
    ],
  }
}

let providers: AIProvider[] = []

/** Reconstruit les fournisseurs personnalisés à partir de leurs définitions. */
export function setCustomProviders(defs: CustomProviderDef[]): void {
  providers = defs.map(buildProvider)
}

export function getCustomProviders(): AIProvider[] {
  return providers
}
