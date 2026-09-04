'use client'

/**
 * La quête qui nous a envoyés ici.
 *
 * Les quêtes du jour sont des liens : « Enchaîner 3 puzzles » mène aux
 * puzzles, « Gagner une partie » à l'ordinateur. Jusqu'ici le lien était tout
 * ce qui les reliait à l'écran d'arrivée — on partait faire sa quête, et
 * l'écran d'arrivée ne savait pas qu'elle existait. On résolvait donc son
 * troisième puzzle sans rien voir venir qu'un petit bandeau de félicitations,
 * puis on continuait à en enchaîner sans savoir qu'on avait fini, ou l'on
 * repartait fouiller l'accueil pour vérifier.
 *
 * Chaque lien de quête porte donc `?quete=<id>`, et ce module le lit. L'écran
 * d'arrivée sait alors trois choses qu'il ignorait : **ce qu'on est venu
 * faire**, **où l'on en est**, et **à quel instant précis c'est fait**. Le
 * reste — la célébration, le choix entre continuer et rentrer — appartient à
 * chaque écran, parce qu'un puzzle et une partie ne se continuent pas de la
 * même façon.
 *
 * Le marqueur ne donne aucun droit et ne change rien au décompte : les quêtes
 * se marquent comme avant, où qu'on les fasse. Il ne sert qu'à savoir de quoi
 * l'on parle.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { QUETES, queteFaite } from './quotidien.ts'
import { quetePar } from './quetes.ts'
import type { Quete, QueteId } from './quotidien.ts'
import { useQuotidien } from './useQuotidien.ts'

export interface Mission {
  /** La quête d'où l'on vient, s'il y en a une. */
  quete: Quete | null
  /** Est-elle terminée, à cet instant ? */
  faite: boolean
  /** Avancement courant — « 2 sur 3 » pour les puzzles. */
  fait: number
  /** Combien de quêtes restent à faire aujourd'hui, celle-ci comprise. */
  restantes: number
  /**
   * Elle vient de se terminer, sous nos yeux.
   *
   * Distinct de `faite` : on n'ouvre pas une fanfare à quelqu'un qui revient
   * sur un écran pour une quête déjà remplie ce matin. Seul le passage
   * compte, et il ne se produit qu'une fois par visite.
   */
  celebrer: boolean
  /** Referme la célébration, sans rien changer à la quête. */
  fermer: () => void
}

export function useMission(): Mission {
  const { etat } = useQuotidien()
  const [id, setId] = useState<QueteId | null>(null)

  // Lu dans un effet, et non pendant le rendu : le serveur n'a pas d'adresse à
  // consulter, et une lecture directe ferait diverger l'HTML des deux côtés.
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('quete')
    if (demande && quetePar(demande)) setId(demande as QueteId)
  }, [])

  const quete = id ? (quetePar(id) ?? null) : null
  const faite = etat && id ? queteFaite(etat, id) : false
  const fait = etat && id ? (etat.avancement[id] ?? 0) : 0
  const restantes = etat ? QUETES.filter((entree) => !queteFaite(etat, entree.id)).length : 0

  const [celebrer, setCelebrer] = useState(false)
  /**
   * L'état de la quête au rendu précédent.
   *
   * `null` tant qu'on n'a rien observé : c'est ce qui distingue « elle vient
   * d'être finie » de « elle l'était déjà quand je suis arrivé ». Sans cette
   * troisième valeur, arriver sur un écran avec une quête déjà remplie
   * déclenchait la fanfare au premier rendu.
   */
  const precedent = useRef<boolean | null>(null)

  useEffect(() => {
    if (!id || !etat) return
    if (precedent.current === false && faite) setCelebrer(true)
    precedent.current = faite
  }, [id, etat, faite])

  const fermer = useCallback(() => setCelebrer(false), [])

  return { quete, faite, fait, restantes, celebrer, fermer }
}
