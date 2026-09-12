/**
 * Les langues de l'application.
 *
 * Le jeu d'échecs n'a pas de langue. Ses joueurs, si : la fédération
 * internationale compte près de deux cents pays, et les plus fortes traditions
 * du jeu — Russie, Inde, Chine, Arménie, Azerbaïdjan, Géorgie — ne parlent
 * aucune des deux langues dans lesquelles cette application était écrite.
 *
 * ── Pourquoi une liste et non deux fichiers ─────────────────────────────────
 *
 * Le dictionnaire vivait en deux constantes, `fr` et `en`, et le type de la
 * seconde était `Dictionary` — c'est-à-dire **exactement** celui de la
 * première. Cette contrainte est excellente à deux langues : une clé ajoutée en
 * français et oubliée en anglais casse la compilation, donc aucune traduction
 * ne dérive en silence. Elle devient impraticable à trente-six : il faudrait
 * traduire les trois cent vingt-deux clés d'un coup pour qu'une langue existe,
 * et une langue à quatre-vingt-dix pour cent ne compilerait pas.
 *
 * Chaque langue autre que le français est donc **partielle par construction**,
 * et `t()` remonte la chaîne — langue choisie, puis anglais, puis français
 * (voir `index.tsx`). Une clé manquante rend une phrase dans une autre langue,
 * ce qui est laid mais lisible ; une clé inventée, elle, reste refusée par le
 * typage. On perd le « tout ou rien » et on garde le « rien d'inventé ».
 *
 * `scripts/check-langues.mjs` mesure la couverture de chacune et l'affiche : le
 * seul moyen de savoir où en est une traduction est de la compter.
 *
 * ── Les drapeaux ────────────────────────────────────────────────────────────
 *
 * Une langue n'est pas un pays. L'espagnol n'appartient pas à l'Espagne, le
 * portugais pas plus au Portugal qu'au Brésil, et l'arabe n'a pas de drapeau du
 * tout. On en met quand même un quand il ne prête pas à confusion, parce qu'on
 * repère sa langue dans une liste de trente-six par la vignette bien avant
 * d'avoir lu le mot — et on n'en met aucun quand il faudrait choisir un pays
 * pour une langue qui en couvre vingt. Le code ISO prend alors sa place.
 *
 * Les vignettes sont des images SVG posées dans `public/drapeaux/`, pas des
 * émojis : Windows n'a pas de police de drapeaux et affiche les deux lettres du
 * code à la place. C'était le cas ici, et cela ressemblait à un défaut
 * d'affichage plutôt qu'à un choix.
 */

export interface Langue {
  /** Code ISO 639-1, qui sert de clé partout. */
  code: string
  /** Le nom de la langue **dans cette langue**. Jamais traduit. */
  nom: string
  /**
   * Code du drapeau dans `public/drapeaux/`, ou `null`.
   *
   * `null` quand aucun pays ne représente honnêtement la langue : l'arabe, qui
   * en couvre vingt-cinq, et l'espagnol ou le portugais, dont le pays d'origine
   * abrite une minorité des locuteurs. Le code ISO s'affiche alors à la place.
   */
  drapeau: string | null
  /**
   * Étiquette BCP-47, pour la synthèse vocale et le formatage des nombres.
   *
   * `Intl` et l'API de synthèse ne comprennent pas « fr » tout seul aussi bien
   * qu'un couple langue-région : on donne la région la plus courante.
   */
  bcp47: string
  /** Écriture de droite à gauche. */
  rtl?: boolean
}

/**
 * Les trente-six langues, dans l'ordre où on les propose.
 *
 * Le français en tête parce qu'il est la langue de référence du dictionnaire,
 * l'anglais juste après parce qu'il est le repli de tous les autres. Le reste
 * par familles — latines, germaniques, slaves, puis le reste du monde — parce
 * qu'une liste de trente-six triée par code ISO ne se parcourt pas.
 */
export const LANGUES: Langue[] = [
  // ── Les deux langues complètes ──────────────────────────────────────────
  { code: 'fr', nom: 'Français', drapeau: 'fr', bcp47: 'fr-FR' },
  { code: 'en', nom: 'English', drapeau: 'gb', bcp47: 'en-GB' },

  // ── Langues latines ─────────────────────────────────────────────────────
  // L'espagnol et le portugais sans drapeau : cinq cents millions de personnes
  // parlent espagnol, quarante-sept millions vivent en Espagne. L'allemand,
  // l'italien ou le russe gardent le leur — leur pays d'origine y abrite la
  // grande majorité des locuteurs, et la vignette aide à retrouver sa ligne.
  { code: 'es', nom: 'Español', drapeau: null, bcp47: 'es-ES' },
  { code: 'pt', nom: 'Português', drapeau: null, bcp47: 'pt-BR' },
  { code: 'it', nom: 'Italiano', drapeau: 'it', bcp47: 'it-IT' },
  { code: 'ro', nom: 'Română', drapeau: 'ro', bcp47: 'ro-RO' },
  { code: 'ca', nom: 'Català', drapeau: null, bcp47: 'ca-ES' },

  // ── Langues germaniques ─────────────────────────────────────────────────
  { code: 'de', nom: 'Deutsch', drapeau: 'de', bcp47: 'de-DE' },
  { code: 'nl', nom: 'Nederlands', drapeau: 'nl', bcp47: 'nl-NL' },
  { code: 'sv', nom: 'Svenska', drapeau: 'se', bcp47: 'sv-SE' },
  { code: 'da', nom: 'Dansk', drapeau: 'dk', bcp47: 'da-DK' },
  { code: 'nb', nom: 'Norsk bokmål', drapeau: 'no', bcp47: 'nb-NO' },
  { code: 'is', nom: 'Íslenska', drapeau: 'is', bcp47: 'is-IS' },

  // ── Langues slaves ──────────────────────────────────────────────────────
  { code: 'ru', nom: 'Русский', drapeau: 'ru', bcp47: 'ru-RU' },
  { code: 'uk', nom: 'Українська', drapeau: 'ua', bcp47: 'uk-UA' },
  { code: 'pl', nom: 'Polski', drapeau: 'pl', bcp47: 'pl-PL' },
  { code: 'cs', nom: 'Čeština', drapeau: 'cz', bcp47: 'cs-CZ' },
  { code: 'sk', nom: 'Slovenčina', drapeau: 'sk', bcp47: 'sk-SK' },
  { code: 'sr', nom: 'Српски', drapeau: 'rs', bcp47: 'sr-RS' },
  { code: 'hr', nom: 'Hrvatski', drapeau: 'hr', bcp47: 'hr-HR' },
  { code: 'sl', nom: 'Slovenščina', drapeau: 'si', bcp47: 'sl-SI' },
  { code: 'bg', nom: 'Български', drapeau: 'bg', bcp47: 'bg-BG' },

  // ── Autres langues d'Europe ─────────────────────────────────────────────
  { code: 'hu', nom: 'Magyar', drapeau: 'hu', bcp47: 'hu-HU' },
  { code: 'fi', nom: 'Suomi', drapeau: 'fi', bcp47: 'fi-FI' },
  { code: 'et', nom: 'Eesti', drapeau: 'ee', bcp47: 'et-EE' },
  { code: 'lv', nom: 'Latviešu', drapeau: 'lv', bcp47: 'lv-LV' },
  { code: 'lt', nom: 'Lietuvių', drapeau: 'lt', bcp47: 'lt-LT' },
  { code: 'el', nom: 'Ελληνικά', drapeau: 'gr', bcp47: 'el-GR' },
  { code: 'tr', nom: 'Türkçe', drapeau: 'tr', bcp47: 'tr-TR' },

  // ── Le Caucase, trois pays d'échecs ─────────────────────────────────────
  // L'Arménie, l'Azerbaïdjan et la Géorgie comptent parmi les nations les plus
  // titrées du jeu ; leurs langues n'ont d'équivalent nulle part ailleurs.
  { code: 'hy', nom: 'Հայերեն', drapeau: 'am', bcp47: 'hy-AM' },
  { code: 'az', nom: 'Azərbaycan dili', drapeau: 'az', bcp47: 'az-AZ' },
  { code: 'ka', nom: 'ქართული', drapeau: 'ge', bcp47: 'ka-GE' },

  // ── Asie ────────────────────────────────────────────────────────────────
  { code: 'hi', nom: 'हिन्दी', drapeau: 'in', bcp47: 'hi-IN' },
  { code: 'zh', nom: '简体中文', drapeau: null, bcp47: 'zh-CN' },
  { code: 'ja', nom: '日本語', drapeau: 'jp', bcp47: 'ja-JP' },
  { code: 'ko', nom: '한국어', drapeau: 'kr', bcp47: 'ko-KR' },
  { code: 'vi', nom: 'Tiếng Việt', drapeau: 'vn', bcp47: 'vi-VN' },
  { code: 'id', nom: 'Bahasa Indonesia', drapeau: 'id', bcp47: 'id-ID' },

  // ── Écritures de droite à gauche ────────────────────────────────────────
  // L'arabe sans drapeau : vingt-cinq pays le parlent, en choisir un serait
  // arbitraire et, dans cette région du monde, tout sauf neutre.
  { code: 'ar', nom: 'العربية', drapeau: null, bcp47: 'ar-SA', rtl: true },
  { code: 'fa', nom: 'فارسی', drapeau: 'ir', bcp47: 'fa-IR', rtl: true },
  { code: 'he', nom: 'עברית', drapeau: 'il', bcp47: 'he-IL', rtl: true },
]

/** Les codes, dans l'ordre de la liste. */
export const CODES_LANGUES = LANGUES.map((langue) => langue.code)

const PAR_CODE = new Map(LANGUES.map((langue) => [langue.code, langue]))

/** La langue d'un code, ou le français si le code est inconnu. */
export function langue(code: string): Langue {
  return PAR_CODE.get(code) ?? LANGUES[0]!
}

/**
 * Les drapeaux réellement nécessaires, pour le script qui les télécharge.
 *
 * Dérivés de la liste plutôt que recopiés : ajouter une langue avec un drapeau
 * et oublier de le télécharger donnerait une vignette cassée, et l'oubli serait
 * invisible tant qu'on ne choisit pas cette langue-là.
 */
export const DRAPEAUX_REQUIS = LANGUES.map((l) => l.drapeau).filter(
  (code): code is string => code !== null,
)
