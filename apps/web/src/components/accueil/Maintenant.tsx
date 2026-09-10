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
import { Button, Card, Skeleton } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import type { ProchaineChose, ProchaineChoseId } from './prochainesChoses.ts'

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
}: {
  choses: ProchaineChose[]
  /** Vrai tant qu'on ignore ce qui attend : on ne propose rien au hasard. */
  chargement: boolean
}) {
  if (chargement) return <Skeleton className="h-36 w-full" />

  const [principale, ...suite] = choses
  if (!principale) return null

  const Icone = ICONES[principale.id]

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
      <EnTeteDeCarte titre={principale.categorie} icone={<Icone size={12} aria-hidden />} />

      <div className="p-5">
        {/* La phrase, en grand. C'est elle qu'on lit en arrivant, et elle doit
            se suffire : on doit savoir quoi faire sans lire la ligne d'après. */}
        <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">
          {principale.titre}
        </h2>
        <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-muted">
          {principale.detail}
        </p>

        <Link href={principale.lien} className="mt-4 block sm:inline-block">
          <Button variant="primary" size="lg" icon={<ArrowRight size={16} />} fullWidth>
            {principale.action}
          </Button>
        </Link>
      </div>

      {suite.length > 0 && (
        <div className="border-t border-line/60">
          <p className="px-5 pt-3 text-[12px] font-semibold text-faint">Et aussi</p>
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
