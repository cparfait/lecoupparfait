'use client'

/**
 * Le vocabulaire, expliqué là où il est employé.
 *
 * Le commentaire d'un coup dit « clouage », « pion passé », « zugzwang ». Ces
 * mots sont tous définis quelque part — les 44 motifs tactiques dans le cœur,
 * une quarantaine de termes généraux dans `lib/glossaire.ts` — mais ce quelque
 * part est une autre page. Un débutant qui bute sur un mot au milieu d'une
 * phrase ne va pas ouvrir un onglet : il saute le mot, et perd la phrase avec.
 *
 * On repère donc les termes connus dans le texte et on les rend consultables
 * sur place. Rien d'autre ne change : ni le texte, ni sa mise en forme.
 *
 * **Discret par construction.** Un seul soulignement par terme et par
 * paragraphe : sans cette règle, une phrase qui répète « le clouage » trois
 * fois se transformerait en champ de liens, et l'on cesserait de lire.
 */

import { useMemo } from 'react'
import { motifGlossary } from '@coupparfait/core'
import { TERMS } from '@/lib/glossaire.ts'
import type { Traducteur } from '@/lib/i18n/resoudre.ts'
import { localeDuContenu, useI18n } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

interface Terme {
  nom: string
  definition: string
}

/**
 * Le dictionnaire, construit une fois pour toute l'application.
 *
 * Les motifs d'abord, le glossaire général ensuite : quand les deux définissent
 * le même mot — « fourchette » —, celle du motif est plus précise parce qu'elle
 * a été écrite pour être lue au milieu d'une analyse.
 *
 * Trié par longueur décroissante : sans cela « pion » l'emporterait sur « pion
 * passé », et l'on définirait le mauvais des deux.
 */
function construireDictionnaire(t: Traducteur): Terme[] {
  const par = new Map<string, Terme>()

  for (const motif of motifGlossary()) {
    const nom = tCoeur(t, motif.name)
    const cle = nom.toLowerCase()
    if (!par.has(cle)) par.set(cle, { nom, definition: tCoeur(t, motif.definition) })
  }
  for (const terme of TERMS) {
    const nom = t(terme.name)
    const cle = nom.toLowerCase()
    if (!par.has(cle)) {
      par.set(cle, {
        nom,
        // Les définitions du glossaire portent du gras Markdown, utile sur sa
        // page et parasite dans une infobulle.
        definition: t(terme.definition).replace(/\*\*/g, ''),
      })
    }
  }

  return [...par.values()]
    .filter((t) => t.nom.length >= 4)
    .sort((a, b) => b.nom.length - a.nom.length)
}

/**
 * Une table par langue.
 *
 * Elle était construite une fois pour toute l'application, ce qui allait tant
 * que les termes étaient écrits en français dans le code. Traduits, un cache
 * unique aurait gardé les mots de la première langue affichée et cessé de
 * reconnaître quoi que ce soit ensuite. Même correctif que pour le repéreur
 * d'ouvertures, et pour la même raison.
 */
const tables = new Map<string, Terme[]>()

/**
 * L'expression qui repère les termes.
 *
 * Bornée par des frontières qui ne sont pas `\b` : en français les mots portent
 * des accents et des apostrophes, et `\b` coupe au mauvais endroit sur « l'aile
 * dame ». On encadre donc par « ce qui n'est pas une lettre », en tolérant le
 * pluriel.
 */
function construireMotif(termes: Terme[]): RegExp {
  const echappe = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = termes.map((t) => `${echappe(t.nom)}s?`).join('|')
  return new RegExp(`(?<![\\p{L}])(${alternatives})(?![\\p{L}])`, 'giu')
}

let motif: RegExp | null = null

export function TexteAvecTermes({ texte, className }: { texte: string; className?: string }) {
  const { t, locale } = useI18n()
  const contenu = localeDuContenu(locale)
  const morceaux = useMemo(() => decouper(texte, locale, contenu, t), [texte, locale, contenu, t])

  return (
    <p className={className}>
      {morceaux.map((morceau, index) =>
        typeof morceau === 'string' ? (
          morceau
        ) : (
          <button
            key={index}
            type="button"
            title={morceau.definition}
            /*
              Un bouton et non un `<abbr>` : sur un écran tactile, le seul moyen
              d'obtenir une infobulle est d'appuyer, et un élément non
              interactif ne reçoit pas cet appui. Le `title` sert la souris, le
              `aria-label` le lecteur d'écran.
            */
            aria-label={`${morceau.mot} : ${morceau.definition}`}
            className="cursor-help underline decoration-dotted decoration-from-font underline-offset-2 transition-colors hover:text-accent"
            onClick={(evenement) => evenement.currentTarget.blur()}
          >
            {morceau.mot}
          </button>
        ),
      )}
    </p>
  )
}

/** Découpe un texte en morceaux bruts et en termes reconnus. */
function decouper(
  texte: string,
  locale: string,
  contenu: 'fr' | 'en',
  t: Traducteur,
): Array<string | { mot: string; definition: string }> {
  let dictionnaire = tables.get(locale)
  if (!dictionnaire) {
    dictionnaire = construireDictionnaire(t)
    tables.set(locale, dictionnaire)
  }
  motif ??= construireMotif(dictionnaire)

  const morceaux: Array<string | { mot: string; definition: string }> = []
  const dejaVus = new Set<string>()
  let curseur = 0

  motif.lastIndex = 0
  for (const trouve of texte.matchAll(motif)) {
    const index = trouve.index ?? 0
    const mot = trouve[0]
    const cle = mot.toLowerCase().replace(/s$/, '')

    // Une fois par paragraphe et par terme : voir l'en-tête du fichier.
    if (dejaVus.has(cle)) continue
    const terme = dictionnaire.find((t) => t.nom.toLowerCase() === cle)
    if (!terme) continue
    dejaVus.add(cle)

    if (index > curseur) morceaux.push(texte.slice(curseur, index))
    morceaux.push({ mot, definition: terme.definition })
    curseur = index + mot.length
  }

  if (curseur < texte.length) morceaux.push(texte.slice(curseur))
  return morceaux
}
