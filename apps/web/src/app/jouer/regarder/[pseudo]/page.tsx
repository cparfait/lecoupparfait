'use client'

/**
 * Regarder la partie d'un ami contre l'ordinateur, en grand.
 *
 * La vignette de l'écran « Regarder » dit qui joue et montre la position. Elle
 * ne dit pas ce qui s'est passé : on voit une position sans savoir par où elle
 * est passée, et un échiquier de deux cents pixels ne se lit pas au-delà de
 * « qui a une dame de plus ». Cette page-ci est la partie elle-même — le même
 * échiquier, la même liste de coups, la même barre de joueurs qu'en jouant.
 *
 * ── En lecture seule, et cela se voit ───────────────────────────────────────
 *
 * Aucune pièce ne se déplace, aucun bouton n'agit sur la partie : on est assis
 * à côté, pas en face. C'est ce que dit le bandeau en tête, et c'est ce que
 * garantit `playable={null}` — le plateau n'accepte alors aucune saisie, pas
 * même un survol de case.
 *
 * En revanche on **navigue** dans les coups. C'est tout l'intérêt d'arriver au
 * dix-septième : pouvoir revenir au septième pour comprendre ce qui a mené là.
 * Le direct reprend d'un bouton, et l'on est prévenu quand la partie a avancé
 * pendant qu'on regardait en arrière.
 *
 * ── Ce que la page ne fait pas ──────────────────────────────────────────────
 *
 * Elle n'analyse rien. Montrer l'évaluation du moteur à un spectateur pendant
 * que son ami joue, c'est lui donner le moyen de lui souffler — et le tchat
 * d'à côté est toujours ouvert. Le bilan attendra la fin de la partie, où il
 * est à sa place.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { ArrowLeft, Cpu, Eye, Radio } from 'lucide-react'
import clsx from 'clsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { RubanCoups, rubanDepuisLesCoups } from '@/components/game/RubanCoups.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { toPlayedMove, type PlayedMove } from '@/lib/game/useChessGame.ts'
import { useGrandEcran } from '@/lib/useMediaQuery.ts'
import { playMoveForSan } from '@/lib/sound.ts'
import { useT } from '@/lib/i18n/index.tsx'

/**
 * Rythme d'interrogation.
 *
 * Plus vif que la liste des parties — on est venu suivre celle-ci — mais pas
 * au point de marteler : une partie humaine produit un coup toutes les quelques
 * secondes au mieux, et le serveur ne réécrit la ligne qu'à chaque coup.
 */
const RYTHME_MS = 4000

interface PartieDAmi {
  pseudo: string
  avatar: string | null
  coups: string[]
  camp: 'w' | 'b'
  adversaire: { nom: string; elo: number; niveau: number } | null
  cadence: string | null
  dernierCoupLe: string
}

export default function RegarderUnAmiPage() {
  const t = useT()
  const params = useParams<{ pseudo: string }>()
  const pseudo = decodeURIComponent(params.pseudo ?? '')
  const grandEcran = useGrandEcran()

  const [partie, setPartie] = useState<PartieDAmi | null>(null)
  /** `null` tant qu'on n'a pas reçu de réponse : on n'annonce rien trop tôt. */
  const [charge, setCharge] = useState(false)
  /**
   * Coup consulté, ou `null` pour suivre le direct.
   *
   * Deux états et non un curseur qui vaudrait « le dernier » : sans cette
   * distinction, revenir en arrière puis recevoir un coup rendrait la main au
   * direct sans prévenir, et l'on perdrait la position qu'on examinait.
   */
  const [curseur, setCurseur] = useState<number | null>(null)

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch('/api/amis/parties', { cache: 'no-store' })
      if (!reponse.ok) return
      const data = (await reponse.json()) as { parties?: PartieDAmi[] }
      const sienne =
        data.parties?.find((entree) => entree.pseudo.toLowerCase() === pseudo.toLowerCase()) ?? null
      setPartie(sienne)
    } catch {
      // Hors ligne : on garde la dernière position connue plutôt que de vider
      // l'écran. Le moment du dernier coup dit déjà que rien n'avance.
    } finally {
      setCharge(true)
    }
  }, [pseudo])

  useEffect(() => {
    void relire()
    const minuteur = setInterval(() => void relire(), RYTHME_MS)
    return () => clearInterval(minuteur)
  }, [relire])

  // Le son du coup qui arrive, comme en jouant : c'est ce qui fait qu'on lève
  // les yeux. Seulement en direct — pas en parcourant les coups passés.
  const dernierCompte = useRef(0)
  useEffect(() => {
    if (!partie) return
    if (partie.coups.length > dernierCompte.current && curseur === null) {
      const dernier = partie.coups[partie.coups.length - 1]
      if (dernier && dernierCompte.current > 0) playMoveForSan(dernier)
    }
    dernierCompte.current = partie.coups.length
  }, [partie, curseur])

  /**
   * La partie rejouée : les coups détaillés, position par position.
   *
   * `toPlayedMove` est celui de la partie jouée : la liste des coups et le
   * ruban attendent cette forme-là, et la recalculer autrement donnerait deux
   * façons de décrire un coup dans la même application.
   */
  const coups = useMemo<PlayedMove[]>(() => {
    if (!partie) return []
    const echiquier = new Chess()
    const joues: PlayedMove[] = []
    for (const san of partie.coups) {
      try {
        // `chess.js` porte déjà `before` et `after` sur le coup : inutile de
        // relever les positions à la main autour de l'appel.
        joues.push(toPlayedMove(echiquier.move(san)))
      } catch {
        // Un coup illisible arrête le rejeu : la suite porterait sur une
        // position qui n'a jamais existé.
        break
      }
    }
    return joues
  }, [partie])

  const dernierRang = coups.length - 1
  const rangAffiche = curseur ?? dernierRang
  const coupAffiche = coups[rangAffiche] ?? null
  const enRetard = curseur !== null && curseur < dernierRang

  const position = coupAffiche?.after ?? new Chess().fen()
  const dernierCoup = coupAffiche ? { from: coupAffiche.from, to: coupAffiche.to } : null

  const echec = useMemo(() => {
    try {
      const echiquier = new Chess(position)
      if (!echiquier.inCheck()) return null
      const roi = echiquier
        .board()
        .flat()
        .find((carre) => carre?.type === 'k' && carre.color === echiquier.turn())
      return (roi?.square ?? null) as Square | null
    } catch {
      return null
    }
  }, [position])

  const rubanCoups = useMemo(() => rubanDepuisLesCoups(coups, {}), [coups])

  if (!charge) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (!partie) {
    return (
      <div className="page-etroite">
        <Link href="/jouer/regarder" className="lien mb-4 inline-flex items-center gap-1">
          <ArrowLeft size={14} aria-hidden /> Regarder
        </Link>
        <EmptyState
          icon={<Eye size={28} />}
          title={t('watch.notPlaying', { pseudo })}
          description={t('last.gameGone')}
          action={
            <Link href="/jouer/regarder" className="lien">
              {t('last.seeWhoPlays')}
            </Link>
          }
        />
      </div>
    )
  }

  const coupsEntiers = Math.ceil(coups.length / 2)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 lg:py-6">
      {/* ── Le bandeau de lecture seule ────────────────────────────────────
          En tête et pas en note : quelqu'un qui arrive sur un échiquier suppose
          qu'il peut y jouer, essaie, et conclut que la page est cassée. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2">
        <Link href="/jouer/regarder" className="lien inline-flex items-center gap-1">
          <ArrowLeft size={14} aria-hidden /> Regarder
        </Link>
        <span className="text-faint" aria-hidden>
          ·
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          <Eye size={13} aria-hidden />
          {t('watch.youAreWatching')}{' '}
          <strong className="font-semibold text-ink">{partie.pseudo}</strong>
          {t('last.readOnly')}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {/* ── Les deux joueurs ──────────────────────────────────────────
              Dans l'ordre de l'échiquier : l'adversaire en haut, l'ami en bas,
              comme il le voit lui-même. */}
          <Bandeau
            nom={partie.adversaire?.nom ?? 'Ordinateur'}
            detail={partie.adversaire ? `${partie.adversaire.elo} Elo` : null}
            machine
          />

          <ChessBoard
            fen={position}
            orientation={partie.camp}
            // Lecture seule, garanti ici et pas seulement annoncé plus haut.
            playable={null}
            lastMove={dernierCoup}
            checkSquare={echec}
          />

          <Bandeau nom={partie.pseudo} detail={partie.cadence ?? null} />

          {!grandEcran && (
            <div className="mt-3">
              <RubanCoups
                coups={rubanCoups}
                cursor={rangAffiche}
                onSeek={(rang) => setCurseur(rang)}
              />
            </div>
          )}
        </div>

        {/* ── La colonne des coups ──────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <EnTeteDeCarte
              titre={`Coup ${coupsEntiers}`}
              icone={<Cpu size={14} aria-hidden />}
              teinte="var(--rub-jouer)"
              fin={<Fraicheur iso={partie.dernierCoupLe} />}
            />
            <MoveList
              moves={coups}
              cursor={rangAffiche}
              onSeek={(rang) => setCurseur(rang)}
              className="max-h-[40vh] min-h-0 lg:max-h-none"
            />
          </Card>

          {/* Le retour au direct n'apparaît que quand on l'a quitté : un bouton
              « en direct » sur une partie qu'on suit déjà en direct ne dit rien
              et fait douter qu'on y soit. */}
          {enRetard && (
            <Button
              variant="primary"
              icon={<Radio size={15} />}
              onClick={() => setCurseur(null)}
              fullWidth
            >
              Revenir au direct — {dernierRang - (curseur ?? 0)} coup
              {dernierRang - (curseur ?? 0) > 1 ? 's' : ''} de retard
            </Button>
          )}

          <Card className="p-3">
            <p className="text-[13px] leading-relaxed text-muted">
              Aucune évaluation n’est affichée pendant qu’il joue :{' '}
              <span className="text-ink">
                ce serait le moyen de lui souffler le coup depuis le tchat.
              </span>{' '}
              Le bilan viendra à la fin, à sa place.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Une ligne de joueur, réduite à ce qu'un spectateur a besoin de savoir. */
function Bandeau({
  nom,
  detail,
  machine = false,
}: {
  nom: string
  detail: string | null
  machine?: boolean
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-1 py-2',
        machine ? 'mb-1.5' : 'mt-1.5 flex-row-reverse justify-end',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {machine && <Cpu size={15} className="shrink-0 text-faint" aria-hidden />}
        <span className="truncate text-[15px] font-semibold">{nom}</span>
      </span>
      {detail && <Chip className="shrink-0">{detail}</Chip>}
    </div>
  )
}

/** Depuis combien de temps la position n'a pas bougé. */
function Fraicheur({ iso }: { iso: string }) {
  const [, forcerLeRendu] = useState(0)

  // Une minuterie pour que « il y a 3 s » ne reste pas figé sur une partie qui
  // n'avance plus : sans elle, l'écran ment d'autant plus qu'on le regarde
  // longtemps.
  useEffect(() => {
    const minuteur = setInterval(() => forcerLeRendu((tour) => tour + 1), 5000)
    return () => clearInterval(minuteur)
  }, [])

  const secondes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  return (
    <span>
      {secondes < 60 ? `il y a ${secondes} s` : `il y a ${Math.round(secondes / 60)} min`}
    </span>
  )
}
