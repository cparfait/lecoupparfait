'use client'

/**
 * La qualité de chaque coup joué, au fil de la partie.
 *
 * La liste des coups sait déjà colorer un verdict — elle attendait seulement
 * qu'on lui en donne un. La page d'analyse en avait, parce qu'elle produit un
 * rapport complet ; les écrans de jeu, eux, n'avaient rien à lui passer, et
 * leurs coups s'alignaient tous de la même couleur, du premier au dernier.
 *
 * Le moteur tourne dans le navigateur : rien ne part sur le réseau. On analyse
 * un coup à la fois, dans l'ordre, à profondeur modeste — il s'agit de dire
 * « ça, c'était une gaffe », pas de départager deux excellents coups, ce qui
 * reste le travail de la page d'analyse.
 *
 * Le cache est indexé par **position d'origine et coup joué**, jamais par
 * numéro de demi-coup : après une reprise, le coup 12 n'est plus le même, et un
 * verdict indexé sur son rang se retrouverait collé au coup suivant.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { classifyMove, type MoveQuality, type OpeningBook } from '@coupparfait/core'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import { analyserAvecLeNavigateur } from '@/lib/analysis/runner.ts'

/**
 * Profondeur de recherche.
 *
 * Volontairement plus basse que celle du commentaire en direct : ici on analyse
 * *tous* les coups de la partie, l'un après l'autre, et pendant que le joueur
 * joue. Douze demi-coups suffisent à repérer une pièce en prise ou un mat
 * manqué, et laissent la main à l'interface.
 */
const PROFONDEUR = 12

/**
 * Deux lignes, pas plus.
 *
 * `classifyMove` ne lit que les deux premières : la meilleure, pour savoir si
 * le coup joué était le premier choix, et la deuxième, pour mesurer l'écart qui
 * fait un « coup unique ». En demander davantage ralentit la recherche sans
 * rien changer au verdict.
 */
const LIGNES = 2

/** Ce qui distingue un coup d'un autre, indépendamment de son rang. */
function cle(move: PlayedMove): string {
  return `${move.before}|${move.uci}`
}

export function useQualitesDesCoups({
  moves,
  enabled = true,
  book = null,
}: {
  moves: PlayedMove[]
  enabled?: boolean
  book?: OpeningBook | null
}): Record<number, MoveQuality> {
  const [verdicts, setVerdicts] = useState<Record<string, MoveQuality>>({})
  // Le coup en cours d'analyse. Sans lui, chaque rendu relancerait la même
  // recherche : l'effet se redéclenche à chaque coup joué, et le moteur est
  // unique pour toute l'application.
  const enCours = useRef<string | null>(null)

  /*
    Une seule annulation, à la sortie de l'écran — et surtout pas au fil des
    rendus.

    En partie en direct, la liste des coups est reconstruite depuis l'instantané
    du serveur : c'est un tableau neuf à chaque message reçu, donc un effet
    relancé alors même que les coups n'ont pas bougé. Avec une annulation posée
    en nettoyage d'effet, chaque battement du serveur tuait la recherche en
    cours, qui repartait de zéro pour être tuée à nouveau : aucun verdict
    n'arrivait jamais.

    Rien ne justifie d'interrompre une analyse en route. Le coup qu'elle examine
    est déjà joué : son verdict reste bon quoi qu'il se passe ensuite.
  */
  const arret = useRef<AbortController | null>(null)
  useEffect(() => () => arret.current?.abort(), [])

  // La liste des coups, réduite à ce qui la distingue vraiment. Deux tableaux
  // différents portant les mêmes coups donnent la même chaîne, et l'effet ne se
  // rejoue pas pour rien.
  const signature = moves.map(cle).join(' ')

  useEffect(() => {
    if (!enabled) return
    const prochain = moves.find((move) => verdicts[cle(move)] === undefined)
    if (!prochain) return
    const clef = cle(prochain)
    if (enCours.current !== null) return

    enCours.current = clef
    const controller = new AbortController()
    arret.current = controller

    void (async () => {
      try {
        const avant = await analyserAvecLeNavigateur({
          fen: prochain.before,
          depth: PROFONDEUR,
          multiPv: LIGNES,
          signal: controller.signal,
        })
        const apres = await analyserAvecLeNavigateur({
          fen: prochain.after,
          depth: PROFONDEUR,
          multiPv: 1,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return

        const { quality } = classifyMove({
          fenBefore: prochain.before,
          uci: prochain.uci,
          san: prochain.san,
          before: { score: avant.lines[0]?.score ?? { type: 'cp', value: 0 }, lines: avant.lines },
          after: { score: apres.lines[0]?.score ?? { type: 'cp', value: 0 } },
          inBook: book?.isInBook(prochain.after) ?? false,
        })
        setVerdicts((actuels) => ({ ...actuels, [clef]: quality }))
      } catch {
        // Moteur indisponible, recherche interrompue, position refusée : la
        // liste reste simplement sans couleur. Rien de ce qu'on affiche ici ne
        // vaut d'interrompre une partie.
      } finally {
        if (enCours.current === clef) enCours.current = null
        if (arret.current === controller) arret.current = null
      }
    })()
    // `signature` et non `moves` : voir plus haut, le tableau change d'identité
    // à chaque instantané reçu du serveur sans que les coups changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, verdicts, enabled, book])

  return useMemo(() => {
    const parRang: Record<number, MoveQuality> = {}
    moves.forEach((move, rang) => {
      const verdict = verdicts[cle(move)]
      if (verdict) parRang[rang] = verdict
    })
    return parRang
  }, [moves, verdicts])
}
