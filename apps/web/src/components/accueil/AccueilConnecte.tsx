'use client'

/**
 * L'accueil de quelqu'un qui a un compte : « Ton chemin ».
 *
 * L'accueil public vend le produit. Celui-ci répond à une seule question :
 * **où j'en suis, et qu'est-ce que je fais maintenant ?** — et il y répond en
 * un seul fil, de haut en bas.
 *
 * ── Ce qui n'allait pas ───────────────────────────────────────────────────
 *
 * La version précédente était un tableau de bord en grille : la journée sur
 * huit colonnes, le parcours sur quatre, puis les dernières parties et les
 * analyses. Trois niveaux de lecture se disputaient le premier regard, deux
 * boutons pleins s'affichaient dès qu'une partie attendait, et aucune échelle
 * de niveau ne disait « tu es ici » : le rang de carrière était une pastille,
 * le palier n'apparaissait pas.
 *
 * ── Le fil retenu ─────────────────────────────────────────────────────────
 *
 *  0. Ce qui a quelqu'un à l'autre bout (une demande d'ami, ton tour dans une
 *     partie) — seulement quand il y en a, en lignes sobres ;
 *  1. « Bonjour, pseudo », et dessous le **rang de carrière** avec ses points
 *     et la barre jusqu'au rang suivant ;
 *  2. **Ton palier** : la seule échelle de niveau de la page (voir
 *     `CartePalier`) ;
 *  3. **Prochaine étape** : le chapitre de carrière en cours et le seul bouton
 *     plein de la page, « Continuer » (voir `ProchaineEtape`) ;
 *  4. la **série** et le **défi du jour**, côte à côte ;
 *  5. deux liens au plus.
 *
 * Sur bureau, le fil se coupe en deux colonnes : le chemin à gauche, la
 * journée à droite, avec la position du défi.
 *
 * Rien n'est inventé : toutes les données viennent d'API et de fonctions qui
 * existaient déjà.
 */

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Award, ChevronRight, Flame, Gauge, Map, Sun, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { rangPour, type Progression } from '@coupparfait/core'
import { Board2D } from '@/components/board/Board2D.tsx'
import { Skeleton } from '@/components/ui/index.tsx'
import { avecElements, useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import { useCarriere } from '@/lib/carriere/useCarriere.ts'
import { chargerPartieEnCours, type PartieEnCours } from '@/lib/game/partieEnCours.ts'
import { QUETES_HORS_DEFI, XP_TOTAL, quetePar } from '@/lib/daily/quetes.ts'
import { jourLocal, queteFaite } from '@/lib/daily/quotidien.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { DemandesDAmi } from '@/components/social/DemandesDAmi.tsx'
import { CartePalier } from './CartePalier.tsx'
import { Maintenant } from './Maintenant.tsx'
import { ProchaineEtape } from './ProchaineEtape.tsx'
import { prochainesChoses, type EtatAccueil } from './prochainesChoses.ts'

/** Une partie contre quelqu'un, encore ouverte dans la mémoire du serveur temps réel. */
interface PartieEnDirect {
  slug: string
  color: 'w' | 'b'
  status: string
  opponent: string | null
  opponentConnected: boolean
  moves: number
  yourTurn: boolean
  timeControl: { initial: number; increment: number }
  rated: boolean
}

/**
 * On lit `/api/parties/terminee` et non le profil public.
 *
 * Le profil rend `moveCount` mais jamais les coups : il sait dire qu'une partie
 * a eu lieu, pas la rouvrir. La route privée rend le PGN, ce qui change la
 * nature du lien — on passe d'un constat à une porte.
 */
interface PartieJouee {
  slug: string
  camp: 'w' | 'b'
  adversaire: string | null
  issue: 'gagnee' | 'perdue' | 'nulle'
  result: string | null
  pgn: string
}

/** L'ancre visée par le panneau de la série, dans la barre du haut. */
const ANCRE_JOURNEE = 'aujourdhui'

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
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Rechargement complet : ce qu'on vient de déposer dans `sessionStorage` doit être lu au montage de l'écran d'analyse, qui peut déjà être monté et n'y reviendrait pas.
  window.location.assign('/analyse')
}

export function AccueilConnecte({ pseudo }: { pseudo: string }) {
  const t = useT()
  const progression = useCarriere()
  const { etat: journee, xp } = useQuotidien()

  const [reprise, setReprise] = useState<PartieEnCours | null | undefined>(undefined)
  const [enDirect, setEnDirect] = useState<PartieEnDirect[] | null>(null)
  const [derniere, setDerniere] = useState<PartieJouee | null | undefined>(undefined)
  const [correspondances, setCorrespondances] = useState<number | null>(null)
  const [positionDuJour, setPositionDuJour] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true

    void chargerPartieEnCours().then((p) => vivant && setReprise(p))

    void fetch('/api/parties/miennes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: PartieEnDirect[] }) => vivant && setEnDirect(d.games ?? []))
      .catch(() => vivant && setEnDirect([]))

    // Une seule : elle sert au lien « revoir ta dernière partie ». La liste
    // complète est au profil, dont c'est le métier.
    void fetch('/api/parties/terminee?limite=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { parties: [] }))
      .then((d: { parties?: PartieJouee[] }) => vivant && setDerniere(d.parties?.[0] ?? null))
      .catch(() => vivant && setDerniere(null))

    void fetch('/api/correspondance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: Array<{ yourTurn: boolean }> }) => {
        if (vivant) setCorrespondances((d.games ?? []).filter((g) => g.yourTurn).length)
      })
      .catch(() => vivant && setCorrespondances(0))

    // La position du défi, montrée sur bureau à côté de la carte du défi.
    void fetch(`/api/defi-du-jour?jour=${jourLocal()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { puzzle?: { fen?: string } } | null) => {
        if (vivant) setPositionDuJour(d?.puzzle?.fen ?? null)
      })
      .catch(() => undefined)

    return () => {
      vivant = false
    }
  }, [pseudo])

  const defiFait = journee ? queteFaite(journee, 'defi') : null

  const chargement = reprise === undefined || enDirect === null || correspondances === null

  // Seules les urgences passent par `prochainesChoses` ici : la journée et la
  // carrière ont chacune leur carte, et les reprendre en tête ferait doublon.
  const urgentes = useMemo(() => {
    const etat: EtatAccueil = {
      enDirect: enDirect ?? [],
      correspondances: correspondances ?? 0,
      reprise: reprise ? { moves: reprise.moves.length } : null,
      defiFait: null,
      quetes: { restantes: [], xp: 0, total: XP_TOTAL },
      carriere: null,
    }
    return prochainesChoses(etat, t).filter((chose) =>
      ['tonTour', 'correspondance', 'partieOuverte', 'repriseOrdinateur'].includes(chose.id),
    )
  }, [enDirect, correspondances, reprise, t])

  // La première quête qui reste, hors défi : le premier des deux liens.
  const queteSuivante = journee
    ? (QUETES_HORS_DEFI.find((quete) => !queteFaite(journee, quete.id)) ?? null)
    : null

  const liens: Array<{
    cle: string
    libelle: string
    icone: LucideIcon
    teinte: string
    href?: string
    onClick?: () => void
  }> = []
  if (queteSuivante) {
    liens.push({
      cle: 'quete',
      libelle: t(queteSuivante.label),
      icone: Sun,
      teinte: 'var(--rub-entrainer)',
      href: queteSuivante.lien,
    })
  } else {
    liens.push({
      cle: 'carte',
      libelle: t('homeIn.seeTheMap'),
      icone: Map,
      teinte: 'var(--rub-jouer)',
      href: '/carriere',
    })
  }
  if (derniere) {
    liens.push({
      cle: 'derniere',
      libelle: derniere.adversaire
        ? t('chemin.reviewLastGameAgainst', { adversaire: derniere.adversaire })
        : t('chemin.reviewLastGame'),
      icone: Gauge,
      teinte: 'var(--rub-analyser)',
      onClick: () => analyser(derniere),
    })
  } else if (derniere === null) {
    liens.push({
      cle: 'analyser',
      libelle: t('homeIn.analyseAGame'),
      icone: Gauge,
      teinte: 'var(--rub-analyser)',
      href: '/analyse',
    })
  }

  const lienDuDefi = quetePar('defi')?.lien ?? '/puzzles?defi=1'
  const auTrait = positionDuJour?.split(' ')[1] === 'b' ? 'b' : 'w'

  return (
    <div className="entree mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 lg:py-9">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-7">
        {/* ── Le chemin ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-5">
          <header className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <h1 className="titre-affiche text-[1.65rem] lg:text-[2.5rem]">
              {avecElements(t('homeIn.hello'), { pseudo: <span>{pseudo}</span> })}
            </h1>
            {progression === undefined ? (
              <Skeleton className="h-5 w-56" />
            ) : progression ? (
              <RangDeCarriere progression={progression} />
            ) : null}
          </header>

          {/* Quelqu'un demande à te connaître : rien ne s'affiche sans demande. */}
          <DemandesDAmi />

          {/* Rien tant qu'on ne sait pas : un squelette qui s'efface aussitôt
              chez tous ceux que rien n'attend ferait sauter la page. */}
          {!chargement && urgentes.length > 0 && (
            <Maintenant choses={urgentes} chargement={false} />
          )}

          <CartePalier />
          <ProchaineEtape progression={progression} />
        </div>

        {/* ── La journée ────────────────────────────────────────────── */}
        {/* `scroll-mt-20` : l'en-tête est collant, et sans cette marge la
            journée s'arrêterait juste dessous quand la flamme y renvoie. */}
        <aside
          id={ANCRE_JOURNEE}
          className="flex scroll-mt-20 flex-col gap-3.5 lg:gap-4 lg:pt-[68px]"
        >
          <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
            <div className="glass flex flex-col gap-1.5 p-3.5 lg:col-span-2 lg:p-4">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-faint">
                <Flame size={15} className="shrink-0 text-[var(--rub-entrainer)]" aria-hidden />
                {t('chemin.streak')}
              </span>
              {journee === null ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  <span className="font-display text-[1.4rem] font-bold leading-tight">
                    {t(journee.serie > 1 ? 'chemin.days' : 'chemin.daysOne', {
                      n: journee.serie,
                    })}
                  </span>
                  {journee.meilleureSerie > journee.serie && (
                    <span className="text-[12px] text-faint">
                      {t('streak.record', { n: journee.meilleureSerie })}
                    </span>
                  )}
                </>
              )}
            </div>
            {/* Le défi à droite de la série sur téléphone, en petit ; en tête
                de colonne sur bureau, en grand, avec sa position. Une fois
                relevé, la carte ne mène plus nulle part : rejouer la position
                ne rapporte rien. */}
            <CarteDuDefi
              href={defiFait ? null : lienDuDefi}
              className="glass flex flex-col gap-1.5 p-3.5 lg:order-first lg:col-span-2 lg:gap-3 lg:p-5"
            >
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-faint lg:text-[15px] lg:text-ink">
                <Zap size={15} className="shrink-0 text-[var(--rub-entrainer)]" aria-hidden />
                {t('chemin.daily')}
              </span>
              {defiFait === null ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <span className="font-display text-[1.4rem] font-bold leading-tight lg:hidden">
                  {t(defiFait ? 'chemin.dailyDone' : 'chemin.dailyTodo')}
                </span>
              )}
              {!defiFait && positionDuJour && (
                <span className="mx-auto hidden w-[240px] lg:block">
                  <span className="block overflow-hidden rounded-[10px]">
                    <Board2D
                      fen={positionDuJour}
                      orientation={auTrait}
                      playable={null}
                      allowAnnotations={false}
                    />
                  </span>
                  <span className="mt-1.5 block text-center text-[12px] text-faint">
                    {t(auTrait === 'w' ? 'puzzles.whiteToPlay' : 'puzzles.blackToPlay')}
                  </span>
                </span>
              )}
              <span className="text-[12px] font-semibold text-[var(--accent-text)] lg:text-[14px]">
                {defiFait
                  ? t('chemin.dailyDoneHint', { xp, total: XP_TOTAL })
                  : t('chemin.dailyTodoHint')}
              </span>
            </CarteDuDefi>
          </div>

          {liens.length > 0 && (
            <nav
              aria-label={t('chemin.alsoForYou')}
              className="glass flex flex-col overflow-hidden"
            >
              {liens.map(({ cle, libelle, icone: Icone, teinte, href, onClick }) => {
                const contenu = (
                  <>
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
                      style={{
                        background: `color-mix(in oklab, ${teinte} 16%, transparent)`,
                        color: teinte,
                      }}
                      aria-hidden
                    >
                      <Icone size={17} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{libelle}</span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-faint rtl:-scale-x-100"
                      aria-hidden
                    />
                  </>
                )
                const classes =
                  'flex min-h-14 w-full items-center gap-3 border-b border-line/60 px-3.5 text-start transition-colors last:border-0 hover:bg-surface-hover'
                return href ? (
                  <Link key={cle} href={href} className={classes}>
                    {contenu}
                  </Link>
                ) : (
                  <button key={cle} type="button" onClick={onClick} className={classes}>
                    {contenu}
                  </button>
                )
              })}
            </nav>
          )}
        </aside>
      </div>
    </div>
  )
}

/**
 * Le rang de carrière et ses points, sous le bonjour.
 *
 * C'est la seule mesure de progression qu'on montre en tête — une décision
 * prise avec la refonte : les points récompensent ce qu'on a fait, et le rang
 * suivant dit ce qui reste à faire. La barre compte l'avancement dans le rang
 * courant, pas depuis zéro.
 */
function RangDeCarriere({ progression }: { progression: Progression }) {
  const t = useT()
  const etat = rangPour(progression.xp)
  const nom = tCoeur(t, etat.rang.nom)

  return (
    <Link
      href="/carriere"
      aria-label={t('chemin.rankAria', { rang: nom, xp: progression.xp })}
      className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-muted lg:glass lg:px-3.5 lg:py-2 lg:text-[14px] lg:text-ink"
    >
      <Award size={14} className="shrink-0 text-[var(--accent-text)]" aria-hidden />
      {t('chemin.rankPoints', { rang: nom, xp: progression.xp })}
      <span
        className="block h-1 w-14 overflow-hidden rounded-full bg-surface-strong lg:h-[5px] lg:w-28"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${etat.fraction * 100}%` }}
        />
      </span>
      <span className="font-medium text-faint lg:text-[12px]">
        {etat.suivant
          ? t('chemin.nextRankAt', {
              rang: tCoeur(t, etat.suivant.nom),
              seuil: etat.suivant.seuil,
            })
          : t('chemin.topRank')}
      </span>
    </Link>
  )
}

/** Un lien tant que le défi attend, un simple bloc une fois qu'il est relevé. */
function CarteDuDefi({
  href,
  className,
  children,
}: {
  href: string | null
  className: string
  children: ReactNode
}) {
  if (!href) return <div className={className}>{children}</div>
  return (
    <Link href={href} className={`${className} transition-colors hover:bg-surface-hover`}>
      {children}
    </Link>
  )
}
