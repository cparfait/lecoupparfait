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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BookOpen, RotateCcw, Search, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { langue, useI18n, useT, type TranslationKey } from '@/lib/i18n/index.tsx'
import { Chess } from 'chess.js'
import type { PieceSymbol, Square } from 'chess.js'
import { ECO_VOLUMES, toEpd } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { CarteEnjeux } from '@/components/ouvertures/CarteEnjeux.tsx'
import { ficheDeLaPartie, ficheEnjeux } from '@/lib/ouvertures/enjeux.ts'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { useMoveStats, useOpeningStats, type StatsBand } from '@/lib/game/useOpeningStats.ts'
import { playMoveFor } from '@/lib/sound.ts'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useMoveWords, useSan } from '@/lib/notation.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function OpeningsPage() {
  const t = useT()
  /* Les nombres suivent la langue de l'interface : voir `langue()`. */
  const bcp47 = langue(useI18n().locale).bcp47
  const { book, ready } = useOpeningBook()
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

  const plateau = useRef<HTMLDivElement>(null)

  /**
   * Ramène l'échiquier à l'écran.
   *
   * Sur téléphone, les listes se rangent **sous** le plateau : quand on choisit
   * une ouverture, elle est deux écrans plus haut. La position changeait bien,
   * mais rien ne bougeait là où l'on regardait — on tapait, on retapait, et on
   * concluait que ces lignes n'étaient pas cliquables.
   *
   * Le défilement ne part que si le plateau est hors de vue : sur grand écran
   * il est déjà dans la colonne d'à côté, et sauter à chaque clic serait pire
   * que le mal.
   */
  const montrerLePlateau = useCallback(() => {
    const element = plateau.current
    if (!element) return
    const { top, bottom } = element.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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

  /*
    La fiche d'enjeux demandée par l'adresse.

    « Voir sur l'échiquier », depuis la page des enjeux, envoie ici sur
    `?fiche=sicilienne` : on rejoue la suite qui définit l'ouverture, et la
    fiche se reconnaît alors d'elle-même sur la position obtenue — rien à
    transmettre de plus que son identifiant.
  */
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('fiche')
    if (!demande) return
    const fiche = ficheEnjeux(demande)
    if (!fiche) return

    const echiquier = new Chess()
    const joues: string[] = []
    for (const san of fiche.coups) {
      try {
        joues.push(echiquier.move(san).san)
      } catch {
        // Une fiche dont la suite n'est pas jouable est un bug de contenu, que
        // `check:enjeux` refuse déjà. On s'arrête là plutôt que d'afficher une
        // position tronquée sans le dire.
        break
      }
    }
    setFen(echiquier.fen())
    setHistory(joues)
    const detaille = echiquier.history({ verbose: true })
    const dernier = detaille[detaille.length - 1]
    setLastMove(dernier ? { from: dernier.from, to: dernier.to } : null)
  }, [])

  // ── Ouverture de la position courante ───────────────────────────────────
  const current = useMemo(() => book?.lookup(fen, locale) ?? null, [book, fen, locale])
  /** Clé de la position affichée, pour reconnaître la ligne choisie. */
  const epdCourant = useMemo(() => toEpd(fen), [fen])

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
   * La fiche d'enjeux de ce qu'on vient de jouer, s'il y en a une.
   *
   * L'explorateur savait déjà nommer l'ouverture ; il ne disait pas ce qu'elle
   * cherche. Pour les vingt-cinq qui se jouent en club, la fiche apparaît donc
   * dès que la suite correspond — c'est-à-dire au moment exact où la question
   * se pose, la main sur les pièces.
   */
  const fiche = useMemo(() => ficheDeLaPartie(history), [history])

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
  const loadLine = useCallback(
    (uci: string) => {
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
      // Choisir une ouverture, c'est demander à la voir : on va la montrer.
      montrerLePlateau()
    },
    [montrerLePlateau],
  )

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
          {t('rest.openingExplorer')}
        </h1>
        {/* Il fallait le dire : sans cette phrase, on attend que l'ordinateur
            réponde et on croit l'échiquier cassé. Ce n'est pas une partie,
            c'est un plateau d'étude où l'on joue les deux camps. */}
        {/* En paysage sur téléphone, cette phrase coûterait trois rangées
            d'échiquier ; elle reste partout ailleurs. */}
        <p className="mt-1.5 text-sm text-muted paysage:hidden">
          {t('openings.catalogued', { n: (book?.size ?? 0).toLocaleString(bcp47) })}{' '}
          <strong className="font-semibold text-ink">{t('openings.bothColours')}</strong>{' '}
          {t('openings.bothColoursAfter')}
        </p>
        {/* Le lien vers les fiches, ici et pas seulement dans le menu : c'est
            en explorant qu'on se demande « oui, mais qu'est-ce que je cherche
            avec ça ? », et la réponse est à un clic. */}
        <Link href="/ouvertures/enjeux" className="lien mt-1.5 inline-block paysage:hidden">
          {t('openings.stakesLink')}
        </Link>
      </div>

      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        {/* La marge de défilement tient compte de l'en-tête collant : sans
            elle, remonter au plateau le glisse sous la barre de navigation. */}
        <div
          ref={plateau}
          className="etude-plateau min-w-0"
          style={{ scrollMarginTop: 'calc(var(--entete) + 0.5rem)' }}
        >
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
              {t('bits.back')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw size={14} />}
              onClick={reset}
              disabled={history.length === 0}
            >
              {t('bits.startPosition')}
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
                    ? t('openings.exactlyListed')
                    : t('openings.lastKnown', { n: Math.ceil((deepest?.atPly ?? 0) / 2) })}
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
              <p className="text-sm leading-relaxed text-muted">{t('openings.startHint')}</p>
            ) : (
              <p className="text-sm text-muted">{t('openings.unlisted')}</p>
            )}
          </Card>
        </div>

        {/* ── Panneau de droite ────────────────────────────────────── */}
        <div className="etude-aside flex min-w-0 flex-col gap-3">
          {/* ── Les enjeux de l'ouverture jouée ───────────────────────────
              En tête du panneau, et avant les statistiques : savoir que 58 %
              des joueurs de ton niveau jouent ce coup n'apprend rien si l'on ne
              sait pas ce que l'ouverture cherche. Vingt-cinq fiches seulement,
              donc la carte est le plus souvent absente — c'est normal, et c'est
              pour cela qu'un lien mène à la liste complète.

              En paysage sur téléphone, la colonne est déjà pleine : la fiche
              s'y replierait sur dix lignes de texte, et on la lit mieux sur sa
              page. */}
          {fiche && (
            <CarteEnjeux
              fiche={fiche}
              versEchiquier={false}
              ecrire={format}
              className="paysage:hidden"
            />
          )}

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
                {t('openings.continuations')}
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
                placeholder={t('openings.searchOpening')}
                aria-label={t('openings.searchAria')}
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
                title={t('openings.searchTitle')}
                description={t('openings.searchHint')}
              />
            ) : (
              <ul className="max-h-[520px] overflow-y-auto">
                {results.map((match) => {
                  // Celle qui est sur l'échiquier se voit dans la liste : c'est
                  // la réponse au clic qu'on a sous les yeux quand le plateau,
                  // lui, est plus haut. Elle s'allume aussi quand on atteint la
                  // position en jouant les coups — c'est la même chose.
                  const actif = match.epd === epdCourant
                  return (
                    <li key={match.epd}>
                      <button
                        type="button"
                        onClick={() => loadLine(match.uci)}
                        aria-current={actif ? 'true' : undefined}
                        className={clsx(
                          'flex w-full items-baseline gap-2.5 border-b border-line/40 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-hover',
                          actif && 'bg-accent/15 font-medium',
                        )}
                      >
                        <span className="w-9 shrink-0 font-mono text-[12px] font-semibold text-accent">
                          {match.eco}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">
                            {match.label}
                          </span>
                          <span className="block truncate text-[12px] text-faint">
                            {match.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-faint">
                          {Math.ceil(match.ply / 2)} coups
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-faint">
        {t('openings.datasetNote', { source: 'lichess-org/chess-openings' })}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ce que les joueurs jouent vraiment
// ─────────────────────────────────────────────────────────────────────────────

const BANDS: Array<{ id: StatsBand; label: TranslationKey }> = [
  { id: 'debutant', label: 'openings.bandBeginner' },
  { id: 'club', label: 'openings.bandClub' },
  { id: 'fort', label: 'openings.bandStrong' },
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
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
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
        <p className="min-w-0 flex-1 text-[12px] font-semibold text-faint">
          {t('openings.whatIsPlayed')}
        </p>
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
              {t(entry.label)}
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
              {t('openings.coverageBefore')}{' '}
              <strong className="font-semibold text-ink">
                {t('openings.coverageStrong', { n: maxPlies / 2 })}
              </strong>
              {t('openings.coverageAfter')}
            </>
          ) : (
            <>{t('openings.tooRare')}</>
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
            {t('openings.footer', {
              parties: total.toLocaleString(bcp47),
              coup: Math.floor(ply / 2) + 1,
              total: maxPlies / 2,
            })}
          </p>
        </>
      )}
    </Card>
  )
}
