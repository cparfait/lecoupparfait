/**
 * Sur quoi joue quelqu'un : l'appli Android (et laquelle), un téléphone ou un
 * ordinateur.
 *
 * Le battement de présence le dit au serveur, qui le garde dans
 * `users.appareil` pour l'administration. La question revient à chaque défaut
 * signalé — « tu as quelle version de l'appli ? » — et le joueur ne sait pas
 * y répondre : la coque ne se voit pas, et le contenu est le même partout.
 *
 * Ce module n'est ni client ni serveur : le client y décrit, la route y
 * valide, l'administration y relit. La forme stockée est une chaîne courte,
 * `appli:1.3.0:play`, `mobile` ou `ordinateur`.
 */

export type Appareil =
  | { genre: 'appli'; version: string; distribution: 'site' | 'play' }
  | { genre: 'mobile' }
  | { genre: 'ordinateur' }

/** Une version de coque, telle que `versionName` dans `build.gradle`. */
const VERSION = /^\d{1,3}(\.\d{1,3}){0,3}$/

export function encoderAppareil(appareil: Appareil): string {
  return appareil.genre === 'appli'
    ? `appli:${appareil.version}:${appareil.distribution}`
    : appareil.genre
}

/**
 * Relit ce que le client envoie, ou ce que la base garde. Tout ce qui n'a pas
 * exactement la forme attendue vaut `null` : la valeur vient du navigateur, et
 * l'on ne stocke pas une chaîne arbitraire sous prétexte qu'elle est courte.
 */
export function lireAppareil(brut: unknown): Appareil | null {
  if (typeof brut !== 'string') return null
  if (brut === 'mobile' || brut === 'ordinateur') return { genre: brut }
  const [genre, version, distribution, ...reste] = brut.split(':')
  if (
    genre !== 'appli' ||
    reste.length > 0 ||
    !version ||
    !VERSION.test(version) ||
    (distribution !== 'site' && distribution !== 'play')
  ) {
    return null
  }
  return { genre, version, distribution }
}
