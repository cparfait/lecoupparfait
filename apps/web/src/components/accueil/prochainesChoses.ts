/**
 * « Qu'est-ce que je fais maintenant ? »
 *
 * C'est la seule question que pose quelqu'un qui ouvre l'application en étant
 * déjà inscrit, et l'accueil n'y répondait pas : il posait côte à côte un gros
 * bouton « Commencer la leçon », un « Jouer → » dans le défi du jour et cinq
 * liens « Aller jouer ». Trois appels à l'action de même poids, donc aucun — le
 * regard n'a nulle part où se poser, et l'écran se lit comme un sommaire.
 *
 * Ce fichier calcule la réponse, et il la calcule **par ordre d'urgence**, pas
 * par ordre de catalogue :
 *
 *  1. **Quelqu'un attend.** Une partie où c'est ton tour, une correspondance :
 *     ce sont les seules obligations envers une autre personne, et une pendule
 *     tourne parfois. Rien ne passe devant.
 *  2. **Une partie est ouverte.** Elle t'attend, elle, sans impatience — mais
 *     la reprendre coûte un clic et l'oublier coûte une partie.
 *  3. **La journée** : le défi du jour tant qu'il n'est pas résolu, sinon la
 *     première quête qui reste. C'est la seule chose de l'écran qui ait une
 *     échéance — tout meurt à minuit, et les points de la journée ne se
 *     rattrapent pas. La carrière passait avant les quêtes dès le défi résolu,
 *     et l'accueil se mettait à parler de chapitre alors qu'il restait deux
 *     quêtes à faire.
 *
 *     **Une seule proposition pour la journée**, jamais deux. Le défi et la
 *     première quête faisaient chacun leur ligne : « Le défi du jour » en
 *     grand, puis « Une quête du jour · Jouer une partie » juste dessous, et
 *     la carte des quêtes, à côté, redisait les deux. Le défi *est* une quête
 *     — la mieux payée, et la seule partagée — ; il passe en premier, et les
 *     autres attendent leur tour dans la carte des quêtes.
 *  4. **L'étape de carrière en cours**, qui est le chemin qu'on a choisi — et
 *     qui sera encore là demain.
 *  5. **Faute de mieux**, jouer — c'est ce pour quoi on vient.
 *
 * La fonction rend une **liste ordonnée** et non un seul élément : l'accueil
 * met la première en avant et range les suivantes en dessous, en une ligne
 * chacune. C'est ce qui permet d'avoir une action principale sans rien cacher.
 *
 * Rien ici ne touche à React ni au réseau : on passe un état, on reçoit des
 * propositions. C'est ce qui rend l'ordre relisible — et discutable — sans
 * ouvrir un composant de cinq cents lignes.
 */

import { quetePar } from '@/lib/daily/quetes.ts'

export type ProchaineChoseId =
  | 'tonTour'
  | 'correspondance'
  | 'partieOuverte'
  | 'repriseOrdinateur'
  | 'defi'
  | 'quete'
  | 'carriere'
  | 'jouer'

export interface ProchaineChose {
  id: ProchaineChoseId
  /** Ce que c'est, en deux mots, au-dessus du titre. */
  categorie: string
  /** La phrase qu'on lit. Elle nomme la chose, pas la fonctionnalité. */
  titre: string
  /** Une ligne de contexte : pourquoi c'est là, ou ce qui s'est passé. */
  detail: string
  /** Ce qu'on écrit sur le bouton. Un verbe, toujours. */
  action: string
  lien: string
  /**
   * Quelqu'un attend-il vraiment à l'autre bout ?
   *
   * Sert à teinter la proposition : une personne qui patiente n'a pas le même
   * poids qu'un exercice qui, lui, sera encore là demain.
   */
  urgent?: boolean
}

export interface EtatAccueil {
  /** Parties contre quelqu'un, restées ouvertes. */
  enDirect: Array<{
    slug: string
    opponent: string | null
    opponentConnected: boolean
    yourTurn: boolean
    moves: number
    timeControl: { initial: number; increment: number }
    rated: boolean
  }>
  /** Nombre de correspondances où c'est à toi de jouer. */
  correspondances: number
  /** Partie contre l'ordinateur laissée en plan. */
  reprise: { moves: number } | null
  /** Le défi du jour est-il résolu ? `null` tant qu'on ne sait pas. */
  defiFait: boolean | null
  /**
   * Les quêtes du jour encore à faire, hors défi, dans l'ordre de la liste.
   * Avec les points déjà gagnés et le total, pour dire où l'on en est.
   */
  quetes: {
    restantes: Array<{ label: string; lien: string; action: string }>
    xp: number
    total: number
  }
  /** Chapitre courant et prochaine étape, quand la carrière est en cours. */
  carriere: { chapitre: string; numero: number; libelle: string; lien: string } | null
}

/** L'adresse d'une partie en direct, cadence comprise — sans elle, les pendules mentent. */
function lienPartie(partie: EtatAccueil['enDirect'][number]): string {
  const tc = `${partie.timeControl.initial}+${partie.timeControl.increment}`
  return `/jouer/partie/${partie.slug}?tc=${tc}${partie.rated ? '&classee=1' : ''}`
}

export function prochainesChoses(etat: EtatAccueil): ProchaineChose[] {
  const liste: ProchaineChose[] = []

  // ── 1. Quelqu'un attend ────────────────────────────────────────────────
  for (const partie of etat.enDirect) {
    if (!partie.yourTurn || !partie.opponent) continue
    liste.push({
      id: 'tonTour',
      categorie: 'Quelqu’un t’attend',
      titre: `C’est à toi de jouer contre ${partie.opponent}`,
      detail: partie.opponentConnected
        ? 'Il est en ligne, devant l’échiquier.'
        : 'Il s’est déconnecté, mais la partie tient toujours.',
      action: 'Jouer mon coup',
      lien: lienPartie(partie),
      urgent: true,
    })
  }

  if (etat.correspondances > 0) {
    liste.push({
      id: 'correspondance',
      categorie: 'Correspondance',
      titre:
        etat.correspondances > 1
          ? `${etat.correspondances} parties attendent ton coup`
          : 'Une partie attend ton coup',
      detail: 'En correspondance, on joue quand on veut — mais on joue.',
      action: 'Y aller',
      lien: '/correspondance',
      urgent: true,
    })
  }

  // ── 2. Une partie ouverte, où l'on n'est pas attendu dans l'instant ────
  for (const partie of etat.enDirect) {
    if (partie.yourTurn && partie.opponent) continue
    liste.push({
      id: 'partieOuverte',
      categorie: 'Partie en cours',
      titre: partie.opponent
        ? `Ta partie contre ${partie.opponent} continue`
        : 'Ta partie attend un adversaire',
      detail: partie.opponent
        ? 'Il réfléchit. Ta place reste gardée.'
        : 'Personne n’a encore ouvert ton lien.',
      action: 'Revenir à l’échiquier',
      lien: lienPartie(partie),
    })
  }

  if (etat.reprise) {
    const n = etat.reprise.moves
    liste.push({
      id: 'repriseOrdinateur',
      categorie: 'Partie en plan',
      titre: 'Ta partie contre l’ordinateur est restée ouverte',
      detail: `${n} demi-coup${n > 1 ? 's joués' : ' joué'}. Elle t’attend telle quelle.`,
      action: 'Reprendre',
      lien: '/jouer/ordinateur',
    })
  }

  // ── 3. La journée : le défi, sinon la première quête qui reste ─────────
  //
  // La rubrique nomme la chose, et non le moment. Elle disait « Aujourd'hui »,
  // c'est-à-dire exactement le mot que portait la carte des quêtes juste en
  // dessous. Ici c'est **le** défi, au singulier, et le détail dit ce qu'il
  // vaut — ses points, qui sont ceux de la carte d'à côté.
  const [prochaine] = etat.quetes.restantes
  if (etat.defiFait === false) {
    // Le détail dit ce que le défi vaut, et ce qui attend derrière lui. Sans
    // cette seconde phrase, la proposition semblait être la seule chose de la
    // journée, alors que la carte des quêtes, juste en dessous, en montre
    // encore deux ou trois.
    const restantes = etat.quetes.restantes.length
    liste.push({
      id: 'defi',
      categorie: 'Le défi du jour',
      titre: 'Une position, et une seule, jusqu’à minuit',
      detail:
        `La même pour tout le monde de ton niveau, et elle vaut ${quetePar('defi')?.xp ?? 0} des ` +
        `${etat.quetes.total} points du jour. ` +
        (restantes > 0
          ? `${restantes} autre${restantes > 1 ? 's' : ''} quête${restantes > 1 ? 's' : ''} ` +
            `${restantes > 1 ? 'attendent' : 'attend'} en dessous.`
          : 'C’est ta dernière quête de la journée.'),
      action: 'Chercher le coup',
      // L'adresse du catalogue, et non `/puzzles?defi=1` : elle porte
      // `&quete=defi`, que l'écran de puzzles lit pour annoncer la quête
      // remplie et proposer la suite. C'était la ligne « Résoudre le défi du
      // jour » de la liste qui le faisait ; elle n'y est plus, et la fanfare
      // serait partie avec elle.
      lien: quetePar('defi')?.lien ?? '/puzzles?defi=1',
    })
  } else if (prochaine) {
    // Une seule, la première qui reste : deux quêtes en deux lignes ferait
    // deux boutons de même poids, ce qu'on a voulu éviter. Les autres sont
    // dans la carte des quêtes, juste en dessous.
    const n = etat.quetes.restantes.length
    liste.push({
      id: 'quete',
      // « Une quête du jour », et non « Aujourd'hui » : la rubrique dit d'où
      // sort cette ligne — de la liste d'à côté, dont on montre ici la
      // première qui reste.
      categorie: 'Une quête du jour',
      titre: prochaine.label,
      detail: `${etat.quetes.xp} / ${etat.quetes.total} points du jour. ${
        n > 1 ? `Encore ${n} quêtes` : 'Dernière quête'
      } avant minuit.`,
      action: prochaine.action,
      lien: prochaine.lien,
    })
  }

  // ── 4. La carrière ─────────────────────────────────────────────────────
  if (etat.carriere) {
    liste.push({
      id: 'carriere',
      categorie: `Carrière · chapitre ${etat.carriere.numero}`,
      titre: etat.carriere.chapitre,
      detail: 'Ton parcours reprend là où tu l’as laissé.',
      action: etat.carriere.libelle,
      lien: etat.carriere.lien,
    })
  }

  // ── 5. Le repli ────────────────────────────────────────────────────────
  //
  // Jamais vide : un accueil qui ne propose rien renvoie la personne à la
  // barre de navigation, c'est-à-dire à un sommaire.
  if (liste.length === 0) {
    liste.push({
      id: 'jouer',
      categorie: 'Rien ne presse',
      titre: 'Tout est à jour',
      detail: 'Le défi est résolu, aucune partie n’attend. Reste le plaisir de jouer.',
      action: 'Jouer une partie',
      lien: '/jouer/ordinateur',
    })
  }

  return liste
}
