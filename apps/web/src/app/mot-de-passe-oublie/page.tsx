'use client'

/**
 * Demander un lien de réinitialisation.
 *
 * La réponse est la même dans tous les cas — adresse connue, inconnue, ou non
 * confirmée. Ce n'est pas de la paresse : dire « cette adresse n'est pas
 * inscrite » transformerait ce formulaire en moyen de savoir qui a un compte
 * ici, ce qui ne regarde personne.
 *
 * Le texte est donc écrit pour rester vrai et utile dans les trois cas.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { KeyRound, MailCheck, MailX } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { useCourrielDisponible } from '@/lib/auth/useIdentite.ts'

export default function ForgotPasswordPage() {
  const courriel = useCourrielDisponible()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
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
          body: JSON.stringify({ action: 'forgotPassword', email: email.trim() }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.error ?? 'Demande impossible.')
          return
        }
        setSent(true)
      } catch {
        setError('Le serveur est injoignable.')
      } finally {
        setBusy(false)
      }
    },
    [email],
  )

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
          <h1 className="font-display text-2xl font-bold tracking-tight">Mot de passe oublié</h1>
          {/* Le sous-titre suit la même règle que la carte : promettre un lien
              juste au-dessus d'un encart qui explique qu'aucun ne peut partir
              se contredit à deux lignes d'intervalle. */}
          <p className="mt-1.5 text-sm text-muted">
            {courriel === false
              ? 'La récupération par courriel n’est pas active sur ce serveur.'
              : 'Indique l’adresse de ton compte : nous t’enverrons un lien pour en choisir un nouveau.'}
          </p>
        </div>

        <Card glow className="p-6">
          {/* Le lien qui mène ici est masqué quand rien ne peut partir, mais
              l'adresse reste tapable, et elle circule : on répond donc aussi
              ici plutôt que de laisser un formulaire qui promet un message
              impossible. `undefined` = on ne sait pas encore, et l'on n'affiche
              alors ni l'un ni l'autre. */}
          {courriel === false ? (
            <div className="text-center">
              <span
                className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-blunder)_15%,transparent)] text-[var(--q-blunder)]"
                aria-hidden
              >
                <MailX size={22} />
              </span>
              <p className="text-sm font-semibold">Pas encore possible ici</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                Ce serveur n’envoie pas de courriel pour le moment : il n’y a donc aucun moyen de
                t’envoyer un lien de réinitialisation.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-faint">
                Écris à la personne qui héberge cette instance — elle peut redonner la main à ton
                compte directement. Ton mot de passe, lui, n’a pas changé.
              </p>
              <Link href="/connexion" className="mt-4 block">
                <Button variant="secondary" fullWidth>
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : sent ? (
            <div className="text-center">
              <span
                className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-2)]/15 text-[var(--accent-2)]"
                aria-hidden
              >
                <MailCheck size={22} />
              </span>
              <p className="text-sm font-semibold">C’est envoyé</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                Si un compte utilise cette adresse <strong>et qu’elle a été confirmée</strong>, un
                lien vient d’y être envoyé. Il est valable une heure.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-faint">
                Rien reçu ? L’adresse n’est peut-être pas celle du compte, ou n’a jamais été
                confirmée — auquel cas elle ne peut pas servir à reprendre la main.
              </p>
              <Link href="/connexion" className="mt-4 block">
                <Button variant="secondary" fullWidth>
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input
                label="Adresse électronique"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                hint="Celle que tu as renseignée à l’inscription."
              />

              {error && (
                <p
                  className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-sm text-[var(--q-blunder)]"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" fullWidth disabled={busy}>
                {busy ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-faint">
          Pas d’adresse sur ton compte ? Un compte sans adresse confirmée ne peut pas être récupéré
          — c’est le prix de ne rien demander à l’inscription.
        </p>
      </div>
    </div>
  )
}
