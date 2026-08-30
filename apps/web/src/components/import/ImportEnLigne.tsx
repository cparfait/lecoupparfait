'use client'

/**
 * « Depuis ton compte en ligne ».
 *
 * Colle un pseudo, vois tes parties, clique, c'est analysé. Sans compte chez
 * nous, sans installation, sans rejouer quoi que ce soit — la plupart des gens
 * ont déjà des centaines de parties quelque part, et leur demander d'en jouer
 * cinquante de plus pour découvrir l'analyse est le meilleur moyen qu'ils ne
 * la découvrent jamais.
 *
 * Rien n'est enregistré : la liste vit le temps de la visite.
 */

import { useCallback, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import type { Color } from 'chess.js'
import clsx from 'clsx'
import { Button, SegmentedControl, Spinner } from '@/components/ui/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import {
  chargerParties,
  issuePour,
  SOURCES,
  type PartieImportee,
  type SourceEnLigne,
} from '@/lib/import/enligne.ts'

export function ImportEnLigne({
  onChoisir,
}: {
  /** Appelé au clic sur une partie : PGN à analyser et camp du joueur. */
  onChoisir: (pgn: string, camp: Color) => void
}) {
  const chesscomUsername = usePreferences((state) => state.chesscomUsername)
  const lichessUsername = usePreferences((state) => state.lichessUsername)
  const set = usePreferences((state) => state.set)

  const [source, setSource] = useState<SourceEnLigne>('chesscom')
  const [parties, setParties] = useState<PartieImportee[] | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const pseudo = source === 'chesscom' ? chesscomUsername : lichessUsername
  const clePseudo = source === 'chesscom' ? 'chesscomUsername' : 'lichessUsername'

  const charger = useCallback(async () => {
    if (!pseudo.trim()) return
    setChargement(true)
    setErreur(null)
    setParties(null)
    try {
      const resultat = await chargerParties(source, pseudo.trim())
      setParties(resultat)
      if (resultat.length === 0) {
        setErreur('Aucune partie standard récente sur ce compte.')
      }
    } catch (echec) {
      setErreur(echec instanceof Error ? echec.message : 'Récupération impossible.')
    } finally {
      setChargement(false)
    }
  }, [source, pseudo])

  return (
    <div className="space-y-3">
      <SegmentedControl
        value={source}
        onChange={(valeur) => {
          setSource(valeur)
          setParties(null)
          setErreur(null)
        }}
        label="Service"
        options={SOURCES.map((entry) => ({ value: entry.id, label: entry.label }))}
      />

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void charger()
        }}
      >
        <input
          value={pseudo}
          onChange={(event) => set(clePseudo, event.target.value)}
          placeholder="ton pseudo"
          spellCheck={false}
          autoComplete="off"
          aria-label={`Pseudo ${source === 'chesscom' ? 'Chess.com' : 'Lichess'}`}
          className="h-10 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <Button
          type="submit"
          size="md"
          variant="secondary"
          loading={chargement}
          disabled={!pseudo.trim()}
          icon={<Download size={15} aria-hidden />}
        >
          Charger
        </Button>
      </form>

      {erreur && <p className="text-xs text-[var(--q-blunder)]">{erreur}</p>}

      {chargement && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Spinner size={12} /> Lecture des parties publiques…
        </p>
      )}

      {parties && parties.length > 0 && (
        <>
          {/* Assez haut pour montrer une dizaine de parties.
          
              Le plafond était de 288 px, soit cinq lignes sur les trente que la
              route rapporte. On ne voyait donc pas la partie qu'on venait de
              jouer si l'on avait joué depuis, et retrouver une partie d'avant-
              hier demandait de faire défiler un cadre haut comme trois lignes,
              à l'intérieur d'une page qui défile elle-même.
          
              Deux défilements imbriqués sont toujours une faute : la molette ne
              sait pas lequel des deux on visait. On garde le cadre — trente
              parties déroulées feraient une page interminable — mais assez haut
              pour qu'on n'ait presque jamais à s'en servir. */}
          <ul className="max-h-[34rem] space-y-1 overflow-y-auto pr-1">
            {parties.map((partie) => (
              <li key={partie.id}>
                <LignePartie partie={partie} onChoisir={onChoisir} />
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-faint">
            Ces parties ne sont pas enregistrées : elles disparaissent en quittant la page.
          </p>
        </>
      )}
    </div>
  )
}

function LignePartie({
  partie,
  onChoisir,
}: {
  partie: PartieImportee
  onChoisir: (pgn: string, camp: Color) => void
}) {
  const issue = issuePour(partie)
  const adversaire = partie.monCamp === 'w' ? partie.noir : partie.blanc

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-2 transition-colors hover:bg-surface-hover">
      <span
        aria-hidden
        className={clsx(
          'h-6 w-1 shrink-0 rounded-full',
          issue === 'gagne' && 'bg-[var(--q-best)]',
          issue === 'perdu' && 'bg-[var(--q-blunder)]',
          issue === 'nulle' && 'bg-line',
          issue === 'inconnue' && 'bg-line',
        )}
      />
      <button
        type="button"
        onClick={() => onChoisir(partie.pgn, partie.monCamp)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-medium">
          contre {adversaire}
          <span className="ml-1.5 font-normal text-faint">
            {issue === 'gagne'
              ? 'gagnée'
              : issue === 'perdu'
                ? 'perdue'
                : issue === 'nulle'
                  ? 'nulle'
                  : 'sans résultat'}
          </span>
        </span>
        <span className="block text-[11px] text-faint">
          {partie.monCamp === 'w' ? 'Blancs' : 'Noirs'} · {partie.cadence}
          {partie.date > 0 && ` · ${new Date(partie.date).toLocaleDateString('fr-FR')}`}
        </span>
      </button>
      {partie.url && (
        <a
          href={partie.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Voir la partie chez la source"
          className="shrink-0 text-faint transition-colors hover:text-ink"
        >
          <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </div>
  )
}
