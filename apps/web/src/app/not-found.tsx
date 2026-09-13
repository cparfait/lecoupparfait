/**
 * Une adresse qui ne mène nulle part.
 *
 * Rendue pour deux raisons distinctes : une adresse qui n'existe pas, et un
 * `notFound()` appelé par une page qui a cherché sa ressource et ne l'a pas
 * trouvée — un profil, une partie. Le texte doit convenir aux deux, d'où le
 * ton volontairement neutre : on ne sait pas ce que la personne cherchait.
 *
 * Composant serveur, donc il peut porter ses propres métadonnées. Sans elles,
 * l'onglet afficherait le titre du site sur une page qui dit le contraire. Le
 * texte, lui, vit dans `PageIntrouvable` : il se traduit, ce qu'un composant
 * serveur ne sait pas faire.
 */

import type { Metadata } from 'next'
import { PageIntrouvable } from '@/components/layout/PageIntrouvable.tsx'

export const metadata: Metadata = {
  title: 'Page introuvable',
}

export default function Introuvable() {
  return <PageIntrouvable />
}
