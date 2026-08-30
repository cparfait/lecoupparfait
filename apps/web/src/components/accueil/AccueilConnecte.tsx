'use client'

/**
 * L'accueil de quelqu'un qui a un compte.
 *
 * La page d'accueil publique vend le produit : « les échecs, enfin expliqués »,
 * ce que le compte apporte, les chiffres du catalogue. C'est ce qu'il faut dire
 * à un visiteur, et c'est exactement ce dont quelqu'un qui revient n'a rien à
 * faire — il a déjà choisi, il vient jouer.
 *
 * Cet écran répond donc à une autre question : **où j'en suis, et que faire
 * maintenant ?** D'où l'ordre, qui est celui de l'urgence et non celui du
 * catalogue :
 *
 *  1. ce qui **attend** — une partie en plan, une correspondance où c'est ton
 *     tour ; ce sont des obligations, elles passent avant les propositions ;
 *  2. ta **carrière**, qui est le chemin qu'on a choisi de suivre ;
 *  3. le **défi du jour**, qui expire à minuit ;
 *  4. ce qu'on a **fait** — parties et analyses, pour y revenir.
 *
 * Rien n'est inventé ici : tout vient d'API qui existaient déjà et qui étaient
 * jusqu'à présent dispersées sur quatre écrans.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock,
  Gauge,
  Mailbox,
  Play,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'
import clsx from 'clsx'
import {
  CHAPITRES,
  CARRIERE_TERMINEE,
  chapitre as chapitreNumero,
  prochaineEtape,
  rangPour,
} from '@coupparfait/core'
import { Button, ButtonLink, Card, Chip, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { useCarriere } from '@/lib/carriere/useCarriere.ts'
import { listerAnalyses, type AnalyseEnregistree } from '@/lib/analysis/enregistrees.ts'
import { chargerPartieEnCours, depuis, type PartieEnCours } from '@/lib/game/partieEnCours.ts'
import { DefiDuJour } from '@/components/daily/DefiDuJour.tsx'

/**
 * On lit `/api/parties/terminee` et non le profil public.
 *
 * Le profil rend `moveCount` mais jamais les coups : il sait dire qu'une partie
 * a eu lieu, pas la rouvrir. La route privée rend le PGN, ce qui change la
 * nature de la liste — on passe d'un constat à une porte.
 */
interface PartieJouee {
  slug: string
  camp: 'w' | 'b'
  adversaire: string | null
  issue: 'gagnee' | 'perdue' | 'nulle'
  result: string | null
  opening: string | null
  coups: number
  jouee: string
  pgn: string
}

const TEINTE: Record<PartieJouee['issue'], string> = {
  gagnee: 'var(--q-best)',
  perdue: 'var(--q-blunder)',
  nulle: 'var(--q-forced)',
}

const ISSUE: Record<PartieJouee['issue'], string> = {
  gagnee: 'Gagnée',
  perdue: 'Perdue',
  nulle: 'Nulle',
}

/** Dépose la partie où l'écran d'analyse va la chercher, puis y va. */
function analyser(partie: PartieJouee): void {
  try {
    sessionStorage.setItem('coupparfait.pendingAnalysis', partie.pgn)
    sessionStorage.setItem('coupparfait.pendingAnalysisSide', partie.camp)
    if (partie.result) sessionStorage.setItem('coupparfait.pendingAnalysisResult', partie.result)
  } catch {
    // Stockage refusé : l'écran d'analyse s'ouvrira vide, et la liste des
    // parties y est de toute façon proposée.
  }
  window.location.assign('/analyse')
}

export function AccueilConnecte({ pseudo }: { pseudo: string }) {
  const progression = useCarriere()

  const [reprise, setReprise] = useState<PartieEnCours | null | undefined>(undefined)
  const [parties, setParties] = useState<PartieJouee[] | null>(null)
  const [analyses, setAnalyses] = useState<AnalyseEnregistree[] | null>(null)
  const [aToiDeJouer, setAToiDeJouer] = useState(0)

  useEffect(() => {
    let vivant = true

    void chargerPartieEnCours().then((p) => vivant && setReprise(p))

    void fetch('/api/parties/terminee?limite=5', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { parties: [] }))
      .then((d: { parties?: PartieJouee[] }) => vivant && setParties(d.parties ?? []))
      .catch(() => vivant && setParties([]))

    void listerAnalyses().then((l) => vivant && setAnalyses(l.slice(0, 3)))

    // Les correspondances où c'est ton tour : la seule chose de cet écran qui
    // soit une obligation envers quelqu'un d'autre.
    void fetch('/api/correspondance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: Array<{ yourTurn: boolean }> }) => {
        if (vivant) setAToiDeJouer((d.games ?? []).filter((g) => g.yourTurn).length)
      })
      .catch(() => undefined)

    return () => {
      vivant = false
    }
  }, [pseudo])

  const chapitre = progression ? chapitreNumero(progression.chapter) : null
  const suite = chapitre && progression ? prochaineEtape(chapitre, progression) : null
  const rang = progression ? rangPour(progression.xp) : null

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bonjour {pseudo}
        </h1>
        {rang && (
          <Chip tone="accent">
            <span aria-hidden>{rang.rang.emoji}</span> {rang.rang.nom} · {progression?.xp} points
          </Chip>
        )}
      </header>

      {/* ── Ce qui attend ────────────────────────────────────────── */}
      {(reprise || aToiDeJouer > 0) && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {reprise && (
            <Card className="border-accent/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                Partie en plan
              </p>
              <p className="mt-1 text-sm font-medium">
                Contre l’ordinateur, {reprise.moves.length} demi-coups joués
              </p>
              <p className="text-[12px] text-faint">{depuis(reprise.enregistreLe)}</p>
              <ButtonLink
                href="/jouer/ordinateur"
                variant="primary"
                size="sm"
                className="mt-3"
              >
                Reprendre
              </ButtonLink>
            </Card>
          )}

          {aToiDeJouer > 0 && (
            <Card className="border-accent/50 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <Mailbox size={12} aria-hidden />
                Correspondance
              </p>
              <p className="mt-1 text-sm font-medium">
                {aToiDeJouer} partie{aToiDeJouer > 1 ? 's' : ''} où c’est à toi de jouer
              </p>
              <p className="text-[12px] text-faint">Quelqu’un attend ton coup.</p>
              <ButtonLink href="/correspondance" variant="primary" size="sm" className="mt-3">
                Y aller
              </ButtonLink>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* ── La carrière ──────────────────────────────────────── */}
          {progression === undefined ? (
            <Skeleton className="h-32 w-full" />
          ) : progression && progression.chapter < CARRIERE_TERMINEE && chapitre ? (
            <Card className="overflow-hidden">
              <div className="h-1" style={{ background: chapitre.teinte }} aria-hidden />
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  Ta carrière · chapitre {chapitre.numero} sur {CHAPITRES.length}
                </p>
                <p className="mt-0.5 font-display text-lg font-bold leading-tight">
                  {chapitre.titre}
                </p>
                <p className="mt-1 text-[13px] text-muted">{chapitre.objectif}</p>
                <Link href={suite?.lien ?? '/carriere'} className="mt-3 block">
                  <Button variant="primary" fullWidth icon={<Sparkles size={15} />}>
                    {suite?.libelle ?? 'Voir la carte'}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="font-display text-lg font-bold leading-tight">
                {progression && progression.chapter >= CARRIERE_TERMINEE
                  ? 'Carrière terminée 👑'
                  : 'Commence ta carrière'}
              </p>
              <p className="mt-1 text-[13px] text-muted">
                Douze chapitres, du premier coup à la première victoire nette.
              </p>
              <ButtonLink href="/carriere" variant="primary" size="sm" className="mt-3">
                {progression && progression.chapter >= CARRIERE_TERMINEE
                  ? 'Revoir le parcours'
                  : 'Commencer'}
              </ButtonLink>
            </Card>
          )}

          {/* ── Tes dernières parties ────────────────────────────── */}
          <Card className="overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-line/60 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Tes dernières parties
              </p>
              <Link
                href={`/profil/${encodeURIComponent(pseudo)}`}
                className="text-[11px] text-accent hover:underline"
              >
                tout voir
              </Link>
            </div>

            {parties === null ? (
              <div className="p-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : parties.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-[13px] text-muted">Aucune partie enregistrée.</p>
                <ButtonLink href="/jouer/ordinateur" variant="secondary" size="sm" className="mt-3">
                  Jouer une partie
                </ButtonLink>
              </div>
            ) : (
              <ul>
                {parties.map((partie) => (
                  <li key={partie.slug} className="border-b border-line/40 last:border-0">
                    {/* Cliquable en entier, et vers l'analyse : c'est la seule
                        chose qu'on puisse vouloir faire d'une partie finie. */}
                    <button
                      type="button"
                      onClick={() => analyser(partie)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span
                        className="w-1 shrink-0 self-stretch rounded-full"
                        style={{ background: TEINTE[partie.issue] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          contre{' '}
                          <strong className="font-semibold">
                            {partie.adversaire ?? 'un adversaire'}
                          </strong>
                        </span>
                        <span className="block truncate text-[11px] text-faint">
                          {ISSUE[partie.issue]} · {partie.opening ?? 'ouverture non répertoriée'} ·{' '}
                          {partie.coups} demi-coups
                        </span>
                      </span>
                      <Gauge size={14} className="shrink-0 text-faint" aria-label="Analyser" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Colonne latérale ───────────────────────────────────── */}
        <div className="space-y-4">
          <DefiDuJour />

          {/* Les analyses conservées ne s'affichent que s'il y en a : une carte
              vide de plus sur un écran qui en compte déjà cinq n'apprend rien. */}
          {analyses && analyses.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-baseline justify-between border-b border-line/60 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  Tes analyses
                </p>
                <Link href="/analyse" className="text-[11px] text-accent hover:underline">
                  tout voir
                </Link>
              </div>
              <ul>
                {analyses.map((analyse) => (
                  <li
                    key={analyse.id}
                    className="border-b border-line/40 px-4 py-2 last:border-0 text-[13px]"
                  >
                    <span className="block truncate">
                      {analyse.whiteName ?? 'Blancs'} — {analyse.blackName ?? 'Noirs'}
                    </span>
                    <span className="block truncate text-[11px] text-faint">
                      {analyse.opening ?? 'sans ouverture répertoriée'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ── Les portes ────────────────────────────────────────── */}
          <Card className="p-3">
            <SectionTitle>Aller jouer</SectionTitle>
            <div className="space-y-1">
              {[
                { href: '/jouer/ordinateur', icon: Play, label: 'Contre l’ordinateur' },
                { href: '/jouer/ami', icon: Swords, label: 'Contre quelqu’un' },
                { href: '/tournois/ordinateur', icon: Trophy, label: 'Un tournoi solo' },
                { href: '/puzzles', icon: Clock, label: 'Des puzzles' },
                { href: '/analyse', icon: Gauge, label: 'Analyser une partie' },
              ].map((porte) => (
                <Link
                  key={porte.href}
                  href={porte.href}
                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition-colors hover:bg-surface-hover"
                >
                  <porte.icon size={15} className="shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{porte.label}</span>
                  <ArrowRight size={13} className="shrink-0 text-faint" aria-hidden />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
