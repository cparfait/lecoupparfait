'use client'

/**
 * Base de finales.
 *
 * Chargée à la demande depuis un fichier statique (443 Ko), puis gardée en
 * mémoire. Le fichier n'est jamais rechargé : on navigue entre les familles
 * sans nouvelle requête.
 */

import { useEffect, useState } from 'react'

export interface EndgamePosition {
  fen: string
  /** Ce qu'il faut obtenir : mater, ou tenir la nulle. */
  target: 'checkmate' | 'draw'
  /** Nombre de coups jusqu'au mat, quand la position est gagnante. */
  mateIn: number | null
  pieces: number
  /** 1 à 5. */
  difficulty: number
  /** Vrai si les tables de finales couvrent la position (≤ 7 pièces). */
  tablebase: boolean
}

export interface EndgameGroup {
  id: string
  name: string
  nameFr: string
  positions: EndgamePosition[]
}

export interface EndgameFamily {
  id: string
  name: string
  nameFr: string
  blurb: string
  icon: string
  order: number
  groups: EndgameGroup[]
}

interface EndgameFile {
  format: string
  source: string
  families: EndgameFamily[]
}

let shared: EndgameFamily[] | null = null
let loading: Promise<EndgameFamily[]> | null = null

export function ensureEndgames(): Promise<EndgameFamily[]> {
  if (shared) return Promise.resolve(shared)
  if (loading) return loading

  loading = fetch('/data/endgames.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<EndgameFile>
    })
    .then((file) => {
      shared = file.families
      return shared
    })
    .catch((error) => {
      // Fichier absent : la page le signalera plutôt que de rester bloquée.
      console.warn('[finales] chargement impossible :', error)
      loading = null
      shared = []
      return shared
    })

  return loading
}

export function useEndgames(): { families: EndgameFamily[] | null; ready: boolean } {
  const [families, setFamilies] = useState<EndgameFamily[] | null>(shared)

  useEffect(() => {
    if (families) return
    let cancelled = false
    void ensureEndgames().then((loaded) => {
      if (!cancelled) setFamilies(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [families])

  return { families, ready: families !== null }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Progression
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'coupparfait.endgameProgress'

/** Positions réussies, par identifiant de groupe puis index. */
export type EndgameProgress = Record<string, number[]>

export function loadEndgameProgress(): EndgameProgress {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as EndgameProgress
  } catch {
    return {}
  }
}

export function markEndgameSolved(groupId: string, index: number): void {
  if (typeof window === 'undefined') return
  try {
    const progress = loadEndgameProgress()
    const solved = new Set(progress[groupId] ?? [])
    solved.add(index)
    progress[groupId] = [...solved].sort((a, b) => a - b)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Stockage refusé : l'entraînement reste jouable, il ne sera pas retenu.
  }
}

/** Nombre de positions réussies dans une famille. */
export function familyProgress(
  family: EndgameFamily,
  progress: EndgameProgress,
): { solved: number; total: number } {
  let solved = 0
  let total = 0
  for (const group of family.groups) {
    total += group.positions.length
    solved += (progress[group.id] ?? []).length
  }
  return { solved, total }
}
