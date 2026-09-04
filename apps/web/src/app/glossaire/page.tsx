'use client'

/**
 * Glossaire des échecs.
 *
 * Les définitions des motifs existaient déjà — elles alimentent les
 * explications d'analyse — mais on ne pouvait les lire qu'en survolant une
 * étiquette, au hasard d'une partie. Difficile d'apprendre un vocabulaire
 * qu'on ne peut pas parcourir.
 *
 * Deux sources réunies ici : le vocabulaire général du jeu, et les 44 motifs
 * que le coach sait nommer. C'est volontaire — quand l'analyse dit « fou de
 * mauvaise couleur », il faut pouvoir chercher les deux moitiés de la phrase
 * au même endroit.
 */

import { useMemo, useState } from 'react'
import { Grid3x3, Search } from 'lucide-react'
import clsx from 'clsx'
import { motifGlossary } from '@coupparfait/core'
import { Card, Chip } from '@/components/ui/index.tsx'
import { FAMILIES, TERMS } from '@/lib/glossaire.ts'
import { POSITIONS_DU_GLOSSAIRE } from '@/lib/glossaire-positions.ts'
import { BoiteTerme } from '@/components/glossaire/BoiteTerme.tsx'
import { renderBold } from '@/lib/gras.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

/** Ignore accents et casse : on cherche « echec » et on trouve « échec ». */
function normalise(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function GlossaryPage() {
  const locale = usePreferences((state) => state.locale)
  const [query, setQuery] = useState('')
  /**
   * Le terme qu'on veut voir sur l'échiquier.
   *
   * L'état vit ici et non dans chaque carte : une seule boîte à la fois, et
   * elle se referme d'elle-même quand la recherche change la liste.
   */
  const [montre, setMontre] = useState<{ name: string; definition: string } | null>(null)

  /** Toutes les entrées, motifs compris, dans un seul ensemble consultable. */
  const entries = useMemo(() => {
    const motifs = motifGlossary(locale).map((motif) => ({
      name: motif.name,
      definition: motif.definition,
      family: 'Motifs tactiques' as const,
    }))
    return [...TERMS, ...motifs]
  }, [locale])

  const filtered = useMemo(() => {
    const needle = normalise(query.trim())
    if (needle.length < 2) return entries
    return entries.filter(
      (entry) =>
        normalise(entry.name).includes(needle) || normalise(entry.definition).includes(needle),
    )
  }, [entries, query])

  const groups = useMemo(() => {
    const order = [...FAMILIES, 'Motifs tactiques']
    return order
      .map((family) => ({
        family,
        items: filtered
          .filter((entry) => entry.family === family)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      }))
      .filter((group) => group.items.length > 0)
  }, [filtered])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Glossaire</h1>
      <p className="mt-2 max-w-2xl text-muted max-lg:text-[13px] max-lg:leading-relaxed">
        {entries.length} termes définis en français clair — les règles, le matériel, les phases de
        la partie, et les {motifGlossary(locale).length} motifs que le coach sait reconnaître et
        nommer dans tes parties.
      </p>

      {/* ── Recherche ────────────────────────────────────────────────── */}
      <div className="relative mt-6">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un mot, ou une idée dans les définitions…"
          aria-label="Chercher dans le glossaire"
          className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </div>

      {groups.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          Aucun terme ne correspond à « {query} ».
        </p>
      )}

      {/* ── Définitions ──────────────────────────────────────────────── */}
      <div className="mt-8 space-y-10">
        {groups.map(({ family, items }) => (
          <section key={family}>
            <div className="mb-3 flex items-baseline gap-2.5">
              <h2 className="font-display text-xl font-bold tracking-tight">{family}</h2>
              <Chip>{items.length}</Chip>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              {items.map((entry) => {
                // Certains mots se montrent, les autres se lisent. La carte
                // ne devient cliquable que s'il y a quelque chose à voir :
                // un bouton qui n'ouvre rien coûte plus cher qu'une carte
                // inerte.
                const position = POSITIONS_DU_GLOSSAIRE[entry.name]
                return (
                  <Card
                    key={`${family}-${entry.name}`}
                    className={clsx('p-4', 'transition-colors hover:bg-surface-hover')}
                  >
                    <dt className="text-sm font-semibold text-ink">
                      {position ? (
                        <button
                          type="button"
                          onClick={() =>
                            setMontre({ name: entry.name, definition: entry.definition })
                          }
                          className="group inline-flex items-center gap-1.5 text-left transition-colors hover:text-accent"
                          aria-label={`Voir « ${entry.name} » sur l’échiquier`}
                        >
                          <span className="group-hover:underline">{entry.name}</span>
                          <Grid3x3
                            size={12}
                            className="shrink-0 text-faint transition-colors group-hover:text-accent"
                            aria-hidden
                          />
                        </button>
                      ) : (
                        entry.name
                      )}
                    </dt>
                    <dd className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {renderBold(entry.definition)}
                    </dd>
                  </Card>
                )
              })}
            </dl>
          </section>
        ))}
      </div>

      {/* Ce qui se montre, montré. Les motifs tactiques n'ont pas encore leur
          position : leurs définitions viennent du cœur, et l'illustration se
          fait aujourd'hui sur les mots du vocabulaire général. */}
      {montre && POSITIONS_DU_GLOSSAIRE[montre.name] && (
        <BoiteTerme
          nom={montre.name}
          definition={montre.definition}
          position={POSITIONS_DU_GLOSSAIRE[montre.name]!}
          onFermer={() => setMontre(null)}
        />
      )}
    </div>
  )
}
