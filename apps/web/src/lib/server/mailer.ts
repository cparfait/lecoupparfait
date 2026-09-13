import 'server-only'

/**
 * Courriels.
 *
 * Le projet n'en envoyait aucun : l'adresse était demandée à l'inscription,
 * vérifiée en unicité, puis jamais utilisée. Il fallait donc commencer par le
 * message avant de pouvoir le simuler.
 *
 * Deux acheminements, choisis par la configuration :
 *
 *  - **En développement**, on écrit le message sur le disque au lieu de
 *    l'envoyer. Une page le montre. C'est ce qui permet d'éprouver une
 *    inscription de bout en bout sans serveur de messagerie, sans adresse
 *    jetable, et sans risquer d'écrire à quelqu'un pour de vrai en essayant.
 *
 *  - **En production**, l'envoi passe par un serveur SMTP. Tant qu'aucun n'est
 *    configuré, le message est journalisé et rien ne part : mieux vaut une
 *    inscription qui aboutit sans courriel qu'une inscription qui échoue parce
 *    que la messagerie n'est pas prête.
 *
 * **Ce que « rien ne part » coûtait.** Le second cas était le cas réel : la
 * production tournait sans `SMTP_URL`, et l'écran « Mot de passe oublié »
 * répondait « si cette adresse est connue, un message vient de partir » à
 * quelqu'un pour qui rien n'était parti. Un joueur qui perdait son mot de passe
 * était bloqué pour de bon, sans le savoir. Deux réponses, et il fallait les
 * deux : un acheminement qui marche (`sendMail` ci-dessous), et une interface
 * qui dit la vérité quand il n'y en a pas (`courrielDisponible`).
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTransport, type Transporter } from 'nodemailer'
import type { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export interface Mail {
  to: string
  subject: string
  /** Corps en texte brut. On n'envoie pas de HTML : rien ici ne le justifie. */
  body: string
}

/** Un message tel que la boîte de développement le restitue. */
export interface CapturedMail extends Mail {
  id: string
  sentAt: string
}

/**
 * Où la boîte de développement dépose les messages.
 *
 * Sur le disque plutôt qu'en mémoire : le serveur de développement recharge
 * les modules à chaque modification, ce qui viderait une boîte en mémoire au
 * moment précis où l'on vient de provoquer un envoi.
 */
const MAILBOX = join(process.cwd(), 'data', 'courriels')

/** Le développement capture ; la production tente d'envoyer. */
function capturing(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Nom de fichier trié dans l'ordre d'arrivée.
 *
 * L'horodatage en tête suffit à l'ordre ; le suffixe évite qu'envoyer deux
 * messages dans la même milliseconde n'en écrase un.
 */
function filename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${stamp}_${suffix}.json`
}

/**
 * L'expéditeur.
 *
 * Le domaine doit être celui que les enregistrements SPF et DKIM couvrent,
 * sans quoi le message part et se fait refuser : une adresse d'expéditeur qui
 * ne correspond pas à la clé qui l'a signée est le premier motif de rejet.
 */
function expediteur(): string {
  return process.env.MAIL_FROM ?? 'Le Coup Parfait <ne-pas-repondre@localhost>'
}

/**
 * Le transporteur, fabriqué une fois.
 *
 * `nodemailer` tient une réserve de connexions : en refabriquer un à chaque
 * message rouvrirait une connexion SMTP par courriel, ce qu'un serveur de
 * messagerie interprète volontiers comme un comportement d'expéditeur en vrac.
 */
let transporteur: Transporter | null = null

function obtenirTransporteur(): Transporter | null {
  const url = process.env.SMTP_URL
  if (!url) return null
  if (transporteur) return transporteur

  let cible: URL
  try {
    cible = new URL(url)
  } catch {
    console.error(`[courriel] SMTP_URL illisible : « ${url} ». Attendu : smtp://hote:25`)
    return null
  }

  // On compose les options plutôt que de passer l'URL telle quelle : la forme
  // « createTransport(url, options) » n'existe plus depuis nodemailer 7, et
  // détailler les champs rend surtout explicite le point sensible ci-dessous.
  const chiffre = cible.protocol === 'smtps:'
  transporteur = createTransport({
    host: cible.hostname,
    port: Number(cible.port) || (chiffre ? 465 : 25),
    secure: chiffre,
    auth: cible.username
      ? {
          user: decodeURIComponent(cible.username),
          pass: decodeURIComponent(cible.password),
        }
      : undefined,
    pool: true,
    maxConnections: 2,
    // Un relais de la pile — ou du même hôte — présente couramment un
    // certificat auto-signé, voire aucun. Refuser la connexion pour cette
    // raison n'apporterait rien : le trafic ne quitte pas la machine, et c'est
    // le relais qui chiffre ensuite vers l'extérieur, là où ça compte.
    // `SMTP_TLS_STRICT=1` rétablit la vérification pour un relais distant.
    tls: { rejectUnauthorized: process.env.SMTP_TLS_STRICT === '1' },
  })
  return transporteur
}

/**
 * Y a-t-il un acheminement ?
 *
 * Lu par l'interface pour ne pas promettre un message qui ne partira pas. En
 * développement la réponse est toujours oui : la boîte sur disque *est* un
 * acheminement, et c'est même celui qui permet d'éprouver le parcours.
 */
export function courrielDisponible(): boolean {
  return capturing() || Boolean(process.env.SMTP_URL)
}

export async function sendMail(mail: Mail): Promise<void> {
  if (capturing()) {
    try {
      await mkdir(MAILBOX, { recursive: true })
      const captured: CapturedMail = { ...mail, id: filename(), sentAt: new Date().toISOString() }
      await writeFile(join(MAILBOX, captured.id), JSON.stringify(captured, null, 2), 'utf8')
    } catch (error) {
      // Un courriel qu'on n'a pas pu écrire ne doit pas faire échouer
      // l'inscription qui l'a déclenché.
      console.error('[courriel] capture impossible :', error)
    }
    return
  }

  const client = obtenirTransporteur()
  if (!client) {
    console.warn(
      `[courriel] SMTP_URL absente : message non envoyé à ${mail.to} — « ${mail.subject} ». ` +
        'L’interface masque la récupération de mot de passe tant que c’est le cas.',
    )
    return
  }

  try {
    await client.sendMail({
      from: expediteur(),
      to: mail.to,
      subject: mail.subject,
      // Texte brut uniquement : un message sans partie HTML traverse mieux les
      // filtres qu'un message qui en a une, et il n'y a rien à mettre en forme.
      text: mail.body,
    })
  } catch (error) {
    // On journalise et l'on rend la main. L'appelant a déjà décidé de répondre
    // la même chose dans tous les cas — c'est ce qui empêche d'utiliser le
    // formulaire pour savoir qui a un compte — et lever ici trahirait
    // justement l'information qu'on protège.
    console.error(`[courriel] envoi impossible à ${mail.to} :`, error)
  }
}

/** Les messages capturés, du plus récent au plus ancien. */
export async function readMailbox(): Promise<CapturedMail[]> {
  try {
    const files = await readdir(MAILBOX)
    const mails = await Promise.all(
      files
        .filter((name) => name.endsWith('.json'))
        .map(
          async (name) => JSON.parse(await readFile(join(MAILBOX, name), 'utf8')) as CapturedMail,
        ),
    )
    return mails.sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  } catch {
    // Boîte jamais créée : elle est simplement vide.
    return []
  }
}

export async function clearMailbox(): Promise<void> {
  await rm(MAILBOX, { recursive: true, force: true })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Messages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bienvenue, et confirmation de l'adresse.
 *
 * Les deux dans le même message : recevoir deux courriels pour une seule
 * inscription agace, et le lien de confirmation est la seule chose qui
 * demande une action.
 *
 * Le texte dit à quoi sert l'adresse — retrouver un mot de passe perdu, rien
 * d'autre — et ce qui arrive si l'on ignore le lien : le compte fonctionne,
 * mais l'adresse ne servira à rien.
 *
 * **Dans la langue de celui qui s'inscrit.** Les deux messages étaient écrits en
 * français et partaient tels quels à quelqu'un qui venait de choisir le japonais
 * deux écrans plus tôt — alors que l'un des deux est le seul moyen de récupérer
 * un compte perdu. `t` vient du témoin de langue porté par la requête : voir
 * `lib/i18n/serveur.ts`.
 *
 * Les retours à la ligne du corps ne sont plus posés à la main. Une phrase
 * coupée en trois à la soixante-dixième colonne n'est pas traduisible — aucune
 * autre langue ne se coupe aux mêmes endroits —, et les clients de messagerie
 * replient très bien tout seuls.
 */
export function verificationMail(
  username: string,
  appUrl: string,
  token: string,
  t: ReturnType<typeof tDeLaRequete>,
): Mail {
  const lien = `${appUrl.replace(/\/$/, '')}/verifier?jeton=${encodeURIComponent(token)}`
  return {
    to: '',
    subject: t('mail.verifySubject', { pseudo: username }),
    body: [
      t('mail.hello', { pseudo: username }),
      '',
      t('mail.verifyCreated'),
      '',
      t('mail.verifyOpenLink'),
      lien,
      '',
      t('mail.verifyValidity'),
      '',
      t('mail.verifyNoTracking'),
      '',
      t('mail.verifyNotYou'),
      '',
      t('mail.signature'),
    ].join('\n'),
  }
}

/**
 * Réinitialisation du mot de passe.
 *
 * Le message dit la durée de validité, et surtout quoi faire si l'on n'a rien
 * demandé : ne rien faire. C'est la seule consigne utile, puisque tant que le
 * lien n'est pas ouvert, rien n'a changé — et le dire évite l'inquiétude que
 * provoque un courriel de ce genre reçu sans raison.
 */
export function resetMail(
  username: string,
  appUrl: string,
  token: string,
  t: ReturnType<typeof tDeLaRequete>,
): Mail {
  const lien = `${appUrl.replace(/\/$/, '')}/reinitialiser?jeton=${encodeURIComponent(token)}`
  return {
    to: '',
    subject: t('mail.resetSubject'),
    body: [
      t('mail.hello', { pseudo: username }),
      '',
      t('mail.resetAsked'),
      lien,
      '',
      t('mail.resetValidity'),
      '',
      t('mail.resetNotYou'),
      '',
      t('mail.signature'),
    ].join('\n'),
  }
}
