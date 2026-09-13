'use client'

/**
 * Confirmation d'adresse.
 *
 * On arrive ici depuis le lien reçu par courriel, souvent sur un autre
 * appareil que celui de l'inscription — d'où une page qui ne demande aucune
 * session et se contente de dire ce qui s'est passé.
 *
 * Trois issues, et chacune doit se comprendre sans rien connaître : c'est
 * fait, le lien a expiré, ou il ne correspond à rien. Aucune ne doit inquiéter
 * pour rien : dans les trois cas le compte fonctionne, seule l'adresse est en
 * jeu.
 */

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Mail, XCircle } from 'lucide-react'
import { Button, Card, Spinner } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'

type State =
  | { phase: 'checking' }
  | { phase: 'done'; username: string; alreadyDone: boolean }
  | { phase: 'failed'; message: string }

/** Voir la note de `/amis` : lire les paramètres d'adresse impose la frontière. */
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyResult />
    </Suspense>
  )
}

function VerifyResult() {
  const t = useT()
  const token = useSearchParams().get('jeton')
  const [state, setState] = useState<State>({ phase: 'checking' })

  useEffect(() => {
    if (!token) {
      setState({ phase: 'failed', message: t('verify.incompleteLink') })
      return
    }

    let alive = true
    void fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'verifyEmail', token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!alive) return
        if (!response.ok) {
          setState({ phase: 'failed', message: data.error ?? 'Confirmation impossible.' })
          return
        }
        setState({ phase: 'done', username: data.username, alreadyDone: data.alreadyDone })
      })
      .catch(() => {
        if (alive) setState({ phase: 'failed', message: t('verify.serverUnreachable') })
      })

    return () => {
      alive = false
    }
  }, [token, t])

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
      <Card glow className="w-full p-6 text-center">
        {state.phase === 'checking' && (
          <>
            <Spinner size={24} className="mx-auto text-accent" />
            <p className="mt-3 text-sm text-muted">{t('last.confirming')}</p>
          </>
        )}

        {state.phase === 'done' && (
          <>
            <span
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--q-best)]/15 text-[var(--q-best)]"
              aria-hidden
            >
              <CheckCircle2 size={24} />
            </span>
            <h1 className="font-display text-xl font-bold">
              {t(state.alreadyDone ? 'verify.alreadyDone' : 'verify.confirmed')}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {state.alreadyDone
                ? `L’adresse de ${state.username} était déjà confirmée. Rien à faire de plus.`
                : `Merci ${state.username}. Ton adresse pourra servir à retrouver ton mot de passe si tu le perds — et à rien d’autre.`}
            </p>
            <Link href="/jouer" className="mt-4 block">
              <Button variant="primary" fullWidth>
                Aller jouer
              </Button>
            </Link>
          </>
        )}

        {state.phase === 'failed' && (
          <>
            <span
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--q-blunder)]/15 text-[var(--q-blunder)]"
              aria-hidden
            >
              <XCircle size={24} />
            </span>
            <h1 className="font-display text-xl font-bold">Lien inutilisable</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{state.message}</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-faint">
              <Mail size={12} aria-hidden />
              {t('verify.accountWorks')}
            </p>
            <Link href="/connexion" className="mt-4 block">
              <Button variant="secondary" fullWidth>
                {t('nav.signIn')}
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
