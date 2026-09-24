/**
 * Le texte des notifications poussées, en français et en anglais.
 *
 * Une notification part d'un serveur, à un moment où personne n'est devant la
 * page : il n'y a pas de fournisseur de traduction, pas de témoin de langue,
 * pas de requête dont on lirait l'en-tête. Toutes s'écrivaient donc en
 * français, et quelqu'un qui avait choisi l'anglais à l'inscription recevait
 * « Le défi du jour t'attend » sur l'écran verrouillé de son téléphone.
 *
 * La langue vient désormais du **compte du destinataire** (`preferences.locale`),
 * lue avec les abonnements. Le texte vit ici, et non dans les dictionnaires de
 * l'application web, parce que deux processus envoient des notifications :
 * les routes de Next (défi, ami, coup de correspondance) et le serveur Node
 * (rappel du défi du jour). Le second ne peut pas importer les dictionnaires —
 * son image ne contient que `packages/core`, `packages/db` et `apps/server`.
 *
 * **Deux langues seulement**, comme le contenu rédactionnel (`localeDuContenu`) :
 * ces six phrases s'écrivent, elles ne passent pas par la chaîne de traduction
 * des trente-six langues de l'interface. Toute autre langue reçoit l'anglais,
 * ce qu'elle obtiendrait de toute façon pour une clé non traduite.
 */

/** Ce qu'une notification annonce, avec ce qu'il faut pour l'écrire. */
export type SujetDeNotification =
  | { sujet: 'defi'; auteur: string; minutes: number; increment: number }
  | { sujet: 'amiDemande'; auteur: string }
  | { sujet: 'amiAccepte'; auteur: string }
  | { sujet: 'correspondance'; auteur: string; jours: number }
  | { sujet: 'defiDuJour' }
  | { sujet: 'essai' }

export type LangueDeNotification = 'fr' | 'en'

/**
 * La langue d'écriture pour un code de langue de compte.
 *
 * Un compte sans langue — tous ceux créés avant qu'elle soit demandée à
 * l'inscription — reçoit le français, qui était jusqu'ici la langue de toutes
 * les notifications : rien ne change pour lui.
 */
export function langueDeNotification(locale: string | null | undefined): LangueDeNotification {
  if (!locale) return 'fr'
  return locale === 'fr' ? 'fr' : 'en'
}

/** La cadence telle qu'on la lit : « 5 min », « 3 min + 2 s ». */
function cadence(minutes: number, increment: number): string {
  return `${minutes} min${increment > 0 ? ` + ${increment} s` : ''}`
}

const TEXTES: Record<
  LangueDeNotification,
  {
    [S in SujetDeNotification['sujet']]: (s: Extract<SujetDeNotification, { sujet: S }>) => {
      titre: string
      corps: string
    }
  }
> = {
  fr: {
    defi: (s) => ({
      titre: `${s.auteur} te propose une partie`,
      corps: `${cadence(s.minutes, s.increment)} — l’invitation expire dans cinq minutes.`,
    }),
    amiDemande: (s) => ({
      titre: `${s.auteur} veut t’ajouter`,
      corps: 'Ouvre ton carnet pour accepter ou refuser.',
    }),
    amiAccepte: (s) => ({
      titre: `${s.auteur} et toi êtes amis`,
      corps: 'Ta demande a trouvé la sienne : vous pouvez vous défier.',
    }),
    correspondance: (s) => ({
      titre: `${s.auteur} a joué`,
      corps: `À toi de jouer — tu as ${s.jours} jour${s.jours > 1 ? 's' : ''} pour répondre.`,
    }),
    defiDuJour: () => ({
      titre: 'Le défi du jour t’attend',
      corps: 'Un puzzle, à ton niveau, valable jusqu’à minuit.',
    }),
    essai: () => ({
      titre: 'Le Coup Parfait',
      corps: 'Tout fonctionne : c’est ici que tes invitations arriveront.',
    }),
  },
  en: {
    defi: (s) => ({
      titre: `${s.auteur} wants to play`,
      corps: `${cadence(s.minutes, s.increment)} — the invitation expires in five minutes.`,
    }),
    amiDemande: (s) => ({
      titre: `${s.auteur} wants to add you`,
      corps: 'Open your friends list to accept or decline.',
    }),
    amiAccepte: (s) => ({
      titre: `You and ${s.auteur} are friends`,
      corps: 'Your requests crossed: you can now challenge each other.',
    }),
    correspondance: (s) => ({
      titre: `${s.auteur} has moved`,
      corps: `Your move — you have ${s.jours} day${s.jours > 1 ? 's' : ''} to reply.`,
    }),
    defiDuJour: () => ({
      titre: 'Your daily challenge is waiting',
      corps: 'One puzzle, at your level, until midnight.',
    }),
    essai: () => ({
      titre: 'Le Coup Parfait',
      corps: 'It works: this is where your invitations will arrive.',
    }),
  },
}

/** Le titre et le corps d'une notification, dans la langue du destinataire. */
export function texteDeNotification(
  sujet: SujetDeNotification,
  locale: string | null | undefined,
): { titre: string; corps: string } {
  const ecrire = TEXTES[langueDeNotification(locale)][sujet.sujet] as (s: SujetDeNotification) => {
    titre: string
    corps: string
  }
  return ecrire(sujet)
}
