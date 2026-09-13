/**
 * Parties récupérées d'un compte de jeu en ligne.
 *
 * Le format commun aux deux sources. Chess.com et Lichess décrivent la même
 * chose de deux façons très différentes ; on normalise ici pour que le reste
 * de l'application n'ait jamais à savoir d'où vient une partie.
 *
 * Rien n'est écrit en base : cette liste vit le temps de la visite. C'est ce
 * qui permet à quelqu'un qui n'a pas de compte chez nous de coller son pseudo
 * et de voir ses parties analysées dans la foulée — le chemin le plus court
 * entre un visiteur et quelque chose d'utile.
 */

export type SourceEnLigne = 'chesscom' | 'lichess'

export const SOURCES: Array<{ id: SourceEnLigne; label: string }> = [
  { id: 'chesscom', label: 'Chess.com' },
  { id: 'lichess', label: 'Lichess' },
]

export interface PartieImportee {
  source: SourceEnLigne
  /** Identifiant chez la source, pour les clés de liste. */
  id: string
  /** Lien vers la partie chez la source. */
  url: string
  /** Date de fin, en millisecondes epoch. */
  date: number
  blanc: string
  noir: string
  /** `1-0`, `0-1`, `1/2-1/2` ou `*`. */
  resultat: string
  /** Cadence telle que la nomme la source : blitz, rapid, classical… */
  cadence: string
  pgn: string
  /** Camp joué par le pseudo demandé — sert à orienter l'analyse. */
  monCamp: 'w' | 'b'
}

export interface ReponseImport {
  parties: PartieImportee[]
}

/** Nombre de parties demandées par défaut. Le serveur plafonne de son côté. */
export const PARTIES_PAR_DEFAUT = 30

/**
 * Récupère les dernières parties publiques d'un pseudo.
 *
 * Passe par notre serveur : ni Chess.com ni Lichess n'autorisent l'appel
 * direct depuis une page web, et Chess.com refuse en plus les requêtes sans
 * en-tête d'identification.
 */
export async function chargerParties(
  source: SourceEnLigne,
  pseudo: string,
  max = PARTIES_PAR_DEFAUT,
): Promise<PartieImportee[]> {
  const reponse = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, pseudo, max }),
  })

  const donnees = (await reponse.json()) as ReponseImport & { error?: string }
  if (!reponse.ok) {
    // Sans message du serveur, on laisse la chaîne vide : c'est l'appelant, qui
    // a le dictionnaire, qui dira « impossible de récupérer les parties ».
    throw new Error(donnees.error ?? '')
  }
  return donnees.parties ?? []
}

/** Résultat vu du camp joué : gagné, perdu, ou nulle. */
export function issuePour(partie: PartieImportee): 'gagne' | 'perdu' | 'nulle' | 'inconnue' {
  if (partie.resultat === '1/2-1/2') return 'nulle'
  if (partie.resultat === '1-0') return partie.monCamp === 'w' ? 'gagne' : 'perdu'
  if (partie.resultat === '0-1') return partie.monCamp === 'b' ? 'gagne' : 'perdu'
  return 'inconnue'
}
