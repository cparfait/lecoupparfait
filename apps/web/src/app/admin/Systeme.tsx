'use client'

/**
 * Le système.
 *
 * On l'ouvre une fois par mois, ou quand ça va mal. Il répond donc à deux
 * questions et pas une de plus : **est-ce que tout répond**, et **est-ce que ça
 * grossit plus vite que le disque**. Les purges sont juste en dessous, parce
 * que c'est la seule chose qu'on ait envie de faire après avoir lu la réponse.
 */

import { useCallback, useEffect, useState } from 'react'
import { Database, Eraser, Gauge, Mail, RefreshCw } from 'lucide-react'
import { Button, Card, Chip, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { Mesure, nombre } from './graphiques.tsx'

interface Sante {
  base: {
    joignable: boolean
    comptes: number | null
    parties: number | null
    analysesConservees: number | null
    puzzles: number | null
    sessionsActives: number | null
    inscritsCetteSemaine: number | null
    vus24h: number | null
    parties24h: number | null
    octets: number | null
    octetsTables: number | null
  }
  moteur: { joignable: boolean; detail: unknown }
  courriel: { configure: boolean; expediteur: string | null }
  administration: { parEnvironnement: boolean; pseudosPrivilegies: string[] }
}

/** Les purges d'entretien, avec ce qu'elles retirent dit en toutes lettres. */
const PURGES = [
  {
    action: 'sessions',
    titre: 'Sessions expirées',
    detail: 'Des lignes que plus personne ne relit. Sans effet visible.',
  },
  {
    action: 'evaluations',
    titre: 'Évaluations trop peu profondes',
    detail:
      'Sous 14 demi-coups : l’analyse en demande 18, ces entrées occupent de la place sans jamais éviter un calcul. Le moteur refera le travail si besoin.',
  },
  {
    action: 'vide',
    titre: 'Comptes vides et inactifs',
    detail:
      'Aucune partie, aucune analyse, pas revus depuis six mois. Les administrateurs sont épargnés.',
  },
] as const

export function Systeme() {
  const [sante, setSante] = useState<Sante | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/admin/sante', { cache: 'no-store' })
      if (reponse.ok) setSante(await reponse.json())
    } catch {
      toast.error('Lecture impossible.')
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const purger = useCallback(
    async (action: string) => {
      setOccupe(action)
      try {
        const reponse = await fetch('/api/admin/contenus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const donnees = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(donnees.error ?? 'Purge impossible.')
          return
        }
        toast.success(`${donnees.retirees} ligne(s) retirée(s)`, donnees.quoi)
        await charger()
      } catch {
        toast.error('Le serveur est injoignable.')
      } finally {
        setOccupe(null)
      }
    },
    [charger],
  )

  if (!sante) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Mesure
          titre="Comptes"
          valeur={sante.base.comptes}
          note={`+${sante.base.inscritsCetteSemaine ?? 0} cette semaine`}
        />
        <Mesure
          titre="Parties"
          valeur={sante.base.parties}
          note={`+${sante.base.parties24h ?? 0} depuis hier`}
        />
        <Mesure
          titre="Vus depuis 24 h"
          valeur={sante.base.vus24h}
          note={`${sante.base.sessionsActives ?? 0} sessions ouvertes`}
        />
        <Mesure
          titre="Analyses conservées"
          valeur={sante.base.analysesConservees}
          note={`${nombre(sante.base.puzzles ?? 0)} puzzles en réserve`}
        />
      </div>

      <Card className="p-4">
        <SectionTitle>Services</SectionTitle>
        <div className="space-y-2">
          <Etat
            icone={<Database size={15} />}
            titre="Base de données"
            ok={sante.base.joignable}
            detail={detailBase(sante)}
          />
          <Etat
            icone={<Gauge size={15} />}
            titre="Moteur d’analyse"
            ok={sante.moteur.joignable}
            detail={
              sante.moteur.joignable
                ? 'répond au diagnostic'
                : 'injoignable — les analyses repassent par le navigateur'
            }
          />
          <Etat
            icone={<Mail size={15} />}
            titre="Messagerie sortante"
            ok={sante.courriel.configure}
            detail={
              sante.courriel.configure
                ? (sante.courriel.expediteur ?? 'expéditeur non précisé')
                : 'SMTP_URL absente — la récupération de mot de passe est masquée'
            }
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle hint="Aucune ne touche à une partie, un compte actif ou une analyse conservée.">
          Ménage
        </SectionTitle>
        <div className="space-y-2">
          {PURGES.map((purge) => (
            <div
              key={purge.action}
              className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{purge.titre}</span>
                <span className="block text-[11px] leading-snug text-faint">{purge.detail}</span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                loading={occupe === purge.action}
                icon={<Eraser size={14} />}
                onClick={() => void purger(purge.action)}
              >
                Purger
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle>Accès administrateur</SectionTitle>
        <p className="text-[13px] leading-relaxed text-muted">
          {sante.administration.pseudosPrivilegies.length > 0 ? (
            <>
              <code className="text-ink">ADMIN_USERNAMES</code> désigne{' '}
              <strong>{sante.administration.pseudosPrivilegies.join(', ')}</strong>. Ces comptes
              restent administrateurs quoi qu’il arrive en base — c’est ce qui empêche de s’enfermer
              dehors après une restauration de sauvegarde.
            </>
          ) : (
            <>
              <code className="text-ink">ADMIN_USERNAMES</code> n’est pas renseignée : tes droits
              viennent de la base seule. Si une restauration ramène un dump antérieur à ta
              promotion, plus personne ne pourra ouvrir cette page.
            </>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          icon={<RefreshCw size={14} />}
          onClick={() => void charger()}
        >
          Relire l’état
        </Button>
      </Card>
    </div>
  )
}

/**
 * Le poids de la base, et la part qu'en occupent les tables.
 *
 * L'écart entre les deux est ce qu'on veut voir : quand les tables ne pèsent
 * qu'une fraction du total, le reste est de l'espace mort qu'un `VACUUM FULL`
 * rendrait — l'information qui manque le jour où le disque se remplit.
 */
function detailBase(sante: Sante): string {
  const { octets, octetsTables } = sante.base
  if (octets == null) return 'taille inconnue'

  const go = (valeur: number) => `${(valeur / 1024 ** 3).toFixed(2)} Go`
  if (octetsTables == null) return `${go(octets)} au total`

  const partTables = Math.round((octetsTables / octets) * 100)
  return `${go(octets)} au total, dont ${go(octetsTables)} de tables (${partTables} %)`
}

function Etat({
  icone,
  titre,
  ok,
  detail,
}: {
  icone: React.ReactNode
  titre: string
  ok: boolean
  detail: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{
          background: ok
            ? 'color-mix(in oklab, var(--q-best) 15%, transparent)'
            : 'color-mix(in oklab, var(--q-blunder) 15%, transparent)',
          color: ok ? 'var(--q-best)' : 'var(--q-blunder)',
        }}
        aria-hidden
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{titre}</span>
        <span className="block truncate text-[11px] text-faint">{detail}</span>
      </span>
      <Chip tone={ok ? 'success' : 'danger'}>{ok ? 'ok' : 'absent'}</Chip>
    </div>
  )
}
