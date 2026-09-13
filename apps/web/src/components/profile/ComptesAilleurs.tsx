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
import { MarqueService } from '@/components/brand/MarqueService.tsx'
import { useT } from '@/lib/i18n/index.tsx'

const SERVICES = [
  {
    cle: 'chesscomUsername',
    service: 'chesscom',
    label: 'Chess.com',
    exemple: 'misc.chesscomHandle',
  },
  {
    cle: 'lichessUsername',
    service: 'lichess',
    label: 'Lichess',
    exemple: 'misc.lichessHandle',
  },
] as const

export function ComptesAilleurs() {
  const t = useT()
  const chesscom = usePreferences((state) => state.chesscomUsername)
  const lichess = usePreferences((state) => state.lichessUsername)
  const set = usePreferences((state) => state.set)
  const valeurs = { chesscomUsername: chesscom, lichessUsername: lichess }
  const renseigne = chesscom.trim() !== '' || lichess.trim() !== ''

  return (
    <div className="mt-4 border-t border-line/60 pt-4">
      <p className="text-sm font-medium">{t('misc.yourAccountsElsewhere')}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('misc.accountsElsewhereHint')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <label key={service.cle} className="block">
            {/* La vignette du service, à côté de son nom : deux champs de
                saisie gris l'un à côté de l'autre se remplissent une fois sur
                deux dans le mauvais. */}
            <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-faint">
              <MarqueService service={service.service} taille={14} />
              {service.label}
            </span>
            <input
              value={valeurs[service.cle]}
              onChange={(event) => set(service.cle, event.target.value)}
              placeholder={t(service.exemple)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
        ))}
      </div>
      {renseigne && (
        <Link
          href={`/analyse?compte=${chesscom.trim() ? 'chesscom' : 'lichess'}`}
          className="mt-3 inline-block"
        >
          <Button size="sm" variant="secondary" icon={<Gauge size={14} />}>
            {t('misc.analyseOneOfThese')}
          </Button>
        </Link>
      )}
    </div>
  )
}
