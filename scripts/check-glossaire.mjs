/**
 * Les positions du glossaire sont-elles jouables ?
 *
 * Une illustration fausse est pire que pas d'illustration : elle enseigne de
 * travers, et rien à l'écran ne le signale — un coup illégal ne se joue tout
 * simplement pas, et le lecteur croit avoir mal compris. Ce contrôle charge
 * chaque position, rejoue chaque coup, et vérifie que les cases mises en avant
 * existent.
 *
 * Il tourne avec les autres vérifications de contenu, dans `npm test`.
 */

import { Chess } from 'chess.js'
import { POSITIONS_DU_GLOSSAIRE } from '../apps/web/src/lib/glossaire-positions.ts'
import { TERMS } from '../apps/web/src/lib/glossaire.ts'

const CASES = new Set(
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].flatMap((colonne) =>
    [1, 2, 3, 4, 5, 6, 7, 8].map((rangee) => `${colonne}${rangee}`),
  ),
)

let erreurs = 0
const echec = (nom, message) => {
  console.error(`✖ ${nom} : ${message}`)
  erreurs++
}

const noms = new Set(TERMS.map((terme) => terme.name))

for (const [nom, position] of Object.entries(POSITIONS_DU_GLOSSAIRE)) {
  // Un nom qui ne correspond à aucun terme n'atteindrait jamais l'écran : c'est
  // une illustration écrite pour rien, et le plus souvent une faute de frappe.
  if (!noms.has(nom)) {
    echec(nom, 'aucun terme du glossaire ne porte ce nom')
    continue
  }

  let board
  try {
    board = new Chess(position.fen)
  } catch (error) {
    echec(nom, `position illisible — ${error.message}`)
    continue
  }

  for (const coup of position.coups ?? []) {
    try {
      board.move(coup)
    } catch {
      echec(nom, `le coup « ${coup} » n'est pas légal dans cette position`)
      break
    }
  }

  for (const carre of position.cases ?? []) {
    if (!CASES.has(carre)) echec(nom, `« ${carre} » n'est pas une case`)
  }

  if (!position.legende?.trim()) echec(nom, 'légende vide')

  // Sans coup ni case mise en avant, l'illustration ne désigne rien : elle
  // montre un échiquier et laisse chercher.
  if ((position.coups ?? []).length === 0 && (position.cases ?? []).length === 0) {
    // Toléré quand la position se suffit — un pat, un zugzwang —, mais on le
    // dit, pour que ce soit un choix et non un oubli.
    console.log(`  ${nom} : position seule, sans coup ni case désignée.`)
  }
}

const total = Object.keys(POSITIONS_DU_GLOSSAIRE).length
if (erreurs > 0) {
  console.error(`\n${erreurs} problème(s) sur ${total} positions du glossaire.`)
  process.exit(1)
}
console.log(`✔ ${total} positions du glossaire, toutes jouables.`)
