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
  Crown,
  Eye,
  Gauge,
  GraduationCap,
  Grid3x3,
  Handshake,
  Mail,
  Monitor,
  Puzzle,
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
   * Cinq sections, une trentaine d'entrées, et une seule couleur pour le tout :
   * le menu mobile déroulait quatre listes grises séparées par des titres gris
   * plus petits, et l'on ne voyait plus où commençait « Apprendre ». La couleur
   * n'est pas un ornement ici, c'est le seul repère qui survit à un balayage du
   * pouce.
   *
   * Elles viennent de la palette du thème — jamais une valeur en dur : chaque
   * thème redéfinit `--accent`, et une couleur écrite ici jurerait dans la
   * moitié d'entre eux.
   */
  teinte: string
  entrees: EntreeNav[]
}

export const SECTIONS: SectionNav[] = [
  {
    id: 'jouer',
    teinte: 'var(--accent)',
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
      { href: '/carriere', labelKey: 'nav.career', icon: Trophy, hintKey: 'nav.careerHint' },
      {
        href: '/jouer/local',
        labelKey: 'nav.localGame',
        icon: Users,
        hintKey: 'nav.localGameHint',
      },
      { href: '/tournois', labelKey: 'nav.tournaments', icon: Trophy },
      { href: '/jouer/regarder', labelKey: 'nav.watch', icon: Eye, hintKey: 'nav.watchHint' },
    ],
  },
  {
    id: 'apprendre',
    teinte: 'var(--accent-2)',
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
    teinte: 'var(--accent-3)',
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
    teinte: 'var(--accent)',
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
    teinte: 'var(--accent-2)',
    labelKey: 'nav.community',
    icon: Users,
    // La seule rubrique qui n'avait pas de page à elle. Ses quatre écrans ne se
    // rejoignaient donc nulle part, et sur téléphone ils n'existaient que dans
    // le panneau « Menu » — un bouton qui ne dit pas ce qu'il contient. La
    // barre du bas y mène désormais directement, et le panneau a disparu.
    sommaire: '/communaute',
    entrees: [
      { href: '/classement', labelKey: 'nav.leaderboard', icon: Trophy },
      { href: '/amis', labelKey: 'nav.friends', icon: Users },
      // La boîte des correspondances : une liste d'obligations, pas un mode de
      // jeu. Elle est ici parce qu'elle concerne des gens, pas une façon de
      // jouer — et un compteur la signale dans l'en-tête quand c'est ton tour.
      {
        href: '/correspondance',
        labelKey: 'nav.correspondence',
        icon: Mail,
        hintKey: 'nav.correspondenceHint',
      },
      { href: '/statistiques', labelKey: 'nav.stats', icon: BarChart3 },
    ],
  },
]

/**
 * Barre inférieure sur téléphone : les cinq rubriques, et rien d'autre.
 *
 * La cinquième place était tenue par un bouton « Menu » qui dépliait un
 * panneau contenant les cinq rubriques et leurs trente entrées. C'était la
 * navigation mobile réelle, et elle était **cachée** : un bouton nommé
 * « Menu » n'annonce rien de ce qu'il contient, et l'on ne déplie pas un
 * panneau pour savoir ce qui existe dans une application qu'on découvre.
 *
 * Les cinq rubriques tiennent dans la barre — elles ont toutes une page,
 * « Communauté » comprise depuis qu'elle a la sienne —, et chaque page montre
 * son contenu en grand. Il n'y a donc plus rien à replier : ce que
 * l'application sait faire se lit sur cinq onglets et cinq pages.
 */
export const RACCOURCIS_MOBILES: EntreeNav[] = [
  { href: '/jouer', labelKey: 'nav.play', icon: Swords },
  { href: '/apprendre', labelKey: 'nav.learn', icon: GraduationCap },
  // « S'entraîner », et non plus « Puzzles ».
  //
  // L'onglet portait le nom de l'un des trois écrans de la rubrique et menait
  // droit dessus : la manche chronométrée et le défi du jour n'apparaissaient
  // nulle part sur un téléphone. Le nom de la rubrique — le même que sur grand
  // écran — annonce les trois, et le sommaire les propose.
  { href: '/entrainer', labelKey: 'nav.train', icon: Target, actifSur: ['/puzzles'] },
  { href: '/analyse', labelKey: 'nav.analysis', icon: Gauge },
  {
    href: '/communaute',
    labelKey: 'nav.community',
    icon: Users,
    // Les quatre écrans de la rubrique s'atteignent aussi directement, depuis
    // un lien ou l'historique : l'onglet doit rester allumé sur chacun.
    actifSur: ['/classement', '/amis', '/correspondance', '/statistiques'],
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
