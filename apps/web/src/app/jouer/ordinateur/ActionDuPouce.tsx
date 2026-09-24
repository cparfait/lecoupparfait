'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

/**
 * Une case de la barre du pouce.
 *
 * Icône au-dessus, mot en dessous, largeur égale : c'est ce qui permet de
 * viser sans regarder. Un bouton de texte, même bien espacé, demande de lire
 * avant de toucher — et pendant une partie on regarde l'échiquier.
 *
 * Elle rend un lien quand on lui donne une adresse, un bouton sinon : les deux
 * se ressemblent à l'écran et n'ont rien à voir pour le navigateur, qui doit
 * pouvoir ouvrir une destination dans un nouvel onglet.
 */
export function ActionDuPouce({
  icone,
  libelle,
  onClick,
  href,
  disabled,
  danger,
}: {
  icone: ReactNode
  libelle: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** Une action qu'on ne défait pas : l'abandon. */
  danger?: boolean
}) {
  const classe = clsx(
    // Quarante-quatre points de haut au minimum : la barre en faisait
    // quarante-trois, juste sous la taille où le pouce rate une fois sur cinq.
    'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5',
    'text-[12px] font-medium transition-colors',
    disabled
      ? 'pointer-events-none text-faint opacity-40'
      : danger
        ? 'text-[var(--q-blunder)] hover:bg-surface-hover'
        : 'text-muted hover:bg-surface-hover hover:text-ink',
  )

  if (href) {
    return (
      <Link href={href} className={classe}>
        {icone}
        <span className="leading-none">{libelle}</span>
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classe}>
      {icone}
      <span className="leading-none">{libelle}</span>
    </button>
  )
}
