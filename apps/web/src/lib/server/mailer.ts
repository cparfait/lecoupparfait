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
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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

  // Point de branchement d'un vrai envoi. Aucune dépendance n'est ajoutée tant
  // qu'aucun serveur n'est configuré : une bibliothèque SMTP embarquée « au
  // cas où » ne servirait qu'à alourdir l'image.
  if (!process.env.SMTP_URL) {
    console.warn(
      `[courriel] SMTP_URL absente : message non envoyé à ${mail.to} — « ${mail.subject} »`,
    )
    return
  }

  console.warn(
    '[courriel] SMTP_URL est renseignée mais aucun acheminement n’est implémenté. ' +
      'Branche ici le client de ton choix.',
  )
}

/** Les messages capturés, du plus récent au plus ancien. */
export async function readMailbox(): Promise<CapturedMail[]> {
  try {
    const files = await readdir(MAILBOX)
    const mails = await Promise.all(
      files
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => JSON.parse(await readFile(join(MAILBOX, name), 'utf8')) as CapturedMail),
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
 */
export function verificationMail(username: string, appUrl: string, token: string): Mail {
  const lien = `${appUrl.replace(/\/$/, '')}/verifier?jeton=${encodeURIComponent(token)}`
  return {
    to: '',
    subject: `Confirme ton adresse, ${username}`,
    body: [
      `Bonjour ${username},`,
      '',
      'Ton compte est créé : tu peux jouer et apprendre dès maintenant.',
      '',
      'Il reste à confirmer ton adresse, en ouvrant ce lien :',
      lien,
      '',
      'Le lien est valable vingt-quatre heures. Sans lui ton compte marche',
      'très bien, mais ton adresse ne pourra pas servir à retrouver ton mot de',
      'passe si tu le perds.',
      '',
      'Aucune lettre d’information, aucun traqueur, aucune donnée revendue.',
      '',
      'Si tu n’es pas à l’origine de cette inscription, ignore ce message.',
      '',
      'Le Coup Parfait — logiciel libre sous licence AGPL-3.0.',
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
export function resetMail(username: string, appUrl: string, token: string): Mail {
  const lien = `${appUrl.replace(/\$/, '')}/reinitialiser?jeton=${encodeURIComponent(token)}`
  return {
    to: '',
    subject: 'Réinitialiser ton mot de passe',
    body: [
      `Bonjour ${username},`,
      '',
      'Quelqu’un a demandé à réinitialiser le mot de passe de ce compte.',
      'Si c’est toi, ouvre ce lien pour en choisir un nouveau :',
      lien,
      '',
      'Le lien est valable une heure, et ne sert qu’une fois.',
      '',
      'Si tu n’as rien demandé, ignore ce message : tant que le lien n’est pas',
      'ouvert, ton mot de passe reste inchangé.',
      '',
      'Le Coup Parfait — logiciel libre sous licence AGPL-3.0.',
    ].join('\n'),
  }
}
