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
 *  - chaque réponse automatique de l'adversaire est légale après chacun des
 *    coups acceptés ;
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
  console.log(`\n${chapter.title} — ${chapter.lessons.length} leçons`)

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
            continue
          }

          /*
            Le suffixe annonce quelque chose : on le vérifie.

            chess.js accepte « Ra8# » sur un coup qui ne fait qu'échec — le
            suffixe est décoratif dans sa lecture du SAN. Le contrôle passait
            donc au vert sur une leçon d'échec et mat dont la position n'en
            était pas un : le roi noir en e8, une tour blanche arrivant en a8,
            et l'autre tour restée en h1 — qui contrôle la rangée 1, pas la 7.
            L'apprenant jouait le coup annoncé, le coach annonçait « échec et
            mat », et le roi pouvait tranquillement aller en e7.

            C'est le genre d'erreur qu'on ne voit pas en relisant : la phrase
            est juste, la position ne l'est pas. La machine, elle, sait compter
            les cases de fuite.
          */
          const attenduMat = answer.includes('#')
          const attenduEchec = answer.includes('+')
          if (attenduMat && !probe.isCheckmate()) {
            fail(
              lesson,
              index,
              `« ${answer} » annonce un mat qui n'en est pas un — le roi peut encore jouer : ${probe.moves().slice(0, 8).join(', ')}`,
            )
          } else if (attenduEchec && !probe.inCheck()) {
            fail(lesson, index, `« ${answer} » annonce un échec qui n'en est pas un`)
          } else if (!attenduMat && probe.isCheckmate()) {
            warn(lesson, index, `« ${answer} » mate sans que la notation le dise (« # » manquant)`)
          }
        }

        if (accepted.length === 0) continue

        /*
          La réponse adverse doit suivre **chacun** des coups acceptés.

          Le reste du contrôle suit le premier coup de la liste, mais l'écran,
          lui, rejoue le coup que l'apprenant a réellement choisi, puis la
          réponse. Un second coup accepté après lequel la réponse devient
          illégale laisserait l'adversaire muet et l'étape suivante figée —
          précisément sur le chemin que ce script ne parcourt pas.
        */
        if (step.reply) {
          for (const answer of accepted.slice(1)) {
            const probe = new Chess(board.fen(), { skipValidation: true })
            probe.move(answer)
            try {
              probe.move(step.reply)
            } catch {
              fail(
                lesson,
                index,
                `réponse adverse « ${step.reply} » illégale après le coup accepté « ${answer} »`,
              )
            }
          }
        }

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

      // ── Une consigne sans possibilité d'agir ? ──────────────────────────
      //
      // « Place ta dame en d3 » sur une étape d'observation : l'apprenant lit
      // un ordre, essaie, et rien ne bouge. Il en conclut que l'application est
      // cassée. Le contenu se relit mal sur ce point — la phrase est correcte
      // isolément, c'est sa place qui ne l'est pas — mais la détection est
      // mécanique.
      if (step.kind === 'show' && typeof step.say === 'string') {
        // La signature du défaut n'est pas l'impératif seul — « prends le
        // réflexe de regarder » est un conseil, pas une consigne — mais
        // l'impératif **qui nomme une case**. Là, l'apprenant essaie.
        const ordre = new RegExp(
          String.raw`\b(joue|place|prends|mets|avance|déplace|pousse|capture)\s+(ta|ton|tes|le|la|les|un|une)\s+\S+\s+(en|sur|vers)\s+[a-h][1-8]\b`,
          'i',
        )
        const trouve = ordre.exec(step.say)
        if (trouve) {
          warn(
            lesson,
            index,
            `consigne « ${trouve[0]} » sur une étape d'observation : rien n'est jouable ici`,
          )
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

/*
  Les nombres annoncés doivent être les vrais.

  Le README a annoncé 48 leçons et 328 étapes (et 149 un peu plus bas) quand
  le programme en comptait 57 et 457, et l'interface disait « 48 leçons » sous
  le menu. Personne ne recompte un programme à la main : c'est à ce contrôle
  de le faire, puisqu'il est le seul à tout parcourir.
*/
const { readFileSync } = await import('node:fs')
const { NOMBRE_DE_LECONS } = await import('../apps/web/src/lib/lessons/compte.ts')
const lecons = CHAPTERS.reduce((total, chapter) => total + chapter.lessons.length, 0)

if (NOMBRE_DE_LECONS !== lecons) {
  errors++
  console.error(
    `  ✗ lessons/compte.ts annonce ${NOMBRE_DE_LECONS} leçons, le programme en compte ${lecons}`,
  )
}

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
const annonces = [
  { motif: /(\d+) leçons/g, attendu: lecons, quoi: 'leçons' },
  { motif: /(\d+) étapes/g, attendu: steps, quoi: 'étapes' },
  { motif: /(\d+) chapitres/g, attendu: CHAPTERS.length, quoi: 'chapitres de leçons' },
]
for (const { motif, attendu, quoi } of annonces) {
  for (const trouve of readme.matchAll(motif)) {
    if (Number(trouve[1]) !== attendu) {
      errors++
      console.error(`  ✗ README : « ${trouve[0]} », le programme compte ${attendu} ${quoi}`)
    }
  }
}

console.log(
  `\n${errors === 0 ? '✓' : '✗'} ${steps} étapes vérifiées · ${errors} erreurs · ${warnings} avertissements`,
)
process.exit(errors === 0 ? 0 : 1)
