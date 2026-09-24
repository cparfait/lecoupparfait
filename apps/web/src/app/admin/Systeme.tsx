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
import { useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
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
    /** Comptes vus battre depuis moins de cinq minutes. */
    enLigne: number | null
    octets: number | null
    octetsTables: number | null
  }
  moteur: { joignable: boolean; detail: unknown }
  courriel: { configure: boolean; expediteur: string | null }
  administration: { parEnvironnement: boolean; pseudosPrivilegies: string[] }
}

/*
  Les purges d'entretien, avec ce qu'elles retirent dit en toutes lettres.

  Constante de module, donc sans `t()` : les trois intitulés et les trois phrases
  restaient en français dans les quarante autres langues. Ils portent des clés,
  résolues au rendu de chaque ligne.
*/
const PURGES = [
  {
    action: 'sessions',
    titreKey: 'admin.purgeSessions',
    detailKey: 'admin.purgeSessionsHint',
  },
  {
    action: 'evaluations',
    titreKey: 'admin.purgeEvaluations',
    detailKey: 'admin.purgeEvaluationsHint',
  },
  {
    action: 'vide',
    titreKey: 'admin.purgeEmpty',
    detailKey: 'admin.purgeEmptyHint',
  },
] as const satisfies ReadonlyArray<{
  action: string
  titreKey: TranslationKey
  detailKey: TranslationKey
}>

export function Systeme() {
  const t = useT()
  const [sante, setSante] = useState<Sante | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/admin/sante', { cache: 'no-store' })
      if (reponse.ok) setSante(await reponse.json())
    } catch {
      toast.error(t('admin.readFailed'))
    }
  }, [t])

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
          toast.error(donnees.error ?? t('admin.purgeImpossible'))
          return
        }
        toast.success(t('admin.linesRemoved', { n: donnees.retirees }), donnees.quoi)
        await charger()
      } catch {
        toast.error(t('admin.serverDown'))
      } finally {
        setOccupe(null)
      }
    },
    [charger, t],
  )

  if (!sante) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Mesure
          titre={t('admin.accounts')}
          valeur={sante.base.comptes}
          note={t('admin.thisWeek', { n: sante.base.inscritsCetteSemaine ?? 0 })}
        />
        <Mesure
          titre={t('admin.games')}
          valeur={sante.base.parties}
          note={t('admin.sinceYesterday', { n: sante.base.parties24h ?? 0 })}
        />
        {/* Trois échelles de la même question, de la plus vraie à la plus
            large : qui est là maintenant, qui est passé aujourd'hui, et
            combien de cookies restent valides. La dernière ne dit rien de la
            fréquentation — une session dure trente jours — mais dit combien
            d'accès une désactivation refermerait. */}
        <Mesure
          titre={t('admin.onlineMeasure')}
          valeur={sante.base.enLigne}
          note={t('admin.onlineNote', {
            vus: sante.base.vus24h ?? 0,
            sessions: sante.base.sessionsActives ?? 0,
          })}
        />
        <Mesure
          titre={t('admin.analysesKept')}
          valeur={sante.base.analysesConservees}
          note={t('admin.puzzlesInStock', { n: nombre(sante.base.puzzles ?? 0) })}
        />
      </div>

      <Card className="p-4">
        <SectionTitle>{t('admin.services')}</SectionTitle>
        <div className="space-y-2">
          <Etat
            icone={<Database size={15} />}
            titre={t('admin.database')}
            ok={sante.base.joignable}
            detail={detailBase(sante, t)}
          />
          <Etat
            icone={<Gauge size={15} />}
            titre={t('admin.analysisEngine')}
            ok={sante.moteur.joignable}
            detail={t(sante.moteur.joignable ? 'admin.engineAnswers' : 'admin.engineDown')}
          />
          <Etat
            icone={<Mail size={15} />}
            titre={t('admin.outgoingMail')}
            ok={sante.courriel.configure}
            detail={
              sante.courriel.configure
                ? (sante.courriel.expediteur ?? t('admin.senderUnset'))
                : t('admin.mailUnset')
            }
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t('admin.housekeepingHint')}>{t('admin.housekeeping')}</SectionTitle>
        <div className="space-y-2">
          {PURGES.map((purge) => (
            <div
              key={purge.action}
              className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{t(purge.titreKey)}</span>
                <span className="block text-[12px] leading-snug text-faint">
                  {t(purge.detailKey)}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                loading={occupe === purge.action}
                icon={<Eraser size={14} />}
                onClick={() => void purger(purge.action)}
              >
                {t('admin.purge')}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle>{t('admin.adminAccess')}</SectionTitle>
        {/* Le nom de la variable d'environnement reste en clair dans la phrase :
            c'est un identifiant, pas un mot, et le traduire enverrait chercher
            une variable qui n'existe pas. */}
        <p className="text-[14px] leading-relaxed text-muted">
          <code className="text-ink">ADMIN_USERNAMES</code>{' '}
          {sante.administration.pseudosPrivilegies.length > 0
            ? t('admin.adminNamesSet', {
                pseudos: sante.administration.pseudosPrivilegies.join(', '),
              })
            : t('admin.adminNamesUnset')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          icon={<RefreshCw size={14} />}
          onClick={() => void charger()}
        >
          {t('admin.rereadState')}
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
function detailBase(sante: Sante, t: ReturnType<typeof useT>): string {
  const { octets, octetsTables } = sante.base
  if (octets == null) return t('admin.sizeUnknown')

  const go = (valeur: number) => t('admin.gigabytes', { n: (valeur / 1024 ** 3).toFixed(2) })
  if (octetsTables == null) return t('admin.sizeTotal', { taille: go(octets) })

  const partTables = Math.round((octetsTables / octets) * 100)
  return t('admin.sizeWithTables', {
    taille: go(octets),
    tables: go(octetsTables),
    part: partTables,
  })
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
  const t = useT()
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
        <span className="block text-[14px] font-medium">{titre}</span>
        <span className="block truncate text-[12px] text-faint">{detail}</span>
      </span>
      <Chip tone={ok ? 'success' : 'danger'}>{t(ok ? 'admin.ok' : 'admin.missing')}</Chip>
    </div>
  )
}
