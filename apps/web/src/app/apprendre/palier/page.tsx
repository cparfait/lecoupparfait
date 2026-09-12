'use client'

/**
 * Ton palier — ce qui te fait gagner des points maintenant.
 *
 * Le programme d'apprentissage est rangé par chapitres, et c'est le bon ordre
 * pour *apprendre*. Ce n'est pas celui dans lequel on *cherche* : la question
 * qu'on se pose en arrivant n'est pas « que me reste-t-il au chapitre 5 ? »,
 * c'est « je suis à 900, qu'est-ce qui me coûte des points ? ». Cette page-ci
 * répond à celle-là, et elle ne contient aucun contenu neuf : elle range
 * autrement ce qui existe déjà, dans l'ordre où ça rapporte.
 *
 * Trois couches, de la plus générale à la plus personnelle :
 *
 *  1. **Le palier**, déduit du classement ou du test. Avec sa promesse : ce
 *     qu'on sait déjà faire, puis ce qui bloque.
 *  2. **Les leviers du palier**, quatre ou cinq, chacun avec la raison pour
 *     laquelle il coûte cher *à ce niveau-là* et l'écran qui le travaille.
 *  3. **Les faiblesses mesurées**, quand on a un compte et assez de puzzles
 *     derrière soi : les motifs qu'on rate vraiment, avec leur taux. C'est la
 *     seule partie de la page qui ne soit pas une généralité, et c'est donc
 *     celle qui passe devant les leviers dès qu'elle existe.
 *
 * Sans compte, tout fonctionne sauf la troisième couche : le palier vient alors
 * du test de niveau, conservé dans le navigateur.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Crown,
  Gauge,
  GraduationCap,
  Puzzle,
  Target,
  TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { motifCopy, SPEED_LABELS, type MotifId, type SpeedCategory } from '@coupparfait/core'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { Button, ButtonLink, Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import {
  LIBELLE_SOURCE,
  PALIERS,
  PEREMPTION_JOURS,
  ancienneteEnJours,
  lireNiveauEstime,
  niveauRetenu,
  palierPour,
  palierSuivant,
  type CibleLevier,
  type NiveauEstime,
} from '@/lib/apprendre/palier.ts'
import { findLesson, loadProgress, type LessonProgress } from '@/lib/lessons/index.ts'
import { langue, localeDuContenu, useI18n, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

const TEINTE = 'var(--rub-apprendre)'

interface Faiblesse {
  motif: string
  tentatives: number
  reussies: number
  taux: number
}

interface Diagnostic {
  connecte: boolean
  partie: { categorie: SpeedCategory; cote: number; parties: number; provisoire: boolean } | null
  puzzle: { cote: number; tentatives: number } | null
  faiblesses: Faiblesse[]
}

export default function PalierPage() {
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  const t = useT()
  /* La date de la dernière mesure s'écrit dans la langue de l'interface, et
     non dans celle du contenu : c'est une date, pas une phrase rédigée. */
  const bcp47 = langue(useI18n().locale).bcp47
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const [test, setTest] = useState<NiveauEstime | null>(null)
  const [progres, setProgres] = useState<LessonProgress>({})
  /** Palier choisi à la main, quand on veut regarder ailleurs que chez soi. */
  const [force, setForce] = useState<string | null>(null)

  useEffect(() => {
    setTest(lireNiveauEstime())
    setProgres(loadProgress())

    // Sans compte, la route répond `connecte: false` : pas d'erreur à gérer, et
    // la page se rabat d'elle-même sur le test de niveau.
    void fetch('/api/palier', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((data: Diagnostic | null) => setDiagnostic(data))
      .catch(() => setDiagnostic(null))
  }, [])

  const niveau = useMemo(
    () =>
      niveauRetenu({
        partie: diagnostic?.partie?.cote ?? null,
        puzzle: diagnostic?.puzzle?.cote ?? null,
        test,
      }),
    [diagnostic, test],
  )

  const palier = force
    ? (PALIERS.find((entree) => entree.id === force) ?? palierPour(niveau?.elo ?? 900))
    : niveau
      ? palierPour(niveau.elo)
      : null

  const suivant = palier ? palierSuivant(palier) : null
  const faiblesses = diagnostic?.faiblesses ?? []

  /*
    Quand faut-il proposer de refaire la mesure ?

    Le test n'était offert qu'à ceux dont on ne savait rien : une fois un
    niveau connu, le bouton disparaissait, et le seul moyen de le refaire
    était de retrouver l'adresse à la main. Or c'est précisément le cas où
    l'on veut vérifier — on a travaillé trois mois et l'on aimerait savoir si
    ça se voit.

    Le bouton est donc toujours là. Ce qui change, c'est ce qu'on en dit : on
    insiste quand la mesure est vieille (voir `PEREMPTION_JOURS`) ou quand
    elle ne repose sur rien de mesuré — une déclaration d'inscription que
    personne n'a vérifiée.
  */
  const anciennete = niveau ? ancienneteEnJours(niveau) : null
  const aVerifier =
    niveau != null &&
    (niveau.source === 'declare' ||
      (niveau.source === 'test' && anciennete != null && anciennete >= PEREMPTION_JOURS))

  return (
    <div className="page">
      <TitreDePage retour={{ href: '/apprendre', label: 'Apprendre' }} intro={t('tier.intro')}>
        {t('tier.title')}
      </TitreDePage>

      {/* ── Le niveau retenu, et d'où il vient ─────────────────────────────
          Un nombre sans son origine ne sert à rien : on ne sait pas s'il faut
          le croire. La source est donc dans la même phrase que le nombre, et
          jamais en note de bas de page. */}
      <Card className="overflow-hidden">
        <EnTeteDeCarte
          titre={t('tier.yourLevel')}
          icone={<Gauge size={14} aria-hidden />}
          teinte={TEINTE}
          fin={
            niveau ? (
              <>
                {niveau.elo} <span className="text-faint">Elo</span>
              </>
            ) : undefined
          }
        />

        {niveau && palier ? (
          <div className="p-5">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <p className="font-display text-4xl font-bold leading-none tabular-nums">
                {niveau.elo}
              </p>
              <p className="text-[13px] leading-relaxed text-muted">
                {LIBELLE_SOURCE[niveau.source]}
                {diagnostic?.partie && niveau.source === 'partie' && (
                  <>
                    {' '}
                    {t(diagnostic.partie.parties > 1 ? 'tier.inGameSpeed' : 'tier.inGameSpeedOne', {
                      cadence: SPEED_LABELS[diagnostic.partie.categorie][locale].toLowerCase(),
                      parties: diagnostic.partie.parties,
                    })}
                    {diagnostic.partie.provisoire && ` ${t('tier.provisional')}`}
                  </>
                )}
                {niveau.source === 'test' &&
                  t('tier.testedOn', {
                    date: new Date(niveau.le).toLocaleDateString(bcp47),
                  })}
              </p>
            </div>

            <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">{palier.nom}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              {palier.promesse}
            </p>

            {suivant && (
              <p className="mt-3 text-[13px] text-faint">
                {t('tier.nextTierFrom', { min: suivant.min, nom: suivant.nom.toLowerCase() })}
              </p>
            )}

            {/* Refaire la mesure, toujours possible. En bas de la carte et non
                dans son en-tête : c'est une action de vérification, elle ne
                doit pas concurrencer le nombre qu'on vient de lire. */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
              <ButtonLink
                href="/apprendre/niveau"
                variant={aVerifier ? 'primary' : 'secondary'}
                icon={<Target size={15} />}
              >
                {t(niveau.source === 'test' ? 'tier.retake' : 'tier.takeTest')}
              </ButtonLink>
              <p className="max-w-md text-[12px] leading-relaxed text-faint">
                {niveau.source === 'declare'
                  ? t('tier.fromDeclaration')
                  : niveau.source === 'test' && anciennete != null && anciennete >= PEREMPTION_JOURS
                    ? t('tier.stale', { jours: anciennete })
                    : t('tier.testNeutral')}
              </p>
            </div>
          </div>
        ) : (
          /* Aucune mesure : on ne devine pas. Proposer « le programme des
             1 200 » à quelqu'un dont on ne sait rien, c'est se tromper cinq
             fois sur six, et la page perdrait toute sa crédibilité au premier
             levier hors sujet. */
          <div className="p-5">
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{t('tier.unknown')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink
                href="/apprendre/niveau"
                variant="primary"
                size="lg"
                icon={<Target size={16} />}
              >
                {t('tier.takeTest')}
              </ButtonLink>
              <Button size="lg" onClick={() => setForce('pieces-en-prise')}>
                {t('tier.showAnyway')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Les faiblesses mesurées ──────────────────────────────────────
          Elles passent avant les leviers du palier dès qu'elles existent : une
          généralité sur les 1 200 ne vaut pas une mesure sur soi. */}
      {faiblesses.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <EnTeteDeCarte
            titre={t('tier.weaknesses')}
            icone={<TrendingUp size={14} aria-hidden />}
            teinte="var(--rub-entrainer)"
            fin={t('tier.weaknessesCount', { n: faiblesses.length })}
          />
          <div className="p-4">
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              {t('tier.weaknessesHint')}
            </p>

            <ul className="space-y-1.5">
              {faiblesses.map((faiblesse) => {
                const copy = motifCopy(faiblesse.motif as MotifId, locale)
                // Au-dessus de 70 % de réussite, le motif n'est plus une
                // faiblesse : on l'affiche en neutre pour que la liste se lise
                // comme un classement et non comme un relevé de fautes.
                const ton =
                  faiblesse.taux < 45 ? 'danger' : faiblesse.taux < 70 ? 'warning' : 'success'
                return (
                  <li key={faiblesse.motif}>
                    <Link
                      href={`/puzzles?theme=${encodeURIComponent(faiblesse.motif)}`}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-line bg-bg-elev px-3 py-2.5 transition-colors hover:bg-surface-hover"
                      title={copy?.definition}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold">
                          {copy?.name ?? faiblesse.motif}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-faint">
                          {faiblesse.reussies} trouvés sur {faiblesse.tentatives}
                        </span>
                      </span>
                      {/* La barre dit le taux mieux que le nombre : on compare
                          huit lignes d'un coup d'œil au lieu de lire huit
                          pourcentages. */}
                      <span
                        className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line sm:block"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(3, faiblesse.taux)}%`,
                            background:
                              ton === 'danger'
                                ? 'var(--q-blunder)'
                                : ton === 'warning'
                                  ? 'var(--q-inaccuracy)'
                                  : 'var(--q-best)',
                          }}
                        />
                      </span>
                      <Chip tone={ton} className="shrink-0 tabular-nums">
                        {faiblesse.taux} %
                      </Chip>
                      <ArrowRight size={14} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>
      )}

      {/* ── Les leviers du palier ───────────────────────────────────────── */}
      {palier && (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {t('tier.bestReturn')}
              </h2>
              {/* Le palier est nommé ici aussi, et pas seulement dans la carte
                  du haut : celle-ci s'effaçait quand aucun niveau n'est connu —
                  elle propose alors le test — si bien qu'on se retrouvait devant
                  cinq leviers sans savoir de quel palier ils venaient. Et quand
                  on consulte un autre palier que le sien, le rappel évite de
                  croire qu'on lit toujours le sien. */}
              <p className="mt-0.5 text-[13px] text-muted">
                {t('tier.tierNamed')}{' '}
                <strong className="font-semibold text-ink">{palier.nom.toLowerCase()}</strong> ·{' '}
                <span className="tabular-nums">
                  {palier.max === Number.POSITIVE_INFINITY
                    ? t('tier.eloAndAbove', { min: palier.min })
                    : t('tier.eloRange', { min: palier.min, max: palier.max })}
                </span>
              </p>
            </div>
            <p className="text-[12px] text-faint">
              {t('tier.leversCount', { n: palier.leviers.length })}
            </p>
          </div>

          {/* Sans mesure, la promesse du palier n'a été affichée nulle part : la
              carte du haut montre l'invitation au test à sa place. On la remet
              ici, parce que c'est elle qui dit à qui s'adressent ces leviers. */}
          {!niveau && (
            <p className="mb-3 max-w-2xl text-[14px] leading-relaxed text-muted">
              {palier.promesse}
            </p>
          )}

          <ol className="space-y-2">
            {palier.leviers.map((levier, rang) => (
              <li key={levier.titre}>
                <CarteLevier
                  rang={rang + 1}
                  titre={levier.titre}
                  pourquoi={levier.pourquoi}
                  cible={levier.cible}
                  progres={progres}
                />
              </li>
            ))}
          </ol>

          {/* Une séance pédagogique calibrée sur le palier : on a le niveau de
              bot, autant le proposer ici plutôt que de laisser régler un
              curseur au hasard. */}
          <Card className="mt-4 overflow-hidden">
            <EnTeteDeCarte
              titre={t('tier.practise')}
              icone={<Crown size={14} aria-hidden />}
              teinte="var(--rub-jouer)"
            />
            <div className="flex flex-wrap items-center gap-4 p-5">
              <p className="min-w-[14rem] flex-1 text-[14px] leading-relaxed text-muted">
                {t('tier.practiseHint')}
              </p>
              <ButtonLink
                href={`/jouer/pedagogique?palier=${palier.id}`}
                variant="primary"
                icon={<ArrowRight size={15} />}
              >
                {t('tier.session')}
              </ButtonLink>
            </div>
          </Card>
        </section>
      )}

      {/* ── Les autres paliers ──────────────────────────────────────────
          Montrés, et pas cachés : savoir ce qui vient après est une motivation,
          et quelqu'un qui aide un enfant veut pouvoir regarder le palier d'en
          dessous. On ne verrouille rien, ici comme dans les leçons. */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          {t('tier.sixTiers')}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {PALIERS.map((entree) => (
            <button
              key={entree.id}
              type="button"
              onClick={() => setForce(entree.id)}
              className={clsx(
                'rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors',
                entree.id === palier?.id
                  ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                  : 'border-line bg-bg-elev hover:bg-surface-hover',
              )}
            >
              <span className="block text-[12px] tabular-nums text-faint">
                {entree.max === Number.POSITIVE_INFINITY
                  ? `${entree.min} +`
                  : `${entree.min} – ${entree.max}`}
              </span>
              <span className="block text-[13px] font-semibold">{entree.nom}</span>
            </button>
          ))}
        </div>
        {niveau && force && force !== palierPour(niveau.elo).id && (
          <button type="button" onClick={() => setForce(null)} className="lien mt-3 inline-block">
            {t('tier.backToMine')}
          </button>
        )}
      </section>

      <AutresDeLaSection section="apprendre" />
    </div>
  )
}

/**
 * Un levier, et ce qu'il ouvre.
 *
 * Le titre dit la compétence, le paragraphe dit ce qu'elle coûte, et le bouton
 * dit où on va — leçon, puzzles, ou une page de l'application. Les leçons déjà
 * terminées portent leur coche : on ne renvoie pas quelqu'un sur ce qu'il a
 * fait sans le lui signaler, mais on ne le lui interdit pas non plus.
 */
function CarteLevier({
  rang,
  titre,
  pourquoi,
  cible,
  progres,
}: {
  rang: number
  titre: string
  pourquoi: string
  cible: CibleLevier
  progres: LessonProgress
}) {
  const t = useT()
  const destination = hrefDeLaCible(cible)
  const lecon = cible.type === 'lecon' ? findLesson(cible.id) : null
  const faite = cible.type === 'lecon' ? (progres[cible.id]?.completed ?? false) : false

  const Icone = cible.type === 'lecon' ? GraduationCap : cible.type === 'puzzle' ? Puzzle : BookOpen

  return (
    <Link
      href={destination}
      className={clsx(
        'flex items-start gap-3 rounded-[var(--radius)] border p-4 transition-all',
        'hover:-translate-y-0.5 hover:bg-surface-hover',
        faite
          ? 'border-[color-mix(in_oklab,var(--q-best)_30%,transparent)] bg-[color-mix(in_oklab,var(--q-best)_7%,transparent)]'
          : 'border-line bg-bg-elev',
      )}
    >
      {/* Le rang, en chiffre : l'ordre est le message de la page, autant le
          rendre lisible sans avoir à compter les cartes. */}
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[15px] font-bold tabular-nums"
        style={{
          background: `color-mix(in oklab, ${TEINTE} 16%, transparent)`,
          color: `color-mix(in oklab, ${TEINTE} 78%, var(--text))`,
        }}
        aria-hidden
      >
        {rang}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{titre}</span>
          {faite && <Chip tone="success">{t('tier.alreadySeen')}</Chip>}
        </span>
        {/* Pas de nom d'ouverture cliquable ici, contrairement à la page des
            principes : la carte entière **est** un lien, et un lien dans un
            lien est du HTML invalide — le navigateur en referme un tout seul,
            et l'on se retrouve avec une carte dont la moitié ne clique plus. */}
        <span className="mt-1 block text-[14px] leading-relaxed text-muted">{pourquoi}</span>
        <span className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-accent">
          <Icone size={12} aria-hidden />
          {libelleDeLaCible(cible, lecon?.title ?? null, t)}
        </span>
      </span>

      <ArrowRight size={16} className="mt-1 shrink-0 text-faint" aria-hidden />
    </Link>
  )
}

function hrefDeLaCible(cible: CibleLevier): string {
  switch (cible.type) {
    case 'lecon':
      return `/apprendre/${cible.id}`
    case 'puzzle':
      return `/puzzles?theme=${encodeURIComponent(cible.theme)}`
    case 'page':
      return cible.href
  }
}

/*
  Le traducteur passe en argument.

  La fonction est pure et vit hors de tout composant : elle ne peut pas
  appeler `useT()` elle-même, et la remonter dans le composant appelant
  l'aurait mêlée au rendu pour trois lignes de texte.
*/
function libelleDeLaCible(
  cible: CibleLevier,
  titreLecon: string | null,
  t: ReturnType<typeof useT>,
): string {
  switch (cible.type) {
    case 'lecon':
      return titreLecon ? t('tier.lessonNamed', { titre: titreLecon }) : t('tier.guidedLesson')
    case 'puzzle':
      return t('tier.puzzlesOnTheme')
    case 'page':
      return cible.label
  }
}
