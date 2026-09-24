'use client'

/**
 * La pertinence des coups, en fin de partie.
 *
 * On savait déjà dire d'un coup qu'il était une gaffe — la liste des coups le
 * colore pendant qu'on joue. Mais la partie finie, tout ça disparaissait sous
 * une boîte qui annonçait « Victoire ! » et « {n} demi-coups joués ». On
 * repartait sans savoir si on avait bien joué : gagner contre quelqu'un qui
 * gaffe plus que soi n'apprend rien.
 *
 * Un chiffre par camp, donc, et le détail juste en dessous pour qui veut savoir
 * d'où il sort. C'est le même calcul que la page d'analyse — `gameAccuracy` —
 * sur les verdicts déjà obtenus pendant la partie : rien ne repart au moteur.
 *
 * Le détail est replié par défaut. Onze lignes de barème dans une boîte de fin
 * de partie repoussent « Rejouer » et « Analyser » hors de l'écran d'un
 * téléphone, et c'est vers eux qu'on va neuf fois sur dix.
 */

import { useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { Color } from 'chess.js'
import { QUALITY_STYLES, type MoveQuality } from '@coupparfait/core'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { BilanDesCoups as Bilan } from '@/lib/game/useQualitesDesCoups.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

/**
 * Le barème, dans l'ordre du meilleur au pire.
 *
 * `forced` n'y est pas : un coup obligé n'est le mérite de personne, et une
 * ligne « Coup forcé : 3 » ne dit rien de la façon dont on a joué.
 */
const ORDRE: MoveQuality[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
]

/**
 * La couleur d'un pourcentage.
 *
 * On réutilise la palette des verdicts plutôt que d'en inventer une : le vert
 * de « 92 % » est exactement celui du ★ de la liste des coups, et le rouge de
 * « 31 % » celui des gaffes qui l'ont fait descendre. Le chiffre et ses causes
 * parlent la même langue.
 */
function teinteDeLaPrecision(valeur: number): string {
  if (valeur >= 90) return 'var(--q-brilliant)'
  if (valeur >= 80) return 'var(--q-best)'
  if (valeur >= 65) return 'var(--q-good)'
  if (valeur >= 50) return 'var(--q-inaccuracy)'
  if (valeur >= 35) return 'var(--q-mistake)'
  return 'var(--q-blunder)'
}

export function BilanDesCoups({
  bilan,
  noms,
  className,
}: {
  bilan: Bilan
  /** Comment nommer chaque camp — « Toi », le pseudo de l'adversaire, ou rien. */
  noms: Record<Color, string>
  className?: string
}) {
  const t = useT()
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  const [deplie, setDeplie] = useState(false)

  // Sans un seul verdict, il n'y a pas de bilan à montrer : mieux vaut ne rien
  // afficher qu'une boîte pleine de tirets.
  if (bilan.total === 0 || bilan.juges === 0) return null

  const camps: Color[] = ['w', 'b']
  const enCours = !bilan.complet
  const avancement = Math.round((bilan.juges / bilan.total) * 100)

  const nombre = (valeur: number, decimales = 1) =>
    valeur.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })

  // Une ligne de barème vide des deux côtés n'apprend rien : on la retire.
  const lignes = ORDRE.filter((q) => bilan.w.comptes[q] > 0 || bilan.b.comptes[q] > 0)

  return (
    <section
      className={clsx('rounded-[var(--radius-sm)] bg-surface px-3 py-2.5 text-left', className)}
      aria-busy={enCours}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-semibold text-faint">{t('moveReport.title')}</h3>
        {enCours && (
          <span className="shrink-0 text-[11px] tabular-nums text-faint">
            {t('moveReport.analysingProgress', { n: bilan.juges, total: bilan.total })}
          </span>
        )}
      </div>

      {/* L'avancement, tant que le moteur n'a pas tout vu.

          Sans lui, le chiffre bougeait tout seul sous les yeux du joueur sans
          qu'on lui dise pourquoi, et il n'avait aucun moyen de savoir si celui
          qu'il lisait était le bon. */}
      {enCours && (
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-line/60" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${avancement}%` }}
          />
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        {camps.map((camp) => {
          const côté = bilan[camp]
          return (
            <div key={camp} className="min-w-0 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted">
                <span
                  className={clsx(
                    'h-2 w-2 shrink-0 rounded-full',
                    camp === 'w'
                      ? 'bg-[var(--eval-white)]'
                      : 'bg-[var(--eval-black)] ring-1 ring-line',
                  )}
                  aria-hidden
                />
                <span className="truncate">{noms[camp]}</span>
              </p>
              <p
                className={clsx(
                  'font-display text-2xl font-bold tabular-nums transition-opacity',
                  enCours && 'opacity-60',
                )}
                style={{
                  color: côté.precision === null ? undefined : teinteDeLaPrecision(côté.precision),
                }}
              >
                {côté.precision === null ? '—' : nombre(côté.precision)}
                <span className="text-sm font-semibold"> %</span>
              </p>
              {côté.centipions !== null && (
                <p
                  className="text-[11px] tabular-nums text-faint"
                  title={t('moveReport.acplTitle')}
                >
                  {t('moveReport.centipawnsLost', { n: côté.centipions })}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {lignes.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setDeplie((ouvert) => !ouvert)}
            aria-expanded={deplie}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-[var(--radius-sm)] py-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
          >
            {t(deplie ? 'moveReport.hideDetail' : 'moveReport.showDetail')}
            <ChevronDown
              size={13}
              aria-hidden
              className={clsx('transition-transform', deplie && 'rotate-180')}
            />
          </button>

          {deplie && (
            <ul className="mt-1 space-y-0.5 border-t border-line/60 pt-2">
              {lignes.map((quality) => {
                const style = QUALITY_STYLES[quality]
                return (
                  /* Colonnes de largeur fixe pour les chiffres : avec des
                     colonnes souples, chaque nombre se collait à son étiquette
                     et se retrouvait à une abscisse différente selon que la
                     ligne disait « Gaffe » ou « Occasion manquée ». On ne
                     pouvait plus lire une colonne d'un coup d'œil, ce qui est
                     pourtant tout l'intérêt d'un tableau à deux camps. */
                  <li
                    key={quality}
                    className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2 text-[12px]"
                    title={`${tCoeur(t, style.label)} — ${tCoeur(t, style.description)}`}
                  >
                    <span className="text-center font-semibold tabular-nums">
                      {bilan.w.comptes[quality]}
                    </span>
                    <span
                      className="inline-flex min-w-0 items-center justify-center gap-1 justify-self-center rounded-[var(--radius-sm)] px-1.5 py-0.5 font-semibold"
                      style={{
                        background: `color-mix(in oklab, var(--q-${style.token}) 16%, transparent)`,
                        color: `var(--q-${style.token})`,
                      }}
                    >
                      <span aria-hidden>{style.glyph}</span>
                      <span className="truncate">{tCoeur(t, style.label)}</span>
                    </span>
                    <span className="text-center font-semibold tabular-nums">
                      {bilan.b.comptes[quality]}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
