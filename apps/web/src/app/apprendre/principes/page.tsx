'use client'

/**
 * Les principes, et le mémo d'avant chaque coup.
 *
 * Tout le reste de l'application explique des **coups** : celui qu'on vient de
 * jouer, celui qu'on aurait pu jouer, pourquoi l'un vaut mieux que l'autre.
 * Rien n'expliquait ce qu'il faut se dire *avant*, quand il n'y a pas encore de
 * coup à commenter — et c'est précisément là que se gagnent les premiers
 * points.
 *
 * Deux blocs, deux usages :
 *
 *  - le **mémo** se lit pendant une partie, d'où sa longueur : quatre
 *    questions. Il est aussi disponible sur l'échiquier, en aide désactivable
 *    comme les autres (voir `AideMemoire`) ;
 *  - les **principes** se lisent entre les parties, et chacun porte son
 *    contre-exemple. Un principe sans exception devient une superstition : on
 *    développe ses pièces pendant qu'on se fait mater.
 *
 * La page se lit à voix haute, bouton par bouton, comme le glossaire : c'est le
 * genre de texte qu'on révise en faisant autre chose.
 */

import { useState } from 'react'
import { BookOpen, ListChecks, Play, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { ButtonLink, Card, Chip, SegmentedControl, TitreDePage } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { BoutonEcouter } from '@/components/ui/BoutonEcouter.tsx'
import { TexteAvecOuvertures } from '@/components/ouvertures/TexteAvecOuvertures.tsx'
import { Toggle } from '@/components/ui/index.tsx'
import {
  FAMILLES_PRINCIPES,
  MEMO_AVANT_COUP,
  PRINCIPES,
  type FamillePrincipe,
} from '@/lib/apprendre/principes.ts'
import { useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

const TEINTE = 'var(--rub-apprendre)'

/**
 * Les quatre familles de principes, par clé de dictionnaire.
 *
 * `FamillePrincipe` est un type littéral français — c'est l'identifiant qui lie
 * un principe à sa phase, et il n'a pas à changer. Mais le sélecteur affichait
 * cet identifiant tel quel : « Ouverture », « Finale » et « Jeu positionnel »
 * restaient en français partout, et seul « Milieu de partie » était traduit,
 * parce que la page le raccourcissait par une comparaison de chaîne.
 */
const CLE_FAMILLE: Record<FamillePrincipe, TranslationKey> = {
  Ouverture: 'principles.opening',
  'Milieu de partie': 'principles.middlegameShort',
  Finale: 'principles.endgame',
  'Jeu positionnel': 'principles.positional',
}

export default function PrincipesPage() {
  const t = useT()
  /** Famille affichée, ou `null` pour tout. */
  const [famille, setFamille] = useState<FamillePrincipe | 'toutes'>('toutes')
  const memoEnPartie = usePreferences((state) => state.memoAvantCoup)
  const reglerPreference = usePreferences((state) => state.set)

  const visibles =
    famille === 'toutes' ? PRINCIPES : PRINCIPES.filter((principe) => principe.famille === famille)

  return (
    <div className="page">
      <TitreDePage intro={t('principles.intro', { n: PRINCIPES.length })}>
        {t('principles.title')}
      </TitreDePage>

      {/* ── Le mémo ─────────────────────────────────────────────────────────
          En tête, en grand, numéroté : c'est la seule partie de la page qu'on
          est censé retenir par cœur. Les trente-neuf principes qui suivent se
          consultent ; ces quatre questions se récitent. */}
      <Card className="overflow-hidden">
        <EnTeteDeCarte
          titre={t('bits.beforeEachMove')}
          icone={<ListChecks size={14} aria-hidden />}
          teinte={TEINTE}
          fin={
            <BoutonEcouter
              quoi={t('principles.theMemo')}
              texte={`${t('principles.beforeEveryMove')} ${MEMO_AVANT_COUP.map((entree, rang) =>
                t('principles.spokenMemo', {
                  rang: rang + 1,
                  question: t(entree.question),
                  comment: t(entree.comment),
                }),
              ).join(' ')}`}
            />
          }
        />
        <div className="p-4 sm:p-5">
          <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted">
            {t('principles.memoHint')}
          </p>

          <ol className="space-y-2">
            {MEMO_AVANT_COUP.map((entree, rang) => (
              <li
                key={entree.id}
                className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-line bg-bg-elev p-3.5"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[14px] font-bold tabular-nums"
                  style={{
                    background: `color-mix(in oklab, ${TEINTE} 16%, transparent)`,
                    color: `color-mix(in oklab, ${TEINTE} 78%, var(--text))`,
                  }}
                  aria-hidden
                >
                  {rang + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-snug">
                    {t(entree.question)}
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-muted">
                    {t(entree.comment)}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {/* L'interrupteur est ici plutôt que seulement dans les préférences :
              c'est sur cette page qu'on comprend à quoi sert l'aide, donc c'est
              ici qu'on veut l'allumer. Le réglage est le même des deux côtés. */}
          <div className="mt-5 rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 py-1.5">
            <Toggle
              checked={memoEnPartie}
              onChange={(valeur) => reglerPreference('memoAvantCoup', valeur)}
              label={t('principles.showInGame')}
              description={t('principles.showInGameHint')}
            />
          </div>
        </div>
      </Card>

      {/* ── Les principes ───────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {t('principles.listTitle')}
          </h2>
          <p className="text-[12px] text-faint">
            {t('principles.shownCount', { n: visibles.length })}
          </p>
        </div>

        <div className="mb-4">
          <SegmentedControl
            size="sm"
            label={t('principles.phase')}
            value={famille}
            onChange={setFamille}
            options={[
              { value: 'toutes' as const, label: t('principles.allPhases') },
              ...FAMILLES_PRINCIPES.map((entree) => ({
                value: entree,
                label: t(CLE_FAMILLE[entree]),
              })),
            ]}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibles.map((principe) => (
            <Card key={principe.id} className="p-4">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                  {t(principe.regle)}
                </p>
                <BoutonEcouter
                  quoi="ce principe"
                  texte={t('principles.spokenPrinciple', {
                    regle: t(principe.regle),
                    pourquoi: t(principe.pourquoi),
                    sauf: t(principe.sauf),
                  })}
                  className="-mr-1 -mt-1"
                />
              </div>

              {famille === 'toutes' && (
                <Chip className="mt-2">{t(CLE_FAMILLE[principe.famille])}</Chip>
              )}

              {/* Les noms d'ouverture cités deviennent des liens vers leur
                  fiche. C'est surtout vrai des exceptions : « sauf les
                  ouvertures qui contrôlent le centre de loin — est-indienne,
                  sicilienne » ne veut rien dire pour qui ne les connaît pas, et
                  c'est précisément la moitié de l'information qu'on vient
                  chercher ici. */}
              <TexteAvecOuvertures
                texte={t(principe.pourquoi)}
                className="mt-2 text-[14px] leading-relaxed text-muted"
              />

              {/* Le contre-exemple porte un liseré, pas une couleur de danger :
                  ce n'est pas un avertissement, c'est la moitié de
                  l'information. */}
              <p
                className={clsx(
                  'mt-2.5 border-l-2 pl-3 text-[13px] leading-relaxed text-muted',
                  'border-[color-mix(in_oklab,var(--q-inaccuracy)_45%,transparent)]',
                )}
              >
                <span className="font-semibold text-ink">{t('bits.except')} </span>
                <TexteAvecOuvertures as="span" texte={t(principe.sauf)} />
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Et ensuite ──────────────────────────────────────────────────── */}
      <Card className="mt-8 overflow-hidden">
        <EnTeteDeCarte
          titre={t('principles.practise')}
          icone={<Play size={14} aria-hidden />}
          teinte="var(--rub-jouer)"
        />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <p className="min-w-[14rem] flex-1 text-[14px] leading-relaxed text-muted">
            {t('principles.practiseHint')}
          </p>
          <ButtonLink href="/jouer/pedagogique" variant="primary" icon={<Play size={15} />}>
            {t('tier.session')}
          </ButtonLink>
          <ButtonLink href="/glossaire" icon={<BookOpen size={15} />}>
            {t('nav.glossary')}
          </ButtonLink>
        </div>
      </Card>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
        <Volume2 size={12} aria-hidden />
        {t('principles.readAloud')}
      </p>

      <AutresDeLaSection section="progresser" />
    </div>
  )
}
