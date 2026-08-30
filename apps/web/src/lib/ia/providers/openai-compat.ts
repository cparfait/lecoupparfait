/**
 * Fabrique de fournisseurs compatibles OpenAI (`/chat/completions`).
 *
 * OpenAI, DeepSeek, Mistral et OpenRouter partagent le même format de requête,
 * de réponse et de liste de modèles : un seul code paramétré par l'URL de base,
 * le nom et la liste de repli suffit pour les quatre.
 *
 * C'est aussi ce format que parlent la plupart des passerelles locales et
 * d'entreprise — d'où sa réutilisation par `custom.ts` pour les fournisseurs
 * ajoutés à la main.
 */

import type { AIProvider, ModelInfo } from '../types.ts'

interface OAChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}
interface OAStreamChunk {
  choices?: Array<{ delta?: { content?: string } }>
}
interface OAModel {
  id?: string
  created?: number
}
interface OAModelsResponse {
  data?: OAModel[]
}

/** Exclut les modèles non conversationnels (plongements, audio, image…). */
const NON_CHAT = /embedding|whisper|tts|dall|moderation|audio|realtime|image|vision-?embed|rerank/i

/**
 * Marge ajoutée au plafond de sortie pour les tokens de raisonnement.
 *
 * Les modèles qui « réfléchissent » avant de répondre décomptent cette
 * réflexion du plafond de sortie. Avec un budget serré, ils dépensent tout en
 * raisonnement et renvoient un contenu **vide** — un échec silencieux, sans
 * message d'erreur, très difficile à diagnostiquer depuis l'interface.
 *
 * C'est un plafond, pas une cible : la longueur réelle de la réponse reste
 * dictée par le prompt.
 */
const THINKING_HEADROOM = 1024

interface OpenAICompatConfig {
  id: string
  name: string
  chatEndpoint: string
  modelsEndpoint: string
  fallbackModels: ModelInfo[]
  docsUrl: string
  /** Filtre facultatif des identifiants, en plus de l'exclusion non-chat. */
  modelFilter?: (id: string) => boolean
  /**
   * Nom du champ de plafond de sortie.
   *
   * OpenAI a déprécié `max_tokens` : ses modèles de raisonnement le
   * **rejettent** avec une erreur 400 `unsupported_parameter`, alors que
   * `max_completion_tokens` est accepté par tous ses modèles actuels. Les
   * autres services compatibles ne connaissent pas forcément le nouveau nom,
   * `max_tokens` reste donc le défaut.
   */
  maxTokensField?: 'max_tokens' | 'max_completion_tokens'
}

export function makeOpenAICompatProvider(config: OpenAICompatConfig): AIProvider {
  return {
    id: config.id,
    name: config.name,
    needsKey: true,

    chatUrl: () => config.chatEndpoint,
    streamChatUrl: () => config.chatEndpoint,
    modelsUrl: () => config.modelsEndpoint,
    buildHeaders: (apiKey) => [
      ['Content-Type', 'application/json'],
      ['Authorization', `Bearer ${apiKey}`],
    ],

    buildBody: (messages, model, maxTokens, stream = false) => ({
      model,
      messages, // les rôles system/user/assistant sont acceptés tels quels
      [config.maxTokensField ?? 'max_tokens']: maxTokens + THINKING_HEADROOM,
      stream,
    }),

    parseResponse: (raw) => {
      const response = raw as OAChatResponse
      return (response.choices?.[0]?.message?.content ?? '').trim()
    },

    parseStreamChunk: (line) => {
      if (!line.startsWith('data:')) return null
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return null
      try {
        const chunk = JSON.parse(payload) as OAStreamChunk
        return chunk.choices?.[0]?.delta?.content ?? null
      } catch {
        return null
      }
    },

    parseModels: (raw) => {
      const response = raw as OAModelsResponse
      return (response.data ?? [])
        .filter((model) => {
          const id = model.id ?? ''
          if (id.length === 0 || NON_CHAT.test(id)) return false
          return config.modelFilter ? config.modelFilter(id) : true
        })
        .map<ModelInfo>((model) => ({
          id: model.id ?? '',
          label: model.id ?? '',
          createdAt: model.created,
        }))
    },

    fallbackModels: config.fallbackModels,
    docsUrl: config.docsUrl,
  }
}

export const openaiProvider = makeOpenAICompatProvider({
  id: 'openai',
  name: 'OpenAI (GPT)',
  chatEndpoint: 'https://api.openai.com/v1/chat/completions',
  modelsEndpoint: 'https://api.openai.com/v1/models',
  // Ne garde que les familles conversationnelles connues. La liste réelle vient
  // de l'API dès que la clé est saisie ; ceci n'est que le filtre d'affichage.
  modelFilter: (id) => /^(gpt-|o\d|chatgpt)/i.test(id),
  fallbackModels: [
    { id: 'gpt-5-mini', label: 'gpt-5-mini' },
    { id: 'gpt-5.2', label: 'gpt-5.2' },
    { id: 'gpt-5.5', label: 'gpt-5.5' },
  ],
  docsUrl: 'https://platform.openai.com/docs/models',
  maxTokensField: 'max_completion_tokens',
})

export const deepseekProvider = makeOpenAICompatProvider({
  id: 'deepseek',
  name: 'DeepSeek',
  chatEndpoint: 'https://api.deepseek.com/chat/completions',
  modelsEndpoint: 'https://api.deepseek.com/models',
  fallbackModels: [
    { id: 'deepseek-chat', label: 'deepseek-chat (V3)' },
    { id: 'deepseek-reasoner', label: 'deepseek-reasoner (R1)' },
  ],
  docsUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
})

export const mistralProvider = makeOpenAICompatProvider({
  id: 'mistral',
  name: 'Mistral',
  chatEndpoint: 'https://api.mistral.ai/v1/chat/completions',
  modelsEndpoint: 'https://api.mistral.ai/v1/models',
  fallbackModels: [
    { id: 'mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium' },
  ],
  docsUrl: 'https://docs.mistral.ai/getting-started/models/models_overview/',
})

/**
 * OpenRouter : passerelle vers des centaines de modèles, dont plusieurs
 * gratuits (suffixés `:free`). C'est la porte d'entrée la moins coûteuse pour
 * essayer l'assistant sans sortir sa carte bancaire.
 */
export const openrouterProvider = makeOpenAICompatProvider({
  id: 'openrouter',
  name: 'OpenRouter',
  chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  modelsEndpoint: 'https://openrouter.ai/api/v1/models',
  fallbackModels: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (gratuit)' },
    { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (gratuit)' },
  ],
  docsUrl: 'https://openrouter.ai/models',
})
