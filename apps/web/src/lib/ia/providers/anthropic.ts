/**
 * Fournisseur Anthropic (Claude) — endpoint `/v1/messages`.
 *
 * Ce qui le distingue du format OpenAI :
 *  - le prompt système est un champ **de premier niveau `system`**, et non un
 *    message de rôle `system` dans `messages` ;
 *  - l'authentification passe par `x-api-key` et non `Authorization: Bearer`,
 *    accompagnée d'un en-tête de version d'API obligatoire ;
 *  - la réponse est un tableau de blocs `content[]` : on concatène les blocs
 *    de texte.
 *
 * L'appel part du relais côté serveur, pas du navigateur : l'en-tête
 * `anthropic-dangerous-direct-browser-access` n'a donc pas lieu d'être.
 */

import type { AIProvider, ModelInfo } from '../types.ts'

/** Version de l'API Messages. Obligatoire sur chaque requête. */
const VERSION = '2023-06-01'

/**
 * Marge ajoutée au plafond de sortie, pour la même raison que chez les autres
 * fournisseurs — avec une nuance qui rend la marge *plus* nécessaire ici.
 *
 * Chez Anthropic, les tokens de réflexion sont décomptés de `max_tokens`, et
 * les modèles récents (génération 5) réfléchissent **par défaut** : il n'y a
 * rien à activer. Un budget serré, comme les 700 tokens qu'on demande pour
 * approfondir un coup, peut donc partir entièrement en réflexion et produire
 * une réponse vide, sans erreur HTTP pour le signaler.
 */
const THINKING_HEADROOM = 1024

interface ClaudeContentBlock {
  type?: string
  text?: string
}
interface ClaudeResponse {
  content?: ClaudeContentBlock[]
}
interface ClaudeModel {
  id?: string
  display_name?: string
  created_at?: string
}
interface ClaudeModelsResponse {
  data?: ClaudeModel[]
}

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic (Claude)',
  needsKey: true,

  chatUrl: () => 'https://api.anthropic.com/v1/messages',
  streamChatUrl: () => 'https://api.anthropic.com/v1/messages',
  modelsUrl: () => 'https://api.anthropic.com/v1/models',
  buildHeaders: (apiKey) => [
    ['Content-Type', 'application/json'],
    ['x-api-key', apiKey],
    ['anthropic-version', VERSION],
  ],

  buildBody: (messages, model, maxTokens, stream = false) => {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')
    const conversation = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }))
    return {
      model,
      max_tokens: maxTokens + THINKING_HEADROOM,
      stream,
      ...(system ? { system } : {}),
      messages: conversation,
    }
  },

  parseResponse: (raw) => {
    const response = raw as ClaudeResponse
    return (response.content ?? [])
      .filter((block) => block.type === 'text' || block.text != null)
      .map((block) => block.text ?? '')
      .join('')
      .trim()
  },

  parseStreamChunk: (line) => {
    // Flux SSE : des lignes `event: …` qu'on ignore, et des lignes `data: {…}`.
    if (!line.startsWith('data:')) return null
    try {
      const event = JSON.parse(line.slice(5).trim()) as {
        type?: string
        delta?: { text?: string }
      }
      return event.type === 'content_block_delta' ? (event.delta?.text ?? null) : null
    } catch {
      return null
    }
  },

  parseModels: (raw) => {
    const response = raw as ClaudeModelsResponse
    return (response.data ?? [])
      .map<ModelInfo>((model) => ({
        id: model.id ?? '',
        label: model.display_name || (model.id ?? ''),
        createdAt: model.created_at ? Date.parse(model.created_at) / 1000 : undefined,
      }))
      .filter((model) => model.id.length > 0)
  },

  // Repli au mieux, le temps que la clé soit saisie : la liste réelle vient de
  // `/v1/models` dès le premier appel réussi. Du plus capable au plus rapide.
  fallbackModels: [
    { id: 'claude-opus-5', label: 'Claude Opus 5' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  docsUrl: 'https://docs.claude.com/en/docs/about-claude/models/overview',
}
