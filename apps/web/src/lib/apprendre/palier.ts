/**
 * Les paliers, et ce qui fait passer au suivant.
 *
 * Le programme est rangé par chapitres — les règles, les mats, la tactique,
 * l'ouverture —, et c'est l'ordre dans lequel on *apprend*. Ce n'est pas
 * l'ordre dans lequel on *cherche* : personne n'ouvre une application d'échecs
 * en se demandant « que me reste-t-il à voir au chapitre 5 ? ». La question
 * qu'on se pose est « je suis à 900, qu'est-ce qui me coûte des points ? ».
 *
 * Ce fichier répond à celle-là. Six paliers, et pour chacun quatre ou cinq
 * **leviers** : une chose à travailler, la raison pour laquelle elle coûte cher
 * à ce niveau-là précisément, et l'écran qui la travaille. Rien de neuf côté
 * contenu — les leçons, les thèmes de puzzles et les finales existent déjà ;
 * ce qui manquait, c'était l'ordre de priorité.
 *
 * ── Deux échelles, et on dit laquelle ────────────────────────────────────────
 *
 * Le classement de puzzles et celui des parties ne mesurent pas la même chose
 * et ne coïncident pas : on résout couramment des positions à 1 800 en jouant
 * ses parties à 1 200, parce qu'un puzzle annonce qu'il y a quelque chose à
 * trouver et qu'une partie ne l'annonce jamais. Les moyenner donnerait un
 * nombre qui ne veut rien dire.
 *
 * On choisit donc une source, et on l'affiche. Par ordre de préférence :
 * le classement en partie quand il y en a un — c'est lui qui mesure le jeu —,
 * sinon le classement de puzzles ramené à l'échelle des parties, sinon le test
 * de placement, sinon rien du tout, et dans ce dernier cas la page propose le
 * test au lieu de deviner.
 */

import type { MotifId } from '@coupparfait/core'

// ─────────────────────────────────────────────────────────────────────────────
//  Leviers
// ─────────────────────────────────────────────────────────────────────────────

/** Où mène un levier. Trois natures, trois écrans. */
export type CibleLevier =
  /** Une leçon guidée, par son identifiant dans `lib/lessons`. */
  | { type: 'lecon'; id: string }
  /** Un thème de puzzles, par son identifiant Lichess. */
  | { type: 'puzzle'; theme: MotifId | 'all' }
  /** N'importe quelle autre page de l'application. */
  | { type: 'page'; href: string; label: string }

export interface Levier {
  /** Ce qu'il y a à savoir faire, formulé comme une compétence. */
  titre: string
  /**
   * Pourquoi ça coûte des points **à ce palier-là**.
   *
   * C'est la seule partie qui ne se déduit d'aucune donnée, et c'est celle qui
   * décide si l'on clique : « travaille les fourchettes » ne convainc personne,
   * « à 900, une fourchette de cavalier décide une partie sur trois » si.
   */
  pourquoi: string
  cible: CibleLevier
}

export interface Palier {
  id: string
  /** Borne basse, incluse. */
  min: number
  /** Borne haute, incluse. `Infinity` pour le dernier. */
  max: number
  /** Le nom du palier, court, qui dit l'objectif et non le niveau. */
  nom: string
  /** Une phrase : ce qu'on sait déjà faire, et ce qui bloque maintenant. */
  promesse: string
  /** Niveau d'ordinateur à peu près équivalent, pour les séances. */
  niveauBot: number
  leviers: Levier[]
}

/**
 * Les six paliers.
 *
 * Les bornes viennent de ce qu'on observe dans les parties, pas d'une règle :
 * sous 650 on perd des pièces sans que l'adversaire ait rien fait pour, vers
 * 1 000 on ne les donne plus mais on ne voit pas ce que l'autre prépare, vers
 * 1 300 on voit les coups mais on ne sait pas quoi faire quand il n'y a rien à
 * prendre, et ainsi de suite. Chaque palier nomme ce qui *vient d'être acquis*
 * avant de dire ce qui manque : on ne progresse pas en se faisant énumérer ses
 * lacunes.
 */
export const PALIERS: Palier[] = [
  {
    id: 'regles',
    min: 0,
    max: 649,
    nom: 'Tenir une partie de bout en bout',
    promesse:
      'Tu connais les déplacements. Ce qui te fait perdre n’est pas encore la stratégie : c’est une règle oubliée, ou une partie gagnée qu’on ne sait pas finir.',
    niveauBot: 2,
    leviers: [
      {
        titre: 'Les trois règles qu’on oublie',
        pourquoi:
          'Le roque, la prise en passant et la promotion décident plus de parties à ce niveau que tout le reste. Une prise en passant qu’on croit illégale, c’est un pion perdu et la conviction que l’adversaire a triché.',
        cible: { type: 'lecon', id: 'regles-speciales' },
      },
      {
        titre: 'Mater avec roi et tour',
        pourquoi:
          'C’est la finale qu’on atteint le plus souvent sans savoir la gagner. Une dame de plus et une nulle par cinquante coups : ça arrive, et c’est évitable en dix minutes.',
        cible: { type: 'lecon', id: 'mat-tour-roi' },
      },
      {
        titre: 'Mater avec la dame sans faire pat',
        pourquoi:
          'Le pat est la déception classique de celui qui a une dame de plus. On l’évite avec une seule méthode, toujours la même.',
        cible: { type: 'lecon', id: 'mat-dame-roi' },
      },
      {
        titre: 'Combien vaut chaque pièce',
        pourquoi:
          'Échanger une tour contre un cavalier parce que « ça fait un échange » coûte deux pions. Le barème ne se devine pas, il s’apprend une fois.',
        cible: { type: 'lecon', id: 'valeurs' },
      },
      {
        titre: 'Reconnaître un mat en un',
        pourquoi:
          'Avant de chercher un plan, il faut voir le mat quand il est là. C’est aussi le plus rapide à muscler : cinquante positions et l’œil le fait tout seul.',
        cible: { type: 'puzzle', theme: 'mateIn1' },
      },
    ],
  },
  {
    id: 'pieces-en-prise',
    min: 650,
    max: 999,
    nom: 'Ne plus donner de pièces',
    promesse:
      'Tu tiens une partie et tu sais mater. Ce qui te coûte le plus de points maintenant n’a rien de subtil : une pièce laissée sur une case attaquée, et la partie change de camp.',
    niveauBot: 5,
    leviers: [
      {
        titre: 'Voir ce qui est en prise',
        pourquoi:
          'À ce palier, la majorité des parties se décide sur une pièce laissée sans défense — pas sur une combinaison. C’est le seul réflexe qui rapporte plusieurs centaines de points.',
        cible: { type: 'puzzle', theme: 'hangingPiece' },
      },
      {
        titre: 'La fourchette de cavalier',
        pourquoi:
          'Le cavalier est la pièce dont les débutants voient le moins les coups, et celle qui punit le plus. Une fourchette décide une partie sur trois à ce niveau.',
        cible: { type: 'lecon', id: 'fourchette' },
      },
      {
        titre: 'Les quatre mats qu’on subit',
        pourquoi:
          'Le berger, l’imbécile, Légal, le Shilling : on les prend tous dans ses dix premières parties, et on ne sait pas ce qui s’est passé. Les connaître, c’est les parer sans y penser.',
        cible: {
          type: 'page',
          href: '/apprendre#mats-ouverture',
          label: 'Les mats de l’ouverture',
        },
      },
      {
        titre: 'Le mat du couloir',
        pourquoi:
          'Trois pions devant le roi qui a roqué, et une tour qui arrive sur la dernière rangée. C’est le motif de mat le plus fréquent de toutes les échelles de niveau.',
        cible: { type: 'lecon', id: 'mat-couloir' },
      },
      {
        titre: 'Les trois principes de l’ouverture',
        pourquoi:
          'Pas de théorie à mémoriser : un pion au centre, les pièces dehors, le roi à l’abri. Trois idées suffisent à ne plus jamais être perdu au coup dix.',
        cible: { type: 'lecon', id: 'principes-ouverture' },
      },
    ],
  },
  {
    id: 'voir-ladversaire',
    min: 1000,
    max: 1299,
    nom: 'Voir ce que l’adversaire prépare',
    promesse:
      'Tu ne donnes plus de pièces sans raison. Ce qui bloque maintenant, c’est que tu regardes tes coups et pas les siens : les tactiques qui te coûtent cher sont celles que tu n’as pas vu venir.',
    niveauBot: 7,
    leviers: [
      {
        titre: 'Le clouage',
        pourquoi:
          'Une pièce devant le roi ne peut plus bouger, et tout le monde peut l’attaquer. C’est le motif que les joueurs à 1 000 subissent le plus souvent sans le nommer.',
        cible: { type: 'lecon', id: 'clouage' },
      },
      {
        titre: 'L’attaque à la découverte',
        pourquoi:
          'Un coup qui ouvre la ligne d’une autre pièce : deux menaces pour un coup. Impossible à parer si on ne l’a jamais vue.',
        cible: { type: 'lecon', id: 'decouverte' },
      },
      {
        titre: 'Le mémo avant chaque coup',
        pourquoi:
          'Quatre questions, dix secondes : qu’est-ce qu’il vient de changer, qu’attaque-t-il, qu’est-ce que je laisse en prise, mon coup tient-il. C’est la différence mesurable entre un 1 000 et un 1 300.',
        cible: { type: 'page', href: '/apprendre/principes', label: 'Les principes et le mémo' },
      },
      {
        titre: 'Le mat en deux',
        pourquoi:
          'Deux coups à voir d’avance, en forçant. C’est l’exercice qui apprend à calculer, et il se transfère directement aux positions où il n’y a pas de mat.',
        cible: { type: 'puzzle', theme: 'mateIn2' },
      },
      {
        titre: 'Les quatre erreurs classiques de l’ouverture',
        pourquoi:
          'Sortir la dame trop tôt, bouger deux fois la même pièce, pousser les pions de l’aile, oublier de roquer. Quatre habitudes, et chacune coûte un tempo par partie.',
        cible: { type: 'lecon', id: 'erreurs-ouverture' },
      },
    ],
  },
  {
    id: 'un-plan',
    min: 1300,
    max: 1599,
    nom: 'Jouer avec un plan',
    promesse:
      'Tu vois les tactiques des deux côtés. Le problème est ailleurs : quand il n’y a rien à prendre, tu ne sais pas quoi faire, et tu attends que l’autre se trompe.',
    niveauBot: 9,
    leviers: [
      {
        titre: 'Les colonnes ouvertes',
        pourquoi:
          'La première question d’un milieu de partie calme : où mettre mes tours ? La réponse est presque toujours la même, et elle se voit sur la structure de pions.',
        cible: { type: 'lecon', id: 'colonnes-ouvertes' },
      },
      {
        titre: 'L’avant-poste',
        pourquoi:
          'Un cavalier sur une case qu’aucun pion ne peut attaquer vaut plus qu’une tour mal placée. C’est le premier concept positionnel qui change vraiment les parties.',
        cible: { type: 'lecon', id: 'avant-poste' },
      },
      {
        titre: 'Les enjeux de ton ouverture',
        pourquoi:
          'À ce palier, connaître dix coups de théorie ne sert à rien si on ne sait pas ce qu’on cherche au coup onze. Le plan tient en trois phrases par ouverture.',
        cible: { type: 'page', href: '/ouvertures/enjeux', label: 'Les enjeux des ouvertures' },
      },
      {
        titre: 'Éliminer le défenseur',
        pourquoi:
          'La tactique qui sert un plan plutôt que de tomber du ciel : on retire la pièce qui tient tout, et la position s’effondre d’elle-même.',
        cible: { type: 'lecon', id: 'elimination-defenseur' },
      },
      {
        titre: 'La sécurité du roi des deux côtés',
        pourquoi:
          'Savoir quand attaquer le roi adverse — et quand c’est le sien qui est en danger. Les attaques prématurées coûtent plus cher que les attaques manquées.',
        cible: { type: 'lecon', id: 'securite-roi' },
      },
    ],
  },
  {
    id: 'technique',
    min: 1600,
    max: 1899,
    nom: 'Convertir et tenir',
    promesse:
      'Tu joues avec des plans et tu ne te fais plus surprendre. Ce qui te manque est de la technique : les positions gagnantes qui finissent nulles, et les finales qu’on joue à l’instinct.',
    niveauBot: 12,
    leviers: [
      {
        titre: 'L’opposition',
        pourquoi:
          'La notion sans laquelle aucune finale de pions ne se gagne ni ne se tient. Elle s’apprend en une leçon et sert toute une vie.',
        cible: { type: 'lecon', id: 'opposition' },
      },
      {
        titre: 'La règle du carré',
        pourquoi:
          'Savoir d’un regard si le roi rattrape le pion. Elle remplace un calcul de six coups par un coup d’œil, et elle ne se trompe jamais.',
        cible: { type: 'lecon', id: 'regle-du-carre' },
      },
      {
        titre: 'Les finales, objectif annoncé',
        pourquoi:
          'Trois mille cinq cent soixante-huit positions classées, avec l’objectif donné — gagner ou tenir la nulle — et un ordinateur qui défend au mieux. C’est l’entraînement le plus rentable de ce palier.',
        cible: { type: 'page', href: '/finales', label: 'Les finales' },
      },
      {
        titre: 'Le sacrifice qui se calcule',
        pourquoi:
          'À 1 600, on rate moins les sacrifices qu’on n’en joue de mauvais. L’exercice apprend à vérifier avant de donner.',
        cible: { type: 'lecon', id: 'sacrifice' },
      },
      {
        titre: 'Le roi devient une pièce',
        pourquoi:
          'En finale, le roi attaque. Les joueurs qui stagnent à ce palier le gardent au chaud par réflexe, et perdent une pièce de tempo à chaque coup.',
        cible: { type: 'lecon', id: 'roi-actif' },
      },
    ],
  },
  {
    id: 'prophylaxie',
    min: 1900,
    max: Number.POSITIVE_INFINITY,
    nom: 'Empêcher avant de faire',
    promesse:
      'Tu as la technique et les plans. Ce qui sépare encore de 2 200, c’est de jouer contre les idées de l’autre plutôt que pour les siennes — et de ne plus perdre une seule partie gagnée.',
    niveauBot: 14,
    leviers: [
      {
        titre: 'Les enfilades et les rayons X',
        pourquoi:
          'Les motifs qui restent coûteux à haut niveau, parce qu’ils agissent à travers les pièces et qu’on les vérifie mal sous pression de pendule.',
        cible: { type: 'lecon', id: 'enfilade' },
      },
      {
        titre: 'Le zugzwang',
        pourquoi:
          'Le seul mécanisme de gain de beaucoup de finales : l’adversaire est obligé de jouer, et tout coup le dégrade. Il se prépare, il ne se trouve pas.',
        cible: { type: 'puzzle', theme: 'zugzwang' },
      },
      {
        titre: 'Relire ses propres parties',
        pourquoi:
          'À ce palier, les leçons génériques n’apportent plus grand-chose : ce qui reste à corriger est personnel, et il n’y a qu’un endroit où le lire — ses parties.',
        cible: { type: 'page', href: '/analyse', label: 'Analyser une partie' },
      },
      {
        titre: 'Les positions où tout est défendu',
        pourquoi:
          'Le sacrifice positionnel et l’attaque à long terme : ce qui reste quand il n’y a aucune tactique. C’est là que se gagnent les points au-dessus de 1 900.',
        cible: { type: 'lecon', id: 'sacrifice' },
      },
    ],
  },
]

/** Le palier d'un niveau donné. Jamais `null` : les bornes couvrent tout. */
export function palierPour(elo: number): Palier {
  return (
    PALIERS.find((palier) => elo >= palier.min && elo <= palier.max) ?? PALIERS[PALIERS.length - 1]!
  )
}

/** Le palier suivant, ou `null` quand on est au dernier. */
export function palierSuivant(palier: Palier): Palier | null {
  const index = PALIERS.findIndex((entree) => entree.id === palier.id)
  return index >= 0 ? (PALIERS[index + 1] ?? null) : null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le niveau estimé, conservé dans le navigateur
// ─────────────────────────────────────────────────────────────────────────────

const CLE_NIVEAU = 'coupparfait.niveauEstime'

/** D'où vient le nombre qu'on affiche. On ne l'écrit jamais sans le dire. */
export type SourceNiveau = 'test' | 'partie' | 'puzzle'

export interface NiveauEstime {
  elo: number
  source: SourceNiveau
  /** Date de la mesure, en ISO court — `2026-09-12`. */
  le: string
  /** Nombre de positions du test, quand la source est le test. */
  positions?: number
}

/**
 * Le dernier niveau estimé par le test, s'il y en a un.
 *
 * Dans le navigateur et non en base, et c'est volontaire : le test de placement
 * doit fonctionner sans compte, parce que c'est exactement le moment où l'on
 * n'en a pas encore. Quand on est connecté, le classement du compte prend de
 * toute façon le dessus — voir `niveauRetenu`.
 */
export function lireNiveauEstime(): NiveauEstime | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(CLE_NIVEAU)
    if (!brut) return null
    const valeur = JSON.parse(brut) as NiveauEstime
    return Number.isFinite(valeur?.elo) ? valeur : null
  } catch {
    return null
  }
}

export function enregistrerNiveauEstime(valeur: NiveauEstime): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLE_NIVEAU, JSON.stringify(valeur))
  } catch {
    // Stockage refusé : le résultat s'affiche quand même, il ne sera pas
    // retrouvé à la visite suivante. Rien à réparer côté appelant.
  }
}

/**
 * Le classement de puzzles, ramené à l'échelle des parties.
 *
 * Les deux échelles ne coïncident pas : un joueur qui résout à 1 800 joue ses
 * parties autour de 1 300. L'écart n'est pas une anomalie — un puzzle annonce
 * qu'il y a quelque chose à trouver, une partie ne l'annonce jamais — mais il
 * est assez régulier pour être corrigé plutôt qu'ignoré.
 *
 * La correction est affine et grossière, calée sur deux points d'ancrage
 * couramment observés : 1 000 en puzzles ≈ 800 en parties, 2 000 en puzzles
 * ≈ 1 500. On ne prétend pas mieux, et c'est pour cela que la page dit
 * toujours d'où vient le nombre.
 */
export function puzzleVersPartie(cote: number): number {
  return Math.round(300 + 0.6 * cote)
}

/**
 * Le niveau qu'on retient, et pourquoi celui-là.
 *
 * L'ordre n'est pas négociable : une mesure faite sur de vraies parties vaut
 * mieux qu'une mesure faite sur des puzzles, qui vaut mieux qu'un test de
 * douze positions. On rend donc la meilleure disponible, et sa source, pour
 * que l'affichage puisse la nommer.
 */
export function niveauRetenu(sources: {
  /** Classement en partie le plus représentatif — le plus joué, pas le plus haut. */
  partie?: number | null
  /** Classement de puzzles, à l'échelle des puzzles. */
  puzzle?: number | null
  test?: NiveauEstime | null
}): NiveauEstime | null {
  if (sources.partie != null) {
    return { elo: sources.partie, source: 'partie', le: aujourdhui() }
  }
  if (sources.puzzle != null) {
    return { elo: puzzleVersPartie(sources.puzzle), source: 'puzzle', le: aujourdhui() }
  }
  return sources.test ?? null
}

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Comment on nomme la source à l'écran. */
export const LIBELLE_SOURCE: Record<SourceNiveau, string> = {
  partie: 'd’après ton classement en partie',
  puzzle: 'estimé d’après ton classement de puzzles',
  test: 'd’après ton test de niveau',
}
