'use client'

/**
 * Regarder une partie.
 *
 * Le salon acceptait déjà un troisième arrivant — c'est ce que fait le serveur
 * quand les deux places sont prises — mais rien ne permettait d'en trouver un :
 * il fallait connaître l'adresse. Cette page les liste.
 *
 * Seules les parties commencées y figurent. Une partie qui attend encore son
 * adversaire n'a rien à montrer, et s'y installer prendrait la place de celui
 * qu'on attend.
 *
 * ── Les parties de ses amis ─────────────────────────────────────────────────
 *
 * La liste était rangée par nombre de coups joués, et rien d'autre : une partie
 * de trente coups passe devant une qui vient de commencer. C'est un bon
 * classement pour un inconnu, et le mauvais pour la seule question qu'on se
 * pose vraiment en ouvrant cette page — **est-ce qu'un de mes amis joue en ce
 * moment ?** Il fallait lire les pseudos un par un, et sur une plateforme
 * active on ne les lit pas.
 *
 * Leurs parties passent donc devant, portent une pastille, et un filtre permet
 * de n'afficher qu'elles. La reconnaissance se fait sur le pseudo **et** sur le
 * fait d'être inscrit : un visiteur choisit son nom d'affichage librement, et
 * sans cette seconde condition n'importe qui pourrait faire apparaître « ton
 * ami joue » en tapant son pseudo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Users } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, speedCategory, type TimeControl } from '@coupparfait/core'
import {
  Card,
  Chip,
  EmptyState,
  SectionTitle,
  SegmentedControl,
  Spinner,
} from '@/components/ui/index.tsx'

interface LiveGame {
  slug: string
  white: string
  black: string
  whiteRating: number | null
  blackRating: number | null
  /** Le siège est-il tenu par un compte, plutôt que par un visiteur ? */
  whiteInscrit?: boolean
  blackInscrit?: boolean
  moves: number
  timeControl: TimeControl
  rated: boolean
  spectators: number
}

/** La liste bouge à chaque partie qui commence ou se termine, pas à chaque coup. */
const POLL_MS = 6000

export default function WatchPage() {
  const [games, setGames] = useState<LiveGame[] | null>(null)
  const [offline, setOffline] = useState(false)
  /**
   * Les pseudos de mes amis, en minuscules.
   *
   * `null` tant qu'on ne sait pas, et pour un visiteur sans compte : la
   * différence compte, puisqu'elle décide si le filtre existe. Une seule
   * requête au montage — le carnet d'adresses ne change pas pendant qu'on
   * regarde une partie, là où la liste des parties, elle, est relue toutes les
   * six secondes.
   */
  const [amis, setAmis] = useState<Set<string> | null>(null)
  const [filtre, setFiltre] = useState<'tout' | 'amis'>('tout')

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/parties')
      const data: { games?: LiveGame[] } = await response.json()
      setOffline(!response.ok)
      setGames(data.games ?? [])
    } catch {
      setOffline(true)
      setGames([])
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    void fetch('/api/amis', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((data: { friends?: Array<{ username: string }> } | null) => {
        if (!data?.friends) return
        setAmis(new Set(data.friends.map((ami) => ami.username.toLowerCase())))
      })
      .catch(() => {
        // Sans carnet d'adresses, la page reste celle qu'elle a toujours été :
        // toutes les parties, la plus avancée d'abord.
      })
  }, [])

  /** Un ami joue-t-il dans cette partie, et lequel ? */
  const amiDansLaPartie = useCallback(
    (partie: LiveGame): string | null => {
      if (!amis || amis.size === 0) return null
      if (partie.whiteInscrit && amis.has(partie.white.toLowerCase())) return partie.white
      if (partie.blackInscrit && amis.has(partie.black.toLowerCase())) return partie.black
      return null
    },
    [amis],
  )

  /**
   * Les parties, amis devant.
   *
   * Le serveur les rend déjà triées par nombre de coups ; on ne fait que
   * remonter celles où un ami joue, en gardant cet ordre à l'intérieur de
   * chaque groupe. Un tri stable suffit, et `sort` l'est depuis longtemps.
   */
  const affichees = useMemo(() => {
    if (!games) return []
    const avecAmi = games.map((partie) => ({ partie, ami: amiDansLaPartie(partie) }))
    const retenues = filtre === 'amis' ? avecAmi.filter((entree) => entree.ami) : avecAmi
    return [...retenues].sort((a, b) => Number(Boolean(b.ami)) - Number(Boolean(a.ami)))
  }, [games, amiDansLaPartie, filtre])

  const partiesDAmis = useMemo(
    () => (games ?? []).filter((partie) => amiDansLaPartie(partie)).length,
    [games, amiDansLaPartie],
  )

  if (games === null) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="page-etroite">
      <SectionTitle hint="Les parties commencées, telles qu’elles se jouent en ce moment.">
        Regarder
      </SectionTitle>

      {/* Le filtre n'apparaît qu'à ceux qui ont des amis : proposer « Mes amis »
          à quelqu'un dont le carnet est vide, c'est offrir un bouton qui ne
          peut que décevoir. */}
      {amis && amis.size > 0 && (
        <div className="mb-3">
          <SegmentedControl
            size="sm"
            label="Quelles parties afficher"
            value={filtre}
            onChange={setFiltre}
            options={[
              { value: 'tout' as const, label: `Toutes (${games.length})` },
              { value: 'amis' as const, label: `Mes amis (${partiesDAmis})` },
            ]}
          />
        </div>
      )}

      {offline ? (
        <EmptyState
          icon={<Eye size={28} />}
          title="Serveur de parties injoignable"
          description="Impossible de savoir qui joue en ce moment. Vérifie que le serveur temps réel tourne."
        />
      ) : affichees.length === 0 ? (
        /* Deux vides différents, et ils ne se soignent pas pareil : « personne
           ne joue » se subit, « aucun de tes amis ne joue » se corrige en
           revenant à la liste complète. */
        filtre === 'amis' ? (
          <EmptyState
            icon={<Eye size={28} />}
            title="Aucun de tes amis ne joue en ce moment"
            description="Dès que l’un d’eux commence une partie, elle apparaîtra ici, et tu pourras la suivre coup par coup."
            action={
              <button type="button" onClick={() => setFiltre('tout')} className="lien">
                Voir toutes les parties
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<Eye size={28} />}
            title="Personne ne joue en ce moment"
            description="Les parties commencées apparaîtront ici, et tu pourras les suivre coup par coup."
          />
        )
      ) : (
        <div className="mt-4 space-y-2">
          {affichees.map(({ partie: game, ami }) => {
            const speed = speedCategory(game.timeControl)
            return (
              <Link key={game.slug} href={`/jouer/partie/${game.slug}`} className="block">
                <Card
                  className={clsx(
                    'p-3 transition-colors hover:bg-surface-hover',
                    // Le liseré d'accent, en plus de la pastille : sur une liste
                    // longue, c'est lui qu'on voit avant d'avoir lu quoi que ce
                    // soit.
                    ami && 'border border-[color-mix(in_oklab,var(--accent)_40%,transparent)]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        <span className={clsx(ami === game.white && 'text-accent')}>
                          {game.white}
                        </span>
                        {game.whiteRating != null && (
                          <span className="text-faint"> {game.whiteRating}</span>
                        )}
                        <span className="mx-1.5 text-faint">contre</span>
                        <span className={clsx(ami === game.black && 'text-accent')}>
                          {game.black}
                        </span>
                        {game.blackRating != null && (
                          <span className="text-faint"> {game.blackRating}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-faint">
                        {SPEED_LABELS[speed]?.icon} {SPEED_LABELS[speed]?.fr} · {game.moves}{' '}
                        demi-coup{game.moves > 1 ? 's' : ''}
                        {game.rated ? ' · classée' : ''}
                      </span>
                    </span>

                    {ami && (
                      <Chip tone="accent" className="shrink-0">
                        ton ami
                      </Chip>
                    )}

                    {game.spectators > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-1 text-[12px] text-faint"
                        title={`${game.spectators} personne${game.spectators > 1 ? 's' : ''} regarde${game.spectators > 1 ? 'nt' : ''}`}
                      >
                        <Users size={13} aria-hidden />
                        {game.spectators}
                      </span>
                    )}
                    <Eye size={16} className="shrink-0 text-accent" aria-hidden />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
