'use client'

/**
 * « Pourquoi ? » — l'explication à la demande.
 *
 * Le mode commenté analyse chaque coup, qu'on l'ait demandé ou non. C'est
 * précieux quand on débute et pesant quand on progresse : on finit par lire en
 * diagonale une explication qu'on connaissait déjà, et l'habitude de la sauter
 * s'étend à celles qui auraient servi.
 *
 * Ce panneau fait l'inverse : il ne dit rien tant qu'on n'a pas demandé. Le
 * calcul est identique — même moteur, même `explainMove`, même analyse — seul
 * le déclencheur change. Il reste donc disponible quand le mode commenté est
 * éteint, et c'est précisément là qu'il sert.
 *
 * ── Il suit la liste des coups ────────────────────────────────────────────
 *
 * Il ne connaissait qu'un coup : le dernier joué. Or on demande « pourquoi ce
 * coup ? » précisément quand on remonte la partie pour comprendre où elle a
 * basculé — on clique un coup dans la liste, l'échiquier s'y replace… et le
 * panneau continuait de décrire le dernier coup de la partie, avec ses
 * meilleures options calculées sur une autre position. Le texte et l'échiquier
 * parlaient de deux moments différents, sans que rien ne le dise.
 *
 * Deux règles, donc :
 *
 *  - **en revue, le panneau suit le coup consulté** et l'analyse à la volée. Il
 *    reste ouvert d'un coup à l'autre : redemander à chaque clic reviendrait à
 *    interdire de parcourir ;
 *  - **en direct, un coup joué le referme**, comme avant : une réponse laissée
 *    sous un coup qu'elle ne décrit plus est pire que pas de réponse.
 *
 * Un coup déjà analysé se réaffiche **instantanément** : l'analyse est gardée
 * par `useLiveCommentary`, indexée par la position. Sans cela, revenir sur ses
 * pas relancerait le moteur à chaque aller-retour.
 */

import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import type { OpeningBook } from '@coupparfait/core'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import { Button } from '@/components/ui/index.tsx'
import { CommentaryPanel, useLiveCommentary } from './LiveCommentary.tsx'
import { ApprofondirCoup } from '@/components/ia/ApprofondirCoup.tsx'

export function PourquoiPanel({
  move,
  enRevue = false,
  book,
  openingName,
  className,
}: {
  /**
   * Coup sur lequel porte la question.
   *
   * Le dernier joué en direct, celui qu'on consulte en revue — l'appelant
   * tranche, puisque c'est lui qui tient le curseur de la liste des coups.
   */
  move: PlayedMove | null
  /** Parcourt-on la partie ? Le panneau suit alors, au lieu de se refermer. */
  enRevue?: boolean
  book?: OpeningBook | null
  openingName?: string | null
  className?: string
}) {
  const [ouvert, setOuvert] = useState(false)

  /**
   * La position sur laquelle on a demandé, en direct.
   *
   * C'est elle qui referme le panneau quand la partie avance : la comparer au
   * coup courant dit si l'on regarde encore ce qu'on avait demandé. On ne la
   * met pas à jour pendant une revue — sinon revenir au direct après avoir
   * parcouru laisserait le panneau ouvert sur un coup qu'on n'a pas demandé.
   */
  const [ancre, setAncre] = useState<string | null>(null)

  useEffect(() => {
    if (enRevue || !ouvert) return
    if (move?.after !== ancre) setOuvert(false)
  }, [enRevue, ouvert, move, ancre])

  const { commentary, loading, history } = useLiveCommentary({
    move,
    enabled: ouvert && move !== null,
    book,
  })

  if (!move) return null

  if (!ouvert) {
    return (
      <div className={className}>
        <Button
          size="sm"
          variant="ghost"
          fullWidth
          icon={<HelpCircle size={14} aria-hidden />}
          onClick={() => {
            setAncre(move.after)
            setOuvert(true)
          }}
        >
          Pourquoi ce coup ?
        </Button>
      </div>
    )
  }

  /*
    Ce qu'on montre décrit le coup qu'on regarde, ou rien.

    Le commentaire courant traîne d'un coup sur l'autre — le temps que le
    moteur réponde, c'est encore celui d'avant. L'afficher tel quel donnerait
    exactement ce qu'on cherche à corriger : une analyse posée sous un autre
    coup. On préfère donc le registre, qui est indexé par position, et une
    attente franche quand il n'a rien.
  */
  const analyse =
    history[move.after] ?? (commentary?.fenAfter === move.after ? commentary : null) ?? null

  return (
    <div className={className}>
      <CommentaryPanel
        commentary={analyse}
        loading={loading && analyse === null}
        placeholder={false}
      />
      <ApprofondirCoup commentary={analyse} openingName={openingName} />
    </div>
  )
}
