'use client'

/**
 * Le contenu de la page « introuvable ».
 *
 * Séparé de `not-found.tsx` pour la même raison que partout ailleurs : cette
 * page-là est un composant serveur — elle porte ses propres métadonnées, sans
 * quoi l'onglet afficherait le titre du site sur une page qui dit le contraire
 * — et un composant serveur ne peut pas lire le dictionnaire.
 */

import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'

export function PageIntrouvable() {
  const t = useT()

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <Compass size={40} strokeWidth={1.6} className="text-faint" aria-hidden />

      <div>
        <h1 className="text-xl font-semibold">{t('errors.notFound')}</h1>
        <p className="mt-2 text-sm text-muted">{t('errors.notFoundHint')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href="/" variant="primary">
          {t('errors.backHome')}
        </ButtonLink>
        <ButtonLink href="/jouer/ordinateur">{t('errors.playAGame')}</ButtonLink>
      </div>
    </main>
  )
}
