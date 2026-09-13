'use client'

/**
 * Le compte, dans l'en-tête : un seul bouton, et tout ce qui concerne soi.
 *
 * L'en-tête portait trois commandes de nature différente à côté des
 * rubriques : le nom du site ouvrait un menu (accueil, préférences, à propos,
 * crédits), un engrenage menait aux préférences, et « Se connecter » menait au
 * compte. Les préférences avaient donc deux chemins, l'accueil se cachait
 * derrière un chevron, et le principe « à gauche ce qu'on veut faire, à droite
 * soi » n'était plus tenu.
 *
 * Il reste une commande à droite. Connecté, c'est l'avatar et le pseudo, qui
 * ouvrent le profil, les préférences, l'administration pour qui l'a, les pages
 * du site, et la déconnexion. Anonyme, c'est « Se connecter », en toutes
 * lettres et en bouton plein — c'est l'appel à l'action du visiteur — et le
 * même menu s'ouvre sur un petit chevron à côté, pour les préférences et le
 * reste, qui ne demandent pas de compte.
 *
 * **Sur mobile aussi.** Le bouton était masqué sous 640 px et la seule trace
 * du compte se trouvait au fond d'un menu : rien à l'écran ne disait si l'on
 * était connecté. Il reste visible partout, réduit à sa pastille quand la
 * place manque.
 */

import { useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react'
import clsx from 'clsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { useEstAdmin, useIdentite } from '@/lib/auth/useIdentite.ts'
import { PAGES_APPLICATION } from '@/lib/navigation.ts'

const ENTREE =
  'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-hover'

/** Le corps du menu, commun aux deux états. */
function EntreesDuSite({ estAdmin }: { estAdmin: boolean }) {
  const t = useT()
  return (
    <>
      {estAdmin && (
        <Link href="/admin" role="menuitem" className={ENTREE}>
          <ShieldCheck size={16} className="shrink-0 text-muted" aria-hidden />
          {t('nav.admin')}
        </Link>
      )}
      {PAGES_APPLICATION.map((page) => {
        const Icone = page.icon
        return (
          <Link key={page.href} href={page.href} role="menuitem" className={ENTREE}>
            <Icone size={16} className="shrink-0 text-muted" aria-hidden />
            {t(page.labelKey)}
          </Link>
        )
      })}
    </>
  )
}

export function AccountButton() {
  const t = useT()
  const me = useIdentite()
  const estAdmin = useEstAdmin()

  const seDeconnecter = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signout' }),
    })
    toast.success(t('rest.seeYouSoon'))
    window.location.assign('/')
  }, [t])

  if (me === undefined) {
    // Calé sur la largeur de l'issue la plus large, pour que l'en-tête ne saute
    // pas quand la réponse arrive.
    return (
      <span
        className="block h-9 w-24 rounded-[var(--radius-sm)] bg-surface-strong sm:w-32"
        aria-hidden
      />
    )
  }

  if (me === null) {
    return (
      <div className="flex items-center gap-0.5">
        <Link
          href="/connexion"
          title={t('nav.signIn')}
          className="cible-doigt inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] bg-accent px-3 text-[14px] font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110 sm:px-3.5"
        >
          {t('nav.signIn')}
        </Link>
        <Menu
          align="right"
          largeur="w-56"
          label={t('nav.account')}
          boutonClassName="grid h-9 w-8 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
          declencheur={(ouvert) => (
            <ChevronDown
              size={16}
              aria-hidden
              className={clsx('transition-transform duration-150', ouvert && 'rotate-180')}
            />
          )}
        >
          <Link href="/connexion?inscription=1" role="menuitem" className={ENTREE}>
            <User size={16} className="shrink-0 text-muted" aria-hidden />
            {t('nav.signUp')}
          </Link>
          <span className="my-1 block h-px bg-line/60" aria-hidden />
          <EntreesDuSite estAdmin={false} />
        </Menu>
      </div>
    )
  }

  return (
    <Menu
      align="right"
      largeur="w-60"
      label={t('nav.account')}
      boutonClassName="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover sm:px-2 cible-doigt"
      declencheur={(ouvert) => (
        <>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-strong text-sm">
            <span aria-hidden>{me.avatar ?? '♟️'}</span>
          </span>
          {/* Le pseudo saute le premier quand la place manque : la pastille
              répond déjà à « suis-je connecté ? », qui est la question. */}
          <span className="hidden max-w-[10rem] truncate sm:inline">{me.username}</span>
          <ChevronDown
            size={14}
            aria-hidden
            className={clsx('text-muted transition-transform duration-150', ouvert && 'rotate-180')}
          />
        </>
      )}
    >
      <Link href={`/profil/${me.username}`} role="menuitem" className={ENTREE}>
        <User size={16} className="shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block">{t('nav.myProfile')}</span>
          <span className="block truncate text-[12px] font-normal text-faint">{me.username}</span>
        </span>
      </Link>
      <span className="my-1 block h-px bg-line/60" aria-hidden />
      <EntreesDuSite estAdmin={estAdmin} />
      <span className="my-1 block h-px bg-line/60" aria-hidden />
      <button type="button" role="menuitem" onClick={seDeconnecter} className={ENTREE}>
        <LogOut size={16} className="shrink-0 text-muted" aria-hidden />
        {t('nav.signOut')}
      </button>
    </Menu>
  )
}
