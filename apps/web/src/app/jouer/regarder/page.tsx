'use client'

/**
 * Regarder une partie.
 *
 * Le salon acceptait déjà un troisième arrivant — c'est ce que fait le serveur
 * quand les deux places sont prises — mais rien ne permettait d'en trouver un :
 * il fallait connaître l'adresse. Cette page les liste.
 *
 * Trois choses s'y trouvent, et elles ne se font pas du tout pareil :
 *
 *  - les parties **commencées**, qu'on regarde ;
 *  - les parties **ouvertes qui cherchent un adversaire**, qu'on rejoint. Elles
 *    en étaient écartées au motif qu'il n'y a rien à y voir — ce qui est vrai —
 *    et que s'y installer prendrait la place de celui qu'on attend — ce qui est
 *    faux : c'est exactement la place qu'on cherche ;
 *  - les parties de ses amis **contre l'ordinateur**, qui ne passent pas par le
 *    serveur temps réel et n'apparaissaient donc nulle part. Voir
 *    `PartiesDAmis`.
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
import { Eye, Swords, Users } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, speedCategory, type TimeControl } from '@coupparfait/core'
import { IconeCadence } from '@/components/ui/IconeCadence.tsx'
import {
  Card,
  Chip,
  EmptyState,
  SegmentedControl,
  Spinner,
  TitreDePage,
} from '@/components/ui/index.tsx'
import { PartiesDAmis, type PartieDAmi } from '@/components/social/PartiesDAmis.tsx'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

interface LiveGame {
  slug: string
  /**
   * `waiting` : la partie est ouverte et attend son adversaire.
   *
   * Ces parties-là étaient écartées de la liste — il n'y a rien à y regarder —
   * et c'est précisément celles qu'on cherche quand un ami vient d'en lancer
   * une. On ne les regarde pas, on les rejoint.
   */
  statut?: 'waiting' | 'playing'
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
  const t = useT()
  /* Les noms de cadence viennent du cœur : voir `localeDuContenu`. */
  const contenu = usePreferences((state) => localeDuContenu(state.locale))
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
  /**
   * Les parties de mes amis contre l'ordinateur.
   *
   * Relues ici et non dans le composant qui les affiche : le filtre les compte,
   * et deux fetches concurrents finissaient par se contredire — « Mes amis (0) »
   * s'affichait au-dessus d'une partie d'ami bien visible.
   */
  const [solo, setSolo] = useState<PartieDAmi[]>([])

  const refresh = useCallback(async () => {
    // Les deux sources en parallèle : les salons du serveur temps réel, et les
    // parties solo que le serveur Next connaît par `active_games`. Deux origines
    // très différentes, un seul rafraîchissement — sinon les comptes divergent.
    const [enDirect, contreOrdinateur] = await Promise.allSettled([
      fetch('/api/parties').then(async (reponse) => ({
        ok: reponse.ok,
        data: (await reponse.json()) as { games?: LiveGame[] },
      })),
      fetch('/api/amis/parties', { cache: 'no-store' }).then(async (reponse) =>
        reponse.ok ? ((await reponse.json()) as { parties?: PartieDAmi[] }) : { parties: [] },
      ),
    ])

    if (enDirect.status === 'fulfilled') {
      setOffline(!enDirect.value.ok)
      setGames(enDirect.value.data.games ?? [])
    } else {
      setOffline(true)
      setGames([])
    }

    // Sans compte, la route rend une liste vide : ce n'est pas une panne, et
    // le serveur temps réel peut très bien être debout pendant que celle-ci
    // échoue. Les deux pannes ne se mélangent pas.
    setSolo(contreOrdinateur.status === 'fulfilled' ? (contreOrdinateur.value.parties ?? []) : [])
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

  /**
   * Combien de parties d'amis, toutes origines confondues.
   *
   * Les parties solo en font partie : elles sont **par construction** celles
   * d'un ami — la route n'en rend pas d'autres. Les compter à part donnerait
   * exactement l'incohérence qu'on vient de corriger.
   */
  const partiesDAmis = useMemo(
    () => (games ?? []).filter((partie) => amiDansLaPartie(partie)).length + solo.length,
    [games, amiDansLaPartie, solo.length],
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
      <TitreDePage intro={t('watch.intro')}>{t('bits.watch')}</TitreDePage>

      {/* ── Les parties solo de ses amis ─────────────────────────────────
          Elles ne passent pas par le serveur temps réel — une partie contre
          l'ordinateur se joue dans le navigateur — et n'apparaissaient donc
          nulle part. Le composant s'efface tout seul quand personne ne joue. */}
      <PartiesDAmis parties={solo} />

      {/* Le filtre n'apparaît qu'à ceux qui ont des amis : proposer « Mes amis »
          à quelqu'un dont le carnet est vide, c'est offrir un bouton qui ne
          peut que décevoir. */}
      {amis && amis.size > 0 && (
        <div className="mb-3">
          <SegmentedControl
            size="sm"
            label={t('bits.whichGames')}
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
          title={t('watch.serverDown')}
          description={t('watch.serverDownHint')}
        />
      ) : affichees.length === 0 && solo.length === 0 ? (
        /* Deux vides différents, et ils ne se soignent pas pareil : « personne
           ne joue » se subit, « aucun de tes amis ne joue » se corrige en
           revenant à la liste complète. */
        filtre === 'amis' ? (
          <EmptyState
            icon={<Eye size={28} />}
            title={t('watch.noFriendPlaying')}
            description={t('watch.noFriendPlayingHint')}
            action={
              <button type="button" onClick={() => setFiltre('tout')} className="lien">
                {t('watch.seeAllGames')}
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<Eye size={28} />}
            title={t('watch.nobodyPlaying')}
            description={t('watch.nobodyPlayingHint')}
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
                          {game.white === '?' ? t('watch.freeSeatName') : game.white}
                        </span>
                        {game.whiteRating != null && (
                          <span className="text-faint"> {game.whiteRating}</span>
                        )}
                        <span className="mx-1.5 text-faint">{t('watch.versusWord')}</span>
                        <span className={clsx(ami === game.black && 'text-accent')}>
                          {game.black === '?' ? t('watch.freeSeatName') : game.black}
                        </span>
                        {game.blackRating != null && (
                          <span className="text-faint"> {game.blackRating}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-faint">
                        <IconeCadence categorie={speed} className="-mt-px me-1 inline" />
                        {SPEED_LABELS[speed]?.[contenu]}
                        {game.statut === 'waiting' ? (
                          t('watch.freeSeat')
                        ) : (
                          <>
                            {' · '}
                            {t('analysis.halfMoves', { n: game.moves })}
                          </>
                        )}
                        {game.rated ? t('watch.rated') : ''}
                      </span>
                    </span>

                    {ami && (
                      <Chip tone="accent" className="shrink-0">
                        {t('watch.yourFriend')}
                      </Chip>
                    )}

                    {/* « Rejoindre » et non « regarder » : le siège est libre,
                        et c'est la seule différence qui compte entre les deux
                        sortes de lignes de cette liste. */}
                    {game.statut === 'waiting' && (
                      <Chip tone="success" className="shrink-0">
                        {t('watch.join')}
                      </Chip>
                    )}

                    {game.spectators > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-1 text-[12px] text-faint"
                        title={t(game.spectators > 1 ? 'watch.spectators' : 'watch.spectatorsOne', {
                          n: game.spectators,
                        })}
                      >
                        <Users size={13} aria-hidden />
                        {game.spectators}
                      </span>
                    )}
                    {game.statut === 'waiting' ? (
                      <Swords size={16} className="shrink-0 text-accent" aria-hidden />
                    ) : (
                      <Eye size={16} className="shrink-0 text-accent" aria-hidden />
                    )}
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
