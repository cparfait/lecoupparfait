'use client'

/**
 * Choisir son avatar.
 *
 * La colonne existait, s'affichait partout — profil, carnet d'adresses,
 * classement — et rien ne permettait d'en changer : tous les comptes créés
 * étaient un pion noir. Ce n'est pas un détail dans une liste d'amis, où
 * l'avatar est ce qui distingue une ligne d'une autre avant même le pseudo.
 *
 * Le choix s'enregistre immédiatement, sans bouton de validation : il n'y a
 * rien à confirmer, et le changement se voit tout de suite là-haut.
 */

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { AVATAR_FAMILIES, DEFAULT_AVATAR } from '@/lib/avatars.ts'
import { toast } from '@/components/ui/Toast.tsx'

export function AvatarPicker({
  current,
  onChange,
}: {
  current: string | null
  /** Prévient la page, pour que l'en-tête du profil suive sans rechargement. */
  onChange?: (avatar: string) => void
}) {
  const [chosen, setChosen] = useState(current ?? DEFAULT_AVATAR)
  // On ouvre sur la famille de l'avatar porté : sinon le sien n'est pas
  // visible, et l'on croit que le choix n'a pas été retenu.
  const [family, setFamily] = useState(() => {
    const index = AVATAR_FAMILIES.findIndex((entry) =>
      entry.emojis.includes(current ?? DEFAULT_AVATAR),
    )
    return index >= 0 ? index : 0
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (current) setChosen(current)
  }, [current])

  const pick = useCallback(
    async (avatar: string) => {
      if (busy || avatar === chosen) return
      // On l'affiche avant la réponse du serveur : l'attente d'un aller-retour
      // pour un clic sur une grille d'émojis se remarquerait plus que l'erreur
      // qu'on évite, et le retour en arrière est immédiat en cas d'échec.
      const avant = chosen
      setChosen(avatar)
      setBusy(true)
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'avatar', avatar }),
        })
        if (!response.ok) {
          setChosen(avant)
          const data = await response.json().catch(() => ({}))
          toast.error(data.error ?? 'Changement impossible.')
          return
        }
        onChange?.(avatar)
      } catch {
        setChosen(avant)
        toast.error('Le serveur est injoignable.')
      } finally {
        setBusy(false)
      }
    },
    [busy, chosen, onChange],
  )

  const active = AVATAR_FAMILIES[family]!

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {AVATAR_FAMILIES.map((entry, index) => (
          <button
            key={entry.label}
            type="button"
            onClick={() => setFamily(index)}
            className={clsx(
              'rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors',
              index === family
                ? 'bg-accent/18 text-ink ring-1 ring-inset ring-accent/40'
                : 'text-muted hover:bg-surface-hover',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs text-faint">{active.hint}</p>

      <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
        {active.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void pick(emoji)}
            title={emoji === chosen ? 'Ton avatar' : 'Choisir cet avatar'}
            aria-pressed={emoji === chosen}
            className={clsx(
              'grid aspect-square place-items-center rounded-[var(--radius-sm)] text-xl transition-colors',
              emoji === chosen
                ? 'bg-accent/20 ring-2 ring-inset ring-accent'
                : 'hover:bg-surface-hover',
            )}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
