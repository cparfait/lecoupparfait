'use client'

/**
 * Ses pseudos Chess.com et Lichess, renseignés une fois.
 *
 * L'analyse sait aller chercher les parties jouées ailleurs à partir du seul
 * pseudo, mais il fallait le taper là-bas, dans un volet replié, et le
 * retrouver ensuite. Sa place est ici, sur sa propre fiche : on le note comme
 * on note son adresse, et l'analyse le trouve rempli.
 *
 * Ce sont les mêmes réglages que ceux du champ d'import — un seul endroit
 * de vérité, les préférences, que les comptes connectés retrouvent d'un
 * appareil à l'autre. On peut toujours effacer et chercher quelqu'un d'autre
 * depuis l'analyse ; ce qui est écrit ici n'est qu'une valeur de départ.
 */

import Link from 'next/link'
import { Gauge } from 'lucide-react'
import { Button } from '@/components/ui/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

const SERVICES = [
  { cle: 'chesscomUsername', label: 'Chess.com', exemple: 'ton pseudo Chess.com' },
  { cle: 'lichessUsername', label: 'Lichess', exemple: 'ton pseudo Lichess' },
] as const

export function ComptesAilleurs() {
  const chesscom = usePreferences((state) => state.chesscomUsername)
  const lichess = usePreferences((state) => state.lichessUsername)
  const set = usePreferences((state) => state.set)
  const valeurs = { chesscomUsername: chesscom, lichessUsername: lichess }
  const renseigne = chesscom.trim() !== '' || lichess.trim() !== ''

  return (
    <div className="mt-4 border-t border-line/60 pt-4">
      <p className="text-sm font-medium">Tes comptes ailleurs</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        L’analyse retrouve tes parties Chess.com et Lichess à partir du pseudo. Note-les
        ici une fois ; tu pourras toujours en chercher un autre sur le moment.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <label key={service.cle} className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-faint">
              {service.label}
            </span>
            <input
              value={valeurs[service.cle]}
              onChange={(event) => set(service.cle, event.target.value)}
              placeholder={service.exemple}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
        ))}
      </div>
      {renseigne && (
        <Link href="/analyse" className="mt-3 inline-block">
          <Button size="sm" variant="secondary" icon={<Gauge size={14} />}>
            Analyser une de ces parties
          </Button>
        </Link>
      )}
    </div>
  )
}
