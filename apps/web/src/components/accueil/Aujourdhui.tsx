'use client'

/**
 * La journée, en une carte compacte.
 *
 * Elle remplace, sur l'accueil connecté, la carte « Le défi du jour » — qui
 * faisait quatre choses sous un titre qui n'en annonçait qu'une : le défi, les
 * deux tranches plus dures, la barre de points, et les cinq quêtes. La liste des
 * quêtes occupait à elle seule les deux tiers de la hauteur, alors qu'elle n'est
 * pas le défi.
 *
 * Ici, les quêtes redeviennent ce qu'elles sont : un état, pas une destination.
 * Cinq lignes courtes, une barre, et c'est tout. Le défi du jour, lui, est
 * remonté dans « Maintenant » tant qu'il n'est pas résolu — c'est la seule chose
 * de l'écran qui expire, elle n'a rien à faire au milieu d'un bilan.
 *
 * `DefiDuJour` reste en place pour l'accueil public, où il joue un autre rôle :
 * montrer à un visiteur ce qu'un compte lui apporterait.
 *
 * **« points du jour » et non « points ».** L'en-tête de l'accueil affiche déjà
 * un total — l'expérience de carrière, plusieurs milliers. Deux compteurs
 * appelés du même nom sur le même écran, dont l'un est sur quatre-vingts et
 * l'autre sur des milliers, se lisent comme une incohérence. Trois mots
 * suffisent à les distinguer.
 */

import Link from 'next/link'
import { Check, Swords } from 'lucide-react'
import clsx from 'clsx'
import { tranchesAuDessus } from '@coupparfait/core'
import { Card } from '@/components/ui/index.tsx'
import { QUETES, XP_TOTAL } from '@/lib/daily/quetes.ts'
import { queteFaite } from '@/lib/daily/quotidien.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'

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
}: {
  defiFait: boolean
  /** Tranche servie aujourd'hui, pour proposer celles du dessus. */
  tranche: TrancheDefi | null
  /** Cote du puzzle du jour, s'il est connu. */
  niveauDefi: number | null
}) {
  const { etat, xp } = useQuotidien()
  const superieures = tranche ? tranchesAuDessus(tranche) : []

  return (
    <Card className="overflow-hidden">
      {/* Le liseré vert, comme la teinte de chapitre sur la carte voisine.
          C'est ce qui se voit sans lire, et c'est tout l'objet : la question
          « est-ce que j'ai fait le défi aujourd'hui ? » doit se répondre d'un
          coup d'œil, pas en cherchant une ligne au milieu d'une liste. */}
      {defiFait && <div className="h-1 bg-[var(--q-best)]" aria-hidden />}

      <div className="flex items-baseline justify-between gap-2 border-b border-line/60 px-4 py-2.5">
        {defiFait ? (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--q-best)]">
            <Check size={12} strokeWidth={3} aria-hidden />
            Défi du jour relevé
          </p>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Aujourd’hui</p>
        )}
        <p className="text-[11px] tabular-nums text-muted">
          {xp} / {XP_TOTAL} points du jour
        </p>
      </div>

      <div className="px-4 pb-3 pt-3">
        <div
          className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemin={0}
          aria-valuemax={XP_TOTAL}
          aria-label="Points du jour"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${(xp / XP_TOTAL) * 100}%` }}
          />
        </div>

        {/* Le défi résolu se dit ici, et une seule fois. Non résolu, il est en
            tête de page dans « Maintenant » : le répéter à deux endroits ferait
            deux boutons pour une position unique. */}
        {defiFait && (
          <p className="mb-2.5 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-best)_10%,transparent)] px-2.5 py-2 text-[12px] leading-relaxed text-muted">
            {niveauDefi ? `La position du jour valait ${niveauDefi}. ` : ''}
            La prochaine arrive à minuit — reviens demain.
          </p>
        )}

        <ul className="space-y-1">
          {QUETES.map((quete) => {
            const faite = etat ? queteFaite(etat, quete.id) : false
            const avancement = etat?.avancement[quete.id] ?? 0
            return (
              <li
                key={quete.id}
                className={clsx(
                  'flex items-center gap-2 text-[13px]',
                  faite ? 'text-faint line-through' : 'text-muted',
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    faite ? 'border-[var(--q-best)] bg-[var(--q-best)] text-white' : 'border-line',
                  )}
                >
                  {faite && <Check size={11} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{quete.label}</span>
                {!faite && quete.objectif > 1 && (
                  <span className="shrink-0 text-[11px] tabular-nums text-faint">
                    {avancement} / {quete.objectif}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {/* Les tranches plus dures, discrètes : c'est un écart qu'on prend
            certains jours, pas une consigne. Elles restent affichées même une
            fois le défi relevé — c'est justement là qu'on veut se mesurer plus
            haut. */}
        {superieures.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/40 pt-2.5 text-[11px] text-faint">
            <Swords size={11} aria-hidden />
            <span>Plus dur&nbsp;:</span>
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
    </Card>
  )
}
