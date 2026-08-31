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
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Swords } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useCourrielDisponible, useIdentite } from '@/lib/auth/useIdentite.ts'

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
  const [mode, setMode] = useState<Mode>(referrer ? 'signup' : 'signin')

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
  useEffect(() => {
    if (!identite) return
    router.replace(referrer ? `/amis?ami=${encodeURIComponent(referrer)}` : '/')
  }, [identite, referrer, router])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Pseudo de remplacement proposé par le serveur, quand la saisie est refusée. */
  const [suggestion, setSuggestion] = useState<string | null>(null)
  /** Pseudo choisi par un invité qui préfère jouer tout de suite. */
  const [guestName, setGuestName] = useState('')

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
        setError(data.error ?? 'Impossible de lancer la partie.')
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
      setError('Le serveur est injoignable.')
    } finally {
      setBusy(false)
    }
  }, [guestName, referrer, router])

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
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Quelque chose s’est mal passé.')
          setSuggestion(data.suggestion ?? null)
          return
        }
        setSuggestion(null)

        toast.success(
          mode === 'signup' ? `Bienvenue, ${data.user.username} !` : `Content de te revoir, ${data.user.username}.`,
        )
        // Même destination que ci-dessus, pour la même raison : on arrive à
        // l'accueil, là où se trouve ce qu'on a à faire.
        router.push(referrer ? `/amis?ami=${encodeURIComponent(referrer)}` : '/')
        router.refresh()
      } catch {
        setError(
          'Le service de comptes est injoignable. Tu peux continuer à jouer sans compte.',
        )
      } finally {
        setBusy(false)
      }
    },
    [mode, username, password, email, referrer, router],
  )

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
                  {referrer} t’invite à jouer
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Choisis un pseudo et entre dans la partie. Pas besoin de compte.
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
                      placeholder="Ton pseudo"
                      aria-label="Ton pseudo"
                      maxLength={20}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={busy || guestName.trim().length < 2}
                  >
                    Jouer
                  </Button>
                </form>

                <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
                  Ou crée un compte ci-dessous : {referrer} entrera dans ton carnet, et tu
                  garderas ton classement d’une partie à l’autre.
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
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === 'signin' ? 'Content de te revoir' : 'Rejoins Le Coup Parfait'}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {mode === 'signin'
              ? 'Retrouve ton classement, tes parties et ta progression.'
              : 'Un pseudo, un mot de passe. C’est tout, et c’est gratuit pour toujours.'}
          </p>
        </div>

        <Card glow className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Pseudo"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={20}
              hint={
                mode === 'signup' ? '3 à 20 caractères : lettres, chiffres, tiret, souligné.' : undefined
              }
            />

            <Input
              label="Mot de passe"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              hint={mode === 'signup' ? '8 caractères minimum. La longueur compte plus que les symboles.' : undefined}
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
                  Mot de passe oublié ?
                </Link>
              </p>
            )}

            {mode === 'signup' && (
              <Input
                label="Adresse e-mail"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                hint={
                  courriel
                    ? 'Facultatif. Uniquement pour récupérer ton mot de passe si tu l’oublies — tu la confirmeras depuis ton profil, quand tu voudras. Jamais transmise à personne.'
                    : 'Facultatif — et pour l’instant sans usage : ce serveur n’envoie pas encore de courriel, donc un mot de passe perdu ne peut pas être récupéré. Choisis-en un dont tu te souviendras.'
                }
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
                      Essayer « {suggestion} »
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
              {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {mode === 'signin' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
              className="font-medium text-accent hover:underline"
            >
              {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/jouer"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            ou continue sans compte →
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
            Jouer, apprendre, résoudre des puzzles et analyser tes parties fonctionne
            entièrement sans inscription. Le compte ajoute le mode carrière, tes analyses
            conservées, le défi du jour, ta série, ton classement par cadence et
            l’historique de tes parties.
          </p>
        </div>
      </div>
    </div>
  )
}
