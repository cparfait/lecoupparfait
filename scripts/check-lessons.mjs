#!/usr/bin/env node
/**
 * Vérifie le contenu pédagogique.
 *
 * Une leçon fausse est pire que pas de leçon : un débutant n'a aucun moyen de
 * savoir que c'est l'application qui se trompe, et il retiendra l'erreur. Ce
 * script relit donc tout le programme et contrôle que :
 *
 *  - chaque position FEN est valide et légale ;
 *  - chaque coup attendu est réellement jouable dans la position de l'étape ;
 *  - chaque réponse automatique de l'adversaire est légale après ce coup ;
 *  - les cases surlignées existent ;
 *  - les étapes d'action ont bien au moins une réponse acceptée.
 *
 * Usage :  node scripts/check-lessons.mjs
 */

import { Chess } from 'chess.js'

const { CHAPTERS } = await import('../apps/web/src/lib/lessons/index.ts')

const SQUARE = /^[a-h][1-8]$/
let errors = 0
let warnings = 0
let steps = 0

function fail(lesson, index, message) {
  errors++
  console.error(`  ✗ ${lesson.id} · étape ${index + 1} — ${message}`)
}

function warn(lesson, index, message) {
  warnings++
  console.warn(`  ! ${lesson.id} · étape ${index + 1} — ${message}`)
}

for (const chapter of CHAPTERS) {
  console.log(`\n${chapter.icon}  ${chapter.title} — ${chapter.lessons.length} leçons`)

  for (const lesson of chapter.lessons) {
    // Position courante, héritée d'une étape à l'autre.
    let board = null

    for (const [index, step] of lesson.steps.entries()) {
      steps++

      // ── Position ────────────────────────────────────────────────────────
      if (step.fen) {
        // Les étapes purement illustratives peuvent montrer un échiquier vide
        // ou sans roi — c'est légitime quand on explique les coordonnées. On ne
        // valide donc la légalité que si l'étape attend un coup.
        const needsLegal = step.kind === 'play' || step.kind === 'choose' || step.reply
        try {
          board = new Chess(step.fen, { skipValidation: !needsLegal })
        } catch (error) {
          fail(lesson, index, `FEN invalide : ${error.message}`)
          board = null
          continue
        }
      }

      if (!board) {
        fail(lesson, index, 'aucune position définie (la première étape doit porter une FEN)')
        continue
      }

      // ── Texte ───────────────────────────────────────────────────────────
      if (!step.say || step.say.trim().length < 10) {
        warn(lesson, index, 'texte du coach très court')
      }

      // ── Cases citées ────────────────────────────────────────────────────
      for (const key of ['highlight', 'spotlight']) {
        for (const square of step[key] ?? []) {
          if (!SQUARE.test(square)) fail(lesson, index, `case invalide dans ${key} : ${square}`)
        }
      }
      for (const arrow of step.arrows ?? []) {
        if (!SQUARE.test(arrow.from) || !SQUARE.test(arrow.to)) {
          fail(lesson, index, `flèche invalide : ${arrow.from}→${arrow.to}`)
        }
      }
      for (const circle of step.circles ?? []) {
        if (!SQUARE.test(circle.square)) {
          fail(lesson, index, `cercle invalide : ${circle.square}`)
        }
      }

      // ── Coups attendus ──────────────────────────────────────────────────
      if (step.kind === 'play' || step.kind === 'choose') {
        if (!step.answers || step.answers.length === 0) {
          fail(lesson, index, 'étape jouable sans coup attendu')
          continue
        }

        const legal = board.moves()
        const accepted = []

        for (const answer of step.answers) {
          const probe = new Chess(board.fen(), { skipValidation: true })
          try {
            probe.move(answer)
            accepted.push(answer)
          } catch {
            fail(
              lesson,
              index,
              `coup attendu illégal : « ${answer} » — coups possibles : ${legal.slice(0, 12).join(', ')}${legal.length > 12 ? '…' : ''}`,
            )
          }
        }

        if (accepted.length === 0) continue

        // On applique le premier coup accepté pour la suite de la leçon.
        board.move(accepted[0])

        // ── Réponse de l'adversaire ───────────────────────────────────────
        if (step.reply) {
          try {
            board.move(step.reply)
          } catch {
            fail(
              lesson,
              index,
              `réponse adverse illégale : « ${step.reply} » après « ${accepted[0]} »`,
            )
          }
        }
      } else if (step.reply) {
        try {
          board.move(step.reply)
        } catch {
          fail(lesson, index, `réponse adverse illégale : « ${step.reply} »`)
        }
      }

      // ── L'étape suivante est-elle jouable ? ─────────────────────────────
      //
      // Le piège : une étape demande un coup, l'apprenant le joue, et l'étape
      // d'après lui en demande un autre — mais c'est au tour de l'adversaire,
      // qui n'a pas de réponse prévue. L'échiquier se fige et l'exercice ne
      // peut pas se terminer. C'est invisible à la lecture du contenu, et
      // parfaitement mécanique à détecter.
      const next = lesson.steps[index + 1]
      if (board && next && !next.fen && (next.kind === 'play' || next.kind === 'choose')) {
        const expected = next.answers?.[0]
        if (expected) {
          try {
            new Chess(board.fen()).move(expected)
          } catch {
            fail(
              lesson,
              index,
              `l'étape suivante attend « ${expected} », injouable ici (trait aux ${
                board.turn() === 'w' ? 'Blancs' : 'Noirs'
              }) — il manque sans doute une réponse adverse`,
            )
          }
        }
      }
    }
  }
}

console.log(
  `\n${errors === 0 ? '✓' : '✗'} ${steps} étapes vérifiées · ${errors} erreurs · ${warnings} avertissements`,
)
process.exit(errors === 0 ? 0 : 1)
