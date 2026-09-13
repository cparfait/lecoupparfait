'use client'

/**
 * Les contenus : les dernières parties et les dernières analyses conservées.
 *
 * C'est l'onglet où l'on va quand quelque chose est signalé. Il ne cherche donc
 * pas à tout montrer — il montre le récent, qui est ce qu'on vient vérifier.
 */

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'

interface Contenus {
  parties: Array<{
    slug: string
    mode: string
    rated: boolean
    blancs: string | null
    noirs: string | null
    result: string | null
    status: string
    opening: string | null
    coups: number
    jouee: string
  }>
  analyses: Array<{
    id: string
    blancs: string | null
    noirs: string | null
    opening: string | null
    proprietaire: string | null
    creee: string
  }>
}

export function Contenus() {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const [contenus, setContenus] = useState<Contenus | null>(null)

  const charger = useCallback(async () => {
    setContenus(null)
    try {
      const reponse = await fetch('/api/admin/contenus', { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      setContenus(await reponse.json())
    } catch {
      toast.error(t('admin.readFailed'))
      setContenus({ parties: [], analyses: [] })
    }
  }, [t])

  useEffect(() => {
    void charger()
  }, [charger])

  const supprimer = useCallback(
    async (parametre: string) => {
      try {
        const reponse = await fetch(`/api/admin/contenus?${parametre}`, { method: 'DELETE' })
        const donnees = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(donnees.error ?? t('admin.deleteImpossible'))
          return
        }
        toast.success(t('admin.deleted'), t('admin.loggedInJournal'))
        await charger()
      } catch {
        toast.error(t('admin.serverDown'))
      }
    },
    [charger, t],
  )

  if (contenus === null) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle hint={t('admin.recentGamesHint')}>{t('admin.recentGames')}</SectionTitle>
        {contenus.parties.length === 0 ? (
          <EmptyState title={t('admin.noGame')} />
        ) : (
          <div className="space-y-1.5">
            {contenus.parties.map((partie) => (
              <Card key={partie.slug} className="flex items-center gap-2 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">
                    {partie.blancs ?? t('admin.white')} — {partie.noirs ?? t('admin.black')}{' '}
                    <span className="text-faint">{partie.result ?? '*'}</span>
                  </span>
                  <span className="block truncate text-[12px] text-faint">
                    {[
                      partie.mode,
                      t(partie.rated ? 'admin.rated' : 'admin.casual'),
                      partie.opening,
                      t('admin.halfMoves', { n: partie.coups }),
                      new Date(partie.jouee).toLocaleDateString(bcp47),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {/* Voir avant de supprimer : la seule façon de juger une partie
                    signalée est de l'ouvrir, et retaper l'adresse à la main
                    invite à supprimer sans regarder. */}
                <Button
                  size="sm"
                  variant="ghost"
                  title={t('admin.openGameInNewTab')}
                  icon={<ExternalLink size={13} />}
                  onClick={() => window.open(`/jouer/partie/${partie.slug}`, '_blank', 'noopener')}
                >
                  {''}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={partie.rated}
                  title={t(partie.rated ? 'admin.ratedNotDeletable' : 'admin.deleteGame')}
                  icon={<Trash2 size={13} />}
                  onClick={() => void supprimer(`partie=${encodeURIComponent(partie.slug)}`)}
                >
                  {''}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle hint={t('admin.recentAnalysesHint')}>
          {t('admin.recentAnalyses')}
        </SectionTitle>
        {contenus.analyses.length === 0 ? (
          <EmptyState title={t('admin.noAnalysisKept')} />
        ) : (
          <div className="space-y-1.5">
            {contenus.analyses.map((analyse) => (
              <Card key={analyse.id} className="flex items-center gap-2 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">
                    {analyse.blancs ?? t('admin.white')} — {analyse.noirs ?? t('admin.black')}
                  </span>
                  <span className="block truncate text-[12px] text-faint">
                    {[
                      analyse.proprietaire
                        ? t('admin.belongsTo', { pseudo: analyse.proprietaire })
                        : t('admin.noOwner'),
                      analyse.opening,
                      new Date(analyse.creee).toLocaleDateString(bcp47),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  title={t('admin.deleteAnalysis')}
                  icon={<Trash2 size={13} />}
                  onClick={() => void supprimer(`analyse=${encodeURIComponent(analyse.id)}`)}
                >
                  {''}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
