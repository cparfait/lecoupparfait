/**
 * Tout ce sur quoi Le Coup Parfait est bâti, en un seul endroit.
 *
 * La page « Crédits & licences » portait cette liste en dur, écrite à la main,
 * et elle ne parlait que des ressources d'échecs : le moteur, les bases, les
 * jeux de pièces. Les dix-sept bibliothèques qui font tourner l'application
 * n'y figuraient pas — plusieurs sont pourtant sous des licences qui exigent
 * l'attribution —, la version de Stockfish y était tapée au clavier, et rien
 * ne reliait quoi que ce soit au dépôt. Une dépendance ajoutée n'apparaissait
 * jamais ; une version qui bougeait n'était jamais corrigée.
 *
 * Ce fichier est donc la source unique, et trois choses s'en servent :
 *
 *  - la page publique, qui l'affiche ;
 *  - `/api/admin/outils`, qui la confronte aux dépendances réellement
 *    déclarées et va demander aux dépôts s'il existe plus récent ;
 *  - `scripts/check-credits.mjs`, qui casse les tests quand un paquet
 *    d'exécution n'est crédité nulle part, quand une entrée cite un paquet
 *    disparu, ou quand une version affichée ne correspond plus à celle que le
 *    script d'installation va chercher.
 *
 * Le troisième point est le seul qui compte vraiment : sans lui, tout ceci
 * redevient une liste à jour le jour où on l'a écrite.
 */

export type CategorieCredit = 'moteur' | 'donnees' | 'ressources' | 'bibliotheque'

export interface Credit {
  nom: string
  auteur: string
  /** Identifiant SPDX quand il en existe un, sinon la formule qui convient. */
  licence: string
  url: string
  note: string
  categorie: CategorieCredit
  /**
   * Le paquet npm dont il s'agit, quand il en vient un.
   *
   * C'est ce champ qui permet le rapprochement : toute dépendance d'exécution
   * déclarée par un espace de travail doit se retrouver ici, et inversement.
   */
  paquet?: string
  /** `proprietaire/depot`, pour aller voir s'il existe une version plus récente. */
  github?: string
  /**
   * Version utilisée, pour ce qui ne vient pas de npm.
   *
   * Écrite à la main, donc surveillée : `verifieeDans` désigne le fichier qui
   * fait autorité, et le contrôle vérifie que la chaîne s'y trouve encore.
   */
  version?: string
  verifieeDans?: string
}

export const CREDITS: readonly Credit[] = [
  // ── Moteurs et règles ───────────────────────────────────────────────────
  {
    nom: 'Stockfish',
    auteur: 'les auteurs de Stockfish',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/official-stockfish/Stockfish',
    note: 'Le moteur d’échecs le plus fort au monde. Il tourne côté serveur en version native, et dans le navigateur en WebAssembly.',
    categorie: 'moteur',
    github: 'official-stockfish/Stockfish',
    version: '18',
    verifieeDans: 'scripts/install-stockfish.mjs',
  },
  {
    nom: 'Stockfish.js',
    auteur: 'Nathan Rugg',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/nmrugg/stockfish.js',
    note: 'La compilation WebAssembly de Stockfish, qui permet d’analyser sans rien envoyer à un serveur.',
    categorie: 'moteur',
    github: 'nmrugg/stockfish.js',
  },
  {
    nom: 'chess.js',
    auteur: 'Jeff Hlywa',
    licence: 'BSD-2-Clause',
    url: 'https://github.com/jhlywa/chess.js',
    note: 'Les règles du jeu : génération des coups légaux, détection du mat, lecture du PGN.',
    categorie: 'moteur',
    paquet: 'chess.js',
    github: 'jhlywa/chess.js',
  },
  // Maia et son corps n'étaient crédités nulle part, alors qu'ils sont les
  // adversaires que rencontre un débutant. C'est exactement l'oubli que ce
  // fichier existe pour empêcher.
  {
    nom: 'Maia',
    auteur: 'CSSLab (University of Toronto)',
    licence: 'GPL-3.0',
    url: 'https://github.com/CSSLab/maia-chess',
    note: 'Neuf réseaux entraînés sur des parties humaines : à 1100, l’adversaire fait les erreurs qu’un joueur de 1100 fait vraiment.',
    categorie: 'moteur',
    github: 'CSSLab/maia-chess',
  },
  {
    nom: 'Leela Chess Zero (lc0)',
    auteur: 'les contributeurs de LeelaChessZero',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/LeelaChessZero/lc0',
    note: 'Le moteur qui fait tourner les réseaux de Maia — les poids seuls ne jouent pas.',
    categorie: 'moteur',
    github: 'LeelaChessZero/lc0',
    version: 'v0.32.1',
    verifieeDans: 'scripts/install-maia.mjs',
  },
  {
    nom: 'Piper',
    auteur: 'Michael Hansen (rhasspy)',
    licence: 'MIT',
    url: 'https://github.com/rhasspy/piper',
    note: 'La voix du coach, synthétisée sur le serveur et hors ligne : rien de ce qui est dit ne sort de la machine.',
    categorie: 'moteur',
    github: 'rhasspy/piper',
    version: '2023.11.14-2',
    verifieeDans: 'scripts/install-piper.mjs',
  },

  // ── Jeux de données ─────────────────────────────────────────────────────
  {
    nom: 'Base d’ouvertures ECO',
    auteur: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://github.com/lichess-org/chess-openings',
    note: '3 810 ouvertures nommées et classées, traduites en français pour ce projet.',
    categorie: 'donnees',
    github: 'lichess-org/chess-openings',
  },
  {
    nom: 'Base de puzzles',
    auteur: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://database.lichess.org/',
    note: '6 057 356 positions tactiques, notées et étiquetées par thème, extraites de vraies parties.',
    categorie: 'donnees',
  },
  {
    nom: 'Base de positions de finales',
    auteur: 'supertorpe et les contributeurs',
    licence: 'GPL-3.0',
    url: 'https://github.com/supertorpe/chessendgametraining',
    note: '3 568 positions de finales classées par matériel, de « mater avec une dame » à « tenir la nulle avec une tour de moins », traduites et re-cotées en difficulté pour ce projet.',
    categorie: 'donnees',
    github: 'supertorpe/chessendgametraining',
  },
  {
    nom: 'Tables de finales Syzygy',
    auteur: 'Ronald de Man, service hébergé par Lichess',
    licence: 'accès libre',
    url: 'https://tablebase.lichess.ovh/',
    note: 'Le jeu parfait dans toutes les finales à sept pièces ou moins. Une certitude, pas une évaluation.',
    categorie: 'donnees',
  },
  {
    nom: 'Voix Piper',
    auteur: 'les contributeurs de piper-voices',
    licence: 'CC-BY-4.0 ou équivalent',
    url: 'https://huggingface.co/rhasspy/piper-voices',
    note: 'Les modèles de voix française et anglaise du coach.',
    categorie: 'donnees',
  },

  // ── Ressources graphiques et sonores ────────────────────────────────────
  {
    nom: 'Pièces Staunton (cburnett)',
    auteur: 'Colin M. L. Burnett',
    licence: 'GPL-2.0-or-later',
    url: 'https://en.wikipedia.org/wiki/User:Cburnett',
    note: 'Le jeu de pièces vectoriel le plus utilisé du monde libre.',
    categorie: 'ressources',
  },
  {
    nom: 'Pièces Merida',
    auteur: 'Armando Hernandez Marroquin',
    licence: 'GPL-2.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece/merida',
    note: 'Contours nets, excellente lisibilité en petite taille.',
    categorie: 'ressources',
  },
  {
    nom: 'Pièces Fantasy, Spatial, Celtique',
    auteur: 'Maurizio Monge',
    licence: 'MIT',
    url: 'https://github.com/maurimo/chess-art',
    note: 'Trois jeux de caractère, aux volumes sculptés.',
    categorie: 'ressources',
  },
  {
    nom: 'Pièces Chessnut',
    auteur: 'Alexis Luengas',
    licence: 'Apache-2.0',
    url: 'https://github.com/LexLuengas/chessnut-pieces',
    note: 'Épuré et contemporain.',
    categorie: 'ressources',
  },
  {
    nom: 'Pièces Rhos',
    auteur: 'RhosGFX',
    licence: 'CC0-1.0',
    url: 'https://rhosgfx.itch.io/',
    note: 'Aplats colorés, domaine public.',
    categorie: 'ressources',
  },
  {
    nom: 'Pièces Alpha, Pixel, Lettres',
    auteur: 'les auteurs de lila, therealqtpi, usolando',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece',
    note: 'Trois approches minimalistes, dont un jeu en lettres pour la lisibilité maximale.',
    categorie: 'ressources',
  },
  {
    nom: 'Bruitages',
    auteur: 'Enigmahack et les auteurs de lila',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/sound',
    note: 'Déplacement, capture, échec, fin de partie.',
    categorie: 'ressources',
  },

  // ── Bibliothèques ───────────────────────────────────────────────────────
  // Une par dépendance d'exécution, sans exception : c'est ce que le contrôle
  // vérifie. Les outils de développement — TypeScript, ESLint, Prettier — n'y
  // sont pas : ils ne partent pas chez l'utilisateur, et aucune de leurs
  // licences n'exige d'attribution dans le produit distribué.
  {
    nom: 'Next.js',
    auteur: 'Vercel et les contributeurs',
    licence: 'MIT',
    url: 'https://nextjs.org',
    note: 'Le cadre de l’application web : routage, rendu serveur, empaquetage.',
    categorie: 'bibliotheque',
    paquet: 'next',
    github: 'vercel/next.js',
  },
  {
    nom: 'React',
    auteur: 'Meta et les contributeurs',
    licence: 'MIT',
    url: 'https://react.dev',
    note: 'La bibliothèque d’interface.',
    categorie: 'bibliotheque',
    paquet: 'react',
    github: 'facebook/react',
  },
  {
    nom: 'React DOM',
    auteur: 'Meta et les contributeurs',
    licence: 'MIT',
    url: 'https://react.dev',
    note: 'Le rendu de React dans le navigateur.',
    categorie: 'bibliotheque',
    paquet: 'react-dom',
    github: 'facebook/react',
  },
  {
    nom: 'server-only',
    auteur: 'Vercel',
    licence: 'MIT',
    url: 'https://www.npmjs.com/package/server-only',
    note: 'Un garde-fou : il fait échouer la construction si un module serveur part vers le navigateur.',
    categorie: 'bibliotheque',
    paquet: 'server-only',
  },
  {
    nom: 'three.js',
    auteur: 'mrdoob et les contributeurs',
    licence: 'MIT',
    url: 'https://threejs.org',
    note: 'Le rendu en trois dimensions de l’échiquier.',
    categorie: 'bibliotheque',
    paquet: 'three',
    github: 'mrdoob/three.js',
  },
  {
    nom: 'React Three Fiber',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/react-three-fiber',
    note: 'Le pont entre React et three.js.',
    categorie: 'bibliotheque',
    paquet: '@react-three/fiber',
    github: 'pmndrs/react-three-fiber',
  },
  {
    nom: 'Drei',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/drei',
    note: 'Les aides de la scène 3D : caméra, lumières, chargement des modèles.',
    categorie: 'bibliotheque',
    paquet: '@react-three/drei',
    github: 'pmndrs/drei',
  },
  {
    nom: 'Zustand',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
    note: 'Le magasin des préférences, partagé par toute l’interface.',
    categorie: 'bibliotheque',
    paquet: 'zustand',
    github: 'pmndrs/zustand',
  },
  {
    nom: 'Lucide',
    auteur: 'Eric Fennis et les contributeurs',
    licence: 'ISC',
    url: 'https://lucide.dev',
    note: 'Les icônes de toute l’interface.',
    categorie: 'bibliotheque',
    paquet: 'lucide-react',
    github: 'lucide-icons/lucide',
  },
  {
    nom: 'clsx',
    auteur: 'Luke Edwards',
    licence: 'MIT',
    url: 'https://github.com/lukeed/clsx',
    note: 'L’assemblage des classes CSS conditionnelles.',
    categorie: 'bibliotheque',
    paquet: 'clsx',
    github: 'lukeed/clsx',
  },
  {
    nom: 'Socket.IO',
    auteur: 'Guillermo Rauch et les contributeurs',
    licence: 'MIT',
    url: 'https://socket.io',
    note: 'Le temps réel des parties en direct, côté serveur.',
    categorie: 'bibliotheque',
    paquet: 'socket.io',
    github: 'socketio/socket.io',
  },
  {
    nom: 'Socket.IO (client)',
    auteur: 'Guillermo Rauch et les contributeurs',
    licence: 'MIT',
    url: 'https://socket.io',
    note: 'Le même, côté navigateur.',
    categorie: 'bibliotheque',
    paquet: 'socket.io-client',
    github: 'socketio/socket.io',
  },
  {
    nom: 'Drizzle ORM',
    auteur: 'Drizzle Team',
    licence: 'Apache-2.0',
    url: 'https://orm.drizzle.team',
    note: 'Le schéma et les requêtes SQL, typés.',
    categorie: 'bibliotheque',
    paquet: 'drizzle-orm',
    github: 'drizzle-team/drizzle-orm',
  },
  {
    nom: 'postgres',
    auteur: 'Rasmus Porsager',
    licence: 'Unlicense',
    url: 'https://github.com/porsager/postgres',
    note: 'Le pilote PostgreSQL.',
    categorie: 'bibliotheque',
    paquet: 'postgres',
    github: 'porsager/postgres',
  },
  {
    nom: 'Nodemailer',
    auteur: 'Andris Reinman',
    licence: 'MIT-0',
    url: 'https://nodemailer.com',
    note: 'L’envoi des courriels — la récupération de mot de passe, et rien d’autre.',
    categorie: 'bibliotheque',
    paquet: 'nodemailer',
    github: 'nodemailer/nodemailer',
  },
  {
    nom: 'web-push',
    auteur: 'les contributeurs de web-push-libs',
    licence: 'MPL-2.0',
    url: 'https://github.com/web-push-libs/web-push',
    note: 'Les notifications poussées : un défi, une demande d’ami, un coup joué contre toi.',
    categorie: 'bibliotheque',
    paquet: 'web-push',
    github: 'web-push-libs/web-push',
  },
]

export const TITRES_CATEGORIE: Record<CategorieCredit, string> = {
  moteur: 'Moteurs et règles',
  donnees: 'Jeux de données',
  ressources: 'Ressources graphiques et sonores',
  bibliotheque: 'Bibliothèques',
}

export function creditsDe(categorie: CategorieCredit): Credit[] {
  return CREDITS.filter((credit) => credit.categorie === categorie)
}

/** Le crédit qui correspond à un paquet npm, s'il y en a un. */
export function creditDuPaquet(paquet: string): Credit | undefined {
  return CREDITS.find((credit) => credit.paquet === paquet)
}
