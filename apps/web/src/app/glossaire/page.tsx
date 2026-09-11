'use client'

/**
 * Glossaire des échecs.
 *
 * Les définitions des motifs existaient déjà — elles alimentent les
 * explications d'analyse — mais on ne pouvait les lire qu'en survolant une
 * étiquette, au hasard d'une partie. Difficile d'apprendre un vocabulaire
 * qu'on ne peut pas parcourir.
 *
 * Deux sources réunies ici : le vocabulaire général du jeu, et les motifs que
 * le coach sait nommer. C'est volontaire — quand l'analyse dit « fou de
 * mauvaise couleur », il faut pouvoir chercher les deux moitiés de la phrase
 * au même endroit. Les mots présents des deux côtés ne s'affichent qu'une
 * fois : voir `entries`.
 *
 * Une bonne part d'entre eux s'ouvre sur un échiquier, où le mot se montre au
 * lieu de se décrire : voir `glossaire-positions.ts`.
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

/**
 * Une définition, en deux temps.
 *
 * Elles font entre trois et huit lignes, sans une respiration : sur un
 * téléphone, une carte du glossaire était un pavé gris de dix lignes, et
 * soixante-quatorze pavés à la suite ne se parcourent pas — on ne peut que les
 * lire tous, ou aucun. Or on vient ici avec un mot en tête.
 *
 * La **première phrase est la définition** ; tout ce qui suit est le
 * commentaire, l'exemple, l'erreur classique. C'est vrai des soixante-quatorze,
 * parce qu'elles sont écrites ainsi. On la sort donc du bloc, en pleine
 * couleur, et le reste attend qu'on le demande : trois lignes en aperçu, puis
 * « Lire la suite ». La carte fait alors quatre lignes au lieu de dix, et la
 * page redevient une liste qu'on balaie.
 *
 * Rien n'est perdu et rien n'est caché derrière un geste inutile : les
 * définitions courtes — il y en a — s'affichent d'un bloc, sans bouton.
 */
function Definition({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false)
  const { chapeau, suite } = couperEnDeux(texte)

  return (
    <dd className="mt-1.5">
      <p className="text-[14px] leading-relaxed text-ink/90">{renderBold(chapeau)}</p>
      {suite && (
        <>
          <p
            className={clsx(
              'mt-1.5 text-[14px] leading-relaxed text-muted',
              !ouvert && 'line-clamp-3',
            )}
          >
            {renderBold(suite)}
          </p>
          <button
            type="button"
            onClick={() => setOuvert((etat) => !etat)}
            aria-expanded={ouvert}
            className="mt-1 text-[12px] font-medium text-accent transition-colors hover:underline"
          >
            {ouvert ? 'Réduire' : 'Lire la suite'}
          </button>
        </>
      )}
    </dd>
  )
}

/**
 * Sépare la première phrase du reste.
 *
 * On coupe au premier point suivi d'une espace **et** d'une majuscule ou d'un
 * guillemet : c'est ce qui distingue une fin de phrase d'un « 1.e4 » ou d'un
 * « 3 | 2 », où le point n'est suivi de rien. En cas de doute — aucune coupure
 * trouvée, phrase unique, ou coupure qui tomberait au milieu d'un `**gras**` —
 * on rend le texte entier en chapeau : mieux vaut un pavé qu'une phrase
 * tronquée au mauvais endroit.
 */
function couperEnDeux(texte: string): { chapeau: string; suite: string | null } {
  const court = texte.length < 170
  const coupure = texte.match(/^(.+?[.!?])\s+(?=[«"A-ZÀÂÇÉÈÊËÎÏÔÙÛÜ])/u)
  const chapeau = coupure?.[1]
  if (court || !chapeau || chapeau.length > texte.length - 30) {
    return { chapeau: texte, suite: null }
  }
  // Un `**` orphelin voudrait dire qu'on a coupé au milieu d'un passage en
  // gras : les astérisques se liraient alors à l'écran.
  const paires = (chapeau.match(/\*\*/g) ?? []).length
  if (paires % 2 !== 0) return { chapeau: texte, suite: null }

  return { chapeau, suite: texte.slice(chapeau.length).trim() }
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

  /**
   * Toutes les entrées, motifs compris — et dédoublonnées.
   *
   * Huit mots existent des deux côtés : « Pion passé », « Mauvais fou »,
   * « Prise en passant », « Promotion »… Le cœur les définit parce que le coach
   * s'en sert pour commenter un coup ; le glossaire général les définit parce
   * qu'un débutant les rencontre dès sa première partie. Les deux textes disent
   * la même chose autrement, et la page les affichait **tous les deux**, dans
   * deux sections différentes — on tombait sur « Pion passé » en parcourant les
   * pions, puis de nouveau cent lignes plus bas, et l'on cherchait la nuance
   * qu'il n'y avait pas.
   *
   * Le mot général l'emporte : il est écrit pour être lu de bout en bout, là où
   * la définition d'un motif est faite pour tenir dans une infobulle au-dessus
   * d'un échiquier. Rien n'est perdu — celle du cœur continue de servir là où
   * elle a été écrite, dans les explications de coups et sur l'écran de
   * puzzles.
   */
  const entries = useMemo(() => {
    const connus = new Set(TERMS.map((terme) => terme.name))
    const motifs = motifGlossary(locale)
      .filter((motif) => !connus.has(motif.name))
      .map((motif) => ({
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

  /**
   * Combien de mots s'ouvrent sur un échiquier.
   *
   * Compté sur les entrées réellement affichées, et non sur la taille du
   * catalogue : une position écrite pour un mot qui n'existe plus se
   * compterait toute seule. Le contrôle `check:glossaire` refuse déjà ce cas,
   * mais la page n'a pas à faire confiance à un contrôle qu'elle ne lance pas.
   */
  const illustres = useMemo(
    () => entries.filter((entree) => POSITIONS_DU_GLOSSAIRE[entree.name]).length,
    [entries],
  )

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
    <div className="page">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Glossaire</h1>
      <p className="mt-2 max-w-2xl text-muted max-lg:text-[14px] max-lg:leading-relaxed">
        {entries.length} termes définis en français clair — les règles, le matériel, les phases de
        la partie, et les motifs que le coach sait reconnaître et nommer dans tes parties.{' '}
        {illustres} d’entre eux se montrent sur un échiquier : leur nom porte une pastille.
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
                    <Definition texte={entry.definition} />
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
