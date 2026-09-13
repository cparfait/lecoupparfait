'use client'

/**
 * L'accueil de quelqu'un qui a un compte.
 *
 * L'accueil public vend le produit — « les échecs, enfin expliqués », ce qu'un
 * compte apporte, les chiffres du catalogue. C'est ce qu'il faut dire à un
 * visiteur, et exactement ce dont quelqu'un qui revient n'a rien à faire : il a
 * déjà choisi, il vient jouer.
 *
 * Cet écran répond donc à une seule question : **qu'est-ce que je fais
 * maintenant ?**
 *
 * ── Ce qui n'allait pas, et qui a dicté cette forme ───────────────────────
 *
 * La version précédente posait la bonne intention en commentaire — « l'ordre de
 * l'urgence » — et ne la tenait pas à l'écran :
 *
 *  - **trois appels à l'action de même poids** : un bouton « Commencer la
 *    leçon », un « Jouer → » dans le défi, cinq liens « Aller jouer ». Trois
 *    invitations concurrentes, donc aucune ; le regard n'avait nulle part où se
 *    poser et la page se lisait comme un sommaire ;
 *  - **la carrière passait avant le défi**, alors qu'elle n'a aucune échéance et
 *    que le défi meurt à minuit ;
 *  - **une carte « défi du jour » qui faisait quatre choses**, dont les deux
 *    tiers de la hauteur pour les quêtes — qui ne sont pas le défi ;
 *  - **« Aller jouer » recopiait la barre de navigation.** Les cinq destinations
 *    sont déjà dans les menus du haut ; c'est le doublon qu'on a retiré ailleurs
 *    du menu déroulé et de la barre du pouce ;
 *  - **deux compteurs nommés « points »** — l'expérience de carrière et celle du
 *    jour — sur le même écran ;
 *  - **une colonne latérale presque vide** face à une colonne principale qui
 *    empilait tout.
 *
 * ── La forme retenue ──────────────────────────────────────────────────────
 *
 *  1. **Maintenant** — une seule chose à faire, calculée par urgence (voir
 *     `prochainesChoses`), avec le seul bouton primaire de la page. Ce qui
 *     attend aussi se range en dessous, une ligne chacun.
 *  2. **Aujourd'hui** et **Ton parcours**, côte à côte : où j'en suis dans la
 *     journée, où j'en suis dans le chemin long. Deux états, pas deux
 *     destinations.
 *  3. **Tes dernières parties** — ce qu'on a fait, et la porte vers l'analyse.
 *
 * Rien n'est inventé : toutes les données viennent d'API qui existaient déjà.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Flame, Gauge, History, Map, Sparkles } from 'lucide-react'
import {
  CHAPITRES,
  CARRIERE_TERMINEE,
  chapitre as chapitreNumero,
  etapesDe,
  prochaineEtape,
} from '@coupparfait/core'
import clsx from 'clsx'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'
import { Button, ButtonLink, Card, Chip, Skeleton } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { useCarriere } from '@/lib/carriere/useCarriere.ts'
import { listerAnalyses, type AnalyseEnregistree } from '@/lib/analysis/enregistrees.ts'
import { chargerPartieEnCours, type PartieEnCours } from '@/lib/game/partieEnCours.ts'
import { QUETES_HORS_DEFI, XP_TOTAL, xpPour } from '@/lib/daily/quetes.ts'
import { jourLocal, queteFaite } from '@/lib/daily/quotidien.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { DemandesDAmi } from '@/components/social/DemandesDAmi.tsx'
import { PointsCarriere } from '@/components/carriere/PointsCarriere.tsx'
import { Aujourdhui, type TrancheDefi } from './Aujourdhui.tsx'
import { Maintenant } from './Maintenant.tsx'
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

const ISSUE: Record<PartieJouee['issue'], TranslationKey> = {
  gagnee: 'homeIn.won',
  perdue: 'homeIn.lost',
  nulle: 'game.draw',
}

/**
 * Trois, et non cinq.
 *
 * La liste des parties jouées prenait autant de hauteur que tout ce qui est
 * actionnable sur la page. On en garde de quoi reconnaître sa dernière séance ;
 * « tout voir » mène au profil, dont c'est le métier.
 */
const PARTIES_MONTREES = 3

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
  const t = useT()
  const progression = useCarriere()
  const { etat: journee } = useQuotidien()

  const [reprise, setReprise] = useState<PartieEnCours | null | undefined>(undefined)
  const [enDirect, setEnDirect] = useState<PartieEnDirect[] | null>(null)
  const [parties, setParties] = useState<PartieJouee[] | null>(null)
  const [analyses, setAnalyses] = useState<AnalyseEnregistree[] | null>(null)
  const [correspondances, setCorrespondances] = useState<number | null>(null)
  const [defi, setDefi] = useState<{ tranche: TrancheDefi | null; niveau: number | null }>({
    tranche: null,
    niveau: null,
  })

  useEffect(() => {
    let vivant = true

    void chargerPartieEnCours().then((p) => vivant && setReprise(p))

    void fetch('/api/parties/miennes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: PartieEnDirect[] }) => vivant && setEnDirect(d.games ?? []))
      .catch(() => vivant && setEnDirect([]))

    void fetch(`/api/parties/terminee?limite=${PARTIES_MONTREES}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { parties: [] }))
      .then((d: { parties?: PartieJouee[] }) => vivant && setParties(d.parties ?? []))
      .catch(() => vivant && setParties([]))

    void listerAnalyses().then((l) => vivant && setAnalyses(l.slice(0, 3)))

    void fetch('/api/correspondance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: Array<{ yourTurn: boolean }> }) => {
        if (vivant) setCorrespondances((d.games ?? []).filter((g) => g.yourTurn).length)
      })
      .catch(() => vivant && setCorrespondances(0))

    // La tranche du jour et la cote du défi : ce qui reste à en dire une fois
    // qu'il est résolu, et les paliers au-dessus.
    void fetch(`/api/defi-du-jour?jour=${jourLocal()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tranche?: TrancheDefi; puzzle?: { rating: number } } | null) => {
        if (vivant) setDefi({ tranche: d?.tranche ?? null, niveau: d?.puzzle?.rating ?? null })
      })
      .catch(() => undefined)

    return () => {
      vivant = false
    }
  }, [pseudo])

  const chapitre = progression ? chapitreNumero(progression.chapter) : null
  const suite = chapitre && progression ? prochaineEtape(chapitre, progression) : null
  const carriereEnCours =
    progression != null && progression.chapter < CARRIERE_TERMINEE && chapitre != null
  const defiFait = journee ? queteFaite(journee, 'defi') : null

  /*
    On attend de savoir avant de proposer.

    Une proposition affichée puis remplacée une demi-seconde plus tard est pire
    qu'un instant d'attente : on commence à lire, et la phrase change sous les
    yeux. Les trois sources qui décident de l'ordre sont donc attendues.
  */
  const chargement =
    reprise === undefined ||
    enDirect === null ||
    correspondances === null ||
    defiFait === null ||
    progression === undefined

  const choses = useMemo(() => {
    const etat: EtatAccueil = {
      enDirect: enDirect ?? [],
      correspondances: correspondances ?? 0,
      reprise: reprise ? { moves: reprise.moves.length } : null,
      defiFait,
      quetes: {
        restantes: journee
          ? // Le défi a sa propre proposition, qui passe avant : voir
            // `prochainesChoses`. Le recompter ici en ferait deux.
            QUETES_HORS_DEFI.filter((quete) => !queteFaite(journee, quete.id)).map(
              ({ label, lien, action }) => ({ label, lien, action }),
            )
          : [],
        xp: journee ? xpPour(journee.avancement) : 0,
        total: XP_TOTAL,
      },
      carriere:
        carriereEnCours && chapitre
          ? {
              chapitre: chapitre.titre,
              numero: chapitre.numero,
              libelle: suite?.libelle ?? t('homeIn.seeTheMap'),
              lien: suite?.lien ?? '/carriere',
            }
          : null,
    }
    return prochainesChoses(etat)
  }, [enDirect, correspondances, reprise, defiFait, journee, carriereEnCours, chapitre, suite, t])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      {/* ── L'en-tête : qui je suis, où j'en suis ──────────────────────
          Les deux compteurs sont nommés. « 2560 points » seul, à côté d'un
          « 45 / 80 points » plus bas, laissait deviner un rapport entre les
          deux — il n'y en a aucun. */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bonjour {pseudo}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* La série ne s'affiche qu'à partir de `sm`.
              La flamme de la barre du haut porte le même chiffre, à trois
              centimètres au-dessus et sur toutes les tailles d'écran. Sur
              téléphone, où l'en-tête passe à la ligne, la pastille prenait une
              ligne entière pour répéter ce qu'on venait de lire. Au-delà, elle
              reste : elle nomme ce que la flamme ne fait que compter. */}
          {/* Le pliage est porté par une enveloppe, et non par une classe posée
              sur la pastille : `Chip` s'ouvre sur `inline-flex`, et deux
              utilitaires d'affichage sur le même élément se départagent dans
              l'ordre de la feuille de style, pas dans celui des classes. */}
          {journee != null && journee.serie > 0 && (
            <div className="hidden sm:block">
              <Chip tone="warning" title={t('homeIn.streakTitle')}>
                <Flame size={11} aria-hidden />
                {journee.serie} jour{journee.serie > 1 ? 's' : ''} d’affilée
              </Chip>
            </div>
          )}
          {/* Les points s'ouvrent : voir `PointsCarriere`. */}
          {progression && <PointsCarriere progression={progression} />}
        </div>
      </header>

      {/* ── 0. Quelqu'un demande à te connaître ────────────────────────
          Avant « Maintenant », et c'est le seul bloc qui a le droit de passer
          devant : une personne attend une réponse, et elle l'attendait
          jusqu'ici dans une page qu'on n'ouvre jamais sans raison. Rien ne
          s'affiche quand il n'y a aucune demande. */}
      <DemandesDAmi className="mb-4" />

      {/* ── 1. Maintenant ─────────────────────────────────────────────── */}
      <Maintenant choses={choses} chargement={chargement} />

      {/* ── 2. Les deux états : la journée, et le chemin ────────────────
          Côte à côte et de poids égal, parce qu'ils répondent à la même
          question à deux échelles — « où j'en suis ? ». Ils s'empilent sous
          `md`, la journée d'abord : c'est elle qui expire. */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Aujourdhui defiFait={defiFait === true} tranche={defi.tranche} niveauDefi={defi.niveau} />

        {progression === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : carriereEnCours && chapitre && progression ? (
          <Card className="overflow-hidden">
            {/* La teinte de « Jouer », dont la carrière fait partie — et non
                plus celle du chapitre : douze chapitres, douze couleurs, et
                l'accueil changeait de palette à chaque étape. */}
            <EnTeteDeCarte
              titre={t('homeIn.yourPath')}
              icone={<Map size={14} aria-hidden />}
              teinte="var(--rub-jouer)"
              fin={`chapitre ${chapitre.numero} / ${CHAPITRES.length}`}
            />
            <div className="p-4">
              <p className="font-display text-base font-bold leading-tight">{chapitre.titre}</p>
              <p className="mt-1 text-[12px] leading-snug text-muted">{chapitre.objectif}</p>

              {/* Les trois temps du chapitre, en une ligne chacun : c'est ce
                  qui manquait pour savoir combien il reste avant le suivant. */}
              <ul className="mt-3 space-y-1">
                {etapesDe(chapitre, progression).map((etape) => (
                  <li
                    key={etape.cle}
                    className={clsx(
                      'flex items-center gap-2 text-[12px]',
                      etape.termine ? 'text-faint line-through' : 'text-muted',
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-bold',
                        etape.termine
                          ? 'border-[var(--q-best)] bg-[var(--q-best)] text-white'
                          : 'border-line',
                      )}
                    >
                      {etape.termine ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{etape.titre}</span>
                    {etape.total > 1 && (
                      <span className="shrink-0 tabular-nums text-[12px] text-faint">
                        {etape.fait} / {etape.total}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Bouton secondaire, et c'est délibéré : si l'étape de carrière
                  est *la* chose à faire, elle est déjà en haut avec le bouton
                  primaire. Ici on ouvre la carte, on ne relance pas. */}
              <ButtonLink href="/carriere" variant="secondary" size="sm" fullWidth className="mt-3">
                {t('homeIn.seeTheMap')}
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="font-display text-base font-bold leading-tight">
              {t(
                progression && progression.chapter >= CARRIERE_TERMINEE
                  ? 'homeIn.careerDone'
                  : 'homeIn.startCareer',
              )}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted">{t('homeIn.careerBlurb')}</p>
            <ButtonLink href="/carriere" variant="secondary" size="sm" className="mt-3">
              {t(
                progression && progression.chapter >= CARRIERE_TERMINEE
                  ? 'homeIn.reviewPath'
                  : 'homeIn.start',
              )}
            </ButtonLink>
          </Card>
        )}
      </div>

      {/* ── 3. Ce qu'on a fait ─────────────────────────────────────────
          En bas, et c'est sa place : on ne rouvre pas l'application pour
          relire ce qu'on a joué hier. Mais les lignes mènent à l'analyse, et
          le disent maintenant — un chevron gris ne l'annonçait pas. */}
      {(parties === null || parties.length > 0 || (analyses?.length ?? 0) > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden">
            {/* La teinte d'« Analyse » : c'est là que mène chaque ligne. */}
            <EnTeteDeCarte
              titre={t('homeIn.lastGames')}
              icone={<History size={14} aria-hidden />}
              teinte="var(--rub-analyser)"
              fin={
                <Link
                  href={`/profil/${encodeURIComponent(pseudo)}`}
                  className="text-accent hover:underline"
                >
                  tout voir
                </Link>
              }
            />

            {parties === null ? (
              <div className="p-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : parties.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-[14px] text-muted">{t('homeIn.noGameSaved')}</p>
                <ButtonLink href="/jouer/ordinateur" variant="secondary" size="sm" className="mt-3">
                  {t('homeIn.playAGame')}
                </ButtonLink>
              </div>
            ) : (
              <ul>
                {parties.map((partie) => (
                  <li key={partie.slug} className="border-b border-line/40 last:border-0">
                    <button
                      type="button"
                      onClick={() => analyser(partie)}
                      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
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
                        <span className="block truncate text-[12px] text-faint">
                          {t(ISSUE[partie.issue])} · {partie.opening ?? t('homeIn.unlistedOpening')}{' '}
                          · {t('homeIn.halfMoves', { n: partie.coups })}
                        </span>
                      </span>
                      {/* Le mot, et pas seulement l'icône : rien ne disait que
                          cliquer une ligne ouvrait l'analyse. */}
                      <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-faint transition-colors group-hover:text-accent">
                        <Gauge size={13} aria-hidden />
                        Analyser
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {analyses && analyses.length > 0 ? (
            <Card className="overflow-hidden">
              <EnTeteDeCarte
                titre={t('homeIn.yourAnalyses')}
                icone={<Gauge size={14} aria-hidden />}
                fin={
                  <Link href="/analyse" className="text-accent hover:underline">
                    tout voir
                  </Link>
                }
              />
              <ul>
                {analyses.map((analyse) => (
                  <li
                    key={analyse.id}
                    className="border-b border-line/40 px-4 py-2 text-[14px] last:border-0"
                  >
                    <span className="block truncate">
                      {analyse.whiteName ?? 'Blancs'} — {analyse.blackName ?? 'Noirs'}
                    </span>
                    <span className="block truncate text-[12px] text-faint">
                      {analyse.opening ?? t('homeIn.noOpeningListed')}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            /* Pas d'analyse conservée : plutôt qu'une carte vide, on dit à quoi
               sert la colonne. C'est la seule invitation de la page, et elle
               vise ce qu'on ne pense pas à faire tout seul. */
            <Card className="flex flex-col overflow-hidden">
              {/* Le même bandeau que ses voisines, alors que ce n'est pas une
                  carte d'état : les quatre blocs du bas s'ouvrent ainsi sur la
                  même ligne, et l'on sait de quoi parle chacun sans le lire en
                  entier. */}
              <EnTeteDeCarte
                titre={t('homeIn.getAnalysed')}
                icone={<Sparkles size={14} aria-hidden />}
              />
              <div className="flex flex-1 flex-col justify-center p-4">
                <p className="text-[12px] leading-relaxed text-muted">
                  {t('homeIn.getAnalysedHint')}
                </p>
                <Link href="/analyse" className="mt-3">
                  <Button variant="secondary" size="sm" fullWidth icon={<Gauge size={14} />}>
                    {t('homeIn.analyseAGame')}
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
