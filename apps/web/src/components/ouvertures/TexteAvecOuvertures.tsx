'use client'

/**
 * Les noms d'ouverture, consultables là où ils sont cités.
 *
 * Un principe dit « les ouvertures qui contrôlent le centre de loin —
 * est-indienne, sicilienne — le rendent volontairement pour le frapper
 * ensuite ». Deux noms au milieu d'une phrase, et rien à faire avec : celui qui
 * ne les connaît pas perd la phrase, celui qui les connaît vaguement ne peut
 * pas vérifier. Or chacun a désormais une fiche qui dit exactement ce qu'il
 * cherche, à un clic — encore fallait-il que le clic existe.
 *
 * Même principe que `TexteAvecTermes`, qui rend le vocabulaire consultable dans
 * les commentaires d'analyse, avec une différence : ici le mot **mène quelque
 * part** au lieu d'ouvrir une infobulle. Une définition de motif tient en deux
 * lignes ; les enjeux d'une ouverture, non — il y a une idée, une structure,
 * deux plans et un piège, et cela ne se met pas dans un `title`.
 *
 * **Discret par construction.** Une occurrence par nom et par paragraphe : sans
 * cette règle, un texte qui répète « la sicilienne » trois fois deviendrait un
 * champ de liens, et l'on cesserait de lire.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { FICHES_ENJEUX, type FicheEnjeux } from '@/lib/ouvertures/enjeux.ts'

/**
 * Le dictionnaire des noms, construit une fois pour toute l'application.
 *
 * Chaque fiche y entre par son nom de catalogue **et** par ses alias de prose.
 * Trié par longueur décroissante : sans cela « indienne » l'emporterait sur
 * « est-indienne », et l'on pointerait la mauvaise fiche.
 */
function construireNoms(): Array<{ texte: string; fiche: FicheEnjeux }> {
  const noms: Array<{ texte: string; fiche: FicheEnjeux }> = []
  for (const fiche of FICHES_ENJEUX) {
    for (const texte of [fiche.nom, ...fiche.alias]) {
      noms.push({ texte: texte.toLowerCase(), fiche })
    }
  }
  return noms.sort((a, b) => b.texte.length - a.texte.length)
}

let noms: Array<{ texte: string; fiche: FicheEnjeux }> | null = null
let motif: RegExp | null = null

/**
 * L'expression qui repère les noms.
 *
 * Bornée par « ce qui n'est pas une lettre » et non par `\b` : en français les
 * mots portent des accents, des traits d'union et des apostrophes, et `\b`
 * coupe au mauvais endroit sur « l'est-indienne ». Le trait d'union interne
 * fait partie du nom, d'où sa présence dans les alternatives et son absence des
 * frontières.
 */
function construireMotif(liste: Array<{ texte: string }>): RegExp {
  const echappe = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = liste.map((entree) => echappe(entree.texte)).join('|')
  return new RegExp(`(?<![\\p{L}-])(${alternatives})(?![\\p{L}-])`, 'giu')
}

export function TexteAvecOuvertures({
  texte,
  className,
  /**
   * La fiche qu'on est en train de lire, à ne pas se lier à elle-même.
   *
   * Un lien « sicilienne » sur la page de la sicilienne ne mène nulle part et
   * fait douter qu'on y soit déjà.
   */
  sauf,
  /** Balise du conteneur : `p` par défaut, `span` dans une phrase existante. */
  as: Tag = 'p',
}: {
  texte: string
  className?: string
  sauf?: string
  as?: 'p' | 'span'
}) {
  const morceaux = useMemo(() => decouper(texte, sauf), [texte, sauf])

  return (
    <Tag className={className}>
      {morceaux.map((morceau, index) =>
        typeof morceau === 'string' ? (
          morceau
        ) : (
          <Link
            key={index}
            href={`/ouvertures/enjeux#${morceau.fiche.id}`}
            title={`${morceau.fiche.nom} — ${morceau.fiche.idee}`}
            className="underline decoration-dotted decoration-from-font underline-offset-2 transition-colors hover:text-accent"
          >
            {morceau.mot}
          </Link>
        ),
      )}
    </Tag>
  )
}

/** Découpe un texte en morceaux bruts et en noms d'ouverture reconnus. */
function decouper(
  texte: string,
  sauf?: string,
): Array<string | { mot: string; fiche: FicheEnjeux }> {
  noms ??= construireNoms()
  motif ??= construireMotif(noms)

  const morceaux: Array<string | { mot: string; fiche: FicheEnjeux }> = []
  const dejaVues = new Set<string>()
  let curseur = 0

  motif.lastIndex = 0
  for (const trouve of texte.matchAll(motif)) {
    const index = trouve.index ?? 0
    const mot = trouve[0]
    const entree = noms.find((candidat) => candidat.texte === mot.toLowerCase())
    if (!entree || entree.fiche.id === sauf) continue

    // Une fois par paragraphe et par ouverture : voir l'en-tête du fichier.
    if (dejaVues.has(entree.fiche.id)) continue
    dejaVues.add(entree.fiche.id)

    if (index > curseur) morceaux.push(texte.slice(curseur, index))
    morceaux.push({ mot, fiche: entree.fiche })
    curseur = index + mot.length
  }

  if (curseur < texte.length) morceaux.push(texte.slice(curseur))
  return morceaux
}
