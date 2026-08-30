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
 *
 * **Sur mobile aussi.** Il était masqué sous 640 px — `hidden sm:inline-flex` —
 * et la seule trace du compte se trouvait au fond du menu hamburger, après cinq
 * rubriques : sur téléphone, rien à l'écran ne disait si l'on était connecté.
 * C'est exactement la contradiction décrite plus haut, déplacée d'une taille
 * d'écran à l'autre. Il reste donc visible partout, réduit à sa pastille quand
 * la place manque : le pseudo est le premier à sauter, l'avatar suffit à
 * répondre à la question posée.
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
          // Calé sur le bouton « Se connecter », le plus large des deux issues :
          // une réserve plus étroite que son contenu ferait sauter l'en-tête au
          // moment où la réponse arrive.
          variant === 'header' ? 'block h-9 w-20 sm:w-28' : 'col-span-2 mt-1 h-10',
        )}
        aria-hidden
      />
    )
  }

  if (me === null) {
    return (
      <Link
        href="/connexion"
        title={t('nav.signIn')}
        className={clsx(
          'items-center justify-center rounded-[var(--radius-sm)] bg-accent font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110',
          variant === 'header'
            ? 'inline-flex h-9 whitespace-nowrap px-2.5 text-[13px] sm:px-3.5'
            : 'col-span-2 mt-1 flex gap-2 px-3 py-2.5 text-sm',
        )}
      >
        {/* Le mot, et pas une icône.

            Il y avait ici un `LogIn` de lucide sous 640 px, faute de place
            supposée. Deux erreurs. La place existe : la pastille de série ne
            s'affiche jamais sans compte — `FlammeSerie` sort sur `!identite` —
            donc l'en-tête anonyme porte une commande de moins que celui d'un
            compte, précisément là où le bouton est le plus large.

            Et le picto se lisait à l'envers. `LogIn` (une flèche qui entre dans
            un chambranle) et `LogOut` (la même flèche qui en sort) ne se
            distinguent pas à dix-sept pixels : on venait de se déconnecter, et
            l'en-tête semblait proposer de se déconnecter encore. Un bouton de
            connexion doit dire « se connecter ». */}
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
          ? 'inline-flex h-9 px-1.5 text-[13px] text-ink sm:px-2'
          : 'col-span-2 mt-1 flex justify-center px-3 py-2.5 text-sm text-ink',
      )}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-strong text-sm">
        <span aria-hidden>{me.avatar ?? '♟️'}</span>
      </span>
      {/* Le pseudo saute le premier quand la place manque : la pastille répond
          déjà à « suis-je connecté ? », qui est la question. */}
      <span
        className={clsx(
          'max-w-[10rem] truncate',
          variant === 'header' && 'hidden sm:inline',
        )}
      >
        {me.username}
      </span>
    </Link>
  )
}
