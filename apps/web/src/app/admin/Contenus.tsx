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
  const [contenus, setContenus] = useState<Contenus | null>(null)

  const charger = useCallback(async () => {
    setContenus(null)
    try {
      const reponse = await fetch('/api/admin/contenus', { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      setContenus(await reponse.json())
    } catch {
      toast.error('Lecture impossible.')
      setContenus({ parties: [], analyses: [] })
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const supprimer = useCallback(
    async (parametre: string) => {
      try {
        const reponse = await fetch(`/api/admin/contenus?${parametre}`, { method: 'DELETE' })
        const donnees = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(donnees.error ?? 'Suppression impossible.')
          return
        }
        toast.success('Supprimé.', 'L’acte est consigné dans le journal.')
        await charger()
      } catch {
        toast.error('Le serveur est injoignable.')
      }
    },
    [charger],
  )

  if (contenus === null) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle hint="Une partie classée ne peut pas être effacée : elle a bougé le classement de son adversaire.">
          Dernières parties
        </SectionTitle>
        {contenus.parties.length === 0 ? (
          <EmptyState title="Aucune partie" />
        ) : (
          <div className="space-y-1.5">
            {contenus.parties.map((partie) => (
              <Card key={partie.slug} className="flex items-center gap-2 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {partie.blancs ?? 'Blancs'} — {partie.noirs ?? 'Noirs'}{' '}
                    <span className="text-faint">{partie.result ?? '*'}</span>
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {[
                      partie.mode,
                      partie.rated ? 'classée' : 'amicale',
                      partie.opening,
                      `${partie.coups} demi-coups`,
                      new Date(partie.jouee).toLocaleDateString('fr-FR'),
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
                  title="Ouvrir la partie dans un autre onglet"
                  icon={<ExternalLink size={13} />}
                  onClick={() => window.open(`/jouer/partie/${partie.slug}`, '_blank', 'noopener')}
                >
                  {''}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={partie.rated}
                  title={
                    partie.rated ? 'Partie classée : non supprimable' : 'Supprimer cette partie'
                  }
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
        <SectionTitle hint="Les analyses conservées par les joueurs. Supprimer n’efface pas la partie d’origine.">
          Dernières analyses
        </SectionTitle>
        {contenus.analyses.length === 0 ? (
          <EmptyState title="Aucune analyse conservée" />
        ) : (
          <div className="space-y-1.5">
            {contenus.analyses.map((analyse) => (
              <Card key={analyse.id} className="flex items-center gap-2 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {analyse.blancs ?? 'Blancs'} — {analyse.noirs ?? 'Noirs'}
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {[
                      analyse.proprietaire ? `à ${analyse.proprietaire}` : 'sans propriétaire',
                      analyse.opening,
                      new Date(analyse.creee).toLocaleDateString('fr-FR'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Supprimer cette analyse"
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
