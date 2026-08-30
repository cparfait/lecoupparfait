'use client'

/**
 * Les parties jouées ici, à faire analyser.
 *
 * L'écran d'analyse savait aller chercher des parties chez chess.com et chez
 * Lichess, et ignorait celles jouées sur place : on terminait une partie contre
 * l'ordinateur, on ouvrait « Analyse », et il fallait retrouver le PGN
 * soi-même. L'historique existait pourtant — il était simplement sans porte.
 *
 * Ce bloc passe **avant** l'import en ligne, parce que c'est la réponse la plus
 * probable à « quelle partie veux-tu analyser ? » : celle qu'on vient de jouer.
 * Il ne s'affiche que s'il a quelque chose à montrer, comme [[MesAnalyses]] :
 * une case vide de plus sur un formulaire déjà long n'apprend rien.
 */

import { useEffect, useState } from 'react'
import type { Color } from 'chess.js'
import { Bot, Loader2, Swords, Users } from 'lucide-react'
import { SectionTitle } from '@/components/ui/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

export interface PartieJouee {
  slug: string
  mode: string
  camp: Color
  adversaire: string | null
  botLevel: number | null
  result: string | null
  issue: 'gagnee' | 'perdue' | 'nulle'
  opening: string | null
  coups: number
  jouee: string
  pgn: string
}

/** De quoi lire la provenance d'un coup d'œil, sans phrase. */
const ORIGINE: Record<string, { Icone: typeof Bot; nom: string }> = {
  computer: { Icone: Bot, nom: 'Contre l’ordinateur' },
  local: { Icone: Users, nom: 'À deux sur le même écran' },
}

/** Les parties du serveur temps réel n'ont pas de mode reconnu ici. */
const ORIGINE_PAR_DEFAUT = { Icone: Swords, nom: 'Contre quelqu’un' }

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

export function MesParties({
  onChoisir,
}: {
  /** Le PGN de la partie choisie, et le camp du joueur dans celle-ci. */
  onChoisir: (pgn: string, camp: Color) => void
}) {
  const identite = useIdentite()
  const [parties, setParties] = useState<PartieJouee[] | null>(null)
  const [choisie, setChoisie] = useState<string | null>(null)

  useEffect(() => {
    // `undefined` = on ne sait pas encore ; `null` = personne. Sans compte il
    // n'y a rien d'archivé, et donc rien à demander au serveur.
    if (!identite) {
      setParties(identite === null ? [] : null)
      return
    }
    let vivant = true
    void fetch('/api/parties/terminee?limite=30', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : { parties: [] }))
      .then((donnees: { parties?: PartieJouee[] }) => {
        if (vivant) setParties(donnees.parties ?? [])
      })
      .catch(() => vivant && setParties([]))
    return () => {
      vivant = false
    }
  }, [identite])

  if (!identite || parties === null || parties.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionTitle>Tes parties</SectionTitle>
      <p className="text-xs text-muted">
        Celles que tu as jouées ici. Un clic la charge&nbsp;; il ne reste qu’à lancer
        l’analyse.
      </p>

      <ul className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
        {parties.map((partie) => {
          const origine = ORIGINE[partie.mode] ?? ORIGINE_PAR_DEFAUT
          const Icone = origine.Icone

          return (
            <li key={partie.slug}>
              <button
                type="button"
                onClick={() => {
                  setChoisie(partie.slug)
                  onChoisir(partie.pgn, partie.camp)
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
              >
                <span
                  className="w-1 shrink-0 self-stretch rounded-full"
                  style={{ background: TEINTE[partie.issue] }}
                  aria-hidden
                />
                <Icone size={15} className="shrink-0 text-faint" aria-label={origine.nom} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    contre {partie.adversaire ?? 'un adversaire'}
                    {partie.botLevel !== null && (
                      <span className="font-normal text-faint"> · niveau {partie.botLevel}</span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {[
                      ISSUE[partie.issue],
                      partie.opening,
                      `${partie.coups} demi-coups`,
                      dateCourte(partie.jouee),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>

                {choisie === partie.slug ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-muted" aria-hidden />
                ) : (
                  <Swords size={14} className="shrink-0 text-faint" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** « 12 août » suffit ; l'heure exacte d'une partie n'aide à rien la retrouver. */
function dateCourte(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
