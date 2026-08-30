'use client'

/**
 * Administration.
 *
 * Trois onglets, dans l'ordre où l'on s'en sert : les **comptes** (c'est pour
 * eux qu'on vient), les **contenus** (on y va quand quelque chose est
 * signalé), le **système** (on le regarde une fois par mois, ou quand ça va
 * mal).
 *
 * **Elle n'existe pas pour qui n'y a pas droit.** Toutes les routes répondent
 * 404 plutôt que 403, et cette page se comporte pareil : sans droits, on voit
 * la page « introuvable » ordinaire. Distinguer « tu n'es pas administrateur »
 * de « cette page n'existe pas » apprendrait à un visiteur qu'il y a ici une
 * porte et un compte à trouver derrière.
 *
 * **Chaque acte lourd demande une confirmation écrite.** Désactiver se défait,
 * anonymiser ne se défait pas — la seconde exige donc de taper le pseudo. Ce
 * n'est pas une formalité : c'est la seule barrière entre une liste de comptes
 * et un clic de trop.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Database,
  Eraser,
  Gauge,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserX,
} from 'lucide-react'
import clsx from 'clsx'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  SectionTitle,
  SegmentedControl,
  Skeleton,
} from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

type Onglet = 'comptes' | 'contenus' | 'systeme'

interface Compte {
  id: string
  username: string
  email: string | null
  emailVerifie: boolean
  role: string
  disabled: boolean
  parties: number
  inscrit: string
  vu: string
}

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

export default function AdminPage() {
  const [onglet, setOnglet] = useState<Onglet>('comptes')
  /** `undefined` tant qu'on ne sait pas, `false` = pas administrateur. */
  const [autorise, setAutorise] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    void fetch('/api/admin/sante', { cache: 'no-store' })
      .then((reponse) => setAutorise(reponse.ok))
      .catch(() => setAutorise(false))
  }, [])

  if (autorise === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!autorise) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <EmptyState
          title="Cette page n’existe pas"
          description="Vérifie l’adresse, ou reviens à l’accueil."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Administration</h1>
      <p className="mt-1.5 text-sm text-muted">
        Ce que tu fais ici s’applique à de vraies personnes. Les actes irréversibles demandent
        d’écrire le pseudo.
      </p>

      <div className="mt-5">
        <SegmentedControl
          value={onglet}
          onChange={setOnglet}
          options={[
            { value: 'comptes', label: 'Comptes' },
            { value: 'contenus', label: 'Contenus' },
            { value: 'systeme', label: 'Système' },
          ]}
        />
      </div>

      <div className="mt-5">
        {onglet === 'comptes' && <OngletComptes />}
        {onglet === 'contenus' && <OngletContenus />}
        {onglet === 'systeme' && <OngletSysteme />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Comptes
// ─────────────────────────────────────────────────────────────────────────────

function OngletComptes() {
  const [recherche, setRecherche] = useState('')
  const [comptes, setComptes] = useState<Compte[] | null>(null)
  const [total, setTotal] = useState(0)
  const [moi, setMoi] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(async (q: string) => {
    setComptes(null)
    try {
      const reponse = await fetch(`/api/admin/comptes?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      })
      if (!reponse.ok) throw new Error()
      const donnees = await reponse.json()
      setComptes(donnees.comptes)
      setTotal(donnees.total)
      setMoi(donnees.moi)
    } catch {
      toast.error('Lecture impossible.', 'Réessaie dans un instant.')
      setComptes([])
    }
  }, [])

  useEffect(() => {
    // Recherche différée : taper « cparfait » lancerait sinon huit requêtes.
    const minuteur = setTimeout(() => void charger(recherche), 300)
    return () => clearTimeout(minuteur)
  }, [recherche, charger])

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
        toast.success('C’est fait.')
        await charger(recherche)
      } catch {
        toast.error('Le serveur est injoignable.')
      } finally {
        setOccupe(null)
      }
    },
    [charger, recherche],
  )

  return (
    <>
      <div className="mb-3 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Chercher"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="pseudo ou adresse"
          />
        </div>
        <Button
          variant="secondary"
          icon={<Search size={15} />}
          onClick={() => void charger(recherche)}
        >
          Relire
        </Button>
      </div>

      {comptes === null ? (
        <Skeleton className="h-64 w-full" />
      ) : comptes.length === 0 ? (
        <EmptyState title="Aucun compte" description="Aucun résultat pour cette recherche." />
      ) : (
        <>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-faint">
            {comptes.length} affiché{comptes.length > 1 ? 's' : ''} sur {total}
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
        </>
      )}
    </>
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
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {compte.username}
            {compte.role === 'admin' && <Chip tone="accent">admin</Chip>}
            {compte.disabled && <Chip tone="danger">désactivé</Chip>}
            {estMoi && <Chip>toi</Chip>}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-faint">
            {[
              compte.email
                ? `${compte.email}${compte.emailVerifie ? ' (confirmée)' : ' (non confirmée)'}`
                : 'aucune adresse',
              `${compte.parties} partie${compte.parties > 1 ? 's' : ''}`,
              `inscrit le ${new Date(compte.inscrit).toLocaleDateString('fr-FR')}`,
              `vu le ${new Date(compte.vu).toLocaleDateString('fr-FR')}`,
            ].join(' · ')}
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
                onClick={() => onAgir(compte, compte.role === 'admin' ? 'retrograder' : 'promouvoir')}
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
            Choisis un mot de passe provisoire et transmets-le à la personne. Toutes ses
            sessions se ferment. C’est la porte de secours quand la messagerie n’est pas
            configurée.
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
              Le pseudo, l’adresse et le mot de passe sont effacés sans retour possible. Les
              parties restent — elles appartiennent aussi aux adversaires, et les retirer
              creuserait des trous dans leur historique.
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

// ─────────────────────────────────────────────────────────────────────────────
//  Contenus
// ─────────────────────────────────────────────────────────────────────────────

function OngletContenus() {
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
        toast.success('Supprimé.')
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
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={partie.rated}
                  title={
                    partie.rated
                      ? 'Partie classée : non supprimable'
                      : 'Supprimer cette partie'
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

// ─────────────────────────────────────────────────────────────────────────────
//  Système
// ─────────────────────────────────────────────────────────────────────────────

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

function OngletSysteme() {
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
        <Mesure titre="Comptes" valeur={sante.base.comptes} note={`+${sante.base.inscritsCetteSemaine ?? 0} cette semaine`} />
        <Mesure titre="Parties" valeur={sante.base.parties} note={`+${sante.base.parties24h ?? 0} depuis hier`} />
        <Mesure titre="Vus depuis 24 h" valeur={sante.base.vus24h} note={`${sante.base.sessionsActives ?? 0} sessions ouvertes`} />
        <Mesure titre="Analyses conservées" valeur={sante.base.analysesConservees} note={`${(sante.base.puzzles ?? 0).toLocaleString('fr-FR')} puzzles`} />
      </div>

      <Card className="p-4">
        <SectionTitle>Services</SectionTitle>
        <div className="space-y-2">
          <Etat
            icone={<Database size={15} />}
            titre="Base de données"
            ok={sante.base.joignable}
            detail={
              sante.base.octets != null
                ? `${(sante.base.octets / 1024 ** 3).toFixed(2)} Go au total`
                : 'taille inconnue'
            }
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
              restent administrateurs quoi qu’il arrive en base — c’est ce qui empêche de
              s’enfermer dehors après une restauration de sauvegarde.
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

function Mesure({
  titre,
  valeur,
  note,
}: {
  titre: string
  valeur: number | null
  note: string
}) {
  return (
    <Card className="p-3">
      <p className="text-[11px] uppercase tracking-wide text-faint">{titre}</p>
      <p className="font-display text-2xl font-bold tabular-nums">
        {valeur == null ? '—' : valeur.toLocaleString('fr-FR')}
      </p>
      <p className="text-[11px] text-faint">{note}</p>
    </Card>
  )
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
