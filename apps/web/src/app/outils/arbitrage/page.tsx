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
  Crown,
  Flag,
  Hand,
  Handshake,
  PenLine,
  Smartphone,
  Timer,
} from 'lucide-react'
import { Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { metadonnees, tDesMetadonnees } from '@/lib/i18n/metadonnees.ts'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.arbitration', { description: 'meta.arbitrationDesc' })
}

type Cadence = 'lente' | 'rapide' | 'blitz'

interface Point {
  texte: TranslationKey
  /** Les cadences concernées, quand la règle n'est pas la même partout. */
  cadences?: Cadence[]
}

interface Section {
  id: string
  titre: TranslationKey
  article: string
  icone: LucideIcon
  points: Point[]
}

const CADENCES: Record<Cadence, TranslationKey> = {
  lente: 'arbitrage.paceSlow',
  rapide: 'arbitrage.paceRapid',
  blitz: 'arbitrage.paceBlitz',
}

const SECTIONS: Section[] = [
  {
    id: 'touche-joue',
    titre: 'arbitrage.touche-joue.titre',
    article: 'art. 4',
    icone: Hand,
    points: [
      {
        texte: 'arbitrage.touche-joue.p1',
      },
      {
        texte: 'arbitrage.touche-joue.p2',
      },
      {
        texte: 'arbitrage.touche-joue.p3',
      },
      {
        texte: 'arbitrage.touche-joue.p4',
      },
      {
        texte: 'arbitrage.touche-joue.p5',
      },
    ],
  },
  {
    id: 'coup-illegal',
    titre: 'arbitrage.coup-illegal.titre',
    article: 'art. 7.5',
    icone: AlertTriangle,
    points: [
      {
        texte: 'arbitrage.coup-illegal.p1',
      },
      {
        texte: 'arbitrage.coup-illegal.p2',
      },
      {
        texte: 'arbitrage.coup-illegal.p3',
        cadences: ['lente'],
      },
      {
        texte: 'arbitrage.coup-illegal.p4',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte: 'arbitrage.coup-illegal.p5',
      },
      {
        texte: 'arbitrage.coup-illegal.p6',
      },
    ],
  },
  {
    id: 'pendule',
    titre: 'arbitrage.pendule.titre',
    article: 'art. 6',
    icone: Timer,
    points: [
      {
        texte: 'arbitrage.pendule.p1',
      },
      {
        texte: 'arbitrage.pendule.p2',
        cadences: ['lente'],
      },
      {
        texte: 'arbitrage.pendule.p3',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte: 'arbitrage.pendule.p4',
      },
      {
        texte: 'arbitrage.pendule.p5',
      },
      {
        texte: 'arbitrage.pendule.p6',
      },
    ],
  },
  {
    id: 'nulle',
    titre: 'arbitrage.nulle.titre',
    article: 'art. 5 et 9',
    icone: Handshake,
    points: [
      {
        texte: 'arbitrage.nulle.p1',
      },
      {
        texte: 'arbitrage.nulle.p2',
      },
      {
        texte: 'arbitrage.nulle.p3',
      },
      {
        texte: 'arbitrage.nulle.p4',
      },
      {
        texte: 'arbitrage.nulle.p5',
      },
      {
        texte: 'arbitrage.nulle.p6',
      },
      {
        // Sur la plateforme, personne n'arrête les pendules pour appeler
        // l'arbitre : la nulle par répétition ou par les cinquante coups est
        // appliquée d'office dès qu'elle est atteinte, comme sur les autres
        // sites de jeu. C'est un écart volontaire avec la lettre des Règles,
        // et il vaut mieux le dire ici que le laisser découvrir.
        texte: 'arbitrage.nulle.p7',
      },
    ],
  },
  {
    id: 'coups-speciaux',
    titre: 'arbitrage.coups-speciaux.titre',
    article: 'art. 3',
    icone: Crown,
    points: [
      {
        texte: 'arbitrage.coups-speciaux.p1',
      },
      {
        texte: 'arbitrage.coups-speciaux.p2',
      },
      {
        texte: 'arbitrage.coups-speciaux.p3',
      },
      {
        texte: 'arbitrage.coups-speciaux.p4',
      },
    ],
  },
  {
    id: 'notation',
    titre: 'arbitrage.notation.titre',
    article: 'art. 8',
    icone: PenLine,
    points: [
      {
        texte: 'arbitrage.notation.p1',
        cadences: ['lente'],
      },
      {
        texte: 'arbitrage.notation.p2',
        cadences: ['lente'],
      },
      {
        texte: 'arbitrage.notation.p3',
        cadences: ['rapide', 'blitz'],
      },
      {
        texte: 'arbitrage.notation.p4',
      },
    ],
  },
  {
    id: 'telephone',
    titre: 'arbitrage.telephone.titre',
    article: 'art. 11',
    icone: Smartphone,
    points: [
      {
        texte: 'arbitrage.telephone.p1',
      },
      {
        texte: 'arbitrage.telephone.p2',
      },
      {
        texte: 'arbitrage.telephone.p3',
      },
      {
        texte: 'arbitrage.telephone.p4',
      },
    ],
  },
  {
    id: 'resultat',
    titre: 'arbitrage.resultat.titre',
    article: 'art. 5, 6.7 et 12',
    icone: Flag,
    points: [
      {
        texte: 'arbitrage.resultat.p1',
      },
      {
        texte: 'arbitrage.resultat.p2',
      },
      {
        texte: 'arbitrage.resultat.p3',
      },
      {
        texte: 'arbitrage.resultat.p4',
      },
    ],
  },
]

export default async function ArbitragePage() {
  const t = await tDesMetadonnees()
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <TitreDePage intro={t('arbitrage.intro')}>{t('arbitrage.title')}</TitreDePage>

      {/* Le sommaire : huit ancres, pour aller droit à la carte qu'on cherche
          avec un joueur qui attend à côté. */}
      <nav
        aria-label={t('arbitrage.sections')}
        className="mt-4 flex flex-wrap gap-1.5 print:hidden"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-line px-3 py-1 text-[13px] font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t(section.titre)}
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
                  {t(section.titre)}
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
                              {t(CADENCES[cadence])}
                            </Chip>
                          ))}
                        </span>
                      )}
                      {t(point.texte)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-faint">{t('arbitrage.disclaimer')}</p>
    </div>
  )
}
