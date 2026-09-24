/**
 * La file d'attente de l'appariement rapide.
 *
 * Jusqu'ici, on ne trouvait un adversaire humain qu'en l'ayant déjà : un lien
 * à envoyer, un ami du carnet, une arène à heure fixe. Celui qui voulait
 * « une partie de blitz, maintenant, contre n'importe qui » n'avait rien.
 *
 * Une file par cadence — deux joueurs ne s'apparient que sur la même, sans
 * quoi l'un des deux joue une partie qu'il n'a pas demandée. Entre deux
 * joueurs classés, l'écart de classement admis part étroit et s'élargit avec
 * l'attente : mieux vaut une partie déséquilibrée qu'une attente sans fin, et
 * sur une petite instance il n'y a souvent qu'une personne en face.
 *
 * Aucune socket ni base ici, pour que la règle s'éprouve seule avec une
 * horloge factice. Le serveur (`index.ts`) branche la file sur les messages,
 * crée le salon et prévient les deux joueurs.
 */

import { TIME_CONTROLS, type TimeControlPreset } from '@coupparfait/core'

/** Quelqu'un qui attend un adversaire. */
export interface Candidat {
  /** La connexion qui attend : c'est elle qu'on prévient. */
  socketId: string
  /** Identifiant de cadence, `'180+2'`. Une des `cadencesAppariables()`. */
  cadence: string
  userId: string | null
  clientId: string | null
  name: string
  /** Classement dans la catégorie de la cadence, `null` pour un invité. */
  rating: number | null
  /** Adresse du client, pour le plafond de salons par adresse. */
  adresse: string
  /** Instant d'inscription, pour l'élargissement. */
  depuis: number
}

/**
 * Les cadences où l'on peut chercher un adversaire.
 *
 * Toutes celles du cœur, sauf la partie sans pendule : sans pendule, rien ne
 * presse personne, et c'est une correspondance — elle se joue entre gens qui
 * se connaissent, pas avec le premier venu.
 */
export function cadencesAppariables(): TimeControlPreset[] {
  return TIME_CONTROLS.filter((tc) => tc.initial > 0)
}

/**
 * Écart de classement admis après `attenteMs` d'attente.
 *
 * 150 points d'emblée, 10 de plus par seconde, et plus de limite au-delà
 * d'une minute et demie : à ce stade, celui qui attend préfère n'importe
 * quelle partie à pas de partie.
 */
export function ecartAdmis(attenteMs: number): number {
  const secondes = Math.max(0, attenteMs) / 1000
  if (secondes >= 90) return Number.POSITIVE_INFINITY
  return 150 + 10 * secondes
}

/** La même personne, sous deux connexions ? */
function memePersonne(a: Candidat, b: Candidat): boolean {
  if (a.socketId === b.socketId) return true
  if (a.userId !== null && a.userId === b.userId) return true
  return a.clientId !== null && a.clientId === b.clientId
}

/**
 * Deux candidats peuvent-ils jouer ensemble maintenant ?
 *
 * L'écart se juge sur l'attente **du plus ancien** : c'est lui qui a déjà
 * payé en temps, et c'est son élargissement qui doit profiter. Un invité n'a
 * pas de classement — il s'apparie à tout le monde.
 */
export function compatibles(a: Candidat, b: Candidat, maintenant: number): boolean {
  if (a.cadence !== b.cadence || memePersonne(a, b)) return false
  if (a.rating === null || b.rating === null) return true
  const attente = maintenant - Math.min(a.depuis, b.depuis)
  return Math.abs(a.rating - b.rating) <= ecartAdmis(attente)
}

export type Inscription =
  { ok: true; remplaces: string[] } | { ok: false; code: 'badTimeControl' | 'queueFull' }

/**
 * La file. `maximum` borne le nombre de candidats toutes cadences confondues :
 * une entrée ne coûte presque rien, mais une boucle de connexions n'a pas à
 * en accumuler sans fin.
 */
export function creerFile(options: { now?: () => number; maximum?: number } = {}) {
  const now = options.now ?? Date.now
  const maximum = options.maximum ?? 2000
  const valides = new Set(cadencesAppariables().map((tc) => tc.id))
  /** Par ordre d'arrivée : l'appariement sert d'abord ceux qui attendent. */
  let candidats: Candidat[] = []

  return {
    /**
     * Inscrit un joueur. Une nouvelle demande de la même personne — même
     * connexion, même compte ou même navigateur, un second onglet par
     * exemple — **remplace** l'ancienne : on n'attend pas deux parties à la
     * fois, et l'on ne s'apparie pas avec soi-même. `remplaces` liste les
     * connexions dont la demande est tombée, pour les prévenir.
     */
    inscrire(candidat: Omit<Candidat, 'depuis'>): Inscription {
      if (!valides.has(candidat.cadence)) return { ok: false, code: 'badTimeControl' }
      const entrant: Candidat = { ...candidat, depuis: now() }
      const remplaces: string[] = []
      candidats = candidats.filter((present) => {
        if (!memePersonne(present, entrant)) return true
        if (present.socketId !== entrant.socketId) remplaces.push(present.socketId)
        return false
      })
      if (candidats.length >= maximum) return { ok: false, code: 'queueFull' }
      candidats.push(entrant)
      return { ok: true, remplaces }
    },

    /**
     * Remet dans la file un candidat qu'`apparier` en avait sorti, avec son
     * heure d'arrivée d'origine — quand la partie n'a pas pu s'ouvrir pour
     * l'autre, celui-ci ne doit pas repartir de zéro.
     */
    reinscrire(candidat: Candidat): void {
      if (candidats.some((present) => memePersonne(present, candidat))) return
      candidats.push(candidat)
      candidats.sort((x, y) => x.depuis - y.depuis)
    },

    /** Retire une connexion de la file. `true` si elle y était. */
    retirer(socketId: string): boolean {
      const avant = candidats.length
      candidats = candidats.filter((candidat) => candidat.socketId !== socketId)
      return candidats.length !== avant
    },

    /** Le candidat inscrit sous cette connexion, s'il y en a un. */
    candidat(socketId: string): Candidat | null {
      return candidats.find((candidat) => candidat.socketId === socketId) ?? null
    },

    /** Nombre de personnes qui attendent, pour une cadence ou en tout. */
    taille(cadence?: string): number {
      return cadence ? candidats.filter((c) => c.cadence === cadence).length : candidats.length
    },

    /**
     * Forme les paires possibles et les **retire** de la file.
     *
     * Dans l'ordre d'arrivée : le plus ancien choisit d'abord, et prend parmi
     * ceux qui lui conviennent le plus proche en classement — un invité
     * compte pour un écart nul. Le serveur appelle cette fonction à chaque
     * inscription et à intervalle régulier, puisque l'écart admis grandit
     * tout seul.
     */
    apparier(): Array<[Candidat, Candidat]> {
      const maintenant = now()
      const paires: Array<[Candidat, Candidat]> = []
      const pris = new Set<Candidat>()
      for (const a of candidats) {
        if (pris.has(a)) continue
        let meilleur: Candidat | null = null
        let meilleurEcart = Number.POSITIVE_INFINITY
        for (const b of candidats) {
          if (b === a || pris.has(b) || !compatibles(a, b, maintenant)) continue
          const ecart = a.rating === null || b.rating === null ? 0 : Math.abs(a.rating - b.rating)
          if (ecart < meilleurEcart) {
            meilleur = b
            meilleurEcart = ecart
          }
        }
        if (meilleur) {
          pris.add(a)
          pris.add(meilleur)
          paires.push([a, meilleur])
        }
      }
      candidats = candidats.filter((candidat) => !pris.has(candidat))
      return paires
    },
  }
}

export type FileDAttente = ReturnType<typeof creerFile>
