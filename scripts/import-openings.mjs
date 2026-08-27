#!/usr/bin/env node
/**
 * Importe le catalogue d'ouvertures ECO en base.
 *
 * Le fichier compilé (`data/openings/openings.compiled.json`) est produit par
 * `build-openings.mjs`. Ce script se contente de le verser dans PostgreSQL, où
 * l'explorateur et l'identification des parties viendront le lire.
 *
 * Idempotent : relancer le script met simplement les noms à jour.
 *
 * Usage :  node scripts/import-openings.mjs
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL est absente. Renseigne-la dans .env.')
  process.exit(1)
}

const sourcePath = join(root, 'data', 'openings', 'openings.compiled.json')
if (!existsSync(sourcePath)) {
  console.error(`✗ Fichier introuvable : ${sourcePath}`)
  console.error('  Lance d’abord :  node scripts/build-openings.mjs')
  process.exit(1)
}

const entries = JSON.parse(readFileSync(sourcePath, 'utf8'))
console.log(`Import de ${entries.length} ouvertures…`)

const sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} })

const BATCH = 500
let imported = 0

try {
  for (let offset = 0; offset < entries.length; offset += BATCH) {
    const batch = entries.slice(offset, offset + BATCH).map((entry) => ({
      epd: entry.epd,
      eco: entry.eco,
      name: entry.name.slice(0, 200),
      name_fr: entry.nameFr.slice(0, 200),
      pgn: entry.pgn,
      uci: entry.uci,
      ply: entry.ply,
    }))

    await sql`
      insert into openings ${sql(batch, 'epd', 'eco', 'name', 'name_fr', 'pgn', 'uci', 'ply')}
      on conflict (epd) do update set
        eco = excluded.eco,
        name = excluded.name,
        name_fr = excluded.name_fr,
        pgn = excluded.pgn,
        uci = excluded.uci,
        ply = excluded.ply
    `

    imported += batch.length
    process.stdout.write(`\r  ${imported} / ${entries.length}`)
  }

  process.stdout.write('\n')

  const [{ count }] = await sql`select count(*)::int as count from openings`
  const volumes = await sql`
    select left(eco, 1) as volume, count(*)::int as count
    from openings group by 1 order by 1
  `

  console.log(`✓ ${count} ouvertures en base`)
  console.log(`  ${volumes.map((v) => `${v.volume}=${v.count}`).join('  ')}`)
} catch (error) {
  console.error('\n✗ Import interrompu :', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
