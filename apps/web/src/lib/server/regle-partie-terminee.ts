/**
 * Les deux règles de `POST /api/parties/terminee` qui décident du classement.
 *
 * Elles vivaient dans la route, et `scripts/check-partie-terminee.mjs` les
 * recopiait « ligne pour ligne » pour les tester : une copie qui pouvait
 * diverger de l'original sans que rien ne rougisse. Elles sont ici, sans
 * dépendance, pour que la route et le contrôle importent la même chose.
 */

/**
 * Le résultat déclaré peut-il compter au classement ?
 *
 * Oui si la position l'impose (mat, pat, nulle réglementaire) — la route a
 * déjà refusé un déclaré qui la contredit. Sinon la partie s'est terminée
 * hors de l'échiquier (abandon, drapeau, accord), rien ne peut le prouver, et
 * seul ce qui **défavorise** le joueur est accepté : sa défaite, ou la nulle.
 */
export function resultatVerifiable(
  impose: string | null,
  declare: string,
  camp: 'w' | 'b',
): boolean {
  const gagneeParLeJoueur = declare !== '1/2-1/2' && (declare === '1-0') === (camp === 'w')
  return impose !== null || !gagneeParLeJoueur
}

/**
 * Deux FEN décrivent-elles la même position ?
 *
 * Les quatre premiers champs — pièces, trait, roques, prise en passant — et pas
 * les deux derniers : le compteur des cinquante coups et le numéro du coup
 * varient d'un moteur à l'autre pour une position identique, et les faire
 * entrer dans la comparaison reviendrait à refuser une position initiale
 * légitime parce qu'elle est écrite `0 1` d'un côté et `0 0` de l'autre.
 */
export function memePosition(a: string, b: string): boolean {
  const champs = (fen: string) => fen.trim().split(/\s+/).slice(0, 4).join(' ')
  return champs(a) === champs(b)
}
