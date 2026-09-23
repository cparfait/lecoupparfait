'use client'

/**
 * La journée, en un seul bloc.
 *
 * Le défi du jour et les quêtes du jour étaient deux cartes : le défi en
 * grand dans « Maintenant », les quêtes dans un bilan à côté — et l'on ne
 * comprenait pas si c'était une chose ou deux. C'en est une : le défi *est*
 * une quête, la mieux payée, et tout expire à minuit ensemble.
 *
 * Le bloc se lit de gauche à droite : ce qu'il y a à faire — le défi tant
 * qu'il n'est pas résolu, avec son bouton —, puis la liste des quêtes et le
 * compte de la journée ; et à droite, la position du jour elle-même, non
 * jouable. Une carte qui parle d'une position sans la montrer demandait de la
 * croire sur parole.
 *
 * Une fois le défi relevé, la position s'efface, une ligne verte le dit, et
 * les quêtes restantes prennent la place.
 *
 * **« points du jour » et non « points ».** L'en-tête de l'accueil affiche déjà
 * un total — l'expérience de carrière, plusieurs milliers. Trois mots
 * suffisent à distinguer les deux compteurs.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Sun, Swords } from 'lucide-react'
import clsx from 'clsx'
import { tranchesAuDessus } from '@coupparfait/core'
import { Board2D } from '@/components/board/Board2D.tsx'
import { Button, Card, Skeleton } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { ListeDesQuetes } from '@/components/daily/ListeDesQuetes.tsx'
import { XP_TOTAL } from '@/lib/daily/quetes.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { avecElements, useT } from '@/lib/i18n/index.tsx'
import type { ProchaineChose } from './prochainesChoses.ts'

/** L'ancre de la carte, visée depuis le panneau de la série. */
const ANCRE = 'aujourdhui'

export interface TrancheDefi {
  id: string
  nom: string
  min: number
  max: number
}

export function Aujourdhui({
  defiFait,
  tranche,
  niveauDefi,
  defi,
  position,
  chargement,
}: {
  defiFait: boolean
  /** Tranche servie aujourd'hui, pour proposer celles du dessus. */
  tranche: TrancheDefi | null
  /** Cote du puzzle du jour, s'il est connu. */
  niveauDefi: number | null
  /** La proposition du défi — titre, phrase, bouton — tant qu'il reste à faire. */
  defi: ProchaineChose | null
  /** La position du jour, en FEN, quand on la connaît. */
  position: string | null
  /** Vrai tant qu'on ignore l'état de la journée : on ne propose rien au hasard. */
  chargement: boolean
}) {
  const t = useT()
  const { etat, xp } = useQuotidien()
  const superieures = tranche ? tranchesAuDessus(tranche) : []
  const toutFait = defiFait && xp >= XP_TOTAL
  const [visee, setVisee] = useState(false)

  // Le camp au trait, deuxième champ du FEN : on montre la position du côté
  // de qui doit jouer, comme on la verra en l'ouvrant.
  const plateau = !defiFait && position ? position : null
  const auTrait = plateau?.split(' ')[1] === 'b' ? 'b' : 'w'

  /*
    Le panneau de la flamme, dans la barre du haut, propose « Voir les quêtes
    du jour » et vise `#aujourdhui`. Le navigateur amène la carte sous les
    yeux ; on la signale d'un liseré le temps d'un instant, puis l'ancre est
    retirée de l'adresse — sinon un second clic sur le même lien n'émet plus
    rien.
  */
  useEffect(() => {
    const viser = () => {
      if (window.location.hash !== `#${ANCRE}`) return
      setVisee(true)
      requestAnimationFrame(() => {
        document.getElementById(ANCRE)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', window.location.pathname + window.location.search)
      })
      setTimeout(() => setVisee(false), 1600)
    }
    viser()
    window.addEventListener('hashchange', viser)
    return () => window.removeEventListener('hashchange', viser)
  }, [])

  return (
    // `scroll-mt-20` : l'en-tête est collant, et sans cette marge la carte
    // s'arrête juste dessous — son titre caché par la barre.
    // Le fond dit l'état, avant le titre : l'accent tant que le défi attend
    // — c'est la couleur du bouton qui y mène —, le vert-bleu de la journée
    // en cours ensuite, et le vert du meilleur coup quand tout est fait.
    <Card
      id={ANCRE}
      className={clsx(
        'flex h-full scroll-mt-20 flex-col overflow-hidden transition-shadow duration-500',
        toutFait ? 'teinte-reussi' : defiFait ? 'teinte-jour' : 'teinte-defi',
        visee && 'ring-2 ring-accent',
      )}
    >
      <EnTeteDeCarte
        titre={t(toutFait ? 'today.done' : 'today.title')}
        icone={
          toutFait ? (
            <Check size={14} strokeWidth={3} aria-hidden />
          ) : (
            <Sun size={14} strokeWidth={2.5} aria-hidden />
          )
        }
        fin={
          <span className="flex items-baseline gap-1 text-[12px] text-faint">
            {avecElements(t('homeIn.dayPoints', { total: XP_TOTAL }), {
              xp: <span className="chiffre-affiche text-[1.5rem] text-ink">{xp}</span>,
            })}
          </span>
        }
      />

      <div
        className={clsx(
          'grid flex-1 gap-5 p-5',
          plateau && 'md:grid-cols-[1fr_auto] md:items-start',
        )}
      >
        <div className="min-w-0">
          {/* ── Le défi, en tête : la seule quête partagée, et la mieux payée ── */}
          {chargement ? (
            <Skeleton className="h-24 w-full" />
          ) : defi && !defiFait ? (
            <div>
              <h2 className="titre-affiche text-[1.4rem] sm:text-[1.65rem]">{defi.titre}</h2>
              <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">
                {defi.detail}
              </p>
              <Link href={defi.lien} className="mt-4 block sm:inline-block">
                <Button variant="primary" size="md" icon={<ArrowRight size={16} />} fullWidth>
                  {defi.action}
                </Button>
              </Link>
            </div>
          ) : defiFait ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-best)_12%,transparent)] px-3 py-2.5 text-[13px] leading-relaxed text-muted">
              <Check
                size={14}
                strokeWidth={3}
                className="mt-0.5 shrink-0 text-[var(--q-best)]"
                aria-hidden
              />
              <span>
                <strong className="font-semibold text-[var(--q-best)]">
                  {t('streak.dailyAlreadyDone')}
                </strong>
                {niveauDefi ? ` — la position valait ${niveauDefi}.` : '.'} La prochaine arrive à
                minuit.
              </span>
            </p>
          ) : null}

          {/* ── Les autres quêtes, et la barre de la journée ─────────── */}
          <div className={clsx('mt-4', (defi || defiFait) && 'border-t border-line/50 pt-4')}>
            <div
              className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
              role="progressbar"
              aria-valuenow={xp}
              aria-valuemin={0}
              aria-valuemax={XP_TOTAL}
              aria-label={t('today.pointsAria')}
            >
              <div
                className="h-full rounded-full bg-[var(--teinte)] transition-[width] duration-500"
                style={{ width: `${(xp / XP_TOTAL) * 100}%` }}
              />
            </div>
            <ListeDesQuetes etat={etat} teinte="var(--teinte)" />
          </div>

          {/* Les tranches plus dures, discrètes : c'est un écart qu'on prend
              certains jours, pas une consigne. */}
          {superieures.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-faint">
              <Swords size={11} aria-hidden />
              <span>{t('daily.harder')}</span>
              {superieures.map((autre) => (
                <Link
                  key={autre.id}
                  href={`/puzzles?defi=1&tranche=${autre.id}`}
                  className="rounded-full border border-line px-2 py-0.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {autre.nom}
                </Link>
              ))}
            </p>
          )}
        </div>

        {/* ── La position, à droite ────────────────────────────────── */}
        {plateau && defi && (
          <Link
            href={defi.lien}
            aria-label={defi.action}
            className="group mx-auto block w-full max-w-[240px] md:w-[200px] lg:w-[224px]"
          >
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
            <p className="mt-1.5 text-center text-[12px] text-faint">
              {auTrait === 'w' ? t('puzzles.whiteToPlay') : t('puzzles.blackToPlay')}
            </p>
          </Link>
        )}
      </div>
    </Card>
  )
}
