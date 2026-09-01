'use client'

/**
 * La mise en route, juste après l'inscription.
 *
 * Tous ces réglages existaient déjà, éparpillés là où on ne les cherche pas :
 * l'avatar au bas d'une page de profil, le thème derrière une palette de la
 * barre, la voix du coach au troisième onglet des préférences, les
 * notifications au cinquième, l'installation nulle part. Chacun se défend
 * isolément ; leur somme faisait qu'un compte neuf ressemblait à tous les
 * autres — même pion noir, même thème, même adversaire à 100 Elo pour quelqu'un
 * qui joue depuis vingt ans.
 *
 * L'inscription est le seul moment où les poser ne dérange personne : on vient
 * d'accepter un formulaire, on s'attend encore à répondre, et l'on n'a pas
 * commencé à faire autre chose. Un bandeau qui surgit trois pages plus loin
 * arrive, lui, en travers de quelque chose.
 *
 * Six étapes, une question par écran, **et rien d'obligatoire** : « Passer »
 * est présent à chaque écran et emmène directement au jeu. Une étape qui n'a
 * rien à proposer — un navigateur sans notifications, une application déjà
 * installée — s'efface d'elle-même et ne compte pas dans le total, sans quoi on
 * annoncerait « étape 5 sur 6 » avant de sauter à la fin.
 *
 * L'ordre va du personnel au technique : ce qu'on est (avatar, niveau), ce
 * qu'on voit (thème), ce qu'on entend (le coach), puis ce que l'application
 * fait quand elle n'est pas à l'écran (notifications, installation).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Download,
  Gauge,
  MessageSquareText,
  Palette,
  Share,
  Smile,
} from 'lucide-react'
import clsx from 'clsx'
import { BOT_LEVELS, botLevel, suggestedLevel } from '@coupparfait/core'
import { Button, Card, Toggle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { AVATAR_FAMILIES, DEFAULT_AVATAR } from '@/lib/avatars.ts'
import { iosSansInstallation, useNotifications } from '@/lib/notifications.ts'
import { useInstallation } from '@/lib/pwa.ts'
import { THEME_LIST, usePreferences } from '@/lib/store/preferences.ts'
import { useT } from '@/lib/i18n/index.tsx'

/**
 * Les mêmes clés que le bandeau de mise en route.
 *
 * Répondre ici doit le faire taire : sans cela, on accepterait les
 * notifications à l'inscription pour se les voir reproposer trois pages plus
 * loin.
 */
const CLES = {
  notifications: 'coupparfait.propose.notifications',
  installation: 'coupparfait.propose.installation',
} as const

function marquerPropose(cle: string) {
  try {
    window.localStorage.setItem(cle, '1')
  } catch {
    // Stockage refusé : le bandeau reposera la question. Sans gravité.
  }
}

type EtapeId = 'avatar' | 'niveau' | 'theme' | 'coach' | 'notifications' | 'installation'

export function BienvenueCompte({
  pseudo,
  avatar,
  onTermine,
}: {
  pseudo: string
  /** L'avatar tiré au sort par le serveur à la création du compte. */
  avatar: string | null
  /** Appelé quand il n'y a plus rien à demander : la page reprend la main. */
  onTermine: () => void
}) {
  const notifications = useNotifications()
  const installation = useInstallation()
  const ios = iosSansInstallation()

  /**
   * Quelles étapes ont réellement quelque chose à proposer ?
   *
   * Les quatre premières valent toujours ; les deux dernières dépendent du
   * navigateur et du serveur. On les calcule une fois l'état connu, et le
   * compteur se cale dessus : « étape 3 sur 4 » sur un ordinateur qui ne sait
   * pas installer, « 3 sur 6 » sur un téléphone Android.
   */
  const etapes = useMemo<EtapeId[]>(() => {
    const liste: EtapeId[] = ['avatar', 'niveau', 'theme', 'coach']
    // Sur iPhone, la case « notifications » se règle en installant : les deux
    // étapes se confondent, et c'est l'installation qui porte l'explication.
    if (!ios && notifications.etat === 'a-activer') liste.push('notifications')
    if (!installation.installee && (installation.possible || installation.manuelle)) {
      liste.push('installation')
    }
    return liste
  }, [ios, notifications.etat, installation.installee, installation.possible, installation.manuelle])

  const [index, setIndex] = useState(0)
  const etape = etapes[Math.min(index, etapes.length - 1)]

  const suivant = useCallback(() => {
    setIndex((valeur) => {
      if (valeur + 1 >= etapes.length) {
        marquerPropose(CLES.notifications)
        marquerPropose(CLES.installation)
        onTermine()
        return valeur
      }
      return valeur + 1
    })
  }, [etapes.length, onTermine])

  const passerTout = useCallback(() => {
    marquerPropose(CLES.notifications)
    marquerPropose(CLES.installation)
    onTermine()
  }, [onTermine])

  // Tant que l'état des notifications n'est pas connu, le nombre d'étapes ne
  // l'est pas non plus : on ne montre pas « sur 4 » pour afficher « sur 6 »
  // une demi-seconde plus tard.
  if (notifications.etat === 'inconnu') return null

  return (
    <Card glow className="overflow-hidden p-0">
      {/* La barre d'avancement, et non un numéro seul : on veut savoir combien
          il en reste avant de s'engager, pas après chaque écran. */}
      <div className="h-1 bg-surface-strong" aria-hidden>
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${((index + 1) / etapes.length) * 100}%` }}
        />
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-start gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_18%,transparent)] text-[var(--q-best)]"
            aria-hidden
          >
            <Check size={18} strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-tight">
              Bienvenue, {pseudo}.
            </p>
            <p className="text-[13px] text-muted">
              Ton compte est créé. Quelques réglages, et tu joues.
            </p>
          </div>
          <span className="shrink-0 pt-1 text-[11px] tabular-nums text-faint">
            {index + 1} / {etapes.length}
          </span>
        </div>

        {etape === 'avatar' && <EtapeAvatar depart={avatar} />}
        {etape === 'niveau' && <EtapeNiveau />}
        {etape === 'theme' && <EtapeTheme />}
        {etape === 'coach' && <EtapeCoach />}
        {etape === 'notifications' && <EtapeNotifications notifications={notifications} />}
        {etape === 'installation' && <EtapeInstallation installation={installation} ios={ios} />}

        <div className="mt-5 flex items-center gap-2">
          {index > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={() => setIndex((valeur) => Math.max(0, valeur - 1))}
            >
              Retour
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="ml-auto"
            icon={<ArrowRight size={16} />}
            onClick={suivant}
          >
            {index + 1 >= etapes.length ? 'Aller jouer' : 'Suivant'}
          </Button>
        </div>

        <button
          type="button"
          onClick={passerTout}
          className="mt-3 block w-full text-center text-[12px] font-medium text-muted transition-colors hover:text-ink"
        >
          Passer, je réglerai plus tard
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
          Tout se retrouve dans tes préférences et sur ton profil. Rien n’est définitif.
        </p>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  1 · L'avatar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * L'avatar est déjà tiré au sort : on le montre, on ne le demande pas.
 *
 * Ouvrir sur une grille vide de cent émojis avec « choisis-en un » est une
 * question de plus au moment où l'on en a déjà répondu trois. Montrer celui
 * qu'on a reçu ne demande rien, et donne envie d'en changer bien plus sûrement
 * qu'une consigne.
 */
function EtapeAvatar({ depart }: { depart: string | null }) {
  const [choisi, setChoisi] = useState(depart ?? DEFAULT_AVATAR)
  const [famille, setFamille] = useState(() => {
    const trouve = AVATAR_FAMILIES.findIndex((entree) =>
      entree.emojis.includes(depart ?? DEFAULT_AVATAR),
    )
    return trouve >= 0 ? trouve : 0
  })
  const active = AVATAR_FAMILIES[famille]!

  const choisir = useCallback(async (emoji: string) => {
    const avant = choisi
    setChoisi(emoji)
    try {
      const reponse = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'avatar', avatar: emoji }),
      })
      if (!reponse.ok) {
        setChoisi(avant)
        toast.error('Changement impossible.')
      }
    } catch {
      setChoisi(avant)
      toast.error('Le serveur est injoignable.')
    }
  }, [choisi])

  return (
    <Etage
      icone={<Smile size={18} aria-hidden />}
      titre="Voici ton avatar"
      detail="Tiré au sort, pour que ta ligne se repère dans une liste d’amis dès le premier jour. Touche-en un autre si celui-là ne te va pas."
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius)] bg-surface-strong text-3xl"
          aria-hidden
        >
          {choisi}
        </span>
        <div className="flex min-w-0 flex-wrap gap-1">
          {AVATAR_FAMILIES.map((entree, i) => (
            <button
              key={entree.label}
              type="button"
              onClick={() => setFamille(i)}
              aria-pressed={i === famille}
              className={clsx(
                'rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium transition-colors',
                i === famille
                  ? 'bg-accent/18 text-ink ring-1 ring-inset ring-accent/40'
                  : 'text-muted hover:bg-surface-hover',
              )}
            >
              {entree.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
        {active.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void choisir(emoji)}
            aria-pressed={emoji === choisi}
            title={emoji === choisi ? 'Ton avatar' : 'Choisir cet avatar'}
            className={clsx(
              'grid aspect-square place-items-center rounded-[var(--radius-sm)] text-xl transition-colors',
              emoji === choisi
                ? 'bg-accent/20 ring-2 ring-inset ring-accent'
                : 'hover:bg-surface-hover',
            )}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  2 · Le niveau
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cinq réponses en clair, et un classement si on en a un.
 *
 * L'échelle des adversaires démarrait à 100 Elo pour tout le monde, et se
 * gravissait un palier à la fois. Pour quelqu'un qui joue en club, cela veut
 * dire une douzaine de parties sans intérêt avant d'atteindre un adversaire à
 * sa mesure — ou déplacer le curseur à la main avant chaque partie, ce qui
 * suppose de savoir que le curseur existe.
 *
 * On demande donc, une fois, dans les mots de quelqu'un qui ne connaît pas
 * forcément son Elo. Et l'on dit ce que ça fait : cela règle l'adversaire de
 * départ, rien d'autre. Aucun classement n'est touché — une déclaration que
 * personne ne vérifie n'a rien à faire dans un tableau.
 */
const REPERES: Array<{ id: string; label: string; detail: string; elo: number | null }> = [
  { id: 'debut', label: 'Je débute', detail: 'Je découvre, ou je connais juste les règles.', elo: 250 },
  { id: 'occasionnel', label: 'Je joue de temps en temps', detail: 'En famille, entre amis, sans travailler.', elo: 900 },
  { id: 'regulier', label: 'Je joue régulièrement', detail: 'En ligne, je gagne à peu près une partie sur deux.', elo: 1300 },
  { id: 'club', label: 'Je joue en club', detail: 'J’ai des ouvertures, je vois les tactiques courantes.', elo: 1700 },
  { id: 'fort', label: 'Je suis un joueur fort', detail: 'Classé, ou l’équivalent en ligne.', elo: 2100 },
]

function EtapeNiveau() {
  const [choix, setChoix] = useState<string | null>(null)
  const [elo, setElo] = useState('')

  /** Le classement saisi l'emporte sur le repère : il est plus précis. */
  const eloRetenu = useMemo(() => {
    const saisi = Number(elo)
    if (Number.isFinite(saisi) && saisi >= 400 && saisi <= 3000) return saisi
    return REPERES.find((repere) => repere.id === choix)?.elo ?? null
  }, [choix, elo])

  const niveau = eloRetenu === null ? null : suggestedLevel(eloRetenu)

  /**
   * Enregistré à chaque changement, sans bouton de validation.
   *
   * Il n'y a rien à confirmer : le seul effet est le curseur de départ de
   * l'écran « contre l'ordinateur », et revenir en arrière le corrige.
   */
  useEffect(() => {
    if (niveau === null) return
    const minuteur = setTimeout(() => {
      void fetch('/api/progression', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'declarer', level: niveau }),
      }).catch(() => undefined)
    }, 400)
    return () => clearTimeout(minuteur)
  }, [niveau])

  return (
    <Etage
      icone={<Gauge size={18} aria-hidden />}
      titre="Tu en es où, à peu près ?"
      detail="Ça règle l’adversaire qu’on te proposera en premier. Sans réponse, on part du plus faible — ce qui n’a aucun intérêt si tu joues déjà. Ton classement, lui, se gagnera en jouant."
    >
      <div className="space-y-1.5">
        {REPERES.map((repere) => (
          <button
            key={repere.id}
            type="button"
            onClick={() => {
              setChoix(repere.id)
              setElo('')
            }}
            aria-pressed={choix === repere.id && !elo}
            className={clsx(
              'w-full rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors',
              choix === repere.id && !elo
                ? 'border-accent bg-accent/15 ring-1 ring-accent'
                : 'border-line hover:bg-surface-hover',
            )}
          >
            <span className="block text-[13px] font-medium">{repere.label}</span>
            <span className="block text-[11px] leading-snug text-faint">{repere.detail}</span>
          </button>
        ))}
      </div>

      {/* Pour qui connaît son chiffre : plus précis que n'importe quel repère,
          et c'est aussi la seule façon de viser entre deux paliers. */}
      <label className="mt-3 flex items-center gap-2 text-[12px] text-muted">
        <span className="shrink-0">Ou ton classement :</span>
        <input
          type="number"
          inputMode="numeric"
          min={400}
          max={3000}
          value={elo}
          onChange={(event) => setElo(event.target.value)}
          placeholder="1450"
          aria-label="Ton classement Elo"
          className="h-8 w-24 rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-sm tabular-nums placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </label>

      {niveau !== null && (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[12px] leading-relaxed text-muted">
          Premier adversaire proposé :{' '}
          <strong className="font-semibold text-ink">niveau {niveau}</strong>, environ{' '}
          <strong className="font-semibold text-ink">{botLevel(niveau).elo} Elo</strong>. Les{' '}
          {BOT_LEVELS.length} paliers restent accessibles au curseur, dans les deux sens.
        </p>
      )}
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  3 · Le thème
// ─────────────────────────────────────────────────────────────────────────────

function EtapeTheme() {
  const theme = usePreferences((state) => state.theme)
  const set = usePreferences((state) => state.set)
  const t = useT()

  return (
    <Etage
      icone={<Palette size={18} aria-hidden />}
      titre="Choisis ton ambiance"
      detail="Le changement est immédiat, tu vois ce que tu choisis. « Contraste » est là pour les écrans en plein soleil et pour les vues fatiguées."
    >
      <div className="grid grid-cols-2 gap-1.5">
        {THEME_LIST.map((entree) => (
          <button
            key={entree.id}
            type="button"
            onClick={() => set('theme', entree.id)}
            aria-pressed={theme === entree.id}
            className={clsx(
              'flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors',
              theme === entree.id
                ? 'border-accent bg-accent/15 ring-1 ring-accent'
                : 'border-line hover:bg-surface-hover',
            )}
          >
            <span className="flex shrink-0 gap-0.5" aria-hidden>
              {entree.swatch.map((couleur) => (
                <span
                  key={couleur}
                  className="h-6 w-2.5 rounded-[2px] ring-1 ring-black/20"
                  style={{ background: couleur }}
                />
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {t(`settings.themes.${entree.id}` as never)}
            </span>
            {theme === entree.id && (
              <Check size={14} className="shrink-0 text-accent" aria-hidden />
            )}
          </button>
        ))}
      </div>
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  4 · Le coach
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les deux réglages qui font la différence entre cette application et une autre.
 *
 * La voix et le commentaire de chaque coup sont l'argument du projet — « un
 * moteur qui explique pourquoi » — et ils vivaient l'un au troisième onglet des
 * préférences, l'autre dans une case de l'écran de configuration d'une partie.
 * Beaucoup de gens ne les ont jamais vus.
 */
function EtapeCoach() {
  const voix = usePreferences((state) => state.voiceEnabled)
  const commentaire = usePreferences((state) => state.commentaryMode)
  const set = usePreferences((state) => state.set)

  return (
    <Etage
      icone={<MessageSquareText size={18} aria-hidden />}
      titre="Le coach doit-il t’accompagner ?"
      detail="C’est ce qui distingue cette application d’un simple échiquier : après chaque coup, ce qu’il valait, ce que tu pouvais jouer, et pourquoi."
    >
      <div className="divide-y divide-line rounded-[var(--radius-sm)] border border-line px-3">
        <Toggle
          checked={commentaire}
          onChange={(valeur) => set('commentaryMode', valeur)}
          label="Commenter chaque coup"
          description="Recommandé pour débuter. Ça se coupe en pleine partie, d’un clic sur le panneau."
        />
        <Toggle
          checked={voix}
          onChange={(valeur) => set('voiceEnabled', valeur)}
          label="Lire les explications à voix haute"
          description="Pratique pour garder les yeux sur l’échiquier. Sans effet si ton appareil est en silencieux."
        />
      </div>
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  5 · Les notifications
// ─────────────────────────────────────────────────────────────────────────────

function EtapeNotifications({
  notifications,
}: {
  notifications: ReturnType<typeof useNotifications>
}) {
  const { etat, occupe, erreur, activer } = notifications

  return (
    <Etage
      icone={<Bell size={18} aria-hidden />}
      titre="Être prévenu quand un ami t’invite"
      detail="Une invitation expire en cinq minutes : sans notification, elle meurt dans un téléphone resté dans une poche. Rien d’autre ne te sera envoyé — ni actualités, ni relances."
    >
      {etat === 'actif' ? (
        <p className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[13px] text-ink">
          <Check size={15} className="shrink-0 text-[var(--q-best)]" aria-hidden />
          C’est activé sur cet appareil.
        </p>
      ) : (
        <>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Bell size={16} />}
            loading={occupe}
            // La permission se demande **dans le clic** : une demande faite sans
            // geste est rejetée par Firefox et enterrée par Chrome.
            onClick={() => void activer()}
          >
            Activer les notifications
          </Button>
          {etat === 'refuse' && (
            <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
              <BellOff size={14} className="mt-0.5 shrink-0" aria-hidden />
              Ton navigateur les a refusées pour ce site et ne redemandera pas. Ça se
              réautorise à côté de l’adresse du site.
            </p>
          )}
        </>
      )}

      {erreur && (
        <p
          className="mt-2 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-[13px] text-[var(--q-blunder)]"
          role="alert"
        >
          {erreur}
        </p>
      )}
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  6 · L'installation
// ─────────────────────────────────────────────────────────────────────────────

function EtapeInstallation({
  installation,
  ios,
}: {
  installation: ReturnType<typeof useInstallation>
  ios: boolean
}) {
  if (installation.manuelle || ios) {
    return (
      <Etage
        icone={<Share size={18} aria-hidden />}
        titre="Pose-la sur ton écran d’accueil"
        detail="Touche le bouton de partage de ton navigateur, puis « Sur l’écran d’accueil ». Sur iPhone et iPad, c’est aussi ce qui débloque les notifications — sans quoi tu ne sauras pas qu’un ami t’a invité."
      >
        <p className="rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[12px] leading-relaxed text-muted">
          Rien à télécharger sur un magasin : c’est le même site, posé à côté de tes autres
          applications.
        </p>
      </Etage>
    )
  }

  return (
    <Etage
      icone={<Download size={18} aria-hidden />}
      titre="Installe l’application"
      detail="Une icône sur ton écran d’accueil, plein écran, sans barre d’adresse. Rien à télécharger sur un magasin : c’est le même site."
    >
      {installation.possible ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Download size={16} />}
          onClick={() => void installation.installer()}
        >
          Installer
        </Button>
      ) : (
        <p className="rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[12px] leading-relaxed text-muted">
          C’est fait, ou ton navigateur s’en charge depuis son propre menu.
        </p>
      )}
    </Etage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/** Une étape : une icône, une promesse, une explication, puis le réglage. */
function Etage({
  icone,
  titre,
  detail,
  children,
}: {
  icone: React.ReactNode
  titre: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-line/60 pt-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="shrink-0 text-accent">{icone}</span>
        {titre}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{detail}</p>
      <div className="mt-3.5">{children}</div>
    </div>
  )
}
