'use client'

/**
 * Statistiques d'ouvertures : ce que les joueurs jouent vraiment.
 *
 * Le livre d'ouvertures dit **comment s'appelle** une suite. Il ne dit pas
 * laquelle est choisie, ni laquelle réussit. Pour un débutant, c'est pourtant
 * la seule question qui aide à décider : savoir qu'une variante s'appelle
 * « Partie espagnole » ne sert à rien tant qu'on ignore que les joueurs de son
 * niveau y marquent moins qu'à l'italienne, faute d'en connaître la théorie.
 *
 * Les chiffres sont calculés à l'avance depuis la base de parties publiée sous
 * CC0 par Lichess, et servis comme un fichier statique. L'application
 * n'interroge personne : c'est ce qui distingue cette approche de leur API, qui
 * demande un jeton et ferait sortir une requête à chaque position consultée.
 */

import { useEffect, useMemo, useState } from 'react'

/** Tranche de classement : les statistiques d'un débutant ne sont pas celles d'un joueur de club. */
export type StatsBand = 'debutant' | 'club' | 'fort'

export interface MoveStats {
  san: string
  /** Parties où ce coup a été joué depuis cette position. */
  games: number
  /** Part de ce coup parmi tous ceux joués ici, 0–100. */
  share: number
  /** Points marqués par le camp au trait, 0–100. Une nulle vaut un demi-point. */
  score: number
  white: number
  draws: number
  black: number
}

interface CompactFile {
  format: string
  plies: number
  bands: Array<{
    id: StatsBand
    label: string
    /** `[epd, [[san, blancs, nulles, noirs], …]]` */
    positions: Array<[string, Array<[string, number, number, number]>]>
  }>
}

/** Index prêt à interroger, construit une fois au chargement. */
export class OpeningStats {
  private readonly byBand = new Map<StatsBand, Map<string, MoveStats[]>>()
  readonly labels = new Map<StatsBand, string>()
  readonly plies: number

  constructor(file: CompactFile) {
    this.plies = file.plies

    for (const band of file.bands) {
      this.labels.set(band.id, band.label)
      const table = new Map<string, MoveStats[]>()

      for (const [epd, moves] of band.positions) {
        let total = 0
        for (const [, w, d, b] of moves) total += w + d + b

        table.set(
          epd,
          moves.map(([san, white, draws, black]) => {
            const games = white + draws + black
            // Le camp au trait se déduit de l'EPD : « … w … » ou « … b … ».
            const whiteToMove = epd.includes(' w ')
            const won = whiteToMove ? white : black
            return {
              san,
              games,
              share: (games / total) * 100,
              // Une nulle vaut un demi-point, comme au classement.
              score: ((won + draws / 2) / games) * 100,
              white,
              draws,
              black,
            }
          }),
        )
      }
      this.byBand.set(band.id, table)
    }
  }

  /** Coups joués depuis cette position, du plus fréquent au moins fréquent. */
  lookup(fen: string, band: StatsBand): MoveStats[] {
    const epd = fen.split(' ').slice(0, 4).join(' ')
    return this.byBand.get(band)?.get(epd) ?? []
  }

  get size(): number {
    let total = 0
    for (const table of this.byBand.values()) total += table.size
    return total
  }
}

let shared: OpeningStats | null = null
let loading: Promise<OpeningStats | null> | null = null

/**
 * Charge le fichier, une seule fois par session.
 *
 * Son absence est un cas normal : les statistiques se construisent avec
 * `npm run data:opening-stats`, et beaucoup d'installations s'en passeront.
 * L'explorateur fonctionne alors comme avant, avec les noms seuls.
 */
function ensureStats(): Promise<OpeningStats | null> {
  if (shared) return Promise.resolve(shared)
  if (loading) return loading

  loading = fetch('/data/opening-stats.json')
    .then((response) => (response.ok ? response.json() : null))
    .then((file: CompactFile | null) => {
      if (!file?.bands) return null
      shared = new OpeningStats(file)
      return shared
    })
    .catch(() => {
      // Fichier absent ou illisible : on continue sans statistiques.
      loading = null
      return null
    })

  return loading
}

export function useOpeningStats(): OpeningStats | null {
  const [stats, setStats] = useState<OpeningStats | null>(shared)

  useEffect(() => {
    if (stats) return
    let cancelled = false
    void ensureStats().then((loaded) => {
      if (!cancelled) setStats(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [stats])

  return stats
}

/** Coups joués depuis une position, pour la tranche demandée. */
export function useMoveStats(fen: string, band: StatsBand): MoveStats[] {
  const stats = useOpeningStats()
  return useMemo(() => stats?.lookup(fen, band) ?? [], [stats, fen, band])
}
