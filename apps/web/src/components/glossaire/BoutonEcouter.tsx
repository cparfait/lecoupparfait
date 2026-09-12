'use client'

/**
 * Écouter une définition.
 *
 * Le glossaire définit soixante-quatorze mots en trois à huit lignes chacun,
 * et c'est un mur de texte pour qui lit mal, lit lentement, ou apprend le
 * vocabulaire dans une langue qui n'est pas la sienne. Tout le reste de
 * l'application se dit à voix haute — les leçons, les coups, l'analyse ; il n'y
 * avait qu'ici qu'il fallait lire.
 *
 * La lecture part sur demande, jamais toute seule : on ouvre une page de
 * définitions pour les parcourir des yeux, et une voix qui se déclenche à
 * l'affichage serait une nuisance. Elle passe outre le réglage « voix du
 * coach », qui fait taire ce qui parle sans qu'on l'ait demandé — voir
 * `force` dans `speech.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import clsx from 'clsx'
import { speak, stopSpeaking } from '@/lib/speech.ts'

/**
 * Le bouton qui lit en ce moment.
 *
 * La synthèse ne prononce qu'une chose à la fois : demander une deuxième
 * définition coupe la première. Sans ce renvoi, le bouton qu'on vient de
 * couper resterait allumé — deux haut-parleurs en marche pour une seule voix.
 * Le rappel `onEnd` ne suffit pas : la voix neuronale, elle, coupe le lecteur
 * précédent sans repasser par lui.
 */
let lecteurEnCours: (() => void) | null = null

export function BoutonEcouter({
  texte,
  quoi,
  className,
}: {
  /** Le texte prononcé. */
  texte: string
  /** Ce qu'on écoute, pour l'annoncer aux lecteurs d'écran : « pion passé ». */
  quoi: string
  className?: string
}) {
  const [parle, setParle] = useState(false)
  /*
    Le même état, lisible tout de suite.

    Le nettoyage de démontage ne peut pas dépendre de `parle` : la remise à
    zéro du bouton précédent déclencherait alors son nettoyage — donc un
    `stopSpeaking` — juste après que le suivant a commencé à parler, et le
    second clic couperait sa propre lecture.
  */
  const lit = useRef(false)

  const marquer = useCallback((etat: boolean) => {
    lit.current = etat
    setParle(etat)
  }, [])

  // Quitter la page — ou refermer la boîte — pendant une lecture laissait la
  // voix finir sa phrase dans le vide.
  useEffect(() => {
    return () => {
      if (lit.current) stopSpeaking()
    }
  }, [])

  const basculer = useCallback(() => {
    if (lit.current) {
      lecteurEnCours = null
      marquer(false)
      stopSpeaking()
      return
    }

    // La lecture en cours, s'il y en a une, rend la main : la synthèse ne
    // prononce qu'une chose à la fois, et son bouton doit le montrer.
    lecteurEnCours?.()
    const rendre = () => marquer(false)
    lecteurEnCours = rendre

    marquer(true)
    speak(texte, {
      force: true,
      onEnd: () => {
        if (lecteurEnCours === rendre) lecteurEnCours = null
        rendre()
      },
    })
  }, [texte, marquer])

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={parle ? 'Arrêter la lecture' : `Écouter la définition de « ${quoi} »`}
      title={parle ? 'Arrêter la lecture' : 'Écouter la définition'}
      aria-pressed={parle}
      className={clsx(
        // Trente-deux points de côté : la plus petite cible qu'on vise au
        // pouce sans se tromper de carte.
        'grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] transition-colors',
        parle ? 'bg-accent/15 text-accent' : 'text-faint hover:bg-surface-hover hover:text-ink',
        className,
      )}
    >
      <Volume2 size={15} className={clsx(parle && 'animate-pulse')} aria-hidden />
    </button>
  )
}
