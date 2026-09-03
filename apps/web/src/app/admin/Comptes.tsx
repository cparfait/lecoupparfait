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
  sessions: number
  inscrit: string
  vu: string
}

const FILTRES = [
  { cle: 'tous', texte: 'Tous' },
  { cle: 'admins', texte: 'Administrateurs' },
  { cle: 'desactives', texte: 'Désactivés' },
  { cle: 'inactifs', texte: 'Jamais joué' },
  { cle: 'sansAdresse', texte: 'Sans adresse confirmée' },
] as const

const TRIS = [
  { cle: 'vu', texte: 'dernière visite' },
  { cle: 'inscrit', texte: 'inscription' },
  { cle: 'pseudo', texte: 'pseudo' },
] as const

export function Comptes() {
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
      toast.error('Lecture impossible.', 'Réessaie dans un instant.')
      setComptes([])
    }
  }, [recherche, filtre, tri, sens, page])

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
          toast.error(donnees.error ?? 'Action impossible.')
          return
        }
        toast.success('C’est fait.', 'L’acte est consigné dans le journal.')
        await charger()
      } catch {
        toast.error('Le serveur est injoignable.')
      } finally {
        setOccupe(null)
      }
    },
    [charger],
  )

  const dernierePage = Math.max(0, Math.ceil(total / parPage) - 1)

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Chercher"
            value={recherche}
            onChange={(event) => changerTamis(() => setRecherche(event.target.value))}
            placeholder="pseudo ou adresse"
          />
        </div>
        <Button variant="secondary" icon={<Search size={15} />} onClick={() => void charger()}>
          Relire
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
              'rounded-full px-2.5 py-1 text-[11px]',
              filtre === element.cle
                ? 'bg-[var(--accent)] font-medium text-[var(--accent-contrast)]'
                : 'border border-line text-muted hover:bg-[var(--surface-hover)]',
            )}
          >
            {element.texte}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1 text-[11px] text-faint">
          trier par
          <select
            value={tri}
            onChange={(event) => changerTamis(() => setTri(event.target.value))}
            className="rounded border border-line bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-ink"
          >
            {TRIS.map((element) => (
              <option key={element.cle} value={element.cle}>
                {element.texte}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            icon={<ArrowDownUp size={13} />}
            title={sens === 'desc' ? 'Décroissant' : 'Croissant'}
            onClick={() => changerTamis(() => setSens(sens === 'desc' ? 'asc' : 'desc'))}
          >
            {sens === 'desc' ? '↓' : '↑'}
          </Button>
        </span>
      </div>

      {comptes === null ? (
        <Skeleton className="h-64 w-full" />
      ) : comptes.length === 0 ? (
        <EmptyState title="Aucun compte" description="Aucun résultat pour ce filtre." />
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-wide text-faint">
            {nombre(total)} compte{total > 1 ? 's' : ''} retenu{total > 1 ? 's' : ''}
            {total !== totalGeneral && ` sur ${nombre(totalGeneral)}`}
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
                Précédents
              </Button>
              <span className="text-[11px] tabular-nums text-faint">
                page {page + 1} sur {dernierePage + 1}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= dernierePage}
                icon={<ChevronRight size={14} />}
                onClick={() => setPage(page + 1)}
              >
                Suivants
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
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
            {compte.role === 'admin' && <Chip tone="accent">admin</Chip>}
            {compte.disabled && <Chip tone="danger">désactivé</Chip>}
            {estMoi && <Chip>toi</Chip>}
            {compte.sessions > 0 && !compte.disabled && <Chip tone="success">connecté</Chip>}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-faint">
            {[
              compte.email
                ? `${compte.email}${compte.emailVerifie ? ' (confirmée)' : ' (non confirmée)'}`
                : 'aucune adresse',
              `${compte.parties} partie${compte.parties > 1 ? 's' : ''}`,
              compte.classement == null ? null : `meilleur classement ${compte.classement}`,
              `inscrit le ${new Date(compte.inscrit).toLocaleDateString('fr-FR')}`,
              `vu le ${new Date(compte.vu).toLocaleDateString('fr-FR')}`,
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
                {compte.disabled ? 'Réactiver' : 'Désactiver'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={occupe}
                onClick={() =>
                  onAgir(compte, compte.role === 'admin' ? 'retrograder' : 'promouvoir')
                }
              >
                {compte.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
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
            Mot de passe
          </Button>
          {!estMoi && (
            <Button
              size="sm"
              variant="ghost"
              disabled={occupe}
              icon={<UserX size={14} />}
              onClick={() => setOuvert(ouvert === 'anonymiser' ? null : 'anonymiser')}
            >
              Anonymiser
            </Button>
          )}
        </div>
      </div>

      {/* ── Redonner l'accès ─────────────────────────────────────── */}
      {ouvert === 'motDePasse' && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="text-[12px] leading-relaxed text-muted">
            Choisis un mot de passe provisoire et transmets-le à la personne. Toutes ses sessions se
            ferment. C’est la porte de secours quand la messagerie n’est pas configurée.
          </p>
          <div className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                placeholder="8 caractères minimum"
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
              Appliquer
            </Button>
          </div>
        </div>
      )}

      {/* ── Anonymiser ───────────────────────────────────────────── */}
      {ouvert === 'anonymiser' && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--q-blunder)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Le pseudo, l’adresse et le mot de passe sont effacés sans retour possible. Les parties
              restent — elles appartiennent aussi aux adversaires, et les retirer creuserait des
              trous dans leur historique.
            </span>
          </p>
          <div className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={`écris « ${compte.username} » pour confirmer`}
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
              Anonymiser
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
