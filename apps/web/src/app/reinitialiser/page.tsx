'use client'

/**
 * Choisir un nouveau mot de passe.
 *
 * On arrive par le lien reçu, souvent sur un autre appareil : la page ne
 * demande donc aucune session, seulement le jeton et le nouveau mot de passe.
 *
 * Une fois posé, toutes les sessions du compte sont fermées côté serveur — si
 * l'on réinitialise, c'est souvent qu'on craint que quelqu'un d'autre soit
 * entré. On repart donc de la page de connexion, ce que la page annonce pour
 * que ça ne surprenne pas.
 */

import { Suspense, useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

/** Voir la note de `/amis` : lire les paramètres d'adresse impose la frontière. */
export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const router = useRouter()
  const token = useSearchParams().get('jeton') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      // Vérifié ici plutôt qu'au serveur : c'est une faute de frappe, pas une
      // règle de sécurité, et l'aller-retour n'apprendrait rien de plus.
      if (password !== confirm) {
        setError('Les deux mots de passe ne sont pas identiques.')
        return
      }

      setBusy(true)
      setError(null)
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resetPassword', token, password }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.error ?? 'Réinitialisation impossible.')
          return
        }
        toast.success('Mot de passe changé.', 'Connecte-toi avec le nouveau.')
        router.push('/connexion')
      } catch {
        setError('Le serveur est injoignable.')
      } finally {
        setBusy(false)
      }
    },
    [token, password, confirm, router],
  )

  if (!token) {
    return (
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
        <Card className="w-full p-6 text-center">
          <h1 className="font-display text-xl font-bold">Lien incomplet</h1>
          <p className="mt-1.5 text-sm text-muted">
            Ouvre le lien tel qu’il apparaît dans le courriel, sans le retaper.
          </p>
          <Link href="/mot-de-passe-oublie" className="mt-4 block">
            <Button variant="secondary" fullWidth>
              Demander un nouveau lien
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
      <div className="w-full">
        <div className="mb-6 text-center">
          <span
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--radius)] bg-accent/15 text-accent"
            aria-hidden
          >
            <KeyRound size={22} />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Nouveau mot de passe
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Huit caractères au minimum. C’est la seule règle.
          </p>
        </div>

        <Card glow className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <Input
              label="Répète-le"
              name="confirm"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            {error && (
              <p
                className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-sm text-[var(--q-blunder)]"
                role="alert"
              >
                {error}
              </p>
            )}

            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-faint">
              <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
              Toutes les sessions ouvertes seront fermées, y compris sur les autres appareils. Tu
              devras te reconnecter partout.
            </p>

            <Button type="submit" variant="primary" fullWidth disabled={busy}>
              {busy ? 'Enregistrement…' : 'Changer mon mot de passe'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
