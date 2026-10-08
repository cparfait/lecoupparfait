'use client'

/**
 * Lier son compte à Google, depuis « Ton compte » sur son profil.
 *
 * C'est la seule façon de rattacher Google à un compte qui existait avant : on
 * ne le fait jamais d'après l'adresse, qui n'est pas vérifiée ici — voir
 * `@coupparfait/db/google`. Connecté, on prouve qu'on est soi ; Google prouve
 * le reste.
 *
 * Le retour de Google revient ici avec `?google=lie` ou `?google=deja-ailleurs` :
 * on le dit d'un message, puis on retire le paramètre de l'adresse, pour qu'un
 * rechargement ne le redise pas.
 */

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { BoutonGoogle } from '@/components/compte/BoutonGoogle.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { rafraichirIdentite, useCompteGoogle, useGoogleDisponible } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function LiaisonGoogle({ suite }: { suite: string }) {
  const t = useT()
  const disponible = useGoogleDisponible()
  const compte = useCompteGoogle()

  useEffect(() => {
    const adresse = new URL(window.location.href)
    const issue = adresse.searchParams.get('google')
    if (!issue) return
    if (issue === 'lie') {
      toast.success(t('auth.google.linkedNow'))
      void rafraichirIdentite()
    } else if (issue === 'deja-ailleurs') {
      toast.error(t('auth.google.linkedElsewhere'))
    }
    adresse.searchParams.delete('google')
    window.history.replaceState(window.history.state, '', adresse.pathname + adresse.search)
  }, [t])

  if (!disponible || !compte) return null

  if (compte.lie) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-muted">
        <Check size={15} className="shrink-0 text-[var(--q-best)]" aria-hidden />
        {t('auth.google.linked')}
      </p>
    )
  }

  return (
    <div className="mt-4">
      <BoutonGoogle mode="lier" suite={suite} libelle={t('auth.google.link')} />
    </div>
  )
}
