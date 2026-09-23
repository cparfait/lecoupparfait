/**
 * La structure de la navigation, en un seul endroit.
 *
 * Le principe de rangement : **à gauche ce qu'on veut faire, à droite soi.**
 * On ouvre l'application en sachant qu'on vient jouer, ou progresser, bien
 * avant de savoir avec quel outil — d'où un classement par verbe plutôt que
 * par nature d'objet. Ranger « finales » dans une « bibliothèque » obligerait à
 * deviner dans quelle boîte on l'a mise.
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
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from './i18n/index.tsx'

export interface EntreeNav {
  href: string
  labelKey: TranslationKey
  icon: LucideIcon
  /** Une demi-phrase affichée sous le libellé, dans les panneaux déroulants. */
  hintKey?: TranslationKey
  /**
   * Autres chemins que cette entrée éclaire dans la barre inférieure.
   *
   * « S'entraîner » mène au sommaire `/entrainer`, mais les trois écrans qu'il
   * propose vivent sous `/puzzles` : sans cela, l'onglet s'éteignait dès qu'on
   * ouvrait ce qu'il venait de proposer — on ne savait plus dans quelle
   * rubrique on se trouvait.
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
   * Teinte de la section.
   *
   * Six rubriques, six teintes, et aucune n'est le violet de l'action. Elles
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
      // Puis la carrière, et non plus en tête.
      //
      // Elle y était au motif qu'elle répond à « par quoi je commence ? ». Ce
      // motif tient toujours, mais il en oubliait un autre : c'est la première
      // entrée de la rubrique qui demande un compte. Ouvrir « Jouer » et
      // trouver un cadenas en première ligne donne le ton inverse de celui du
      // projet, où l'essentiel s'utilise sans rien créer. Elle passe donc
      // derrière les deux façons de jouer une partie tout de suite.
      // La séance pédagogique avant la carrière : elle ne demande pas de compte,
      // et c'est la façon la plus directe de jouer une partie qui apprend
      // quelque chose — un thème annoncé, le commentaire allumé, un bilan.
      {
        href: '/jouer/pedagogique',
        labelKey: 'nav.seance',
        icon: GraduationCap,
        hintKey: 'nav.seanceHint',
      },
      { href: '/carriere', labelKey: 'nav.career', icon: Trophy, hintKey: 'nav.careerHint' },
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
  {
    id: 'apprendre',
    teinte: 'var(--rub-apprendre)',
    labelKey: 'nav.learn',
    icon: GraduationCap,
    sommaire: '/apprendre',
    entrees: [
      {
        href: '/apprendre',
        labelKey: 'nav.lessons',
        icon: GraduationCap,
        hintKey: 'nav.lessonsHint',
      },
      // « Ton palier » juste après les leçons, et devant tout le reste : c'est
      // la réponse à la question qu'on se pose en arrivant — « je suis à 900,
      // qu'est-ce qui me coûte des points ? » — là où le sommaire des leçons
      // répond à « qu'est-ce qu'il y a à apprendre ? ». Les deux sont utiles,
      // mais ce n'est pas la même question, et la seconde vient après.
      {
        href: '/apprendre/palier',
        labelKey: 'nav.palier',
        icon: Target,
        hintKey: 'nav.palierHint',
      },
      // Le test juste après le palier : c'est lui qui dit dans quel palier on
      // est. Il n'était atteignable que depuis trois pages, et d'aucun menu.
      {
        href: '/apprendre/niveau',
        labelKey: 'nav.levelTest',
        icon: Gauge,
        hintKey: 'nav.levelTestHint',
      },
      {
        href: '/apprendre/principes',
        labelKey: 'nav.principes',
        icon: ListChecks,
        hintKey: 'nav.principesHint',
      },
      {
        href: '/ouvertures',
        labelKey: 'nav.openings',
        icon: BookOpen,
        hintKey: 'nav.openingsHint',
      },
      { href: '/finales', labelKey: 'nav.endgames', icon: Crown, hintKey: 'nav.endgamesHint' },
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
    id: 'entrainer',
    teinte: 'var(--rub-entrainer)',
    labelKey: 'nav.train',
    icon: Target,
    // La rubrique a maintenant sa page-sommaire, comme « Jouer » et
    // « Apprendre ». Elle pointait sur `/puzzles`, c'est-à-dire sur l'un de ses
    // trois écrans : ouvrir « S'entraîner » lançait aussitôt une position, sans
    // jamais montrer qu'il existait aussi la manche chronométrée et le défi du
    // jour. Sur téléphone, où l'onglet du bas s'appelait « Puzzles », les deux
    // autres n'existaient tout simplement pas.
    sommaire: '/entrainer',
    entrees: [
      { href: '/puzzles', labelKey: 'nav.puzzles', icon: Puzzle, hintKey: 'nav.puzzlesHint' },
      {
        href: '/puzzles/rush',
        labelKey: 'nav.puzzleRush',
        icon: Timer,
        hintKey: 'nav.puzzleRushHint',
      },
      {
        href: '/puzzles?defi=1',
        labelKey: 'nav.dailyChallenge',
        icon: Zap,
        hintKey: 'nav.dailyChallengeHint',
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
   * La sixième rubrique, et la seule qui ne serve pas à jouer une partie sur
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
 * Barre inférieure sur téléphone : l'accueil, quatre rubriques, et « Plus ».
 *
 * Six onglets se disputaient autrefois trois cent soixante-quinze pixels :
 * « Communauté » et « S'entraîner » se touchaient, et l'on était redescendu à
 * cinq. « Communauté » est donc passée dans « Plus » — et la place ainsi
 * gagnée revient ici à l'accueil, qui n'était plus atteignable que par le nom
 * du site, en haut à gauche : un lien que rien ne signale sur un écran tactile,
 * faute de survol. Personne ne le trouvait.
 *
 * « Accueil » tient là où « Communauté » débordait — sept lettres contre dix,
 * et c'est le plus court des six.
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
    actifSur: ['/correspondance', '/tournois', '/carriere'],
  },
  {
    href: '/apprendre',
    labelKey: 'nav.learn',
    icon: GraduationCap,
    actifSur: ['/ouvertures', '/finales', '/vision', '/glossaire'],
  },
  { href: '/entrainer', labelKey: 'nav.train', icon: Target, actifSur: ['/puzzles'] },
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
  // `/entrainer` n'est aucun des trois écrans qu'elle propose, et la rubrique
  // s'éteignait donc sur sa propre page d'accueil.
  if (section.sommaire && pathname.startsWith(section.sommaire)) return true
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
