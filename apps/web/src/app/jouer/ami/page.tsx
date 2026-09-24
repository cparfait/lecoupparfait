'use client'

/**
 * Jouer contre quelqu'un.
 *
 * Un seul écran pour toutes les façons de trouver un adversaire humain, parce
 * qu'elles répondent à la même intention et se distinguent seulement par
 * *qui* est en face :
 *
 *  - **n'importe qui** : on fabrique un lien et on l'envoie. Aucun compte, ni
 *    pour soi ni pour l'invité ; celui qui ouvre le lien devient l'adversaire.
 *  - **quelqu'un du carnet** : on le désigne, il reçoit le défi là où il se
 *    trouve dans l'application.
 *  - **quelqu'un qui n'est pas encore là** : on lui envoie une invitation à
 *    s'inscrire, et l'amitié se noue toute seule à son arrivée.
 *  - **un inconnu** : on choisit une cadence et le serveur apparie avec la
 *    première personne qui cherche la même. Voir `RechercheAdversaire`.
 *
 * Ces trois chemins vivaient sur deux écrans — « Contre un ami » d'un côté, le
 * carnet de l'autre —, si bien qu'on choisissait le mécanisme avant de savoir
 * contre qui l'on voulait jouer. Ils sont ici, l'un sous l'autre, sous la seule
 * question qui les précède vraiment : **à quelle cadence ?**
 *
 * La cadence commande tout le reste. En minutes, la partie se joue maintenant ;
 * en jours, elle se joue par correspondance et demande un compte des deux
 * côtés — une partie étalée sur deux semaines a besoin d'une identité
 * persistante pour attribuer les coups et prévenir celui dont c'est le tour.
 * Le même bouton « Jouer », en face d'un ami, lance donc l'une ou l'autre.
 *
 * Les parties par correspondance **en cours** ne sont pas ici : ce n'est pas un
 * mode de jeu mais une boîte de réception, et elle vit à `/correspondance`.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mailbox,
  Search,
  Share2,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import {
  Button,
  Card,
  Chip,
  Input,
  SectionTitle,
  Spinner,
  TitreDePage,
} from '@/components/ui/index.tsx'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { generateGameSlug, retenirSouhaitDeCouleur } from '@/lib/game/useLiveGame.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { RechercheAdversaire } from './RechercheAdversaire.tsx'

/** Ce que le carnet renvoie d'une personne. */
interface Ami {
  id: string
  username: string
  avatar: string | null
  rating: number | null
  online: boolean
}

/** Un défi déjà envoyé, pour pouvoir le retirer. */
interface DefiEnvoye {
  id: string
  to: string | null
  status: string
}

export default function CreateFriendGamePage() {
  const router = useRouter()
  const t = useT()
  /* Les noms de catégorie — « blitz », « rapide » — sont écrits dans le cœur,
     qui ne les produit qu'en français et en anglais. Voir `localeDuContenu`. */
  const contenu = usePreferences((state) => localeDuContenu(state.locale))
  const [timeControlId, setTimeControlId] = useState('600+5')
  /**
   * Délai par coup, en jours, quand on joue par correspondance.
   *
   * `null` en temps réel. C'est ce seul champ qui fait basculer l'écran d'un
   * mode à l'autre : au-dessus, une cadence en minutes et un lien ; en dessous,
   * un délai en jours et un adversaire à désigner.
   */
  const [jours, setJours] = useState<number | null>(null)
  const [amis, setAmis] = useState<Ami[] | null>(null)
  const [defis, setDefis] = useState<DefiEnvoye[]>([])
  const [envoi, setEnvoi] = useState<string | null>(null)
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
  const [inviteCopie, setInviteCopie] = useState(false)
  /** Vrai pendant « Trouver un adversaire » : la carte prend la place de l'écran. */
  const [recherche, setRecherche] = useState(false)

  /**
   * Qui est connecté ?
   *
   * `null` tant qu'on ne sait pas : on n'affiche ni le carnet ni l'invitation
   * avant la réponse, plutôt que de les faire apparaître puis disparaître.
   */
  const moi = useIdentite()

  // Le carnet, dès qu'on sait qu'il y a un compte pour le porter.
  const chargerAmis = useCallback(() => {
    void fetch('/api/amis', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : { friends: [] }))
      .then((data: { friends?: Ami[]; outgoing?: DefiEnvoye[] }) => setAmis(data.friends ?? []))
      .catch(() => setAmis([]))
    void fetch('/api/defis', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : { outgoing: [] }))
      .then((data: { outgoing?: DefiEnvoye[] }) => setDefis(data.outgoing ?? []))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!moi) return
    chargerAmis()
  }, [moi, chargerAmis])

  /** Lance une correspondance contre quelqu'un du carnet. */
  const lancerCorrespondance = useCallback(
    async (ami: Ami) => {
      setEnvoi(ami.id)
      try {
        const reponse = await fetch('/api/correspondance', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'start', to: ami.id, days: jours ?? 2 }),
        })
        const data = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(data.error ?? t('friendGame.createFailed'))
          return
        }
        toast.success(t('friendGame.started'), t('friendGame.startedHint'))
        router.push('/correspondance')
      } catch {
        toast.error(t('friendGame.serverUnreachable'))
      } finally {
        setEnvoi(null)
      }
    },
    [jours, router, t],
  )

  /**
   * Défie quelqu'un du carnet, en temps réel.
   *
   * Le défi part vers lui où qu'il soit dans l'application : un guetteur veille
   * sur chaque page et lui présente l'invitation. C'est pour cela qu'on ne
   * l'envoie qu'à un compte — un lien, lui, s'envoie à n'importe qui.
   */
  const defier = useCallback(
    async (ami: Ami) => {
      const control = TIME_CONTROLS.find((entry) => entry.id === timeControlId)
      setEnvoi(ami.id)
      try {
        const reponse = await fetch('/api/defis', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            to: ami.id,
            initialTime: control?.initial ?? 600,
            increment: control?.increment ?? 5,
            rated,
            color: couleur === 'random' ? undefined : couleur,
          }),
        })
        const data = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(data.error ?? t('friendGame.challengeFailed'))
          return
        }
        toast.info(
          t('friendGame.challengeSent', { pseudo: ami.username }),
          t('friendGame.challengeSentHint'),
        )
        chargerAmis()
      } catch {
        toast.error(t('friendGame.serverUnreachable'))
      } finally {
        setEnvoi(null)
      }
    },
    [timeControlId, rated, couleur, chargerAmis, t],
  )

  /** Retire un défi qu'on a envoyé : se tromper de cadence doit se rattraper. */
  const annulerDefi = useCallback(
    async (id: string) => {
      await fetch('/api/defis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      }).catch(() => undefined)
      chargerAmis()
    },
    [chargerAmis],
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
      toast.success(t('friendGame.linkCopied'), t('friendGame.linkCopiedHint'))
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.warning(t('friendGame.copyFailed'), t('friendGame.copyFailedHint'))
    }
  }, [url, t])

  const share = useCallback(async () => {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('friendGame.shareTitle'),
          text: t('friendGame.shareText'),
          url,
        })
        return
      } catch {
        // Partage annulé par l'utilisateur : rien à signaler.
      }
    }
    void copy()
  }, [url, copy, t])

  /** Le lien de parrainage : il s'inscrit, et vous êtes amis. */
  const inviteUrl =
    moi && typeof window !== 'undefined'
      ? `${window.location.origin}/connexion?ami=${encodeURIComponent(moi.username)}`
      : null

  const inviter = useCallback(async () => {
    if (!inviteUrl) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('friendGame.inviteTitle'),
          text: t('friendGame.inviteText'),
          url: inviteUrl,
        })
        return
      } catch {
        // Partage annulé : on retombe sur la copie.
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopie(true)
      toast.success(t('friendGame.inviteCopied'))
      setTimeout(() => setInviteCopie(false), 2500)
    } catch {
      toast.warning(t('friendGame.copyFailed'), t('friendGame.copyFailedHint'))
    }
  }, [inviteUrl, t])

  return (
    <div className="page-etroite">
      {/* La phrase suit la cadence choisie : les deux mécanismes n'ont ni les
          mêmes gestes ni les mêmes exigences, et annoncer « ton ami n'a besoin
          d'aucun compte » sur une correspondance serait faux. */}
      <TitreDePage
        intro={
          jours === null
            ? t('friendGame.introLive')
            : jours > 1
              ? t('friendGame.introDays', { jours })
              : t('friendGame.introOneDay')
        }
      >
        {t('friendGame.title')}
      </TitreDePage>

      {recherche ? (
        <RechercheAdversaire cadenceInitiale={timeControlId} onRetour={() => setRecherche(false)} />
      ) : slug ? (
        <PartiePrete
          url={url}
          copied={copied}
          onCopy={copy}
          onShare={share}
          onEntrer={() =>
            router.push(`/jouer/partie/${slug}?tc=${timeControlId}${rated ? '&classee=1' : ''}`)
          }
          timeControlId={timeControlId}
          rated={rated}
        />
      ) : (
        <>
          {/* ── La cadence, qui commande tout le reste ─────────────── */}
          <Card className="mt-5 p-4 sm:p-5">
            {/* Une règle abstraite ne se retient pas ; un exemple lu une fois
                suffit. « 3 | 2 » reste incompréhensible tant qu'on ne l'a pas
                vu déplié. */}
            <SectionTitle hint={t('friendGame.timeControlHint')}>
              {t('friendGame.timeControl')}
            </SectionTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {TIME_CONTROLS.filter((tc) =>
                [
                  '180+0',
                  '180+2',
                  '300+0',
                  '300+3',
                  '600+0',
                  '600+5',
                  '900+10',
                  '1800+20',
                ].includes(tc.id),
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
                  <span className="block text-[12px] font-normal leading-tight text-faint">
                    <span aria-hidden>{SPEED_LABELS[tc.category].icon}</span>{' '}
                    {SPEED_LABELS[tc.category][contenu]}
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
            <p className="mb-1.5 mt-4 text-[12px] font-semibold text-faint">
              {t('friendGame.orOverDays')}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 7, 14].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setJours(n)}
                  aria-pressed={jours === n}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-1.5 py-2.5 text-xs font-medium transition-colors',
                    jours === n
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  <span className="block text-[12px] font-normal leading-tight text-faint">
                    <span aria-hidden>📬</span> {t('friendGame.daysShort')}
                  </span>
                  <span className="mt-0.5 block text-sm">{t('friendGame.dayUnit', { n })}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* ── Les trois façons de trouver un adversaire ──────────── */}
          {/*
            Des rangées, et non des cartes empilées.

            Chacune tient sur une ligne haute : une icône, ce qu'on obtient, et
            à qui cela s'adresse. On les balaie du regard au lieu de les lire,
            et sur un téléphone les trois tiennent dans un écran — ce qui était
            le but de les réunir ici.
          */}
          <div className="mt-4 space-y-2">
            {/* Un inconnu, tout de suite : le seul chemin qui ne suppose pas
                d'avoir déjà quelqu'un en tête. En temps réel seulement — une
                correspondance ne se joue pas avec le premier venu. */}
            <RangeeAction
              icone={<Search size={18} />}
              titre={t('appariement.row')}
              detail={t('appariement.rowDetail')}
              onClick={() => setRecherche(true)}
              desactive={jours !== null}
              raison={jours !== null ? t('appariement.rowImpossible') : undefined}
            />

            <RangeeAction
              icone={<Link2 size={18} />}
              titre={t('friendGame.sendLink')}
              detail={t('friendGame.sendLinkDetail')}
              onClick={create}
              // Une correspondance ne se joue pas par lien anonyme : il faut
              // quelqu'un à qui attribuer les coups pendant deux semaines.
              desactive={jours !== null}
              raison={jours !== null ? t('friendGame.sendLinkImpossible') : undefined}
              principal
            />

            {moi && (
              <RangeeAction
                icone={<UserPlus size={18} />}
                titre={t('friendGame.inviteSomeone')}
                detail={t('friendGame.inviteSomeoneDetail')}
                onClick={() => void inviter()}
                marque={inviteCopie ? t('common.copied') : undefined}
              />
            )}

            {/* Un bouton, et non un lien enveloppant un bouton : imbriquer
                deux éléments interactifs donne un balisage que les lecteurs
                d'écran annoncent deux fois. */}
            {moi === null && (
              <RangeeAction
                icone={<Users size={18} />}
                titre={t('friendGame.signInToChallenge')}
                detail={t('friendGame.signInToChallengeDetail')}
                onClick={() => router.push('/connexion')}
              />
            )}
          </div>

          {/* ── Le carnet ──────────────────────────────────────────── */}
          {moi && (
            <section className="mt-6">
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h2 className="text-sm font-semibold">{t('friendGame.yourFriends')}</h2>
                {amis && (
                  <span className="text-[12px] text-faint">
                    {amis.length === 0 ? t('friendGame.nobodyYet') : amis.length}
                  </span>
                )}
                <Link
                  href="/amis"
                  className="ml-auto text-[12px] font-medium text-accent hover:underline"
                >
                  {t('friendGame.manageBook')}
                </Link>
              </div>

              {amis === null ? (
                <div className="grid place-items-center py-6">
                  <Spinner size={20} />
                </div>
              ) : amis.length === 0 ? (
                <Card className="p-4">
                  <p className="text-[14px] leading-relaxed text-muted">
                    {t('friendGame.emptyBookBefore')}{' '}
                    <Link href="/amis" className="font-semibold text-accent hover:underline">
                      {t('friendGame.emptyBookLink')}
                    </Link>{' '}
                    {t('friendGame.emptyBookAfter')}
                  </p>
                </Card>
              ) : (
                <Card className="divide-y divide-line/50 p-0">
                  {amis.map((ami) => {
                    const attente = defis.find(
                      (defi) => defi.to === ami.id && defi.status === 'pending',
                    )
                    return (
                      <div key={ami.id} className="flex items-center gap-2.5 p-2.5">
                        <span className="relative shrink-0">
                          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] bg-surface-strong text-lg">
                            <span aria-hidden>{ami.avatar ?? '♟'}</span>
                          </span>
                          {/* La pastille verte dit s'il est là *maintenant*,
                              seule chose qui décide entre un défi en temps réel
                              et une correspondance. */}
                          {ami.online && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--q-best)] ring-2 ring-[var(--bg-elev)]"
                              aria-label={t('friendGame.online')}
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{ami.username}</span>
                          <span className="block text-[12px] text-faint">
                            {ami.rating != null && `${ami.rating} · `}
                            {ami.online ? t('friendGame.online') : t('friendGame.offline')}
                          </span>
                        </span>

                        <Button
                          size="sm"
                          variant={attente ? 'ghost' : 'primary'}
                          disabled={envoi === ami.id}
                          icon={
                            envoi === ami.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : attente ? undefined : jours === null ? (
                              <Swords size={14} />
                            ) : (
                              <Mailbox size={14} />
                            )
                          }
                          onClick={() =>
                            attente
                              ? void annulerDefi(attente.id)
                              : jours === null
                                ? void defier(ami)
                                : void lancerCorrespondance(ami)
                          }
                        >
                          {attente
                            ? t('common.cancel')
                            : jours === null
                              ? t('friendGame.challenge')
                              : t('friendGame.dayUnit', { n: jours })}
                        </Button>
                      </div>
                    )
                  })}
                </Card>
              )}
            </section>
          )}

          {/* ── Les réglages du lien ───────────────────────────────── */}
          {/* Sous les adversaires, et non au-dessus : ce sont des détails de la
              partie qu'on va créer, et leurs valeurs par défaut conviennent
              presque toujours. Les poser avant la question « contre qui ? »
              revenait à faire remplir un formulaire pour un geste qui tient en
              un clic. */}
          <Card className={clsx('mt-4 p-4 sm:p-5', jours !== null && 'hidden')}>
            <SectionTitle>{t('friendGame.yourColour')}</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { valeur: 'random' as const, label: t('friendGame.colourRandom') },
                { valeur: 'w' as const, label: t('friendGame.colourWhite') },
                { valeur: 'b' as const, label: t('friendGame.colourBlack') },
              ].map((choix) => (
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
            <p className="mt-2 text-xs text-faint">{t('friendGame.colourNote')}</p>

            {/* Le pseudo ne concerne que la partie par lien : une personne du
                carnet a déjà un nom. */}
            {moi === null && (
              <div className="mt-4 border-t border-line/60 pt-4">
                <Input
                  label={t('friendGame.guestName')}
                  name="guestName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('common.guest')}
                  maxLength={20}
                  hint={t('friendGame.guestNameHint')}
                />
              </div>
            )}

            <label
              className={clsx(
                'mt-4 flex items-start gap-2.5 border-t border-line/60 pt-4',
                moi === null ? 'cursor-default opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                checked={rated}
                onChange={(event) => setRated(event.target.checked)}
                disabled={moi === null}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">{t('friendGame.ratedLabel')}</span>
                <span className="mt-0.5 block text-xs text-muted">{t('friendGame.ratedHint')}</span>
              </span>
            </label>

            {moi === null && (
              <p className="mt-3 border-t border-line/60 pt-3 text-xs leading-relaxed text-muted">
                {t('friendGame.noAccountBefore')}{' '}
                <Link href="/connexion" className="font-semibold text-accent hover:underline">
                  {t('friendGame.noAccountLink')}
                </Link>{' '}
                {t('friendGame.noAccountAfter')}
              </p>
            )}
          </Card>

          <p className="mt-4 px-1 text-xs leading-relaxed text-muted">
            {t('friendGame.categoryNote')}
          </p>
        </>
      )}
    </div>
  )
}

/**
 * Une façon de trouver un adversaire, sur une ligne.
 *
 * Icône, ce qu'on obtient, à qui cela s'adresse. Le format vient d'un constat
 * simple : trois cartes empilées demandent trois lectures, trois rangées se
 * balaient d'un regard.
 */
function RangeeAction({
  icone,
  titre,
  detail,
  onClick,
  principal,
  desactive,
  raison,
  marque,
}: {
  icone: React.ReactNode
  titre: string
  detail: string
  onClick: () => void
  /** Mise en avant : c'est le geste le plus fréquent de l'écran. */
  principal?: boolean
  desactive?: boolean
  /** Pourquoi la rangée est éteinte, dit à l'endroit où on le constate. */
  raison?: string
  /** Retour immédiat après l'action — « Copié ». */
  marque?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      className={clsx(
        'flex w-full items-center gap-3 rounded-[var(--radius)] border p-3.5 text-left transition-colors',
        desactive
          ? 'cursor-not-allowed border-line opacity-50'
          : principal
            ? 'border-accent/60 bg-accent/10 hover:bg-accent/15'
            : 'border-line bg-surface/60 hover:bg-surface-hover',
      )}
    >
      <span
        className={clsx(
          'grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)]',
          principal ? 'bg-accent/20 text-accent' : 'bg-surface-strong text-muted',
        )}
        aria-hidden
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">{titre}</span>
          {marque && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-accent">
              <Check size={12} aria-hidden />
              {marque}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{raison ?? detail}</span>
      </span>
    </button>
  )
}

/** L'écran d'après : le lien est fabriqué, il n'y a plus qu'à l'envoyer. */
function PartiePrete({
  url,
  copied,
  onCopy,
  onShare,
  onEntrer,
  timeControlId,
  rated,
}: {
  url: string | null
  copied: boolean
  onCopy: () => void
  onShare: () => void
  onEntrer: () => void
  timeControlId: string
  rated: boolean
}) {
  const t = useT()

  return (
    <Card glow className="mt-6 overflow-hidden">
      <div className="p-5 text-center sm:p-6">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
          style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)' }}
          aria-hidden
        >
          <Users size={24} className="text-accent" />
        </span>
        <h2 className="font-display text-xl font-semibold">{t('friendGame.ready')}</h2>
        <p className="mt-1.5 text-sm text-muted">{t('friendGame.readyHint')}</p>

        <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface p-2">
          <code className="min-w-0 flex-1 truncate px-1 text-left font-mono text-[12px]">
            {url}
          </code>
          <Button
            size="sm"
            variant={copied ? 'primary' : 'secondary'}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={onCopy}
          >
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" icon={<Share2 size={15} />} onClick={onShare} fullWidth>
            {t('common.share')}
          </Button>
          <Button variant="primary" fullWidth onClick={onEntrer}>
            {t('friendGame.enterGame')}
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Chip>
            {
              SPEED_LABELS[TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.category ?? 'rapid']
                .icon
            }{' '}
            {TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.label}
          </Chip>
          <Chip tone={rated ? 'accent' : 'neutral'}>
            {rated ? t('friendGame.rated') : t('friendGame.casual')}
          </Chip>
        </div>
      </div>
    </Card>
  )
}
