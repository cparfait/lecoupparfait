/**
 * Qui peut ouvrir un salon, et à quelles conditions.
 *
 * Un salon naît du premier `join` sur un identifiant inconnu : douze
 * caractères choisis par le client, sans compte. Rien ne plafonnait leur
 * nombre — une boucle de `join` sur des identifiants neufs remplissait la
 * mémoire du processus, qui porte aussi toutes les parties en cours. Et le
 * drapeau `rated` était fixé par ce premier arrivant, quel qu'il soit : un
 * visiteur anonyme pouvait ouvrir un salon « classé », et c'est la partie
 * de l'invité qui y entrait ensuite qui comptait au classement.
 *
 * Ces règles sont ici, sans socket ni base, pour être testées seules.
 */

/** Un entier positif lu dans l'environnement, ou la valeur par défaut. */
function entier(valeur: string | undefined, defaut: number): number {
  const lu = Number.parseInt(valeur ?? '', 10)
  return Number.isFinite(lu) && lu > 0 ? lu : defaut
}

/**
 * Salons en mémoire, toutes origines confondues : `MAX_ROOMS`, 2 000 par défaut.
 *
 * Un salon pèse quelques dizaines de kilo-octets (échiquier, historique,
 * tchat) : deux mille tiennent largement dans la mémoire du conteneur, et
 * dépassent de loin ce qu'une instance auto-hébergée voit jouer en même temps.
 */
export const MAX_SALONS = entier(process.env.MAX_ROOMS, 2000)

/**
 * Salons ouverts par une même adresse et encore en mémoire :
 * `MAX_ROOMS_PER_IP`, 20 par défaut. Un club derrière une seule box ouvre
 * rarement vingt parties à la fois ; un script, si.
 */
export const MAX_SALONS_PAR_ADRESSE = entier(process.env.MAX_ROOMS_PER_IP, 20)

export type Admission = 'ok' | 'plein' | 'tropParAdresse'

/**
 * Tient l'adresse qui a ouvert chaque salon, pour compter par adresse.
 *
 * `existe` dit si un salon vit encore : le registre ne suit pas les
 * suppressions une à une (elles sont dispersées dans le serveur), il oublie
 * paresseusement les salons disparus au moment de compter.
 */
export function creerRegistre(
  existe: (slug: string) => boolean,
  limites = { total: MAX_SALONS, parAdresse: MAX_SALONS_PAR_ADRESSE },
) {
  const origines = new Map<string, string>()

  return {
    /** Peut-on ouvrir un salon de plus depuis cette adresse ? */
    admettre(adresse: string, enMemoire: number): Admission {
      if (enMemoire >= limites.total) return 'plein'
      let siens = 0
      for (const [slug, origine] of origines) {
        if (!existe(slug)) {
          origines.delete(slug)
          continue
        }
        if (origine === adresse) siens++
      }
      return siens >= limites.parAdresse ? 'tropParAdresse' : 'ok'
    },
    /** À appeler une fois le salon créé. */
    noter(slug: string, adresse: string): void {
      origines.set(slug, adresse)
    },
  }
}

/**
 * Le salon sera-t-il classé ?
 *
 * Seulement si on le demande **et** que l'hôte — celui qui ouvre le salon —
 * est connecté. Un classement engage deux comptes : il ne peut pas naître de
 * la parole d'un anonyme. Le second joueur, lui, est vérifié à
 * l'enregistrement : `persistence.ts` ne classe qu'avec deux comptes.
 */
export function classementAccorde(demande: unknown, hoteAuthentifie: boolean): boolean {
  return demande === true && hoteAuthentifie
}
