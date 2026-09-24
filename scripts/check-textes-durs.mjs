#!/usr/bin/env node
/**
 * Cherche les textes écrits en dur dans l'interface.
 *
 * Le chantier de traduction a duré trente-et-une passes, et il a buté deux fois
 * sur le même écueil : **on ne trouve pas ce qu'on cherche par des marques de
 * français**. Les premiers inventaires repéraient les accents et les mots-outils
 * — « le », « pour », « qui ». Ils ont laissé passer deux catégories entières :
 *
 *  1. les phrases dont l'expression régulière de lecture excluait par accident
 *     une lettre courante (une classe de caractères `[^'\\n]` retire aussi le
 *     « n »), soit la quasi-totalité des phrases ;
 *  2. les intitulés d'un seul mot sans accent — « Pause », « Menu », « Classement »
 *     —, qui ne ressemblent à rien de particulier, alors que ce sont précisément
 *     les textes qu'on lit le plus souvent : des boutons.
 *
 * Ce contrôle renverse donc la règle. Il ne cherche plus du français : il liste
 * **tout littéral posé à un endroit que quelqu'un lit** — `title`, `aria-label`,
 * `placeholder`, `label`, ou le texte nu entre deux balises — et laisse le tri à
 * la lecture. Il ne fait pas échouer la construction : la frontière entre un
 * intitulé à traduire et un nom propre (« Stockfish », « Groq », « CC BY-NC-SA »)
 * ne se décide pas par une règle, mais à la main, dans `NOMS_PROPRES`. Il sert à
 * ne plus jamais découvrir cent textes oubliés.
 *
 * Ce qui est volontairement hors du périmètre :
 *
 *  - le **contenu rédactionnel** — leçons, glossaire, fiches d'ouvertures,
 *    principes, aide-mémoire d'arbitrage, explications. Il est écrit, pas
 *    traduit, et n'existe qu'en français et en anglais : voir `localeDuContenu` ;
 *  - les **amorces envoyées au modèle** (`lib/ia/prompts`, `contexte`, `relais`),
 *    qui ne sont pas de l'interface ;
 *  - les **métadonnées de page** (`layout.tsx`), produites côté serveur, qui ne
 *    connaît pas la langue choisie dans le navigateur ;
 *  - `global-error.tsx`, qui s'affiche hors du fournisseur de traduction.
 *
 * Usage :  node scripts/check-textes-durs.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'src')

const HORS = [
  'lib/lessons',
  'lib/glossaire',
  'lib/ouvertures/enjeux',
  'lib/credits',
  'lib/apprendre/principes',
  'lib/apprendre/palier',
  'lib/game/themesSeance',
  'lib/i18n',
  'lib/explications',
  'lib/ia/prompts',
  'lib/ia/contexte',
  'lib/ia/relais',
  'lib/speech',
  'app/outils/arbitrage',
  'app/global-error',
  'app/api',
  // Côté serveur : journaux, courriels d'administration, fournisseurs d'IA et
  // amorces envoyées au modèle. Rien de ce qui s'y écrit n'est lu à l'écran.
  'lib/server',
  'lib/ia/providers',
  'lib/ia/coach',
  'lib/ia/modeles',
  // Le protocole UCI parlé au moteur : `setoption name … value …`.
  'lib/engine/client',
  // Des métadonnées de page, comme `layout.tsx` : produites côté serveur.
  'app/not-found',
]

/** Les attributs que quelqu'un lit, à l'œil ou à l'oreille. */
const ATTRIBUTS =
  /\b(title|aria-label|placeholder|label|description|hint|intro|titre|phrase|detail|texte|alt|blurb|note|consigne|libelle)=["']([^"'\n]{2,})["']/g

/**
 * Les mêmes attributs, quand la chaîne passe par des accolades : Prettier y met
 * un littéral trop long pour la ligne — `placeholder={\n '…'\n }` —, et il
 * échappait au motif précédent.
 */
const ATTRIBUTS_ENTRE_ACCOLADES =
  /\b(title|aria-label|placeholder|label|alt)=\{\s*["']([^"'\n]{2,})["']\s*\}/g

/** Le texte nu entre deux balises, sur une seule ligne. */
const TEXTE_EN_LIGNE = />\s*([A-ZÀ-ÿ][^<>{}\n]{1,})\s*</g

/**
 * Le texte nu seul sur sa ligne.
 *
 * C'est la forme qu'avaient presque tous les intitulés d'un mot : Prettier met
 * le contenu d'une balise sur sa propre ligne dès que les attributs débordent,
 * et le mot s'y retrouve sans aucun voisin qui le désigne comme du texte. On ne
 * le retient donc que si ses voisines le confirment — la ligne d'avant ferme une
 * balise ouvrante, celle d'après en ouvre une fermante.
 */
const TEXTE_SEUL = /^[ \t]*([A-ZÀ-ÿ][^<>{}\n,:;=]*[^\s<>{},:;=])[ \t]*$/

/**
 * Le texte collé à une interpolation.
 *
 * Troisième angle mort, et le plus coûteux des trois : `{n} jour{n > 1 ? 's' :
 * ''} d’affilée`. Aucun des deux motifs ci-dessus ne le voit — il n'est ni seul
 * sur sa ligne, ni précédé d'un chevron — et pourtant c'est du français écrit en
 * dur, avec en prime une règle de pluriel qui n'est celle d'aucune autre langue.
 * On retient donc ce qui sépare deux accolades, ou une accolade d'une balise.
 *
 * Réservé aux `.tsx` : dans un `.ts`, la même forme décrit une annotation de
 * type — `): Promise<void>` — et rien d'autre. La classe exclut par ailleurs la
 * ponctuation du code, pour la même raison.
 *
 * Le chevron n'ouvre un texte que s'il ferme une balise : celui d'une flèche
 * `=>` ou d'un `->` précède du code, et `(actuel) =>` suivi à la ligne de
 * `actuel ? { …` se lisait « actuel ? ».
 *
 * Le motif a longtemps affiché zéro sur des fautes bien réelles, pour trois
 * raisons qu'il ne faut pas remettre : il exigeait une accolade ou un chevron
 * *sur la même ligne* après le texte — or Prettier renvoie la balise suivante à
 * la ligne, et « d’affilée » en tombait — ; il refusait le deux-points, que la
 * typographie française détache (« record : ») ; et le filtre des identifiants
 * écartait ensuite tout mot en minuscules, c'est-à-dire « jour », « contre »,
 * « points ». Les mots-clés du langage sont désormais écartés nommément
 * (`MOTS_CLES`), et les propriétés de type par leur deux-points collé.
 */
const TEXTE_COLLE =
  /(?:\}|(?<![=-])>)[ \t\n]*([^<>{}\n=;()|$"'`]*[A-Za-zÀ-ÿ][^<>{}\n=;()|$"'`]*)(?:[<{]|(?=\n[ \t]*<))/g

/**
 * Une déclaration TypeScript et non une phrase.
 *
 * `TEXTE_COLLE` part de l'accolade qui ferme un bloc et s'arrête à celle, ou au
 * chevron, qui ouvre le suivant : entre les deux, dans un `.tsx`, il y a
 * souvent `interface Partie {`, `export function Liste<`, `satisfies Record<`
 * ou `& Omit<`. Aucun texte d'interface ne commence par ces mots-clés — et un
 * texte qui commencerait par « Interface » garde sa majuscule, que le motif
 * laisse passer.
 */
const DECLARATION =
  /^(?:(?:export|default|declare|async)\s+)*(?:interface|type|function|const|let|class|enum|satisfies|extends|implements|as|keyof|typeof)\b|^[&|]/

/**
 * Les noms propres, qu'on ne traduit pas.
 *
 * Le contrôle ne tranche pas entre un intitulé et un nom propre ; cette liste
 * le fait une fois pour toutes, à la main, pour ceux qui reviennent à chaque
 * passage. On n'y met qu'un nom — la marque, un moteur, un fournisseur, une
 * licence —, jamais un mot qu'une autre langue écrirait autrement : ce qui se
 * traduit passe par le dictionnaire, même d'un seul mot.
 */
const NOMS_PROPRES = new Set([
  'Le Coup Parfait',
  'Stockfish',
  'Stockfish 19',
  'Maia',
  'Lichess',
  'Groq',
  'CC BY-NC-SA',
  'Bluetooth',
  // Les échiquiers électroniques, sous le nom de leur fabricant.
  'Certabo',
  'Chessnut',
  'Smart Chess',
  'DGT Pegasus',
  'Millennium ChessLink',
  // Le dépôt d'où viennent les finales, cité par son adresse.
  'supertorpe/chessendgametraining',
])

function textesNus(src) {
  const lignes = src.split('\n')
  const sortie = []
  for (let i = 0; i < lignes.length; i++) {
    const m = TEXTE_SEUL.exec(lignes[i])
    if (!m) continue
    const avant = (lignes[i - 1] ?? '').trimEnd()
    const apres = (lignes[i + 1] ?? '').trimStart()
    if (!avant.endsWith('>') || !apres.startsWith('</')) continue
    sortie.push(m[1])
  }
  return sortie
}

/** Les types de la bibliothèque standard, qui se lisent comme des mots. */
const TYPES = new Set([
  'Promise',
  'Record',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Math',
  'Set',
  'Map',
  'React',
  'Partial',
  'Readonly',
  'Error',
])

/**
 * Les mots-clés du langage.
 *
 * `TEXTE_COLLE` lit ce qui sépare deux accolades : `} else {`, `} catch {`,
 * `} finally {` en sont, et ce sont des mots minuscules comme « jour ». Le
 * filtre des identifiants les écartait tous, et avec eux tous les mots de
 * phrase collés à un nombre — « jour », « contre », « points » : il fallait
 * les séparer nommément.
 */
const MOTS_CLES = new Set(['else', 'catch', 'finally', 'try', 'return', 'do', 'while'])

/** Les unités et propriétés du CSS, qui s'écrivent aussi en minuscules. */
const MOTS_DU_CSS = new Set(['ms', 'transform'])

/** Ce qui n'est pas une phrase : identifiants, nombres, sigles, symboles. */
const TECHNIQUE =
  /^(?:[a-z0-9_-]+|[\d .,:%+-]+|2D|3D|PGN|FEN|UCI|SAN|ELO|Elo|OK|SVG|USB|HID|CSS|JSON|GATT|npm|node|→|←|↑|↓|…|×|(?:npm|docker) [a-z :-]+)$/

/**
 * Les chaînes que le code fabrique, et que le balisage ne montre pas.
 *
 * Quatrième angle mort : un texte qui n'est jamais écrit entre deux balises,
 * parce qu'il est calculé avant. `n > 1 ? 'Blancs' : 'Noirs'`, un gabarit
 * `` `${n} j restants` ``, un intitulé d'onglet rangé dans une table —
 * `{ id: 'rapid', label: 'Rapide' }` — et lu plus bas par `{entry.label}`.
 * Aucun des motifs précédents ne pouvait les voir : ils n'ont pas de chevron.
 *
 * Ces chaînes-là sont surtout du code — des classes, des identifiants, des
 * adresses. On ne garde que celles qui ressemblent à une phrase : voir
 * `ressembleAUnePhrase`.
 */
const OPERANDE = /(?:\?\?|\|\||[?:])\s*(['"])([^'"\n]+)\1/g
const GABARIT = /`([^`\n]*)`/g
const INTERPOLATION = /\$\{(?:[^{}]|\{[^{}]*\})*\}/g

/**
 * Les appels qui parlent au développeur : un journal, une exception. Leur texte
 * n'atteint pas l'écran — ou, s'il l'atteint, c'est par un `catch` qui doit
 * l'envelopper d'une clé. On retire l'appel entier, parenthèses comprises : le
 * message est souvent sur la ligne d'après.
 */
const POUR_LE_DEVELOPPEUR = /console\.\w+\(|new Error\(/g

function sansAppelsAuDeveloppeur(src) {
  let sortie = ''
  let depuis = 0
  POUR_LE_DEVELOPPEUR.lastIndex = 0
  let m
  while ((m = POUR_LE_DEVELOPPEUR.exec(src))) {
    let profondeur = 1
    let i = m.index + m[0].length
    while (i < src.length && profondeur > 0) {
      if (src[i] === '(') profondeur++
      else if (src[i] === ')') profondeur--
      i++
    }
    sortie += src.slice(depuis, m.index)
    depuis = i
    POUR_LE_DEVELOPPEUR.lastIndex = i
  }
  return sortie + src.slice(depuis)
}

/**
 * Un chemin de clé composé, `` `career2.xpLines.${cle}One` `` : des identifiants
 * et des points, sans une espace. Ce n'est pas du texte, c'est son adresse.
 */
const CHEMIN_DE_CLE = /^[\w.]*(?:\$\{[^}]*\}[\w.]*)+$/

function chainesDeCode(src) {
  const sortie = []
  const code = sansAppelsAuDeveloppeur(src)
  OPERANDE.lastIndex = 0
  let m
  while ((m = OPERANDE.exec(code))) sortie.push(m[2])
  GABARIT.lastIndex = 0
  while ((m = GABARIT.exec(code))) {
    if (!m[1].includes('${')) continue
    if (m[1].includes('.') && CHEMIN_DE_CLE.test(m[1])) continue
    // Les morceaux gardent leurs espaces : « ${n} j » se distingue ainsi de
    // « ${n}ms », une durée CSS collée à son nombre.
    for (const morceau of m[1].split(INTERPOLATION)) sortie.push(morceau)
  }
  return sortie
}

/**
 * Une phrase, et non une classe, un identifiant ou une adresse.
 *
 * Un accent ou une apostrophe typographique suffisent. Sinon il faut soit une
 * majuscule initiale (« Blancs », « Rapide »), soit plusieurs mots en
 * minuscules sans la ponctuation des classes et des adresses (« j restants »),
 * soit un mot seul détaché d'une interpolation par une espace (« ${n} j »).
 *
 * Une capitale seule, ou suivie de nombres, est une commande de tracé SVG
 * (`M 0,${y} L`) ou une lettre de pièce : pas une phrase.
 */
function ressembleAUnePhrase(brut) {
  const valeur = brut.trim()
  if (!/[A-Za-zÀ-ÿ]/.test(valeur)) return false
  if (/^[A-Z](?:[\s\d,.-]*)$/.test(valeur)) return false
  if (/^(?:ms|s|px|em|rem|deg|vh|vw|fr)\b/.test(brut)) return false
  if (/[À-ÿ’]/.test(valeur)) return true
  if (/[A-Z]/.test(valeur[0])) return !/[-_/:.[\]=#]|^[A-Z][a-z]+[A-Z]/.test(valeur)
  const mots = valeur.split(/\s+/)
  if (mots.some((mot) => !/^[A-Za-z]+[,.;!?]?$/.test(mot))) return false
  return mots.length > 1 || /^\s|\s$/.test(brut)
}

function* fichiers(dossier) {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin)
    else if (/\.tsx?$/.test(entree)) yield chemin
  }
}

let total = 0
const parFichier = []

for (const chemin of fichiers(RACINE)) {
  const rel = chemin
    .slice(RACINE.length + 1)
    .split('\\')
    .join('/')
  if (HORS.some((h) => rel.startsWith(h))) continue
  if (rel.endsWith('layout.tsx')) continue

  // Les commentaires n'intéressent personne : le projet les écrit en français
  // par convention de maison, et ils ne s'affichent jamais.
  //
  // Les fins de ligne sont ramenées à `\n` d'abord. Sous Windows, git extrait
  // les sources en `\r\n`, et le `\r` restait collé à chaque ligne : ni
  // `TEXTE_SEUL` ni `TEXTE_COLLE` ne le tolèrent, si bien qu'une même copie
  // de travail montrait vingt-neuf textes quand il y en avait plus de
  // quatre-vingts.
  const src = readFileSync(chemin, 'utf8')
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  // `colle` marque les fragments venus de `TEXTE_COLLE`. Ils échappent au filtre
  // des identifiants : « jour » entre deux accolades est un mot de phrase, pas
  // un nom de variable — et c'est exactement la moitié qui manquait.
  const candidats = [...textesNus(src)].map((valeur) => [valeur, false])
  const motifs = [ATTRIBUTS, ATTRIBUTS_ENTRE_ACCOLADES, TEXTE_EN_LIGNE]
  if (rel.endsWith('.tsx')) motifs.push(TEXTE_COLLE)
  for (const motif of motifs) {
    motif.lastIndex = 0
    let m
    while ((m = motif.exec(src))) candidats.push([m[2] ?? m[1], motif === TEXTE_COLLE])
  }
  for (const valeur of chainesDeCode(src)) {
    if (ressembleAUnePhrase(valeur)) candidats.push([valeur, true])
  }

  const trouves = new Set()
  for (const [brut, colle] of candidats) {
    const valeur = brut.trim()
    if (!valeur) continue
    // Une propriété de type ou d'objet, `modes: Array<` ou `black:` : le deux-
    // points collé au mot. La typographie française le détache — « record : ».
    if (/^[A-Za-z_]\w*\??:/.test(valeur) || valeur.startsWith(',')) continue
    if (MOTS_CLES.has(valeur) || MOTS_DU_CSS.has(valeur)) continue
    if (TECHNIQUE.test(valeur) && !(colle && /^[a-zà-ÿ]+$/.test(valeur))) continue
    if (valeur.startsWith('http') || valeur.startsWith('/') || valeur.includes('--')) continue
    if (!colle && /^[a-z][a-zA-Z]*$/.test(valeur)) continue
    // Du code et non du texte : un appel, une conjonction logique, une constante
    // en capitales, ou un type de la bibliothèque standard. Un mot capitalisé
    // seul, lui, est retenu : « Pause », « Menu », « Erreur » sont des boutons.
    if (/\(|&&|\|\||=>|\.[a-zA-Z]/.test(valeur)) continue
    if (/^[A-Z][A-Z_0-9]+$/.test(valeur)) continue
    if (TYPES.has(valeur)) continue
    if (DECLARATION.test(valeur)) continue
    if (NOMS_PROPRES.has(valeur)) continue
    trouves.add(valeur)
  }

  if (trouves.size) {
    total += trouves.size
    parFichier.push([rel, [...trouves]])
  }
}

parFichier.sort((a, b) => b[1].length - a[1].length)

for (const [rel, valeurs] of parFichier) {
  console.log(`\n  ${rel}`)
  for (const valeur of valeurs) console.log(`    · ${valeur.slice(0, 110)}`)
}

console.log(
  total === 0
    ? '\n✅  Aucun texte en dur dans l’interface.'
    : `\nℹ️   ${total} littéral(aux) à relire dans ${parFichier.length} fichier(s).` +
        '\n    Tous ne sont pas à traduire : un nom propre reste écrit tel quel. S’il revient,' +
        '\n    ajoute-le à `NOMS_PROPRES` ; sinon, passe le texte par le dictionnaire.',
)
