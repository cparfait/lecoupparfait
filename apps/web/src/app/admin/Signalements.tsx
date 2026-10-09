'use client'

/**
 * Les messages du tchat signalés par les joueurs, en tête de l'onglet
 * « Contenus ».
 *
 * Deux gestes, pas plus : marquer traité, ou désactiver le compte de l'auteur
 * — par la même action que l'onglet des comptes, donc avec le même journal.
 * Un invité n'a pas de compte : on ne peut que constater, et son empreinte de
 * navigateur permet au moins de compter combien de fois il a été signalé.
 */

import { useCallback, useEffect, useState } from 'react'
import { Ban, Check, Flag } from 'lucide-react'
import { Button, Card, EmptyState, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'

interface Signalement {
  id: string
  createdAt: string
  partie: string
  texte: string
  auteurNom: string
  auteurId: string | null
  auteurPseudo: string | null
  auteurDesactive: boolean
  visantLAuteur: number
}

export function Signalements() {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const [signalements, setSignalements] = useState<Signalement[] | null>(null)

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/admin/signalements', { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      setSignalements(((await reponse.json()) as { signalements: Signalement[] }).signalements)
    } catch {
      toast.error(t('admin.readFailed'))
      setSignalements([])
    }
  }, [t])

  useEffect(() => {
    void charger()
  }, [charger])

  const traiter = useCallback(
    async (id: string) => {
      try {
        const reponse = await fetch('/api/admin/signalements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        const donnees = (await reponse.json().catch(() => ({}))) as { error?: string }
        if (!reponse.ok) {
          toast.error(donnees.error ?? t('admin.serverDown'))
          return
        }
        toast.success(t('admin.reportHandledToast'))
        await charger()
      } catch {
        toast.error(t('admin.serverDown'))
      }
    },
    [charger, t],
  )

  const desactiver = useCallback(
    async (signalement: Signalement) => {
      if (!signalement.auteurId) return
      try {
        const reponse = await fetch('/api/admin/comptes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'desactiver', id: signalement.auteurId }),
        })
        const donnees = (await reponse.json().catch(() => ({}))) as { error?: string }
        if (!reponse.ok) {
          toast.error(donnees.error ?? t('admin.serverDown'))
          return
        }
        toast.success(t('admin.reportDeactivatedToast'), t('admin.loggedInJournal'))
        await traiter(signalement.id)
      } catch {
        toast.error(t('admin.serverDown'))
      }
    },
    [traiter, t],
  )

  return (
    <div>
      <SectionTitle hint={t('admin.reportsHint')}>
        <span className="flex items-center gap-2">
          <Flag size={15} className="text-accent" aria-hidden />
          {t('admin.reports')}
        </span>
      </SectionTitle>
      {signalements === null ? (
        <Skeleton className="h-24 w-full" />
      ) : signalements.length === 0 ? (
        <EmptyState title={t('admin.noReport')} />
      ) : (
        <div className="space-y-1.5">
          {signalements.map((signalement) => (
            <Card key={signalement.id} className="space-y-2 p-3">
              <p className="text-[12px] text-faint">
                {[
                  new Date(signalement.createdAt).toLocaleString(bcp47),
                  signalement.auteurId ? null : t('admin.reportGuest'),
                  signalement.auteurPseudo && signalement.auteurPseudo !== signalement.auteurNom
                    ? t('admin.reportNowNamed', { pseudo: signalement.auteurPseudo })
                    : null,
                  signalement.visantLAuteur > 1
                    ? t('admin.reportCount', { n: signalement.visantLAuteur })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="text-[14px]">
                <span className="font-semibold">{signalement.auteurNom} : </span>
                <span className="break-words">{signalement.texte}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Check size={14} aria-hidden />}
                  onClick={() => void traiter(signalement.id)}
                >
                  {t('admin.reportHandled')}
                </Button>
                {signalement.auteurId && !signalement.auteurDesactive && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Ban size={14} aria-hidden />}
                    onClick={() => void desactiver(signalement)}
                  >
                    {t('admin.reportDeactivate')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
