'use client'

/**
 * Là où les alertes apparaissent, et comment elles se signalent.
 *
 * Elles étaient dispersées aux quatre coins de l'écran, chacune posée là où son
 * auteur avait trouvé de la place : la reprise d'une partie en direct et la
 * mise en route en bas à droite, les messages éphémères en haut à droite sur
 * grand écran et en bas sur téléphone, le défi d'un ami — seul — sous l'en-tête
 * au centre.
 *
 * Quatre positions pour la même chose, et trois d'entre elles dans les angles,
 * c'est-à-dire hors du chemin du regard. On lit au centre, on joue au centre ;
 * un bandeau posé dans un coin est vu par quelqu'un qui le cherchait. « Ta
 * partie continue » se découvrait ainsi une fois sur deux, et rien n'attirait
 * l'œil dessus.
 *
 * Tout arrive donc **sous l'en-tête, au centre**, dans une pile unique — et
 * avec un halo qui bat trois fois à l'apparition. Trois fois, pas indéfiniment :
 * le défi d'un ami garde son battement continu parce qu'il expire en cinq
 * minutes, tout le reste attend sans échéance et n'a besoin que d'être remarqué
 * une fois.
 *
 * ── Pourquoi un portail ──────────────────────────────────────────────────
 *
 * Les alertes ne vivent pas au même endroit de l'arbre : la coque en monte
 * trois, les messages éphémères viennent des fournisseurs, au-dessus d'elle.
 * Sans point de rassemblement, deux alertes simultanées se poseraient au pixel
 * près l'une sur l'autre. La pile est donc un nœud unique accroché au corps du
 * document, dans lequel chacune se rend — ce qui la met du même coup hors de
 * portée des contextes d'empilement de l'en-tête, dont le `backdrop-blur` la
 * piégerait.
 *
 * ── Et le plein écran ────────────────────────────────────────────────────
 *
 * Le bouton « plein écran » de l'échiquier appelle `requestFullscreen` sur le
 * conteneur du plateau : le navigateur ne rend alors plus *que* cet élément et
 * ses descendants. Une pile accrochée au corps du document serait donc
 * littéralement hors du rendu — sur les écrans de jeu, ceux où l'on passe le
 * plus de temps. Le défi d'un ami savait déjà se déplacer ; la pile le fait
 * pour tout le monde, et suit `fullscreenchange` dans les deux sens.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

const ID = 'pile-alertes'

/**
 * `top-[4.25rem]` : l'en-tête est collant et mesure 57 px — la pile se pose
 * juste dessous, jamais derrière. `z-[200]` la met au-dessus du menu mobile
 * déplié comme d'une fenêtre de fin de partie.
 *
 * `pointer-events-none` sur la pile, rétabli sur chaque alerte : sans cela, la
 * colonne vide barrerait toute la largeur de l'écran sous l'en-tête, et l'on ne
 * pourrait plus cliquer ce qu'elle survole.
 */
const CLASSES_PILE =
  'pointer-events-none fixed inset-x-0 top-[4.25rem] z-[200] flex flex-col items-center gap-2 px-3'

/**
 * Le nœud unique de la pile, créé au besoin et **replacé** à chaque appel.
 *
 * Replacé, parce que le plein écran change le parent qui convient : le corps du
 * document d'ordinaire, l'élément projeté en plein écran quand il y en a un.
 * Déplacer le conteneur d'un portail est sans effet pour React, qui ne touche
 * qu'à ses enfants.
 */
function pile(): HTMLElement {
  const parent = (document.fullscreenElement as HTMLElement | null) ?? document.body
  const existante = document.getElementById(ID)
  if (existante) {
    if (existante.parentElement !== parent) parent.appendChild(existante)
    return existante
  }
  const noeud = document.createElement('div')
  noeud.id = ID
  noeud.className = CLASSES_PILE
  parent.appendChild(noeud)
  return noeud
}

export function Alerte({
  children,
  role = 'region',
  label,
  /** Battement continu, pour ce qui expire. Trois ondes sinon. */
  insistante = false,
  /** Teinte du halo. L'accent par défaut. */
  teinte,
  className,
}: {
  children: ReactNode
  role?: 'region' | 'alert' | 'status'
  label?: string
  insistante?: boolean
  teinte?: string
  className?: string
}) {
  // Le portail ne peut viser le document qu'une fois monté : au rendu serveur,
  // `document` n'existe pas. On guette ensuite le plein écran, qui déplace la
  // pile — l'événement est émis à l'entrée comme à la sortie.
  const [hote, setHote] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const suivre = () => setHote(pile())
    suivre()
    document.addEventListener('fullscreenchange', suivre)
    return () => document.removeEventListener('fullscreenchange', suivre)
  }, [])
  if (!hote) return null

  return createPortal(
    // Deux enveloppes, parce que deux animations : l'entrée par le haut et le
    // halo écrivent des propriétés que la même déclaration `animation`
    // remplacerait l'une par l'autre sur un seul élément.
    <div className="animate-slide-down pointer-events-auto w-full max-w-md">
      <div
        role={role}
        aria-label={label}
        style={teinte ? ({ ['--teinte-alerte' as string]: teinte } as never) : undefined}
        className={clsx(
          'rounded-[var(--radius)] motion-reduce:animate-none',
          insistante ? 'animate-pulse-ring' : 'animate-flash-alerte',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    hote,
  )
}
