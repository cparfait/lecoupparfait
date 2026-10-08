'use client'

/**
 * Le pseudo d'un nouveau compte créé avec Google.
 *
 * Google a confirmé qui l'on est ; il reste le seul choix qu'il ne peut pas
 * faire à notre place : le pseudo, qui s'affiche dans les parties et sert
 * d'adresse au profil. On en propose un d'après le nom du compte Google, qu'on
 * corrige plus volontiers qu'on ne l'invente.
 *
 * Si l'adresse Google est déjà celle d'un compte, la page propose d'abord de
 * le rejoindre : son mot de passe suffit (`api/auth/google/rattacher`). Ce
 * n'est qu'une proposition — « ce n'est pas mon compte » ramène au pseudo, et
 * le nouveau compte naît alors sans adresse, puisqu'elle est prise.
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

type Attente =
  | { attente: false }
  | { attente: true; nom: string | null; suggestion: string | null; rattacher: string | null }

export default function PseudoGooglePage() {
  const t = useT()
  const router = useRouter()
  const locale = usePreferences((state) => state.locale)
  const [attente, setAttente] = useState<Attente | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  /** Le compte à rejoindre est proposé d'abord ; on peut lui préférer un nouveau compte. */
  const [nouveau, setNouveau] = useState(false)
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

  async function rejoindre(evenement: React.FormEvent) {
    evenement.preventDefault()
    setOccupe(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/auth/google/rattacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasse }),
      })
      const donnees = (await reponse.json().catch(() => ({}))) as {
        error?: string
        pseudo?: string
      }
      if (!reponse.ok || !donnees.pseudo) {
        if (reponse.status === 410 || reponse.status === 409) setAttente({ attente: false })
        setErreur(donnees.error ?? t('auth.errors.generic'))
        return
      }
      await rafraichirIdentite()
      toast.success(t('auth.google.mergeDone', { pseudo: donnees.pseudo }))
      router.push('/')
      router.refresh()
    } catch {
      setErreur(t('auth.accountsUnreachable'))
    } finally {
      setOccupe(false)
    }
  }

  const rattacher = attente?.attente && !nouveau ? attente.rattacher : null

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
            {t(rattacher ? 'auth.google.mergeTitle' : 'auth.google.chooseTitle')}
          </h1>
          {attente?.attente && (
            <p className="mt-1.5 text-sm text-muted">
              {attente.nom && <>{t('auth.google.chooseHello', { nom: attente.nom })} </>}
              {rattacher
                ? t('auth.google.mergeBlurb', { pseudo: rattacher })
                : t('auth.google.chooseBlurb')}
            </p>
          )}
        </div>

        <Card glow className="p-6">
          {attente === null ? null : rattacher ? (
            <form onSubmit={(evenement) => void rejoindre(evenement)} className="space-y-4">
              {/* Pour le gestionnaire de mots de passe : à quel compte va celui-ci. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={rattacher}
                readOnly
                hidden
              />
              <Input
                label={t('auth.password')}
                name="password"
                type="password"
                value={motDePasse}
                onChange={(evenement) => setMotDePasse(evenement.target.value)}
                autoComplete="current-password"
                required
                autoFocus
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
                {t('auth.google.mergeSubmit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setErreur(null)
                  setNouveau(true)
                }}
              >
                {t('auth.google.mergeOther')}
              </Button>
            </form>
          ) : attente.attente ? (
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
