/** Ce que l'API de progression renvoie. */
export interface Progression {
  defeated: number
  unlocked: number
  attempts: number
  wins: number
  tracked: boolean
}

/**
 * Enregistre une partie terminée contre l'ordinateur.
 *
 * Appelé au moment où la partie s'achève, et jamais bloquant : une progression
 * qu'on n'a pas pu écrire ne doit pas empêcher de voir son résultat.
 */
export function recordBotGame(level: number, won: boolean): void {
  void fetch('/api/progression', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level, won }),
  }).catch(() => {
    // Hors ligne ou sans compte : la partie reste jouée, simplement pas comptée.
  })
}
