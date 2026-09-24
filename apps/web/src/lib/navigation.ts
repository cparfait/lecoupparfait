/**
 * La structure de la navigation, en un seul endroit.
 *
 * Le principe de rangement : **à gauche ce qu'on veut faire, à droite soi.**
 * On ouvre l'application en sachant qu'on vient jouer, ou progresser, bien
 * avant de savoir avec quel outil — d'où un classement par verbe plutôt que
 * par nature d'objet. Ranger « finales » dans une « bibliothèque » obligerait à
 * deviner dans quelle boîte on l'a mise.
 *
 * Trois verbes, et non plus quatre : jouer, progresser, analyser. « Apprendre »
 * et « S'entraîner » se disputaient la même intention — devenir meilleur — et
 * obligeaient à choisir entre deux mots avant de trouver le palier, le test de
 * niveau ou les finales, que chacun des deux aurait pu revendiquer. Le test de
 * niveau figurait d'ailleurs dans les deux. Ils ne font plus qu'une rubrique,
 * « Progresser », et la barre du téléphone y gagne un onglet d'air.
 *
 * Ce fichier ne contient que des données. L'en-tête, le menu mobile et la barre
 * inférieure les lisent tous les trois : auparavant chacun tenait sa propre
 * liste, et elles divergeaient — sept pages n'étaient plus atteignables depuis
 * nulle part.
 */

import {
  BarChart3,
  BookMarked,
  BookOpen,
  Calculator,
  Crown,
  Dices,
  Eye,
  Gauge,
  GraduationCap,
  Grid3x3,
  Handshake,
  Headphones,
  Home,
  Info,
  LayoutGrid,
  ListChecks,
  Mail,
  Monitor,
  Puzzle,
  Scale,
  Settings,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from './i18n/index.tsx'
import { NOMBRE_DE_LECONS } from './lessons/compte.ts'

export interface EntreeNav {
  href: string
  labelKey: TranslationKey
  icon: LucideIcon
  /** Une demi-phrase affichée sous le libellé, dans les panneaux déroulants. */
  hintKey?: TranslationKey
  /** Valeurs interpolées dans `hintKey` — un nombre calculé, jamais recopié. */
  hintVars?: Record<string, string | number>
  /**
   * Autres chemins que cette entrée éclaire dans la barre inférieure.
   *
   * « Progresser » mène au sommaire `/progresser`, mais ce qu'il propose vit
   * sous `/apprendre`, `/puzzles`, `/finales`, `/carriere`… : sans cela,
   * l'onglet s'éteignait dès qu'on ouvrait ce qu'il venait de proposer — on ne
   * savait plus dans quelle rubrique on se trouvait.
   */
  actifSur?: string[]
}

export interface SectionNav {
  id: string
  labelKey: TranslationKey
  icon: LucideIcon
  /**
   * Page-sommaire de la section, quand elle existe.
   *
   * Le titre du panneau y renvoie : un menu déroulant se referme au premier
   * clic, et quelqu'un qui veut simplement « voir ce qu'il y a dans Jouer »
   * doit pouvoir atterrir quelque part plutôt que d'avoir à choisir tout de
   * suite.
   */
  sommaire?: string
  /**
   * Chemins qui relèvent de la rubrique sans figurer dans ses entrées.
   *
   * Les anciennes pages-sommaires `/entrainer` et `/apprendre` restent
   * ouvertes — des liens y mènent encore — mais ne sont plus des entrées du
   * menu. Sans cette liste, leur titre perdait la teinte de sa rubrique et
   * l'en-tête n'allumait plus aucun onglet : on arrivait nulle part.
   */
  aussiSur?: string[]
  /**
   * Teinte de la section.
   *
   * Une teinte par rubrique, et aucune n'est le violet de l'action. Elles
   * étaient quatre pour six rubriques, deux servaient donc deux fois, et le
   * violet teintait « Jouer » et « Analyse » en plus des boutons : la couleur
   * ne disait plus rien. Chaque rubrique a la sienne (`--rub-*` dans
   * `globals.css`), posée à un seul endroit — la pastille d'icône de ses cartes
   * et le trait de son onglet. Dedans, une page est monochrome.
   *
   * Toujours une variable du thème, jamais une valeur en dur : le thème clair
   * assombrit chacune pour tenir le contraste.
   */
  teinte: string
  entrees: EntreeNav[]
}

export const SECTIONS: SectionNav[] = [
  {
    id: 'jouer',
    teinte: 'var(--rub-jouer)',
    labelKey: 'nav.play',
    icon: Swords,
    sommaire: '/jouer',
    entrees: [
      // D'abord les deux façons de jouer une partie tout de suite : contre la
      // machine, contre quelqu'un. Ce sont elles qu'on vient chercher, et elles
      // ne demandent rien.
      {
        href: '/jouer/ordinateur',
        labelKey: 'nav.vsComputer',
        icon: Monitor,
        hintKey: 'nav.vsComputerHint',
      },
      // « Contre quelqu'un » couvre les deux rythmes : le lien en temps réel et
      // la correspondance sur plusieurs jours. Ils étaient séparés, ce qui
      // faisait choisir le mécanisme avant la cadence.
      {
        href: '/jouer/ami',
        labelKey: 'nav.vsFriend',
        icon: Handshake,
        hintKey: 'nav.vsFriendHint',
      },
      // Ni séance pédagogique ni carrière ici.
      //
      // La séance était une entrée à part alors que c'est la même partie contre
      // l'ordinateur, avec un thème annoncé et un bilan : elle devient une
      // option de ce réglage, et sa page `/jouer/pedagogique` reste ouverte aux
      // liens qui y mènent. La carrière, elle, passe dans « Progresser » : on
      // y joue, mais on y vient pour avancer d'un chapitre, pas pour faire une
      // partie — c'est la même question que le palier.
      {
        href: '/jouer/local',
        labelKey: 'nav.localGame',
        icon: Users,
        hintKey: 'nav.localGameHint',
      },
      // La boîte des correspondances, revenue dans « Jouer ».
      //
      // Elle avait été rangée dans « Communauté » au motif qu'elle concerne des
      // gens plutôt qu'une façon de jouer. C'est vrai de la liste, et faux de
      // ce qu'on vient y faire : on l'ouvre pour **jouer son coup**. Personne
      // ne cherche « où en sont mes parties par correspondance ? » dans la même
      // rubrique que le classement et le carnet d'adresses.
      {
        href: '/correspondance',
        labelKey: 'nav.correspondence',
        icon: Mail,
        hintKey: 'nav.correspondenceHint',
      },
      {
        href: '/tournois',
        labelKey: 'nav.tournaments',
        icon: Trophy,
        hintKey: 'nav.tournamentsHint',
      },
      { href: '/jouer/regarder', labelKey: 'nav.watch', icon: Eye, hintKey: 'nav.watchHint' },
    ],
  },
  /**
   * Progresser : tout ce qui sert à devenir meilleur, en une rubrique.
   *
   * Elle réunit ce qui vivait dans « Apprendre » et « S'entraîner », plus la
   * carrière. L'ordre suit la question qu'on se pose en arrivant : d'abord
   * « où j'en suis ? » (le palier, le test qui le mesure), puis « qu'est-ce que
   * je fais maintenant ? » (une leçon, un chapitre, des positions), enfin les
   * références qu'on consulte plus qu'on ne les pratique.
   *
   * Une seule teinte, celle d'« Apprendre » : deux couleurs dans une même
   * rubrique auraient redessiné la frontière qu'on vient de retirer.
   */
  {
    id: 'progresser',
    teinte: 'var(--rub-apprendre)',
    labelKey: 'nav.progress',
    icon: TrendingUp,
    sommaire: '/progresser',
    // L'ancienne page-sommaire de l'entraînement reste ouverte aux liens, mais
    // n'est plus l'entrée d'aucun menu. `/apprendre`, lui, est l'entrée
    // « Leçons ».
    aussiSur: ['/entrainer'],
    entrees: [
      // Le palier en tête : c'est la réponse à « je suis à 900, qu'est-ce qui
      // me coûte des points ? », la question qu'on se pose en arrivant — là où
      // le sommaire des leçons répond à « qu'est-ce qu'il y a à apprendre ? ».
      {
        href: '/apprendre/palier',
        labelKey: 'nav.palier',
        icon: Target,
        hintKey: 'nav.palierHint',
      },
      // Le test juste après : c'est lui qui dit dans quel palier on est. Il
      // figurait dans les deux anciennes rubriques, faute d'en avoir une.
      {
        href: '/apprendre/niveau',
        labelKey: 'nav.levelTest',
        icon: Gauge,
        hintKey: 'nav.levelTestHint',
      },
      {
        href: '/apprendre',
        labelKey: 'nav.lessons',
        icon: GraduationCap,
        hintKey: 'nav.lessonsHint',
        hintVars: { n: NOMBRE_DE_LECONS },
      },
      { href: '/carriere', labelKey: 'nav.career', icon: Trophy, hintKey: 'nav.careerHint' },
      { href: '/puzzles', labelKey: 'nav.puzzles', icon: Puzzle, hintKey: 'nav.puzzlesHint' },
      {
        href: '/puzzles?defi=1',
        labelKey: 'nav.dailyChallenge',
        icon: Zap,
        hintKey: 'nav.dailyChallengeHint',
      },
      {
        href: '/puzzles/rush',
        labelKey: 'nav.puzzleRush',
        icon: Timer,
        hintKey: 'nav.puzzleRushHint',
      },
      { href: '/finales', labelKey: 'nav.endgames', icon: Crown, hintKey: 'nav.endgamesHint' },
      // Puis les références, qu'on consulte plus qu'on ne les pratique.
      {
        href: '/apprendre/principes',
        labelKey: 'nav.principes',
        icon: ListChecks,
        hintKey: 'nav.principesHint',
      },
      {
        href: '/apprendre/ecoute',
        labelKey: 'nav.listen',
        icon: Headphones,
        hintKey: 'nav.listenHint',
      },
      {
        href: '/ouvertures',
        labelKey: 'nav.openings',
        icon: BookOpen,
        hintKey: 'nav.openingsHint',
      },
      { href: '/vision', labelKey: 'nav.vision', icon: Eye, hintKey: 'nav.visionHint' },
      {
        href: '/glossaire',
        labelKey: 'nav.glossary',
        icon: BookMarked,
        hintKey: 'nav.glossaryHint',
      },
    ],
  },
  {
    id: 'analyser',
    teinte: 'var(--rub-analyser)',
    labelKey: 'nav.analysis',
    icon: Gauge,
    sommaire: '/analyse',
    entrees: [
      {
        href: '/analyse',
        labelKey: 'nav.analyseGame',
        icon: Gauge,
        hintKey: 'nav.analyseGameHint',
      },
      { href: '/etudes', labelKey: 'nav.studies', icon: BookMarked, hintKey: 'nav.studiesHint' },
      { href: '/editeur', labelKey: 'nav.editor', icon: Grid3x3, hintKey: 'nav.editorHint' },
    ],
  },
  {
    id: 'communaute',
    teinte: 'var(--rub-communaute)',
    labelKey: 'nav.community',
    icon: Users,
    // La seule rubrique qui n'avait pas de page à elle. Ses quatre écrans ne se
    // rejoignaient donc nulle part, et sur téléphone ils n'existaient que dans
    // le panneau « Menu » — un bouton qui ne dit pas ce qu'il contient. La
    // barre du bas y mène désormais directement, et le panneau a disparu.
    sommaire: '/communaute',
    entrees: [
      {
        href: '/classement',
        labelKey: 'nav.leaderboard',
        icon: Trophy,
        hintKey: 'nav.leaderboardHint',
      },
      { href: '/amis', labelKey: 'nav.friends', icon: Users, hintKey: 'nav.friendsHint' },
      {
        href: '/statistiques',
        labelKey: 'nav.stats',
        icon: BarChart3,
        hintKey: 'nav.statsHint',
      },
    ],
  },
  /**
   * Outils.
   *
   * La dernière rubrique, et la seule qui ne serve pas à jouer une partie sur
   * l'écran : ce qu'on y trouve accompagne une partie qui se joue ailleurs —
   * sur un vrai plateau, en face de quelqu'un. La pendule l'a inaugurée ; le
   * calculateur Elo, le tirage au sort et l'aide-mémoire d'arbitrage suivent
   * le même principe, l'écran au service du bois et non l'inverse.
   */
  {
    id: 'outils',
    teinte: 'var(--rub-outils)',
    labelKey: 'nav.tools',
    icon: Timer,
    sommaire: '/outils',
    entrees: [
      {
        href: '/outils/pendule',
        labelKey: 'nav.clock',
        icon: Timer,
        hintKey: 'nav.clockHint',
      },
      {
        href: '/outils/elo',
        labelKey: 'nav.eloCalculator',
        icon: Calculator,
        hintKey: 'nav.eloCalculatorHint',
      },
      { href: '/outils/tirage', labelKey: 'nav.draw', icon: Dices, hintKey: 'nav.drawHint' },
      {
        href: '/outils/arbitrage',
        labelKey: 'nav.arbiter',
        icon: Scale,
        hintKey: 'nav.arbiterHint',
      },
    ],
  },
]

/**
 * Les pages qui concernent l'application elle-même, et non le jeu.
 *
 * Une seule liste, lue par le menu du compte, la page « Plus » et le pied de
 * page : elles vivaient dans un menu sous le nom du site, derrière un
 * engrenage, et dans un pied de page invisible sous `lg`, c'est-à-dire à trois
 * endroits dont aucun n'était le bon.
 */
export const PAGES_APPLICATION: EntreeNav[] = [
  { href: '/preferences', labelKey: 'nav.settings', icon: Settings },
  { href: '/a-propos', labelKey: 'nav.about', icon: Info },
  { href: '/credits', labelKey: 'nav.credits', icon: Scale },
]

/** Les rubriques que la barre du bas ne porte pas, et que « Plus » regroupe. */
export const SECTIONS_DANS_PLUS = ['communaute', 'outils'] as const

/**
 * Barre inférieure sur téléphone : l'accueil, trois rubriques, et « Plus ».
 *
 * Cinq onglets, et non plus six. La barre en a porté six — accueil, jouer,
 * apprendre, s'entraîner, analyser, plus — et chacun n'y disposait que de
 * cinquante-trois points : « S'entraîner » y frôlait son voisin, et deux
 * onglets sur six disaient à peu près la même chose. Apprendre et s'entraîner
 * ne font plus qu'un, « Progresser », et chaque onglet regagne un cinquième
 * de largeur.
 *
 * L'accueil garde sa place en tête : sans lui, il n'est atteignable que par le
 * nom du site, en haut à gauche — un lien que rien ne signale sur un écran
 * tactile, faute de survol. Personne ne le trouvait. « Communauté » et
 * « Outils » vivent dans « Plus ».
 *
 * `actifSur` doit couvrir toutes les adresses de la rubrique, anciennes
 * pages-sommaires comprises : un lien profond vers `/apprendre` ou
 * `/entrainer` doit allumer « Progresser », sinon on ne sait plus où l'on est.
 *
 * `href: '/'` demande un soin particulier : tous les chemins commencent par
 * une barre oblique, donc la comparaison par préfixe qui allume les autres
 * onglets allumerait celui-ci partout. Voir `estActif`.
 */
export const RACCOURCIS_MOBILES: EntreeNav[] = [
  { href: '/', labelKey: 'nav.home', icon: Home },
  {
    href: '/jouer',
    labelKey: 'nav.play',
    icon: Swords,
    actifSur: ['/correspondance', '/tournois'],
  },
  {
    href: '/progresser',
    labelKey: 'nav.progress',
    icon: TrendingUp,
    actifSur: [
      '/apprendre',
      '/entrainer',
      '/carriere',
      '/puzzles',
      '/finales',
      '/ouvertures',
      '/vision',
      '/glossaire',
    ],
  },
  { href: '/analyse', labelKey: 'nav.analysis', icon: Gauge, actifSur: ['/etudes', '/editeur'] },
  {
    href: '/plus',
    labelKey: 'nav.more',
    icon: LayoutGrid,
    actifSur: [
      '/communaute',
      '/classement',
      '/amis',
      '/statistiques',
      '/outils',
      '/preferences',
      '/profil',
      '/connexion',
      '/a-propos',
      '/credits',
      '/admin',
    ],
  },
]

/**
 * Vrai si le chemin courant relève de cette section.
 *
 * On compare sur le chemin seul : une entrée peut porter une requête ou une
 * ancre (`/puzzles?defi=1`, `/analyse#en-ligne`) et doit tout de même éclairer
 * sa section.
 */
export function sectionActive(section: SectionNav, pathname: string): boolean {
  // La page-sommaire compte, même quand elle ne figure pas dans les entrées :
  // `/progresser` n'est aucun des écrans qu'elle propose, et la rubrique
  // s'éteindrait donc sur sa propre page d'accueil. Même chose pour les
  // anciennes pages-sommaires qu'elle a absorbées (`aussiSur`).
  if (section.sommaire && pathname.startsWith(section.sommaire)) return true
  if (section.aussiSur?.some((chemin) => pathname.startsWith(chemin))) return true
  return section.entrees.some((entree) => {
    const chemin = entree.href.split(/[?#]/)[0] ?? entree.href
    return chemin === '/' ? pathname === '/' : pathname.startsWith(chemin)
  })
}

/**
 * Vrai si l'onglet éclaire le chemin courant.
 *
 * La barre du bas et la rangée d'icônes du paysage tenaient chacune sa copie
 * de ce calcul, et toutes deux comparaient par préfixe. L'accueil est le seul
 * chemin qui exige mieux : `'/'` préfixe absolument tout, si bien que son
 * onglet se serait allumé sur chaque page, à côté de celui de la rubrique
 * ouverte — deux onglets actifs, donc aucune information.
 */
export function estActif(entree: EntreeNav, pathname: string): boolean {
  return [entree.href, ...(entree.actifSur ?? [])].some((chemin) =>
    chemin === '/' ? pathname === '/' : pathname.startsWith(chemin),
  )
}
