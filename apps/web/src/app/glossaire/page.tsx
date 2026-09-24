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
import { Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { FAMILIES, TERMS, termesSynonymes } from '@/lib/glossaire.ts'
import { POSITIONS_DU_GLOSSAIRE } from '@/lib/glossaire-positions.ts'
import { BoiteTerme } from '@/components/glossaire/BoiteTerme.tsx'
import { BoutonEcouter } from '@/components/ui/BoutonEcouter.tsx'
import { renderBold } from '@/lib/gras.tsx'
import { avecElements, langue, useI18n, useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

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
  const t = useT()
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
            {t(ouvert ? 'last.hide' : 'last.readMore')}
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

/**
 * Les cinq familles du glossaire, par clé de dictionnaire.
 *
 * `Term.family` est un type littéral français : c'est l'identifiant du
 * regroupement, et il n'a pas à changer. Mais la page l'affichait tel quel, si
 * bien qu'on lisait « Règles » et « Motifs tactiques » au-dessus de définitions
 * anglaises.
 */
/**
 * L'identifiant de la famille des motifs, qu'aucun fichier du glossaire ne
 * déclare : les motifs viennent du cœur. Un identifiant, pas un texte — ce qui
 * s'affiche est `nav.famMotifs`.
 */
const FAMILLE_MOTIFS = 'Motifs tactiques'

const CLE_FAMILLE: Record<string, TranslationKey> = {
  Règles: 'nav.famRegles',
  'Pièces et matériel': 'nav.famPieces',
  'Phases de la partie': 'nav.famPhases',
  'Évaluation et jeu': 'nav.famEvaluation',
  [FAMILLE_MOTIFS]: 'nav.famMotifs',
}

export default function GlossaryPage() {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const [query, setQuery] = useState('')
  /**
   * Le terme qu'on veut voir sur l'échiquier.
   *
   * L'état vit ici et non dans chaque carte : une seule boîte à la fois, et
   * elle se referme d'elle-même quand la recherche change la liste.
   */
  const [montre, setMontre] = useState<{ cle: string; name: string; definition: string } | null>(
    null,
  )

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
    /*
      Les deux moitiés du vocabulaire, ramenées à la même forme.

      Le glossaire porte des clés de dictionnaire depuis qu'il existe en
      plusieurs langues ; les motifs viennent du cœur, qui les rend déjà écrits
      dans la langue du contenu. On résout les premiers ici, et chaque entrée
      garde en plus sa **clé stable** — c'est elle qui retrouve la position
      illustrée, là où l'on cherchait auparavant par le nom affiché, qui change
      avec la langue.
    */
    const termes = TERMS.map((terme) => ({
      cle: terme.id,
      name: t(terme.name),
      definition: t(terme.definition),
      family: terme.family,
    }))
    const connus = new Set(termes.map((terme) => terme.name))
    const motifs = motifGlossary()
      .map((motif) => ({
        cle: motif.id as string,
        name: tCoeur(t, motif.name),
        definition: tCoeur(t, motif.definition),
        family: FAMILLE_MOTIFS,
      }))
      .filter((motif) => !connus.has(motif.name))
    return [...termes, ...motifs]
  }, [t])

  /**
   * Les termes que le lexique ajoute à la recherche.
   *
   * Le glossaire définit le vocabulaire juste ; ce n'est pas celui qu'on tape.
   * On cherche « épingle », « nulle », « mat en 1 », « je stagne », ou le mot
   * anglais qu'on a appris sur une autre interface — et la page ne rendait rien,
   * ce qui laisse croire qu'elle ne connaît pas le sujet. Voir `SYNONYMES`.
   */
  const parLexique = useMemo(() => termesSynonymes(query), [query])

  const filtered = useMemo(() => {
    const needle = normalise(query.trim())
    if (needle.length < 2) return entries
    return entries.filter(
      (entry) =>
        normalise(entry.name).includes(needle) ||
        normalise(entry.definition).includes(needle) ||
        parLexique.includes(entry.name),
    )
  }, [entries, query, parLexique])

  /**
   * Le lexique a-t-il trouvé ce que la recherche littérale ne trouvait pas ?
   *
   * Sert à le dire. Quelqu'un qui tape « épingle » et voit apparaître
   * « Clouage » doit comprendre pourquoi, sans quoi il croit à un bug de
   * recherche — et il n'apprend pas que le mot juste est « clouage », ce qui
   * était tout l'intérêt.
   */
  const litteral = useMemo(() => {
    const needle = normalise(query.trim())
    if (needle.length < 2) return true
    return entries.some(
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
    () => entries.filter((entree) => POSITIONS_DU_GLOSSAIRE[entree.cle]).length,
    [entries],
  )

  const groups = useMemo(() => {
    const order = [...FAMILIES, FAMILLE_MOTIFS]
    return order
      .map((family) => ({
        family,
        // Le tri suit la langue affichée et non le français : « Castling »
        // avant « Checkmate » en anglais, « Cadence » avant « Clouage » en
        // français, et l'ordre des accents change d'une langue à l'autre.
        items: filtered
          .filter((entry) => entry.family === family)
          .sort((a, b) => a.name.localeCompare(b.name, bcp47)),
      }))
      .filter((group) => group.items.length > 0)
  }, [filtered, bcp47])

  return (
    <div className="page">
      <TitreDePage intro={t('nav.glossaryIntro', { n: entries.length, illustres })}>
        {t('nav.glossary')}
      </TitreDePage>

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
          placeholder={t('misc.searchGlossary')}
          aria-label={t('misc.searchGlossaryAria')}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </div>

      {/* Le lexique a répondu à la place de la recherche littérale : on le dit,
          et on nomme le mot juste. C'est la moitié de l'intérêt — on vient avec
          « épingle » et on repart en sachant qu'on dit « clouage ». */}
      {!litteral && parLexique.length > 0 && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {/* « a, b ou c » : la liste suit la langue, conjonction comprise —
              Intl la construit, et chaque terme y reste en gras. */}
          {avecElements(t('misc.glossaryNotOurWord', { mot: query.trim() }), {
            termes: new Intl.ListFormat(bcp47, { type: 'disjunction' })
              .formatToParts(parLexique)
              .map((part, rang) =>
                part.type === 'element' ? (
                  <strong key={rang} className="text-ink">
                    {part.value}
                  </strong>
                ) : (
                  <span key={rang}>{part.value}</span>
                ),
              ),
          })}
        </p>
      )}

      {groups.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          {t('misc.glossaryNoMatch', { mot: query })}
        </p>
      )}

      {/* ── Définitions ──────────────────────────────────────────────── */}
      <div className="mt-8 space-y-10">
        {groups.map(({ family, items }) => (
          <section key={family}>
            <div className="mb-3 flex items-baseline gap-2.5">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {t(CLE_FAMILLE[family] ?? 'nav.famMotifs')}
              </h2>
              <Chip>{items.length}</Chip>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              {items.map((entry) => {
                // Certains mots se montrent, les autres se lisent. La carte
                // ne devient cliquable que s'il y a quelque chose à voir :
                // un bouton qui n'ouvre rien coûte plus cher qu'une carte
                // inerte.
                const position = POSITIONS_DU_GLOSSAIRE[entry.cle]
                return (
                  <Card
                    key={`${family}-${entry.cle}`}
                    className={clsx('p-4', 'transition-colors hover:bg-surface-hover')}
                  >
                    {/* Le nom à gauche, le haut-parleur à droite : la
                        définition se lit ou s'écoute, et le choix se prend sur
                        la même ligne. */}
                    <dt className="flex items-start gap-2 text-sm font-semibold text-ink">
                      <span className="min-w-0 flex-1 pt-1">
                        {position ? (
                          <button
                            type="button"
                            onClick={() =>
                              setMontre({
                                cle: entry.cle,
                                name: entry.name,
                                definition: entry.definition,
                              })
                            }
                            className="group inline-flex items-center gap-1.5 text-left transition-colors hover:text-accent"
                            aria-label={t('explain.seeOnBoard', { terme: entry.name })}
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
                      </span>
                      <BoutonEcouter
                        quoi={entry.name}
                        texte={`${entry.name}. ${entry.definition}`}
                        className="-mr-1 -mt-1"
                      />
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
      {montre && POSITIONS_DU_GLOSSAIRE[montre.cle] && (
        <BoiteTerme
          nom={montre.name}
          definition={montre.definition}
          position={POSITIONS_DU_GLOSSAIRE[montre.cle]!}
          onFermer={() => setMontre(null)}
        />
      )}
    </div>
  )
}
