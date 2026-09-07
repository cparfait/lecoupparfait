'use client'

/**
 * Bandeau d'un joueur : identité, classement, pendule, matériel capturé.
 *
 * Placé au-dessus et au-dessous de l'échiquier, il donne en un regard les trois
 * informations qu'on consulte sans arrêt pendant une partie : à qui est le
 * trait, combien de temps il reste, et qui a du matériel en plus.
 */

import { memo } from 'react'
import clsx from 'clsx'
import type { Color, PieceSymbol } from 'chess.js'
import { clockUrgency, formatClock, type ClockState, type TimeControl } from '@coupparfait/core'
import { PenduleVive } from './PenduleVive.tsx'
import { pieceUrl } from '@/components/board/boardKit.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

export interface PlayerBarProps {
  name: string
  /** Classement affiché, ou `null` pour un invité. */
  rating?: number | null
  /** Marque le classement comme provisoire (`?` après le nombre). */
  provisional?: boolean
  color: Color
  /** Emoji ou URL d'avatar. */
  avatar?: string
  /** Temps restant en millisecondes, ou `null` si la partie n'est pas chronométrée. */
  timeMs?: number | null
  /**
   * Pendule vivante, qui bat toute seule.
   *
   * À préférer à `timeMs` : celui-ci oblige l'écran appelant à tenir le temps
   * dans son état et à se re-rendre en entier à chaque dixième de seconde.
   * Passée ici, la pendule ne fait battre que la pastille. L'état est figé —
   * des horodatages absolus —, il ne change qu'au coup.
   *
   * Les deux coexistent : `timeMs` reste juste pour un temps qu'on ne
   * décompte pas, comme celui d'une partie qu'on relit.
   */
  clock?: ClockState | null
  timeControl?: TimeControl
  /** Vrai si c'est à ce joueur de jouer. */
  active?: boolean
  /** Pièces que ce joueur a capturées. */
  captured?: PieceSymbol[]
  /** Différence de matériel de son point de vue (positive = il mène). */
  materialLead?: number
  /** Étiquette secondaire : « Niveau 12 », « en ligne », « réfléchit… ». */
  status?: string
  className?: string
}

export const PlayerBar = memo(function PlayerBar({
  name,
  rating,
  provisional,
  color,
  avatar,
  timeMs,
  clock,
  timeControl,
  active,
  captured = [],
  materialLead = 0,
  status,
  className,
}: PlayerBarProps) {
  const pieceSet = usePreferences((state) => state.pieceSet)

  /**
   * La pastille de la pendule.
   *
   * Sortie en fonction plutôt que dupliquée : elle est rendue soit avec un
   * temps figé, soit à chaque battement de `PenduleVive`, et les deux doivent
   * se ressembler au pixel près — l'urgence colore, l'inactivité éteint.
   */
  const pastille = (ms: number, texte: string) => {
    const urgency = timeControl ? clockUrgency(ms, timeControl) : 'calm'
    return (
      <div
        className={clsx(
          'shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1 font-mono text-xl font-bold tabular-nums leading-none transition-colors',
          // La pendule de celui qui attend garde une surface, elle aussi : sans
          // fond, deux chiffres blancs sur la page ne se lisaient pas comme une
          // pendule mais comme du texte.
          active ? 'bg-accent/20 text-ink' : 'bg-surface-strong text-muted',
          urgency === 'critical' && active && 'bg-[var(--q-blunder)] text-white animate-pulse',
          urgency === 'low' && active && 'text-[var(--q-inaccuracy)]',
        )}
        role="timer"
        aria-label={`Temps restant de ${name}`}
      >
        {texte}
      </div>
    )
  }

  return (
    /*
      Un bandeau accroché au plateau, et non une carte posée à côté.

      Les deux bandeaux ont été des cartes — fond, liseré, filet d'accent —
      séparées de l'échiquier par un écart. Trois objets empilés avec du vide
      entre eux : l'œil lisait trois choses, alors qu'il n'y en a qu'une, la
      partie. Ils perdent leur boîte et se posent contre le plateau, à sa
      largeur exacte quand la page la connaît (voir `--cote-plateau`).

      Celui qui a le trait se voit toujours, mais autrement : l'avatar prend
      un anneau d'accent, le nom passe en gras, et l'étiquette d'état — « à
      toi de jouer », « réfléchit… » — s'écrit dans la couleur d'accent. C'est
      l'information qu'on cherche du coin de l'œil pendant qu'on regarde
      ailleurs, et un anneau lumineux se repère mieux qu'un fond à peine plus
      clair que la page.
    */
    <div
      className={clsx(
        'relative flex max-w-full items-center gap-2.5 px-1 py-1.5 transition-colors',
        'w-[var(--cote-plateau,100%)] justify-self-center',
        className,
      )}
    >
      {/* Avatar + pastille de couleur du camp */}
      <div className="relative shrink-0">
        <div
          className={clsx(
            'grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-lg transition-shadow',
            'bg-surface-strong ring-1 ring-line',
            active && 'ring-2 ring-accent shadow-[0_0_18px_-4px_var(--accent)]',
          )}
        >
          {/* Le test portait sur `http` seul, ce qui suffisait tant que les
              seuls avatars-images venaient d'ailleurs. Les portraits des
              adversaires sont servis par l'application, sous `/brand/…` : sans
              la barre oblique, le chemin serait tombé dans la branche « émoji »
              et affiché tel quel, en toutes lettres, dans la pastille. */}
          {/* `object-contain` et non `cover` : les portraits d'adversaires sont
              des sculptures détourées, plus hautes que larges. En `cover`, la
              pastille carrée leur couperait les oreilles.

              Et `h-9 w-9` plutôt que `h-full w-full`, qui débordait de 28 px.
              Le conteneur est une grille sans `grid-template-rows` : sa ligne
              se dimensionne donc sur son contenu, pendant que le contenu
              prétend faire 100 % de la ligne. Devant ce cercle, les navigateurs
              résolvent le pourcentage en `auto` — et l'image reprenait sa
              hauteur intrinsèque, sculpture débordant par-dessus le liseré. */}
          {/*
            `<img>` et non `next/image`, volontairement : un avatar peut être
            n'importe quelle adresse, y compris hors du domaine. `next/image`
            refuse un hôte qui n'est pas déclaré dans `remotePatterns`, et
            déclarer « tous les hôtes » reviendrait à faire de notre serveur un
            optimiseur d'images pour le reste du web. Trente-six pixels ne
            valent pas ça.
          */}
          {avatar && (avatar.startsWith('/') || avatar.startsWith('http')) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-9 w-9 rounded-[inherit] object-contain" />
          ) : (
            <span aria-hidden>{avatar ?? (color === 'w' ? '♔' : '♚')}</span>
          )}
        </div>
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--bg)]',
            color === 'w' ? 'bg-[var(--eval-white)]' : 'bg-[var(--eval-black)]',
          )}
          aria-label={color === 'w' ? 'Blancs' : 'Noirs'}
        />
      </div>

      {/* Identité et matériel */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={clsx('truncate text-sm', active ? 'font-bold' : 'font-semibold')}>
            {name}
          </span>
          {rating != null && (
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {rating}
              {provisional && <span className="text-faint">?</span>}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex h-5 items-center gap-1">
          {captured.length > 0 ? (
            <CapturedRow pieces={captured} pieceSet={pieceSet} color={color === 'w' ? 'b' : 'w'} />
          ) : status ? (
            <span
              className={clsx(
                'truncate text-[12px]',
                active ? 'font-medium text-accent' : 'text-faint',
              )}
            >
              {status}
            </span>
          ) : null}
          {materialLead > 0 && (
            <span className="ml-0.5 text-[12px] font-semibold tabular-nums text-muted">
              +{materialLead}
            </span>
          )}
        </div>
      </div>

      {/* Pendule */}
      {clock ? (
        <PenduleVive clock={clock} color={color}>
          {pastille}
        </PenduleVive>
      ) : (
        timeMs != null && pastille(timeMs, formatClock(timeMs))
      )}
    </div>
  )
})

/**
 * Pièces capturées, groupées par type et légèrement chevauchées.
 * Le chevauchement évite qu'une file de huit pions ne déborde de la ligne.
 */
function CapturedRow({
  pieces,
  pieceSet,
  color,
}: {
  pieces: PieceSymbol[]
  pieceSet: string
  color: Color
}) {
  const order: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p']
  const sorted = [...pieces].sort((a, b) => order.indexOf(a) - order.indexOf(b))

  /*
    Un liseré de la couleur opposée à la pièce.

    Les silhouettes sont peintes dans les deux seules couleurs que prennent
    aussi nos fonds : un pion noir sur le fond nuit du thème par défaut, c'est
    du noir sur du noir — la prise du joueur noir ne se voyait tout simplement
    pas. Le trait que portent les SVG ne sauve rien : à seize pixels, ses 1,5
    unités sur 45 retombent sous le demi-pixel.

    On cerne donc chaque pièce de son propre contraire, et non d'une couleur
    de thème : le liseré ne sert qu'au camp qui se confond avec le fond, et
    l'autre le porte sans qu'on le remarque. La règle vaut donc telle quelle
    sur les quatre thèmes, clair compris, où ce sont les blancs qui
    s'effacent.
  */
  const lisere =
    color === 'b'
      ? 'drop-shadow(0 0 1px rgb(255 255 255 / .95)) drop-shadow(0 0 1.5px rgb(255 255 255 / .6))'
      : 'drop-shadow(0 0 1px rgb(0 0 0 / .95)) drop-shadow(0 0 1.5px rgb(0 0 0 / .6))'

  return (
    <span className="flex items-center" aria-label="Pièces capturées">
      {sorted.map((type, index) => (
        <img
          key={`${type}-${index}`}
          src={pieceUrl(pieceSet, color, type)}
          alt=""
          // Dix-huit pixels et pleine opacité : le voile à 75 % achevait
          // d'effacer ce que le fond mangeait déjà.
          className="h-[18px] w-[18px]"
          style={{ marginLeft: index === 0 ? 0 : -6, filter: lisere }}
        />
      ))}
    </span>
  )
}
