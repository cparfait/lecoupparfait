'use client'

/**
 * La journée d'échecs : défi du jour, quêtes, série.
 *
 * Ce qu'on cherche, c'est une raison de revenir demain — et la raison qui
 * marche n'est pas la barre de progression, c'est **la position partagée**.
 * Tout le monde reçoit le même défi le même jour : on peut en parler, comparer
 * son temps, râler ensemble. Une barre qui se remplit ne se raconte à personne.
 *
 * Les quêtes et la série viennent par-dessus, parce que c'est amusant et que
 * ça donne un cap court. Deux règles pour que ça reste honnête :
 *
 *  - **aucune récompense n'interrompt une partie** — les points s'annoncent en
 *    bandeau discret, jamais en fenêtre par-dessus l'échiquier ;
 *  - **rien n'est bloqué derrière la série.** Perdre une série de quarante
 *    jours doit coûter un pincement, pas l'accès à une fonctionnalité.
 *
 * Tout fonctionne sans compte : l'état vit dans le navigateur. Quand on est
 * connecté, il est aussi conservé côté serveur pour suivre d'un appareil à
 * l'autre.
 */

import { QUETES, quetePar, xpPour, type Quete, type QueteId } from './quetes.ts'

export { QUETES, XP_TOTAL, type Quete, type QueteId } from './quetes.ts'

const STORAGE_KEY = 'coupparfait.quotidien'

/**
 * À qui appartient la journée en cours ?
 *
 * `undefined` tant qu'on ne sait pas, `null` pour un visiteur sans compte.
 *
 * ── Pourquoi ce champ existe ──────────────────────────────────────────────
 *
 * La journée vivait dans une clé unique du stockage local, sans le moindre
 * rapport avec le compte connecté. Sur un navigateur qui avait déjà servi,
 * créer un compte tout neuf affichait donc « 5 jours d'affilée » : la série
 * était celle du navigateur, pas celle de la personne. Et comme la reprise
 * depuis le serveur garde le plus grand des deux (voir plus bas), le compte
 * neuf poussait ensuite cette série mensongère en base, où elle devenait
 * vraie.
 *
 * Chaque compte a donc sa propre clé, et les visiteurs anonymes la leur. Ce
 * qui a été fait sans compte ne suit pas dans un compte — c'est le prix, et
 * il est bien plus faible que celui d'un compteur auquel on ne peut pas
 * croire.
 */
let compte: string | null | undefined = undefined

function cleDuStockage(): string {
  return compte ? `${STORAGE_KEY}:${compte}` : STORAGE_KEY
}

/**
 * Déclare de quel compte est la journée qu'on affiche.
 *
 * Appelée par `useQuotidien` dès que l'identité est connue, et à chaque fois
 * qu'elle change — connexion, déconnexion, changement de compte. L'état en
 * mémoire est jeté et relu sous la nouvelle clé, ce qui rafraîchit du même
 * coup tous les abonnés.
 */
export function definirCompte(pseudo: string | null): void {
  if (compte === pseudo) return
  compte = pseudo
  courant = null
  etatDuJour()
}

export interface EtatQuotidien {
  /** Jour concerné, au format `AAAA-MM-JJ` en heure locale. */
  jour: string
  /** Avancement de chaque quête. */
  avancement: Partial<Record<QueteId, number>>
  /** Jours consécutifs avec au moins une quête terminée. */
  serie: number
  /** Meilleure série atteinte. */
  meilleureSerie: number
}

/**
 * Date du jour en heure **locale**, au format `AAAA-MM-JJ`.
 *
 * Volontairement local et non UTC : la journée d'un joueur commence quand il
 * se lève, pas à minuit à Greenwich. Un joueur à Nouméa qui joue le soir
 * verrait sinon sa série se casser tous les jours.
 */
export function jourLocal(date = new Date()): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mois}-${jour}`
}

/** Jour précédent, pour savoir si la série se poursuit. */
function jourPrecedent(jour: string): string {
  const [annee, mois, date] = jour.split('-').map(Number)
  const veille = new Date(annee ?? 1970, (mois ?? 1) - 1, (date ?? 1) - 1)
  return jourLocal(veille)
}

function etatVierge(jour: string): EtatQuotidien {
  return { jour, avancement: {}, serie: 0, meilleureSerie: 0 }
}

function lire(): EtatQuotidien | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(cleDuStockage())
    if (!brut) return null
    const parse = JSON.parse(brut) as EtatQuotidien
    return typeof parse?.jour === 'string' ? parse : null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Diffusion
// ─────────────────────────────────────────────────────────────────────────────
//
// L'état est partagé par tous ceux qui l'affichent : la carte de l'accueil, la
// pastille de série dans l'en-tête, la page de puzzles. Sans ce petit magasin,
// chaque composant garderait sa copie — et résoudre le défi du jour laisserait
// la pastille afficher l'ancienne série jusqu'au prochain rechargement.

let courant: EtatQuotidien | null = null
const abonnes = new Set<() => void>()

/** S'abonner aux changements. Renvoie la fonction de désabonnement. */
export function souscrire(ecouteur: () => void): () => void {
  abonnes.add(ecouteur)
  return () => abonnes.delete(ecouteur)
}

/**
 * État partagé, ou `null` tant qu'il n'a pas été lu.
 *
 * La référence ne change qu'en cas de modification réelle : c'est ce que
 * `useSyncExternalStore` exige pour ne pas boucler indéfiniment.
 */
export function instantane(): EtatQuotidien | null {
  return courant
}

function ecrire(etat: EtatQuotidien): void {
  courant = etat
  for (const ecouteur of abonnes) ecouteur()

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(cleDuStockage(), JSON.stringify(etat))
  } catch {
    // Sans stockage, la journée fonctionne quand même — elle ne survit
    // simplement pas au rechargement. Ce n'est pas une raison de tout casser.
  }
}

/**
 * État du jour, en basculant automatiquement à la date courante.
 *
 * C'est ici que la série se met à jour : si le dernier jour enregistré est la
 * veille **et** qu'on y avait fait quelque chose, la série continue ; s'il est
 * plus ancien, elle repart de zéro. On ne l'incrémente pas encore — cela se
 * fait à la première quête terminée, sinon ouvrir la page suffirait.
 */
export function etatDuJour(): EtatQuotidien {
  const aujourdhui = jourLocal()
  // L'état déjà diffusé fait foi tant qu'on est le même jour : le relire au
  // stockage renverrait un objet différent à chaque appel, ce qui suffirait à
  // faire boucler les composants qui s'y abonnent.
  if (courant && courant.jour === aujourdhui) return courant

  const enregistre = lire()

  if (!enregistre) {
    const vierge = etatVierge(aujourdhui)
    ecrire(vierge)
    return vierge
  }
  if (enregistre.jour === aujourdhui) {
    ecrire(enregistre)
    return enregistre
  }

  const continuite = enregistre.jour === jourPrecedent(aujourdhui) && aUneQueteFaite(enregistre)
  const suivant: EtatQuotidien = {
    jour: aujourdhui,
    avancement: {},
    serie: continuite ? enregistre.serie : 0,
    meilleureSerie: enregistre.meilleureSerie,
  }
  ecrire(suivant)
  return suivant
}

function aUneQueteFaite(etat: EtatQuotidien): boolean {
  return QUETES.some((quete) => (etat.avancement[quete.id] ?? 0) >= quete.objectif)
}

/** Vrai si la quête est terminée dans cet état. */
export function queteFaite(etat: EtatQuotidien, id: QueteId): boolean {
  const quete = quetePar(id)
  if (!quete) return false
  return (etat.avancement[id] ?? 0) >= quete.objectif
}

/** Points gagnés aujourd'hui. */
export function xpDuJour(etat: EtatQuotidien): number {
  return xpPour(etat.avancement as Record<string, number>)
}

export interface ResultatAvancement {
  etat: EtatQuotidien
  /** La quête vient d'être terminée à l'instant — de quoi féliciter, une fois. */
  queteTerminee: Quete | null
  /** La série vient d'augmenter. */
  serieAugmentee: boolean
}

/**
 * Enregistre une action et renvoie ce qui a changé.
 *
 * Renvoyer explicitement ce qui vient d'être franchi évite le travers habituel
 * de ce genre de système : féliciter à chaque rendu. On ne célèbre que le
 * passage, et l'appelant décide quoi en faire.
 */
export function avancerQuete(id: QueteId, pas = 1): ResultatAvancement {
  const etat = etatDuJour()
  const quete = quetePar(id)
  if (!quete) return { etat, queteTerminee: null, serieAugmentee: false }

  const avant = etat.avancement[id] ?? 0
  if (avant >= quete.objectif) {
    return { etat, queteTerminee: null, serieAugmentee: false }
  }

  const apres = Math.min(quete.objectif, avant + pas)
  const premiereDuJour = !aUneQueteFaite(etat)
  const terminee = apres >= quete.objectif

  const suivant: EtatQuotidien = {
    ...etat,
    avancement: { ...etat.avancement, [id]: apres },
  }

  // La série compte les jours où l'on a fait quelque chose, pas les jours où
  // l'on est passé. Elle avance donc à la première quête terminée.
  const serieAugmentee = terminee && premiereDuJour
  if (serieAugmentee) {
    suivant.serie = etat.serie + 1
    suivant.meilleureSerie = Math.max(etat.meilleureSerie, suivant.serie)
  }

  ecrire(suivant)
  void synchroniser(suivant)

  return { etat: suivant, queteTerminee: terminee ? quete : null, serieAugmentee }
}

/**
 * Pousse l'état vers le serveur, sans bloquer et sans se plaindre.
 *
 * L'appel échoue pour les visiteurs non connectés, ce qui est le cas nominal :
 * la plateforme s'utilise sans compte. Un échec ici ne doit donc jamais
 * remonter à l'écran.
 */
async function synchroniser(etat: EtatQuotidien): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/quotidien', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(etat),
    })
  } catch {
    // Hors ligne : l'état local fait foi, il repartira au prochain passage.
  }
}

/**
 * Reprend l'état du serveur au chargement, en gardant le meilleur des deux.
 *
 * On ne remplace jamais le local par le distant : quelqu'un qui a joué hors
 * ligne puis se connecte perdrait sa journée. On fusionne — avancement le plus
 * avancé, série la plus longue — parce qu'aucune des deux sources n'a de
 * raison d'être en retard sur l'autre.
 */
export async function reprendreDepuisLeServeur(): Promise<EtatQuotidien> {
  const local = etatDuJour()
  try {
    const reponse = await fetch('/api/quotidien')
    if (!reponse.ok) return local

    const distant = (await reponse.json()) as { etat?: EtatQuotidien | null }
    if (!distant.etat || distant.etat.jour !== local.jour) {
      // Le serveur ne sait rien d'aujourd'hui, mais il peut connaître une
      // série plus longue, faite depuis un autre appareil.
      if (distant.etat && distant.etat.serie > local.serie) {
        const fusionne = {
          ...local,
          serie: distant.etat.serie,
          meilleureSerie: Math.max(local.meilleureSerie, distant.etat.meilleureSerie),
        }
        ecrire(fusionne)
        return fusionne
      }
      return local
    }

    const avancement = { ...local.avancement }
    for (const quete of QUETES) {
      const cote = distant.etat.avancement?.[quete.id] ?? 0
      avancement[quete.id] = Math.max(avancement[quete.id] ?? 0, cote)
    }

    const fusionne: EtatQuotidien = {
      jour: local.jour,
      avancement,
      serie: Math.max(local.serie, distant.etat.serie),
      meilleureSerie: Math.max(local.meilleureSerie, distant.etat.meilleureSerie),
    }
    ecrire(fusionne)
    return fusionne
  } catch {
    return local
  }
}
