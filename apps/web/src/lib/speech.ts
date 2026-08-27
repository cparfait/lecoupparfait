'use client'

/**
 * Synthèse vocale du coach.
 *
 * On utilise l'API `SpeechSynthesis` du navigateur : elle est gratuite, ne
 * transmet rien à un serveur, fonctionne hors ligne, et propose des voix
 * françaises correctes sur toutes les plateformes modernes. Aucune clé d'API,
 * aucun coût, aucune fuite de données — cohérent avec la promesse du projet.
 *
 * Deux difficultés à gérer :
 *  - le catalogue de voix arrive **de façon asynchrone** sur certains
 *    navigateurs ; il faut donc écouter `voiceschanged` ;
 *  - la notation d'échecs se prononce très mal telle quelle. On la transforme
 *    en amont (« Cf3 » → « cavalier f 3 »), ce que fait `@coupparfait/core`.
 */

import { sanToSpeech } from '@coupparfait/core'
import { getPreferences } from './store/preferences.ts'

export interface VoiceOption {
  name: string
  lang: string
  localService: boolean
  isDefault: boolean
}

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesResolved: Promise<SpeechSynthesisVoice[]> | null = null

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

export function isSpeechSupported(): boolean {
  return synth() !== null && typeof window.SpeechSynthesisUtterance !== 'undefined'
}

/**
 * Attend que le catalogue de voix soit disponible.
 *
 * Chrome renvoie une liste vide au premier appel et la remplit plus tard ;
 * Firefox et Safari la donnent tout de suite. On gère les deux, avec un délai
 * de garde pour ne pas attendre indéfiniment si l'événement n'arrive jamais.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesResolved) return voicesResolved

  voicesResolved = new Promise((resolve) => {
    const speech = synth()
    if (!speech) {
      resolve([])
      return
    }

    const immediate = speech.getVoices()
    if (immediate.length > 0) {
      cachedVoices = immediate
      resolve(immediate)
      return
    }

    const timeout = setTimeout(() => {
      cachedVoices = speech.getVoices()
      resolve(cachedVoices)
    }, 1500)

    speech.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(timeout)
        cachedVoices = speech.getVoices()
        resolve(cachedVoices)
      },
      { once: true },
    )
  })

  return voicesResolved
}

/**
 * Voix disponibles pour une langue, les meilleures d'abord.
 *
 * On privilégie les voix **locales** : elles répondent instantanément et ne
 * partent pas sur un serveur distant. Les voix « premium » installées sur le
 * système sonnent nettement mieux et remontent en tête.
 */
export async function listVoices(locale: 'fr' | 'en'): Promise<VoiceOption[]> {
  const voices = await loadVoices()
  const prefix = locale === 'fr' ? 'fr' : 'en'

  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith(prefix))
    .sort((a, b) => {
      // Local avant distant, puis les voix de qualité supérieure, puis A→Z.
      if (a.localService !== b.localService) return a.localService ? -1 : 1
      const aPremium = /premium|enhanced|neural|natural|siri/i.test(a.name)
      const bPremium = /premium|enhanced|neural|natural|siri/i.test(b.name)
      if (aPremium !== bPremium) return aPremium ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((voice) => ({
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      isDefault: voice.default,
    }))
}

function pickVoice(locale: 'fr' | 'en', preferred: string | null): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) cachedVoices = synth()?.getVoices() ?? []
  if (cachedVoices.length === 0) return null

  if (preferred) {
    const exact = cachedVoices.find((voice) => voice.name === preferred)
    if (exact) return exact
  }

  const prefix = locale === 'fr' ? 'fr' : 'en'
  const candidates = cachedVoices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(prefix),
  )
  if (candidates.length === 0) return null

  return (
    candidates.find((voice) => voice.localService && /premium|enhanced|neural|natural/i.test(voice.name)) ??
    candidates.find((voice) => voice.localService) ??
    candidates[0]!
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Élocution
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Interrompt ce qui est en cours. Par défaut : oui. */
  interrupt?: boolean
  /** Débit et hauteur, sinon ceux des préférences. */
  rate?: number
  pitch?: number
  onEnd?: () => void
  onStart?: () => void
}

let currentUtterance: SpeechSynthesisUtterance | null = null

/**
 * Numéro de la demande d'élocution en cours.
 *
 * Sert à annuler une phrase mise en attente : si le catalogue de voix met une
 * seconde à arriver et qu'entre-temps l'apprenant a changé d'étape, il ne faut
 * surtout pas prononcer la phrase périmée.
 */
let speechToken = 0

/**
 * Phrase à reprendre dès la première interaction.
 *
 * Les navigateurs refusent de parler tant que l'utilisateur n'a rien touché sur
 * la page. C'est exactement le cas d'un message d'introduction : il arrive au
 * chargement, donc il est refusé en silence. On le garde de côté et on le
 * rejoue au premier clic ou à la première touche.
 */
let pendingSpeech: { text: string; options: SpeakOptions; token: number } | null = null
let unlockInstalled = false

/**
 * Installe l'écoute de la première interaction.
 *
 * Une seule fois par page, et sur les trois événements qui débloquent l'audio
 * selon les navigateurs.
 */
function armUnlock(): void {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true

  const release = () => {
    const waiting = pendingSpeech
    pendingSpeech = null
    if (!waiting || waiting.token !== speechToken) return
    utter(waiting.text, waiting.options)
  }

  for (const event of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(event, release, { passive: true })
  }
}

/**
 * Prononce un texte. Sans effet si la voix est désactivée.
 *
 * Deux obstacles sont traités ici plutôt que chez l'appelant :
 *  - Chrome renvoie un catalogue de voix vide au tout premier appel, et parler
 *    à ce moment-là ne produit **aucun son** ; on attend donc les voix ;
 *  - tant que l'utilisateur n'a rien touché sur la page, le navigateur refuse
 *    de parler ; on garde alors la phrase pour la première interaction.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const speech = synth()
  const prefs = getPreferences()
  if (!speech || !prefs.voiceEnabled || !text.trim()) return

  if (options.interrupt !== false) speech.cancel()

  const token = ++speechToken
  pendingSpeech = null

  if (speech.getVoices().length === 0) {
    void loadVoices().then(() => {
      // Une autre phrase a été demandée entre-temps : celle-ci est périmée.
      if (token !== speechToken) return
      utter(text, options)
    })
    return
  }

  utter(text, options)
}

/** Émission effective, une fois les voix disponibles. */
function utter(text: string, options: SpeakOptions): void {
  const speech = synth()
  const prefs = getPreferences()
  if (!speech || !prefs.voiceEnabled) return

  // La voix neuronale prend la main quand elle est disponible ; en cas d'échec
  // elle rappelle `utterSystem`, pour qu'un serveur momentanément indisponible
  // ne rende pas le coach muet. On ne teste pas `neuralState` ici : c'est
  // `speakNeural` qui décide, et qui réessaie si la dernière interrogation
  // datait d'un moment où le serveur ne répondait pas encore.
  if (prefs.voiceEngine === 'neural') {
    void speakNeural(text, options)
    return
  }

  utterSystem(text, options)
}

/** Élocution par la synthèse du navigateur. */
function utterSystem(text: string, options: SpeakOptions): void {
  const speech = synth()
  const prefs = getPreferences()
  if (!speech || !prefs.voiceEnabled) return

  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text))
  utterance.lang = prefs.locale === 'fr' ? 'fr-FR' : 'en-GB'
  utterance.rate = options.rate ?? prefs.voiceRate
  utterance.pitch = options.pitch ?? prefs.voicePitch
  utterance.volume = 1

  const voice = pickVoice(prefs.locale, prefs.voiceName)
  if (voice) utterance.voice = voice

  const token = speechToken
  let started = false

  utterance.onstart = () => {
    started = true
    options.onStart?.()
  }
  utterance.onend = () => {
    currentUtterance = null
    options.onEnd?.()
  }
  utterance.onerror = (event) => {
    currentUtterance = null

    // « not-allowed » : la page n'a pas encore été touchée. On garde la phrase
    // pour la rejouer au premier clic plutôt que de la perdre.
    if (!started && event.error === 'not-allowed') {
      pendingSpeech = { text, options, token }
      armUnlock()
      return
    }
    // « interrupted » / « canceled » : une autre phrase a pris la place, ce
    // n'est pas une panne — mais l'appelant attend quand même sa notification.
    options.onEnd?.()
  }

  currentUtterance = utterance
  speech.speak(utterance)

  // Filet de sécurité : certains navigateurs n'émettent ni `start` ni `error`
  // quand ils refusent de parler. Si rien n'a démarré, on considère la phrase
  // comme bloquée et on l'arme pour la première interaction.
  armUnlock()
  setTimeout(() => {
    if (started || token !== speechToken) return
    if (speech.speaking || speech.pending) return
    pendingSpeech = { text, options, token }
  }, 350)
}

/** Annonce un coup joué : « cavalier f 3 ». */
export function speakMove(san: string, options: SpeakOptions = {}): void {
  const prefs = getPreferences()
  speak(sanToSpeech(san, prefs.locale), options)
}

/** Enchaîne plusieurs phrases avec une respiration entre chacune. */
export function speakSequence(parts: string[], options: SpeakOptions = {}): void {
  const queue = parts.filter(Boolean)
  if (queue.length === 0) return

  let index = 0
  const next = () => {
    if (index >= queue.length) {
      options.onEnd?.()
      return
    }
    const part = queue[index++]!
    speak(part, {
      ...options,
      // Seule la première phrase interrompt ce qui précède.
      interrupt: index === 1 ? options.interrupt !== false : false,
      onEnd: next,
    })
  }
  next()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voix neuronale (Piper, côté serveur)
// ─────────────────────────────────────────────────────────────────────────────

export interface NeuralVoice {
  id: string
  label: string
  lang: string
  language: string
  quality: string
}

let neuralState: 'unknown' | 'ready' | 'absent' = 'unknown'
let neuralVoices: NeuralVoice[] = []
let neuralProbe: Promise<NeuralVoice[]> | null = null

/** Horodatage de la dernière interrogation, pour espacer les nouvelles tentatives. */
let neuralProbedAt = 0

/**
 * Délai avant de réessayer après un échec.
 *
 * Le premier appel part au chargement de la page, parfois avant que le serveur
 * ne réponde. Sans nouvelle tentative, un simple contretemps au démarrage
 * condamnait la voix neuronale **pour toute la session**, sans que rien ne
 * l'indique : on entendait la voix du navigateur en croyant écouter l'autre.
 */
const NEURAL_RETRY_MS = 15_000

/** Lecteur unique : une seule voix à la fois, et `stopSpeaking` sait la couper. */
let audio: HTMLAudioElement | null = null

/**
 * Interroge le serveur une fois pour connaître les voix installées.
 *
 * L'absence de voix n'est pas une erreur : beaucoup d'installations n'auront
 * pas Piper, et l'application doit rester identique pour elles.
 */
export function loadNeuralVoices(): Promise<NeuralVoice[]> {
  // Un succès vaut pour toute la session ; un échec ne vaut que quinze secondes.
  const recent = Date.now() - neuralProbedAt < NEURAL_RETRY_MS
  if (neuralProbe && (neuralState === 'ready' || recent)) return neuralProbe

  neuralProbedAt = Date.now()
  neuralProbe = (async () => {
    try {
      const response = await fetch('/api/voix', { cache: 'no-store' })
      if (!response.ok) throw new Error('indisponible')
      const data = (await response.json()) as { available?: boolean; voices?: NeuralVoice[] }
      neuralVoices = data.voices ?? []
      neuralState = data.available && neuralVoices.length > 0 ? 'ready' : 'absent'
    } catch {
      neuralState = 'absent'
      neuralVoices = []
    }
    return neuralVoices
  })()

  return neuralProbe
}

/** Voix neuronales connues, sans relancer d'interrogation. */
export function knownNeuralVoices(): NeuralVoice[] {
  return neuralVoices
}

export function isNeuralAvailable(): boolean {
  return neuralState === 'ready'
}

/**
 * Prononce un texte avec la voix neuronale.
 *
 * Tout échec — serveur absent, synthèse trop lente, lecture refusée — rend la
 * parole à la synthèse du navigateur. Le coach ne se tait jamais parce qu'une
 * amélioration facultative n'a pas fonctionné.
 */
async function speakNeural(text: string, options: SpeakOptions): Promise<void> {
  const token = speechToken
  const prefs = getPreferences()

  if (neuralState !== 'ready') await loadNeuralVoices()
  if (token !== speechToken) return
  if (neuralState !== 'ready') {
    utterSystem(text, options)
    return
  }

  try {
    const url = await fetchClip(text)
    if (token !== speechToken) return

    stopAudio()
    const player = new Audio(url)
    player.volume = 1
    audio = player

    const finish = () => {
      if (audio === player) audio = null
      options.onEnd?.()
    }
    player.onended = finish
    player.onerror = finish
    player.onplay = () => options.onStart?.()

    await player.play()
  } catch {
    // Serveur muet, synthèse trop lente, ou lecture refusée avant la première
    // interaction : on rend la parole au navigateur, qui gère lui-même le cas
    // « la page n'a pas encore été touchée ».
    if (token !== speechToken) return
    utterSystem(text, options)
  }
}

// ── Réserve d'extraits ───────────────────────────────────────────────────────
//
// La synthèse neuronale demande une à trois secondes selon la longueur de la
// phrase et la machine. Attendre cela au moment de parler se remarque
// immédiatement ; l'obtenir à l'avance ne se remarque pas du tout. D'où cette
// réserve, alimentée par `prefetchSpeech` — l'interface demande la phrase
// suivante pendant qu'on écoute la précédente.

/** Extraits déjà obtenus, par texte. La valeur est une URL d'objet. */
const clips = new Map<string, Promise<string>>()

/** Une leçon fait une trentaine d'étapes : au-delà, on n'anticipe plus rien. */
const CLIP_CACHE = 40

function clipKey(text: string): string {
  const prefs = getPreferences()
  return `${prefs.neuralVoice ?? ''}|${prefs.locale}|${prefs.voiceRate}|${text}`
}

/** Obtient l'extrait, depuis la réserve ou en le demandant au serveur. */
function fetchClip(text: string): Promise<string> {
  const key = clipKey(text)
  const existing = clips.get(key)
  if (existing) return existing

  const prefs = getPreferences()
  const request = fetch('/api/voix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanForSpeech(text),
      voice: prefs.neuralVoice ?? undefined,
      language: prefs.locale,
      rate: prefs.voiceRate,
    }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(String(response.status))
      return URL.createObjectURL(await response.blob())
    })
    .catch((error) => {
      // Un échec ne doit pas rester en réserve : la tentative suivante doit
      // pouvoir repartir de zéro.
      clips.delete(key)
      throw error
    })

  clips.set(key, request)
  if (clips.size > CLIP_CACHE) {
    const oldest = clips.keys().next().value
    if (oldest !== undefined) {
      void clips.get(oldest)?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
      clips.delete(oldest)
    }
  }
  return request
}

/**
 * Prépare une phrase sans la prononcer.
 *
 * À appeler dès qu'on sait ce qui va être dit ensuite — l'étape suivante d'une
 * leçon, typiquement. Sans effet si la voix neuronale n'est pas active.
 */
export function prefetchSpeech(text: string): void {
  if (!text?.trim()) return
  const prefs = getPreferences()
  if (!prefs.voiceEnabled || prefs.voiceEngine !== 'neural') return
  if (neuralState !== 'ready') return
  void fetchClip(text).catch(() => undefined)
}

function stopAudio(): void {
  if (!audio) return
  audio.pause()
  audio.onended = null
  audio.onerror = null
  audio = null
}

export function stopSpeaking(): void {
  synth()?.cancel()
  stopAudio()
  currentUtterance = null
  // Sans cela, une phrase bloquée par le navigateur repartirait au premier
  // clic — y compris après que l'apprenant a coupé la voix.
  speechToken++
  pendingSpeech = null
}

export function isSpeaking(): boolean {
  return synth()?.speaking ?? false
}

export function pauseSpeaking(): void {
  synth()?.pause()
}

export function resumeSpeaking(): void {
  synth()?.resume()
}

/**
 * Nettoie un texte destiné à la voix.
 *
 * Les symboles d'échecs et le balisage Markdown se prononcent très mal :
 * « ?! » devient « point d'interrogation point d'exclamation », et « ** » se
 * lit « astérisque astérisque ». On les remplace ou on les supprime.
 */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[«»"]/g, '')
    .replace(/\bO-O-O\b/g, 'grand roque')
    .replace(/\bO-O\b/g, 'petit roque')
    // Les annotations doublées n'existent pas en français courant : on peut
    // les traduire sans risque.
    .replace(/\?!/g, ', imprécision,')
    .replace(/!!/g, ', coup brillant,')
    .replace(/\?\?/g, ', grosse erreur,')
    // Les simples, en revanche, se confondent avec la ponctuation. Le français
    // met une espace avant « ? » et « ! », si bien que « qu'est-ce qu'il
    // attaque ? » était lu « qu'est-ce qu'il attaque, erreur » et « Bravo ! »
    // devenait « Bravo, très bon coup ». On n'annote donc que ce qui suit
    // immédiatement un coup, sans espace : « Cf3? », « e4! ».
    .replace(/([a-h][1-8])\?(?!\?)/g, '$1, erreur,')
    .replace(/([a-h][1-8])!(?!!)/g, '$1, très bon coup,')
    .replace(/#/g, ' échec et mat ')
    .replace(/\+/g, ' échec ')
    .replace(/−/g, 'moins ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Phrase de test des préférences. */
export function speakTestPhrase(locale: 'fr' | 'en'): void {
  speak(testPhrase(locale))
}

function testPhrase(locale: 'fr' | 'en'): string {
  return locale === 'fr'
    ? 'Cavalier f 3. Excellent coup : tu développes une pièce et tu contrôles le centre.'
    : 'Knight f 3. Excellent move: you develop a piece and control the centre.'
}

/**
 * Prononce la phrase de test **et dit qui a parlé**.
 *
 * Sans cela, quand une voix déçoit, on ne sait pas laquelle on écoute : les
 * préférences affichent « voix neuronale » alors que le navigateur a pris le
 * relais faute de serveur joignable. On ne peut pas corriger ce qu'on ne voit
 * pas.
 */
export async function testVoice(
  locale: 'fr' | 'en',
): Promise<{ engine: 'neural' | 'system'; voice: string; reason?: string }> {
  const prefs = getPreferences()
  const text = testPhrase(locale)

  if (prefs.voiceEngine === 'neural') {
    await loadNeuralVoices()
    if (neuralState === 'ready') {
      const chosen =
        neuralVoices.find((voice) => voice.id === prefs.neuralVoice) ??
        neuralVoices.find((voice) => voice.language === locale) ??
        neuralVoices[0]
      speak(text)
      return { engine: 'neural', voice: chosen?.label ?? 'voix par défaut' }
    }
  }

  speak(text)
  const fallback = pickVoice(locale, prefs.voiceName)
  return {
    engine: 'system',
    voice: fallback?.name ?? 'voix par défaut du système',
    reason:
      prefs.voiceEngine === 'neural'
        ? 'Le serveur de voix neuronale ne répond pas.'
        : undefined,
  }
}
