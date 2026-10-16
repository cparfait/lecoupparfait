/**
 * Deux versions désignent-elles la même chose ?
 *
 * Partagé par l'onglet Outils de l'administration et par le décompte qui allume
 * la pastille du compte : les deux doivent compter la même chose, sinon la
 * pastille annonce trois mises à jour et la page n'en montre que deux.
 *
 * Les étiquettes ne s'écrivent pas partout pareil : Stockfish publie `sf_19`
 * quand le catalogue dit « 19 », Lc0 publie `v0.32.1`. On normalise le peu
 * qu'il faut, et l'on préfère répondre « à vérifier » plutôt que d'affirmer
 * « obsolète » sur une différence de préfixe.
 */
export function normaliserVersion(version: string): string {
  return version.trim().toLowerCase().replace(/^sf_/, '').replace(/^v/, '')
}

export type EtatVersion = 'ajour' | 'plusrecent' | 'inconnue'

export function comparerVersions(actuelle: string | null, derniere: string | null): EtatVersion {
  if (!actuelle || !derniere) return 'inconnue'
  return normaliserVersion(actuelle) === normaliserVersion(derniere) ? 'ajour' : 'plusrecent'
}
