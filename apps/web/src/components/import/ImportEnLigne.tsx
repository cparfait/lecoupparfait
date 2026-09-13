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

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { MarqueService } from '@/components/brand/MarqueService.tsx'
import { useT } from '@/lib/i18n/index.tsx'

export function ImportEnLigne({
  onChoisir,
  serviceInitial = 'chesscom',
}: {
  /** Appelé au clic sur une partie : PGN à analyser et camp du joueur. */
  onChoisir: (pgn: string, camp: Color) => void
  /** Service présélectionné : celui de la fiche, ou celui dont on a le pseudo. */
  serviceInitial?: SourceEnLigne
}) {
  const t = useT()
  const chesscomUsername = usePreferences((state) => state.chesscomUsername)
  const lichessUsername = usePreferences((state) => state.lichessUsername)
  const set = usePreferences((state) => state.set)
  // Les pseudos mémorisés n'arrivent qu'après le premier rendu.
  const prefsHydratees = usePreferences((state) => state.hydrated)

  const [source, setSource] = useState<SourceEnLigne>(serviceInitial)
  // Le service demandé par la page peut n'être connu qu'après montage
  // (adresse lue dans un effet, pseudos relus du stockage).
  useEffect(() => setSource(serviceInitial), [serviceInitial])
  const [parties, setParties] = useState<PartieImportee[] | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const pseudo = source === 'chesscom' ? chesscomUsername : lichessUsername
  const clePseudo = source === 'chesscom' ? 'chesscomUsername' : 'lichessUsername'

  // Numéro de la dernière demande : une réponse arrivée après un changement
  // de service ou de pseudo ne doit pas remplir la liste de l'autre.
  const demande = useRef(0)

  const charger = useCallback(async () => {
    if (!pseudo.trim()) return
    const numero = ++demande.current
    setChargement(true)
    setErreur(null)
    setParties(null)
    try {
      const resultat = await chargerParties(source, pseudo.trim())
      if (numero !== demande.current) return
      setParties(resultat)
      if (resultat.length === 0) {
        setErreur(t('misc.noRecentGame'))
      }
    } catch (echec) {
      if (numero !== demande.current) return
      setErreur((echec instanceof Error ? echec.message : '') || t('misc.fetchFailed'))
    } finally {
      if (numero === demande.current) setChargement(false)
    }
  }, [source, pseudo, t])

  /*
    Le service choisi charge tout seul.

    Le pseudo est mémorisé, mais il fallait encore appuyer sur « Charger » :
    choisir « Chess.com » puis « Lichess » ne changeait rien à l'écran, et l'on
    croyait la bascule cassée. Dès qu'un service a un pseudo connu, ses
    parties arrivent — au dépliage comme au changement de service. Le bouton
    reste pour recharger, ou après avoir tapé un pseudo.
  */
  useEffect(() => {
    if (!prefsHydratees) return
    void charger()
    // Au changement de service, et une fois les pseudos relus : pas à chaque
    // lettre tapée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, prefsHydratees])

  return (
    <div className="space-y-3">
      <SegmentedControl
        value={source}
        onChange={(valeur) => {
          setSource(valeur)
          setParties(null)
          setErreur(null)
        }}
        label={t('bits.service')}
        // La vignette du service dans l'onglet : les deux se choisissent d'un
        // coup d'œil, à leur couleur, plutôt qu'en lisant deux mots proches.
        options={SOURCES.map((entry) => ({
          value: entry.id,
          label: (
            <span className="inline-flex items-center justify-center gap-1.5">
              <MarqueService service={entry.id} taille={14} />
              {entry.label}
            </span>
          ),
        }))}
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
          placeholder={`ton pseudo ${source === 'chesscom' ? 'Chess.com' : 'Lichess'}`}
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
          {t('bits.load')}
        </Button>
      </form>

      {erreur && <p className="text-xs text-[var(--q-blunder)]">{erreur}</p>}

      {chargement && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Spinner size={12} /> {t('misc.readingPublic')}
        </p>
      )}

      {parties && parties.length > 0 && (
        <>
          {/* Trois parties visibles, le reste au défilement.

              La liste montrait jusqu'à trente lignes : sur téléphone, le
              réglage de profondeur et le bouton de lancement passaient loin
              sous le bord, et l'on ne savait plus où en était l'écran. On
              vient le plus souvent chercher la dernière partie jouée, ou
              l'une des deux d'avant ; au-delà, on fait défiler le cadre. */}
          {/* Pas d'`overscroll-contain` : arrivé au bout des trois lignes, le
              geste doit continuer la page. Retenu ici, le doigt bute sur un
              cadre de dix rems au milieu de l'écran et l'on croit la page
              bloquée. */}
          <ul className="max-h-[10.5rem] space-y-1 overflow-y-auto pr-1">
            {parties.map((partie) => (
              <li key={partie.id}>
                <LignePartie partie={partie} onChoisir={onChoisir} />
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-faint">{t('misc.notSaved')}</p>
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
  const t = useT()
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
            {t(
              issue === 'gagne'
                ? 'rest.won'
                : issue === 'perdu'
                  ? 'rest.lost'
                  : issue === 'nulle'
                    ? 'rest.drawn'
                    : 'rest.noResult',
            )}
          </span>
        </span>
        <span className="block text-[12px] text-faint">
          {t(partie.monCamp === 'w' ? 'rest.white' : 'rest.black')} · {partie.cadence}
          {partie.date > 0 && ` · ${new Date(partie.date).toLocaleDateString('fr-FR')}`}
        </span>
      </button>
      {partie.url && (
        <a
          href={partie.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t('misc.seeAtSource')}
          className="shrink-0 text-faint transition-colors hover:text-ink"
        >
          <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </div>
  )
}
