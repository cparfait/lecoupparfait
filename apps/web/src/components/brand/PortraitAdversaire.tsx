'use client'

/**
 * Le portrait d'un adversaire artificiel.
 *
 * Les sept personnalités de `BOT_PERSONALITIES` portaient jusqu'ici un émoji
 * système — 🐣 pour Pion, 🛡️ pour Rempart, 🜛 pour Oracle. Le commentaire du
 * fichier disait « en attendant les illustrations » ; les voici. Ce sont sept
 * déclinaisons de Cavale, la même sculpture dans sept matières, produites par
 * `scripts/build-cavale.mjs`.
 *
 * Deux choses tiennent ce composant :
 *
 *  1. **L'émoji reste, en dessous.** Si le PNG manque — asset non généré,
 *     déploiement partiel, cache vide — on réaffiche l'émoji plutôt qu'une
 *     icône cassée. C'est pour cela que `BotPersonality` garde ses deux champs.
 *  2. **Les portraits ne suivent pas le thème, et c'est voulu.** Un adversaire
 *     se reconnaît à sa matière : le granit de Rempart, le bronze chauffé de
 *     Brasier, l'obsidienne d'Oracle. Les teindre à l'accent de l'habillage les
 *     rendrait tous identiques. Seul le fond de la pastille suit le thème, et
 *     il est posé par l'appelant.
 */

import { useState } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import type { BotPersonality } from '@coupparfait/core'

export interface PortraitAdversaireProps {
  personality: BotPersonality
  /** Hauteur de la vignette en pixels. La largeur en découle, voir `LARGEUR`. */
  size?: number
  className?: string
}

/**
 * Le rapport largeur/hauteur de la vignette.
 *
 * Une boîte carrée était le premier réflexe, et c'était une erreur : les
 * sculptures sont hautes — de 0,55 à 0,77 de rapport selon la pièce — si bien
 * qu'en `object-contain` dans un carré de 44 px, Cavale s'affichait sur 24 px
 * de large et flottait au milieu de deux bandes vides. Une boîte à la forme du
 * sujet lui rend une trentaine de pour cent de surface utile.
 *
 * On garde une largeur **fixe** plutôt que `auto`, malgré des proportions qui
 * varient d'une pièce à l'autre : les sept vignettes sont alignées en colonne
 * dans la grille de `/jouer`, et une largeur flottante y décalerait le début du
 * texte d'une carte à l'autre.
 */
const LARGEUR = 0.78

export function PortraitAdversaire({ personality, size = 48, className }: PortraitAdversaireProps) {
  const [manquant, setManquant] = useState(false)
  const largeur = Math.round(size * LARGEUR)

  if (manquant) {
    return (
      <span
        aria-hidden
        className={clsx('grid shrink-0 place-items-center', className)}
        // L'émoji doit occuper la même place que l'image qu'il remplace, sinon
        // la grille des sept se réorganise au premier fichier absent.
        style={{ width: largeur, height: size, fontSize: Math.round(size * 0.62) }}
      >
        {personality.emoji}
      </span>
    )
  }

  return (
    <Image
      src={personality.portrait}
      // Décoratif : le nom de l'adversaire est toujours écrit à côté, et le
      // répéter ici le ferait annoncer deux fois par un lecteur d'écran.
      alt=""
      aria-hidden
      width={largeur}
      height={size}
      onError={() => setManquant(true)}
      // Les dimensions sont **aussi** posées en style, et pas seulement en
      // attributs. Les appelants placent la vignette dans un conteneur en
      // `flex`, dont l'`align-items: stretch` par défaut étire l'image sur
      // toute la hauteur de la carte : demandée à 44 px, elle s'affichait à
      // 44 × 102 et Cavale y était comprimé en accordéon.
      style={{ width: largeur, height: size }}
      // `contain` et non `cover` : les onze tirages sont recadrés au plus près
      // du sujet mais gardent chacun leur proportion, une sculpture n'étant pas
      // carrée. `cover` rognerait les oreilles de l'un et le socle de l'autre.
      className={clsx('shrink-0 object-contain', className)}
    />
  )
}
