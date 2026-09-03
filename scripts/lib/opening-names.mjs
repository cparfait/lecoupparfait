/**
 * Traduction française des noms d'ouvertures.
 *
 * Le jeu de données Lichess est en anglais. Plutôt que de traduire 3 810 lignes
 * à la main, on procède en deux temps :
 *
 *  1. un dictionnaire des **familles** — les noms consacrés en français, qui ne
 *     se déduisent d'aucune règle (« Ruy Lopez » se dit « Partie espagnole »,
 *     « King's Indian » se dit « Est-indienne ») ;
 *  2. une traduction **terme à terme** du reste : les qualificatifs de variantes
 *     suivent des règles régulières (`Variation` → `Variante`, `Accepted` →
 *     `Accepté`).
 *
 * Les noms propres (Najdorf, Sveshnikov, Marshall) restent tels quels : c'est
 * l'usage français.
 */

/**
 * Familles d'ouvertures : le segment avant le premier « : ».
 * Traduction par correspondance exacte, la plus fiable.
 */
const FAMILIES = {
  // ── Ouvertures ouvertes (1.e4 e5) ─────────────────────────────────────────
  'Ruy Lopez': 'Partie espagnole',
  'Italian Game': 'Partie italienne',
  'Scotch Game': 'Partie écossaise',
  'Scotch Opening': 'Ouverture écossaise',
  'Four Knights Game': 'Partie des quatre cavaliers',
  'Three Knights Opening': 'Partie des trois cavaliers',
  "Bishop's Opening": 'Ouverture du fou',
  'Vienna Game': 'Partie viennoise',
  "King's Gambit": 'Gambit du roi',
  "King's Gambit Accepted": 'Gambit du roi accepté',
  "King's Gambit Declined": 'Gambit du roi refusé',
  'Petrov’s Defense': 'Défense russe',
  "Petrov's Defense": 'Défense russe',
  'Russian Game': 'Partie russe',
  'Philidor Defense': 'Défense Philidor',
  'Hungarian Defense': 'Défense hongroise',
  'Ponziani Opening': 'Ouverture Ponziani',
  'Center Game': 'Partie du centre',
  'Danish Gambit': 'Gambit danois',
  'Latvian Gambit': 'Gambit letton',
  'Elephant Gambit': 'Gambit de l’éléphant',
  'Damiano Defense': 'Défense Damiano',
  'Portuguese Opening': 'Ouverture portugaise',
  'Ponziani Countergambit': 'Contre-gambit Ponziani',

  // ── Défenses semi-ouvertes (1.e4 autre) ───────────────────────────────────
  'Sicilian Defense': 'Défense sicilienne',
  'French Defense': 'Défense française',
  'Caro-Kann Defense': 'Défense Caro-Kann',
  'Scandinavian Defense': 'Défense scandinave',
  'Alekhine Defense': 'Défense Alekhine',
  'Pirc Defense': 'Défense Pirc',
  'Modern Defense': 'Défense moderne',
  'Nimzowitsch Defense': 'Défense Nimzowitsch',
  'Owen Defense': 'Défense Owen',
  'St. George Defense': 'Défense Saint-Georges',
  'Borg Defense': 'Défense Borg',

  // ── Ouvertures fermées (1.d4 d5) ──────────────────────────────────────────
  "Queen's Gambit": 'Gambit dame',
  "Queen's Gambit Accepted": 'Gambit dame accepté',
  "Queen's Gambit Declined": 'Gambit dame refusé',
  'Slav Defense': 'Défense slave',
  'Semi-Slav Defense': 'Défense semi-slave',
  'Chigorin Defense': 'Défense Tchigorine',
  'Albin Countergambit': 'Contre-gambit Albin',
  'Tarrasch Defense': 'Défense Tarrasch',
  'Colle System': 'Système Colle',
  'London System': 'Système de Londres',
  'Torre Attack': 'Attaque Torre',
  'Trompowsky Attack': 'Attaque Trompowsky',
  'Richter-Veresov Attack': 'Attaque Richter-Veresov',
  'Stonewall Attack': 'Attaque Stonewall',
  'Blackmar-Diemer Gambit': 'Gambit Blackmar-Diemer',
  "Queen's Pawn Game": 'Partie du pion dame',
  'Rapport-Jobava System': 'Système Rapport-Jobava',

  // ── Défenses indiennes (1.d4 Cf6) ─────────────────────────────────────────
  'Indian Defense': 'Défense indienne',
  "King's Indian Defense": 'Défense est-indienne',
  "Queen's Indian Defense": 'Défense ouest-indienne',
  'Nimzo-Indian Defense': 'Défense nimzo-indienne',
  'Bogo-Indian Defense': 'Défense bogo-indienne',
  'Old Indian Defense': 'Vieille défense indienne',
  'Grunfeld Defense': 'Défense Grünfeld',
  'Grünfeld Defense': 'Défense Grünfeld',
  'Benoni Defense': 'Défense Benoni',
  'Modern Benoni': 'Benoni moderne',
  'Benko Gambit': 'Gambit Benko',
  'Volga Gambit': 'Gambit Volga',
  'Budapest Gambit': 'Gambit de Budapest',
  'Catalan Opening': 'Ouverture catalane',
  'Dutch Defense': 'Défense hollandaise',
  'Blumenfeld Countergambit': 'Contre-gambit Blumenfeld',

  // ── Ouvertures de flanc ───────────────────────────────────────────────────
  'English Opening': 'Ouverture anglaise',
  'Reti Opening': 'Ouverture Réti',
  'Réti Opening': 'Ouverture Réti',
  'Bird Opening': 'Ouverture Bird',
  'Zukertort Opening': 'Ouverture Zukertort',
  'Nimzo-Larsen Attack': 'Attaque Nimzo-Larsen',
  "King's Indian Attack": 'Attaque est-indienne',
  'Grob Opening': 'Ouverture Grob',
  'Polish Opening': 'Ouverture polonaise',
  'Sokolsky Opening': 'Ouverture Sokolsky',
  'Van Geet Opening': 'Ouverture Van Geet',
  'Anderssen Opening': 'Ouverture Anderssen',
  'Ware Opening': 'Ouverture Ware',
  'Clemenz Opening': 'Ouverture Clemenz',
  'Mieses Opening': 'Ouverture Mieses',
  'Saragossa Opening': 'Ouverture de Saragosse',
  'Amar Opening': 'Ouverture Amar',
  'Barnes Opening': 'Ouverture Barnes',
  'Hungarian Opening': 'Ouverture hongroise',
  Formation: 'Formation',
  'Australian Defense': 'Défense australienne',
  'Lasker Simul Special': 'Spéciale de simultanée Lasker',
  'Global Opening': 'Ouverture globale',
  'Kadas Opening': 'Ouverture Kadas',
  'Valencia Opening': 'Ouverture de Valence',
  'Venezolana Opening': 'Ouverture vénézuélienne',
  'Creepy Crawly Formation': 'Formation rampante',
  'Crab Opening': 'Ouverture du crabe',
  'Gedult Opening': 'Ouverture Gedult',
  'Mikenas Opening': 'Ouverture Mikenas',
  System: 'Système',
}

/**
 * Noms-têtes : le mot qui donne sa nature à la variante.
 *
 * L'anglais les place en fin de groupe (« Najdorf Variation »), le français en
 * tête (« Variante Najdorf »). On les extrait donc pour les remettre devant,
 * avec la préposition qui convient — « Défense **des** deux cavaliers » mais
 * « Défense Najdorf », selon que le qualificatif est un nom commun ou propre.
 */
const HEAD_NOUNS = [
  ['Countergambit', 'Contre-gambit'],
  ['Counterattack', 'Contre-attaque'],
  ['Counter-Gambit', 'Contre-gambit'],
  ['Variation', 'Variante'],
  ['Defense', 'Défense'],
  ['Defence', 'Défense'],
  ['Attack', 'Attaque'],
  ['Opening', 'Ouverture'],
  ['Gambit', 'Gambit'],
  ['System', 'Système'],
  ['Game', 'Partie'],
  ['Formation', 'Formation'],
  ['Trap', 'Piège'],
  ['Endgame', 'Finale'],
]

/**
 * Qualificatifs traduisibles. Un adjectif anglais devient un adjectif français
 * accordé au féminin, puisque tous les noms-têtes le sont sauf « Gambit »,
 * « Système » et « Piège » — cas traités par {@link agree}.
 */
const QUALIFIERS = {
  Classical: 'classique',
  Modern: 'moderne',
  Old: 'ancienne',
  Normal: 'normale',
  Quiet: 'calme',
  Closed: 'fermée',
  Open: 'ouverte',
  Orthodox: 'orthodoxe',
  Advance: 'de l’avance',
  Exchange: 'de l’échange',
  Wing: 'de l’aile',
  Center: 'du centre',
  Centre: 'du centre',
  Kingside: 'côté roi',
  Queenside: 'côté dame',
  Symmetrical: 'symétrique',
  Reversed: 'inversée',
  Inverted: 'inversée',
  Accelerated: 'accélérée',
  Delayed: 'différée',
  Deferred: 'différée',
  Declined: 'refusé',
  Accepted: 'accepté',
  Refused: 'refusé',
  Doubled: 'doublée',
  Double: 'double',
  Fianchetto: 'fianchetto',
  General: 'générale',
  Main: 'principale',
  Line: 'ligne',
  Modern_Variation: 'moderne',
  Improved: 'améliorée',
  Alternative: 'alternative',
  Hybrid: 'hybride',
  Traditional: 'traditionnelle',
  Aggressive: 'agressive',
  Positional: 'positionnelle',
  Sharp: 'tranchante',
  Solid: 'solide',
  Anti: 'Anti',
  Two: 'deux',
  Three: 'trois',
  Four: 'quatre',
  Knights: 'cavaliers',
  Knight: 'cavalier',
  Bishops: 'fous',
  Bishop: 'fou',
  Rooks: 'tours',
  Rook: 'tour',
  Queens: 'dames',
  Queen: 'dame',
  Kings: 'rois',
  King: 'roi',
  Pawns: 'pions',
  Pawn: 'pion',
  with: 'avec',
  without: 'sans',
  and: 'et',
  the: '',
  Setup: 'dispositif',
  Sacrifice: 'sacrifice',
  Push: 'poussée',
  Hunt: 'chasse',
  Invitation: 'invitation',
  Other: 'autres',
  variations: 'variantes',
}

/** Noms communs qui appellent l'article contracté « des » / « du ». */
const COMMON_NOUN_PREFIXES = new Set([
  'deux cavaliers',
  'trois cavaliers',
  'quatre cavaliers',
  'deux fous',
  'roi',
  'dame',
  'tour',
  'fou',
  'cavalier',
  'pion',
  'centre',
])

/** Accorde un adjectif féminin au masculin quand le nom-tête l'exige. */
function agree(headFr, qualifier) {
  const masculine = ['Gambit', 'Système', 'Contre-gambit', 'Piège']
  if (!masculine.includes(headFr)) return qualifier
  return qualifier
    .replace(/ée$/, 'é')
    .replace(/ancienne$/, 'ancien')
    .replace(/normale$/, 'normal')
    .replace(/fermée$/, 'fermé')
    .replace(/ouverte$/, 'ouvert')
    .replace(/générale$/, 'général')
    .replace(/principale$/, 'principal')
    .replace(/tranchante$/, 'tranchant')
    .replace(/agressive$/, 'agressif')
    .replace(/positionnelle$/, 'positionnel')
    .replace(/traditionnelle$/, 'traditionnel')
}

/**
 * Groupes de mots à traduire d'un bloc.
 *
 * Le mot à mot ne suffit pas pour les tournures possessives : « King's Pawn »
 * n'est pas « roi's pion » mais « du pion roi ». On traite donc ces expressions
 * avant de descendre au niveau du mot. L'ordre compte — du plus long au plus
 * court.
 */
const PHRASES = [
  [/King['’]s Pawn/gi, 'du pion roi'],
  [/Queen['’]s Pawn/gi, 'du pion dame'],
  [/King['’]s Knight/gi, 'du cavalier roi'],
  [/Queen['’]s Knight/gi, 'du cavalier dame'],
  [/King['’]s Bishop/gi, 'du fou roi'],
  [/Queen['’]s Bishop/gi, 'du fou dame'],
  [/King['’]s Indian/gi, 'est-indienne'],
  [/Queen['’]s Indian/gi, 'ouest-indienne'],
  [/King['’]s Side/gi, 'de l’aile roi'],
  [/Queen['’]s Side/gi, 'de l’aile dame'],
  [/King['’]s/gi, 'du roi'],
  [/Queen['’]s/gi, 'de la dame'],
  [/Bishop['’]s/gi, 'du fou'],
  [/Knight['’]s/gi, 'du cavalier'],
  [/Rook['’]s/gi, 'de la tour'],
  [/Two Knights/gi, 'deux cavaliers'],
  [/Three Knights/gi, 'trois cavaliers'],
  [/Four Knights/gi, 'quatre cavaliers'],
  [/Main Line/gi, 'ligne principale'],
  [/Other variations/gi, 'autres variantes'],
  [/Double Fianchetto/gi, 'double fianchetto'],
  [/Wing Gambit/gi, 'gambit de l’aile'],
]

/** Traduit les mots d'un qualificatif, en laissant les noms propres intacts. */
function translateQualifier(text) {
  let working = text
  for (const [pattern, replacement] of PHRASES) {
    working = working.replace(pattern, replacement)
  }

  // Le possessif anglais n'a pas d'équivalent après un nom propre : « Anderssen's
  // Opening » se dit « Ouverture Anderssen », pas « Ouverture Anderssen's ».
  working = working.replace(/(\p{Lu}[\p{L}-]*)['’]s/gu, '$1')

  return working
    .split(/\s+/)
    .map((word) => {
      const clean = word.replace(/[.,]$/, '')
      const punctuation = word.slice(clean.length)
      const translated = QUALIFIERS[clean]
      return translated === undefined ? word : translated + punctuation
    })
    .filter(Boolean)
    .join(' ')
    .trim()
}

/**
 * Traduit un segment de nom (entre deux « : » ou deux virgules) en remettant le
 * nom-tête devant, comme le veut le français.
 */
function translateSegment(segment) {
  const trimmed = segment.trim()
  if (!trimmed) return ''

  for (const [en, fr] of HEAD_NOUNS) {
    const pattern = new RegExp(`^(.*?)\\s*${escapeRegex(en)}s?$`, 'i')
    const match = trimmed.match(pattern)
    if (!match) continue

    const prefix = (match[1] ?? '').trim()
    if (!prefix) return fr

    const qualifier = agree(fr, translateQualifier(prefix))
    if (!qualifier) return fr
    // « Défense des deux cavaliers » vs « Défense Najdorf ».
    const article = COMMON_NOUN_PREFIXES.has(qualifier.toLowerCase()) ? 'des ' : ''
    return `${fr} ${article}${qualifier}`
  }

  // Aucun nom-tête : on traduit simplement les mots connus.
  return translateQualifier(trimmed) || trimmed
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Traduit un nom complet d'ouverture.
 *
 * @param {string} name nom anglais, ex. « Sicilian Defense: Najdorf Variation, English Attack »
 * @returns {string} nom français, ex. « Défense sicilienne : Variante Najdorf, Attaque anglaise »
 */
export function translateOpeningName(name) {
  const [family, ...rest] = name.split(':')
  const familyTrimmed = family.trim()

  const familyFr = FAMILIES[familyTrimmed] ?? translateSegment(familyTrimmed)

  if (rest.length === 0) return familyFr

  const detail = rest
    .join(':')
    .split(',')
    .map((part) => translateSegment(part.trim()))
    .join(', ')

  return `${familyFr} : ${detail}`
}

/** Exposé pour les tests et pour le glossaire des familles. */
export const OPENING_FAMILIES_FR = FAMILIES
