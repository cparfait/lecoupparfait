'use client'

/**
 * La série dans la barre du haut.
 *
 * Un seul chiffre, délibérément discret : la série doit se rappeler à vous, pas
 * vous harceler. Tout le comportement — apparition, avertissement sans compte,
 * lien vers le défi — vit dans `FlammeSerie`, qu'elle partage avec la carte du
 * défi du jour. Ce fichier ne fait plus que choisir l'habillage.
 */

import { FlammeSerie } from './FlammeSerie.tsx'

export function PastilleSerie() {
  return <FlammeSerie habillage="entete" />
}
