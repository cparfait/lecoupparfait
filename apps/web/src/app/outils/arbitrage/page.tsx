/**
 * L'aide-mémoire d'arbitrage.
 *
 * Les situations qui reviennent en tournoi de club et où l'on se dispute
 * parce que personne n'a la règle sous la main : la pièce touchée, le coup
 * illégal, le drapeau, la nulle qu'on réclame, le téléphone qui sonne. Une
 * page, huit cartes, et pour chacune ce que dit le règlement — pas ce qu'on
 * croit se rappeler.
 *
 * ── Ce que cette page n'est pas ────────────────────────────────────────────
 *
 * Ce n'est pas le règlement : c'est un résumé des Règles du jeu d'échecs de
 * la FIDE, dans leur édition de 2023, réduit aux points qu'un arbitre de club
 * a besoin de trancher vite. Le règlement du tournoi peut préciser plusieurs
 * de ces points (tolérance de retard, sanction du téléphone) et il prime. Les
 * numéros d'article sont donnés pour aller vérifier, pas pour faire savant.
 *
 * Trois cadences, pas toujours la même règle : quand la règle change entre
 * lente, rapide et blitz, la puce le dit. Sans puce, c'est pareil partout.
 *
 * La page est servie telle quelle : rien à charger, rien à cliquer, elle se
 * lit sur un téléphone à côté de l'échiquier — et s'imprime.
 */

import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowLeft,
  Crown,
  Flag,
  Hand,
  Handshake,
  PenLine,
  Smartphone,
  Timer,
} from 'lucide-react'
import Link from 'next/link'
import { Card, Chip } from '@/components/ui/index.tsx'

export const metadata: Metadata = {
  title: 'Aide-mémoire d’arbitrage',
  description:
    'Pièce touchée, coup illégal, drapeau, nulle réclamée, téléphone : ce que disent les Règles du jeu de la FIDE, en une page.',
}

type Cadence = 'lente' | 'rapide' | 'blitz'

interface Point {
  texte: string
  /** Les cadences concernées, quand la règle n'est pas la même partout. */
  cadences?: Cadence[]
}

interface Section {
  id: string
  titre: string
  article: string
  icone: LucideIcon
  points: Point[]
}

const CADENCES: Record<Cadence, string> = {
  lente: 'Lente',
  rapide: 'Rapide',
  blitz: 'Blitz',
}

const SECTIONS: Section[] = [
  {
    id: 'touche-joue',
    titre: 'Pièce touchée, pièce jouée',
    article: 'art. 4',
    icone: Hand,
    points: [
      {
        texte:
          'Une pièce touchée volontairement doit être jouée si c’est la sienne, prise si c’est celle de l’adversaire — dès lors qu’un coup légal le permet.',
      },
      {
        texte:
          'Pour recentrer une pièce, on dit « j’adoube » avant de la toucher, et seulement quand c’est à soi de jouer.',
      },
      {
        texte:
          'Un coup est joué quand la pièce est lâchée sur sa case ; il est achevé quand on a appuyé sur la pendule. Entre les deux, on ne revient pas en arrière.',
      },
      {
        texte:
          'Pour roquer, on touche le roi d’abord, ou le roi et la tour ensemble. Tour touchée en premier : on ne peut plus roquer avec elle ce coup-ci, on doit la jouer.',
      },
      {
        texte: 'Un coup se joue d’une seule main, et c’est cette main qui appuie sur la pendule.',
      },
    ],
  },
  {
    id: 'coup-illegal',
    titre: 'Coup illégal',
    article: 'art. 7.5',
    icone: AlertTriangle,
    points: [
      {
        texte:
          'Roi laissé en échec, pièce hors de sa marche, roque interdit, promotion oubliée : on revient à la position d’avant le coup, et la règle de la pièce touchée s’applique à ce qu’on a touché.',
      },
      {
        texte:
          'Premier coup illégal achevé : deux minutes de plus à l’adversaire. Second coup illégal du même joueur : partie perdue — nulle si l’adversaire ne peut pas mater.',
      },
      {
        texte:
          'Dès qu’on s’en aperçoit, même plusieurs coups plus tard : on remonte à la position d’avant.',
        cadences: ['lente'],
      },
      {
        texte:
          'Seulement si l’adversaire n’a pas encore joué son coup suivant. Après, le coup illégal reste et la partie continue.',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte: 'Le roi ne se prend jamais : prendre le roi est un coup illégal, pas une victoire.',
      },
      {
        texte:
          'Jouer à deux mains, ou appuyer sur la pendule sans avoir joué, se sanctionne comme un coup illégal.',
      },
    ],
  },
  {
    id: 'pendule',
    titre: 'Pendule et drapeau',
    article: 'art. 6',
    icone: Timer,
    points: [
      {
        texte:
          'Drapeau tombé, partie perdue — sauf si l’adversaire ne peut mater par aucune suite de coups légaux : nulle.',
      },
      {
        texte: 'L’arbitre constate la chute du drapeau et l’annonce.',
        cadences: ['lente'],
      },
      {
        texte:
          'Sans arbitre à chaque échiquier, c’est au joueur de réclamer la chute ; l’arbitre ne la signale pas.',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte:
          'Deux drapeaux tombés sans savoir lequel le premier : nulle dans la dernière période de jeu, et toujours en rapide ou blitz.',
      },
      {
        texte:
          'On n’appuie pas sur la pendule avant d’avoir joué, on ne garde pas le doigt dessus, on ne la soulève pas, on ne la frappe pas.',
      },
      {
        texte:
          'Pour appeler l’arbitre, on arrête les deux pendules. Aucune autre raison ne permet de les arrêter.',
      },
    ],
  },
  {
    id: 'nulle',
    titre: 'La nulle : proposer, réclamer, constater',
    article: 'art. 5 et 9',
    icone: Handshake,
    points: [
      {
        texte:
          'On propose la nulle après avoir joué son coup et avant d’appuyer sur la pendule. L’adversaire accepte en le disant, refuse en jouant. Proposer sans arrêt est une gêne, et se sanctionne.',
      },
      {
        texte:
          'Triple répétition : la même position, même trait, mêmes droits de roque et de prise en passant, apparue trois fois — pas forcément de suite.',
      },
      {
        texte: 'Cinquante coups : cinquante coups de chaque camp sans prise ni coup de pion.',
      },
      {
        texte:
          'Pour réclamer l’une ou l’autre : le joueur au trait écrit le coup qui produit la position, ne le joue pas, arrête les pendules et appelle l’arbitre. Réclamation juste : nulle. Réclamation fausse : deux minutes à l’adversaire, et le coup écrit doit être joué.',
      },
      {
        texte:
          'Sans réclamation, l’arbitre constate la nulle à la cinquième répétition ou au soixante-quinzième coup sans prise ni coup de pion.',
      },
      {
        texte:
          'Position morte : plus aucun mat possible, pour personne (roi seul, roi et fou, roi et cavalier). La partie est nulle à l’instant, même si un drapeau tombe ensuite.',
      },
    ],
  },
  {
    id: 'coups-speciaux',
    titre: 'Roque, promotion, prise en passant',
    article: 'art. 3',
    icone: Crown,
    points: [
      {
        texte:
          'Pas de roque si le roi ou la tour a déjà bougé, si le roi est en échec, ou s’il traverse ou arrive sur une case attaquée. La tour, elle, peut être attaquée ou passer sur une case attaquée.',
      },
      {
        texte:
          'La promotion est obligatoire et la pièce est au choix — pas forcément une dame. Le choix est fait dès que la nouvelle pièce touche la case.',
      },
      {
        texte:
          'Une tour retournée est une tour. S’il manque la pièce voulue, on arrête les pendules et on la demande à l’arbitre.',
      },
      {
        texte:
          'La prise en passant n’est possible qu’au coup qui suit immédiatement la double avancée du pion.',
      },
    ],
  },
  {
    id: 'notation',
    titre: 'Noter la partie',
    article: 'art. 8',
    icone: PenLine,
    points: [
      {
        texte:
          'On note coup après coup, lisiblement, en notation algébrique, son coup et celui de l’adversaire. Interdit d’écrire son coup avant de le jouer — sauf pour réclamer une nulle.',
        cadences: ['lente'],
      },
      {
        texte:
          'Moins de cinq minutes au cadran et pas d’incrément d’au moins trente secondes : on peut cesser de noter. On complète sa feuille dès que le contrôle est passé.',
        cadences: ['lente'],
      },
      {
        texte: 'Pas d’obligation de noter.',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte:
          'La feuille appartient à l’organisateur. À la fin, les deux joueurs y inscrivent le résultat et la signent.',
      },
    ],
  },
  {
    id: 'telephone',
    titre: 'Téléphone, sorties, conduite',
    article: 'art. 11',
    icone: Smartphone,
    points: [
      {
        texte:
          'Téléphone et tout appareil qui communique : interdits dans l’aire de jeu. Le règlement du tournoi peut autoriser un appareil éteint, rangé dans un sac, hors de portée.',
      },
      {
        texte:
          'Un téléphone qui sonne ou qu’on manipule : partie perdue, sauf sanction moindre prévue par le règlement. L’adversaire gagne — nulle s’il ne peut pas mater.',
      },
      {
        texte:
          'Le joueur au trait ne quitte pas l’aire de jeu. Personne ne la quitte sans l’accord de l’arbitre.',
      },
      {
        texte:
          'Pas de notes, pas d’analyse dans la salle, pas de conseil d’un tiers, rien qui gêne l’adversaire. Refuser de suivre l’arbitre est une faute en soi.',
      },
    ],
  },
  {
    id: 'resultat',
    titre: 'Retard, abandon, résultat',
    article: 'art. 5, 6.7 et 12',
    icone: Flag,
    points: [
      {
        texte:
          'Retard : la tolérance est celle du règlement du tournoi — zéro par défaut à la FIDE, souvent trente minutes ou une heure dans les règlements français. Au-delà, forfait, sauf décision de l’arbitre.',
      },
      {
        texte:
          'Le mat termine la partie à l’instant où il est joué, si le coup est légal : un drapeau qui tombe ensuite ne change rien.',
      },
      {
        texte:
          'On abandonne en le disant. Coucher son roi ou tendre la main n’est pas un résultat : on l’annonce, puis on l’écrit.',
      },
      {
        texte:
          'Les sanctions dont dispose l’arbitre, de la plus légère à la plus lourde : avertissement, temps ajouté à l’adversaire, temps retiré, partie perdue, exclusion du tournoi.',
      },
    ],
  },
]

export default function ArbitragePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <Link
        href="/outils"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink print:hidden"
      >
        <ArrowLeft size={14} aria-hidden />
        Outils
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Aide-mémoire d’arbitrage
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Les situations qui reviennent en tournoi, et ce qu’en disent les Règles du jeu de la FIDE,
        édition 2023. Le règlement du tournoi peut préciser certains points : il prime. Dans le
        doute, on arrête les pendules et on appelle l’arbitre.
      </p>

      {/* Le sommaire : huit ancres, pour aller droit à la carte qu'on cherche
          avec un joueur qui attend à côté. */}
      <nav aria-label="Sections" className="mt-4 flex flex-wrap gap-1.5 print:hidden">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-line px-3 py-1 text-[13px] font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {section.titre}
          </a>
        ))}
      </nav>

      <div className="mt-5 space-y-3">
        {SECTIONS.map((section) => {
          const Icone = section.icone
          return (
            <Card key={section.id} id={section.id} className="scroll-mt-20 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                  style={{
                    background: 'color-mix(in oklab, var(--q-inaccuracy) 16%, transparent)',
                    color: 'var(--q-inaccuracy)',
                  }}
                  aria-hidden
                >
                  <Icone size={18} />
                </span>
                <h2 className="min-w-0 flex-1 text-lg font-semibold leading-tight">
                  {section.titre}
                </h2>
                <span className="shrink-0 text-xs text-faint">{section.article}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {section.points.map((point, index) => (
                  <li key={index} className="flex gap-2.5 text-sm leading-relaxed">
                    <span
                      className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-faint"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      {point.cadences && (
                        <span className="mr-1.5 inline-flex gap-1 align-middle">
                          {point.cadences.map((cadence) => (
                            <Chip key={cadence} tone={cadence === 'lente' ? 'accent' : 'warning'}>
                              {CADENCES[cadence]}
                            </Chip>
                          ))}
                        </span>
                      )}
                      {point.texte}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-faint">
        Résumé, pas texte officiel : les Règles du jeu d’échecs de la FIDE font foi, dans leur
        version en vigueur, et le règlement de chaque compétition peut y ajouter ses propres
        dispositions.
      </p>
    </div>
  )
}
