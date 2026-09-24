'use client'

/**
 * La carte de carrière.
 *
 * Douze chapitres en colonne, le courant développé, les passés repliés, les
 * suivants lisibles mais verrouillés. **Un seul bouton d'action** : « Continuer »,
 * qui mène à la prochaine chose à faire, quelle qu'elle soit. Ce mode existe
 * pour supprimer un choix, pas pour en ajouter un treizième.
 *
 * La colonne est verticale et non horizontale : ça descend au doigt sur un
 * téléphone, et l'ordre de lecture est celui de la progression.
 *
 * Les étapes futures ne sont pas cliquables mais restent **lisibles**. Masquer
 * la suite créerait du suspense pendant une séance et du découragement pendant
 * dix : on doit voir où mène le chemin.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Lock, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import {
  BOT_LEVELS,
  BOT_PERSONALITIES,
  CARRIERE_TERMINEE,
  CHAPITRES,
  HAUTS_FAITS,
  SEUIL_COUP_DE_MAIN,
  chapitre as chapitreNumero,
  coupDeMainPropose,
  etapesDe,
  niveauAllege,
  niveauEffectif,
  prochaineEtape,
  rangPour,
  totalEtoiles,
  type Chapitre,
  type Progression,
} from '@coupparfait/core'
import { Button, ButtonLink, Card, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { Celebration, type Gains } from '@/components/carriere/Celebration.tsx'
import { recommencerCarriere, useCarriere } from '@/lib/carriere/useCarriere.ts'
import { detailDEtape, libelleDeSuite, titreDEtape } from '@/lib/carriere/textes.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export default function CarrierePage() {
  const t = useT()
  const progression = useCarriere()

  return (
    <div className="page-etroite">
      <header className="mb-5">
        <p className="text-[12px] font-semibold text-accent">{t('career.tag')}</p>
        <h1 className="mt-1 titre-affiche text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">
          {t('career.title')}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('career.intro')}</p>
      </header>

      {progression === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : progression === null ? (
        <SansCompte />
      ) : (
        <Parcours progression={progression} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sans compte
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La carte reste visible, l'avancement non.
 *
 * Cacher le contenu à qui n'a pas de compte le priverait de la seule
 * information qui pourrait lui donner envie d'en créer un. On montre donc les
 * douze chapitres, et l'on explique en une phrase ce qu'un compte ajoute.
 */
function SansCompte() {
  const t = useT()
  return (
    <>
      <Card className="mb-4 p-4">
        <p className="text-sm font-medium">{t('career.needsAccount')}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          {t('career.needsAccountHint')}
        </p>
        {/*
          Un seul bouton, et c'est celui qui mène quelque part.
          « Jouer sans compte » figurait ici et renvoyait vers la partie contre
          l'ordinateur : sur l'écran de la carrière, cela promettait de faire
          sans compte ce qui vient d'être annoncé comme impossible sans compte,
          et emmenait ailleurs. Les autres façons de jouer sont dans le menu,
          elles n'ont pas besoin d'être reproposées ici.
        */}
        <ButtonLink href="/connexion" variant="primary" size="sm" className="mt-3">
          {t('auth.signUp')}
        </ButtonLink>
      </Card>

      <div className="space-y-2 opacity-70">
        {CHAPITRES.map((chap) => (
          <LigneRepliee key={chap.numero} chapitre={chap} etoiles={0} verrouille />
        ))}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le parcours
// ─────────────────────────────────────────────────────────────────────────────

function Parcours({ progression }: { progression: Progression }) {
  const t = useT()
  const [gains, setGains] = useState<{ gains: Gains; titre: string } | null>(null)
  const courant = chapitreNumero(progression.chapter)
  const termine = progression.chapter >= CARRIERE_TERMINEE

  /**
   * Célébration au retour d'une étape validée ailleurs.
   *
   * La leçon, les puzzles et la partie signalent leur fait depuis leur propre
   * écran, puis renvoient ici. Les gains sont déposés dans le stockage de
   * session en chemin : sans ce relais, on reviendrait sur une carte qui a
   * avancé sans que rien n'ait été fêté, ce qui est précisément le contraire du
   * but recherché.
   */
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem('coupparfait.carriereGains')
      if (!brut) return
      sessionStorage.removeItem('coupparfait.carriereGains')
      const depose = JSON.parse(brut) as { gains: Gains; titre: string }
      if (depose?.gains && (depose.gains.xp > 0 || depose.gains.badges.length > 0)) {
        setGains(depose)
      }
    } catch {
      // Stockage refusé : on perd la fête, pas la progression.
    }
  }, [])

  const recommencer = useCallback(async () => {
    if (!window.confirm(t('career.restartConfirm'))) return
    if (await recommencerCarriere()) toast.success(t('career.restarted'))
    else toast.error(t('career.restartFailed'), t('analysis.tryAgainSoon'))
  }, [t])

  return (
    <>
      <Bandeau progression={progression} onRecommencer={recommencer} />

      {termine ? (
        <Card className="mb-4 border-accent/50 p-5 text-center">
          <p className="text-4xl">👑</p>
          <p className="mt-2 font-display text-xl font-bold">{t('career.finished')}</p>
          <p className="mt-1 text-sm text-muted">{t('career.finishedHint')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/jouer/ami" variant="primary" size="sm">
              {t('career.challengeSomeone')}
            </ButtonLink>
            <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} onClick={recommencer}>
              {t('career.doItAllAgain')}
            </Button>
          </div>
        </Card>
      ) : (
        courant && <CoupDeMain chapitre={courant} progression={progression} />
      )}

      <Carte progression={progression} />

      <HautsFaits obtenus={progression.badges} />

      {gains && (
        <Celebration
          gains={gains.gains}
          xpTotal={progression.xp}
          titre={gains.titre}
          onFermer={() => setGains(null)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bandeau de rang
// ─────────────────────────────────────────────────────────────────────────────

function Bandeau({
  progression,
  onRecommencer,
}: {
  progression: Progression
  onRecommencer: () => void
}) {
  const t = useT()
  const rang = rangPour(progression.xp)
  const etoiles = totalEtoiles(progression)

  /**
   * L'expérience monte en comptant, pas d'un coup.
   *
   * Un nombre qui saute de 300 à 450 se lit comme un rafraîchissement ; le même
   * nombre qui défile se lit comme un gain. C'est le seul endroit de
   * l'application où l'on s'autorise ce procédé, et il est réservé à la valeur
   * dont l'augmentation *est* la récompense.
   */
  const affiche = useCompteur(progression.xp)

  return (
    <Card className="mb-4 overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-2xl">
          {rang.rang.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight">
            {tCoeur(t, rang.rang.nom)}
          </p>
          <p className="text-[12px] text-faint">
            {rang.suivant
              ? t('career2.pointsTowards', {
                  acquis: rang.acquis,
                  requis: rang.requis ?? 0,
                  rang: tCoeur(t, rang.suivant.nom),
                })
              : t('career2.maxRank')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold tabular-nums text-accent">{affiche}</p>
          <p className="text-[12px] text-faint">{t('career2.pointsWord')}</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="carriere-jauge h-full rounded-full bg-accent"
          style={{ width: `${Math.round(rang.fraction * 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-faint">
        <span title={t('career.starsTitle')}>
          ★ {etoiles} / {CHAPITRES.length * 3}
        </span>
        <span title={t('career.badgesTitle')}>
          🏅 {progression.badges.length} / {HAUTS_FAITS.length}
        </span>
        <button
          type="button"
          onClick={onRecommencer}
          className="ml-auto rounded-[var(--radius-sm)] px-1.5 py-0.5 transition-colors hover:bg-surface-hover hover:text-muted"
        >
          {t('career.restart')}
        </button>
      </div>
    </Card>
  )
}

/** Fait défiler un nombre jusqu'à sa valeur, en une demi-seconde. */
function useCompteur(cible: number): number {
  const [valeur, setValeur] = useState(cible)
  const precedent = useRef(cible)

  useEffect(() => {
    const depart = precedent.current
    precedent.current = cible
    if (depart === cible) return

    // Une différence est un gain : on l'anime. Un premier rendu ne l'est pas,
    // d'où la comparaison plutôt qu'une animation systématique depuis zéro.
    const debut = performance.now()
    const DUREE = 700
    let image = 0
    const pas = () => {
      const t = Math.min(1, (performance.now() - debut) / DUREE)
      // Décélération : le chiffre file puis se pose.
      const adouci = 1 - (1 - t) ** 3
      setValeur(Math.round(depart + (cible - depart) * adouci))
      if (t < 1) image = requestAnimationFrame(pas)
    }
    image = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(image)
  }, [cible])

  return valeur
}

// ─────────────────────────────────────────────────────────────────────────────
//  Coup de main
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Après trois défaites d'affilée.
 *
 * C'est la pièce la plus importante du mode. Un parcours rate sa cible s'il
 * laisse quelqu'un bloqué au chapitre 4 sans lui dire pourquoi. On ne baisse
 * rien d'autorité : on propose, on explique, et l'on renvoie vers la leçon.
 */
function CoupDeMain({ chapitre, progression }: { chapitre: Chapitre; progression: Progression }) {
  const t = useT()
  if (!coupDeMainPropose(progression)) return null

  // `null` au premier échelon : on n'annonce pas un allègement qui rendrait le
  // même adversaire, on dit qu'il n'y a pas plus faible et l'on garde la leçon.
  const allege = niveauAllege(chapitre)
  const elo = allege === null ? null : (BOT_LEVELS[allege - 1]?.elo ?? 0)

  return (
    <Card className="mb-4 border-[var(--q-inaccuracy)]/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert size={15} className="shrink-0 text-[var(--q-inaccuracy)]" aria-hidden />
        {t('career.losingStreak', { n: progression.losingStreak })}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
        {elo === null ? (
          t('career.easedNone')
        ) : (
          <>
            {t('career.easedBefore')} <strong className="font-semibold text-ink">{elo} Elo</strong>{' '}
            {t('career.easedAfter')}
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink
          href={`/apprendre/${chapitre.lecon}?carriere=${chapitre.numero}`}
          size="sm"
          variant="primary"
        >
          {t('career.reviewLesson')}
        </ButtonLink>
        <ButtonLink
          href={`/jouer/ordinateur?carriere=${chapitre.numero}`}
          size="sm"
          variant="ghost"
        >
          {t('career.playAnyway')}
        </ButtonLink>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  La colonne
// ─────────────────────────────────────────────────────────────────────────────

function Carte({ progression }: { progression: Progression }) {
  return (
    <div className="relative space-y-2">
      {/* Le fil qui relie les chapitres, tracé au chargement. Purement
          décoratif : l'ordre est déjà porté par la colonne elle-même. */}
      <svg
        className="pointer-events-none absolute left-[27px] top-4 h-[calc(100%-2rem)] w-1"
        viewBox="0 0 2 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="100"
          stroke="var(--border)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="100"
          className="animate-carriere-trace"
          style={{ ['--trace-length' as string]: '100' }}
        />
      </svg>

      {CHAPITRES.map((chap) => {
        const etoiles = progression.stars[String(chap.numero)] ?? 0
        if (chap.numero < progression.chapter) {
          return <LigneRepliee key={chap.numero} chapitre={chap} etoiles={etoiles} />
        }
        if (chap.numero === progression.chapter) {
          return <CarteCourante key={chap.numero} chapitre={chap} progression={progression} />
        }
        return <LigneRepliee key={chap.numero} chapitre={chap} etoiles={0} verrouille />
      })}
    </div>
  )
}

/** Un chapitre passé ou à venir : une ligne, pas davantage. */
function LigneRepliee({
  chapitre,
  etoiles,
  verrouille = false,
}: {
  chapitre: Chapitre
  etoiles: number
  verrouille?: boolean
}) {
  const t = useT()
  const personnalite = BOT_PERSONALITIES[chapitre.adversaire]
  const elo = BOT_LEVELS[chapitre.niveau - 1]?.elo ?? 0

  return (
    <div
      className={clsx(
        'relative flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5',
        verrouille ? 'border-line/50 bg-surface/40' : 'border-line bg-surface',
      )}
    >
      <span
        className={clsx(
          'z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-lg',
          verrouille ? 'border-line bg-bg text-faint' : 'border-transparent text-white',
        )}
        style={verrouille ? undefined : { background: chapitre.teinte }}
        aria-hidden
      >
        {verrouille ? <Lock size={15} /> : chapitre.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-sm font-semibold', verrouille && 'text-muted')}>
          {chapitre.numero}. {chapitre.titre}
        </p>
        <p className="truncate text-[12px] text-faint">
          {tCoeur(t, personnalite.name)} · {elo} Elo
        </p>
      </div>

      {verrouille ? (
        <span className="shrink-0 text-[12px] text-faint">{t('career.comingUp')}</span>
      ) : (
        <span className="shrink-0 text-sm" aria-label={t('career.starsOf3', { n: etoiles })}>
          {[1, 2, 3].map((rang) => (
            <span
              key={rang}
              className={rang <= etoiles ? 'text-[var(--q-inaccuracy)]' : 'opacity-20'}
            >
              ★
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

/** Le chapitre en cours : développé, avec ses trois temps et un seul bouton. */
function CarteCourante({
  chapitre,
  progression,
}: {
  chapitre: Chapitre
  progression: Progression
}) {
  const t = useT()
  const personnalite = BOT_PERSONALITIES[chapitre.adversaire]
  const niveau = niveauEffectif(chapitre, progression)
  const elo = BOT_LEVELS[niveau - 1]?.elo ?? 0
  const etapes = useMemo(() => etapesDe(chapitre, progression), [chapitre, progression])
  const suite = prochaineEtape(chapitre, progression)

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-lg)] border-2 bg-surface"
      style={{ borderColor: chapitre.teinte }}
    >
      {/* Le liseré coloré fait le lien entre la pastille du chapitre et sa
          carte : sans lui, la teinte ne servirait à rien. */}
      <div className="h-1" style={{ background: chapitre.teinte }} aria-hidden />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className="animate-carriere-halo z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg text-white"
            style={{
              background: chapitre.teinte,
              ['--halo' as string]: `color-mix(in oklab, ${chapitre.teinte} 55%, transparent)`,
            }}
            aria-hidden
          >
            {chapitre.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-faint">
              {t('career.chapterOf', { n: chapitre.numero, total: CHAPITRES.length })}
            </p>
            <h2 className="font-display text-lg font-bold leading-tight">{chapitre.titre}</h2>
            <p className="mt-1 text-[14px] leading-snug text-muted">{chapitre.objectif}</p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {etapes.map((etape) => (
            <li
              key={etape.cle}
              className={clsx(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-2.5 py-2',
                etape.termine
                  ? 'border-[var(--q-best)]/40 bg-[color-mix(in_oklab,var(--q-best)_8%,transparent)]'
                  : 'border-line bg-bg',
              )}
            >
              <span
                className={clsx(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold',
                  etape.termine ? 'bg-[var(--q-best)] text-white' : 'bg-surface-strong text-faint',
                )}
                aria-hidden
              >
                {etape.termine ? '✓' : etape.fait}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {titreDEtape(t, etape)}
                </span>
                <span className="block truncate text-[12px] text-faint">
                  {detailDEtape(t, etape)}
                </span>
              </span>
              {etape.total > 1 && (
                <span className="shrink-0 text-[12px] tabular-nums text-faint">
                  {etape.fait} / {etape.total}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-bg px-2.5 py-2">
          <span className="text-lg" aria-hidden>
            {personnalite.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">
              {tCoeur(t, personnalite.name)} · {elo} Elo
            </span>
            <span className="block truncate text-[12px] text-faint">
              {tCoeur(t, personnalite.blurb)}
            </span>
          </span>
        </div>

        {suite ? (
          <Link href={suite.lien} className="mt-4 block">
            <Button variant="primary" size="lg" fullWidth icon={<Sparkles size={16} />}>
              {libelleDeSuite(t, suite, chapitre, progression)}
            </Button>
          </Link>
        ) : (
          <p className="mt-4 text-center text-sm text-muted">{t('career.allDone')}</p>
        )}

        {progression.losingStreak > 0 && progression.losingStreak < SEUIL_COUP_DE_MAIN && (
          <p className="mt-2 text-center text-[12px] text-faint">
            {t(progression.losingStreak > 1 ? 'career.streakNotePlural' : 'career.streakNote', {
              n: progression.losingStreak,
            })}
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hauts faits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tous affichés, y compris ceux qu'on n'a pas.
 *
 * Un haut fait caché ne récompense pas un effort, il récompense un hasard : on
 * l'obtient sans savoir pourquoi, ou jamais faute d'avoir su qu'il existait.
 */
function HautsFaits({ obtenus }: { obtenus: string[] }) {
  const t = useT()
  return (
    <Card className="mt-4 p-4">
      <p className="mb-3 text-[12px] font-semibold text-faint">
        {t('career.badges', { obtenus: obtenus.length, total: HAUTS_FAITS.length })}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {HAUTS_FAITS.map((fait) => {
          const acquis = obtenus.includes(fait.id)
          return (
            <div
              key={fait.id}
              title={fait.condition}
              className={clsx(
                'flex items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-1.5',
                acquis
                  ? 'border-accent/40 bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]'
                  : 'border-line bg-bg',
              )}
            >
              <span className={clsx('text-base', !acquis && 'opacity-30 grayscale')} aria-hidden>
                {fait.emoji}
              </span>
              <span className="min-w-0">
                <span
                  className={clsx(
                    'block truncate text-[12px] font-medium',
                    !acquis && 'text-faint',
                  )}
                >
                  {fait.nom}
                </span>
                <span className="block truncate text-[12px] leading-tight text-faint">
                  {fait.condition}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
