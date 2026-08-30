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

import Link from 'next/link'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

export function AccountButton({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const t = useT()

  /**
   * L'identité vient de `useIdentite`, et non plus d'un `fetch` posé ici.
   *
   * Elle était lue localement tant que ce bouton était seul à en avoir besoin.
   * La pastille de série en a désormais besoin aussi — elle n'a de sens que
   * pour un compte — et deux lectures indépendantes auraient fait deux requêtes
   * identiques à chaque navigation. `undefined` garde le même sens qu'avant :
   * on ne sait pas encore, donc on n'affiche rien.
   */
  const me = useIdentite()

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
