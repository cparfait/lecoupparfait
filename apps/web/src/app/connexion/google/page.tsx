'use client'

/**
 * Le pseudo d'un nouveau compte créé avec Google.
 *
 * Google a confirmé qui l'on est ; il reste le seul choix qu'il ne peut pas
 * faire à notre place : le pseudo, qui s'affiche dans les parties et sert
 * d'adresse au profil. On en propose un d'après le nom du compte Google, qu'on
 * corrige plus volontiers qu'on ne l'invente.
 *
 * L'identité attend côté serveur (`api/auth/google/inscription`) : passé dix
 * minutes, ou après un redémarrage, la page le dit et propose de recommencer.
 * Une fois le compte créé, la mise en route est la même qu'après une
 * inscription ordinaire — voir `BienvenueCompte`.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BienvenueCompte } from '@/components/compte/BienvenueCompte.tsx'
import { BoutonGoogle } from '@/components/compte/BoutonGoogle.tsx'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { rafraichirIdentite } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

type Attente = { attente: false } | { attente: true; nom: string | null; suggestion: string | null }

export default function PseudoGooglePage() {
  const t = useT()
  const router = useRouter()
  const locale = usePreferences((state) => state.locale)
  const [attente, setAttente] = useState<Attente | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [bienvenue, setBienvenue] = useState<{ pseudo: string; avatar: string | null } | null>(null)

  useEffect(() => {
    let vivant = true
    void fetch('/api/auth/google/inscription')
      .then((reponse) => reponse.json() as Promise<Attente>)
      .then((donnees) => {
        if (!vivant) return
        setAttente(donnees)
        if (donnees.attente && donnees.suggestion) setPseudo(donnees.suggestion)
      })
      .catch(() => vivant && setAttente({ attente: false }))
    return () => {
      vivant = false
    }
  }, [])

  async function creer(evenement: React.FormEvent) {
    evenement.preventDefault()
    setOccupe(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/auth/google/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, locale }),
      })
      const donnees = (await reponse.json().catch(() => ({}))) as {
        error?: string
        suggestion?: string | null
        user?: { username: string; avatar: string | null }
      }
      if (!reponse.ok || !donnees.user) {
        if (reponse.status === 410) setAttente({ attente: false })
        setErreur(donnees.error ?? t('auth.errors.generic'))
        if (donnees.suggestion) setPseudo(donnees.suggestion)
        return
      }
      await rafraichirIdentite()
      toast.success(t('auth.welcome', { pseudo: donnees.user.username }))
      setBienvenue({ pseudo: donnees.user.username, avatar: donnees.user.avatar })
    } catch {
      setErreur(t('auth.accountsUnreachable'))
    } finally {
      setOccupe(false)
    }
  }

  if (bienvenue) {
    return (
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-md place-items-center px-4 py-10">
        <div className="w-full">
          <BienvenueCompte
            pseudo={bienvenue.pseudo}
            avatar={bienvenue.avatar}
            onTermine={() => {
              router.push('/')
              router.refresh()
            }}
            onTest={() => {
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
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('auth.google.chooseTitle')}
          </h1>
          {attente?.attente && (
            <p className="mt-1.5 text-sm text-muted">
              {attente.nom && <>{t('auth.google.chooseHello', { nom: attente.nom })} </>}
              {t('auth.google.chooseBlurb')}
            </p>
          )}
        </div>

        <Card glow className="p-6">
          {attente === null ? null : attente.attente ? (
            <form onSubmit={(evenement) => void creer(evenement)} className="space-y-4">
              <Input
                label={t('auth.username')}
                name="username"
                value={pseudo}
                onChange={(evenement) => setPseudo(evenement.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                minLength={3}
                maxLength={20}
                hint={t('auth.usernameHintLong')}
                error={erreur ?? undefined}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={occupe}
                icon={occupe ? undefined : <ArrowRight size={16} />}
              >
                {t('auth.google.chooseSubmit')}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted">{erreur ?? t('auth.google.chooseExpired')}</p>
              <BoutonGoogle libelle={t('auth.google.chooseRestart')} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
