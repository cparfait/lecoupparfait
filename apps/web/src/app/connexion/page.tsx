'use client'

/**
 * Connexion et inscription.
 *
 * Un seul écran, un basculement entre les deux modes : c'est le même formulaire
 * à un champ près, et forcer une navigation entre deux pages pour ça n'a aucun
 * sens.
 *
 * Le message le plus important de la page est le lien du bas : **on peut jouer
 * sans compte**. Il est visible, pas caché en petit — c'est une promesse du
 * projet, pas une concession.
 */

import { Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Swords } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { ChoixDeLangue } from '@/components/ui/ChoixDeLangue.tsx'
import { BienvenueCompte } from '@/components/compte/BienvenueCompte.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useCourrielDisponible, useIdentite } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

/**
 * Met le nom du site en évidence dans un titre.
 *
 * « Rejoins Le Coup Parfait » était écrit d'un seul trait, du même gris que le
 * reste : rien ne disait lequel de ces quatre mots était le nom de l'endroit où
 * l'on venait de tomber. C'est pourtant la seule page où quelqu'un le découvre.
 *
 * Le nom est marqué dans le dictionnaire — `**Le Coup Parfait**` — et non
 * découpé en deux clés. L'ordre des mots n'est pas le même partout : « Join Le
 * Coup Parfait », mais « Le Coup Parfaitに参加する ». Deux clés à recoller
 * auraient imposé l'ordre français à quarante langues.
 *
 * La couleur d'accent, en aplat, et non le dégradé du titre de l'accueil : ce
 * dégradé part de la couleur du texte pour n'arriver au violet qu'aux deux
 * tiers. Il est fait pour une ligne entière ; sur trois mots au milieu d'une
 * phrase, il coupait « Le Cou » du gris et « p Parfait » du violet, ce qui
 * ressemblait à un défaut d'affichage plutôt qu'à une mise en avant.
 */
function marque(texte: string): ReactNode[] {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((morceau, index) =>
    morceau.startsWith('**') && morceau.endsWith('**') ? (
      <span key={index} className="text-accent-soft">
        {morceau.slice(2, -2)}
      </span>
    ) : (
      <span key={index}>{morceau}</span>
    ),
  )
}

type Mode = 'signin' | 'signup'

/** Voir la note de `/amis` : le paramètre `?ami=` impose cette frontière. */
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const t = useT()
  const router = useRouter()
  const params = useSearchParams()
  /**
   * Pseudo de celui qui invite, quand on arrive par son lien.
   *
   * On ouvre alors directement sur la création de compte — quelqu'un qui suit
   * une invitation n'a, par définition, pas encore de compte — et l'on file au
   * carnet une fois inscrit, où l'amitié se noue toute seule.
   */
  const referrer = params.get('ami')
  // `?inscription=1` : le menu du compte propose « Créer un compte » directement.
  const [mode, setMode] = useState<Mode>(
    referrer || params.get('inscription') ? 'signup' : 'signin',
  )

  /**
   * Déjà connecté : on ne demande pas de se reconnecter.
   *
   * Le renvoi n'existait que pour les invitations — arriver par le lien d'un
   * ami alors qu'on a déjà un compte menait au carnet. Le cas ordinaire, lui,
   * ne menait nulle part : on tombait sur un formulaire de connexion en étant
   * connecté, avec son propre pseudo affiché dans l'en-tête juste au-dessus.
   * Proposer en plus « joue en invité » à ce moment-là revient à proposer de
   * perdre son classement et son historique à quelqu'un qui possède les deux.
   *
   * `undefined` veut dire « on ne sait pas encore » : on ne renvoie personne
   * tant que la réponse n'est pas arrivée, sinon le formulaire clignoterait
   * pour un visiteur anonyme.
   */
  const identite = useIdentite()
  // Masque la récupération de mot de passe quand aucun courriel ne peut partir.
  const courriel = useCourrielDisponible()

  /**
   * Le compte vient d'être créé : on déroule la mise en route.
   *
   * `null` dans tous les autres cas, y compris à la connexion — on ne demande
   * rien à quelqu'un qui revient, il a déjà répondu ou déjà refusé. Voir
   * `BienvenueCompte` pour ce qui s'y règle et pourquoi c'est ici.
   *
   * L'avatar voyage avec le pseudo : il vient d'être tiré au sort par le
   * serveur, et la première étape le montre plutôt que de le redemander.
   */
  const [bienvenue, setBienvenue] = useState<{ pseudo: string; avatar: string | null } | null>(null)

  /*
    Une fois connecté, on va à l'accueil — et non à son profil.

    Le profil est une page de consultation : un avatar, une courbe, un
    historique. On y va quand on se demande où l'on en est, ce qui n'est
    justement pas la question qu'on se pose juste après avoir tapé son mot de
    passe. On vient jouer, ou reprendre ce qu'on avait laissé.

    L'accueil connecté est fait exactement pour ça : la partie en plan, la
    correspondance qui attend, le chapitre en cours, le défi du jour. Le profil
    reste à un clic, sous l'avatar de l'en-tête.
  */
  const destination = referrer ? `/amis?ami=${encodeURIComponent(referrer)}` : '/'

  useEffect(() => {
    if (!identite) return
    // L'écran de bienvenue retient la page : sans ce garde, la relecture de
    // l'identité renverrait à l'accueil avant qu'on ait pu répondre.
    if (bienvenue) return
    router.replace(destination)
  }, [identite, bienvenue, destination, router])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Pseudo de remplacement proposé par le serveur, quand la saisie est refusée. */
  const [suggestion, setSuggestion] = useState<string | null>(null)
  /** Pseudo choisi par un invité qui préfère jouer tout de suite. */
  const [guestName, setGuestName] = useState('')

  /*
    La langue, posée dès l'inscription.

    Elle n'est pas là pour faire un champ de plus : c'est le seul moment où
    quelqu'un s'attend à décrire son compte, et la langue en fait partie au même
    titre que le pseudo. Elle part avec l'inscription et reste attachée au
    compte — on la retrouve sur un autre appareil, où le navigateur n'a rien
    d'enregistré.

    Le choix s'applique **tout de suite** à l'interface. Un formulaire qui reste
    en français pendant qu'on vient d'y désigner le japonais donnerait à croire
    que le réglage n'a pas pris ; et la fin du formulaire — les indications sous
    les champs, les messages d'erreur — se lit alors dans la langue choisie,
    c'est-à-dire là où elle sert le plus.
  */
  const locale = usePreferences((state) => state.locale)
  const setPreference = usePreferences((state) => state.set)

  /**
   * Entrer dans la partie sans compte.
   *
   * Demander à quelqu'un de s'inscrire avant même de savoir si le jeu lui
   * plaît, c'est le perdre. Un pseudo suffit donc : la proposition part chez
   * celui qui a envoyé le lien, et l'invité attend sur l'échiquier.
   */
  const playAsGuest = useCallback(async () => {
    const name = guestName.trim()
    if (!referrer || name.length < 2) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/defis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guest', to: referrer, name }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? t('auth.gameFailed'))
        return
      }
      try {
        localStorage.setItem('coupparfait.guestName', name)
      } catch {
        // Stockage refusé : le pseudo sera simplement « Invité ».
      }
      const challenge = data.challenge
      router.push(
        `/jouer/partie/${challenge.slug}?tc=${challenge.initialTime}+${challenge.increment}`,
      )
    } catch {
      setError(t('auth.serverUnreachable'))
    } finally {
      setBusy(false)
    }
  }, [guestName, referrer, router, t])

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      setBusy(true)
      setError(null)

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: mode,
            username: username.trim(),
            password,
            email: email.trim() || undefined,
            locale,
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? t('auth.errors.generic'))
          setSuggestion(data.suggestion ?? null)
          return
        }
        setSuggestion(null)

        /*
          Après une inscription, on ne file pas tout de suite.

          L'avatar, le niveau, le thème, le coach, les notifications et
          l'installation se proposent ici, et nulle part mieux : c'est le seul
          instant où l'on s'attend encore à répondre à des questions, et le seul
          où l'on n'a pas commencé à faire autre chose. Chacun de ces réglages
          existait déjà, dispersé là où on ne le cherche pas — d'où des comptes
          neufs tous identiques.

          À la connexion, en revanche, on file : quelqu'un qui revient a déjà
          répondu, ou déjà refusé.
        */
        if (mode === 'signup') {
          toast.success(t('auth.welcome', { pseudo: data.user.username }))
          setBienvenue({ pseudo: data.user.username, avatar: data.user.avatar ?? null })
          router.refresh()
          return
        }

        // La langue du compte reprend la main sur celle de l'appareil : on se
        // connecte d'ordinaire depuis un navigateur qui n'a rien enregistré,
        // et c'est précisément le cas où le compte a quelque chose à dire.
        if (data.user.locale) setPreference('locale', data.user.locale)
        toast.success(t('auth.welcomeBack', { pseudo: data.user.username }))
        // Même destination que ci-dessus, pour la même raison : on arrive à
        // l'accueil, là où se trouve ce qu'on a à faire.
        router.push(destination)
        router.refresh()
      } catch {
        setError(t('auth.accountsUnreachable'))
      } finally {
        setBusy(false)
      }
    },
    [mode, username, password, email, locale, setPreference, destination, router, t],
  )

  /*
    L'écran de bienvenue remplace le formulaire, il ne s'ajoute pas dessous.

    Laisser les champs derrière donnerait à croire qu'il reste quelque chose à
    y faire, et sur téléphone les deux questions passeraient sous le pli — ce
    qui reviendrait à ne pas les poser.
  */
  if (bienvenue) {
    return (
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
        <div className="w-full">
          <BienvenueCompte
            pseudo={bienvenue.pseudo}
            avatar={bienvenue.avatar}
            onTermine={() => {
              setBienvenue(null)
              router.push(destination)
              router.refresh()
            }}
            /* Le test de niveau remplace la destination habituelle : on ne
               renvoie pas au jeu quelqu'un qui vient de demander à être
               mesuré. Les réglages restants ne sont pas perdus — ils vivent
               dans les préférences, et le bandeau de mise en route reposera
               les deux questions du navigateur. */
            onTest={() => {
              setBienvenue(null)
              router.push('/apprendre/niveau')
              router.refresh()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
      <div className="w-full">
        {referrer && (
          <Card glow className="mb-5 p-4">
            <div className="flex items-start gap-2.5">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
                aria-hidden
              >
                <Swords size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">
                  {t('auth.invitesYou', { pseudo: referrer })}
                </p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-muted">
                  {t('auth.pickNameAndPlay')}
                </p>

                <form
                  className="mt-2.5 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void playAsGuest()
                  }}
                >
                  {/* `Input` s'enveloppe dans un bloc pleine largeur : la
                      classe passée irait sur le champ, pas sur l'enveloppe. */}
                  <div className="min-w-0 flex-1">
                    <Input
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder={t('auth.yourName')}
                      aria-label={t('auth.yourName')}
                      maxLength={20}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={busy || guestName.trim().length < 2}
                  >
                    {t('auth.play')}
                  </Button>
                </form>

                <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
                  {t('auth.orSignUpBelow', { pseudo: referrer })}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-6 text-center">
          {/* Sans logo, et c'est un retrait.

              Cavale avait remplacé ici une couronne qui ne ressemblait à rien
              d'autre dans l'application — la bonne correction à l'époque, mais
              une correction de moitié : le même cavalier se tient déjà en haut
              à gauche, à trois centimètres, dans la barre de navigation. Deux
              fois la même marque sur un écran qui tient en un formulaire, ce
              n'est pas deux fois plus de marque, c'est un doublon qui repousse
              le champ « Pseudo » vers le bas.

              La page s'ouvre donc sur sa phrase, qui est ce qu'on est venu
              lire. `LogoMark` reste utilisé par l'en-tête, où il a un sens :
              y revenir d'un clic. */}
          <h1
            className={clsx(
              'font-display font-bold tracking-tight',
              // Plus grand à l'inscription : c'est le seul écran où l'on
              // présente la marque à quelqu'un qui ne la connaît pas encore.
              mode === 'signin' ? 'text-2xl sm:text-3xl' : 'text-[28px] sm:text-4xl',
            )}
          >
            {mode === 'signin' ? t('auth.signInTitle') : marque(t('auth.signUpTitle'))}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {t(mode === 'signin' ? 'auth.signInBlurb' : 'auth.signUpBlurb')}
          </p>
        </div>

        <Card glow className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label={t('auth.username')}
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={20}
              hint={mode === 'signup' ? t('auth.usernameHintLong') : undefined}
            />

            <Input
              label={t('auth.password')}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              hint={mode === 'signup' ? t('auth.passwordHintLong') : undefined}
            />

            {/* À la connexion seulement : proposer « oublié » pendant qu'on
                choisit son mot de passe n'aurait aucun sens.

                Et seulement si le serveur sait envoyer un courriel. Le lien
                menait sinon à un formulaire qui répondait « si cette adresse
                est connue, un message vient de partir » alors que rien ne
                partait : on croyait attendre un message, on l'attendait pour
                toujours. Un lien absent est désagréable ; un lien qui ment
                l'est davantage. */}
            {mode === 'signin' && courriel && (
              <p className="-mt-2 text-right">
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-xs text-muted transition-colors hover:text-accent"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </p>
            )}

            {mode === 'signup' && (
              <div className="w-full">
                <span className="mb-1.5 block text-sm font-medium">{t('auth.language')}</span>
                <ChoixDeLangue
                  id="langue"
                  label={t('auth.language')}
                  valeur={locale}
                  onChange={(code) => setPreference('locale', code)}
                />
                <p className="mt-1.5 text-xs text-faint">{t('auth.languageHint')}</p>
              </div>
            )}

            {mode === 'signup' && (
              <Input
                label={t('auth.email')}
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                hint={courriel ? t('auth.emailHint') : t('auth.emailHintNoMail')}
              />
            )}

            {error && (
              <p
                className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-sm text-[var(--q-blunder)]"
                role="alert"
              >
                {error}
                {/* Refuser sans proposer oblige à retâtonner : un clic applique
                    le pseudo le plus proche qui, lui, serait accepté. */}
                {suggestion && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => {
                        setUsername(suggestion)
                        setError(null)
                        setSuggestion(null)
                      }}
                      className="font-semibold underline underline-offset-2"
                    >
                      {t('auth.trySuggestion', { pseudo: suggestion })}
                    </button>
                  </>
                )}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={busy}
              icon={busy ? undefined : <ArrowRight size={16} />}
            >
              {t(mode === 'signin' ? 'auth.submitSignIn' : 'auth.submitSignUp')}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {t(mode === 'signin' ? 'auth.noAccount' : 'auth.hasAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
              className="font-medium text-accent hover:underline"
            >
              {t(mode === 'signin' ? 'auth.signUp' : 'auth.submitSignIn')}
            </button>
          </p>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/jouer"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            {t('auth.continueWithout')}
          </Link>
          {/*
            La liste doit rester juste.
            Elle disait « le compte ne sert qu'à conserver ton classement et ton
            historique », ce qui était vrai et ne l'est plus : le mode carrière,
            les analyses conservées et le défi du jour en dépendent tous depuis.
            Une promesse qui sous-estime ce qu'elle offre est un mensonge comme
            un autre — et celui-là coûte des inscriptions.
          */}
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-faint">
            {t('auth.whatAccountAdds')}
          </p>
        </div>
      </div>
    </div>
  )
}
