'use client'

/**
 * Les comptes.
 *
 * **Chaque acte lourd demande une confirmation écrite.** Désactiver se défait,
 * anonymiser ne se défait pas — la seconde exige donc de taper le pseudo. Ce
 * n'est pas une formalité : c'est la seule barrière entre une liste de comptes
 * et un clic de trop.
 *
 * **Les filtres nomment des questions, pas des colonnes.** « Sans adresse
 * confirmée » plutôt que « email_verified_at is null » : ce qu'on cherche
 * devant cette liste, c'est qui ne pourra pas récupérer son mot de passe, pas
 * l'état d'un champ.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Search,
  ShieldCheck,
  ShieldOff,
  UserX,
} from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Chip, EmptyState, Input, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { nombre } from './graphiques.tsx'

interface Compte {
  id: string
  username: string
  email: string | null
  emailVerifie: boolean
  role: string
  disabled: boolean
  avatar: string | null
  pays: string | null
  parties: number
  classement: number | null
  /** Appareils dont la session est encore valide. Voir `enLigne`. */
  sessions: number
  /** Vu battre depuis moins de cinq minutes — la présence, la vraie. */
  enLigne: boolean
  inscrit: string
  vu: string
}

/*
  Les six tamis et les trois tris, par clé de dictionnaire.

  Deux constantes de module, donc sans accès à `t()` : leurs intitulés restaient
  en français quelle que soit la langue choisie. Ils sont résolus au rendu, là où
  les boutons et les options du menu sont fabriqués.
*/
const FILTRES = [
  { cle: 'tous', texteKey: 'admin.filterAll' },
  { cle: 'enLigne', texteKey: 'admin.filterOnline' },
  { cle: 'admins', texteKey: 'admin.filterAdmins' },
  { cle: 'desactives', texteKey: 'admin.filterDisabled' },
  { cle: 'inactifs', texteKey: 'admin.filterNeverPlayed' },
  { cle: 'sansAdresse', texteKey: 'admin.filterNoAddress' },
] as const satisfies ReadonlyArray<{ cle: string; texteKey: TranslationKey }>

const TRIS = [
  { cle: 'vu', texteKey: 'admin.sortLastSeen' },
  { cle: 'inscrit', texteKey: 'admin.sortSignup' },
  { cle: 'pseudo', texteKey: 'admin.sortUsername' },
] as const satisfies ReadonlyArray<{ cle: string; texteKey: TranslationKey }>

export function Comptes() {
  const t = useT()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<string>('tous')
  const [tri, setTri] = useState<string>('vu')
  const [sens, setSens] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  const [comptes, setComptes] = useState<Compte[] | null>(null)
  const [total, setTotal] = useState(0)
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [parPage, setParPage] = useState(25)
  const [moi, setMoi] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setComptes(null)
    const parametres = new URLSearchParams({ q: recherche, filtre, tri, sens, page: String(page) })
    try {
      const reponse = await fetch(`/api/admin/comptes?${parametres}`, { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      const donnees = await reponse.json()
      setComptes(donnees.comptes)
      setTotal(donnees.total)
      setTotalGeneral(donnees.totalGeneral)
      setParPage(donnees.parPage)
      setMoi(donnees.moi)
    } catch {
      toast.error(t('admin.readFailed'), t('admin.tryAgain'))
      setComptes([])
    }
  }, [recherche, filtre, tri, sens, page, t])

  useEffect(() => {
    // Recherche différée : taper « cparfait » lancerait sinon huit requêtes.
    const minuteur = setTimeout(() => void charger(), 300)
    return () => clearTimeout(minuteur)
  }, [charger])

  // Changer de filtre en étant page 3 rendrait une page vide, sans que rien ne
  // dise pourquoi. Toute modification du tamis ramène donc au début.
  const changerTamis = (appliquer: () => void) => {
    setPage(0)
    appliquer()
  }

  const agir = useCallback(
    async (compte: Compte, action: string, extra?: Record<string, unknown>) => {
      setOccupe(compte.id)
      try {
        const reponse = await fetch('/api/admin/comptes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, id: compte.id, ...extra }),
        })
        const donnees = await reponse.json().catch(() => ({}))
        if (!reponse.ok) {
          toast.error(donnees.error ?? t('admin.actionImpossible'))
          return
        }
        toast.success(t('admin.done'), t('admin.loggedInJournal'))
        await charger()
      } catch {
        toast.error(t('admin.serverDown'))
      } finally {
        setOccupe(null)
      }
    },
    [charger, t],
  )

  const dernierePage = Math.max(0, Math.ceil(total / parPage) - 1)

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label={t('admin.search')}
            value={recherche}
            onChange={(event) => changerTamis(() => setRecherche(event.target.value))}
            placeholder={t('admin.searchPlaceholder')}
          />
        </div>
        <Button variant="secondary" icon={<Search size={15} />} onClick={() => void charger()}>
          {t('admin.reload')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTRES.map((element) => (
          <button
            key={element.cle}
            type="button"
            aria-pressed={filtre === element.cle}
            onClick={() => changerTamis(() => setFiltre(element.cle))}
            className={clsx(
              'rounded-full px-2.5 py-1 text-[12px]',
              filtre === element.cle
                ? 'bg-[var(--accent)] font-medium text-[var(--accent-contrast)]'
                : 'border border-line text-muted hover:bg-[var(--surface-hover)]',
            )}
          >
            {t(element.texteKey)}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1 text-[12px] text-faint">
          {t('admin.sortBy')}
          <select
            value={tri}
            onChange={(event) => changerTamis(() => setTri(event.target.value))}
            className="rounded border border-line bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-ink"
          >
            {TRIS.map((element) => (
              <option key={element.cle} value={element.cle}>
                {t(element.texteKey)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            icon={<ArrowDownUp size={13} />}
            title={t(sens === 'desc' ? 'admin.descending' : 'admin.ascending')}
            onClick={() => changerTamis(() => setSens(sens === 'desc' ? 'asc' : 'desc'))}
          >
            {sens === 'desc' ? '↓' : '↑'}
          </Button>
        </span>
      </div>

      {comptes === null ? (
        <Skeleton className="h-64 w-full" />
      ) : comptes.length === 0 ? (
        <EmptyState title={t('admin.noAccount')} description={t('admin.noResultForFilter')} />
      ) : (
        <>
          <p className="text-[12px] text-faint">
            {t(total > 1 ? 'admin.accountsKept' : 'admin.accountKept', { n: nombre(total) })}
            {total !== totalGeneral && ` ${t('admin.outOfTotal', { n: nombre(totalGeneral) })}`}
          </p>

          <div className="space-y-2">
            {comptes.map((compte) => (
              <LigneCompte
                key={compte.id}
                compte={compte}
                estMoi={compte.username === moi}
                occupe={occupe === compte.id}
                onAgir={agir}
              />
            ))}
          </div>

          {dernierePage > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                icon={<ChevronLeft size={14} />}
                onClick={() => setPage(page - 1)}
              >
                {t('admin.previous')}
              </Button>
              <span className="text-[12px] tabular-nums text-faint">
                {t('admin.pageOf', { page: page + 1, total: dernierePage + 1 })}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= dernierePage}
                icon={<ChevronRight size={14} />}
                onClick={() => setPage(page + 1)}
              >
                {t('admin.nextOnes')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * « Vu le 12/03 » ne suffit plus depuis que la date dit quelque chose.
 *
 * Tant que `last_seen_at` n'était écrit qu'à la connexion, la date du jour
 * était l'information la plus fine qui eût du sens. Le battement la rend
 * vivante : l'heure devient lisible pour la journée en cours, qui est celle
 * qu'on regarde quand on se demande si quelqu'un vient de partir.
 */
function derniereVisite(compte: Compte, t: ReturnType<typeof useT>, bcp47: string): string {
  if (compte.enLigne) return t('admin.onlineNow')

  const vu = new Date(compte.vu)
  const memeJour = vu.toDateString() === new Date().toDateString()
  return memeJour
    ? t('admin.seenAt', {
        heure: vu.toLocaleTimeString(bcp47, { hour: '2-digit', minute: '2-digit' }),
      })
    : t('admin.seenOn', { date: vu.toLocaleDateString(bcp47) })
}

function LigneCompte({
  compte,
  estMoi,
  occupe,
  onAgir,
}: {
  compte: Compte
  estMoi: boolean
  occupe: boolean
  onAgir: (compte: Compte, action: string, extra?: Record<string, unknown>) => void
}) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const [confirmation, setConfirmation] = useState('')
  const [ouvert, setOuvert] = useState<'anonymiser' | 'motDePasse' | null>(null)
  const [motDePasse, setMotDePasse] = useState('')

  return (
    <Card className={clsx('p-3', compte.disabled && 'opacity-60')}>
      <div className="flex flex-wrap items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-base">
          {compte.avatar?.startsWith('http') ? '♟️' : (compte.avatar ?? '♟️')}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {compte.username}
            {compte.role === 'admin' && <Chip tone="accent">{t('admin.admin')}</Chip>}
            {compte.disabled && <Chip tone="danger">{t('admin.disabled')}</Chip>}
            {estMoi && <Chip>{t('admin.you')}</Chip>}
            {/*
              « En ligne » se lit sur le dernier battement du navigateur, pas
              sur l'existence d'une session : celle-ci dure trente jours, et
              une application installée sur l'écran d'accueil ne se déconnecte
              jamais — la pastille était allumée pour tout le monde, tout le
              temps, et ne voulait plus rien dire.
            */}
            {compte.enLigne && !compte.disabled && <Chip tone="success">{t('admin.online')}</Chip>}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-faint">
            {[
              compte.email
                ? `${compte.email} (${t(
                    compte.emailVerifie ? 'admin.confirmed' : 'admin.unconfirmed',
                  )})`
                : t('admin.noAddress'),
              t(compte.parties > 1 ? 'admin.gamesCount' : 'admin.gameCount', {
                n: compte.parties,
              }),
              compte.classement == null ? null : t('admin.bestRating', { n: compte.classement }),
              t('admin.signedUpOn', { date: new Date(compte.inscrit).toLocaleDateString(bcp47) }),
              derniereVisite(compte, t, bcp47),
              // Le nombre d'appareils encore ouverts : c'est ce qu'une
              // désactivation va fermer, et la seule question à laquelle le
              // compte des sessions sache vraiment répondre.
              compte.sessions > 0
                ? t(compte.sessions > 1 ? 'admin.devicesOpen' : 'admin.deviceOpen', {
                    n: compte.sessions,
                  })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {!estMoi && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={occupe}
                icon={compte.disabled ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                onClick={() => onAgir(compte, compte.disabled ? 'reactiver' : 'desactiver')}
              >
                {t(compte.disabled ? 'admin.reactivate' : 'admin.deactivate')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={occupe}
                onClick={() =>
                  onAgir(compte, compte.role === 'admin' ? 'retrograder' : 'promouvoir')
                }
              >
                {t(compte.role === 'admin' ? 'admin.demote' : 'admin.promote')}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={occupe}
            icon={<KeyRound size={14} />}
            onClick={() => setOuvert(ouvert === 'motDePasse' ? null : 'motDePasse')}
          >
            {t('admin.password')}
          </Button>
          {!estMoi && (
            <Button
              size="sm"
              variant="ghost"
              disabled={occupe}
              icon={<UserX size={14} />}
              onClick={() => setOuvert(ouvert === 'anonymiser' ? null : 'anonymiser')}
            >
              {t('admin.anonymise')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Redonner l'accès ─────────────────────────────────────── */}
      {ouvert === 'motDePasse' && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="text-[12px] leading-relaxed text-muted">{t('admin.passwordBlurb')}</p>
          <div className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                placeholder={t('admin.passwordPlaceholder')}
                autoComplete="off"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              disabled={occupe || motDePasse.length < 8}
              onClick={() => {
                onAgir(compte, 'motDePasse', { motDePasse })
                setMotDePasse('')
                setOuvert(null)
              }}
            >
              {t('admin.apply')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Anonymiser ───────────────────────────────────────────── */}
      {ouvert === 'anonymiser' && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--q-blunder)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>{t('admin.anonymiseWarning')}</span>
          </p>
          <div className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={t('admin.anonymisePlaceholder', { pseudo: compte.username })}
                autoComplete="off"
              />
            </div>
            <Button
              size="sm"
              variant="danger"
              disabled={occupe || confirmation !== compte.username}
              onClick={() => {
                onAgir(compte, 'anonymiser')
                setConfirmation('')
                setOuvert(null)
              }}
            >
              {t('admin.anonymise')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
