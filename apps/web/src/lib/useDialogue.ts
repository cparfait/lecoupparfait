'use client'

/**
 * Ce qu'un dialogue modal doit faire au clavier, et que ceux-ci ne faisaient pas.
 *
 * Quatre composants portaient `role="dialog" aria-modal="true"` — une promesse
 * faite aux technologies d'assistance : *le reste de la page est inerte, tout
 * se passe ici*. Aucun ne la tenait. Concrètement, sur le sélecteur de
 * promotion : on pousse son pion à la huitième rangée au clavier, le dialogue
 * s'ouvre, le focus reste sur la case du plateau. Tab s'en va dans la barre de
 * navigation, Entrée ne choisit rien, Échap ne ferme rien. Le seul moyen de
 * promouvoir était la souris.
 *
 * Quatre gestes, donc, et ils vont ensemble :
 *
 *  1. **Mémoriser d'où l'on vient** et y rendre le focus à la fermeture. Sans
 *     ça, on revient au début du document et l'on a tout perdu de sa place.
 *  2. **Donner le focus** au premier élément utile. C'est le geste qui manque
 *     le plus souvent, et le seul qui se voie tout de suite.
 *  3. **Piéger Tab et Maj+Tab** dans le conteneur, en boucle.
 *  4. **Fermer sur Échap**, parce que c'est la seule touche que tout le monde
 *     essaie.
 *
 * Le piège à focus est fait à la main plutôt qu'avec `inert` sur le reste de
 * la page : il faudrait alors désigner « le reste », ce qui suppose une racine
 * connue — et deux de ces dialogues vivent à l'intérieur de l'échiquier, pas
 * au niveau du document.
 */

import { useEffect, useRef, type RefObject } from 'react'

/** Ce qui peut recevoir le focus, dans l'ordre du document. */
const FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface OptionsDialogue {
  /** Appelé sur Échap. Sans lui, la touche ne fait rien. */
  onFermer?: () => void
  /**
   * Élément qui prend le focus à l'ouverture. Par défaut, le premier de la
   * liste — ce qui convient quand le choix par défaut est en tête, comme la
   * dame du sélecteur de promotion.
   */
  focusInitial?: RefObject<HTMLElement | null>
  /** `false` désarme tout : le dialogue n'est pas affiché. */
  actif?: boolean
}

export function useDialogue(
  conteneur: RefObject<HTMLElement | null>,
  { onFermer, focusInitial, actif = true }: OptionsDialogue = {},
): void {
  /*
    La fermeture passe par une référence, et ce n'est pas un détail de style.

    Presque tous les appelants écrivent `onFermer={() => setOuvert(false)}` :
    une fonction neuve à chaque rendu. Avec elle en dépendance, l'effet se
    défaisait et se refaisait **à chaque rendu du parent** — et il pose le focus
    en entrant, le rend en sortant.

    Sur un écran de partie, le parent se redessine à chaque battement de
    pendule, c'est-à-dire une fois par seconde. Le tchat ouvert sur téléphone
    devenait alors inutilisable : le clavier s'ouvrait, se refermait, se
    rouvrait, indéfiniment, parce que le focus sautait de la saisie à
    l'élément précédent une fois par seconde.

    L'effet ne dépend donc plus que de ce qui change vraiment — le conteneur et
    l'état d'ouverture. Le rappel le plus récent est lu au moment où l'on s'en
    sert.
  */
  const fermerRef = useRef(onFermer)
  fermerRef.current = onFermer

  useEffect(() => {
    const boite = conteneur.current
    if (!actif || !boite) return

    // Là où le focus était avant l'ouverture. `activeElement` peut être le
    // `body` si l'on vient de la souris : on ne lui rendra alors rien, ce qui
    // est le bon comportement.
    const precedent = document.activeElement as HTMLElement | null

    const cibles = () => [...boite.querySelectorAll<HTMLElement>(FOCUSABLES)]

    const premier = focusInitial?.current ?? cibles()[0]
    // `preventScroll` : donner le focus à un bouton d'un dialogue posé sur
    // l'échiquier faisait sauter la page sur téléphone.
    premier?.focus({ preventScroll: true })

    const auClavier = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        fermerRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const liste = cibles()
      if (liste.length === 0) return
      const debut = liste[0]!
      const fin = liste[liste.length - 1]!

      // La boucle : depuis le dernier, Tab revient au premier ; depuis le
      // premier, Maj+Tab va au dernier. On ne sort jamais du conteneur.
      if (event.shiftKey && document.activeElement === debut) {
        event.preventDefault()
        fin.focus()
      } else if (!event.shiftKey && document.activeElement === fin) {
        event.preventDefault()
        debut.focus()
      } else if (!boite.contains(document.activeElement)) {
        // Le focus s'est échappé — un clic ailleurs, une navigation. On le
        // ramène plutôt que de laisser le dialogue prétendre être modal.
        event.preventDefault()
        debut.focus()
      }
    }

    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('keydown', auClavier)
      // Rendre le focus, mais seulement s'il est encore quelque part de sensé :
      // rendre le focus à un élément qui a disparu du document le poserait sur
      // le `body`, c'est-à-dire nulle part.
      if (precedent?.isConnected) precedent.focus({ preventScroll: true })
    }
  }, [conteneur, focusInitial, actif])
}
