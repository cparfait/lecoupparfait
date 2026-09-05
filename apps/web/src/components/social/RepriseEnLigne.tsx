'use client'

/**
 * « Ta partie t'attend. »
 *
 * Le pendant du souvenir posé dans `partieEnLigne.ts`. Quitter une partie en
 * direct n'a rien d'exceptionnel — un lien touché par mégarde dans le tchat, un
 * retour arrière, une notification qu'on ouvre — et jusqu'ici on ne revenait
 * qu'en retrouvant l'adresse soi-même.
 *
 * Le serveur garde désormais la place tant que **personne n'attend** : le
 * compte à rebours d'abandon ne tourne que si l'adversaire est là, et il dure
 * la moitié de la cadence plutôt qu'une minute fixe. On peut donc sortir de
 * l'application et revenir — la partie est aussi rappelée sur l'accueil.
 *
 * Le bandeau, lui, apparaît sans délai : quand l'adversaire est en train de
 * patienter, on ne le signale pas trois secondes plus tard.
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
          {/* Le texte suivait l'ancienne règle — une minute, quoi qu'il
              arrive. Il annonçait donc une perte qui n'a plus lieu, ce qui
              revient à presser quelqu'un pour rien. */}
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Ta place est gardée tant que ton adversaire n’attend pas devant l’échiquier. S’il est
            là, la partie se perd par abandon au bout de la moitié de la cadence.
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
