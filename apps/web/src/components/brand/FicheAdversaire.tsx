'use client'

/**
 * Le rendu d'une fiche d'adversaire.
 *
 * Séparé de la page pour une seule raison : la page est un composant serveur —
 * elle porte `generateMetadata` et `generateStaticParams` — et un composant
 * serveur ne peut pas lire le dictionnaire, puisque la langue choisie vit dans
 * le navigateur.
 *
 * La fiche dit quatre choses, et l'ordre n'est pas indifférent : qui c'est, où
 * on le rencontre, ce qu'il aime en chiffres, et comment le battre. Le
 * troisième point est ce qui empêche la page d'être une décoration : `/jouer`
 * promet que « leur façon de choisir un coup est biaisée en faveur de ce qu'ils
 * aiment », et ici on montre le biais.
 *
 * Les textes de l'adversaire lui-même — sa devise, son histoire, le conseil
 * pour le battre — sont du contenu rédigé : voir `localeDuContenu`.
 */

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Swords, Target } from 'lucide-react'
import { BOT_LEVELS, BOT_PERSONALITIES, penchants, type BotPersonalityId } from '@coupparfait/core'
import { ButtonLink, Card } from '@/components/ui/index.tsx'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

const IDS = Object.keys(BOT_PERSONALITIES) as BotPersonalityId[]

/**
 * À quels niveaux le rencontre-t-on ?
 *
 * Déduit de `BOT_LEVELS`, jamais écrit à la main : la table des niveaux
 * change, et une fiche qui annoncerait « niveaux 4 à 7 » de mémoire
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

export function FicheAdversaire({ id }: { id: BotPersonalityId }) {
  const t = useT()
  const personnalite = BOT_PERSONALITIES[id]!

  const niveaux = niveauxDe(personnalite.id)
  const traits = penchants(personnalite.bias)
  const position = IDS.indexOf(personnalite.id)
  const precedent = BOT_PERSONALITIES[IDS[(position - 1 + IDS.length) % IDS.length]!]!
  const suivant = BOT_PERSONALITIES[IDS[(position + 1) % IDS.length]!]!

  return (
    <div className="page-etroite">
      <Link
        href="/jouer/adversaires"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        {t('opponent.all')}
      </Link>

      {/* ── Qui c'est ──────────────────────────────────────────────────
          Le portrait en grand : c'est la seule page où il a la place de se
          voir, et la matière est la moitié de ce qu'il y a à dire. */}
      <header className="mt-4 flex flex-wrap items-end gap-5">
        <PortraitAdversaire personality={personnalite} size={128} />
        <div className="min-w-0 flex-1">
          <h1 className="titre-affiche text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">
            {tCoeur(t, personnalite.name)}
          </h1>
          <p className="mt-1 text-lg italic text-accent">« {tCoeur(t, personnalite.devise)} »</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {tCoeur(t, personnalite.blurb)}
          </p>
        </div>
      </header>

      <div className="mt-7 space-y-4 text-[15px] leading-relaxed">
        {personnalite.lore.map((cle) => (
          <p key={cle}>{tCoeur(t, cle)}</p>
        ))}
      </div>

      {/* ── Où on le rencontre ─────────────────────────────────────── */}
      <Card className="mt-7 p-4">
        <p className="text-[12px] font-semibold text-faint">{t('opponent.whereYouMeet')}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed">
          {t(niveaux.nombre === 1 ? 'opponent.atLevel' : 'opponent.atLevels')}{' '}
          <strong className="tabular-nums">{niveaux.numeros.join(', ')}</strong>{' '}
          {t('opponent.ofTotal', { total: BOT_LEVELS.length })}{' '}
          <strong className="tabular-nums">{niveaux.eloMin}</strong> {t('opponent.to')}{' '}
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
            {t('opponent.playAgainst', { nom: tCoeur(t, personnalite.name) })}
          </ButtonLink>
        </div>
      </Card>

      {/* ── Son caractère, en chiffres ─────────────────────────────────
          Les biais tels qu'ils sont dans le code, sans reformulation. Un
          nombre en centipions ne parle pas tout seul : la barre le rend
          comparable d'un adversaire à l'autre, et c'est le seul usage qu'on
          en attend. */}
      <section className="mt-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {t('opponent.character')}
        </h2>
        <p className="mt-1 text-[14px] text-muted">{t('opponent.characterHint')}</p>
        {traits.length === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{t('opponent.noBias')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {traits.map((trait) => (
              <li key={trait.axe} className="flex items-center gap-3">
                <span className="w-52 shrink-0 text-[14px]">{tCoeur(t, trait.libelle)}</span>
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
          {t('opponent.howToBeat')}
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed">{tCoeur(t, personnalite.contre)}</p>
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
          <span className="truncate">{tCoeur(t, precedent.name)}</span>
        </Link>
        <Link
          href={`/jouer/adversaires/${suivant.id}`}
          className="group flex min-w-0 items-center gap-2 text-[14px] text-muted transition-colors hover:text-ink"
        >
          <span className="truncate">{tCoeur(t, suivant.name)}</span>
          <PortraitAdversaire personality={suivant} size={28} />
          <ArrowRight size={14} className="shrink-0" aria-hidden />
        </Link>
      </nav>
    </div>
  )
}
