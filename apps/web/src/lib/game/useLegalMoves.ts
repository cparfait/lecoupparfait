'use client'

/**
 * Les coups légaux d'une position, indexés par case de départ.
 *
 * C'est ce que le plateau attend pour savoir où une pièce peut aller. La
 * boucle qui le construit était écrite **six fois** : dans `useChessGame`, et
 * recopiée dans l'analyse, les puzzles, la partie en direct, les leçons et les
 * ouvertures. Six copies du même `try/catch`, du même dédoublonnage des quatre
 * promotions, et six occasions de corriger l'une en oubliant les cinq autres.
 *
 * **Un `useMemo`, jamais un état.** La version des puzzles passait par
 * `useState` + `useEffect` : un rendu de plus à chaque position, et surtout un
 * premier rendu où la carte est vide — l'échiquier s'affichait une fraction de
 * seconde sans répondre au doigt. Ici la valeur est prête au premier rendu.
 */

import { useMemo } from 'react'
import { Chess, type Square } from 'chess.js'

export type LegalMoves = Map<Square, Square[]>

/**
 * @param fen     Position à examiner. `null` pour n'en proposer aucun.
 * @param actif   `false` fige la carte à vide : partie finie, tour de
 *                l'adversaire, exercice déjà résolu. Le calcul n'a alors pas
 *                lieu du tout.
 */
export function useLegalMoves(fen: string | null | undefined, actif = true): LegalMoves {
  return useMemo(() => {
    const carte: LegalMoves = new Map()
    if (!actif || !fen) return carte

    try {
      // `skipValidation` : les leçons et l'éditeur composent des positions sans
      // roi, parfaitement légitimes comme illustration. Refuser de les lire
      // ferait échouer l'écran au lieu de n'y proposer aucun coup.
      const echiquier = new Chess(fen, { skipValidation: true })
      for (const coup of echiquier.moves({ verbose: true })) {
        const liste = carte.get(coup.from) ?? []
        // Les quatre promotions partagent la même case d'arrivée.
        if (!liste.includes(coup.to)) liste.push(coup.to)
        carte.set(coup.from, liste)
      }
    } catch {
      // Position illisible : aucun coup proposé. C'est le comportement que les
      // six copies avaient déjà, chacune avec son propre commentaire.
    }

    return carte
  }, [fen, actif])
}
