/**
 * Une adresse qui ne mène nulle part.
 *
 * Rendue pour deux raisons distinctes : une adresse qui n'existe pas, et un
 * `notFound()` appelé par une page qui a cherché sa ressource et ne l'a pas
 * trouvée — un profil, une partie. Le texte doit convenir aux deux, d'où le
 * ton volontairement neutre : on ne sait pas ce que la personne cherchait.
 *
 * Composant serveur, donc il peut porter ses propres métadonnées. Sans elles,
 * l'onglet afficherait le titre du site sur une page qui dit le contraire.
 */

import type { Metadata } from 'next'
import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/index.tsx'

export const metadata: Metadata = {
  title: 'Page introuvable',
}

export default function Introuvable() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <Compass size={40} strokeWidth={1.6} className="text-faint" aria-hidden />

      <div>
        <h1 className="text-xl font-semibold">Cette page n’existe pas</h1>
        <p className="mt-2 text-sm text-muted">
          L’adresse est peut-être ancienne, ou la partie, le profil ou l’étude que tu cherches a été
          supprimé.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href="/" variant="primary">
          Retour à l’accueil
        </ButtonLink>
        <ButtonLink href="/jouer/ordinateur">Jouer une partie</ButtonLink>
      </div>
    </main>
  )
}
