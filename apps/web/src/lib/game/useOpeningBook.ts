'use client'

/**
 * Chargement du livre d'ouvertures.
 *
 * Les 3 810 ouvertures pèsent environ 650 Ko en JSON — trop pour le paquet
 * initial, négligeable en chargement différé. On les récupère une seule fois
 * par session, on garde l'index en mémoire, et toutes les pages le partagent.
 */

import { useEffect, useMemo, useState } from 'react'
import { OpeningBook, loadOpeningBook } from '@coupparfait/core'

let sharedBook: OpeningBook | null = null
let loading: Promise<OpeningBook> | null = null

/** Charge (ou réutilise) l'index des ouvertures. */
export function ensureOpeningBook(): Promise<OpeningBook> {
  if (sharedBook) return Promise.resolve(sharedBook)
  if (loading) return loading
  loading = loadOpeningBook('/data/openings.json')
    .then((book) => {
      sharedBook = book
      return book
    })
    .catch((error) => {
      // Un échec de chargement ne doit pas empêcher de jouer : on repart d'un
      // livre vide, et l'ouverture ne sera simplement pas nommée.
      loading = null
      console.warn('[ouvertures] chargement impossible :', error)
      sharedBook = new OpeningBook()
      return sharedBook
    })
  return loading
}

export function useOpeningBook(): { book: OpeningBook | null; ready: boolean } {
  const [book, setBook] = useState<OpeningBook | null>(sharedBook)

  useEffect(() => {
    if (book) return
    let cancelled = false
    void ensureOpeningBook().then((loaded) => {
      if (!cancelled) setBook(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [book])

  return { book, ready: book !== null }
}

/**
 * Ouverture correspondant à une suite de coups, ou `null`.
 *
 * Le résultat est **calculé**, pas stocké dans un état. La version précédente
 * passait par `useState` + `useEffect` avec `sanMoves` en dépendance, et les
 * appelants construisent cette liste à chaque rendu (`moves.map((m) => m.san)`).
 * L'effet se redéclenchait donc à chaque rendu et posait un objet neuf, jamais
 * égal au précédent : rendu, effet, rendu, effet — une boucle infinie dès le
 * premier coup reconnu.
 *
 * Une boucle de rendu ne se contente pas de faire chauffer le processeur : elle
 * affame le fil principal, et tout ce qui en dépend se dégrade. C'est ce qui
 * hachait la lecture de la voix du coach au point de la rendre inaudible.
 *
 * On réduit la liste à une chaîne : c'est elle, et non l'identité du tableau,
 * qui décide s'il faut recalculer.
 */
export function useCurrentOpening(
  sanMoves: string[],
  locale: 'fr' | 'en' = 'fr',
): { eco: string; name: string; ply: number } | null {
  const { book } = useOpeningBook()
  const key = sanMoves.join(' ')

  return useMemo(() => {
    if (!book || !key) return null

    // Au-delà de la profondeur du livre, plus rien à trouver : on évite un
    // parcours inutile à chaque coup d'une partie longue.
    const identified = book.identify(key.split(' ').slice(0, book.depth), locale)
    if (!identified) return null

    return { eco: identified.eco, name: identified.label, ply: identified.atPly }
  }, [book, key, locale])
}
