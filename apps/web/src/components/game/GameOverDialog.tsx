'use client'

/**
 * Fin de partie.
 *
 * On annonce le résultat, on rappelle *comment* la partie s'est terminée — un
 * débutant ne sait pas toujours pourquoi la partie s'est arrêtée — et on
 * propose immédiatement les deux gestes suivants : rejouer, ou analyser.
 *
 * Le bouton d'analyse est mis en avant volontairement : c'est le moment où l'on
 * apprend le plus, juste après avoir joué, quand on se souvient encore de ce
 * qu'on avait en tête.
 */

import { useEffect, useRef, useState } from 'react'
import { useDialogue } from '@/lib/useDialogue.ts'
import Link from 'next/link'
import { Check, Gauge, LayoutGrid, RotateCcw, Swords, Target, Trophy, X } from 'lucide-react'
import clsx from 'clsx'
import type { Color } from 'chess.js'
import type { GameResult, GameStatus } from '@coupparfait/core'
import { formatPgnDate, toPgn } from '@coupparfait/core'
import { Button } from '@/components/ui/index.tsx'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'

const REASONS: Record<GameStatus, string> = {
  waiting: '',
  playing: '',
  checkmate: 'par échec et mat',
  stalemate: 'par pat — le roi n’est pas en échec mais aucun coup n’est possible',
  resign: 'par abandon',
  timeout: 'au temps',
  draw: 'par accord mutuel',
  insufficientMaterial: 'matériel insuffisant pour mater',
  threefold: 'par répétition de la position',
  fiftyMoves: 'par la règle des cinquante coups',
  aborted: 'partie annulée',
  abandoned: 'partie abandonnée',
}

export function GameOverDialog({
  status,
  result,
  playerColor,
  opponentName,
  moves,
  ratingDelta,
  onRematch,
  onNewGame,
  retour,
  quete,
}: {
  status: GameStatus
  result: GameResult
  /** Couleur du joueur humain, ou `null` en partie locale. */
  playerColor: Color | null
  opponentName: string
  moves: PlayedMove[]
  /** Variation de classement, si la partie était classée. */
  ratingDelta?: number | null
  onRematch?: () => void
  onNewGame?: () => void
  /**
   * Retour vers l'écran qui a envoyé jouer, quand il y en a un.
   *
   * Le duel de carrière arrive ici sans que le joueur ait choisi son
   * adversaire : il a cliqué « Affronter l'adversaire » sur la carte, et c'est
   * là qu'il veut revenir — pour voir ce que sa victoire a débloqué, ou ce
   * qu'il reste à faire. Sans ce bouton, la seule issue était « Nouvelle
   * partie », qui le renvoyait aux réglages qu'on lui avait justement épargnés.
   */
  retour?: { href: string; libelle: string }
  /**
   * La quête du jour qui a envoyé jouer, s'il y en a une.
   *
   * On arrivait ici par « Gagner une partie » depuis l'accueil, on gagnait, et
   * la boîte proposait « Revanche » et « Analyser » — sans un mot sur la quête,
   * ni sur ce qu'il restait à faire. Il fallait retourner à l'accueil pour
   * savoir si ça avait compté.
   *
   * Deux issues, selon l'état : rentrer voir sa journée quand c'est fait,
   * enchaîner une partie quand il s'en faut encore d'une victoire.
   */
  quete?: { libelle: string; faite: boolean; restantes: number }
}) {
  const [dismissed, setDismissed] = useState(false)

  /**
   * Délai avant d'annoncer le résultat.
   *
   * Le coup qui met fin à la partie est le plus instructif de tous — c'est le
   * mat qu'on voulait voir, ou celui qu'on n'a pas vu venir. Une boîte de
   * dialogue qui recouvre l'échiquier à l'instant même où il tombe supprime
   * précisément ce qu'on avait à regarder.
   */
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  /*
    Échap refermait déjà ; le reste manquait.

    Ici le focus initial compte plus qu'ailleurs : l'annonce de fin de partie
    apparaît toute seule, sans qu'on ait cliqué quoi que ce soit, et le focus
    restait sur le dernier bouton touché — souvent une case du plateau. « Rejouer »
    demandait donc de retrouver le bouton à la souris.

    `actif` : le dialogue ne se monte pas toujours, et un piège à focus armé
    sur un conteneur absent piégerait le clavier dans le vide.
  */
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, {
    onFermer: () => setDismissed(true),
    actif: !dismissed && revealed,
  })

  if (dismissed || !revealed) return null

  const won = playerColor !== null && result === (playerColor === 'w' ? '1-0' : '0-1')
  const drawn = result === '1/2-1/2'
  const title =
    playerColor === null
      ? drawn
        ? 'Partie nulle'
        : result === '1-0'
          ? 'Les Blancs gagnent'
          : 'Les Noirs gagnent'
      : drawn
        ? 'Partie nulle'
        : won
          ? 'Victoire !'
          : 'Défaite'

  const tone = drawn ? 'var(--q-forced)' : won ? 'var(--q-best)' : 'var(--q-blunder)'

  /** Prépare le PGN pour l'analyse : on le passe par le stockage de session. */
  const handOffForAnalysis = () => {
    const pgn = toPgn(
      moves.map((move, index) => ({
        ply: index,
        moveNumber: Math.floor(index / 2) + 1,
        color: move.color,
        san: move.san,
        uci: move.uci,
        fenBefore: move.before,
        fenAfter: move.after,
        scoreBefore: { type: 'cp', value: 0 },
        scoreAfter: { type: 'cp', value: 0 },
        winBefore: 50,
        winAfter: 50,
        winLoss: 0,
        centipawnLoss: 0,
        accuracy: 100,
        quality: 'good',
        motifs: [],
      })),
      {
        headers: {
          Event: 'Partie Le Coup Parfait',
          Date: formatPgnDate(new Date()),
          White: playerColor === 'w' ? 'Toi' : opponentName,
          Black: playerColor === 'b' ? 'Toi' : opponentName,
          Result: result,
        },
      },
    )
    try {
      sessionStorage.setItem('coupparfait.pendingAnalysis', pgn)
      // Analyser sa partie vue d'en face demande un effort de retournement
      // permanent : on ouvre du côté où l'on jouait. En partie locale il n'y a
      // pas de « son » camp, et l'analyse garde alors la vue des Blancs.
      if (playerColor) sessionStorage.setItem('coupparfait.pendingAnalysisSide', playerColor)
      // Le résultat voyage à part, en plus de l'en-tête `Result` du PGN.
      // L'application vient de l'afficher en grand — « tu as gagné », « échec
      // et mat » — et le faire ensuite redécouvrir par la relecture en relisant
      // du texte qu'on a soi-même écrit ajoute une occasion de le perdre.
      sessionStorage.setItem('coupparfait.pendingAnalysisResult', result)
    } catch {
      // Mode navigation privée très restrictif : l'analyse partira à vide, on
      // pourra toujours coller le PGN à la main.
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      {/* Voile léger et **sans flou** : la position finale doit rester lisible
          derrière l'annonce. Un clic à côté referme, pour revenir à
          l'échiquier sans avoir à choisir une action. */}
      <div
        className="absolute inset-0 bg-black/35"
        onClick={() => setDismissed(true)}
        aria-hidden
      />

      {/* Opaque, comme toute surface qui se superpose au contenu : à travers
          le verre, l'échiquier passait au milieu du texte et « Victoire ! » se
          lisait par-dessus un damier. */}
      <div
        ref={boite}
        className="popover animate-slide-up relative w-full max-w-sm overflow-hidden p-6 text-center shadow-[var(--shadow-lg)]"
      >
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={16} aria-hidden />
        </button>

        <div
          className="mx-auto mb-4 h-1.5 w-16 rounded-full"
          style={{ background: tone }}
          aria-hidden
        />

        <h2 id="game-over-title" className="font-display text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{REASONS[status] || result}</p>

        {ratingDelta != null && (
          <p
            className="mt-3 text-lg font-bold tabular-nums"
            style={{ color: ratingDelta >= 0 ? 'var(--q-best)' : 'var(--q-blunder)' }}
          >
            {ratingDelta >= 0 ? '+' : ''}
            {ratingDelta} Elo
          </p>
        )}

        <p className="mt-4 text-xs text-faint">{moves.length} demi-coups joués</p>

        {/* ── La quête du jour ──────────────────────────────────────────
            Elle est annoncée avant les boutons parce qu'elle décide lequel
            d'entre eux est le bon. */}
        {quete && (
          <div
            className={clsx(
              'mt-4 rounded-[var(--radius-sm)] px-3 py-2.5 text-left',
              quete.faite ? 'bg-[color-mix(in_oklab,var(--q-best)_14%,transparent)]' : 'bg-surface',
            )}
          >
            <p className="text-[12px] font-semibold text-faint">Quête du jour</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold">
              {quete.faite ? (
                <Check size={14} className="shrink-0 text-[var(--q-best)]" aria-hidden />
              ) : (
                <Target size={14} className="shrink-0 text-faint" aria-hidden />
              )}
              {quete.libelle}
              {quete.faite && <span className="text-[var(--q-best)]">— c’est fait</span>}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              {quete.faite
                ? quete.restantes === 0
                  ? 'Toutes les quêtes du jour sont faites.'
                  : `Il te reste ${quete.restantes} quête${quete.restantes > 1 ? 's' : ''} aujourd’hui.`
                : 'Pas encore : il faut une victoire. Une autre partie, et c’est joué.'}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {/* Quête remplie : la sortie passe devant tout le reste. */}
          {quete?.faite && !retour && (
            <Link href="/" className="block">
              <Button variant="primary" size="lg" fullWidth icon={<Trophy size={16} />}>
                Retour aux quêtes du jour
              </Button>
            </Link>
          )}
          {/* Quête à finir : le bouton qui la finit, en premier. */}
          {quete && !quete.faite && onRematch && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<RotateCcw size={16} />}
              onClick={() => {
                setDismissed(true)
                onRematch()
              }}
            >
              Rejouer une partie
            </Button>
          )}
          {retour && (
            <Link href={retour.href} className="block">
              <Button variant="primary" size="lg" fullWidth icon={<Trophy size={16} />}>
                {retour.libelle}
              </Button>
            </Link>
          )}

          {/* Sans coup joué, l'analyse n'a rien à dire : proposer le bouton
              n'aboutirait qu'à un « format non reconnu » sur l'autre écran. */}
          {moves.length > 0 && (
            <Link href="/analyse" onClick={handOffForAnalysis} className="block">
              <Button
                variant={retour || quete ? 'secondary' : 'primary'}
                size="lg"
                fullWidth
                icon={<Gauge size={16} />}
              >
                Analyser la partie
              </Button>
            </Link>
          )}

          <div className="flex gap-2">
            {onRematch && (
              <Button
                variant="secondary"
                fullWidth
                icon={<RotateCcw size={15} />}
                onClick={() => {
                  setDismissed(true)
                  onRematch()
                }}
              >
                Revanche
              </Button>
            )}
            {onNewGame && (
              <Button
                variant="ghost"
                fullWidth
                icon={<Swords size={15} />}
                onClick={() => {
                  setDismissed(true)
                  onNewGame()
                }}
              >
                Nouvelle partie
              </Button>
            )}
          </div>

          {/* La sortie, et il n'y en avait aucune.

              Les trois actions proposées mènent toutes à un échiquier :
              analyser, rejouer, recommencer. Qui ne veut aucune des trois
              referme la boîte — et se retrouve devant une partie terminée, sur
              un écran dont les boutons se sont désactivés en même temps
              qu'elle. Il ne restait plus qu'à revenir en arrière dans le
              navigateur, ce qui n'existe pas franchement sur un téléphone.

              En lien plutôt qu'en bouton : c'est la porte de service, pas
              l'issue qu'on recommande. */}
          <Link
            href="/jouer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-[14px] font-medium text-muted transition-colors hover:text-ink"
          >
            <LayoutGrid size={13} aria-hidden />
            Retour au menu
          </Link>
        </div>
      </div>
    </div>
  )
}
