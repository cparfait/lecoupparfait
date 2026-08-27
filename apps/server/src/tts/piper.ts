/**
 * Voix neuronale du coach — Piper.
 *
 * La synthèse du navigateur (`SpeechSynthesis`) a un mérite : elle est là,
 * partout, gratuitement. Elle a aussi un défaut : sur beaucoup de machines la
 * voix française est robotique au point de gêner l'écoute. Or ici la voix n'est
 * pas un gadget — c'est le coach. On l'écoute pendant des heures.
 *
 * [Piper](https://github.com/rhasspy/piper) résout cela sans rien trahir de la
 * promesse du projet : moteur **local**, **hors ligne**, **gratuit** (MIT), avec
 * des voix françaises de qualité neuronale. Rien ne part sur un service tiers,
 * pas de clé d'API, pas de quota.
 *
 * Il reste optionnel : s'il n'est pas installé, on ne casse rien, le navigateur
 * reprend la parole. C'est le sens de `isAvailable()`.
 *
 * Fonctionnement : un processus `piper` est maintenu en vie par voix et reçoit
 * une requête JSON par ligne. Le chargement du modèle — une demi-seconde — n'est
 * ainsi payé qu'une fois, et la synthèse devient plus rapide que le temps réel.
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

/** Exécutable Piper. Absent = voix neuronale indisponible, sans erreur. */
const PIPER_BIN = process.env.PIPER_BIN ?? 'piper'

/** Dossier des modèles `.onnx` accompagnés de leur `.onnx.json`. */
const VOICES_DIR = process.env.PIPER_VOICES_DIR ?? '/app/voices'

/** Au-delà, on refuse : une phrase de coach ne fait jamais 5 000 signes. */
const MAX_CHARS = 1200

/** Nombre d'extraits gardés en mémoire. Les textes de leçon reviennent souvent. */
const CACHE_ENTRIES = 400

export interface PiperVoice {
  /** Identifiant stable, celui du fichier : `fr_FR-siwis-medium`. */
  id: string
  /** Nom lisible : « Siwis (français, medium) ». */
  label: string
  /** Étiquette BCP-47 : `fr_FR`. */
  lang: string
  /** Préfixe de langue, pour filtrer : `fr`. */
  language: string
  quality: string
  sampleRate: number
  modelPath: string
}

let catalogue: Promise<PiperVoice[]> | null = null
let available: Promise<boolean> | null = null

// ─────────────────────────────────────────────────────────────────────────────
//  Catalogue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Voix installées.
 *
 * Le dossier est lu une seule fois : les modèles n'apparaissent pas en cours
 * d'exécution, et chaque lecture coûte quelques appels système.
 */
export function listPiperVoices(): Promise<PiperVoice[]> {
  catalogue ??= scanVoices()
  return catalogue
}

/**
 * Parcourt le dossier des modèles.
 *
 * Ce qu'on retient d'un parcours à l'autre est la **promesse**, jamais le
 * tableau. La nuance décide de la présence ou de l'absence de voix : en
 * mémorisant le tableau, on le publiait vide le temps de lire le dossier, si
 * bien qu'une seconde requête arrivée dans cet intervalle — la page qui demande
 * le catalogue pendant qu'une leçon réclame déjà une phrase — le trouvait
 * « déjà rempli », donc vide, et concluait qu'aucune voix n'était installée.
 * `isPiperAvailable` retenait ce faux verdict pour toute la vie du serveur.
 */
async function scanVoices(): Promise<PiperVoice[]> {
  const voices: PiperVoice[] = []

  if (!existsSync(VOICES_DIR)) return voices

  let entries: string[]
  try {
    entries = await readdir(VOICES_DIR)
  } catch {
    return voices
  }

  for (const entry of entries) {
    if (!entry.endsWith('.onnx')) continue

    const modelPath = join(VOICES_DIR, entry)
    const configPath = `${modelPath}.json`
    if (!existsSync(configPath)) continue

    try {
      const config = JSON.parse(await readFile(configPath, 'utf8')) as {
        audio?: { sample_rate?: number }
        language?: { code?: string; family?: string }
        dataset?: string
      }

      const id = basename(entry, '.onnx')
      const [lang = 'fr_FR', dataset = id, quality = 'medium'] = id.split('-')

      voices.push({
        id,
        label: describe(config.dataset ?? dataset, lang, quality),
        lang: config.language?.code ?? lang,
        language: (config.language?.family ?? lang.slice(0, 2)).toLowerCase(),
        quality,
        sampleRate: config.audio?.sample_rate ?? 22050,
        modelPath,
      })
    } catch {
      // Configuration illisible : on ignore ce modèle plutôt que de refuser
      // tout le catalogue à cause d'un fichier abîmé.
    }
  }

  voices.sort((a, b) => a.label.localeCompare(b.label))
  return voices
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'français',
  en: 'anglais',
}

function describe(dataset: string, lang: string, quality: string): string {
  const name = dataset.charAt(0).toUpperCase() + dataset.slice(1)
  const language = LANGUAGE_NAMES[lang.slice(0, 2).toLowerCase()] ?? lang
  return `${name} (${language}, ${quality})`
}

/** Vrai si Piper est utilisable : binaire présent **et** au moins une voix. */
export function isPiperAvailable(): Promise<boolean> {
  available ??= probeAvailability()
  return available
}

async function probeAvailability(): Promise<boolean> {
  const voices = await listPiperVoices()
  if (voices.length === 0) return false
  return probeBinary()
}

/**
 * Vérifie que le binaire est là et démarrable.
 *
 * On ne juge pas sur le code de sortie : selon les versions, `--version` est
 * reconnu ou provoque un rappel de l'usage et un code non nul. Le seul signal
 * fiable est l'échec du lancement lui-même — fichier introuvable, droits
 * insuffisants, bibliothèque manquante.
 */
function probeBinary(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const done = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    let child
    try {
      child = spawn(PIPER_BIN, ['--version'], { stdio: 'ignore' })
    } catch {
      done(false)
      return
    }

    child.on('error', () => done(false))
    child.on('close', () => done(true))
    // Un binaire qui reste bloqué est aussi inutilisable qu'un binaire absent.
    setTimeout(() => {
      child.kill()
      done(false)
    }, 5000).unref()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Synthèse
// ─────────────────────────────────────────────────────────────────────────────

export interface SynthesiseOptions {
  text: string
  /** Identifiant de voix ; à défaut, la première du catalogue pour la langue. */
  voice?: string
  language?: 'fr' | 'en'
  /** Débit relatif, 0,5 à 2. 1 = vitesse naturelle du modèle. */
  rate?: number
}

/**
 * Débits réellement proposés à la synthèse neuronale.
 *
 * Piper ne lit `length_scale` qu'au lancement du processus. Le champ du même
 * nom accepté dans le protocole ligne à ligne est ignoré — sans erreur, sans
 * avertissement — ce qui rendait le curseur « Débit » silencieusement
 * inopérant sur cette voix : trois demandes à 0,5, 1 et 2 rendaient trois
 * extraits de la même durée.
 *
 * On fixe donc le débit à la naissance du processus. Mais chaque processus
 * garde une centaine de mégaoctets de modèle en mémoire, et en ouvrir un par
 * position du curseur serait ruineux : les demandes sont ramenées au palier le
 * plus proche. Cinq paliers couvrent l'écart utile — au-delà, la voix devient
 * pénible bien avant d'être trop lente ou trop rapide.
 */
const RATE_STEPS = [0.8, 0.9, 1, 1.1, 1.25]

function snapRate(rate: number): number {
  return RATE_STEPS.reduce((best, step) =>
    Math.abs(step - rate) < Math.abs(best - rate) ? step : best,
  )
}

/** Petit cache mémoire des extraits déjà produits, en ordre d'insertion. */
const cache = new Map<string, Buffer>()

export async function synthesise(options: SynthesiseOptions): Promise<Buffer> {
  const text = options.text.trim().slice(0, MAX_CHARS)
  if (!text) throw new Error('Texte vide.')

  const voices = await listPiperVoices()
  if (voices.length === 0) throw new Error('Aucune voix Piper installée.')

  const voice =
    voices.find((candidate) => candidate.id === options.voice) ??
    voices.find((candidate) => candidate.language === (options.language ?? 'fr')) ??
    voices[0]!

  const rate = snapRate(options.rate ?? 1)
  const key = createHash('sha256').update(`${voice.id}|${rate}|${text}`).digest('hex')

  const hit = cache.get(key)
  if (hit) {
    // Remise en tête : les phrases réécoutées doivent survivre à l'éviction.
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }

  const wav = conditionAudio(await runPiper(text, voice, rate))

  cache.set(key, wav)
  if (cache.size > CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return wav
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mise en forme du signal
// ─────────────────────────────────────────────────────────────────────────────

/** Marge sous la pleine échelle, en facteur linéaire (≈ −3,5 dB). */
const HEADROOM = 0.67

/** Durée des fondus d'entrée et de sortie, en secondes. */
const FADE_SECONDS = 0.008

/**
 * Prépare l'extrait pour la lecture.
 *
 * Piper normalise sa sortie **exactement** sur la pleine échelle. C'est
 * mathématiquement propre et pratiquement risqué : chaque étage suivant —
 * rééchantillonnage du navigateur de 22 kHz vers 48 kHz, mélangeur du système,
 * égalisation de volume de Windows — peut dépasser la limite d'un cheveu et
 * écrêter. Cela s'entend comme un grésillement sur les syllabes fortes.
 *
 * On abaisse donc le niveau pour laisser de la marge, et on ajoute un fondu de
 * huit millisecondes aux deux extrémités : un extrait qui démarre sur un
 * échantillon non nul produit un claquement au haut-parleur, à chaque phrase.
 *
 * La perte de volume se rattrape sur le curseur du système, l'écrêtage ne se
 * rattrape pas.
 */
function conditionAudio(wav: Buffer): Buffer {
  const data = findDataChunk(wav)
  if (!data) return wav

  const { offset, length, sampleRate } = data
  const samples = length >> 1
  if (samples === 0) return wav

  const fade = Math.min(Math.floor(sampleRate * FADE_SECONDS), samples >> 1)

  for (let i = 0; i < samples; i++) {
    const position = offset + i * 2
    let value = wav.readInt16LE(position) * HEADROOM

    if (fade > 0) {
      if (i < fade) value *= i / fade
      else if (i >= samples - fade) value *= (samples - 1 - i) / fade
    }

    // Garde-fou : après le gain et le fondu, la valeur reste dans les bornes du
    // 16 bits par construction, mais un arrondi ne doit jamais déborder.
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value))), position)
  }

  return wav
}

/**
 * Localise le bloc `data` d'un fichier WAV.
 *
 * On ne suppose pas un en-tête de 44 octets : selon les outils, un bloc `LIST`
 * ou `fact` peut s'intercaler, et écrire au mauvais endroit transformerait la
 * parole en bruit.
 */
function findDataChunk(
  wav: Buffer,
): { offset: number; length: number; sampleRate: number } | null {
  if (wav.length < 44 || wav.toString('latin1', 0, 4) !== 'RIFF') return null
  if (wav.toString('latin1', 8, 12) !== 'WAVE') return null

  let sampleRate = 22050
  let cursor = 12

  while (cursor + 8 <= wav.length) {
    const id = wav.toString('latin1', cursor, cursor + 4)
    const size = wav.readUInt32LE(cursor + 4)
    const body = cursor + 8

    if (id === 'fmt ' && body + 16 <= wav.length) {
      // Seul le 16 bits mono est produit par Piper ; tout autre format sortirait
      // du cadre de cette fonction, autant ne pas y toucher.
      if (wav.readUInt16LE(body) !== 1 || wav.readUInt16LE(body + 14) !== 16) return null
      sampleRate = wav.readUInt32LE(body + 4)
    }

    if (id === 'data') {
      const length = Math.min(size, wav.length - body)
      return { offset: body, length, sampleRate }
    }

    // Les blocs sont alignés sur un nombre pair d'octets.
    cursor = body + size + (size % 2)
  }

  return null
}

/**
 * Processus Piper maintenu en vie, une instance par couple voix / débit.
 *
 * Relancer l'exécutable à chaque phrase coûtait une demi-seconde de chargement
 * du modèle avant même de commencer à parler — un coach qui met quatre secondes
 * à réagir n'est plus un coach. En gardant le processus ouvert, ce coût n'est
 * payé qu'une fois et la synthèse tourne plus vite que le temps réel.
 *
 * Le mode `--json-input` prend une requête par ligne et **annonce sur sa sortie
 * standard le fichier qu'il vient d'écrire** : c'est ce signal qui sert de fin
 * de tâche, plutôt qu'une attente au jugé.
 */
interface Worker {
  child: ReturnType<typeof spawn>
  /** File d'attente : Piper traite une phrase à la fois. */
  chain: Promise<unknown>
  /** Tâche en cours, réveillée quand Piper annonce son fichier. */
  pending: ((line: string) => void) | null
  idleTimer: ReturnType<typeof setTimeout> | null
}

const workers = new Map<string, Worker>()

/** Séparateur du protocole ligne à ligne de Piper. */
const LINE_BREAK = '\n'

/** Au-delà, on rend la mémoire du modèle (une centaine de mégaoctets). */
const IDLE_MS = 5 * 60 * 1000

/** Compteur de fichiers temporaires : deux requêtes ne doivent pas se croiser. */
let counter = 0

function workerFor(voice: PiperVoice, rate: number): Worker {
  const slot = `${voice.id}|${rate}`
  const existing = workers.get(slot)
  if (existing && existing.child.exitCode === null && !existing.child.killed) return existing

  const child = spawn(
    PIPER_BIN,
    [
      '--model',
      voice.modelPath,
      '--json-input',
      // `length_scale` est l'inverse du débit : allonger les phonèmes ralentit
      // la voix. C'est le réglage propre du modèle, bien meilleur qu'une
      // accélération appliquée après coup, qui déforme les timbres.
      '--length_scale',
      (1 / rate).toFixed(3),
      // Un silence net entre les phrases : le coach énumère souvent des
      // principes, et sans respiration tout se mélange.
      '--sentence_silence',
      '0.35',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  )

  const worker: Worker = { child, chain: Promise.resolve(), pending: null, idleTimer: null }

  let buffer = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    let index = buffer.indexOf(LINE_BREAK)
    while (index !== -1) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (line) worker.pending?.(line)
      index = buffer.indexOf(LINE_BREAK)
    }
  })

  // Piper journalise abondamment sur la sortie d'erreur ; on l'ignore tant
  // qu'il fonctionne, et on ne la relaie qu'en cas de disparition brutale.
  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-2000)
  })

  const forget = () => {
    if (workers.get(slot) === worker) workers.delete(slot)
    if (worker.idleTimer) clearTimeout(worker.idleTimer)
  }
  child.on('error', forget)
  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[voix] Piper s'est arrêté (code ${code}) : ${stderr.slice(-400)}`)
    }
    forget()
  })

  workers.set(slot, worker)
  return worker
}

/**
 * Arrête les processus de synthèse.
 *
 * Sans cela, un processus Piper ouvert empêche Node de se terminer : il faut le
 * dire explicitement à l'arrêt du serveur, comme pour la réserve Stockfish.
 */
export function disposeVoices(): void {
  for (const worker of workers.values()) {
    if (worker.idleTimer) clearTimeout(worker.idleTimer)
    worker.child.stdin?.end()
    worker.child.kill()
  }
  workers.clear()
}

/** Repousse l'extinction du processus après chaque utilisation. */
function touch(worker: Worker): void {
  if (worker.idleTimer) clearTimeout(worker.idleTimer)
  worker.idleTimer = setTimeout(() => {
    worker.child.stdin?.end()
    worker.child.kill()
  }, IDLE_MS)
  worker.idleTimer.unref?.()
}

/**
 * Synthétise une phrase.
 *
 * Le débit est déjà porté par le processus choisi : ne reste ici que le texte
 * et le fichier attendu.
 *
 * Les requêtes d'un même processus sont sérialisées : Piper ne traite qu'une
 * phrase à la fois, et les entrelacer mélangerait les réponses.
 */
function runPiper(text: string, voice: PiperVoice, rate: number): Promise<Buffer> {
  const worker = workerFor(voice, rate)

  const task = worker.chain.then(
    () => speakOnce(worker, text),
    () => speakOnce(worker, text),
  )
  // La file ne doit jamais se rompre sur un échec : on la poursuit quoi qu'il
  // arrive, sinon une phrase ratée bloquerait toutes les suivantes.
  worker.chain = task.catch(() => undefined)
  return task
}

async function speakOnce(worker: Worker, text: string): Promise<Buffer> {
  counter = (counter + 1) % 1_000_000
  const output = join(tmpdir(), `coupparfait-${process.pid}-${counter}.wav`)

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.pending = null
        reject(new Error('Piper n’a pas répondu à temps.'))
      }, 30_000)

      worker.pending = (line) => {
        // Piper renvoie le chemin qu'on lui a donné ; on ne compare que le nom
        // de fichier, les séparateurs différant d'un système à l'autre.
        if (!line.endsWith(basename(output))) return
        worker.pending = null
        clearTimeout(timer)
        resolve()
      }

      worker.child.stdin?.write(
        `${JSON.stringify({ text, output_file: output })}${LINE_BREAK}`,
        (error) => {
          if (!error) return
          worker.pending = null
          clearTimeout(timer)
          reject(error)
        },
      )
    })

    const wav = await readFile(output)
    touch(worker)
    return wav
  } finally {
    await rm(output, { force: true }).catch(() => undefined)
  }
}
