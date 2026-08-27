/**
 * Reconnaissance des ouvertures.
 *
 * La clé de recherche est l'**EPD** : la FEN privée de ses deux compteurs de
 * coups. Deux parties qui arrivent à la même position par des ordres de coups
 * différents — une *transposition* — partagent le même EPD et sont donc
 * reconnues comme la même ouverture. C'est indispensable : la Nimzo-indienne
 * s'atteint par au moins quatre ordres de coups distincts.
 *
 * Le jeu de données (3 810 ouvertures nommées, CC0, Lichess) est injecté depuis
 * l'extérieur : ce module n'embarque rien, il se contente d'indexer.
 */

import { Chess } from 'chess.js'
import type { OpeningEntry } from './types.ts'

/** Format compact produit par `scripts/build-openings.mjs`. */
export interface CompactOpeningsFile {
  format: 'coupparfait-openings-v1' | 'coupparfait-openings-v2'
  source: string
  fields: string[]
  rows: Array<
    [epd: string, eco: string, name: string, nameFr: string, ply: number, uci?: string]
  >
}

export interface OpeningMatch {
  eco: string
  name: string
  nameFr: string
  /** Nom dans la langue demandée. */
  label: string
  /** Nombre de demi-coups de la ligne théorique. */
  ply: number
  epd: string
  /** Suite de coups en UCI, séparés par des espaces. Vide en format v1. */
  uci: string
}

/**
 * Index d'ouvertures interrogeable par position.
 *
 * Construit une seule fois au démarrage, il répond en temps constant.
 */
export class OpeningBook {
  private readonly byEpd = new Map<string, OpeningMatch>()
  /** Profondeur maximale du livre : au-delà, inutile de chercher. */
  private maxPly = 0

  constructor(file?: CompactOpeningsFile) {
    if (file) this.load(file)
  }

  load(file: CompactOpeningsFile): void {
    for (const [epd, eco, name, nameFr, ply, uci] of file.rows) {
      this.byEpd.set(epd, { eco, name, nameFr, label: nameFr, ply, epd, uci: uci ?? '' })
      if (ply > this.maxPly) this.maxPly = ply
    }
  }

  /** Ouverture correspondant à une position déjà connue, par son EPD. */
  byEpdKey(epd: string, locale: 'fr' | 'en' = 'fr'): OpeningMatch | null {
    const match = this.byEpd.get(epd)
    if (!match) return null
    return { ...match, label: locale === 'fr' ? match.nameFr : match.name }
  }

  get size(): number {
    return this.byEpd.size
  }

  get depth(): number {
    return this.maxPly
  }

  /** Ouverture correspondant exactement à une position, ou `null`. */
  lookup(fen: string, locale: 'fr' | 'en' = 'fr'): OpeningMatch | null {
    const match = this.byEpd.get(toEpd(fen))
    if (!match) return null
    return { ...match, label: locale === 'fr' ? match.nameFr : match.name }
  }

  /**
   * Ouverture d'une partie : le **dernier** nom rencontré en remontant la suite
   * de coups. On garde le plus profond parce qu'il est le plus précis — savoir
   * qu'on joue « la Najdorf, variante anglaise » vaut mieux que « une
   * sicilienne ».
   *
   * @param sanMoves coups de la partie en notation algébrique
   * @returns l'ouverture la plus précise atteinte, et à quel demi-coup
   */
  identify(
    sanMoves: string[],
    locale: 'fr' | 'en' = 'fr',
  ): (OpeningMatch & { atPly: number }) | null {
    const board = new Chess()
    let best: (OpeningMatch & { atPly: number }) | null = null

    const limit = Math.min(sanMoves.length, this.maxPly)
    for (let i = 0; i < limit; i++) {
      try {
        board.move(sanMoves[i]!)
      } catch {
        break
      }
      const match = this.byEpd.get(toEpd(board.fen()))
      if (match) {
        best = {
          ...match,
          label: locale === 'fr' ? match.nameFr : match.name,
          atPly: i + 1,
        }
      }
    }
    return best
  }

  /**
   * Vrai si la position est encore dans la théorie connue.
   * Sert à classer un coup comme « théorie » plutôt que de le juger.
   */
  isInBook(fen: string): boolean {
    return this.byEpd.has(toEpd(fen))
  }

  /** Recherche par nom, pour la barre de recherche de l'explorateur. */
  search(query: string, limit = 20, locale: 'fr' | 'en' = 'fr'): OpeningMatch[] {
    const needle = normalise(query)
    if (needle.length < 2) return []
    const results: Array<{ match: OpeningMatch; score: number }> = []

    for (const match of this.byEpd.values()) {
      const haystackFr = normalise(match.nameFr)
      const haystackEn = normalise(match.name)
      const eco = normalise(match.eco)

      let score = 0
      if (eco === needle) score = 100
      else if (haystackFr.startsWith(needle) || haystackEn.startsWith(needle)) score = 60
      else if (haystackFr.includes(needle) || haystackEn.includes(needle)) score = 30
      else continue

      // À pertinence égale, les lignes courtes sont les plus connues.
      score -= match.ply * 0.4
      results.push({ match, score })
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => ({
        ...r.match,
        label: locale === 'fr' ? r.match.nameFr : r.match.name,
      }))
  }

  /** Toutes les ouvertures d'un volume ECO (A à E). */
  byVolume(volume: string, locale: 'fr' | 'en' = 'fr'): OpeningMatch[] {
    const prefix = volume.toUpperCase()
    return [...this.byEpd.values()]
      .filter((m) => m.eco.startsWith(prefix))
      .sort((a, b) => a.eco.localeCompare(b.eco) || a.ply - b.ply)
      .map((m) => ({ ...m, label: locale === 'fr' ? m.nameFr : m.name }))
  }

  /**
   * Familles d'ouvertures : le premier segment du nom, avec le nombre de
   * variantes recensées. C'est l'arborescence de la page « Ouvertures ».
   */
  families(locale: 'fr' | 'en' = 'fr'): Array<{ name: string; count: number; eco: string }> {
    const map = new Map<string, { count: number; eco: string }>()
    for (const match of this.byEpd.values()) {
      const label = locale === 'fr' ? match.nameFr : match.name
      const family = label.split(/\s*[:,]\s*/)[0]!
      const existing = map.get(family)
      if (existing) existing.count++
      else map.set(family, { count: 1, eco: match.eco })
    }
    return [...map.entries()]
      .map(([name, info]) => ({ name, count: info.count, eco: info.eco }))
      .sort((a, b) => b.count - a.count)
  }
}

/** FEN → EPD : on retire le compteur de demi-coups et le numéro de coup. */
export function toEpd(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Volumes ECO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les cinq volumes de l'*Encyclopédie des ouvertures d'échecs*, la
 * classification de référence publiée par Chess Informant depuis 1974.
 */
export const ECO_VOLUMES = [
  {
    id: 'A',
    range: 'A00–A99',
    name: { fr: 'Ouvertures de flanc', en: 'Flank openings' },
    description: {
      fr: "Tout ce qui ne commence ni par 1.e4 ni par 1.d4 d5 : l'anglaise, la Réti, la hollandaise, le Benoni.",
      en: 'Everything that is neither 1.e4 nor 1.d4 d5: English, Réti, Dutch, Benoni.',
    },
  },
  {
    id: 'B',
    range: 'B00–B99',
    name: { fr: 'Semi-ouvertes', en: 'Semi-open games' },
    description: {
      fr: "1.e4 suivi d'autre chose que 1…e5 : la sicilienne, la Caro-Kann, la Pirc, la scandinave.",
      en: '1.e4 followed by anything but 1…e5: Sicilian, Caro-Kann, Pirc, Scandinavian.',
    },
  },
  {
    id: 'C',
    range: 'C00–C99',
    name: { fr: 'Ouvertes & française', en: 'Open games & French' },
    description: {
      fr: "1.e4 e5 — l'espagnole, l'italienne, le gambit du roi — ainsi que la défense française.",
      en: '1.e4 e5 — Ruy Lopez, Italian, King’s Le Coup Parfait — plus the French Defence.',
    },
  },
  {
    id: 'D',
    range: 'D00–D99',
    name: { fr: 'Fermées & indiennes de dame', en: 'Closed games & Grünfeld' },
    description: {
      fr: '1.d4 d5 : le gambit dame et ses innombrables ramifications, plus la Grünfeld.',
      en: '1.d4 d5: the Queen’s Le Coup Parfait and its countless branches, plus the Grünfeld.',
    },
  },
  {
    id: 'E',
    range: 'E00–E99',
    name: { fr: 'Indiennes', en: 'Indian defences' },
    description: {
      fr: "1.d4 Cf6 sans 2…d5 : la nimzo-indienne, l'ouest-indienne, l'est-indienne, la catalane.",
      en: '1.d4 Nf6 without 2…d5: Nimzo-Indian, Queen’s Indian, King’s Indian, Catalan.',
    },
  },
] as const

/** Charge un fichier compact depuis une URL (navigateur) ou un chemin (Node). */
export async function loadOpeningBook(url: string): Promise<OpeningBook> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Impossible de charger les ouvertures depuis ${url} (${response.status})`)
  }
  const file = (await response.json()) as CompactOpeningsFile
  return new OpeningBook(file)
}

/** Convertit une entrée compilée en `OpeningEntry` complet. */
export function toOpeningEntry(match: OpeningMatch, pgn: string, uci: string): OpeningEntry {
  return {
    eco: match.eco,
    name: match.name,
    nameFr: match.nameFr,
    pgn,
    uci,
    epd: match.epd,
    ply: match.ply,
  }
}
