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

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export type CategorieCredit = 'moteur' | 'donnees' | 'ressources' | 'bibliotheque'

export interface Credit {
  /**
   * Identifiant stable, qui nomme la clé de dictionnaire.
   *
   * Dérivé du nom et non du rang : sans lui, insérer une entrée au milieu du
   * catalogue renommerait en silence toutes les suivantes.
   */
  id: string
  nom: string
  auteur: string
  /** Identifiant SPDX quand il en existe un, sinon la formule qui convient. */
  licence: string
  url: string
  /** Ce que la chose fait ici, par clé de dictionnaire. */
  note: TranslationKey
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
    id: 'stockfish',
    nom: 'Stockfish',
    auteur: 'les auteurs de Stockfish',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/official-stockfish/Stockfish',
    note: 'creditsNotes.stockfish.note',
    categorie: 'moteur',
    github: 'official-stockfish/Stockfish',
    version: '19',
    verifieeDans: 'scripts/install-stockfish.mjs',
  },
  {
    id: 'stockfish-js',
    nom: 'Stockfish.js',
    auteur: 'Nathan Rugg',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/nmrugg/stockfish.js',
    note: 'creditsNotes.stockfish-js.note',
    categorie: 'moteur',
    github: 'nmrugg/stockfish.js',
  },
  {
    id: 'chess-js',
    nom: 'chess.js',
    auteur: 'Jeff Hlywa',
    licence: 'BSD-2-Clause',
    url: 'https://github.com/jhlywa/chess.js',
    note: 'creditsNotes.chess-js.note',
    categorie: 'moteur',
    paquet: 'chess.js',
    github: 'jhlywa/chess.js',
  },
  // Maia et son corps n'étaient crédités nulle part, alors qu'ils sont les
  // adversaires que rencontre un débutant. C'est exactement l'oubli que ce
  // fichier existe pour empêcher.
  {
    id: 'maia',
    nom: 'Maia',
    auteur: 'CSSLab (University of Toronto)',
    licence: 'GPL-3.0',
    url: 'https://github.com/CSSLab/maia-chess',
    note: 'creditsNotes.maia.note',
    categorie: 'moteur',
    github: 'CSSLab/maia-chess',
  },
  {
    id: 'leela-chess-zero',
    nom: 'Leela Chess Zero (lc0)',
    auteur: 'les contributeurs de LeelaChessZero',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/LeelaChessZero/lc0',
    note: 'creditsNotes.leela-chess-zero.note',
    categorie: 'moteur',
    github: 'LeelaChessZero/lc0',
    version: 'v0.32.1',
    verifieeDans: 'scripts/install-maia.mjs',
  },
  {
    id: 'piper',
    nom: 'Piper',
    auteur: 'Michael Hansen (rhasspy)',
    licence: 'MIT',
    url: 'https://github.com/rhasspy/piper',
    note: 'creditsNotes.piper.note',
    categorie: 'moteur',
    github: 'rhasspy/piper',
    version: '2023.11.14-2',
    verifieeDans: 'scripts/install-piper.mjs',
  },

  // ── Jeux de données ─────────────────────────────────────────────────────
  {
    id: 'base-d-ouvertures',
    nom: 'Base d’ouvertures ECO',
    auteur: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://github.com/lichess-org/chess-openings',
    note: 'creditsNotes.base-d-ouvertures.note',
    categorie: 'donnees',
    github: 'lichess-org/chess-openings',
  },
  {
    id: 'base-de-puzzles',
    nom: 'Base de puzzles',
    auteur: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://database.lichess.org/',
    note: 'creditsNotes.base-de-puzzles.note',
    categorie: 'donnees',
  },
  {
    id: 'base-de-positions',
    nom: 'Base de positions de finales',
    auteur: 'supertorpe et les contributeurs',
    licence: 'GPL-3.0',
    url: 'https://github.com/supertorpe/chessendgametraining',
    note: 'creditsNotes.base-de-positions.note',
    categorie: 'donnees',
    github: 'supertorpe/chessendgametraining',
  },
  {
    id: 'tables-de-finales',
    nom: 'Tables de finales Syzygy',
    auteur: 'Ronald de Man, service hébergé par Lichess',
    licence: 'accès libre',
    url: 'https://tablebase.lichess.ovh/',
    note: 'creditsNotes.tables-de-finales.note',
    categorie: 'donnees',
  },
  {
    id: 'voix-piper',
    nom: 'Voix Piper',
    auteur: 'les contributeurs de piper-voices',
    licence: 'CC-BY-4.0 ou équivalent',
    url: 'https://huggingface.co/rhasspy/piper-voices',
    note: 'creditsNotes.voix-piper.note',
    categorie: 'donnees',
  },

  // ── Ressources graphiques et sonores ────────────────────────────────────
  {
    id: 'pieces-staunton-cburnett',
    nom: 'Pièces Staunton (cburnett)',
    auteur: 'Colin M. L. Burnett',
    licence: 'GPL-2.0-or-later',
    url: 'https://en.wikipedia.org/wiki/User:Cburnett',
    note: 'creditsNotes.pieces-staunton-cburnett.note',
    categorie: 'ressources',
  },
  {
    id: 'pieces-merida',
    nom: 'Pièces Merida',
    auteur: 'Armando Hernandez Marroquin',
    licence: 'GPL-2.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece/merida',
    note: 'creditsNotes.pieces-merida.note',
    categorie: 'ressources',
  },
  {
    id: 'pieces-fantasy-spatial',
    nom: 'Pièces Fantasy, Spatial, Celtique',
    auteur: 'Maurizio Monge',
    licence: 'MIT',
    url: 'https://github.com/maurimo/chess-art',
    note: 'creditsNotes.pieces-fantasy-spatial.note',
    categorie: 'ressources',
  },
  {
    id: 'pieces-chessnut',
    nom: 'Pièces Chessnut',
    auteur: 'Alexis Luengas',
    licence: 'Apache-2.0',
    url: 'https://github.com/LexLuengas/chessnut-pieces',
    note: 'creditsNotes.pieces-chessnut.note',
    categorie: 'ressources',
  },
  {
    id: 'pieces-rhos',
    nom: 'Pièces Rhos',
    auteur: 'RhosGFX',
    licence: 'CC0-1.0',
    url: 'https://rhosgfx.itch.io/',
    note: 'creditsNotes.pieces-rhos.note',
    categorie: 'ressources',
  },
  {
    id: 'pieces-alpha-pixel',
    nom: 'Pièces Alpha, Pixel, Lettres',
    auteur: 'les auteurs de lila, therealqtpi, usolando',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece',
    note: 'creditsNotes.pieces-alpha-pixel.note',
    categorie: 'ressources',
  },
  {
    id: 'bruitages',
    nom: 'Bruitages',
    auteur: 'Enigmahack et les auteurs de lila',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/sound',
    note: 'creditsNotes.bruitages.note',
    categorie: 'ressources',
  },

  // ── Bibliothèques ───────────────────────────────────────────────────────
  // Une par dépendance d'exécution, sans exception : c'est ce que le contrôle
  // vérifie. Les outils de développement — TypeScript, ESLint, Prettier — n'y
  // sont pas : ils ne partent pas chez l'utilisateur, et aucune de leurs
  // licences n'exige d'attribution dans le produit distribué.
  {
    id: 'next-js',
    nom: 'Next.js',
    auteur: 'Vercel et les contributeurs',
    licence: 'MIT',
    url: 'https://nextjs.org',
    note: 'creditsNotes.next-js.note',
    categorie: 'bibliotheque',
    paquet: 'next',
    github: 'vercel/next.js',
  },
  {
    id: 'react',
    nom: 'React',
    auteur: 'Meta et les contributeurs',
    licence: 'MIT',
    url: 'https://react.dev',
    note: 'creditsNotes.react.note',
    categorie: 'bibliotheque',
    paquet: 'react',
    github: 'facebook/react',
  },
  {
    id: 'react-dom',
    nom: 'React DOM',
    auteur: 'Meta et les contributeurs',
    licence: 'MIT',
    url: 'https://react.dev',
    note: 'creditsNotes.react-dom.note',
    categorie: 'bibliotheque',
    paquet: 'react-dom',
    github: 'facebook/react',
  },
  {
    id: 'server-only',
    nom: 'server-only',
    auteur: 'Vercel',
    licence: 'MIT',
    url: 'https://www.npmjs.com/package/server-only',
    note: 'creditsNotes.server-only.note',
    categorie: 'bibliotheque',
    paquet: 'server-only',
  },
  {
    id: 'three-js',
    nom: 'three.js',
    auteur: 'mrdoob et les contributeurs',
    licence: 'MIT',
    url: 'https://threejs.org',
    note: 'creditsNotes.three-js.note',
    categorie: 'bibliotheque',
    paquet: 'three',
    github: 'mrdoob/three.js',
  },
  {
    id: 'react-three-fiber',
    nom: 'React Three Fiber',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/react-three-fiber',
    note: 'creditsNotes.react-three-fiber.note',
    categorie: 'bibliotheque',
    paquet: '@react-three/fiber',
    github: 'pmndrs/react-three-fiber',
  },
  {
    id: 'drei',
    nom: 'Drei',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/drei',
    note: 'creditsNotes.drei.note',
    categorie: 'bibliotheque',
    paquet: '@react-three/drei',
    github: 'pmndrs/drei',
  },
  {
    id: 'zustand',
    nom: 'Zustand',
    auteur: 'Poimandres',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
    note: 'creditsNotes.zustand.note',
    categorie: 'bibliotheque',
    paquet: 'zustand',
    github: 'pmndrs/zustand',
  },
  {
    id: 'lucide',
    nom: 'Lucide',
    auteur: 'Eric Fennis et les contributeurs',
    licence: 'ISC',
    url: 'https://lucide.dev',
    note: 'creditsNotes.lucide.note',
    categorie: 'bibliotheque',
    paquet: 'lucide-react',
    github: 'lucide-icons/lucide',
  },
  {
    id: 'clsx',
    nom: 'clsx',
    auteur: 'Luke Edwards',
    licence: 'MIT',
    url: 'https://github.com/lukeed/clsx',
    note: 'creditsNotes.clsx.note',
    categorie: 'bibliotheque',
    paquet: 'clsx',
    github: 'lukeed/clsx',
  },
  {
    id: 'socket-io',
    nom: 'Socket.IO',
    auteur: 'Guillermo Rauch et les contributeurs',
    licence: 'MIT',
    url: 'https://socket.io',
    note: 'creditsNotes.socket-io.note',
    categorie: 'bibliotheque',
    paquet: 'socket.io',
    github: 'socketio/socket.io',
  },
  {
    id: 'socket-io-client',
    nom: 'Socket.IO (client)',
    auteur: 'Guillermo Rauch et les contributeurs',
    licence: 'MIT',
    url: 'https://socket.io',
    note: 'creditsNotes.socket-io-client.note',
    categorie: 'bibliotheque',
    paquet: 'socket.io-client',
    github: 'socketio/socket.io',
  },
  {
    id: 'drizzle-orm',
    nom: 'Drizzle ORM',
    auteur: 'Drizzle Team',
    licence: 'Apache-2.0',
    url: 'https://orm.drizzle.team',
    note: 'creditsNotes.drizzle-orm.note',
    categorie: 'bibliotheque',
    paquet: 'drizzle-orm',
    github: 'drizzle-team/drizzle-orm',
  },
  {
    id: 'postgres',
    nom: 'postgres',
    auteur: 'Rasmus Porsager',
    licence: 'Unlicense',
    url: 'https://github.com/porsager/postgres',
    note: 'creditsNotes.postgres.note',
    categorie: 'bibliotheque',
    paquet: 'postgres',
    github: 'porsager/postgres',
  },
  {
    id: 'nodemailer',
    nom: 'Nodemailer',
    auteur: 'Andris Reinman',
    licence: 'MIT-0',
    url: 'https://nodemailer.com',
    note: 'creditsNotes.nodemailer.note',
    categorie: 'bibliotheque',
    paquet: 'nodemailer',
    github: 'nodemailer/nodemailer',
  },
  {
    id: 'web-push',
    nom: 'web-push',
    auteur: 'les contributeurs de web-push-libs',
    licence: 'MPL-2.0',
    url: 'https://github.com/web-push-libs/web-push',
    note: 'creditsNotes.web-push.note',
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
