/**
 * Qui appelle, et à quel rythme.
 *
 * Les routes HTTP de ce serveur ne demandaient rien : ni compte, ni jeton, ni
 * mesure. La seule protection était la file de la réserve, plafonnée à seize —
 * et elle est **globale** : seize requêtes en vol et tout le monde recevait un
 * refus, y compris ceux qui n'avaient rien demandé. Le CORS, lui, ne protège de
 * rien : il s'applique dans le navigateur, pas dans `curl`.
 *
 * Jumeau volontaire de `apps/web/src/lib/server/limiteur.ts`. Les deux
 * applications ne partagent pas de code — l'une est un serveur Node nu, l'autre
 * un Next —, et un paquet commun pour quarante lignes coûterait plus cher que
 * la copie. Si l'une des deux change de politique, l'autre doit être relue.
 */

import type { IncomingMessage } from 'node:http'

export interface Limiteur {
  /** `true` si l'appel dépasse le quota. L'appel compte, dépassement compris. */
  depasse(cle: string): boolean
  /** Secondes à attendre avant que la fenêtre se rouvre, pour `Retry-After`. */
  attente(cle: string): number
}

/** Fenêtre fixe. Le compteur repart de zéro au bout de `fenetreMs`. */
export function creerLimiteur(fenetreMs: number, maximum: number): Limiteur {
  const compteurs = new Map<string, { count: number; resetAt: number }>()

  setInterval(() => {
    const maintenant = Date.now()
    for (const [cle, compteur] of compteurs) {
      if (compteur.resetAt < maintenant) compteurs.delete(cle)
    }
  }, fenetreMs).unref?.()

  return {
    depasse(cle) {
      const maintenant = Date.now()
      const compteur = compteurs.get(cle)
      if (!compteur || compteur.resetAt < maintenant) {
        compteurs.set(cle, { count: 1, resetAt: maintenant + fenetreMs })
        return false
      }
      compteur.count++
      return compteur.count > maximum
    },
    attente(cle) {
      const compteur = compteurs.get(cle)
      if (!compteur) return 0
      return Math.max(0, Math.ceil((compteur.resetAt - Date.now()) / 1000))
    },
  }
}

/**
 * `TRUST_PROXY=<n>` : lire l'adresse du client dans `X-Forwarded-For`, en
 * comptant `n` proxys de confiance devant ce serveur (`1` le plus souvent).
 *
 * Sans cette variable, l'en-tête est **ignoré**, et c'est le bon défaut : un
 * en-tête s'écrit à la main, et le croire sur parole rendrait le limiteur
 * inutile — une adresse différente à chaque requête, aucun compteur ne monte
 * jamais.
 *
 * Il faut donc la poser dès qu'il y a quelque chose devant : Nginx Proxy
 * Manager en production, mais aussi — et c'est le cas qu'on oublie — la
 * passerelle `/api/analyse` de l'application Next, par laquelle passent
 * *toutes* les analyses du navigateur. Sans elle, ces analyses comptent pour
 * une seule adresse, celle du conteneur web, et trente par minute se partagent
 * entre tous les joueurs. Voir l'avertissement au démarrage.
 */
const RELAIS_DE_CONFIANCE = relaisDeConfiance(process.env.TRUST_PROXY)

/** `TRUST_PROXY` lu comme un nombre de proxys ; absent ou illisible, zéro. */
export function relaisDeConfiance(valeur: string | undefined): number {
  const lu = Number.parseInt(valeur ?? '', 10)
  return Number.isFinite(lu) && lu > 0 ? lu : 0
}

let proxySignale = false

/**
 * Le maillon de `X-Forwarded-For` qu'on accepte de croire, ou `null`.
 *
 * **Pas le premier.** Le premier est celui que le client écrit lui-même :
 * un proxy n'efface pas l'en-tête reçu, il *ajoute* à droite l'adresse qu'il
 * voit. Lire le premier, c'était laisser `curl -H 'X-Forwarded-For: …'`
 * choisir son compteur, et le limiteur ne limitait plus rien. On compte donc
 * depuis la droite : avec `relais` proxys de confiance, l'adresse du client
 * est le maillon `longueur − relais`. Une chaîne trop courte donne le plus à
 * gauche, qui reste une adresse vue par l'un d'eux.
 *
 * Jumeau de `ipClient` dans `apps/web/src/lib/server/ip.ts`.
 */
export function maillonDeConfiance(
  transmise: string | string[] | undefined,
  relais: number,
): string | null {
  if (relais <= 0 || transmise === undefined) return null
  const maillons = (Array.isArray(transmise) ? transmise.join(',') : transmise)
    .split(',')
    .map((maillon) => maillon.trim())
    .filter(Boolean)
  if (maillons.length === 0) return null
  return maillons[Math.max(0, maillons.length - relais)] ?? null
}

/** L'adresse de l'appelant, telle qu'on accepte de la croire. */
export function adresseDe(request: IncomingMessage): string {
  const transmise = request.headers['x-forwarded-for']
  const maillon = maillonDeConfiance(transmise, RELAIS_DE_CONFIANCE)
  if (maillon) return maillon

  if (transmise && !proxySignale) {
    proxySignale = true
    console.warn(
      '[limites] X-Forwarded-For reçu mais TRUST_PROXY n’est pas posé : toutes ces requêtes ' +
        'comptent pour une seule adresse. Pose TRUST_PROXY=1 s’il y a un relais devant ce serveur.',
    )
  }

  return request.socket.remoteAddress ?? 'inconnu'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seau à jetons, pour les sockets
// ─────────────────────────────────────────────────────────────────────────────

export interface Seau {
  /** Prend un jeton. `false` si le seau est vide : l'action est à ignorer. */
  prendre(): boolean
}

/**
 * Un seau à jetons : `capacite` actions d'un coup, puis au rythme de
 * `capacite` par `periodeMs`.
 *
 * Le limiteur à fenêtre fixe ci-dessus compte **par adresse** et sert aux
 * routes HTTP. Une connexion Socket.IO, elle, est déjà identifiée — c'est un
 * seau par socket et par événement, tenu dans la fermeture de la connexion,
 * donc libéré avec elle. Rien à purger.
 *
 * Un seau plutôt qu'une fenêtre parce qu'un joueur en zeitnot joue dix coups
 * en trois secondes, ce qui est légitime, et pas trois cents à la minute, ce
 * qui ne l'est pas : le seau tolère la rafale et refuse le débit.
 *
 * `now` s'injecte pour les tests.
 */
export function creerSeau(capacite: number, periodeMs: number, now: () => number = Date.now): Seau {
  let jetons = capacite
  let dernier = now()
  const parMs = capacite / periodeMs

  return {
    prendre() {
      const maintenant = now()
      jetons = Math.min(capacite, jetons + Math.max(0, maintenant - dernier) * parMs)
      dernier = maintenant
      if (jetons < 1) return false
      jetons -= 1
      return true
    },
  }
}
