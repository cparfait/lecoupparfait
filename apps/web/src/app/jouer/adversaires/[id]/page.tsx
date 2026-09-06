/**
 * La fiche d'un adversaire.
 *
 * Les sept personnalités portaient un nom, une phrase et un portrait, et rien
 * derrière : on ne pouvait pas cliquer dessus, donc il n'y avait rien à en
 * savoir. Ce sont pourtant les seuls adversaires que la plupart des joueurs
 * affronteront, pendant des heures — et un adversaire dont on ne sait rien
 * reste un curseur de difficulté déguisé en personnage.
 *
 * La fiche dit quatre choses, et l'ordre n'est pas indifférent :
 *
 *  1. **qui c'est** — le portrait en grand, la devise, l'histoire de la
 *     sculpture ;
 *  2. **où on le rencontre** — les niveaux exacts, déduits de la table, parce
 *     que « je voudrais rejouer contre Mirage » était sans réponse ;
 *  3. **ce qu'il aime, en chiffres** — les biais tels qu'ils sont dans le code,
 *     pas une reformulation ;
 *  4. **comment le battre** — du conseil d'échecs, qui vise le biais affiché
 *     juste au-dessus.
 *
 * Le troisième point est ce qui empêche la page d'être une décoration. `/jouer`
 * promet que « leur façon de choisir un coup est biaisée en faveur de ce qu'ils
 * aiment » : ici, on montre le biais.
 *
 * Page serveur et rendu statique : sept fiches de contenu fixe n'ont aucune
 * raison d'être calculées à chaque visite, ni d'attendre du JavaScript pour
 * s'afficher.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Swords, Target } from 'lucide-react'
import { BOT_LEVELS, BOT_PERSONALITIES, penchants, type BotPersonalityId } from '@coupparfait/core'
import { ButtonLink, Card } from '@/components/ui/index.tsx'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'

const IDS = Object.keys(BOT_PERSONALITIES) as BotPersonalityId[]

export function generateStaticParams() {
  return IDS.map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const personnalite = BOT_PERSONALITIES[id as BotPersonalityId]
  if (!personnalite) return { title: 'Adversaire introuvable' }
  return {
    title: `${personnalite.name.fr} — adversaire artificiel`,
    description: personnalite.blurb.fr,
  }
}

/**
 * À quels niveaux le rencontre-t-on ?
 *
 * Déduit de `BOT_LEVELS`, jamais écrit à la main : la table des vingt-cinq
 * niveaux change, et une fiche qui annoncerait « niveaux 4 à 7 » de mémoire
 * mentirait au premier remaniement.
 */
function niveauxDe(id: BotPersonalityId) {
  const siens = BOT_LEVELS.filter((niveau) => niveau.personality === id)
  return {
    nombre: siens.length,
    numeros: siens.map((niveau) => niveau.level),
    eloMin: Math.min(...siens.map((niveau) => niveau.elo)),
    eloMax: Math.max(...siens.map((niveau) => niveau.elo)),
  }
}

export default async function FicheAdversaire({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const personnalite = BOT_PERSONALITIES[id as BotPersonalityId]
  if (!personnalite) notFound()

  const niveaux = niveauxDe(personnalite.id)
  const traits = penchants(personnalite.bias)
  const position = IDS.indexOf(personnalite.id)
  const precedent = BOT_PERSONALITIES[IDS[(position - 1 + IDS.length) % IDS.length]!]
  const suivant = BOT_PERSONALITIES[IDS[(position + 1) % IDS.length]!]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/jouer/adversaires"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        Tous les adversaires
      </Link>

      {/* ── Qui c'est ──────────────────────────────────────────────────
          Le portrait en grand : c'est la seule page où il a la place de se
          voir, et la matière est la moitié de ce qu'il y a à dire. */}
      <header className="mt-4 flex flex-wrap items-end gap-5">
        <PortraitAdversaire personality={personnalite} size={128} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {personnalite.name.fr}
          </h1>
          <p className="mt-1 text-lg italic text-accent">« {personnalite.devise} »</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {personnalite.blurb.fr}
          </p>
        </div>
      </header>

      <div className="mt-7 space-y-4 text-[15px] leading-relaxed">
        {personnalite.lore.map((paragraphe) => (
          <p key={paragraphe.slice(0, 24)}>{paragraphe}</p>
        ))}
      </div>

      {/* ── Où on le rencontre ─────────────────────────────────────── */}
      <Card className="mt-7 p-4">
        <p className="text-[12px] font-semibold text-faint">Où tu le rencontres</p>
        <p className="mt-1.5 text-[14px] leading-relaxed">
          {niveaux.nombre === 1 ? 'Au niveau ' : 'Aux niveaux '}
          <strong className="tabular-nums">{niveaux.numeros.join(', ')}</strong> des vingt-cinq,
          soit de <strong className="tabular-nums">{niveaux.eloMin}</strong> à{' '}
          <strong className="tabular-nums">{niveaux.eloMax}</strong> Elo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {/* `?perso=` seul : l'écran de l'ordinateur lit ce paramètre et
              impose la personnalité, mais son `?niveau=` n'est honoré qu'en
              mode tournoi. On laisse donc choisir le niveau sur place, ce qui
              est de toute façon le geste qu'on y fait. */}
          <ButtonLink
            href={`/jouer/ordinateur?perso=${personnalite.id}`}
            variant="primary"
            size="sm"
            icon={<Swords size={14} />}
          >
            Jouer contre {personnalite.name.fr}
          </ButtonLink>
        </div>
      </Card>

      {/* ── Son caractère, en chiffres ─────────────────────────────────
          Les biais tels qu'ils sont dans le code, sans reformulation. Un
          nombre en centipions ne parle pas tout seul : la barre le rend
          comparable d'un adversaire à l'autre, et c'est le seul usage qu'on
          en attend. */}
      <section className="mt-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Son caractère</h2>
        <p className="mt-1 text-[14px] text-muted">
          Ce que son évaluation ajoute — ou retire — à un coup, en centièmes de pion. Ce n’est pas
          une étiquette : c’est le nombre qui le fait jouer comme il joue.
        </p>
        {traits.length === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Aucun biais, sur aucun axe. C’est le seul de la série dans ce cas, et c’est ce qui le
            rend si désagréable.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {traits.map((trait) => (
              <li key={trait.axe} className="flex items-center gap-3">
                <span className="w-52 shrink-0 text-[14px]">{trait.libelle}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.abs(trait.poids))}%`,
                      background:
                        trait.poids > 0
                          ? 'var(--accent)'
                          : 'color-mix(in oklab, var(--q-blunder) 70%, transparent)',
                    }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-faint">
                  {trait.poids > 0 ? '+' : ''}
                  {trait.poids}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Comment le battre ──────────────────────────────────────── */}
      <Card className="mt-7 p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
          <Target size={13} aria-hidden />
          Comment le battre
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed">{personnalite.contre}</p>
      </Card>

      {/* ── Les voisins ───────────────────────────────────────────────
          Une galerie se parcourt : arriver sur une fiche sans porte vers la
          suivante oblige à repasser par la liste à chaque fois. */}
      <nav className="mt-8 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
        <Link
          href={`/jouer/adversaires/${precedent.id}`}
          className="group flex min-w-0 items-center gap-2 text-[14px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} className="shrink-0" aria-hidden />
          <PortraitAdversaire personality={precedent} size={28} />
          <span className="truncate">{precedent.name.fr}</span>
        </Link>
        <Link
          href={`/jouer/adversaires/${suivant.id}`}
          className="group flex min-w-0 items-center gap-2 text-[14px] text-muted transition-colors hover:text-ink"
        >
          <span className="truncate">{suivant.name.fr}</span>
          <PortraitAdversaire personality={suivant} size={28} />
          <ArrowRight size={14} className="shrink-0" aria-hidden />
        </Link>
      </nav>
    </div>
  )
}
