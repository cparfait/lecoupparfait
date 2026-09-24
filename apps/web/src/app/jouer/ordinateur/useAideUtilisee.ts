'use client'

import { useCallback, useRef, useState } from 'react'

/** Les deux aides du moteur qui retirent une partie du classement. */
export type AideDuMoteur = 'indice' | 'annulation'

/**
 * L'aide du moteur retenue pour une partie, sous ses deux formes : l'état pour
 * l'affichage, le renvoi pour les rappels. Voir leurs commentaires.
 */
export function useAideUtilisee() {
  /**
   * Une aide du moteur a-t-elle servi dans cette partie ?
   *
   * Si oui, la partie ne va au classement sous aucun prétexte — ni pour y
   * gagner des points, ni pour en faire perdre à l'adversaire.
   *
   * ── Pourquoi un état, alors que les boutons sont déjà masqués ────────────
   *
   * L'interface cache « Indice » et « Annuler » dès qu'une partie est classée,
   * et c'est très bien tant que l'interface est la seule porte. Ce n'en est pas
   * une garantie : la règle n'existait nulle part ailleurs que dans deux
   * conditions d'affichage, à deux endroits différents — la barre du pouce et
   * celle du grand écran —, et il suffisait qu'un rendu en retard, un raccourci
   * clavier ou une refonte en oublie une pour qu'une partie assistée arrive au
   * classement sans que rien ne s'y oppose.
   *
   * La règle est donc écrite là où elle se décide : au moment d'archiver. Le
   * serveur a d'ailleurs toujours décrit une partie classée comme une partie
   * jouée « sans Annuler, sans Indice et sans le mode commenté » — c'est cette
   * phrase-là qui devient exécutable.
   *
   * On retient **laquelle** des deux aides a servi : la boîte de fin le dit,
   * et « ta partie n'est pas classée » sans raison passe pour une panne.
   */
  const [aideUtilisee, setAideUtilisee] = useState<AideDuMoteur | null>(null)
  /**
   * La même chose, lisible depuis les rappels du moteur de jeu.
   *
   * `onGameOver` est passé à `useChessGame` et capture les valeurs du rendu où
   * il a été créé : y lire l'état donnerait celui d'avant l'indice, c'est-à-dire
   * exactement le contraire de la règle. Le renvoi, lui, dit toujours la vérité.
   */
  const aideRef = useRef<AideDuMoteur | null>(null)
  const noterAide = useCallback((quoi: AideDuMoteur) => {
    // La première suffit : on retient laquelle, pas combien.
    aideRef.current ??= quoi
    setAideUtilisee((deja) => deja ?? quoi)
  }, [])

  return { aideUtilisee, aideRef, noterAide }
}
