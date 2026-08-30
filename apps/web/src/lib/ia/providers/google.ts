/**
 * Fournisseur Google (Gemini) — API `generateContent`.
 *
 * Ce qui le distingue du format OpenAI :
 *  - le modèle **et** la clé sont dans l'URL, ni dans le corps ni dans les
 *    en-têtes ;
 *  - le prompt système est un champ dédié `systemInstruction` ;
 *  - le rôle `assistant` s'appelle `model` ;
 *  - la liste des modèles expose `supportedGenerationMethods` : on filtre sur
 *    ceux qui savent réellement répondre à `generateContent`.
 */

import type { AIProvider, ModelInfo } from '../types.ts'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** Voir `openai-compat.ts` : marge pour les tokens de raisonnement. */
const THINKING_HEADROOM = 1024

interface GeminiPart {
  text?: string
}
interface GeminiContent {
  role?: string
  parts?: GeminiPart[]
}
interface GeminiResponse {
  candidates?: Array<{ content?: GeminiContent }>
}
interface GeminiModel {
  name?: string
  displayName?: string
  inputTokenLimit?: number
  supportedGenerationMethods?: string[]
}
interface GeminiModelsResponse {
  models?: GeminiModel[]
}

export const googleProvider: AIProvider = {
  id: 'google',
  name: 'Google (Gemini)',
  needsKey: true,

  chatUrl: (model, apiKey) =>
    `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,

  streamChatUrl: (model, apiKey) =>
    `${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,

  modelsUrl: (apiKey) => `${BASE}/models?key=${encodeURIComponent(apiKey)}`,

  buildHeaders: () => [['Content-Type', 'application/json']],

  buildBody: (messages, _model, maxTokens) => {
    const systemText = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')
    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }))
    return {
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      contents,
      generationConfig: { maxOutputTokens: maxTokens + THINKING_HEADROOM },
    }
  },

  parseResponse: (raw) => {
    const response = raw as GeminiResponse
    const parts = response.candidates?.[0]?.content?.parts ?? []
    return parts
      .map((part) => part.text ?? '')
      .join('')
      .trim()
  },

  parseStreamChunk: (line) => {
    if (!line.startsWith('data:')) return null
    try {
      const response = JSON.parse(line.slice(5).trim()) as GeminiResponse
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const text = parts.map((part) => part.text ?? '').join('')
      return text || null
    } catch {
      return null
    }
  },

  parseModels: (raw) => {
    const response = raw as GeminiModelsResponse
    return (response.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map<ModelInfo>((model) => ({
        id: (model.name ?? '').replace(/^models\//, ''),
        label: model.displayName || (model.name ?? '').replace(/^models\//, ''),
        contextTokens: model.inputTokenLimit,
      }))
      .filter((model) => model.id.length > 0)
  },

  // Repli au mieux, en attendant la clé. À garder à jour : Google retire vite
  // ses générations précédentes, et un modèle retiré échoue en 404 sans dire
  // pourquoi. La liste réelle vient de `/models` dès que la clé est saisie.
  fallbackModels: [
    { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  ],
  docsUrl: 'https://ai.google.dev/gemini-api/docs/models',

  // Générations 1.x et 2.x : arrêtées ou en cours de retrait.
  isRetiredModel: (id) => /^(models\/)?gemini-[012](\D|$)/i.test(id.trim()),
}
