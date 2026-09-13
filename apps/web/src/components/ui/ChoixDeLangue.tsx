'use client'

/**
 * Choisir sa langue dans un formulaire, drapeau compris.
 *
 * Le formulaire d'inscription a d'abord porté un `<select>` natif. Il marchait,
 * et il était le mauvais choix : une liste déroulante du système n'affiche que
 * du texte, et l'on cherchait « Français » ou « 日本語 » dans quarante et une
 * lignes toutes identiques. C'est exactement le problème que les vignettes
 * résolvent aux préférences — on repère sa langue au drapeau bien avant d'avoir
 * lu le mot, et surtout **avant de savoir lire la langue de la page**, ce qui
 * est le cas de quiconque arrive sur une interface qu'il ne comprend pas.
 *
 * La grille des préférences ne conviendrait pas ici : quarante et une cases
 * repousseraient « Créer mon compte » hors de l'écran. D'où un bouton qui montre
 * la langue courante et un panneau qui montre les autres — le `Menu` du projet,
 * qui apporte déjà la fermeture au clic extérieur, Échap, les flèches et le
 * recadrage dans la fenêtre.
 *
 * Les vignettes elles-mêmes : voir `Drapeau`, et l'en-tête de `langues.ts` pour
 * les langues qui n'en ont pas.
 */

import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { Drapeau } from '@/components/ui/Drapeau.tsx'
import { LANGUES, langue } from '@/lib/i18n/langues.ts'

export function ChoixDeLangue({
  valeur,
  onChange,
  label,
  id,
}: {
  valeur: string
  onChange: (code: string) => void
  /** Nom accessible du champ — le même que celui de son étiquette. */
  label: string
  id?: string
}) {
  const courante = langue(valeur)

  return (
    <Menu
      label={label}
      largeur="w-full"
      className="w-full"
      /*
        Vers le haut, et ce n'est pas une question de place.

        Ouvert vers le bas, le panneau retombait sur « Créer mon compte » — le
        seul élément violet plein de la page — dont le bas dépassait d'un fil
        sous le bord arrondi de la liste. On lisait un liseré violet collé au
        panneau, qui n'appartenait ni à l'un ni à l'autre. Au-dessus, la liste
        se pose sur des champs blancs, et rien ne dépasse de nulle part.
      */
      sens="haut"
      boutonClassName={clsx(
        'flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)]',
        'border border-line bg-surface px-3 text-sm transition-colors',
        'focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]',
      )}
      declencheur={(ouvert) => (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <Drapeau code={courante.drapeau ?? ''} langue={courante.nom} />
            <span className="truncate">{courante.nom}</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={clsx('shrink-0 text-faint transition-transform', ouvert && 'rotate-180')}
          />
        </>
      )}
    >
      {/* `id` sur la liste et non sur le bouton : c'est le bouton que `Menu`
          rend, et lui donner l'identifiant de l'étiquette demanderait de le
          traverser. L'étiquette désigne donc le champ par son nom accessible,
          que `label` fournit. */}
      {/* Une hauteur bien plus courte que celle du panneau.

          `Menu` plafonne à 70 % de la fenêtre, ce qui convient à ses six entrées
          habituelles et pas du tout à quarante et une : le panneau descendait
          alors sous le bas de l'écran, et il fallait faire défiler la page pour
          atteindre le défilement de la liste. */}
      <div id={id} className="flex max-h-64 flex-col overflow-y-auto">
        {LANGUES.map((entree) => {
          const choisie = entree.code === valeur
          return (
            <button
              key={entree.code}
              type="button"
              role="menuitemradio"
              aria-checked={choisie}
              onClick={() => onChange(entree.code)}
              className={clsx(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors',
                'pointer-coarse:min-h-11',
                choisie ? 'bg-surface-strong font-medium text-ink' : 'hover:bg-surface-hover',
              )}
            >
              <Drapeau code={entree.drapeau ?? ''} langue={entree.nom} />
              <span className="min-w-0 flex-1 truncate">{entree.nom}</span>
              {choisie && <Check size={14} className="shrink-0 text-accent" aria-hidden />}
            </button>
          )
        })}
      </div>
    </Menu>
  )
}
