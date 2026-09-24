'use client'

/**
 * Le tableau de bord.
 *
 * **L'ordre des blocs est celui des questions**, de la plus large à la plus
 * précise : est-ce que ça vit (les courbes), qu'est-ce qu'on y fait (modes,
 * cadences, issues, heures), qui s'en sert (rétention, niveaux, joueurs).
 * Quelqu'un qui n'a que dix secondes lit la première ligne et s'arrête ; le
 * reste est là pour celui qui a une raison de descendre.
 *
 * **Chaque chiffre porte sa phrase de lecture.** Un taux de rétention de 34 %
 * ne veut rien dire tant qu'on n'a pas dit sur qui il est calculé — et un
 * tableau de bord dont on doit deviner les définitions se lit une fois, puis
 * plus jamais.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Card,
  EmptyState,
  SectionTitle,
  SegmentedControl,
  Skeleton,
} from '@/components/ui/index.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { Barres, Courbe, Histogramme, Mesure, nombre, part } from './graphiques.tsx'

interface Statistiques {
  jours: number
  courbes: {
    jours: string[]
    inscriptions: number[]
    parties: number[]
    puzzles: number[]
    dernieresVisites: number[]
  }
  modes: Array<{ cle: string; n: number }>
  cadences: Array<{ cle: string; classee: boolean; n: number }>
  issues: Array<{ statut: string; resultat: string; n: number }>
  ouvertures: Array<{ eco: string; nom: string; n: number }>
  heures: number[]
  niveaux: Array<{ categorie: string; tranche: number; n: number }>
  meilleursJoueurs: Array<{ pseudo: string; parties: number; derniere: string }>
  puzzles: { tentatives: number; reussies: number; joueurs: number; tempsMedian: number | null }
  retention: {
    inscrits: number
    ontJoue: number
    revenus: number
    avecAdresse: number
    adresseConfirmee: number
  }
  apprentissage: { suivies: number; terminees: number; joueurs: number }
}

/*
  Les modes, les cadences et les fenêtres de temps, par clé de dictionnaire.

  Ces trois tables sont des constantes de module : elles ne peuvent pas appeler
  `t()`, et leurs intitulés restaient donc en français dans les quarante autres
  langues. Un `cle` absent de la table s'affiche tel quel, comme avant — c'est ce
  qui permet à un mode ajouté côté serveur d'apparaître avant d'être traduit.
*/
const MODES: Record<string, TranslationKey> = {
  computer: 'admin.modeComputer',
  friend: 'admin.modeFriend',
  local: 'admin.modeLocal',
  puzzle: 'admin.modePuzzle',
  lesson: 'admin.modeLesson',
  tournament: 'admin.modeTournament',
  correspondence: 'admin.modeCorrespondence',
}

// « Bullet » et « blitz » s'écrivent de même dans presque toutes les langues,
// mais passent aussi par le dictionnaire : c'est lui qui en décide, pas l'écran.
const CADENCES: Record<string, TranslationKey | string> = {
  bullet: 'common.bullet',
  blitz: 'common.blitz',
  rapid: 'admin.paceRapid',
  classical: 'admin.paceClassical',
  correspondence: 'admin.modeCorrespondence',
  puzzle: 'admin.modePuzzle',
}

const FENETRES = [
  { value: '7', labelKey: 'admin.days7' },
  { value: '30', labelKey: 'admin.days30' },
  { value: '90', labelKey: 'admin.days90' },
  { value: '365', labelKey: 'admin.days365' },
] as const satisfies ReadonlyArray<{ value: string; labelKey: TranslationKey }>

export function TableauDeBord() {
  const t = useT()
  const [jours, setJours] = useState('30')
  const [stats, setStats] = useState<Statistiques | null>(null)
  const [echec, setEchec] = useState(false)

  const charger = useCallback(async (fenetre: string) => {
    setStats(null)
    setEchec(false)
    try {
      const reponse = await fetch(`/api/admin/statistiques?jours=${fenetre}`, { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      setStats(await reponse.json())
    } catch {
      setEchec(true)
    }
  }, [])

  useEffect(() => {
    void charger(jours)
  }, [jours, charger])

  if (echec) {
    return <EmptyState title={t('admin.statsFailed')} description={t('admin.statsFailedHint')} />
  }

  return (
    <div className="space-y-5">
      <SegmentedControl
        value={jours}
        onChange={setJours}
        options={FENETRES.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
      />

      {stats === null ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <Activite stats={stats} />
          <Usage stats={stats} />
          <Public stats={stats} />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Est-ce que ça vit
// ─────────────────────────────────────────────────────────────────────────────

function Activite({ stats }: { stats: Statistiques }) {
  const t = useT()
  const total = (valeurs: number[]) => valeurs.reduce((somme, valeur) => somme + valeur, 0)
  const parties = total(stats.courbes.parties)

  return (
    <Card className="p-4">
      <SectionTitle hint={t('admin.activityHint')}>{t('admin.activity')}</SectionTitle>

      <Courbe
        jours={stats.courbes.jours}
        series={[
          { nom: t('admin.games'), valeurs: stats.courbes.parties, couleur: 'var(--accent)' },
          {
            nom: t('admin.puzzles'),
            valeurs: stats.courbes.puzzles,
            couleur: 'var(--q-inaccuracy)',
          },
          {
            nom: t('admin.signups'),
            valeurs: stats.courbes.inscriptions,
            couleur: 'var(--q-best)',
          },
        ]}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Mesure
          titre={t('admin.games')}
          valeur={parties}
          note={t('admin.perDayAverage', { n: (parties / stats.jours).toFixed(1) })}
        />
        <Mesure
          titre={t('admin.puzzlesTried')}
          valeur={stats.puzzles.tentatives}
          note={t('admin.solvedFirstTry', {
            part: part(stats.puzzles.reussies, stats.puzzles.tentatives),
          })}
        />
        <Mesure
          titre={t('admin.signups')}
          valeur={total(stats.courbes.inscriptions)}
          note={t('admin.accountsCreated', { n: stats.retention.inscrits })}
        />
        <Mesure
          titre={t('admin.medianPerPuzzle')}
          valeur={
            stats.puzzles.tempsMedian == null
              ? '—'
              : t('common.seconds', { n: (stats.puzzles.tempsMedian / 1000).toFixed(1) })
          }
          note={t('admin.distinctPlayers', { n: nombre(stats.puzzles.joueurs) })}
        />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Qu'est-ce qu'on y fait
// ─────────────────────────────────────────────────────────────────────────────

function Usage({ stats }: { stats: Statistiques }) {
  const t = useT()
  const partiesTotales = stats.modes.reduce((somme, mode) => somme + mode.n, 0)

  // Les issues sont regroupées par ce qui a mis fin à la partie plutôt que par
  // résultat : « qui a gagné » se déduit du classement, « comment ça s'est
  // terminé » ne se lit nulle part ailleurs — et un pic d'abandons ou de
  // parties laissées en plan est un signal, pas une statistique.
  const finales = new Map<string, number>()
  for (const issue of stats.issues) {
    finales.set(issue.statut, (finales.get(issue.statut) ?? 0) + issue.n)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <SectionTitle hint={t('admin.overPeriod')}>{t('admin.gameModes')}</SectionTitle>
        <Barres
          total={partiesTotales}
          parts={stats.modes.map((mode) => ({
            cle: MODES[mode.cle] ? t(MODES[mode.cle]!) : mode.cle,
            n: mode.n,
          }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t('admin.pacesHint')}>{t('admin.paces')}</SectionTitle>
        <Barres
          parts={stats.cadences.map((cadence) => ({
            cle: libelleCadence(cadence.cle, t),
            n: cadence.n,
            note: t(cadence.classee ? 'admin.rated' : 'admin.casual'),
          }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t('admin.endingsHint')}>{t('admin.endings')}</SectionTitle>
        <Barres
          parts={[...finales.entries()]
            .sort((premier, second) => second[1] - premier[1])
            .map(([statut, n]) => ({
              cle: STATUTS[statut] ? t(STATUTS[statut]!) : statut,
              n,
            }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t('admin.openingsHint')}>{t('admin.openings')}</SectionTitle>
        <Barres
          parts={stats.ouvertures.map((ouverture) => ({
            cle: ouverture.nom,
            n: ouverture.n,
            note: ouverture.eco,
          }))}
        />
      </Card>

      <Card className="p-4 lg:col-span-2">
        <SectionTitle hint={t('admin.hoursHint')}>{t('admin.hours')}</SectionTitle>
        <Histogramme
          valeurs={stats.heures}
          etiquette={(heure) => t('admin.hourOfDay', { n: String(heure).padStart(2, '0') })}
        />
      </Card>
    </div>
  )
}

/** Les fins de partie, par clé de dictionnaire. */
const STATUTS: Record<string, TranslationKey> = {
  playing: 'admin.statusPlaying',
  checkmate: 'admin.statusCheckmate',
  resign: 'admin.statusResign',
  timeout: 'admin.statusTimeout',
  draw: 'admin.statusDraw',
  stalemate: 'admin.statusStalemate',
  repetition: 'admin.statusRepetition',
  fiftyMoves: 'admin.statusFiftyMoves',
  insufficient: 'admin.statusInsufficient',
  aborted: 'admin.statusAborted',
}

/**
 * Le nom d'une cadence, traduit quand il le mérite.
 *
 * « Bullet » et « blitz » sont des mots du jeu : on les écrit pareil partout, et
 * leur donner une clé aurait invité à les traduire. Le reste passe par le
 * dictionnaire ; un identifiant inconnu s'affiche tel quel.
 */
function libelleCadence(cle: string, t: ReturnType<typeof useT>): string {
  const valeur = CADENCES[cle]
  if (!valeur) return cle
  return valeur.includes('.') ? t(valeur as TranslationKey) : valeur
}

// ─────────────────────────────────────────────────────────────────────────────
//  Qui s'en sert
// ─────────────────────────────────────────────────────────────────────────────

function Public({ stats }: { stats: Statistiques }) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const { retention } = stats

  // Les niveaux, toutes cadences confondues : la question posée est « le
  // classement sépare-t-il les joueurs », pas « comment se répartit le blitz ».
  const tranches = new Map<number, number>()
  for (const niveau of stats.niveaux) {
    tranches.set(niveau.tranche, (tranches.get(niveau.tranche) ?? 0) + niveau.n)
  }
  const ordonnees = [...tranches.entries()].sort((premier, second) => premier[0] - second[0])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <SectionTitle hint={t('admin.retentionHint')}>{t('admin.retention')}</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Mesure
            titre={t('admin.playedOnce')}
            valeur={part(retention.ontJoue, retention.inscrits)}
            note={t('admin.outOfSignups', {
              n: nombre(retention.ontJoue),
              total: nombre(retention.inscrits),
            })}
            ton={
              retention.inscrits >= 10 && retention.ontJoue / retention.inscrits < 0.5
                ? 'attention'
                : undefined
            }
          />
          <Mesure
            titre={t('admin.cameBack')}
            valeur={part(retention.revenus, retention.inscrits)}
            note={t('admin.cameBackNote', { n: nombre(retention.revenus) })}
          />
          <Mesure
            titre={t('admin.leftAddress')}
            valeur={part(retention.avecAdresse, retention.inscrits)}
            note={t('admin.leftAddressNote', { n: nombre(retention.adresseConfirmee) })}
          />
          <Mesure
            titre={t('admin.lessonsDone')}
            valeur={stats.apprentissage.terminees}
            note={t('admin.lessonsDoneNote', {
              n: nombre(stats.apprentissage.suivies),
              joueurs: nombre(stats.apprentissage.joueurs),
            })}
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t('admin.levelsHint')}>{t('admin.levels')}</SectionTitle>
        {ordonnees.length === 0 ? (
          <p className="py-3 text-[12px] text-faint">{t('admin.noRatedGame')}</p>
        ) : (
          <Histogramme
            valeurs={ordonnees.map(([, n]) => n)}
            etiquette={(index) => String(ordonnees[index]?.[0] ?? '')}
            couleur="var(--q-great)"
          />
        )}
      </Card>

      <Card className="p-4 lg:col-span-2">
        <SectionTitle hint={t('admin.topPlayersHint')}>{t('admin.topPlayers')}</SectionTitle>
        {stats.meilleursJoueurs.length === 0 ? (
          <p className="py-3 text-[12px] text-faint">{t('admin.noGameInPeriod')}</p>
        ) : (
          <Barres
            parts={stats.meilleursJoueurs.map((joueur) => ({
              cle: joueur.pseudo,
              n: joueur.parties,
              note: t('admin.seenOn', {
                date: new Date(joueur.derniere).toLocaleDateString(bcp47),
              }),
            }))}
          />
        )}
      </Card>
    </div>
  )
}
