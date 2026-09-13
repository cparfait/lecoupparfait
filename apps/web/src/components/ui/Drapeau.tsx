'use client'

/**
 * La vignette d'une langue.
 *
 * Les drapeaux étaient des émojis — `🇫🇷`, `🇬🇧` — et c'est une impasse sur la
 * moitié des machines : **Windows n'embarque aucune police de drapeaux**. Le
 * système y affiche alors les deux lettres du code régional, si bien que le
 * sélecteur de langue montrait « FR Français » et « GB English » en petites
 * capitales. Vu du lecteur, ce n'est pas un choix de dessin, c'est un carré
 * cassé.
 *
 * On sert donc des images. Des SVG posés dans `public/drapeaux/`, téléchargés
 * une fois par `npm run data:drapeaux`, comme les jeux de pièces et les
 * bruitages — et jamais un service extérieur : une application qui promet de ne
 * rien envoyer ailleurs ne va pas chercher trente-six images sur un serveur
 * tiers, qui verrait au passage l'adresse de chaque lecteur.
 *
 * ── Deux cas, et aucun ne doit casser ───────────────────────────────────────
 *
 *  1. **Le fichier est là** : on l'affiche. C'est désormais le cas des quarante
 *     et une langues — y compris de celles qu'aucun pays ne représente
 *     honnêtement, qui prennent le drapeau le plus proche ou celui d'une union :
 *     voir l'en-tête de `langues.ts`.
 *  2. **Le fichier manque**, parce que le téléchargement des ressources n'a pas
 *     été lancé : on retombe sur une pastille de deux lettres. L'application
 *     reste utilisable sans avoir rien à installer, ce qui est la règle de tous
 *     les autres téléchargements du projet.
 *
 * La pastille était autrefois le cas **nominal** de cinq langues, et c'est ce
 * qui a changé : cinq rectangles gris au milieu de trente-six vignettes
 * colorées se lisaient comme cinq images qui n'ont pas chargé.
 */

import { useState } from 'react'
import clsx from 'clsx'

export function Drapeau({
  code,
  /** Le nom de la langue, pour les lecteurs d'écran. */
  langue,
  className,
}: {
  /** Code du fichier dans `public/drapeaux/`, ou `''` si la langue n'en a pas. */
  code: string
  langue: string
  className?: string
}) {
  const [absent, setAbsent] = useState(false)

  if (!code || absent) {
    return (
      <span
        className={clsx(
          'inline-grid h-4 w-6 shrink-0 place-items-center rounded-[3px]',
          'bg-surface-strong text-[9px] font-bold uppercase leading-none tracking-tight text-muted',
          className,
        )}
        aria-hidden
      >
        {/* Les deux premières lettres du nom de la langue, et non son code ISO :
            « ES » ne dit rien de plus que « Español » écrit juste à côté, alors
            que la vignette sert à retrouver sa ligne dans une liste de quarante
            et une. Deux lettres de son propre alphabet s'y repèrent — « Ру »
            pour le russe, « عر » pour l'arabe. */}
        {langue.slice(0, 2)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/drapeaux/${code}.svg`}
      alt=""
      width={24}
      height={16}
      loading="lazy"
      onError={() => setAbsent(true)}
      className={clsx(
        'h-4 w-6 shrink-0 rounded-[3px] object-cover',
        // Un filet très fin : les drapeaux à fond blanc — Japon, Pologne — se
        // fondent sinon dans le fond clair de la carte et paraissent tronqués.
        'ring-1 ring-[color-mix(in_oklab,var(--text)_14%,transparent)]',
        className,
      )}
      aria-hidden
    />
  )
}
