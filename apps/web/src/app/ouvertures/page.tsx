'use client'

/**
 * Explorateur d'ouvertures.
 *
 * Trois façons d'y entrer, parce que trois questions différentes amènent ici :
 *
 *  - **« Comment ça s'appelle, ce que je joue ? »** → on joue les coups sur
 *    l'échiquier et le nom apparaît à mesure.
 *  - **« C'est quoi la sicilienne ? »** → recherche par nom.
 *  - **« Qu'est-ce qui existe ? »** → parcours par volume ECO.
 *
 * Le jeu de données compte 3 810 ouvertures nommées, sous licence CC0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, RotateCcw, Search, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { PieceSymbol, Square } from 'chess.js'
import { ECO_VOLUMES } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { useMoveStats, useOpeningStats, type StatsBand } from '@/lib/game/useOpeningStats.ts'
import { playMoveFor } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useMoveWords, useSan } from '@/lib/notation.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function OpeningsPage() {
  const { book, ready } = useOpeningBook()
  const locale = usePreferences((state) => state.locale)

  const format = useSan()
  const dire = useMoveWords()

  /**
   * Tranche de classement des statistiques.
   *
   * Le gambit qui « marche » à 800 Elo est réfuté à 1800 : une moyenne de tous
   * les niveaux tromperait précisément ceux qui en ont le plus besoin.
   */
  const [band, setBand] = useState<StatsBand>('debutant')
  const stats = useOpeningStats()
  const [fen, setFen] = useState(START)
  const [history, setHistory] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [query, setQuery] = useState('')
  const [volume, setVolume] = useState<string | null>(null)

  /*
    Le nom demandé par l'adresse.

    « Explorer cette ouverture », depuis les statistiques, envoie ici sur
    `?q=Ouverture hongroise` : sans cette lecture, le lien ouvrait
    l'explorateur à vide et il fallait retaper le nom qu'on venait de cliquer.

    Lu dans un effet plutôt qu'avec `useSearchParams` : le paramètre ne sert
    qu'au premier rendu, et cette forme évite d'imposer une frontière de
    suspense à toute la page pour une chaîne de caractères.
  */
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('q')
    if (demande) setQuery(demande)
  }, [])

  // ── Ouverture de la position courante ───────────────────────────────────
  const current = useMemo(() => book?.lookup(fen, locale) ?? null, [book, fen, locale])

  const deepest = useMemo(() => {
    if (!book || history.length === 0) return null
    return book.identify(history, locale)
  }, [book, history, locale])

  const results = useMemo(() => {
    if (!book) return []
    if (query.trim().length >= 2) return book.search(query, 40, locale)
    if (volume) return book.byVolume(volume, locale).slice(0, 60)
    return []
  }, [book, query, volume, locale])

  const legalMoves = useLegalMoves(fen)

  /**
   * Continuations théoriques depuis la position courante.
   *
   * Le calcul vit dans le livre plutôt qu'ici : il s'arrête de lui-même au-delà
   * de la profondeur répertoriée, là où essayer les trente coups légaux ne peut
   * plus rien trouver. On classe du coup le plus tôt nommé au plus tardif —
   * l'ordre dans lequel on descend naturellement l'arbre.
   */
  const continuations = useMemo(() => {
    if (!book) return []
    return book
      .continuations(fen, locale)
      .map(({ san, match }) => ({ san, opening: match }))
      .sort((a, b) => a.opening.ply - b.opening.ply || a.san.localeCompare(b.san))
      .slice(0, 14)
  }, [book, fen, locale])

  // ── Actions ─────────────────────────────────────────────────────────────
  const play = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const board = new Chess(fen, { skipValidation: true })
      try {
        const move = board.move({ from, to, promotion: promotion ?? 'q' })
        setFen(board.fen())
        setHistory((current) => [...current, move.san])
        setLastMove({ from: move.from, to: move.to })
        playMoveFor(move)
      } catch {
        // Coup illégal : l'échiquier ne le proposait pas, rien à faire.
      }
    },
    [fen],
  )

  const playSan = useCallback(
    (san: string) => {
      const board = new Chess(fen, { skipValidation: true })
      try {
        const move = board.move(san)
        setFen(board.fen())
        setHistory((current) => [...current, move.san])
        setLastMove({ from: move.from, to: move.to })
        // `isCheckmate: false` en dur, ici, disait « une ligne d'ouverture ne
        // mate pas » — c'est faux, le livre en contient. `playMoveFor` le lit
        // dans le SAN comme partout ailleurs.
        playMoveFor(move)
      } catch {
        // Ligne obsolète : on ignore plutôt que de casser l'exploration.
      }
    },
    [fen],
  )

  /**
   * Charge une ouverture complète sur l'échiquier.
   *
   * Le format compact stocke la suite en UCI plutôt qu'en PGN : c'est plus
   * court et sans ambiguïté à rejouer.
   */
  const loadLine = useCallback((uci: string) => {
    const board = new Chess()
    const played: string[] = []
    for (const token of uci.split(' ').filter(Boolean)) {
      try {
        played.push(
          board.move({
            from: token.slice(0, 2) as Square,
            to: token.slice(2, 4) as Square,
            promotion: (token[4] as PieceSymbol) ?? undefined,
          }).san,
        )
      } catch {
        break
      }
    }
    setFen(board.fen())
    setHistory(played)
    const verbose = board.history({ verbose: true })
    const last = verbose[verbose.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)
  }, [])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const board = new Chess()
    const kept = history.slice(0, -1)
    for (const san of kept) {
      try {
        board.move(san)
      } catch {
        break
      }
    }
    setFen(board.fen())
    setHistory(kept)
    const verbose = board.history({ verbose: true })
    const last = verbose[verbose.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)
  }, [history])

  const reset = useCallback(() => {
    setFen(START)
    setHistory([])
    setLastMove(null)
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={26} className="text-accent" />
      </div>
    )
  }

  return (
    <div className="etude mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-5 lg:py-8">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Explorateur d’ouvertures
        </h1>
        {/* Il fallait le dire : sans cette phrase, on attend que l'ordinateur
            réponde et on croit l'échiquier cassé. Ce n'est pas une partie,
            c'est un plateau d'étude où l'on joue les deux camps. */}
        {/* En paysage sur téléphone, cette phrase coûterait trois rangées
            d'échiquier ; elle reste partout ailleurs. */}
        <p className="mt-1.5 text-sm text-muted paysage:hidden">
          {book?.size.toLocaleString('fr-FR')} ouvertures répertoriées.{' '}
          <strong className="font-semibold text-ink">Tu joues les deux couleurs</strong> — personne
          ne répond à ta place : c’est un plateau d’étude, pas une partie. Avance coup par coup, sur
          l’échiquier ou en cliquant dans les listes, et vois où mène chaque branche.
        </p>
      </div>

      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="etude-plateau min-w-0">
          <div className="etude-cadre">
            <ChessBoard
              fitParentHeight
              fen={fen}
              playable="both"
              legalMoves={legalMoves}
              onMove={play}
              lastMove={lastMove}
            />
          </div>

          <div className="mt-2 flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              onClick={undo}
              disabled={history.length === 0}
            >
              Reculer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw size={14} />}
              onClick={reset}
              disabled={history.length === 0}
            >
              Position initiale
            </Button>
          </div>

          {history.length > 0 && (
            <Card className="mt-2 p-3 paysage:hidden">
              <p className="font-mono text-[14px] leading-relaxed">
                {history
                  .map((san, index) =>
                    index % 2 === 0
                      ? `${index / 2 + 1}. ${format(san)}`
                      : locale === 'fr'
                        ? format(san)
                        : format(san),
                  )
                  .join(' ')}
              </p>
            </Card>
          )}

          {/* Ouverture reconnue */}
          {/* En paysage sur téléphone, la colonne du plateau n'a de place que
              pour le plateau et ses deux boutons : les cartes de texte
              reprendraient trois rangées d'échiquier. */}
          <Card glow className="mt-2 p-4 paysage:hidden">
            {current || deepest ? (
              <>
                <div className="flex items-center gap-2">
                  <Chip tone="accent">{(current ?? deepest)!.eco}</Chip>
                  <p className="min-w-0 flex-1 text-sm font-semibold">
                    {(current ?? deepest)!.label}
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-faint">
                  {current
                    ? 'Position exactement répertoriée.'
                    : `Dernière position connue au coup ${Math.ceil((deepest?.atPly ?? 0) / 2)}. Tu es sorti de la théorie.`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Nom anglais : {(current ?? deepest)!.name}
                </p>
              </>
            ) : history.length === 0 ? (
              /*
                La position de départ n'est pas « non répertoriée ».

                On arrivait sur cet écran et le premier message reçu était un
                constat d'échec — « cette position n'est pas répertoriée » —
                affiché sur la position initiale, celle dont *toutes* les
                ouvertures partent. C'est faux au sens strict, et c'est surtout
                un mauvais accueil : on ne sait pas ce qu'on est censé faire,
                on croit avoir cassé quelque chose avant d'avoir joué un coup.
              */
              <p className="text-sm leading-relaxed text-muted">
                Joue un premier coup sur l’échiquier, ou choisis une ouverture dans la liste. Chaque
                branche porte son nom et son code&nbsp;: tu verras l’ouverture se préciser à mesure
                que tu avances.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Cette position n’est pas répertoriée. Joue un coup connu, ou choisis une ouverture
                dans la liste.
              </p>
            )}
          </Card>
        </div>

        {/* ── Panneau de droite ────────────────────────────────────── */}
        <div className="etude-aside flex min-w-0 flex-col gap-3">
          {/* Ce que les joueurs jouent vraiment ici */}
          {stats && (
            <PopularMoves
              fen={fen}
              band={band}
              onBand={setBand}
              onPlay={playSan}
              format={format}
              maxPlies={stats.plies}
            />
          )}

          {/* Continuations */}
          {continuations.length > 0 && (
            <Card className="overflow-hidden">
              <p className="border-b border-line/60 px-4 py-2.5 text-[12px] font-semibold text-faint">
                Continuations théoriques
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {continuations.map(({ san, opening }) => (
                  <li key={san}>
                    <button
                      type="button"
                      onClick={() => playSan(san)}
                      title={dire(san)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span className="w-14 shrink-0 font-mono text-sm font-semibold">
                        {format(san)}
                      </span>
                      <span className="w-9 shrink-0 text-[12px] text-faint">{opening.eco}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-muted">
                        {opening.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recherche */}
          <Card className="p-4">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVolume(null)
                }}
                placeholder="Chercher une ouverture ou un code ECO…"
                aria-label="Rechercher une ouverture"
                className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ECO_VOLUMES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setVolume(volume === entry.id ? null : entry.id)
                    setQuery('')
                  }}
                  title={entry.description.fr}
                  className={clsx(
                    // 26 points de haut ne se visent pas au pouce : la zone
                    // touchable monte à 36 sans changer la typographie.
                    'inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    volume === entry.id
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {entry.id} · {entry.name.fr}
                </button>
              ))}
            </div>

            {volume && (
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                {ECO_VOLUMES.find((entry) => entry.id === volume)?.description.fr}
              </p>
            )}
          </Card>

          {/* Résultats */}
          <Card className="min-h-[200px] flex-1 overflow-hidden">
            {results.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={26} />}
                title="Cherche une ouverture"
                description="Tape un nom — sicilienne, française, gambit dame — ou choisis un volume ECO ci-dessus."
              />
            ) : (
              <ul className="max-h-[520px] overflow-y-auto">
                {results.map((match) => (
                  <li key={match.epd}>
                    <button
                      type="button"
                      onClick={() => loadLine(match.uci)}
                      className="flex w-full items-baseline gap-2.5 border-b border-line/40 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-hover"
                    >
                      <span className="w-9 shrink-0 font-mono text-[12px] font-semibold text-accent">
                        {match.eco}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">
                          {match.label}
                        </span>
                        <span className="block truncate text-[12px] text-faint">{match.name}</span>
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-faint">
                        {Math.ceil(match.ply / 2)} coups
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-faint">
        Jeu de données <span className="font-mono">lichess-org/chess-openings</span>, domaine public
        (CC0).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ce que les joueurs jouent vraiment
// ─────────────────────────────────────────────────────────────────────────────

const BANDS: Array<{ id: StatsBand; label: string }> = [
  { id: 'debutant', label: 'Débutant' },
  { id: 'club', label: 'Club' },
  { id: 'fort', label: 'Fort' },
]

/**
 * Statistiques de la position : fréquence et résultat de chaque coup.
 *
 * Le livre dit comment s'appelle une suite ; ceci dit si elle réussit. Pour
 * quelqu'un qui apprend, c'est la seule des deux informations sur laquelle on
 * peut décider — un nom n'a jamais aidé personne à choisir un coup.
 *
 * La barre de résultat se lit d'un coup d'œil : blanc pour les victoires des
 * Blancs, gris pour les nulles, sombre pour les Noirs. Le chiffre à côté est le
 * score du camp au trait, nulle comptée pour un demi-point — la convention du
 * classement, celle que tout joueur connaît déjà.
 */
function PopularMoves({
  fen,
  band,
  onBand,
  onPlay,
  format,
  maxPlies,
}: {
  fen: string
  band: StatsBand
  onBand: (band: StatsBand) => void
  onPlay: (san: string) => void
  format: (san: string) => string
  /** Profondeur couverte par les données, en demi-coups. */
  maxPlies: number
}) {
  const moves = useMoveStats(fen, band)
  const dire = useMoveWords()
  const total = moves.reduce((sum, move) => sum + move.games, 0)

  // Demi-coups déjà joués, lus dans la FEN : numéro de coup et trait suffisent.
  const parts = fen.split(' ')
  const ply = (Number(parts[5] ?? '1') - 1) * 2 + (parts[1] === 'b' ? 1 : 0)
  const tropLoin = ply >= maxPlies

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line/60 px-4 py-2.5">
        <p className="min-w-0 flex-1 text-[12px] font-semibold text-faint">Ce qu’on joue ici</p>
        <div className="flex shrink-0 gap-0.5 rounded-full bg-surface-strong p-0.5">
          {BANDS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onBand(entry.id)}
              aria-pressed={band === entry.id}
              className={clsx(
                'rounded-full px-2 py-0.5 text-[12px] font-medium transition-colors',
                band === entry.id
                  ? 'bg-accent text-[var(--accent-contrast)]'
                  : 'text-muted hover:text-ink',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {moves.length === 0 ? (
        // Deux raisons très différentes de n'avoir rien à dire, et il faut les
        // distinguer : « les données s'arrêtent ici » se comprend et se prévoit,
        // « trop peu de parties » veut dire qu'on quitte les sentiers battus.
        <p className="px-4 py-4 text-[14px] text-muted">
          {tropLoin ? (
            <>
              Les statistiques couvrent les{' '}
              <strong className="font-semibold text-ink">{maxPlies / 2} premiers coups</strong>.
              Au-delà, chaque position devient trop rare pour qu’un pourcentage veuille dire quelque
              chose.
            </>
          ) : (
            <>
              Moins de quarante parties à ce niveau depuis cette position : trop peu pour dire quoi
              que ce soit d’honnête. Tu es déjà sorti des sentiers battus.
            </>
          )}
        </p>
      ) : (
        <>
          <ul>
            {moves.map((move) => (
              <li key={move.san}>
                <button
                  type="button"
                  onClick={() => onPlay(move.san)}
                  title={`${dire(move.san)} — ${move.games.toLocaleString('fr-FR')} parties`}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                >
                  <span className="w-12 shrink-0 font-mono text-sm font-semibold">
                    {format(move.san)}
                  </span>
                  <span className="w-11 shrink-0 text-right text-[12px] tabular-nums text-faint">
                    {move.share.toFixed(0)} %
                  </span>

                  {/* Répartition des résultats, à l'échelle de la barre. */}
                  <span
                    className="flex h-3.5 min-w-0 flex-1 overflow-hidden rounded-[3px]"
                    title={`${move.games.toLocaleString('fr-FR')} parties`}
                  >
                    <span
                      style={{ width: `${(move.white / move.games) * 100}%` }}
                      className="bg-[var(--eval-white)]"
                    />
                    <span
                      style={{ width: `${(move.draws / move.games) * 100}%` }}
                      className="bg-[var(--surface-strong)]"
                    />
                    <span
                      style={{ width: `${(move.black / move.games) * 100}%` }}
                      className="bg-[var(--eval-black)]"
                    />
                  </span>

                  <span
                    className="w-11 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                    style={{
                      color:
                        move.score >= 53
                          ? 'var(--q-best)'
                          : move.score <= 47
                            ? 'var(--q-blunder)'
                            : 'var(--text-muted)',
                    }}
                  >
                    {move.score.toFixed(0)} %
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="border-t border-line/60 px-4 py-2 text-[12px] text-faint">
            {total.toLocaleString('fr-FR')} parties · coup {Math.floor(ply / 2) + 1} sur{' '}
            {maxPlies / 2} couverts · le second pourcentage est le score du camp au trait, nulle
            comptée pour un demi-point.
          </p>
        </>
      )}
    </Card>
  )
}
