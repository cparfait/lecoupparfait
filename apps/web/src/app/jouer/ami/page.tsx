'use client'

/**
 * Jouer contre quelqu'un.
 *
 * Un seul écran pour les deux façons de le faire, parce que la seule chose qui
 * les distingue est la **cadence**. C'étaient deux entrées de menu — « Contre
 * un ami » et « Par correspondance » — ce qui demandait de choisir le mécanisme
 * avant de choisir le rythme, soit exactement l'inverse de l'ordre dans lequel
 * la question se pose.
 *
 * Les deux mécanismes restent différents, et il faut savoir pourquoi :
 *
 *  - **En temps réel**, on obtient un lien. Aucun compte, ni pour soi ni pour
 *    l'invité : celui qui ouvre le lien devient l'adversaire. Le geste tient en
 *    dix secondes.
 *  - **Sur plusieurs jours**, on désigne quelqu'un de son carnet. Ce n'est pas
 *    une lourdeur gratuite : une partie étalée sur deux semaines a besoin
 *    d'une identité persistante des deux côtés pour attribuer les coups et
 *    prévenir celui dont c'est le tour.
 *
 * Les parties par correspondance **en cours** ne sont pas ici : ce n'est pas un
 * mode de jeu mais une boîte de réception, et elle vit à `/correspondance`.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, Link2, Share2, Users } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import { Button, Card, Chip, Input, SectionTitle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { generateGameSlug, retenirSouhaitDeCouleur } from '@/lib/game/useLiveGame.ts'

export default function CreateFriendGamePage() {
  const router = useRouter()
  const [timeControlId, setTimeControlId] = useState('600+5')
  /**
   * Délai par coup, en jours, quand on joue par correspondance.
   *
   * `null` en temps réel. C'est ce seul champ qui fait basculer l'écran d'un
   * mode à l'autre : au-dessus, une cadence en minutes et un lien ; en dessous,
   * un délai en jours et un adversaire à désigner.
   */
  const [jours, setJours] = useState<number | null>(null)
  const [amis, setAmis] = useState<Array<{ id: string; username: string }> | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [rated, setRated] = useState(false)
  /**
   * Couleur demandée par l'hôte.
   *
   * `random` par défaut : c'est le plus équitable quand on n'a pas d'avis, et
   * cela évite que celui qui crée le lien ait systématiquement le trait.
   */
  const [couleur, setCouleur] = useState<'w' | 'b' | 'random'>('random')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  /**
   * A-t-on un compte ?
   *
   * La page annonçait qu'une partie classée en demandait un, sans offrir le
   * moyen d'en avoir un — et une partie créée sans compte n'apparaît nulle
   * part ensuite, faute de quelqu'un à qui la rattacher. `null` tant qu'on ne
   * sait pas : on n'affiche rien plutôt que d'inviter à se connecter quelqu'un
   * qui l'est déjà.
   */
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    void fetch('/api/auth')
      .then((response) => response.json())
      .then((data: { user: unknown }) => setSignedIn(data.user != null))
      .catch(() => setSignedIn(false))
  }, [])

  // Le carnet n'est chargé qu'à partir du moment où il sert, c'est-à-dire quand
  // on choisit une cadence en jours. Le demander au chargement ferait une
  // requête à chaque visite pour une liste que la plupart n'ouvriront jamais.
  useEffect(() => {
    if (jours === null || amis !== null) return
    void fetch('/api/amis')
      .then((reponse) => (reponse.ok ? reponse.json() : { friends: [] }))
      .then((data: { friends?: Array<{ id: string; username: string }> }) =>
        setAmis(data.friends ?? []),
      )
      .catch(() => setAmis([]))
  }, [jours, amis])

  /** Lance une correspondance contre quelqu'un du carnet. */
  const lancerCorrespondance = useCallback(
    async (amiId: string) => {
      setEnvoi(true)
      try {
        const reponse = await fetch('/api/correspondance', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'start', to: amiId, days: jours ?? 2 }),
        })
        const data = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(data.error ?? 'Création impossible.')
          return
        }
        toast.success('Partie lancée.', 'Les couleurs ont été tirées au sort.')
        router.push('/correspondance')
      } catch {
        toast.error('Le serveur est injoignable.')
      } finally {
        setEnvoi(false)
      }
    },
    [jours, router],
  )

  const url = slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/jouer/partie/${slug}?tc=${timeControlId}${rated ? '&classee=1' : ''}`
    : null

  const create = useCallback(() => {
    const created = generateGameSlug()
    setSlug(created)
    // Déposé pour cette partie seulement, et hors du lien : `useLiveGame` le
    // lira à la première prise de siège puis l'effacera.
    retenirSouhaitDeCouleur(created, couleur === 'random' ? null : couleur)
    if (name.trim()) {
      try {
        localStorage.setItem('coupparfait.guestName', name.trim())
      } catch {
        // Stockage refusé : le pseudo sera simplement « Invité ».
      }
    }

    // On enregistre la partie pour qui a un compte, afin qu'elle apparaisse
    // dans « Parties en attente » et puisse être retrouvée ou supprimée. Sans
    // compte, il n'y a personne à qui la rattacher : le lien seul fait foi.
    const control = TIME_CONTROLS.find((entry) => entry.id === timeControlId)
    void fetch('/api/defis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'open',
        slug: created,
        initialTime: control?.initial ?? 600,
        increment: control?.increment ?? 5,
        rated,
      }),
    }).catch(() => {
      // Hors ligne ou sans compte : la partie fonctionne quand même, elle ne
      // sera simplement pas listée.
    })
  }, [name, timeControlId, rated, couleur])

  const copy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Lien copié', 'Envoie-le à ton adversaire.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.warning('Copie impossible', 'Sélectionne le lien et copie-le à la main.')
    }
  }, [url])

  const share = useCallback(async () => {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Partie d’échecs sur Le Coup Parfait',
          text: 'Viens jouer une partie !',
          url,
        })
        return
      } catch {
        // Partage annulé par l'utilisateur : rien à signaler.
      }
    }
    void copy()
  }, [url, copy])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Jouer contre quelqu’un</h1>
      {/* La phrase suit la cadence choisie : les deux mécanismes n'ont ni les
          mêmes gestes ni les mêmes exigences, et annoncer « ton ami n'a besoin
          d'aucun compte » sur une correspondance serait faux. */}
      <p className="mt-2 text-muted">
        {jours === null
          ? 'Choisis une cadence, crée le lien, envoie-le. Ton adversaire n’a besoin d’aucun compte : il clique, il joue.'
          : `Un coup tous les ${jours} jour${jours > 1 ? 's' : ''}. Il faut un compte des deux côtés — la partie doit pouvoir t’attendre.`}
      </p>

      {!slug ? (
        <>
          <Card className="mt-7 p-5">
            {/* Une règle abstraite ne se retient pas ; un exemple lu une fois
                suffit. « 3 | 2 » reste incompréhensible tant qu'on ne l'a pas
                vu déplié. */}
            <SectionTitle hint="« 3 | 2 » se lit : 3 minutes au départ, et 2 secondes ajoutées à ta pendule à chaque coup que tu joues.">
              Cadence
            </SectionTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {TIME_CONTROLS.filter((tc) =>
                ['180+0', '180+2', '300+0', '300+3', '600+0', '600+5', '900+10', '1800+20'].includes(
                  tc.id,
                ),
              ).map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => {
                    setTimeControlId(tc.id)
                    setJours(null)
                  }}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-2 py-2.5 text-xs font-medium transition-colors',
                    jours === null && timeControlId === tc.id
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {/* Le symbole seul ne dit rien : on le réduit et on nomme la
                      catégorie, qui est ce qui détermine le classement mis à
                      jour à la fin de la partie. */}
                  <span className="block text-[10px] font-normal leading-tight text-faint">
                    <span aria-hidden>{SPEED_LABELS[tc.category].icon}</span>{' '}
                    {SPEED_LABELS[tc.category].fr}
                  </span>
                  <span className="mt-0.5 block text-sm">{tc.label}</span>
                </button>
              ))}
            </div>

            {/*
              Les jours sur la même grille que les minutes.
              C'est le cœur de la fusion : la correspondance n'est pas un autre
              mode de jeu, c'est la même partie jouée plus lentement. La ranger
              ailleurs obligeait à décider « ami ou correspondance ? » avant de
              savoir à quel rythme on voulait jouer.
            */}
            <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Ou sur plusieurs jours
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 7, 14].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setJours(n)}
                  aria-pressed={jours === n}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-2 py-2.5 text-xs font-medium transition-colors',
                    jours === n
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  <span className="block text-[10px] font-normal leading-tight text-faint">
                    <span aria-hidden>📬</span> correspondance
                  </span>
                  <span className="mt-0.5 block text-sm">
                    {n} jour{n > 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-3 border-t border-line/60 pt-3 text-xs leading-relaxed text-muted">
              La catégorie se déduit de la durée qu’aurait une partie de quarante coups :
              moins de trois minutes c’est du <strong className="font-semibold">bullet</strong>,
              moins de huit du <strong className="font-semibold">blitz</strong>, moins de
              vingt-cinq du <strong className="font-semibold">rapide</strong>, au-delà du{' '}
              <strong className="font-semibold">classique</strong>. Chacune tient son propre
              classement : on peut voir clair en rapide et s’effondrer en blitz.
            </p>
          </Card>

          {/* Le choix de la couleur n'existe qu'en temps réel : une
              correspondance tire les couleurs au sort côté serveur, et
              proposer un choix qui ne serait pas honoré vaut moins que ne rien
              proposer. */}
          <Card className={clsx('mt-4 p-5', jours !== null && 'hidden')}>
            {/* Le choix de la couleur, qui n'existait pas.
            
                Les sièges étaient attribués dans l'ordre d'arrivée, et celui
                qui crée le lien est toujours le premier à s'asseoir : il jouait
                donc les Blancs à chaque partie. On a d'abord tiré au sort, ce
                qui supprimait le privilège sans rendre le choix — l'hôte
                subissait alors sa couleur au lieu de la prendre.
            
                Le hasard reste le défaut, parce que c'est le plus équitable
                quand on n'a pas d'avis. Mais on peut désormais dire le sien, et
                l'invité prend l'autre couleur. */}
            <SectionTitle>Ta couleur</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { valeur: 'random' as const, label: '🎲 Hasard' },
                  { valeur: 'w' as const, label: '♔ Blancs' },
                  { valeur: 'b' as const, label: '♚ Noirs' },
                ]
              ).map((choix) => (
                <button
                  key={choix.valeur}
                  type="button"
                  onClick={() => setCouleur(choix.valeur)}
                  aria-pressed={couleur === choix.valeur}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-2 py-2 text-sm font-medium transition-colors',
                    couleur === choix.valeur
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {choix.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">
              Ton adversaire prendra l’autre couleur. Une fois la partie ouverte, elle est fixée.
            </p>
          </Card>

          {/* Le pseudo et le classement ne concernent que la partie par lien :
              une correspondance se joue entre deux comptes, qui ont déjà un
              nom, et son classement se règle côté serveur. */}
          <Card className={clsx('mt-4 p-5', jours !== null && 'hidden')}>
            <Input
              label="Ton pseudo (facultatif)"
              name="guestName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Invité"
              maxLength={20}
              hint="Sert uniquement à ce que ton adversaire sache qui il affronte."
            />

            <label
              className={clsx(
                'mt-4 flex items-start gap-2.5',
                signedIn === false ? 'cursor-default opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                checked={rated}
                onChange={(event) => setRated(event.target.checked)}
                disabled={signedIn === false}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">Partie classée</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Le classement des deux joueurs sera mis à jour. Nécessite que vous ayez tous
                  les deux un compte.
                </span>
              </span>
            </label>

            {signedIn === false && (
              <p className="mt-3 border-t border-line/60 pt-3 text-xs leading-relaxed text-muted">
                Tu joues sans compte : la partie fonctionnera, mais elle ne sera ni classée ni
                retrouvable ensuite.{' '}
                <Link href="/connexion" className="font-semibold text-accent hover:underline">
                  Se connecter ou créer un compte
                </Link>{' '}
                — un pseudo, un mot de passe, c’est tout.
              </p>
            )}
          </Card>

          {jours === null ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-5"
              icon={<Link2 size={17} />}
              onClick={create}
            >
              Créer le lien de partie
            </Button>
          ) : (
            /*
              Sur plusieurs jours, il faut désigner quelqu'un.
              Pas par formalisme : la partie durera deux semaines, il faut une
              identité des deux côtés pour attribuer les coups et prévenir celui
              dont c'est le tour. Un lien anonyme ne le permet pas.
            */
            <Card className="mt-5 p-5">
              <SectionTitle hint="La partie durera plusieurs jours : il faut quelqu’un à qui l’attribuer, des deux côtés.">
                Contre qui ?
              </SectionTitle>

              {amis === null ? (
                <p className="text-sm text-muted">Chargement du carnet…</p>
              ) : amis.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-muted">
                  Ton carnet est vide.{' '}
                  <Link href="/amis" className="font-semibold text-accent hover:underline">
                    Ajoute quelqu’un
                  </Link>{' '}
                  pour lancer une correspondance — ou choisis une cadence en minutes, qui
                  se joue par simple lien, sans compte.
                </p>
              ) : (
                <div className="space-y-1">
                  {amis.map((ami) => (
                    <button
                      key={ami.id}
                      type="button"
                      disabled={envoi}
                      onClick={() => void lancerCorrespondance(ami.id)}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover disabled:opacity-50"
                    >
                      <Users size={15} className="shrink-0 text-accent" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium">{ami.username}</span>
                      <span className="shrink-0 text-[11px] text-faint">
                        {jours} jour{jours > 1 ? 's' : ''} par coup
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card glow className="mt-7 overflow-hidden">
          <div className="p-6 text-center">
            <span
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
              style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)' }}
              aria-hidden
            >
              <Users size={24} className="text-accent" />
            </span>
            <h2 className="font-display text-xl font-semibold">La partie est prête</h2>
            <p className="mt-1.5 text-sm text-muted">
              Envoie ce lien à ton adversaire. La partie commencera dès qu’il l’ouvrira.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface p-2">
              <code className="min-w-0 flex-1 truncate px-1 text-left font-mono text-[12px]">
                {url}
              </code>
              <Button
                size="sm"
                variant={copied ? 'primary' : 'secondary'}
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={copy}
              >
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" icon={<Share2 size={15} />} onClick={share} fullWidth>
                Partager
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() =>
                  router.push(
                    `/jouer/partie/${slug}?tc=${timeControlId}${rated ? '&classee=1' : ''}`,
                  )
                }
              >
                Entrer dans la partie
              </Button>
            </div>

            <div className="mt-5 flex justify-center gap-2">
              <Chip>
                {SPEED_LABELS[
                  TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.category ?? 'rapid'
                ].icon}{' '}
                {TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.label}
              </Chip>
              <Chip tone={rated ? 'accent' : 'neutral'}>
                {rated ? 'Classée' : 'Amicale'}
              </Chip>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
