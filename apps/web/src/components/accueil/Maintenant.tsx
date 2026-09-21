'use client'

/**
 * Le bloc « Maintenant » : une action, mise en avant, et rien à sa hauteur.
 *
 * C'est le seul endroit de l'accueil qui porte un bouton primaire. Tout le
 * reste de la page — le parcours, les quêtes du jour, les dernières parties —
 * se lit en second, et se dessine comme tel.
 *
 * L'ordre vient de `prochainesChoses`, qui est un fichier sans React : on peut
 * y discuter des priorités sans ouvrir un composant.
 *
 * Les propositions suivantes ne disparaissent pas, elles se rangent : une ligne
 * chacune, sous un filet. On garde donc la totalité de ce qui attend — c'était
 * l'intérêt de l'ancienne grille de cartes — sans que trois choses se disputent
 * le même poids visuel.
 *
 * Deux au maximum en dessous. Au-delà, ce n'est plus un rappel, c'est une
 * liste ; et une liste appelle un écran, pas un accueil.
 */

import Link from 'next/link'
import { ArrowRight, Map, Play, Sun, Swords, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Board2D } from '@/components/board/Board2D.tsx'
import { Button, Card, Skeleton } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import type { ProchaineChose, ProchaineChoseId } from './prochainesChoses.ts'
import { useT } from '@/lib/i18n/index.tsx'

const SECONDAIRES_MAX = 2

/**
 * L'icône du bandeau, par situation.
 *
 * Les mêmes que sur les cartes plus bas — le soleil des quêtes, la carte du
 * parcours — pour que la proposition du haut et le bloc qui la reprend se
 * reconnaissent l'un l'autre.
 */
const ICONES: Record<ProchaineChoseId, LucideIcon> = {
  tonTour: Swords,
  correspondance: Swords,
  partieOuverte: Swords,
  repriseOrdinateur: Play,
  defi: Target,
  quete: Sun,
  carriere: Map,
  jouer: Swords,
}

export function Maintenant({
  choses,
  chargement,
  positionDuJour,
}: {
  choses: ProchaineChose[]
  /** Vrai tant qu'on ignore ce qui attend : on ne propose rien au hasard. */
  chargement: boolean
  /**
   * La position du défi du jour, en FEN, quand on la connaît.
   *
   * Elle se montre à côté de la proposition quand c'est le défi qui est mis
   * en avant : une carte qui parle d'une position sans la montrer demande
   * de la croire sur parole. L'échiquier n'est pas jouable ici — on ne
   * résout pas le défi sur l'accueil, on y va —, il dit seulement ce qui
   * attend, et de quel côté.
   */
  positionDuJour?: string | null
}) {
  const t = useT()
  if (chargement) return <Skeleton className="h-36 w-full" />

  const [principale, ...suite] = choses
  if (!principale) return null

  const Icone = ICONES[principale.id]
  const plateau = principale.id === 'defi' && positionDuJour ? positionDuJour : null
  // Le camp au trait, deuxième champ du FEN : on montre la position du côté
  // de qui doit jouer, comme on la verra en l'ouvrant.
  const auTrait = plateau?.split(' ')[1] === 'b' ? 'b' : 'w'

  return (
    <Card
      glow
      className={clsx(
        'overflow-hidden',
        // Une personne qui attend mérite qu'on le voie avant de lire : le
        // liseré est la seule différence, et elle se remarque de loin.
        principale.urgent && 'border-accent/60',
        // Le défi du jour prend le fond de l'accent : c'est la seule
        // proposition qui expire, et c'est la couleur du bouton qui y mène.
        // Voir `teinte-defi` dans `globals.css`.
        principale.id === 'defi' && 'teinte-defi',
      )}
    >
      {/* Le bandeau, comme sur les cartes plus bas : la catégorie était écrite
          en douze pixels gris dans le coin de la carte, et elle nomme pourtant
          le seul bloc de la page qu'on lit à coup sûr. Aucune teinte n'est
          passée — l'accent par défaut, et celle de la carte quand c'est le
          défi, qui la porte déjà (`teinte-defi`). */}
      <EnTeteDeCarte titre={principale.categorie} icone={<Icone size={14} aria-hidden />} />

      <div
        className={clsx(
          'p-5 sm:p-6',
          plateau && 'grid gap-6 md:grid-cols-[1fr_auto] md:items-center',
        )}
      >
        <div>
          {/* La phrase, en grand. C'est elle qu'on lit en arrivant, et elle
              doit se suffire : on doit savoir quoi faire sans lire la ligne
              d'après. */}
          <h2 className="titre-affiche text-[1.6rem] sm:text-[2rem]">{principale.titre}</h2>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
            {principale.detail}
          </p>

          <Link href={principale.lien} className="mt-6 block sm:inline-block">
            <Button variant="primary" size="lg" icon={<ArrowRight size={16} />} fullWidth>
              {principale.action}
            </Button>
          </Link>
        </div>

        {plateau && (
          <Link
            href={principale.lien}
            aria-label={principale.action}
            className="group mx-auto block w-full max-w-[280px] md:w-[260px] lg:w-[300px]"
          >
            {/* Une monture étroite, la même que sur l'accueil public : la
                position est un objet posé sur la carte, pas un motif imprimé
                dedans. */}
            <div className="rounded-[var(--radius)] border border-line-strong/70 bg-bg-deep p-1.5 shadow-[var(--shadow)] transition-transform duration-300 group-hover:scale-[1.015]">
              <div className="overflow-hidden rounded-[calc(var(--radius)-6px)]">
                <Board2D
                  fen={plateau}
                  orientation={auTrait}
                  playable={null}
                  allowAnnotations={false}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-[12px] text-faint">
              {auTrait === 'w' ? t('puzzles.whiteToPlay') : t('puzzles.blackToPlay')}
            </p>
          </Link>
        )}
      </div>

      {suite.length > 0 && (
        <div className="border-t border-line/60">
          <p className="px-5 pt-3 text-[12px] font-semibold text-faint">{t('last.andAlso')}</p>
          <ul className="space-y-1 px-2 pb-2">
            {suite.slice(0, SECONDAIRES_MAX).map((chose) => (
              <li key={`${chose.id}-${chose.lien}`}>
                <Link
                  href={chose.lien}
                  className={clsx(
                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors',
                    // Rangé en second, le défi garde sa couleur : une ligne
                    // grise parmi les grises se manque, et lui meurt à minuit.
                    chose.id === 'defi'
                      ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_20%,transparent)]'
                      : 'hover:bg-surface-hover',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{chose.titre}</span>
                    <span className="block truncate text-[12px] text-faint">{chose.detail}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-accent">
                    {chose.action}
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
