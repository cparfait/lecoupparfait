/**
 * Le rappel du défi du jour.
 *
 * Un défi quotidien qu'on oublie de faire n'existe pas. Le reste de
 * l'application réagit à une visite ; ce rappel-ci doit partir vers quelqu'un
 * qui n'est *pas* venu — c'est même toute sa raison d'être. Il vit donc dans ce
 * processus, le seul qui tourne en permanence, à côté de la boucle des arènes.
 *
 * **Trois précautions, et chacune vient d'un travers de ce genre de rappel :**
 *
 *  1. **À l'heure de la personne, pas à celle du serveur.** Le fuseau est
 *     enregistré avec l'abonnement. Un rappel à dix-huit heures françaises est
 *     un rappel au milieu de la nuit pour qui joue depuis Montréal.
 *  2. **Une fois par jour et par appareil.** La colonne `dernier_defi_envoye`
 *     porte le jour déjà servi. La boucle peut donc battre toutes les dix
 *     minutes, et le conteneur redémarrer entre deux passages, sans jamais
 *     produire deux notifications.
 *  3. **Rien à qui a déjà joué.** Un rappel de faire ce qu'on vient de faire
 *     est la façon la plus sûre de se faire couper.
 *
 * Le code d'envoi est proche de celui de `apps/web/src/lib/server/push.ts`, et
 * cette ressemblance est assumée : les deux processus sont séparés — l'un est
 * une application Next, l'autre un serveur Node ordinaire —, ils ne partagent
 * ni alias d'import ni frontière `server-only`, et mutualiser trente lignes
 * imposerait un paquet de plus à construire et à publier dans les deux images.
 */

import webpush from 'web-push'
import { texteDeNotification } from '@coupparfait/core'
import {
  abonnementsDefiEnAttente,
  defisDejaFaits,
  marquerDefiEnvoye,
  retirerAbonnements,
} from '@coupparfait/db/push'

const CLE_PUBLIQUE = process.env.VAPID_PUBLIC_KEY?.trim()
const CLE_PRIVEE = process.env.VAPID_PRIVATE_KEY?.trim()

/**
 * L'heure locale du rappel, sur 24 h.
 *
 * Dix-huit heures par défaut : la fin de journée est le moment où l'on ouvre
 * une application de jeu, et il reste assez de soirée pour faire le défi. Une
 * valeur hors de [0, 23] — ou vide — coupe le rappel sans autre réglage.
 */
const HEURE = Number(process.env.DEFI_RAPPEL_HEURE ?? 18)

/**
 * On ne rappelle plus après vingt-deux heures.
 *
 * Sans cette borne, un serveur arrêté toute la journée enverrait sa fournée à
 * la reprise, quelle que soit l'heure. Recevoir « viens jouer aux échecs » à
 * deux heures du matin est le genre de chose après quoi on coupe les
 * notifications pour de bon.
 */
const HEURE_LIMITE = 22

const configurable = Boolean(CLE_PUBLIQUE && CLE_PRIVEE)
let configure = false

/** Vrai si le processus peut envoyer des notifications. */
export function rappelsPossibles(): boolean {
  return configurable && Number.isInteger(HEURE) && HEURE >= 0 && HEURE <= 23
}

function preparer(): void {
  if (configure) return
  const sujet =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://coupparfait.example'
  webpush.setVapidDetails(sujet, CLE_PUBLIQUE!, CLE_PRIVEE!)
  configure = true
}

/**
 * L'heure et le jour qu'il est chez quelqu'un.
 *
 * `Intl` fait tout le travail, y compris les changements d'heure : recalculer
 * un décalage à la main revient à réimplémenter la base de données des fuseaux,
 * et à se tromper deux dimanches par an.
 */
function localementChez(timezone: string, instant: Date): { jour: string; heure: number } | null {
  try {
    const parties = new Intl.DateTimeFormat('fr-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(instant)

    const lire = (type: string) => parties.find((partie) => partie.type === type)?.value ?? ''
    const jour = `${lire('year')}-${lire('month')}-${lire('day')}`
    // `hour12: false` rend « 24 » à minuit dans certains environnements.
    const heure = Number(lire('hour')) % 24

    return /^\d{4}-\d{2}-\d{2}$/.test(jour) ? { jour, heure } : null
  } catch {
    // Fuseau inconnu du système : on préfère ne rien envoyer plutôt que de
    // deviner et de sonner à une heure indue.
    return null
  }
}

/**
 * Un tour de rappel.
 *
 * Rend le nombre de notifications parties, pour la journalisation.
 */
export async function rappelDuDefi(maintenant = new Date()): Promise<number> {
  if (!rappelsPossibles()) return 0

  const abonnements = await abonnementsDefiEnAttente()
  if (abonnements.length === 0) return 0

  // Premier filtre : l'heure locale, et le jour pas encore servi. Il élimine
  // l'écrasante majorité des lignes sans toucher à la base.
  const candidats: Array<{ abonnement: (typeof abonnements)[number]; jour: string }> = []
  for (const abonnement of abonnements) {
    const local = localementChez(abonnement.timezone, maintenant)
    if (!local) continue
    if (local.heure < HEURE || local.heure > HEURE_LIMITE) continue
    if (abonnement.dernierDefiEnvoye === local.jour) continue
    candidats.push({ abonnement, jour: local.jour })
  }
  if (candidats.length === 0) return 0

  // Second filtre : ceux qui ont déjà résolu le défi.
  const faits = await defisDejaFaits(
    candidats.map((candidat) => candidat.abonnement.userId),
    candidats.map((candidat) => candidat.jour),
  )

  preparer()

  const envoyes: string[] = []
  const morts: string[] = []
  /*
    Les appareils marqués sans avoir rien reçu.

    Quelqu'un qui a déjà résolu le défi doit être noté comme servi pour la
    journée, sans quoi la boucle le réexaminerait tous les quarts d'heure
    jusqu'à minuit — et le notifierait pour de bon s'il rouvrait un onglet
    entre-temps.
  */
  const passes: string[] = []
  const jourPar = new Map<string, string>()

  await Promise.all(
    candidats.map(async ({ abonnement, jour }) => {
      jourPar.set(abonnement.endpoint, jour)

      if (faits.has(`${abonnement.userId}|${jour}`)) {
        passes.push(abonnement.endpoint)
        return
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
          },
          // Dans la langue du compte, lue avec l'abonnement : le rappel part
          // vers quelqu'un qui n'a pas la page ouverte, il n'y a pas d'autre
          // source. Voir `packages/core/src/notifications.ts`.
          JSON.stringify({
            ...texteDeNotification({ sujet: 'defiDuJour' }, abonnement.locale),
            url: '/',
            fil: 'defi-du-jour',
          }),
          // Six heures : passé minuit le défi a changé, la notification ne
          // veut plus rien dire et il vaut mieux qu'elle n'arrive jamais.
          { TTL: 6 * 3600, urgency: 'low' },
        )
        envoyes.push(abonnement.endpoint)
      } catch (erreur) {
        const code = (erreur as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) morts.push(abonnement.endpoint)
        // Panne passagère : on ne marque pas, le prochain tour retentera.
      }
    }),
  )

  await retirerAbonnements(morts)

  /*
    Le marquage se fait jour par jour.

    Deux abonnés dans deux fuseaux ne sont pas le même jour au même instant :
    écrire une seule date pour toute la fournée avancerait ou retarderait l'un
    des deux d'une journée entière.
  */
  const parJour = new Map<string, string[]>()
  for (const endpoint of [...envoyes, ...passes]) {
    const jour = jourPar.get(endpoint)
    if (!jour) continue
    const liste = parJour.get(jour) ?? []
    liste.push(endpoint)
    parJour.set(jour, liste)
  }
  for (const [jour, endpoints] of parJour) {
    await marquerDefiEnvoye(endpoints, jour)
  }

  return envoyes.length
}
