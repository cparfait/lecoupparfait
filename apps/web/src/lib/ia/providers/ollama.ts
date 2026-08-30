/**
 * Fournisseur Ollama — un modèle qui tourne sur la machine de l'utilisateur.
 *
 * C'est l'option qui va le mieux à ce projet : aucune clé, aucun compte, aucun
 * octet qui sort de la machine, et donc aucun coût. Le navigateur appelle
 * `http://localhost:11434` **directement**, sans passer par le serveur (voir
 * `transport.ts`).
 *
 * La liste des modèles (`/api/tags`) est celle des modèles réellement
 * téléchargés par l'utilisateur : une liste de repli statique n'aurait aucun
 * sens ici, on renvoie donc un tableau vide.
 *
 * Ollama refuse par défaut les requêtes venant d'une page web. Il faut
 * l'autoriser une fois pour toutes en lançant le service avec la variable
 * d'environnement `OLLAMA_ORIGINS` — l'interface le rappelle quand l'appel
 * échoue.
 */

import type { AIProvider, ModelInfo } from '../types.ts'

const BASE = 'http://localhost:11434'

/** Voir `openai-compat.ts` : marge pour les tokens de raisonnement. */
const THINKING_HEADROOM = 1024

interface OllamaChatResponse {
  message?: { content?: string }
}
interface OllamaTag {
  name?: string
  model?: string
}
interface OllamaTagsResponse {
  models?: OllamaTag[]
}

export const ollamaProvider: AIProvider = {
  id: 'ollama',
  name: 'Ollama (sur ta machine)',
  needsKey: false,
  local: true,

  chatUrl: () => `${BASE}/api/chat`,
  streamChatUrl: () => `${BASE}/api/chat`,
  modelsUrl: () => `${BASE}/api/tags`,
  buildHeaders: () => [['Content-Type', 'application/json']],

  buildBody: (messages, model, maxTokens, stream = false) => ({
    model,
    messages, // Ollama accepte le rôle `system` tel quel.
    stream,
    options: { num_predict: maxTokens + THINKING_HEADROOM },
  }),

  parseResponse: (raw) => {
    const response = raw as OllamaChatResponse
    return (response.message?.content ?? '').trim()
  },

  parseStreamChunk: (line) => {
    // NDJSON : chaque ligne est un objet complet, sans préfixe `data:`.
    try {
      const chunk = JSON.parse(line) as OllamaChatResponse
      return chunk.message?.content ?? null
    } catch {
      return null
    }
  },

  parseModels: (raw) => {
    const response = raw as OllamaTagsResponse
    return (response.models ?? [])
      .map<ModelInfo>((model) => ({
        id: model.name ?? model.model ?? '',
        label: model.name ?? model.model ?? '',
      }))
      .filter((model) => model.id.length > 0)
  },

  // Dépend de ce que l'utilisateur a installé : aucun repli possible.
  fallbackModels: [],
  docsUrl: 'https://ollama.com/library',
}
