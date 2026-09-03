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

/** Les modes de jeu, dits en français. Un `cle` inconnu s'affiche tel quel. */
const MODES: Record<string, string> = {
  computer: 'Contre l’ordinateur',
  friend: 'Entre joueurs',
  local: 'À deux sur le même écran',
  puzzle: 'Puzzle',
  lesson: 'Leçon',
  tournament: 'Tournoi',
  correspondence: 'Correspondance',
}

const CADENCES: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapide',
  classical: 'Classique',
  correspondence: 'Correspondance',
  puzzle: 'Puzzle',
}

const FENETRES = [
  { value: '7', label: '7 j' },
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
  { value: '365', label: '1 an' },
]

export function TableauDeBord() {
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
    return (
      <EmptyState
        title="Calcul impossible"
        description="La base n’a pas répondu. Les autres onglets restent utilisables."
      />
    )
  }

  return (
    <div className="space-y-5">
      <SegmentedControl value={jours} onChange={setJours} options={FENETRES} />

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
  const total = (valeurs: number[]) => valeurs.reduce((somme, valeur) => somme + valeur, 0)
  const parties = total(stats.courbes.parties)

  return (
    <Card className="p-4">
      <SectionTitle hint="Chaque point est une journée, à l’heure de Paris. Un jour sans rien vaut zéro, pas un trou.">
        Activité
      </SectionTitle>

      <Courbe
        jours={stats.courbes.jours}
        series={[
          { nom: 'Parties', valeurs: stats.courbes.parties, couleur: 'var(--accent)' },
          { nom: 'Puzzles', valeurs: stats.courbes.puzzles, couleur: 'var(--q-inaccuracy)' },
          { nom: 'Inscriptions', valeurs: stats.courbes.inscriptions, couleur: 'var(--q-best)' },
        ]}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Mesure
          titre="Parties"
          valeur={parties}
          note={`${(parties / stats.jours).toFixed(1)} par jour en moyenne`}
        />
        <Mesure
          titre="Puzzles tentés"
          valeur={stats.puzzles.tentatives}
          note={`${part(stats.puzzles.reussies, stats.puzzles.tentatives)} résolus du premier coup`}
        />
        <Mesure
          titre="Inscriptions"
          valeur={total(stats.courbes.inscriptions)}
          note={`${stats.retention.inscrits} comptes créés sur la période`}
        />
        <Mesure
          titre="Temps médian par puzzle"
          valeur={
            stats.puzzles.tempsMedian == null
              ? '—'
              : `${(stats.puzzles.tempsMedian / 1000).toFixed(1)} s`
          }
          note={`${nombre(stats.puzzles.joueurs)} joueurs distincts`}
        />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Qu'est-ce qu'on y fait
// ─────────────────────────────────────────────────────────────────────────────

function Usage({ stats }: { stats: Statistiques }) {
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
        <SectionTitle hint="Sur la période choisie.">Modes de jeu</SectionTitle>
        <Barres
          total={partiesTotales}
          parts={stats.modes.map((mode) => ({ cle: MODES[mode.cle] ?? mode.cle, n: mode.n }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint="Une cadence classée compte pour le classement Glicko ; une amicale non.">
          Cadences
        </SectionTitle>
        <Barres
          parts={stats.cadences.map((cadence) => ({
            cle: CADENCES[cadence.cle] ?? cadence.cle,
            n: cadence.n,
            note: cadence.classee ? 'classée' : 'amicale',
          }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint="« En cours » compte aussi les parties abandonnées en plan, jamais reprises.">
          Fins de partie
        </SectionTitle>
        <Barres
          parts={[...finales.entries()]
            .sort((premier, second) => second[1] - premier[1])
            .map(([statut, n]) => ({ cle: STATUTS[statut] ?? statut, n }))}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint="Sur toute l’histoire du site : un répertoire d’ouvertures ne se juge pas sur un mois.">
          Ouvertures les plus jouées
        </SectionTitle>
        <Barres
          parts={stats.ouvertures.map((ouverture) => ({
            cle: ouverture.nom,
            n: ouverture.n,
            note: ouverture.eco,
          }))}
        />
      </Card>

      <Card className="p-4 lg:col-span-2">
        <SectionTitle hint="Les parties commencées, par heure locale. C’est l’heure où il faut éviter de redémarrer le serveur.">
          Heures de jeu
        </SectionTitle>
        <Histogramme
          valeurs={stats.heures}
          etiquette={(heure) => `${String(heure).padStart(2, '0')} h`}
        />
      </Card>
    </div>
  )
}

/** Les fins de partie, dites en français. */
const STATUTS: Record<string, string> = {
  playing: 'En cours',
  checkmate: 'Échec et mat',
  resign: 'Abandon',
  timeout: 'Temps écoulé',
  draw: 'Nulle convenue',
  stalemate: 'Pat',
  repetition: 'Répétition',
  fiftyMoves: 'Règle des cinquante coups',
  insufficient: 'Matériel insuffisant',
  aborted: 'Interrompue',
}

// ─────────────────────────────────────────────────────────────────────────────
//  Qui s'en sert
// ─────────────────────────────────────────────────────────────────────────────

function Public({ stats }: { stats: Statistiques }) {
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
        <SectionTitle hint="Calculé sur les seuls comptes créés pendant la période : un taux mesuré sur tout l’historique ne bougerait plus jamais.">
          Ce que deviennent les nouveaux comptes
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Mesure
            titre="Ont joué au moins une partie"
            valeur={part(retention.ontJoue, retention.inscrits)}
            note={`${nombre(retention.ontJoue)} sur ${nombre(retention.inscrits)} inscrits`}
            ton={
              retention.inscrits >= 10 && retention.ontJoue / retention.inscrits < 0.5
                ? 'attention'
                : undefined
            }
          />
          <Mesure
            titre="Revenus au moins un jour après"
            valeur={part(retention.revenus, retention.inscrits)}
            note={`${nombre(retention.revenus)} comptes revus le lendemain ou plus tard`}
          />
          <Mesure
            titre="Ont laissé une adresse"
            valeur={part(retention.avecAdresse, retention.inscrits)}
            note={`${nombre(retention.adresseConfirmee)} confirmées — les autres ne pourront pas récupérer leur mot de passe`}
          />
          <Mesure
            titre="Leçons terminées"
            valeur={stats.apprentissage.terminees}
            note={`${nombre(stats.apprentissage.suivies)} entamées par ${nombre(stats.apprentissage.joueurs)} joueurs`}
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle hint="Par tranches de cent points, toutes cadences confondues, comptes ayant au moins une partie classée.">
          Répartition des niveaux
        </SectionTitle>
        {ordonnees.length === 0 ? (
          <p className="py-3 text-[12px] text-faint">Aucune partie classée pour l’instant.</p>
        ) : (
          <Histogramme
            valeurs={ordonnees.map(([, n]) => n)}
            etiquette={(index) => String(ordonnees[index]?.[0] ?? '')}
            couleur="var(--q-great)"
          />
        )}
      </Card>

      <Card className="p-4 lg:col-span-2">
        <SectionTitle hint="Les comptes qui ont le plus joué sur la période. Une partie compte pour ses deux joueurs.">
          Joueurs les plus actifs
        </SectionTitle>
        {stats.meilleursJoueurs.length === 0 ? (
          <p className="py-3 text-[12px] text-faint">Aucune partie sur la période.</p>
        ) : (
          <Barres
            parts={stats.meilleursJoueurs.map((joueur) => ({
              cle: joueur.pseudo,
              n: joueur.parties,
              note: `vu le ${new Date(joueur.derniere).toLocaleDateString('fr-FR')}`,
            }))}
          />
        )}
      </Card>
    </div>
  )
}
