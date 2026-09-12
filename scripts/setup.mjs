#!/usr/bin/env node
/**
 * Préparation d'une installation.
 *
 * Enchaîne tout ce qu'il faut faire une fois après un `git clone` :
 * ressources graphiques, moteur WebAssembly, index des ouvertures, icônes, et
 * fichier de configuration.
 *
 * Chaque étape est indépendante : si l'une échoue — réseau coupé, dépendance
 * manquante — les autres se poursuivent et le récapitulatif final dit
 * exactement ce qui reste à faire.
 *
 * Usage :  npm run setup
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const steps = []

function run(label, script, optional = false) {
  process.stdout.write(`\n▸ ${label}\n`)
  try {
    execFileSync(process.execPath, [join(here, script)], {
      cwd: root,
      stdio: 'inherit',
    })
    steps.push({ label, ok: true })
  } catch (error) {
    steps.push({ label, ok: false, optional, message: error.message })
    console.warn(`  ⚠ ${label} : échec${optional ? ' (facultatif)' : ''}`)
  }
}

// ── Fichier de configuration ─────────────────────────────────────────────────
console.log('▸ Configuration')
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  console.log('  ✓ .env existe déjà, on n’y touche pas')
  steps.push({ label: 'Configuration', ok: true })
} else {
  const examplePath = join(root, '.env.example')
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath)

    // Les secrets par défaut sont des invitations au désastre : on les remplace
    // par de vraies valeurs aléatoires dès la première installation.
    let content = readFileSync(envPath, 'utf8')
    const password = randomBytes(18).toString('base64url')
    // Plus de secret d'application à engendrer : `AUTH_SECRET` n'était lu par
    // personne. Une session est un jeton aléatoire dont seule l'empreinte est
    // en base — il n'y a rien à signer.
    content = content
      .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${password}`)
      .replace(
        /^DATABASE_URL=.*$/m,
        `DATABASE_URL=postgresql://coupparfait:${password}@localhost:5432/coupparfait`,
      )
    writeFileSync(envPath, content)

    console.log('  ✓ .env créé, avec un mot de passe de base engendré aléatoirement')
    steps.push({ label: 'Configuration', ok: true })
  } else {
    console.warn('  ⚠ .env.example introuvable')
    steps.push({ label: 'Configuration', ok: false })
  }
}

// ── Ressources ───────────────────────────────────────────────────────────────
run('Jeux de pièces et bruitages libres', 'fetch-assets.mjs', true)
// Facultatif comme le reste : sans les drapeaux, le sélecteur de langue affiche
// deux lettres à la place de la vignette, et rien d'autre ne change.
run('Drapeaux des langues', 'fetch-drapeaux.mjs', true)
run('Moteur Stockfish WebAssembly', 'setup-engine.mjs')
run('Index des ouvertures ECO', 'build-openings.mjs')
run('Base de positions de finales', 'build-endgames.mjs', true)
run('Icônes de l’application', 'build-icons.mjs', true)
run('Vérification du contenu pédagogique', 'check-lessons.mjs', true)
run('Vérification des dictionnaires de langues', 'check-langues.mjs', true)

// ── Récapitulatif ────────────────────────────────────────────────────────────
const failed = steps.filter((step) => !step.ok)

console.log(`\n${'─'.repeat(60)}`)
for (const step of steps) {
  console.log(`  ${step.ok ? '✓' : '✗'} ${step.label}`)
}

if (failed.length === 0) {
  console.log(`\n✓ Installation prête.\n`)
  console.log('Prochaines étapes :')
  console.log('  1. Démarrer PostgreSQL     docker compose up -d db')
  console.log('  2. Créer les tables        npm run db:push')
  console.log('  3. Importer les ouvertures npm run data:openings')
  console.log('  4. Importer des puzzles    npm run data:puzzles')
  console.log('  5. Compiler les finales    npm run data:endgames')
  console.log('  6. Lancer                  npm run dev')
  console.log('')
  console.log('Facultatif, pour aller plus vite et mieux entendre :')
  console.log('  Moteur natif               npm run engine:install')
  console.log('  Voix neuronale             npm run voice:install')
  console.log('\n  → http://localhost:3000\n')
} else {
  console.log(`\n⚠ ${failed.length} étape(s) en échec :`)
  for (const step of failed) {
    console.log(`  - ${step.label}${step.optional ? ' (facultatif)' : ''}`)
  }
  console.log('\nL’application peut fonctionner malgré tout, avec des ressources manquantes.')
}
