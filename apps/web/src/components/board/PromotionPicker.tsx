'use client'

/**
 * Sélecteur de promotion.
 *
 * Apparaît sur la colonne où le pion arrive, comme un menu qui se déroule
 * depuis la case de promotion. La dame est en premier parce qu'elle est choisie
 * dans plus de 99 % des cas ; les trois autres restent accessibles, car la
 * sous-promotion existe et peut être décisive.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { useDialogue } from '@/lib/useDialogue.ts'
import { pieceUrl, squarePosition } from './boardKit.ts'

/*
  Le voile flouté disparaît en mode « performance » : le flou d'arrière-plan
  est ce qui coûte le plus cher au GPU d'un téléphone, et il s'appliquait ici
  à un plateau entier au moment précis où l'on doit choisir vite.
*/

/**
 * Le temps pendant lequel on ignore ce qu'on nous dit.
 *
 * Sur un écran tactile, le geste qui ouvre ce menu le referme aussitôt. Le pion
 * est lâché sur la case de promotion ; le menu s'ouvre **sous le doigt**, la
 * dame pile sur cette case puisqu'elle est en tête de liste ; et le navigateur
 * envoie ensuite, pour compatibilité, la volée d'événements de souris — dont un
 * `click` — au même endroit. Ce clic-là tombe sur la dame fraîchement montée.
 *
 * Vu du joueur : on promeut, rien ne s'affiche, et l'on récupère une dame. La
 * sous-promotion était donc impossible au doigt, sans que rien ne l'explique.
 * Le même clic tombant à côté du menu déclenchait l'annulation, et le coup
 * était perdu.
 *
 * Trois cent vingt millisecondes couvrent le délai de compatibilité des
 * navigateurs (300 ms) avec une marge. Personne ne choisit sa pièce en moins de
 * temps que ça : le menu vient d'apparaître, il faut d'abord le voir.
 */
const DELAI_DE_GARDE_MS = 320

/**
 * La case en deçà de laquelle le menu quitte sa colonne.
 *
 * Sur la colonne, chaque choix a la taille d'une case : un huitième du
 * plateau. À 344 px de plateau — un téléphone de 360 —, c'est 43 px, et sur
 * le plancher de 260 px, 32 : on rate la tour et l'on reçoit un fou. Sous
 * quarante-quatre points, le menu passe au centre, où ses choix font 64 px
 * quelle que soit la taille du plateau.
 */
const CASE_MIN_AU_DOIGT_PX = 44

const CHOICES: Array<{ type: PieceSymbol; labelFr: string }> = [
  { type: 'q', labelFr: 'Dame' },
  { type: 'r', labelFr: 'Tour' },
  { type: 'b', labelFr: 'Fou' },
  { type: 'n', labelFr: 'Cavalier' },
]

export function PromotionPicker({
  color,
  square,
  orientation,
  pieceSet,
  centre = false,
  onSelect,
  onCancel,
}: {
  color: Color
  square: Square
  orientation: Color
  pieceSet: string
  /**
   * Poser le choix au milieu du plateau plutôt que sur la colonne d'arrivée.
   *
   * Les coordonnées de case sont celles d'un damier vu de face, en pourcentages
   * du carré. En 3D, le plateau est en perspective et sous un angle que l'on
   * fait tourner à la souris : la colonne calculée ne tombe alors sur rien, et
   * le menu s'ouvrait à côté du pion, voire au-dessus d'une autre case. Un
   * rang centré ne prétend désigner aucune case et reste juste sous tous les
   * angles.
   */
  centre?: boolean
  onSelect: (type: PieceSymbol) => void
  onCancel: () => void
}) {
  /*
    Le dialogue au clavier.

    Il se disait modal — `role="dialog" aria-modal="true"` — et ne l'était pas :
    au clavier, on poussait son pion à la huitième rangée et le focus restait
    sur la case du plateau. Tab s'en allait dans la barre de navigation, Entrée
    ne choisissait rien, Échap ne fermait rien. Promouvoir demandait la souris.

    La dame prend le focus, puisqu'elle est en tête et choisie dans plus de
    99 % des cas : Entrée suffit alors, ce qui est le geste le plus rapide
    possible. Échap annule le coup.
  */
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, { onFermer: onCancel })

  /*
    Le plateau est-il assez grand pour la colonne ?

    Le voile couvre exactement le plateau : sa largeur est celle du plateau,
    et un huitième en fait la case. Mesuré avant la première peinture, pour
    que le menu n'apparaisse pas d'abord en colonne puis saute au centre ; et
    resuivi ensuite, pour un téléphone tourné pendant qu'on choisit.
  */
  const voile = useRef<HTMLDivElement>(null)
  const [plateauEtroit, setPlateauEtroit] = useState(false)
  useLayoutEffect(() => {
    const element = voile.current
    if (!element) return
    const mesurer = () => {
      setPlateauEtroit(element.getBoundingClientRect().width / 8 < CASE_MIN_AU_DOIGT_PX)
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  /*
    On ignore le clic qui appartient au geste d'ouverture — voir
    `DELAI_DE_GARDE_MS`. Le garde vaut pour le choix comme pour l'annulation :
    les deux se déclenchaient tout seuls, et perdre le coup est encore pire que
    recevoir une dame qu'on n'a pas demandée.

    Une référence et non un état : ce compte à rebours ne redessine rien, et le
    relire à chaque rendu ferait repartir la fenêtre à zéro.
  */
  const ouvertA = useRef(Date.now())
  const tropTot = () => Date.now() - ouvertA.current < DELAI_DE_GARDE_MS
  const choisir = useCallback(
    (type: PieceSymbol) => {
      if (tropTot()) return
      onSelect(type)
    },
    [onSelect],
  )
  const annuler = useCallback(() => {
    if (tropTot()) return
    onCancel()
  }, [onCancel])

  const { left, top } = squarePosition(square, orientation)
  // Le menu se déroule vers le bas s'il y a la place, vers le haut sinon.
  const downwards = top < 50

  if (centre || plateauEtroit) {
    return (
      <div
        ref={voile}
        className="absolute inset-0 z-50 grid place-items-center"
        onClick={annuler}
        onContextMenu={(event) => {
          event.preventDefault()
          onCancel()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Choix de la pièce de promotion"
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] [[data-effects=low]_&]:backdrop-blur-none" />

        <div
          ref={boite}
          className="popover relative flex gap-1 p-2 shadow-[var(--shadow-lg)]"
          onClick={(event) => event.stopPropagation()}
        >
          {CHOICES.map(({ type, labelFr }, index) => (
            <button
              key={type}
              type="button"
              title={labelFr}
              aria-label={labelFr}
              onClick={() => choisir(type)}
              className="group grid h-16 w-16 place-items-center rounded-[var(--radius-sm)] border border-line-strong transition-transform hover:scale-105 hover:brightness-110 focus-visible:scale-105"
              /* Le fond prend la couleur de case opposée à la pièce : une
                 pièce noire sur une surface sombre — le thème Club, le soir —
                 ne se voyait plus, et l'on promouvait à l'aveugle. */
              style={{
                background: color === 'b' ? 'var(--sq-light)' : 'var(--sq-dark)',
                animation: `slide-up .18s cubic-bezier(.16,1,.3,1) ${index * 35}ms both`,
              }}
            >
              <img
                src={pieceUrl(pieceSet, color, type)}
                alt=""
                draggable={false}
                className="h-full w-full p-[10%]"
              />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={voile}
      className="absolute inset-0 z-50"
      onClick={annuler}
      onContextMenu={(event) => {
        event.preventDefault()
        onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Choix de la pièce de promotion"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] [[data-effects=low]_&]:backdrop-blur-none" />

      <div
        ref={boite}
        className="absolute flex flex-col"
        style={{
          left: `${left}%`,
          top: downwards ? `${top}%` : undefined,
          bottom: downwards ? undefined : `${87.5 - top}%`,
          width: '12.5%',
          flexDirection: downwards ? 'column' : 'column-reverse',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {CHOICES.map(({ type, labelFr }, index) => (
          <button
            key={type}
            type="button"
            title={labelFr}
            aria-label={labelFr}
            onClick={() => choisir(type)}
            className="group relative aspect-square w-full transition-transform hover:scale-105 focus-visible:scale-105"
            style={{
              animation: `slide-up .18s cubic-bezier(.16,1,.3,1) ${index * 35}ms both`,
            }}
          >
            <span
              className="absolute inset-[6%] rounded-[var(--radius-sm)] border border-line-strong shadow-[var(--shadow)] transition-[filter] group-hover:brightness-110"
              /* Même règle qu'au centre : la case opposée à la pièce, pour
                 qu'une pièce noire ne se fonde pas dans un fond sombre. */
              style={{
                boxShadow: 'var(--glow)',
                background: color === 'b' ? 'var(--sq-light)' : 'var(--sq-dark)',
              }}
            />
            <img
              src={pieceUrl(pieceSet, color, type)}
              alt=""
              draggable={false}
              className="relative h-full w-full p-[8%]"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
