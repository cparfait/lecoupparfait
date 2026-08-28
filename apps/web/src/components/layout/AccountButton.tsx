'use client'

/**
 * Le bouton de compte, dans l'en-tête.
 *
 * Il proposait « Se connecter » à tout le monde, y compris à qui venait de
 * s'inscrire : on lisait son propre pseudo sur son profil pendant que l'en-tête
 * invitait à ouvrir une session. C'est le genre de contradiction qui fait
 * douter d'être vraiment connecté.
 *
 * Une fois la session ouverte, il montre donc l'avatar et le pseudo, et mène
 * au profil — d'où l'on peut se déconnecter.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/index.tsx'

interface Identity {
  username: string
  avatar: string | null
}

export function AccountButton({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const t = useT()
  const pathname = usePathname()

  /**
   * `undefined` tant qu'on ne sait pas.
   *
   * On n'affiche alors rien plutôt que « Se connecter » : proposer une
   * connexion pendant un dixième de seconde à quelqu'un qui l'est déjà produit
   * exactement le clignotement qu'on veut éviter.
   */
  const [me, setMe] = useState<Identity | null | undefined>(undefined)

  // La navigation relit l'identité : c'est ce qui met l'en-tête à jour après
  // une connexion, une inscription ou une déconnexion, sans rechargement.
  useEffect(() => {
    let alive = true
    void fetch('/api/auth')
      .then((response) => response.json())
      .then((data: { user: Identity | null }) => {
        if (alive) setMe(data.user)
      })
      .catch(() => {
        if (alive) setMe(null)
      })
    return () => {
      alive = false
    }
  }, [pathname])

  if (me === undefined) {
    return (
      <span
        className={clsx(
          'rounded-[var(--radius-sm)] bg-surface-strong',
          variant === 'header' ? 'hidden h-9 w-28 sm:block' : 'col-span-2 mt-1 h-10',
        )}
        aria-hidden
      />
    )
  }

  if (me === null) {
    return (
      <Link
        href="/connexion"
        className={clsx(
          'items-center rounded-[var(--radius-sm)] bg-accent font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110',
          variant === 'header'
            ? 'hidden h-9 px-3.5 text-[13px] sm:inline-flex'
            : 'col-span-2 mt-1 flex justify-center gap-2 px-3 py-2.5 text-sm',
        )}
      >
        {t('nav.signIn')}
      </Link>
    )
  }

  return (
    <Link
      href={`/profil/${me.username}`}
      title={t('nav.profile')}
      className={clsx(
        'items-center gap-2 rounded-[var(--radius-sm)] font-semibold transition-colors hover:bg-surface-hover',
        variant === 'header'
          ? 'hidden h-9 px-2 text-[13px] text-ink sm:inline-flex'
          : 'col-span-2 mt-1 flex justify-center px-3 py-2.5 text-sm text-ink',
      )}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-strong text-sm">
        <span aria-hidden>{me.avatar ?? '♟️'}</span>
      </span>
      <span className="max-w-[10rem] truncate">{me.username}</span>
    </Link>
  )
}
