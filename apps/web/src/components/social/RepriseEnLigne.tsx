'use client'

/**
 * « Ta partie t'attend. »
 *
 * Le pendant du souvenir posé dans `partieEnLigne.ts`. Quitter une partie en
 * direct n'a rien d'exceptionnel — un lien touché par mégarde dans le tchat, un
 * retour arrière, une notification qu'on ouvre — et jusqu'ici on ne revenait
 * qu'en retrouvant l'adresse soi-même. Le serveur, lui, garde la place une
 * minute : c'est court, et c'est précisément pour cela que le chemin du retour
 * doit être immédiat plutôt que caché.
 *
 * Il apparaît sans délai, contrairement au bandeau de mise en route : une
 * minute est déjà courte, et l'on n'attend pas trois secondes pour signaler à
 * quelqu'un que son adversaire est en train de patienter.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, X } from 'lucide-react'
import { Button } from '@/components/ui/index.tsx'
import { oublierPartieEnLigne, usePartieEnLigne } from '@/lib/game/partieEnLigne.ts'

export function RepriseEnLigne() {
  const pathname = usePathname()
  const partie = usePartieEnLigne()

  if (!partie) return null
  // On est déjà dedans : le bandeau se proposerait de nous emmener là où l'on
  // se trouve, par-dessus l'échiquier.
  if (pathname.startsWith(`/jouer/partie/${partie.slug}`)) return null

  return (
    <div
      role="region"
      aria-label="Partie en cours"
      className="animate-slide-up popover fixed bottom-[5.5rem] left-3 right-3 z-40 p-3.5 shadow-[var(--shadow-lg)] md:bottom-4 md:left-auto md:right-4 md:w-[24rem]"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent"
          aria-hidden
        >
          <Swords size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">
            {partie.adversaire
              ? `Ta partie contre ${partie.adversaire} continue`
              : 'Ta partie en direct continue'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Ta place est gardée une minute après ton départ. Au-delà, la partie est perdue par
            abandon.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <Link href={partie.href}>
              <Button size="sm" variant="primary" icon={<Swords size={14} />}>
                Reprendre
              </Button>
            </Link>
            <button
              type="button"
              // `oublier` émet l'événement que suit `usePartieEnLigne` : le
              // bandeau disparaît de lui-même, ici comme dans les autres onglets.
              onClick={oublierPartieEnLigne}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              Laisser tomber
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={oublierPartieEnLigne}
          aria-label="Fermer"
          className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
    </div>
  )
}
