#!/usr/bin/env node
/**
 * Vérifie les fiches de pièges.
 *
 * `check-lessons.mjs` contrôle déjà la partie échiquéenne de toutes les leçons :
 * chaque coup est légal, chaque mat annoncé en est un, chaque réponse adverse
 * est jouable. Il ne sait rien, en revanche, de ce qui s'affiche **avant** la
 * première étape — et c'est précisément là que se joue l'honnêteté du chapitre.
 *
 * Un piège se présente avec quatre promesses : l'ouverture où il vit, le camp
 * qu'on tient, ce qu'il coûte quand l'adversaire ne mord pas, et le motif qui
 * conclut. Une fiche qui annonce « tu joues les Noirs » sur une leçon qui
 * s'ouvre du côté blanc apprend une erreur à quelqu'un qui n'a aucun moyen de
 * la détecter. Ce script refuse donc :
 *
 *  - une leçon de piège sans fiche, ou une fiche incomplète ;
 *  - un camp déclaré qui contredit l'orientation réelle de la leçon ;
 *  - une clé de fiche absente du dictionnaire français ou anglais ;
 *  - une mise en garde vide ou expédiée en trois mots : c'est le seul endroit
 *    où l'on dit au lecteur quand le piège se retourne contre lui.
 *
 * Usage :  node scripts/check-pieges.mjs
 */

const { CHAPTERS } = await import('../apps/web/src/lib/lessons/index.ts')
const { fr } = await import('../apps/web/src/lib/i18n/fr.ts')
const { en } = await import('../apps/web/src/lib/i18n/en.ts')

/**
 * Les chapitres dont toutes les leçons enseignent un piège.
 *
 * Ailleurs, la fiche est facultative : une leçon sur la fourchette n'a ni camp
 * ni coût, et lui en inventer un serait faux.
 */
const CHAPITRES_PIEGES = new Set(['pieges', 'mats-ouverture'])

/** Les cinq champs d'une fiche, tous obligatoires dès qu'il y en a une. */
const CHAMPS = ['opening', 'color', 'risk', 'theme', 'caution']

/** Longueur en dessous de laquelle une mise en garde n'en est pas une. */
const GARDE_MINIMALE = 40

let errors = 0
let fiches = 0

function fail(id, message) {
  errors++
  console.error(`  ✗ ${id} — ${message}`)
}

/** Descend un chemin pointé dans un dictionnaire. */
function valeur(dictionnaire, chemin) {
  return chemin
    .split('.')
    .reduce(
      (noeud, cle) => (noeud && typeof noeud === 'object' ? noeud[cle] : undefined),
      dictionnaire,
    )
}

for (const chapter of CHAPTERS) {
  const attendu = CHAPITRES_PIEGES.has(chapter.id)
  const avec = chapter.lessons.filter((lesson) => lesson.trap)
  if (!attendu && avec.length === 0) continue

  console.log(`\n${chapter.icon}  ${chapter.id} — ${avec.length}/${chapter.lessons.length} fiches`)

  for (const lesson of chapter.lessons) {
    if (!lesson.trap) {
      if (attendu) fail(lesson.id, 'leçon de piège sans fiche (champ `trap` absent)')
      continue
    }
    fiches++
    const brief = lesson.trap

    // ── Les cinq champs ───────────────────────────────────────────────────
    for (const champ of CHAMPS) {
      if (!brief[champ]) fail(lesson.id, `fiche incomplète : \`${champ}\` manquant`)
    }
    if (brief.color !== 'w' && brief.color !== 'b') {
      fail(lesson.id, `camp invalide : « ${brief.color} » — attendu « w » ou « b »`)
    }

    /*
      ── Le camp déclaré est-il celui qu'on joue ? ────────────────────────

      L'orientation de l'échiquier suit l'apprenant : c'est elle qui dit de
      quel côté il est assis. On regarde donc la première étape où il doit
      agir — pas la première étape tout court, qui est souvent une
      observation posée avant que la leçon ne commence vraiment.

      Les leçons de pièges se jouent en deux temps : on tend, puis on change
      de camp pour déjouer. Seule la première moitié compte ici, et elle est
      par construction la première étape jouable.
    */
    const premiereAction = lesson.steps.find(
      (step) => step.kind === 'play' || step.kind === 'choose' || step.kind === 'free',
    )
    if (premiereAction) {
      const joue = premiereAction.orientation ?? 'w'
      if (joue !== brief.color) {
        fail(
          lesson.id,
          `la fiche annonce les ${brief.color === 'w' ? 'Blancs' : 'Noirs'}, ` +
            `mais la première étape jouable se joue côté ${joue === 'w' ? 'blanc' : 'noir'}`,
        )
      }
    } else {
      fail(lesson.id, 'aucune étape jouable : la fiche annonce un camp que personne ne tient')
    }

    // ── Les textes existent-ils dans les deux langues ? ───────────────────
    for (const champ of ['opening', 'risk', 'theme', 'caution']) {
      const cle = brief[champ]
      if (typeof cle !== 'string') continue
      for (const [langue, dictionnaire] of [
        ['fr', fr],
        ['en', en],
      ]) {
        const texte = valeur(dictionnaire, cle)
        if (typeof texte !== 'string') {
          fail(lesson.id, `clé absente du dictionnaire ${langue} : ${cle}`)
        } else if (texte.trim() === '') {
          fail(lesson.id, `texte vide en ${langue} : ${cle}`)
        }
      }
    }

    /*
      ── La mise en garde dit-elle quelque chose ? ─────────────────────────

      « À jouer avec prudence » est une non-phrase : elle occupe la place de
      l'avertissement sans en donner un. Le seuil est grossier, mais il
      attrape le cas où l'on a rempli le champ pour faire passer ce script.
    */
    const garde = valeur(fr, brief.caution)
    if (typeof garde === 'string' && garde.trim().length < GARDE_MINIMALE) {
      fail(
        lesson.id,
        `mise en garde trop courte (${garde.trim().length} caractères) : elle doit dire quand le piège se retourne`,
      )
    }

    const camp = brief.color === 'w' ? 'Blancs' : 'Noirs'
    console.log(`  · ${lesson.id} · ${valeur(fr, brief.opening)} · ${camp}`)
  }
}

console.log(`\n${errors === 0 ? '✓' : '✗'} ${fiches} fiches vérifiées · ${errors} erreurs`)
process.exit(errors === 0 ? 0 : 1)
