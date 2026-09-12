'use client'

/**
 * Les parties de ses amis contre l'ordinateur, suivies coup par coup.
 *
 * Une partie contre la machine se joue **entièrement dans le navigateur** : le
 * serveur temps réel, qui alimente la liste des parties en direct, n'en sait
 * rien. Un ami qui lançait une partie contre l'ordinateur n'apparaissait donc
 * nulle part, et l'écran « Regarder » affichait « personne ne joue » pendant
 * qu'il jouait.
 *
 * Le serveur le sait pourtant, pour une tout autre raison : la partie solo en
 * cours est enregistrée à chaque coup, afin de pouvoir la reprendre d'un autre
 * appareil. On s'en sert — voir `/api/amis/parties`.
 *
 * ── Un échiquier, pas une ligne de texte ────────────────────────────────────
 *
 * « Laeti joue contre Rempart, 14 coups » n'apprend rien et ne donne pas envie.
 * La position, si : on voit d'un coup d'œil si elle est en train de gagner, et
 * c'est exactement ce qu'on venait voir. La position est reconstruite en
 * rejouant les coups, ce qui ne coûte rien et évite d'avoir à stocker une FEN
 * de plus.
 *
 * Le rafraîchissement suit le rythme d'une partie humaine, pas celui d'un
 * direct : un coup toutes les quelques secondes au mieux, et l'écran est un
 * coup d'œil, pas une retransmission.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import { Cpu, Eye } from 'lucide-react'
import { Board2D } from '@/components/board/Board2D.tsx'
import { Card, Chip } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

/** Assez vif pour suivre, assez lent pour ne pas marteler le serveur. */
const RYTHME_MS = 8000

interface PartieDAmi {
  pseudo: string
  avatar: string | null
  coups: string[]
  camp: 'w' | 'b'
  adversaire: { nom: string; elo: number; niveau: number } | null
  cadence: string | null
  dernierCoupLe: string
}

export function PartiesDAmis() {
  const [parties, setParties] = useState<PartieDAmi[]>([])
  const habillage = usePreferences((state) => state.boardStyle)
  const jeuDePieces = usePreferences((state) => state.pieceSet)

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch('/api/amis/parties', { cache: 'no-store' })
      if (!reponse.ok) return
      const data = (await reponse.json()) as { parties?: PartieDAmi[] }
      setParties(data.parties ?? [])
    } catch {
      // Hors ligne ou sans compte : la section disparaît, le reste de l'écran
      // continue de fonctionner.
    }
  }, [])

  useEffect(() => {
    void relire()
    const minuteur = setInterval(() => void relire(), RYTHME_MS)
    return () => clearInterval(minuteur)
  }, [relire])

  if (parties.length === 0) return null

  return (
    <Card className="mb-4 overflow-hidden">
      <EnTeteDeCarte
        titre="Tes amis, contre l’ordinateur"
        icone={<Cpu size={14} aria-hidden />}
        teinte="var(--rub-jouer)"
        fin={`${parties.length} en cours`}
      />
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {parties.map((partie) => (
          <PartieDUnAmi
            key={partie.pseudo}
            partie={partie}
            habillage={habillage}
            jeuDePieces={jeuDePieces}
          />
        ))}
      </div>
    </Card>
  )
}

function PartieDUnAmi({
  partie,
  habillage,
  jeuDePieces,
}: {
  partie: PartieDAmi
  habillage: string
  jeuDePieces: string
}) {
  /**
   * La position, rejouée depuis le départ.
   *
   * Un coup illisible arrête le rejeu au lieu de faire tomber l'écran : on
   * montre alors la position atteinte jusque-là, ce qui reste vrai.
   */
  const position = useMemo(() => {
    const echiquier = new Chess()
    let dernier: { from: string; to: string } | null = null
    for (const san of partie.coups) {
      try {
        const coup = echiquier.move(san)
        dernier = { from: coup.from, to: coup.to }
      } catch {
        break
      }
    }
    return { fen: echiquier.fen(), dernier }
  }, [partie.coups])

  const coupsEntiers = Math.ceil(partie.coups.length / 2)

  return (
    <div className="rounded-[var(--radius)] border border-line bg-bg-elev p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <Link
            href={`/profil/${encodeURIComponent(partie.pseudo)}`}
            className="block truncate text-[14px] font-semibold hover:underline"
          >
            {partie.pseudo}
          </Link>
          <span className="mt-0.5 block truncate text-[12px] text-faint">
            contre {partie.adversaire?.nom ?? 'l’ordinateur'}
            {partie.adversaire && ` · ${partie.adversaire.elo} Elo`}
          </span>
        </span>
        <Chip tone="accent" className="shrink-0">
          coup {coupsEntiers}
        </Chip>
      </div>

      {/* Le plateau brut plutôt que `ChessBoard` : celui-ci gère la 3D, le plein
          écran, la bascule de vue et le glisser-déposer, dont rien n'a de sens
          dans une vignette qu'on regarde. */}
      <Board2D
        fen={position.fen}
        orientation={partie.camp}
        playable={null}
        lastMove={
          position.dernier
            ? { from: position.dernier.from as never, to: position.dernier.to as never }
            : null
        }
        skinId={habillage as never}
        instant
        className="pointer-events-none"
      />

      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-faint">
        <Eye size={11} aria-hidden />
        {/* Le moment du dernier coup, et non « en direct » : la partie peut
            très bien être en pause devant un café, et l'annoncer comme un
            direct serait mentir sur ce qu'on regarde. */}
        dernier coup {ilYA(partie.dernierCoupLe)}
        {jeuDePieces ? '' : ''}
      </p>
    </div>
  )
}

/** « il y a 12 s », « il y a 3 min ». Assez pour juger si la partie est vivante. */
function ilYA(iso: string): string {
  const secondes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (secondes < 60) return `il y a ${secondes} s`
  const minutes = Math.round(secondes / 60)
  return `il y a ${minutes} min`
}
