#!/usr/bin/env node
/**
 * Importe la base de puzzles de Lichess.
 *
 * Source : https://database.lichess.org/lichess_db_puzzle.csv.zst
 *   6 057 356 puzzles notés et étiquetés, domaine public (CC0).
 *   304 Mo compressés, environ 1,5 Go décompressés.
 *
 * Le fichier est **décompressé et analysé en flux** : à aucun moment il n'est
 * chargé entièrement en mémoire, et il n'est même pas écrit sur le disque si on
 * le télécharge directement. Node 24 sait décompresser le zstd nativement,
 * aucune dépendance n'est donc nécessaire.
 *
 * Options (variables d'environnement) :
 *   PUZZLE_IMPORT_LIMIT     nombre maximum à importer (0 = tous). Défaut 200000.
 *   PUZZLE_MIN_POPULARITY   popularité minimale −100..100. Défaut 60.
 *   PUZZLE_MIN_PLAYS        nombre de parties jouées minimum. Défaut 30.
 *   PUZZLE_SOURCE           chemin d'un fichier local déjà téléchargé.
 *
 * Usage :
 *   node scripts/import-puzzles.mjs
 *   PUZZLE_IMPORT_LIMIT=0 node scripts/import-puzzles.mjs   # les six millions
 */

import { createReadStream, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable, Transform } from 'node:stream'
import { createZstdDecompress } from 'node:zlib'
import postgres from 'postgres'

/**
 * Démêle le format pzstd.
 *
 * Le fichier de Lichess est compressé avec **pzstd** (zstd parallèle), qui
 * produit une structure particulière : chaque frame compressée est précédée
 * d'une petite *frame escamotable* de quatre octets contenant la taille de la
 * frame qui suit. La norme zstd autorise ces frames et impose aux décodeurs de
 * les ignorer — mais celui intégré à Node s'arrête dessus avec « Unknown frame
 * descriptor ».
 *
 * On les retire donc soi-même. Comme chaque marqueur annonce la taille exacte
 * de la frame suivante, il suffit de laisser passer ce nombre d'octets puis
 * d'attendre le marqueur suivant. Aucune heuristique, aucune recherche de motif
 * dans les données compressées : on suit la structure telle qu'elle est écrite.
 *
 * Un fichier zstd ordinaire, sans marqueur, traverse le filtre inchangé.
 */
function stripPzstdMarkers() {
  const SKIPPABLE_MIN = 0x184d2a50
  const SKIPPABLE_MAX = 0x184d2a5f

  let buffer = Buffer.alloc(0)
  /** Octets de frame compressée restant à laisser passer. */
  let remaining = 0
  /** Vrai une fois qu'on a établi que le fichier n'a aucun marqueur. */
  let plain = false

  return new Transform({
    transform(chunk, _encoding, done) {
      if (plain) {
        this.push(chunk)
        done()
        return
      }

      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk])

      for (;;) {
        // On est au milieu d'une frame compressée : on la laisse passer.
        if (remaining > 0) {
          const take = Math.min(remaining, buffer.length)
          if (take > 0) {
            this.push(buffer.subarray(0, take))
            buffer = buffer.subarray(take)
            remaining -= take
          }
          if (remaining > 0) {
            done()
            return
          }
        }

        // Il faut l'en-tête complet pour décider.
        if (buffer.length < 8) {
          done()
          return
        }

        const magic = buffer.readUInt32LE(0)

        if (magic < SKIPPABLE_MIN || magic > SKIPPABLE_MAX) {
          // Pas de marqueur : fichier zstd ordinaire, tout passe désormais.
          plain = true
          this.push(buffer)
          buffer = Buffer.alloc(0)
          done()
          return
        }

        const contentSize = buffer.readUInt32LE(4)
        if (buffer.length < 8 + contentSize) {
          done()
          return
        }

        // Le contenu du marqueur est la taille de la frame qui suit.
        remaining =
          contentSize >= 4 ? buffer.readUInt32LE(8) : 0
        buffer = buffer.subarray(8 + contentSize)

        // Marqueur sans taille exploitable : on ne peut plus segmenter, on
        // laisse le décodeur se débrouiller avec le reste.
        if (remaining === 0) {
          plain = true
          this.push(buffer)
          buffer = Buffer.alloc(0)
          done()
          return
        }
      }
    },
    flush(done) {
      if (buffer.length > 0) this.push(buffer)
      done()
    },
  })
}

const SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL est absente. Renseigne-la dans .env.')
  process.exit(1)
}

const LIMIT = Number(process.env.PUZZLE_IMPORT_LIMIT ?? 200_000)
const MIN_POPULARITY = Number(process.env.PUZZLE_MIN_POPULARITY ?? 60)
const MIN_PLAYS = Number(process.env.PUZZLE_MIN_PLAYS ?? 30)
const LOCAL_SOURCE = process.env.PUZZLE_SOURCE

/**
 * Traduction des thèmes Lichess vers les identifiants de motifs du Coup Parfait.
 * Les thèmes non listés sont conservés tels quels : ils restent utilisables
 * comme filtres même sans traduction française.
 */
const THEME_MAP = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discoveredAttack',
  doubleCheck: 'doubleCheck',
  deflection: 'deflection',
  attraction: 'decoy',
  clearance: 'clearance',
  interference: 'interference',
  intermezzo: 'zwischenzug',
  xRayAttack: 'xRayAttack',
  sacrifice: 'sacrifice',
  hangingPiece: 'hangingPiece',
  trappedPiece: 'trappedPiece',
  backRankMate: 'backRankMate',
  smotheredMate: 'smotheredMate',
  mateIn1: 'mateIn1',
  mateIn2: 'mateIn2',
  mateIn3: 'mateIn3',
  promotion: 'promotion',
  underPromotion: 'underPromotion',
  enPassant: 'enPassant',
  zugzwang: 'zugzwang',
  defensiveMove: 'defensiveMove',
  quietMove: 'quietMove',
  advancedPawn: 'passedPawn',
  capturingDefender: 'removingTheDefender',
  attackingF2F7: 'attackingF2F7',
  exposedKing: 'exposedKing',
  kingsideAttack: 'kingsideAttack',
  queensideAttack: 'queensideAttack',
}

/** Ouvre un flux de lignes décompressées, depuis le réseau ou un fichier local. */
async function openLineStream() {
  if (LOCAL_SOURCE) {
    if (!existsSync(LOCAL_SOURCE)) {
      throw new Error(`Fichier introuvable : ${LOCAL_SOURCE}`)
    }
    console.log(`Lecture du fichier local ${LOCAL_SOURCE}`)
    const raw = createReadStream(LOCAL_SOURCE)
    const stream = LOCAL_SOURCE.endsWith('.zst')
      ? raw.pipe(stripPzstdMarkers()).pipe(createZstdDecompress())
      : raw
    return { stream, total: null }
  }

  console.log(`Téléchargement depuis ${SOURCE_URL}`)
  console.log('(304 Mo — la lecture commence immédiatement, sans attendre la fin)')

  const response = await fetch(SOURCE_URL)
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement impossible : HTTP ${response.status}`)
  }
  const total = Number(response.headers.get('content-length') ?? 0)
  const stream = Readable.fromWeb(response.body)
    .pipe(stripPzstdMarkers())
    .pipe(createZstdDecompress())
  return { stream, total }
}

/**
 * Découpe une ligne CSV.
 * Le format Lichess n'utilise ni guillemets ni virgules dans les champs, ce qui
 * autorise un découpage direct — mille fois plus rapide qu'un analyseur complet
 * sur six millions de lignes.
 */
function parseLine(line) {
  const parts = line.split(',')
  if (parts.length < 8) return null

  const [id, fen, moves, rating, ratingDeviation, popularity, plays, themes, gameUrl, openingTags] =
    parts

  return {
    id,
    fen,
    moves,
    rating: Number(rating),
    rating_deviation: Number(ratingDeviation),
    popularity: Number(popularity),
    plays: Number(plays),
    themes: (themes ?? '')
      .split(' ')
      .filter(Boolean)
      .map((theme) => THEME_MAP[theme] ?? theme),
    opening_tags: openingTags ? openingTags.split(' ').filter(Boolean) : null,
    game_url: gameUrl || null,
  }
}

const sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} })

const BATCH_SIZE = 2000
let batch = []
let imported = 0
let scanned = 0
let skipped = 0
const startedAt = Date.now()

async function flush() {
  if (batch.length === 0) return
  await sql`
    insert into puzzles ${sql(
      batch,
      'id',
      'fen',
      'moves',
      'rating',
      'rating_deviation',
      'popularity',
      'plays',
      'themes',
      'opening_tags',
      'game_url',
    )}
    on conflict (id) do nothing
  `
  imported += batch.length
  batch = []
}

function report() {
  const elapsed = (Date.now() - startedAt) / 1000
  const rate = Math.round(scanned / Math.max(1, elapsed))
  process.stdout.write(
    `\r  lus ${scanned.toLocaleString('fr-FR')} · importés ${imported.toLocaleString('fr-FR')} · écartés ${skipped.toLocaleString('fr-FR')} · ${rate.toLocaleString('fr-FR')}/s`,
  )
}

try {
  const { stream } = await openLineStream()
  const reader = createInterface({ input: stream, crlfDelay: Infinity })

  let header = true
  for await (const line of reader) {
    // Le fichier commence par une ligne d'en-tête.
    if (header) {
      header = false
      if (line.startsWith('PuzzleId')) continue
    }
    if (!line) continue

    scanned++
    const puzzle = parseLine(line)
    if (!puzzle || !puzzle.id) {
      skipped++
      continue
    }

    // Filtrage qualité : la base contient beaucoup de puzzles peu joués, mal
    // notés ou impopulaires. Les écarter améliore nettement l'expérience.
    if (puzzle.popularity < MIN_POPULARITY || puzzle.plays < MIN_PLAYS) {
      skipped++
      continue
    }

    batch.push(puzzle)
    if (batch.length >= BATCH_SIZE) {
      await flush()
      report()
      if (LIMIT > 0 && imported >= LIMIT) break
    }
  }

  await flush()
  report()
  process.stdout.write('\n')

  const [{ count }] = await sql`select count(*)::int as count from puzzles`
  const spread = await sql`
    select
      width_bucket(rating, 600, 2800, 11) as bucket,
      count(*)::int as count
    from puzzles group by 1 order by 1
  `

  console.log(`\n✓ ${count.toLocaleString('fr-FR')} puzzles en base`)
  console.log('  répartition par niveau :')
  for (const row of spread) {
    const from = 600 + (row.bucket - 1) * 200
    const bar = '█'.repeat(Math.round((row.count / count) * 40))
    console.log(`    ${String(from).padStart(4)}+ ${bar} ${row.count.toLocaleString('fr-FR')}`)
  }
} catch (error) {
  console.error('\n✗ Import interrompu :', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
