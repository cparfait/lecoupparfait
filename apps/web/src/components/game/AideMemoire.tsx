'use client'

/**
 * Le mémo d'avant chaque coup, posé à côté de l'échiquier.
 *
 * Toutes les autres aides de l'application montrent quelque chose *sur* le
 * plateau : les cases colorées, le nom de l'ouverture, la flèche du coup
 * proposé, le commentaire d'après-coup. Aucune n'aide à **chercher** — elles
 * donnent la réponse, ou la commentent une fois le coup joué.
 *
 * Celle-ci ne donne rien du tout. Quatre questions, toujours les mêmes, dans le
 * même ordre, et c'est au joueur d'y répondre. C'est le seul dispositif de la
 * page qui n'appelle pas le moteur — et par conséquent le seul qui reste
 * légitime en partie classée, contre quelqu'un comme contre la machine : lire
 * « qu'est-ce qu'il attaque ? » n'est pas une assistance, c'est une discipline.
 *
 * ── Deux choix d'affichage qui comptent ──────────────────────────────────────
 *
 *  - **Il ne s'ouvre pas tout seul à chaque coup.** Un panneau qui se déplie
 *    trente fois par partie devient du bruit, et on le coupe au bout de cinq
 *    minutes. Il reste dans l'état où on l'a laissé.
 *  - **Il ne coche rien.** Des cases à cocher donneraient un petit jeu de
 *    quatre clics par coup, et l'on cocherait sans regarder — ce qui est
 *    exactement le contraire du but. Le seul retour est l'ordre de lecture.
 */

import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { MEMO_AVANT_COUP } from '@/lib/apprendre/principes.ts'

export function AideMemoire({
  /** `false` pendant que l'adversaire réfléchit : il n'y a rien à décider. */
  actif = true,
  className,
}: {
  actif?: boolean
  className?: string
}) {
  const [ouvert, setOuvert] = useState(true)

  return (
    <Card className={className}>
      <EnTeteDeCarte
        titre="Avant de jouer"
        icone={<ListChecks size={14} aria-hidden />}
        teinte="var(--rub-apprendre)"
        filet={ouvert}
        onClick={() => setOuvert((etat) => !etat)}
        ouvert={ouvert}
      />

      {ouvert && (
        <div className="p-3">
          <ol className="space-y-1">
            {MEMO_AVANT_COUP.map((entree, rang) => (
              <li key={entree.question} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums"
                  style={{
                    background: 'color-mix(in oklab, var(--rub-apprendre) 16%, transparent)',
                    color: 'color-mix(in oklab, var(--rub-apprendre) 78%, var(--text))',
                  }}
                  aria-hidden
                >
                  {rang + 1}
                </span>
                {/* La question seule, et son « comment » en infobulle : le
                    panneau vit dans une colonne de trois cents pixels, à côté
                    d'une liste de coups et d'une barre d'évaluation. Quatre
                    paragraphes de deux lignes y auraient poussé tout le reste
                    hors de l'écran. */}
                <span className="text-[13px] leading-snug" title={entree.comment}>
                  {entree.question}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-3 border-t border-line/60 pt-2.5 text-[12px] leading-relaxed text-faint">
            {actif
              ? 'Dix secondes, dans cet ordre. '
              : 'C’est à lui de jouer — profites-en pour faire le tour. '}
            <Link href="/apprendre/principes" className="lien">
              Ce que chaque question regarde
            </Link>
          </p>
        </div>
      )}
    </Card>
  )
}
