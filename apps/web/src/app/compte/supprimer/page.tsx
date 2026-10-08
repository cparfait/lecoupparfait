'use client'

/**
 * Supprimer son compte.
 *
 * Une page à part entière plutôt qu'une boîte de dialogue dans le profil : le
 * Play Store exige une **adresse web** où l'on peut demander la suppression,
 * qu'on puisse donner telle quelle dans la fiche de l'appli. Le profil y mène.
 *
 * Ce qui est effacé et ce qui reste est dit avant le bouton, pas après : on ne
 * découvre pas en partant que ses parties demeurent, même anonymes. Le geste
 * se confirme par le mot de passe et le pseudo retapé — voir `api/compte`.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Button, ButtonLink, Card, Input, TitreDePage } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useCompteGoogle, useEstAdmin, useIdentite } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function SupprimerComptePage() {
  const t = useT()
  const identite = useIdentite()
  const estAdmin = useEstAdmin()

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('suppressionCompte.intro')}>{t('suppressionCompte.title')}</TitreDePage>

      <div className="space-y-3 text-[15px] leading-relaxed text-muted">
        <p>{t('suppressionCompte.erased')}</p>
        <p>{t('suppressionCompte.kept')}</p>
      </div>

      <Card className="mt-6 p-5">
        {identite === undefined ? null : identite === null ? (
          <>
            <p className="text-sm leading-relaxed text-muted">{t('suppressionCompte.signedOut')}</p>
            <ButtonLink href="/connexion" variant="primary" className="mt-4">
              {t('nav.signIn')}
            </ButtonLink>
          </>
        ) : estAdmin ? (
          <p className="text-sm leading-relaxed text-muted">{t('suppressionCompte.admin')}</p>
        ) : (
          <Formulaire pseudo={identite.username} />
        )}
      </Card>
    </div>
  )
}

function Formulaire({ pseudo }: { pseudo: string }) {
  const t = useT()
  // Un compte créé par Google n'a jamais eu de mot de passe : on ne lui en
  // demande pas, la session et le pseudo retapé confirment.
  const sansMotDePasse = useCompteGoogle()?.sansMotDePasse ?? false
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  const confirme = confirmation.trim().toLowerCase() === pseudo.toLowerCase()

  async function supprimer(evenement: React.FormEvent) {
    evenement.preventDefault()
    if (!confirme || (!sansMotDePasse && !motDePasse)) return
    setOccupe(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/compte', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasse, pseudo: confirmation }),
      })
      if (!reponse.ok) {
        const donnees = (await reponse.json().catch(() => ({}))) as { error?: string }
        setErreur(donnees.error ?? t('api.deleteFailed'))
        return
      }
      toast.success(t('suppressionCompte.done'))
      // Rechargement complet et non `router.push` : l'identité, les préférences
      // et les caches du compte effacé ne doivent pas survivre dans la page.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- voir ci-dessus.
      window.location.assign('/')
    } catch {
      setErreur(t('api.deleteFailed'))
    } finally {
      setOccupe(false)
    }
  }

  return (
    <form onSubmit={(evenement) => void supprimer(evenement)} className="space-y-4">
      {sansMotDePasse ? (
        <p className="text-sm leading-relaxed text-muted">{t('auth.google.noPasswordDelete')}</p>
      ) : (
        <Input
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          label={t('suppressionCompte.password')}
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
        />
      )}
      <Input
        name="confirmation"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        label={t('suppressionCompte.confirmName', { pseudo })}
        value={confirmation}
        onChange={(evenement) => setConfirmation(evenement.target.value)}
        error={erreur ?? undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {sansMotDePasse ? (
          <span />
        ) : (
          <Link href="/mot-de-passe-oublie" className="text-sm text-accent hover:underline">
            {t('suppressionCompte.forgot')}
          </Link>
        )}
        <Button
          type="submit"
          variant="danger"
          icon={<Trash2 size={16} aria-hidden />}
          disabled={!confirme || (!sansMotDePasse && !motDePasse) || occupe}
          className="max-sm:w-full"
        >
          {t('suppressionCompte.button')}
        </Button>
      </div>
    </form>
  )
}
