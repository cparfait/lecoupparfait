'use client'

/**
 * Test de niveau — douze positions, un nombre à la fin.
 *
 * « Par où je commence ? » est la première question de quelqu'un qui arrive, et
 * l'application n'y répondait pas : elle proposait trente-six leçons dans
 * l'ordre du programme et six millions de puzzles calibrés sur un classement
 * qu'on n'a pas encore. Il fallait choisir soi-même, c'est-à-dire deviner.
 *
 * ── Pourquoi c'est une mesure honnête ────────────────────────────────────────
 *
 * On ne rédige aucune question : les positions viennent des puzzles de Lichess,
 * qui portent **leur propre cote**, établie sur des millions de tentatives
 * réelles. Résoudre une position à 1 400 est donc une information calibrée, pas
 * une appréciation. Un escalier adaptatif suffit alors à converger : on monte
 * après une réussite, on descend après un échec, et le pas se resserre à chaque
 * fois (voir `PAS`).
 *
 * ── Ce que le test ne fait pas ───────────────────────────────────────────────
 *
 *  - **Il ne touche pas au classement de puzzles.** Aucune tentative n'est
 *    enregistrée : une mesure qui déplace ce qu'elle mesure n'est plus une
 *    mesure. Les mêmes positions pourront réapparaître à l'entraînement, et
 *    c'est très bien — on les aura vues une fois, sous pression, sans indice.
 *  - **Il ne demande qu'un coup par position.** Les puzzles ont souvent une
 *    suite de trois ou cinq coups ; ici seul le premier compte. C'est lui qui
 *    porte l'idée, et douze idées en six minutes valent mieux que quatre
 *    séquences complètes en vingt.
 *  - **Il ne bloque rien.** Le résultat oriente la page « Ton palier », il ne
 *    verrouille aucune leçon.
 *
 * ── Ce qu'il règle, en revanche ─────────────────────────────────────────────
 *
 * Le premier adversaire proposé contre l'ordinateur. L'échelle des bots
 * démarrait au palier le plus faible pour tout le monde : quelqu'un qui joue
 * en club devait gagner une douzaine de parties sans intérêt avant d'affronter
 * sa mesure. Le test, lui, l'a mesurée — il serait absurde de la mesurer pour
 * ne pas s'en servir. C'est le même dépôt que la déclaration d'inscription
 * (`action: 'declarer'`), qui ne fait jamais reculer personne et ne touche à
 * aucun classement.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { ArrowRight, Check, Gauge, RotateCcw, Swords, Target, X } from 'lucide-react'
import clsx from 'clsx'
import { BOT_LEVELS, botLevel, suggestedLevel } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, ButtonLink, Card, Chip, Spinner, TitreDePage } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'
import { playMoveFor, playSound } from '@/lib/sound.ts'
import {
  aujourdhui,
  enregistrerNiveauEstime,
  lireNiveauEstime,
  palierPour,
  puzzleVersPartie,
} from '@/lib/apprendre/palier.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { useSan } from '@/lib/notation.ts'

/**
 * Le pas de l'escalier, position après position.
 *
 * Douze valeurs décroissantes : on corrige largement au début — il s'agit de
 * trouver la bonne région de l'échelle, pas de la raffiner — puis de moins en
 * moins. À pas constant, le test oscillerait indéfiniment autour de la réponse
 * sans jamais s'en approcher ; à pas trop vite resserré, une seule réussite
 * chanceuse au premier essai plafonnerait l'estimation.
 *
 * La somme des pas (environ 1 000) borne aussi ce que le test peut mesurer :
 * parti de 1 000, il atteint 2 000 en haut et 500 en bas. C'est exactement la
 * plage où se trouvent les gens qui se demandent par où commencer.
 */
const PAS = [220, 190, 160, 140, 120, 105, 90, 80, 70, 60, 55, 50]

/** Cote de départ : le milieu de la population des puzzles de Lichess. */
const DEPART = 1000

/** Plancher et plafond du catalogue : en dehors, on ne trouve plus rien. */
const PLANCHER = 500
const PLAFOND = 2600

interface Position {
  id: string
  fen: string
  moves: string[]
  rating: number
  themes: string[]
}

interface Etape {
  /** Cote demandée pour cette position. */
  visee: number
  /** Cote réelle de la position servie. */
  cote: number
  reussie: boolean
}

type Phase = 'intro' | 'chargement' | 'jeu' | 'verdict' | 'fini' | 'panne'

export default function TestDeNiveauPage() {
  const format = useSan()

  const [phase, setPhase] = useState<Phase>('intro')
  const [erreur, setErreur] = useState<string | null>(null)

  /** Positions déjà servies, pour ne pas en revoir une dans le même test. */
  const vus = useRef<string[]>([])

  const [position, setPosition] = useState<Position | null>(null)
  const [fen, setFen] = useState('')
  const [orientation, setOrientation] = useState<Color>('w')
  const [dernierCoup, setDernierCoup] = useState<{ from: Square; to: Square } | null>(null)
  const [etapes, setEtapes] = useState<Etape[]>([])
  /** Verdict de la position qu'on vient de jouer, le temps de l'afficher. */
  const [verdict, setVerdict] = useState<{ juste: boolean; attendu: string } | null>(null)

  /** Cote visée pour la position suivante. */
  const visee = useRef(DEPART)

  const index = etapes.length
  const termine = index >= PAS.length

  // ── Chargement d'une position ─────────────────────────────────────────────
  const charger = useCallback(async () => {
    setPhase('chargement')
    setVerdict(null)
    setErreur(null)

    try {
      const exclure = vus.current.join(',')
      const reponse = await fetch(
        `/api/puzzles?rating=${Math.round(visee.current)}${exclure ? `&exclure=${encodeURIComponent(exclure)}` : ''}`,
        { cache: 'no-store' },
      )
      const data = await reponse.json()
      if (!reponse.ok) {
        setErreur(data.error ?? 'Impossible de charger une position.')
        setPhase('panne')
        return
      }

      const servie = data.puzzle as Position
      // Le premier coup de la solution est celui de l'adversaire : c'est lui qui
      // crée la position à résoudre. On le joue avant d'afficher.
      const echiquier = new Chess(servie.fen, { skipValidation: true })
      const amorce = servie.moves[0]
      if (amorce) {
        try {
          const coup = echiquier.move({
            from: amorce.slice(0, 2) as Square,
            to: amorce.slice(2, 4) as Square,
            promotion: (amorce[4] as PieceSymbol) ?? undefined,
          })
          setDernierCoup({ from: coup.from, to: coup.to })
        } catch {
          // Position et solution incompatibles : inutilisable. On en demande une
          // autre plutôt que d'afficher un plateau qui ne répond à rien.
          vus.current.push(servie.id)
          void charger()
          return
        }
      } else {
        setDernierCoup(null)
      }

      vus.current.push(servie.id)
      setPosition(servie)
      setFen(echiquier.fen())
      setOrientation(echiquier.turn())
      setPhase('jeu')
    } catch {
      setErreur('Le service de puzzles est injoignable.')
      setPhase('panne')
    }
  }, [])

  const commencer = useCallback(() => {
    vus.current = []
    visee.current = DEPART
    setEtapes([])
    setVerdict(null)
    void charger()
  }, [charger])

  // ── Coup du joueur ────────────────────────────────────────────────────────
  const jouer = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (phase !== 'jeu' || !position) return

      const attendu = position.moves[1]
      if (!attendu) return

      const echiquier = new Chess(fen, { skipValidation: true })
      let coupJoue
      try {
        coupJoue = echiquier.move({ from, to, promotion: promotion ?? 'q' })
      } catch {
        return
      }

      /*
        Un mat est un mat, même s'il n'est pas celui de la solution.

        Les positions de mat en deux en admettent souvent plusieurs, et refuser
        le sien sur un test de niveau fausserait la mesure dans le mauvais sens :
        on noterait faux quelqu'un qui a trouvé mieux.
      */
      const promotionAttendue = attendu.length > 4 ? attendu[4] : null
      const code = `${from}${to}${promotionAttendue ? (promotion ?? 'q') : ''}`
      const juste = code === attendu || echiquier.isCheckmate()

      playMoveFor(coupJoue)
      setFen(echiquier.fen())
      setDernierCoup({ from: coupJoue.from, to: coupJoue.to })
      playSound(juste ? 'victory' : 'error')

      setVerdict({ juste, attendu: nomDuCoup(fen, attendu) })
      setEtapes((liste) => [
        ...liste,
        { visee: Math.round(visee.current), cote: position.rating, reussie: juste },
      ])

      // L'escalier : on monte si c'est juste, on descend sinon, du pas prévu
      // pour cette marche-ci.
      const pas = PAS[etapes.length] ?? 50
      visee.current = Math.max(PLANCHER, Math.min(PLAFOND, visee.current + (juste ? pas : -pas)))

      setPhase('verdict')
    },
    [phase, position, fen, etapes.length],
  )

  const suivante = useCallback(() => {
    if (etapes.length >= PAS.length) {
      setPhase('fini')
      return
    }
    void charger()
  }, [charger, etapes.length])

  /**
   * L'estimation finale.
   *
   * La moyenne des cotes **réellement servies** sur la seconde moitié du test,
   * et non la dernière visée : la dernière marche dépend du tout dernier coup,
   * si bien que deux tests identiques à une position près rendaient des nombres
   * écartés de cinquante points. La seconde moitié, elle, est déjà dans la
   * bonne région — c'est tout l'objet des premières marches — et la moyenne y
   * lisse le hasard du tirage.
   *
   * On corrige ensuite un biais connu : le test ne demande **qu'un coup**, là
   * où la cote d'un puzzle récompense la séquence entière. On retient donc la
   * cote des positions résolues, pas celle des positions vues.
   */
  const estimation = useMemo(() => {
    if (etapes.length === 0) return null
    const secondeMoitie = etapes.slice(Math.floor(etapes.length / 2))
    const reference = secondeMoitie.length > 0 ? secondeMoitie : etapes
    const somme = reference.reduce((total, etape) => total + etape.cote, 0)
    const cotePuzzle = Math.round(somme / reference.length)
    return { cotePuzzle, partie: puzzleVersPartie(cotePuzzle) }
  }, [etapes])

  // Le résultat est conservé dès qu'il existe : quitter la page sans cliquer
  // « voir mon palier » ne doit pas effacer six minutes de travail.
  //
  // Et il est déposé au compte dans le même souffle, s'il y en a un : le test
  // sert à choisir le premier adversaire, or l'écran « contre l'ordinateur »
  // ne lit pas le navigateur, il lit la progression. Sans compte, la route
  // répond poliment `tracked: false` et il ne se passe rien — le test doit
  // marcher avant l'inscription, c'est même là qu'il est le plus utile.
  useEffect(() => {
    if (phase !== 'fini' || !estimation) return
    enregistrerNiveauEstime({
      elo: estimation.partie,
      source: 'test',
      le: aujourdhui(),
      positions: etapes.length,
    })
    void fetch('/api/progression', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'declarer', level: suggestedLevel(estimation.partie) }),
    }).catch(() => {
      // Le dépôt du niveau n'est pas le résultat : on ne gâche pas l'écran de
      // fin pour une requête ratée, le curseur se déplace à la main.
      toast.error('Ton niveau est mesuré, mais l’adversaire de départ n’a pas pu être réglé.')
    })
  }, [phase, estimation, etapes.length])

  const dejaFait = useMemo(() => (phase === 'intro' ? lireNiveauEstime() : null), [phase])

  const coupsLegaux = useLegalMoves(fen, phase === 'jeu')
  const reussies = etapes.filter((etape) => etape.reussie).length

  return (
    <div className="page">
      <TitreDePage
        retour={{ href: '/apprendre', label: 'Apprendre' }}
        intro="Douze positions, de plus en plus dures ou de plus en plus simples selon tes réponses. À la fin, un niveau estimé et la liste de ce qui te fait gagner des points maintenant."
      >
        Test de niveau
      </TitreDePage>

      {/* ── Avant de commencer ──────────────────────────────────────────── */}
      {phase === 'intro' && (
        <Card className="overflow-hidden">
          <EnTeteDeCarte
            titre="Comment ça marche"
            icone={<Gauge size={14} aria-hidden />}
            teinte="var(--rub-apprendre)"
          />
          <div className="space-y-3 p-5 text-[14px] leading-relaxed text-muted">
            <p>
              Une position, un coup à trouver, et on passe à la suivante. Si tu trouves, la suivante
              est plus dure ; sinon, plus simple. Il n’y a pas d’indice et pas de second essai —
              c’est ce qui rend la mesure utilisable.
            </p>
            <p>
              Les positions viennent du catalogue de Lichess, et chacune porte sa propre cote,
              établie sur des millions de tentatives. Ce n’est donc pas un avis sur ton jeu, c’est
              une mesure.
            </p>
            <p className="text-faint">
              Rien n’est envoyé au classement : ce test ne touche ni à ta cote de puzzles, ni à ton
              Elo. Compte six minutes.
            </p>

            {dejaFait && (
              <p className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-[13px] text-ink">
                Dernier test : <strong>{dejaFait.elo}</strong> le{' '}
                {new Date(dejaFait.le).toLocaleDateString('fr-FR')}. Le refaire remplacera ce
                résultat.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" size="lg" icon={<Target size={16} />} onClick={commencer}>
                Commencer le test
              </Button>
              {dejaFait && (
                <ButtonLink href="/apprendre/palier" size="lg">
                  Voir mon palier
                </ButtonLink>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Panne ───────────────────────────────────────────────────────── */}
      {phase === 'panne' && (
        <Card className="p-5">
          <p className="text-[14px] text-ink">{erreur}</p>
          <p className="mt-1.5 text-[13px] text-muted">
            Le test a besoin du catalogue de puzzles. S’il n’est pas encore importé, la commande est
            dans le fichier README.
          </p>
          <Button className="mt-4" onClick={commencer} icon={<RotateCcw size={14} />}>
            Réessayer
          </Button>
        </Card>
      )}

      {/* ── Le test ─────────────────────────────────────────────────────── */}
      {(phase === 'chargement' || phase === 'jeu' || phase === 'verdict') && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            {/* La progression, en marches plutôt qu'en barre : on voit d'un coup
                d'œil combien il en reste, et ce qu'on a réussi. Une barre à
                58 % ne dit ni l'un ni l'autre. */}
            <div className="mb-3 flex items-center gap-1.5" aria-hidden>
              {PAS.map((_, marche) => {
                const etape = etapes[marche]
                return (
                  <span
                    key={marche}
                    className={clsx(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      etape
                        ? etape.reussie
                          ? 'bg-[var(--q-best)]'
                          : 'bg-[var(--q-blunder)]'
                        : marche === index
                          ? 'bg-accent'
                          : 'bg-line',
                    )}
                  />
                )
              })}
            </div>
            {/* Le numéro affiché suit la position **qu'on regarde**, pas le
                nombre de réponses données. Pendant le verdict, la position est
                encore à l'écran alors qu'elle est déjà comptée : on annonçait
                « position 2 sur 12 » au-dessus de la première. */}
            <p className="mb-3 text-[13px] text-muted">
              Position {Math.min(verdict ? index : index + 1, PAS.length)} sur {PAS.length}
              {position && phase !== 'chargement' && (
                <>
                  {' '}
                  · <span className="text-faint">cote {position.rating}</span>
                </>
              )}
            </p>

            {phase === 'chargement' ? (
              <Card className="grid h-[min(78vw,28rem)] place-items-center">
                <Spinner size={24} />
              </Card>
            ) : (
              <ChessBoard
                fen={fen}
                orientation={orientation}
                playable={phase === 'jeu' ? orientation : null}
                legalMoves={coupsLegaux}
                onMove={jouer}
                lastMove={dernierCoup}
              />
            )}

            <p className="mt-3 text-center text-[14px] font-medium">
              {phase === 'jeu' &&
                (orientation === 'w'
                  ? 'Les Blancs jouent — trouve le meilleur coup.'
                  : 'Les Noirs jouent — trouve le meilleur coup.')}
            </p>
          </div>

          {/* ── Le verdict de la position ─────────────────────────────── */}
          <div className="space-y-3">
            {verdict && (
              <Card
                className={clsx(
                  'p-4',
                  verdict.juste
                    ? 'border-[color-mix(in_oklab,var(--q-best)_35%,transparent)]'
                    : 'border-[color-mix(in_oklab,var(--q-blunder)_35%,transparent)]',
                )}
              >
                <p className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full"
                    style={{
                      background: `color-mix(in oklab, var(--q-${verdict.juste ? 'best' : 'blunder'}) 18%, transparent)`,
                      color: `var(--q-${verdict.juste ? 'best' : 'blunder'})`,
                    }}
                    aria-hidden
                  >
                    {verdict.juste ? <Check size={14} /> : <X size={14} />}
                  </span>
                  {verdict.juste ? 'Trouvé' : 'Raté'}
                </p>
                {!verdict.juste && (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    Le coup était <strong className="text-ink">{format(verdict.attendu)}</strong>.
                    Rien à corriger maintenant : le test mesure, il n’enseigne pas. Tu retrouveras
                    ce motif dans la liste de la fin.
                  </p>
                )}
                <Button
                  className="mt-4"
                  variant="primary"
                  fullWidth
                  icon={<ArrowRight size={15} />}
                  onClick={suivante}
                >
                  {termine ? 'Voir mon niveau' : 'Position suivante'}
                </Button>
              </Card>
            )}

            {etapes.length > 0 && (
              <Card className="overflow-hidden">
                <EnTeteDeCarte
                  titre="Où en est la mesure"
                  teinte="var(--rub-apprendre)"
                  fin={`${reussies} / ${etapes.length}`}
                />
                <div className="p-4">
                  <p className="text-[13px] leading-relaxed text-muted">
                    Prochaine position visée autour de{' '}
                    <strong className="text-ink tabular-nums">{Math.round(visee.current)}</strong>.
                    L’estimation se resserre à chaque réponse.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Le résultat ─────────────────────────────────────────────────── */}
      {phase === 'fini' && estimation && (
        <Resultat
          cotePuzzle={estimation.cotePuzzle}
          partie={estimation.partie}
          reussies={reussies}
          total={etapes.length}
          onRefaire={commencer}
        />
      )}
    </div>
  )
}

/**
 * L'écran de fin.
 *
 * Deux nombres, et on dit ce que chacun veut dire. Un seul nombre sans son
 * échelle est la meilleure façon de faire croire à quelqu'un qu'il vaut 1 400
 * en tournoi parce qu'il a résolu douze puzzles.
 */
function Resultat({
  cotePuzzle,
  partie,
  reussies,
  total,
  onRefaire,
}: {
  cotePuzzle: number
  partie: number
  reussies: number
  total: number
  onRefaire: () => void
}) {
  const palier = palierPour(partie)
  const niveauBot = suggestedLevel(partie)

  return (
    <Card className="overflow-hidden">
      <EnTeteDeCarte
        titre="Ton niveau estimé"
        icone={<Gauge size={14} aria-hidden />}
        teinte="var(--rub-apprendre)"
        fin={`${reussies} / ${total} trouvés`}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="font-display text-5xl font-bold leading-none tabular-nums">{partie}</p>
            <p className="mt-1.5 text-[13px] text-muted">
              en partie, environ — l’échelle du classement de l’application
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none tabular-nums text-muted">
              {cotePuzzle}
            </p>
            <p className="mt-1.5 text-[13px] text-faint">sur l’échelle des puzzles</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          Les deux nombres diffèrent et c’est normal : un puzzle annonce qu’il y a quelque chose à
          trouver, une partie ne l’annonce jamais. Le premier est celui à retenir pour choisir ses
          adversaires ; le second pour choisir ses exercices.
        </p>

        <div className="mt-5 rounded-[var(--radius)] border border-line bg-bg-deep p-4">
          <Chip tone="accent">Ton palier</Chip>
          <h2 className="mt-2 font-display text-xl font-bold tracking-tight">{palier.nom}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{palier.promesse}</p>
        </div>

        {/* Ce que la mesure change tout de suite, dit en clair : un test dont
            on ne voit aucun effet passe pour un questionnaire de magazine. */}
        <p className="mt-4 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[13px] leading-relaxed text-muted">
          Premier adversaire proposé contre l’ordinateur :{' '}
          <strong className="font-semibold text-ink">niveau {niveauBot}</strong>, environ{' '}
          <strong className="font-semibold text-ink">{botLevel(niveauBot).elo} Elo</strong>. Les{' '}
          {BOT_LEVELS.length} paliers restent accessibles au curseur, dans les deux sens, et ton
          classement, lui, ne bouge qu’en jouant.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink
            href="/apprendre/palier"
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
          >
            Ce qui me fait progresser maintenant
          </ButtonLink>
          <ButtonLink href="/jouer/ordinateur" size="lg" icon={<Swords size={16} />}>
            Jouer à ce niveau
          </ButtonLink>
          <Button size="lg" icon={<RotateCcw size={15} />} onClick={onRefaire}>
            Refaire le test
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** Le coup attendu, écrit en notation algébrique plutôt qu'en UCI. */
function nomDuCoup(fen: string, uci: string): string {
  try {
    const echiquier = new Chess(fen, { skipValidation: true })
    const coup = echiquier.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as PieceSymbol) ?? undefined,
    })
    return coup.san
  } catch {
    return uci
  }
}
