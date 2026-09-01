'use client'

/**
 * Choisir son avatar, en cliquant sur son avatar.
 *
 * La colonne existait, s'affichait partout — profil, carnet d'adresses,
 * classement — et rien ne permettait d'en changer : tous les comptes créés
 * étaient un pion noir. Ce n'est pas un détail dans une liste d'amis, où
 * l'avatar est ce qui distingue une ligne d'une autre avant même le pseudo.
 *
 * Le choix vivait ensuite dans un pavé déplié en permanence sous l'en-tête du
 * profil : cinq onglets de famille, une phrase d'aide et une grille de vingt
 * émojis, soit environ cent soixante points, en haut de la seule page où l'on
 * vient consulter ses classements et sa courbe. Or changer d'avatar se fait une
 * fois, parfois deux.
 *
 * Il devient donc ce qu'il aurait dû être : l'avatar lui-même est le bouton,
 * signalé par un crayon, et la grille s'ouvre en panneau. Rien n'a disparu —
 * mêmes familles, mêmes émojis, même enregistrement immédiat — et la page a
 * retrouvé sa hauteur.
 *
 * Le choix s'enregistre sans bouton de validation : il n'y a rien à confirmer,
 * et le changement se voit tout de suite là-haut.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import clsx from 'clsx'
import { AVATAR_FAMILIES, DEFAULT_AVATAR } from '@/lib/avatars.ts'
import { useFermetureExterieure } from '@/components/ui/Menu.tsx'
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
  const [family, setFamily] = useState(() => familleDe(current ?? DEFAULT_AVATAR))
  const [busy, setBusy] = useState(false)
  const [ouvert, setOuvert] = useState(false)

  const fermer = useCallback(() => setOuvert(false), [])
  const conteneur = useFermetureExterieure(ouvert, fermer)
  const boutonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (current) setChosen(current)
  }, [current])

  // À chaque ouverture, on retombe sur la famille de l'avatar porté : entre
  // deux ouvertures, on a pu se promener dans les onglets sans rien choisir.
  useEffect(() => {
    if (ouvert) setFamily(familleDe(chosen))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert])

  const pick = useCallback(
    async (avatar: string) => {
      if (busy) return
      if (avatar === chosen) {
        setOuvert(false)
        return
      }
      // On l'affiche avant la réponse du serveur : l'attente d'un aller-retour
      // pour un clic sur une grille d'émojis se remarquerait plus que l'erreur
      // qu'on évite, et le retour en arrière est immédiat en cas d'échec.
      const avant = chosen
      setChosen(avatar)
      setBusy(true)
      // Le panneau se referme sur le choix : c'est la seule chose qu'on y
      // faisait, et le voir se fermer *est* la confirmation.
      setOuvert(false)
      boutonRef.current?.focus()
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
    <div ref={conteneur} className="relative shrink-0">
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((valeur) => !valeur)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        title="Changer d’avatar"
        aria-label="Changer d’avatar"
        className={clsx(
          'group relative grid h-16 w-16 place-items-center rounded-[var(--radius)] bg-surface-strong text-3xl transition-colors',
          'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          ouvert && 'ring-2 ring-accent',
        )}
      >
        <span aria-hidden>{chosen}</span>
        {/* Le crayon dit que la vignette est cliquable. Sans lui, l'avatar
            n'est qu'une image de plus dans un en-tête, et le choix disparaît
            aussi sûrement qu'il l'était au fond de la page. */}
        <span
          className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[var(--accent-contrast)] shadow-[var(--shadow)]"
          aria-hidden
        >
          <Pencil size={11} strokeWidth={2.5} />
        </span>
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Choisir un avatar"
          className={clsx(
            'animate-slide-up popover absolute left-0 top-[4.75rem] z-50 p-3 shadow-[var(--shadow-lg)]',
            'w-[20rem] max-w-[calc(100vw-2rem)]',
          )}
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {AVATAR_FAMILIES.map((entry, index) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => setFamily(index)}
                aria-pressed={index === family}
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

          {/* Six colonnes sur téléphone, huit au-delà.

              À huit, chaque case fait trente-quatre points de côté sur un
              écran de 375 : c'est plus petit qu'un doigt, et sur une grille où
              deux voisins se ressemblent — le dragon et le lézard, le fantôme
              et le robot — viser à côté ne se remarque qu'après coup, une fois
              l'avatar changé. À six, on repasse à quarante-six. */}
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
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
      )}
    </div>
  )
}

/** Dans quel onglet se trouve cet avatar ? Le premier, à défaut. */
function familleDe(avatar: string): number {
  const index = AVATAR_FAMILIES.findIndex((entry) => entry.emojis.includes(avatar))
  return index >= 0 ? index : 0
}
