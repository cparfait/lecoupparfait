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

import { Suspense, useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Crown } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          return
        }

        toast.success(
          mode === 'signup' ? `Bienvenue, ${data.user.username} !` : `Content de te revoir, ${data.user.username}.`,
        )
        router.push(
          referrer
            ? `/amis?ami=${encodeURIComponent(referrer)}`
            : `/profil/${data.user.username}`,
        )
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
        <div className="mb-6 text-center">
          <span
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--radius)]"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              boxShadow: 'var(--glow)',
            }}
            aria-hidden
          >
            <Crown size={22} className="text-[var(--accent-contrast)]" />
          </span>
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

            {mode === 'signup' && (
              <Input
                label="Adresse e-mail"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                hint="Facultatif. Uniquement pour récupérer ton mot de passe si tu l’oublies. Jamais transmis à personne."
              />
            )}

            {error && (
              <p
                className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-sm text-[var(--q-blunder)]"
                role="alert"
              >
                {error}
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
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-faint">
            Jouer, apprendre, résoudre des puzzles et analyser tes parties fonctionne
            entièrement sans inscription. Le compte ne sert qu’à conserver ton classement et
            ton historique.
          </p>
        </div>
      </div>
    </div>
  )
}
