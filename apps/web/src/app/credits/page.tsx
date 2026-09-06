/**
 * Crédits et licences.
 *
 * Ce n'est pas une page de politesse : les licences GPL, CC BY et CC BY-SA
 * **exigent** l'attribution. Sans cette page, la redistribution du projet serait
 * illégale. Elle sert aussi à montrer sur quoi le projet est bâti — c'est une
 * bonne façon de découvrir l'écosystème libre des échecs.
 *
 * Elle ne porte plus sa liste : celle-ci vit dans `lib/credits/catalogue.ts`,
 * que l'administration confronte aux dépendances réelles et qu'un contrôle
 * vérifie à chaque exécution des tests. Écrite ici, elle restait à jour le jour
 * où on l'avait écrite — et il y manquait les dix-sept bibliothèques qui font
 * tourner l'application, Maia, Lc0 et Piper.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/index.tsx'
import { TITRES_CATEGORIE, creditsDe, type Credit } from '@/lib/credits/catalogue.ts'

export const metadata: Metadata = {
  title: 'Crédits & licences',
  description:
    'Les logiciels, jeux de données et ressources graphiques libres sur lesquels Le Coup Parfait est construit, avec leurs auteurs et leurs licences.',
}

export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Crédits &amp; licences</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[14px]">
        Le Coup Parfait n’aurait pas pu exister sans le travail libre d’autres personnes. Tout ce
        qui suit est réutilisé dans le respect de sa licence — et cette page en fait partie :
        plusieurs de ces licences exigent explicitement l’attribution.
      </p>

      <Section titre={TITRES_CATEGORIE.moteur} credits={creditsDe('moteur')} />
      <Section titre={TITRES_CATEGORIE.donnees} credits={creditsDe('donnees')} />
      <Section titre={TITRES_CATEGORIE.ressources} credits={creditsDe('ressources')} />
      {/* Les bibliothèques en compact : quinze cartes de plus feraient de cette
          page un inventaire, alors qu'elle raconte sur quoi le projet est bâti.
          Une ligne chacune suffit à porter l'attribution que leurs licences
          demandent — nom, auteur, licence, et le lien pour aller voir. */}
      <Bibliotheques credits={creditsDe('bibliotheque')} />

      <Card className="mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">La licence du Coup Parfait</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Le Coup Parfait est publié sous licence{' '}
          <strong className="text-ink">GNU Affero General Public License v3 ou ultérieure</strong>.
          Ce choix n’est pas arbitraire : Stockfish est sous GPL, et toute œuvre qui l’intègre doit
          adopter une licence compatible. L’AGPL ajoute une clause décisive pour un service en ligne
          — quiconque héberge une version modifiée doit en publier le code source.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Concrètement : tu peux l’utiliser, le modifier, l’héberger pour tes amis, le redistribuer.
          La seule obligation est de laisser les suivants faire pareil.
        </p>
        <p className="mt-3 text-xs text-faint">
          Les jeux de pièces publiés sous licence <span className="font-mono">CC BY-NC-SA</span>{' '}
          (usage non commercial) ont été délibérément écartés du projet, aussi beaux soient-ils :
          leur clause rendrait la redistribution libre impossible.
        </p>
      </Card>

      <p className="mt-8 text-center text-sm">
        <Link href="/a-propos" className="text-accent hover:underline">
          En savoir plus sur le projet
        </Link>
      </p>
    </div>
  )
}

function Section({ titre, credits }: { titre: string; credits: Credit[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{titre}</h2>
      <div className="mt-3 space-y-2">
        {credits.map((credit) => (
          <Card key={credit.nom} className="p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-accent hover:underline"
              >
                {credit.nom}
                {credit.version ? ` ${credit.version}` : ''}
              </a>
              <span className="text-xs text-muted">par {credit.auteur}</span>
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 font-mono text-[12px] text-faint">
                {credit.licence}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{credit.note}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Bibliotheques({ credits }: { credits: Credit[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        {TITRES_CATEGORIE.bibliotheque}
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        Les {credits.length} bibliothèques embarquées dans l’application.
      </p>
      <Card className="mt-3 overflow-hidden">
        <ul>
          {credits.map((credit) => (
            <li
              key={credit.paquet ?? credit.nom}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line/40 px-4 py-2 last:border-0"
            >
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[14px] font-semibold text-accent hover:underline"
              >
                {credit.nom}
              </a>
              <span className="text-[12px] text-muted">par {credit.auteur}</span>
              <span className="ml-auto shrink-0 font-mono text-[12px] text-faint">
                {credit.licence}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
