'use client'

/**
 * Les demandes d'ami en attente, là où on les voit.
 *
 * Elles n'existaient que dans le carnet — `/amis` — c'est-à-dire derrière une
 * entrée de menu qu'on ouvre quand on a déjà quelqu'un à ajouter. Personne ne
 * va vérifier un carnet d'adresses « au cas où » : les demandes y restaient
 * des semaines, et celui qui les avait envoyées en concluait qu'on ne voulait
 * pas de lui.
 *
 * Une demande d'ami est une personne qui attend une réponse. Sa place est donc
 * sur l'écran d'accueil, avec les deux réponses sous la main — et nulle part
 * quand il n'y en a aucune : ce composant ne rend rien tant que la liste est
 * vide, y compris pendant qu'il l'interroge, pour ne pas faire clignoter une
 * carte vide en tête de l'accueil.
 *
 * Le carnet garde les siennes : c'est la même liste, pas le même moment. Ici
 * on répond en passant, là-bas on gère son cercle.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, UserPlus, X } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { toast } from '@/components/ui/Toast.tsx'

interface Demandeur {
  id: string
  username: string
  avatar: string | null
  online: boolean
}

interface Demande {
  id: string
  user: Demandeur
}

/**
 * Rythme d'interrogation.
 *
 * Une minute, et non les quatre secondes du guetteur de défis : une demande
 * d'ami n'expire pas. Elle peut attendre le prochain tour sans que personne
 * ne s'en aperçoive.
 */
const POLL_MS = 60_000

export function DemandesDAmi({ className }: { className?: string }) {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [enCours, setEnCours] = useState<string | null>(null)

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch('/api/amis', { cache: 'no-store' })
      if (!reponse.ok) return
      const donnees: { incoming?: Demande[] } = await reponse.json()
      setDemandes(donnees.incoming ?? [])
    } catch {
      // Serveur injoignable : on garde ce qu'on avait, et on réessaie.
    }
  }, [])

  useEffect(() => {
    void relire()
    const minuteur = setInterval(() => void relire(), POLL_MS)
    return () => clearInterval(minuteur)
  }, [relire])

  const repondre = useCallback(
    async (demande: Demande, accepter: boolean) => {
      if (enCours) return
      setEnCours(demande.id)
      try {
        const reponse = await fetch('/api/amis', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'respond', id: demande.id, accept: accepter }),
        })
        const donnees = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(donnees.error ?? 'Action impossible.')
          return
        }
        // Retirée tout de suite : attendre le prochain tour d'interrogation
        // laisserait la ligne sous le doigt qui vient de répondre.
        setDemandes((liste) => liste.filter((entree) => entree.id !== demande.id))
        if (accepter) {
          toast.success(`${demande.user.username} est maintenant ton ami.`, 'Tu peux le défier.')
        }
      } finally {
        setEnCours(null)
      }
    },
    [enCours],
  )

  if (demandes.length === 0) return null

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="h-1 bg-accent" aria-hidden />
      <EnTeteDeCarte
        titre={demandes.length === 1 ? 'Une demande d’ami' : `${demandes.length} demandes d’ami`}
        icone={<UserPlus size={14} aria-hidden />}
        fin={
          <Link href="/amis" className="text-accent hover:underline">
            mon carnet
          </Link>
        }
      />

      <ul>
        {demandes.map((demande) => (
          <li
            key={demande.id}
            className="flex items-center gap-2.5 border-b border-line/40 px-4 py-2.5 last:border-0"
          >
            <span className="relative shrink-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-strong text-base">
                {demande.user.avatar ?? '♟️'}
              </span>
              <span
                className={clsx(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-elev)]',
                  demande.user.online ? 'bg-[var(--q-best)]' : 'bg-line',
                )}
                aria-label={demande.user.online ? 'En ligne' : 'Hors ligne'}
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {demande.user.username}
            </span>
            <Button
              size="sm"
              variant="primary"
              icon={<Check size={14} />}
              disabled={enCours === demande.id}
              onClick={() => void repondre(demande, true)}
            >
              Accepter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Refuser la demande de ${demande.user.username}`}
              disabled={enCours === demande.id}
              onClick={() => void repondre(demande, false)}
            >
              <X size={14} aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
