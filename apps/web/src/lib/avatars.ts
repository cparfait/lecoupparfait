/**
 * Avatars.
 *
 * Des émojis plutôt que des images : rien à héberger, rien à téléverser, rien
 * à modérer, et le même rendu sur tous les appareils sans une seule requête
 * réseau. C'est aussi ce que dit le schéma — « on n'héberge pas d'images
 * d'utilisateurs ».
 *
 * Le choix n'est pas l'émoji entier : celui-ci comporte des milliers de
 * symboles dont la plupart sont illisibles à trente-deux pixels, se
 * ressemblent deux à deux, ou disent quelque chose de son porteur qu'il ne
 * voulait pas dire. On en retient une centaine, retenus sur trois critères :
 *
 *  1. **Lisible en petit.** Le carnet d'adresses les affiche à 32 px. Un
 *     symbole chargé y devient une tache.
 *  2. **Distinct des autres.** Deux avatars proches dans une liste de vingt
 *     amis ne servent à personne : on ne garde qu'un chat, qu'un chien.
 *  3. **Sans assignation.** Ni drapeaux, ni visages, ni symboles religieux ou
 *     politiques : un avatar sert à se reconnaître, pas à se déclarer.
 */

export interface AvatarFamily {
  /** Intitulé de l'onglet. */
  label: string
  /** Une phrase qui dit à qui la famille s'adresse. */
  hint: string
  emojis: string[]
}

export const AVATAR_FAMILIES: AvatarFamily[] = [
  {
    label: 'Échecs',
    hint: 'Les pièces du jeu, pour rester dans le ton.',
    emojis: ['♟️', '♞', '♝', '♜', '♛', '♚', '♙', '♘', '♗', '♖', '♕', '♔'],
  },
  {
    label: 'Animaux',
    hint: 'Les plus reconnaissables en petit.',
    emojis: [
      '🦉', '🦊', '🐺', '🐯', '🦁', '🐻', '🐼', '🐨', '🐸', '🐢',
      '🐬', '🐙', '🦅', '🦋', '🐝', '🐞', '🦔', '🦇', '🐧', '🦩',
    ],
  },
  {
    label: 'Créatures',
    hint: 'Pour qui préfère l’imaginaire.',
    emojis: ['🐉', '🦄', '👾', '🤖', '👻', '🎃', '🧙', '🧝', '🦖', '🐲'],
  },
  {
    label: 'Nature',
    hint: 'Sobres, lisibles, sans rien affirmer.',
    emojis: ['🌵', '🍀', '🌻', '🍁', '🌊', '🔥', '❄️', '⭐', '🌙', '☀️', '🌈', '🍄'],
  },
  {
    label: 'Objets',
    hint: 'Un peu de caractère sans mascotte.',
    emojis: ['⚓', '🎩', '🎸', '🚀', '🧭', '🔭', '📚', '🎲', '🏆', '⚙️', '💡', '🗝️'],
  },
]

/** Tous les avatars, à plat : sert à valider ce qu'on reçoit. */
export const AVATARS = AVATAR_FAMILIES.flatMap((family) => family.emojis)

/**
 * Avatar par défaut.
 *
 * Le pion : celui par lequel tout le monde commence, au jeu comme ici.
 */
export const DEFAULT_AVATAR = '♟️'

/**
 * Cet avatar fait-il partie du jeu proposé ?
 *
 * Vérifié côté serveur, et pas seulement à l'affichage : la colonne accepte
 * deux cents caractères, ce qui laisserait passer bien autre chose qu'un
 * émoji si l'on se contentait de faire confiance au formulaire.
 */
export function isKnownAvatar(value: unknown): value is string {
  return typeof value === 'string' && AVATARS.includes(value)
}
