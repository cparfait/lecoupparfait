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
 * fois (voir `PAS_DU_TEST`, dans le cœur).
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
 * **Le premier adversaire proposé contre l'ordinateur.** L'échelle des bots
 * démarrait au palier le plus faible pour tout le monde : quelqu'un qui joue
 * en club devait gagner une douzaine de parties sans intérêt avant d'affronter
 * sa mesure. Le test, lui, l'a mesurée — il serait absurde de la mesurer pour
 * ne pas s'en servir. C'est le dépôt de la déclaration d'inscription
 * (`action: 'declarer'`), qui ne fait jamais reculer personne.
 *
 * **Et, depuis, le point de départ du classement.** Le Glicko inscrivait tout
 * le monde à 100 avec une incertitude de 350 : simulé sur le vrai calcul, un
 * joueur de force 1 800 était classé 345 après ses deux premières parties
 * classées, et mettait une douzaine de parties à rejoindre son niveau. La
 * mesure existait pourtant, six minutes plus tôt, et n'allait nulle part.
 * `POST /api/niveau` l'enregistre et amorce les catégories où rien n'a encore
 * été joué — voir `amorcerClassements`. Ce qui a été mesuré en jouant, lui,
 * n'est jamais écrasé : une seule partie vaut mieux qu'un test.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { ArrowRight, Check, Gauge, RotateCcw, Swords, Target, X } from 'lucide-react'
import clsx from 'clsx'
import {
  BOT_LEVELS,
  botLevel,
  COTE_DE_DEPART,
  mesurerNiveau,
  PAS_DU_TEST,
  suggestedLevel,
  viseeSuivante,
} from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, ButtonLink, Card, Chip, Spinner, TitreDePage } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'
import { playMoveFor, playSound } from '@/lib/sound.ts'
import {
  aujourdhui,
  enregistrerNiveauEstime,
  enregistrerReleveEnAttente,
  lireNiveauEstime,
  oublierReleveEnAttente,
  palierPour,
  puzzleVersPartie,
} from '@/lib/apprendre/palier.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { useSan } from '@/lib/notation.ts'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'

/*
  L'escalier lui-même vit dans `@coupparfait/core` : le serveur en a besoin pour
  rejouer un relevé qu'on lui envoie, et deux copies de ces douze nombres
  auraient divergé au premier réglage.
*/

interface Position {
  id: string
  fen: string
  moves: string[]
  rating: number
  themes: string[]
}

interface Etape {
  /** L'identifiant de la position, ce que le serveur recoupera. */
  id: string
  /** Cote demandée pour cette position. */
  visee: number
  /** Cote réelle de la position servie. */
  cote: number
  reussie: boolean
}

/** Ce que vaut le joueur, sur les deux échelles, avec son incertitude. */
interface Mesure {
  cotePuzzle: number
  partie: number
  sigma: number
}

type Phase = 'intro' | 'chargement' | 'jeu' | 'verdict' | 'fini' | 'panne'

export default function TestDeNiveauPage() {
  const format = useSan()
  const t = useT()
  /* La date du dernier test s'écrit dans la langue de l'interface : voir
     `langue()`, qui porte l'étiquette BCP 47 de chacune. */
  const bcp47 = langue(useI18n().locale).bcp47

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
  const visee = useRef(COTE_DE_DEPART)

  const index = etapes.length
  const termine = index >= PAS_DU_TEST.length

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
        setErreur(data.error ?? t('level.loadFailed'))
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
      setErreur(t('level.serviceDown'))
      setPhase('panne')
    }
  }, [t])

  const commencer = useCallback(() => {
    vus.current = []
    visee.current = COTE_DE_DEPART
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
        {
          id: position.id,
          visee: Math.round(visee.current),
          cote: position.rating,
          reussie: juste,
        },
      ])

      // L'escalier : on monte si c'est juste, on descend sinon, du pas prévu
      // pour cette marche-ci.
      visee.current = viseeSuivante(visee.current, etapes.length, juste)

      setPhase('verdict')
    },
    [phase, position, fen, etapes.length],
  )

  const suivante = useCallback(() => {
    if (etapes.length >= PAS_DU_TEST.length) {
      setPhase('fini')
      return
    }
    void charger()
  }, [charger, etapes.length])

  /**
   * L'estimation finale.
   *
   * **Les douze réponses, pas les six dernières.** La lecture précédente
   * moyennait les cotes servies sur la seconde moitié du test : elle jetait la
   * moitié du relevé, et la douzième réponse n'entrait dans aucun calcul —
   * elle ne déplaçait qu'une visée qu'on ne lisait plus. `mesurerNiveau`
   * ajuste la courbe d'Elo sur l'ensemble du relevé ; le détail, les chiffres
   * de simulation et le pourquoi des deux pseudo-observations sont dans
   * `packages/core/src/placement.ts`.
   *
   * Calculée ici pour l'affichage immédiat, et **recalculée par le serveur**
   * sur les cotes réelles du catalogue quand c'est lui qui enregistre : voir
   * `POST /api/niveau`. Les deux devraient donner le même nombre — c'est la
   * même fonction sur les mêmes données — et c'est celui du serveur qui prime,
   * puisque c'est lui qui amorce le classement.
   */
  const estimation = useMemo<Mesure | null>(() => {
    const mesure = mesurerNiveau(
      etapes.map((etape) => ({ cote: etape.cote, reussie: etape.reussie })),
      COTE_DE_DEPART,
    )
    if (!mesure) return null
    return {
      cotePuzzle: mesure.cote,
      partie: puzzleVersPartie(mesure.cote),
      sigma: mesure.sigma,
    }
  }, [etapes])

  /** La mesure rendue par le serveur, quand il a pu la refaire. */
  const [mesureServeur, setMesureServeur] = useState<Mesure | null>(null)
  const mesure = mesureServeur ?? estimation

  /*
    La fin du test : trois dépôts, et aucun ne doit gâcher l'écran.

    1. Le navigateur, tout de suite : quitter la page sans cliquer « voir mon
       palier » ne doit pas effacer six minutes de travail, et c'est le seul
       endroit qui existe quand on n'a pas de compte.
    2. `POST /api/niveau`, qui recoupe le relevé, l'enregistre et **amorce le
       classement** — c'est la nouveauté : la mesure servait à conseiller un
       adversaire, elle fixe désormais le point de départ du Glicko, qui
       plaçait tout le monde à 100 quel que soit son niveau.
    3. `POST /api/progression`, inchangé, qui déplace le curseur d'adversaire.

    Le relevé part tel quel — les identifiants des positions et ce qu'on en a
    fait —, jamais le résultat : c'est au serveur de dire ce qu'il vaut, sans
    quoi il suffirait d'annoncer 2 400 pour être classé 2 400.
  */
  useEffect(() => {
    if (phase !== 'fini' || !estimation) return

    enregistrerNiveauEstime({
      elo: estimation.partie,
      source: 'test',
      le: aujourdhui(),
      positions: etapes.length,
    })

    const releve = etapes.map((etape) => ({ id: etape.id, reussie: etape.reussie }))
    // Gardé en attendant qu'il y ait un compte : sans cela, se mesurer *puis*
    // s'inscrire — l'ordre que l'écran d'inscription recommande lui-même —
    // perdait la mesure. Voir `ReleveEnAttente`.
    enregistrerReleveEnAttente(releve)

    void fetch('/api/niveau', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ positions: releve }),
    })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((donnees: (Mesure & { enregistre?: boolean }) | null) => {
        if (!donnees || !Number.isFinite(donnees.partie)) return
        setMesureServeur(donnees)
        // Repris par un compte : il n'y a plus rien à garder pour plus tard.
        if (donnees.enregistre) oublierReleveEnAttente()
        enregistrerNiveauEstime({
          elo: donnees.partie,
          source: 'test',
          le: aujourdhui(),
          positions: etapes.length,
        })
      })
      .catch(() => {
        // Le classement ne sera pas amorcé, le test reste juste : il vaut mieux
        // un écran de résultat intact qu'une alerte sur un dépôt.
      })

    void fetch('/api/progression', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'declarer', level: suggestedLevel(estimation.partie) }),
    }).catch(() => {
      // Le dépôt du niveau n'est pas le résultat : on ne gâche pas l'écran de
      // fin pour une requête ratée, le curseur se déplace à la main.
      toast.error(t('level.levelSetFailed'))
    })
  }, [phase, estimation, etapes, t])

  const dejaFait = useMemo(() => (phase === 'intro' ? lireNiveauEstime() : null), [phase])

  const coupsLegaux = useLegalMoves(fen, phase === 'jeu')
  const reussies = etapes.filter((etape) => etape.reussie).length

  return (
    <div className="page">
      <TitreDePage retour={{ href: '/apprendre', label: t('nav.learn') }} intro={t('level.intro')}>
        {t('level.title')}
      </TitreDePage>

      {/* ── Avant de commencer ──────────────────────────────────────────── */}
      {phase === 'intro' && (
        <Card className="overflow-hidden">
          <EnTeteDeCarte
            titre={t('level.howItWorks')}
            icone={<Gauge size={14} aria-hidden />}
            teinte="var(--rub-apprendre)"
          />
          <div className="space-y-3 p-5 text-[14px] leading-relaxed text-muted">
            <p>{t('level.how1')}</p>
            <p>{t('level.how2')}</p>
            <p className="text-faint">{t('level.how3')}</p>

            {dejaFait && (
              <p className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-[13px] text-ink">
                {t('level.lastTest', {
                  elo: dejaFait.elo,
                  date: new Date(dejaFait.le).toLocaleDateString(bcp47),
                })}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" size="lg" icon={<Target size={16} />} onClick={commencer}>
                {t('level.start')}
              </Button>
              {dejaFait && (
                <ButtonLink href="/apprendre/palier" size="lg">
                  {t('level.seeMyTier')}
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
          <p className="mt-1.5 text-[13px] text-muted">{t('level.needsCatalogue')}</p>
          <Button className="mt-4" onClick={commencer} icon={<RotateCcw size={14} />}>
            {t('common.retry')}
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
              {PAS_DU_TEST.map((_, marche) => {
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
              {t('level.positionOf', {
                n: Math.min(verdict ? index : index + 1, PAS_DU_TEST.length),
                total: PAS_DU_TEST.length,
              })}
              {position && phase !== 'chargement' && (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-faint">
                    {t('level.positionRating', { cote: position.rating })}
                  </span>
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
                t(orientation === 'w' ? 'level.whiteToPlay' : 'level.blackToPlay')}
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
                  {t(verdict.juste ? 'level.found' : 'level.missed')}
                </p>
                {!verdict.juste && (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    {t('level.theMoveWas')}{' '}
                    <strong className="text-ink">{format(verdict.attendu)}</strong>.{' '}
                    {t('level.nothingToFix')}
                  </p>
                )}
                <Button
                  className="mt-4"
                  variant="primary"
                  fullWidth
                  icon={<ArrowRight size={15} />}
                  onClick={suivante}
                >
                  {t(termine ? 'level.seeMyLevel' : 'level.nextPosition')}
                </Button>
              </Card>
            )}

            {etapes.length > 0 && (
              <Card className="overflow-hidden">
                <EnTeteDeCarte
                  titre={t('level.whereWeAre')}
                  teinte="var(--rub-apprendre)"
                  fin={`${reussies} / ${etapes.length}`}
                />
                <div className="p-4">
                  <p className="text-[13px] leading-relaxed text-muted">
                    {t('level.nextAround')}{' '}
                    <strong className="text-ink tabular-nums">{Math.round(visee.current)}</strong>.{' '}
                    {t('level.narrowing')}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Le résultat ─────────────────────────────────────────────────── */}
      {phase === 'fini' && mesure && (
        <Resultat
          cotePuzzle={mesure.cotePuzzle}
          partie={mesure.partie}
          sigma={mesure.sigma}
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
  sigma,
  reussies,
  total,
  onRefaire,
}: {
  cotePuzzle: number
  partie: number
  sigma: number
  reussies: number
  total: number
  onRefaire: () => void
}) {
  const t = useT()
  const palier = palierPour(partie)
  const niveauBot = suggestedLevel(partie)

  /*
    La fourchette, à côté du nombre.

    Douze réponses par oui ou par non mesurent une force à une centaine de
    points près — c'est la précision intrinsèque d'un relevé binaire de cette
    longueur, pas un défaut de l'estimateur. Afficher `1 072` tout seul, en
    gros chiffres, promet une exactitude que rien ne soutient : deux tests du
    même joueur dans la même heure peuvent s'écarter de deux cents points.
    L'écart-type est ramené à l'échelle des parties par la même droite que la
    mesure, et arrondi à la dizaine : à ce niveau d'incertitude, l'unité serait
    une plaisanterie.
  */
  const marge = Math.max(10, Math.round((puzzleVersPartie(sigma) - puzzleVersPartie(0)) / 10) * 10)

  return (
    <Card className="overflow-hidden">
      <EnTeteDeCarte
        titre={t('level.yourLevel')}
        icone={<Gauge size={14} aria-hidden />}
        teinte="var(--rub-apprendre)"
        fin={t('level.foundOf', { reussies, total })}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="font-display text-5xl font-bold leading-none tabular-nums">{partie}</p>
            <p className="mt-1.5 text-[13px] text-muted">{t('level.inGame')}</p>
            <p className="mt-0.5 text-[12px] text-faint tabular-nums">
              {t('level.range', { bas: partie - marge, haut: partie + marge })}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none tabular-nums text-muted">
              {cotePuzzle}
            </p>
            <p className="mt-1.5 text-[13px] text-faint">{t('level.onPuzzleScale')}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          {t('level.twoNumbers')}
        </p>

        <div className="mt-5 glass p-4">
          <Chip tone="accent">{t('level.yourTier')}</Chip>
          <h2 className="mt-2 font-display text-xl font-bold tracking-tight">{t(palier.nom)}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t(palier.promesse)}</p>
        </div>

        {/* Ce que la mesure change tout de suite, dit en clair : un test dont
            on ne voit aucun effet passe pour un questionnaire de magazine. */}
        <p className="mt-4 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[13px] leading-relaxed text-muted">
          {t('level.firstOpponentBefore')}{' '}
          <strong className="font-semibold text-ink">
            {t('auth.firstOpponentLevel', { niveau: niveauBot })}
          </strong>
          ,{' '}
          <strong className="font-semibold text-ink">
            {t('auth.firstOpponentElo', { elo: botLevel(niveauBot).elo })}
          </strong>
          . {t('level.firstOpponentAfter', { paliers: BOT_LEVELS.length })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink
            href="/apprendre/palier"
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
          >
            {t('level.whatProgresses')}
          </ButtonLink>
          <ButtonLink href="/jouer/ordinateur" size="lg" icon={<Swords size={16} />}>
            {t('level.playAtThisLevel')}
          </ButtonLink>
          <Button size="lg" icon={<RotateCcw size={15} />} onClick={onRefaire}>
            {t('level.retake')}
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
