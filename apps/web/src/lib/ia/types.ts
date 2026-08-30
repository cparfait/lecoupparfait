/**
 * Couche d'abstraction des fournisseurs d'IA.
 *
 * L'assistant est **facultatif** : Le Coup Parfait explique déjà chaque coup
 * sans le moindre appel réseau (`explainMove`, dans `@coupparfait/core`). Ce
 * qu'on ajoute ici, c'est la possibilité pour qui le souhaite de brancher son
 * propre compte — OpenAI, Anthropic, Google, Mistral, ou un modèle local via
 * Ollama — pour approfondir une explication et poser des questions libres.
 *
 * Le principe de conception, repris de `cparfait/lmustatsviewer` d'où cette
 * couche est portée : **le serveur ne connaît aucun fournisseur**. Chaque
 * fournisseur construit ici une requête générique (URL + en-têtes + corps) que
 * le transport se contente de relayer. Ajouter un fournisseur = ajouter un
 * fichier dans `providers/`, sans toucher à quoi que ce soit d'autre.
 */

export type AIRole = 'system' | 'user' | 'assistant'

export interface AIMessage {
  role: AIRole
  content: string
}

/** Un modèle proposé dans le sélecteur des préférences. */
export interface ModelInfo {
  id: string
  /** Libellé affichable (nom donné par l'API si elle en fournit un, sinon = id). */
  label: string
  /** Date de création (epoch s) si l'API la fournit — sert au tri par récence. */
  createdAt?: number
  /** Fenêtre de contexte en tokens si connue (Google la donne). */
  contextTokens?: number
}

export interface AIProvider {
  /** Identifiant interne stable, utilisé comme clé de préférence et de stockage. */
  id: string
  /** Nom affichable. */
  name: string
  /** Faux pour Ollama (local, aucune clé requise). */
  needsKey: boolean
  /**
   * Fournisseur personnalisé, défini par l'utilisateur. Sa clé est rangée sous
   * son propre identifiant, comme celle des fournisseurs intégrés.
   */
  custom?: boolean
  /**
   * Vrai quand le service tourne sur la machine de l'utilisateur. Le transport
   * s'en sert pour appeler **directement** depuis le navigateur au lieu de
   * passer par le relais : un modèle local n'a aucune raison de faire un
   * détour par le serveur, et souvent le serveur ne peut pas l'atteindre.
   */
  local?: boolean

  /** URL complète de l'appel chat (Google y intègre le modèle et la clé). */
  chatUrl(model: string, apiKey: string): string
  /** URL de l'appel chat en flux (Google utilise `streamGenerateContent`). */
  streamChatUrl(model: string, apiKey: string): string
  /** URL de la liste des modèles (la clé peut être en paramètre, ex. Google). */
  modelsUrl(apiKey: string): string
  /** En-têtes HTTP (Authorization, Content-Type, etc.). */
  buildHeaders(apiKey: string): Array<[string, string]>
  /** Corps JSON de la requête chat. `stream` active le flux côté fournisseur. */
  buildBody(
    messages: AIMessage[],
    model: string,
    maxTokens: number,
    stream?: boolean,
  ): unknown

  /** Extrait le texte de la réponse chat (hors flux). */
  parseResponse(raw: unknown): string
  /** Extrait le texte d'une ligne de flux (SSE ou NDJSON). `null` si pas de texte. */
  parseStreamChunk(line: string): string | null
  /** Normalise la réponse de la liste des modèles. */
  parseModels(raw: unknown): ModelInfo[]

  /** Liste statique de repli si l'appel à `/models` échoue (hors ligne, 401…). */
  fallbackModels: ModelInfo[]
  /**
   * Lien vers la liste officielle des modèles du fournisseur.
   *
   * Les catalogues bougent vite partout : plutôt qu'une liste figée à maintenir
   * dans ce dépôt, l'interface renvoie l'utilisateur à la source à jour, où il
   * peut lire l'identifiant exact et le recopier.
   */
  docsUrl: string
  /**
   * Vrai si l'identifiant correspond à une génération retirée par le
   * fournisseur. Sert à alerter dans les préférences : un modèle choisi il y a
   * des mois reste enregistré et n'échoue qu'au premier appel, sans le moindre
   * indice sur la cause.
   *
   * Facultatif : à n'implémenter que pour les fournisseurs qui retirent
   * franchement leurs anciennes générations (Google). Un motif incomplet ne
   * produit jamais de faux positif — au pire, pas d'avertissement.
   */
  isRetiredModel?(id: string): boolean
}
