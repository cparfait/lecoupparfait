'use client'

/**
 * Le dernier coup joué, dit à voix haute et lisible par un lecteur d'écran.
 *
 * **Ce qui manquait.** `aria-live` n'existait que sur le bandeau d'ouverture et
 * sur les messages passagers. Un lecteur d'écran n'était donc jamais informé
 * que l'adversaire avait joué : la position changeait, l'échiquier était bien
 * décrit case par case, mais rien ne disait *quand* ni *quoi*. Il fallait
 * relire le plateau entier pour s'en apercevoir.
 *
 * La préférence `announceMoves` existait pour ça depuis le début et n'était
 * lue nulle part.
 *
 * **Deux canaux, deux publics.** La région `aria-live="polite"` est toujours
 * là — elle ne coûte rien, ne s'entend pas, et c'est elle qui sert un lecteur
 * d'écran. La lecture à voix haute, elle, est un confort qui s'active :
 * quelqu'un qui joue au son sans lecteur d'écran, ou qui regarde ailleurs.
 *
 * « polite » et non « assertive » : le coup ne doit pas couper la phrase en
 * cours. Il attend son tour, ce qui est exactement le comportement voulu quand
 * le coach parle déjà.
 */

import { useEffect, useRef } from 'react'
import { sanToSpeech } from '@coupparfait/core'
import { speakMove } from '@/lib/speech.ts'
import { usePreferencesDe } from '@/lib/store/preferences.ts'

export function AnnonceDuCoup({ san }: { san: string | null | undefined }) {
  const { announceMoves, locale } = usePreferencesDe('announceMoves', 'locale')

  // Ce qu'on a déjà dit. Sans ça, revenir sur l'écran ou changer un réglage
  // ferait relire le même coup — et le premier rendu annoncerait la position
  // reprise comme si elle venait d'être jouée.
  const ditRef = useRef<string | null>(null)

  useEffect(() => {
    if (!san || san === ditRef.current) return
    const premier = ditRef.current === null
    ditRef.current = san
    // On ne lit pas le coup déjà présent à l'arrivée sur l'écran : il n'a pas
    // été « joué » sous les yeux de qui vient d'ouvrir la page.
    if (premier || !announceMoves) return
    speakMove(san)
  }, [san, announceMoves])

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {san ? sanToSpeech(san, locale) : ''}
    </div>
  )
}
