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

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface AvatarFamily {
  /*
    Intitulé de l'onglet et phrase qui dit à qui la famille s'adresse,
    donnés par clé de dictionnaire.

    Les deux étaient en français dans le code, et le restaient dans les
    quarante autres langues : une constante de module ne peut pas appeler
    `t()`, qui est un crochet. Les deux écrans qui lisent cette table — la
    mise en route du compte et le choix d'avatar — résolvent au rendu.
  */
  label: TranslationKey
  hint: TranslationKey
  emojis: string[]
}

export const AVATAR_FAMILIES: AvatarFamily[] = [
  {
    label: 'parts.avatarChess',
    hint: 'parts.avatarChessHint',
    emojis: ['♟️', '♞', '♝', '♜', '♛', '♚', '♙', '♘', '♗', '♖', '♕', '♔'],
  },
  {
    label: 'parts.avatarAnimals',
    hint: 'parts.avatarAnimalsHint',
    emojis: [
      '🦉',
      '🦊',
      '🐺',
      '🐯',
      '🦁',
      '🐻',
      '🐼',
      '🐨',
      '🐸',
      '🐢',
      '🐬',
      '🐙',
      '🦅',
      '🦋',
      '🐝',
      '🐞',
      '🦔',
      '🦇',
      '🐧',
      '🦩',
    ],
  },
  {
    label: 'parts.avatarCreatures',
    hint: 'parts.avatarCreaturesHint',
    emojis: ['🐉', '🦄', '👾', '🤖', '👻', '🎃', '🧙', '🧝', '🦖', '🐲'],
  },
  {
    label: 'parts.avatarNature',
    hint: 'parts.avatarNatureHint',
    emojis: ['🌵', '🍀', '🌻', '🍁', '🌊', '🔥', '❄️', '⭐', '🌙', '☀️', '🌈', '🍄'],
  },
  {
    label: 'parts.avatarObjects',
    hint: 'parts.avatarObjectsHint',
    emojis: ['⚓', '🎩', '🎸', '🚀', '🧭', '🔭', '📚', '🎲', '🏆', '⚙️', '💡', '🗝️'],
  },
]

/** Tous les avatars, à plat : sert à valider ce qu'on reçoit. */
export const AVATARS = AVATAR_FAMILIES.flatMap((family) => family.emojis)

/**
 * Avatar par défaut.
 *
 * Le pion : celui par lequel tout le monde commence, au jeu comme ici. Il reste
 * le repli d'affichage — un compte ancien, une ligne sans avatar — mais il n'est
 * plus ce qu'on reçoit en s'inscrivant : voir `avatarAuHasard`.
 */
export const DEFAULT_AVATAR = '♟️'

/**
 * Un avatar tiré au sort, pour un compte qui vient d'être créé.
 *
 * Tout le monde héritait du même pion noir, et presque personne n'en changeait :
 * le choix existait, en bas d'une page de profil qu'on ne visite pas le jour de
 * son inscription. Résultat, une liste d'amis de vingt lignes portant vingt fois
 * le même symbole — soit exactement ce que l'avatar est censé éviter.
 *
 * Le tirage règle les deux moitiés du problème d'un coup : les listes sont
 * lisibles dès le premier jour, et recevoir un avatar qu'on n'a pas demandé est
 * la meilleure invitation qui soit à le changer.
 *
 * Le pion en est exclu : il reste le signe du compte sans avatar, et le tirer au
 * sort le rendrait indistinct de ce qu'il signale.
 */
export function avatarAuHasard(): string {
  const pool = AVATARS.filter((emoji) => emoji !== DEFAULT_AVATAR)
  return pool[Math.floor(Math.random() * pool.length)] ?? DEFAULT_AVATAR
}

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
