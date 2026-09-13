'use client'

/**
 * La relecture pas à pas.
 *
 * Un échiquier, une phrase, un bouton. C'est tout, et c'est le sujet : la vue
 * détaillée montre la courbe d'évaluation, les trois alternatives, les moments
 * clés et la précision de chacun — de quoi répondre à toutes les questions, à
 * condition de savoir lesquelles se poser. Quelqu'un qui débute n'en est pas
 * là. Il veut qu'on lui raconte sa partie, coup par coup, et qu'on lui dise
 * quand appuyer sur « Suivant ».
 *
 * C'est aussi la seule des deux mises en page qui tienne sur un téléphone : la
 * grille à trois colonnes de la vue détaillée n'y rentre pas.
 *
 * **Rien n'est calculé ici.** Le rapport, les flèches, le verdict, la voix
 * viennent tous de l'écran d'analyse, qui les partage entre les deux vues. Ce
 * composant ne fait que les disposer autrement — sans quoi les deux vues
 * finiraient par ne plus dire la même chose du même coup.
 */

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import {
  QUALITY_STYLES,
  formatScore,
  type AnalysedMove,
  type FullGameReport,
} from '@coupparfait/core'
import type { MoveExplanation } from '@coupparfait/core'
import { Button } from '@/components/ui/index.tsx'
import { TexteAvecTermes } from './TexteAvecTermes.tsx'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'

export function RelectureGuidee({
  echiquier,
  report,
  cursor,
  onCursor,
  explanation,
  move,
  onRetourner,
  onMontrer,
  demo,
  format,
  enigme,
  essais,
  onReveler,
}: {
  /** L'échiquier, fabriqué par l'écran d'analyse et partagé avec l'autre vue. */
  echiquier: ReactNode
  report: FullGameReport
  cursor: number
  onCursor: (index: number) => void
  explanation: MoveExplanation | null
  move: AnalysedMove | null
  onRetourner: () => void
  onMontrer: () => void
  /** Vrai pendant la démonstration d'une suite : on n'interrompt pas. */
  demo: boolean
  format: (san: string) => string
  /**
   * Question en cours sur ce coup, et son état.
   *
   * `ouverte` : la réponse est cachée, l'échiquier attend un coup.
   * `trouvee` / `revelee` : on affiche l'explication comme d'habitude, avec un
   * mot de plus qui dit comment on y est arrivé.
   */
  enigme: 'ouverte' | 'trouvee' | 'revelee' | null
  /** Tentatives infructueuses sur la question courante. */
  essais: number
  onReveler: () => void
}) {
  const t = useT()
  const contenu = usePreferences((state) => localeDuContenu(state.locale))
  const style = move ? QUALITY_STYLES[move.quality] : null
  const dernier = cursor >= report.moves.length - 1

  return (
    /* Le rembourrage bas laisse défiler l'échiquier au-dessus de la barre
       d'actions collée : sans lui, la première rangée restait cachée derrière
       elle, et l'on ne voyait jamais les pièces du bas. */
    <div className="mx-auto w-full max-w-2xl pb-28 sm:pb-0">
      {/* ── Le coach ─────────────────────────────────────────────── */}
      <div className="mb-3 flex items-start gap-2">
        {/*
          La tuile du logo, et non le portrait en bois de `cavale-club.png` :
          celui-ci est une pièce sombre sur fond transparent, invisible sur le
          thème sombre — mesuré à l'écran, l'image se chargeait bien et ne se
          voyait pas. La tuile porte son propre dégradé, donc elle se détache
          sur n'importe quel fond.
        */}
        <Image
          src="/brand/logo-cavale.webp"
          alt=""
          width={128}
          height={128}
          className="mt-1 hidden h-14 w-14 shrink-0 rounded-[28%] object-cover sm:block"
          aria-hidden
        />

        {/*
          La bulle, et sa flèche vers le portrait.
          Elle porte le verdict et l'explication, et rien d'autre : les chiffres
          — perte de chances, évaluation — restent dans la vue détaillée. Ici on
          raconte, on ne mesure pas.
        */}
        <div className="glass relative min-h-[5.5rem] flex-1 rounded-[var(--radius-lg)] border border-line p-3.5">
          <span
            className="absolute -left-2 top-6 hidden h-4 w-4 rotate-45 border-b border-l border-line bg-surface sm:block"
            aria-hidden
          />

          {enigme === 'ouverte' && move ? (
            /*
              La question, et rien de ce qui y répondrait.
              On nomme la faute — « ce coup a coûté cher » — sans nommer le coup
              joué : le dire reviendrait à éliminer une possibilité, et la
              question n'a d'intérêt que si l'on repart de la position telle
              qu'elle se présentait.
            */
            <>
              <div className="flex items-start gap-2">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20 text-[14px] font-bold text-accent"
                  aria-hidden
                >
                  ?
                </span>
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                  {t('guided.lostGround')}
                </p>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                {essais === 0
                  ? t('guided.tryFirst')
                  : essais === 1
                    ? t('guided.trySecond')
                    : t('guided.tryMore', { n: essais })}
              </p>
            </>
          ) : explanation && style && move ? (
            <>
              <div className="flex items-start gap-2">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[14px] font-bold"
                  style={{
                    background: `color-mix(in oklab, var(--q-${style.token}) 20%, transparent)`,
                    color: `var(--q-${style.token})`,
                  }}
                  title={`${style.label[contenu]} — ${style.description[contenu]}`}
                >
                  {style.glyph}
                </span>
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                  {explanation.headline}
                </p>
                <span className="shrink-0 rounded-[var(--radius-sm)] bg-surface-strong px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {formatScore(move.scoreAfter)}
                </span>
              </div>

              {/*
                Deux phrases au plus.
                Le corps en compte parfois quatre — le motif, la conséquence, le
                meilleur coup, un exemple de suite. Les quatre valent d'être
                lues, mais pas d'un bloc dans une bulle : au-delà de deux, on
                cesse de lire et on cherche le bouton. Le reste attend dans la
                vue détaillée.
              */}
              {enigme === 'trouvee' && (
                <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-[var(--q-best)]">
                  {t('guided2.foundIt')}
                </p>
              )}
              {explanation.body.slice(0, 2).map((phrase, index) => (
                <TexteAvecTermes
                  key={index}
                  texte={phrase.replace(/\*\*/g, '')}
                  className="mt-1.5 text-[14px] leading-relaxed text-muted"
                />
              ))}
            </>
          ) : (
            <p className="text-[15px] font-medium leading-snug">{t('guided2.startPosition')}</p>
          )}
        </div>
      </div>

      {echiquier}

      {/* ── Le ruban des coups ───────────────────────────────────── */}
      <RubanDesCoups
        report={report}
        cursor={cursor}
        onCursor={onCursor}
        format={format}
        masque={enigme === 'ouverte'}
      />

      {/*
        ── Les actions ──────────────────────────────────────────────
        Collées en bas sur téléphone.
        Mesuré à l'écran : sur un mobile de 812 points de haut, la bulle et
        l'échiquier suffisaient à repousser « Suivant » sous la barre de
        navigation. Le bouton unique du mode pas à pas était donc le seul
        élément qu'on ne voyait pas — de quoi rendre le mode inutilisable là où
        il devait servir le plus.
        `bottom-16` dégage la hauteur de la barre de navigation basse.
      */}
      {/* La rangée se replie, et le bouton d'avancement prend sa ligne.

          « Retourner », « Voir la réponse » et « Suivant » — ce dernier avec un
          plancher de 9 rem — demandent près de 390 points de large. Sur un
          téléphone de 360, le dernier sortait du cadre : c'est celui qui fait
          avancer la relecture, donc le seul qui compte ici. Sur petit écran il
          prend toute la largeur sous les deux autres, ce qui le rend en prime
          atteignable au pouce. */}
      <div className="sticky bottom-16 z-10 -mx-1 mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius)] bg-bg/85 px-1 py-2 backdrop-blur-sm sm:static sm:bg-transparent sm:backdrop-blur-none">
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={onRetourner}
          title={t('guided2.otherSide')}
        >
          Retourner
        </Button>
        {/* Pendant la question, « Montrer » révèle la réponse plutôt que de
            dérouler la suite : on ne déroule pas une suite qu'on n'a pas encore
            trouvée. */}
        {enigme === 'ouverte' ? (
          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={onReveler}>
            {t('guided2.seeAnswer')}
          </Button>
        ) : (
          move?.bestLine &&
          move.bestLine.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Eye size={14} />}
              onClick={onMontrer}
              disabled={demo}
            >
              Montrer
            </Button>
          )
        )}

        <Button
          variant="primary"
          size="lg"
          className="ml-auto min-w-[9rem] max-sm:w-full"
          onClick={() => onCursor(Math.min(report.moves.length - 1, cursor + 1))}
          disabled={dernier}
        >
          {dernier
            ? t('guided2.endOfGame')
            : enigme === 'ouverte'
              ? t('guided2.skip')
              : t('guided2.next')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Les coups, en ruban horizontal centré sur le coup courant.
 *
 * La vue détaillée en donne la liste complète, en colonnes, à droite. Ici on
 * n'en montre que le voisinage : sur un téléphone, une liste de quatre-vingts
 * coups pousse l'échiquier hors de l'écran, et l'on ne consulte de toute façon
 * que ce qui entoure l'endroit où l'on se trouve.
 */
function RubanDesCoups({
  report,
  cursor,
  onCursor,
  format,
  masque,
}: {
  report: FullGameReport
  cursor: number
  onCursor: (index: number) => void
  format: (san: string) => string
  /**
   * Cache le coup courant pendant qu'on cherche à le remplacer.
   *
   * Sans cela le ruban affichait « 3… Cf6 ?? » en rouge juste sous l'échiquier :
   * la question était posée et la réponse — enfin, la mauvaise réponse, celle
   * qu'il ne fallait pas jouer — était donnée dans le même écran. On masque la
   * notation et le verdict, on garde le numéro pour ne pas perdre le repère.
   */
  masque?: boolean
}) {
  const t = useT()
  /*
    Trois coups sur téléphone, cinq à partir d'une tablette.
    Cinq partout était le premier choix, et il tronquait les coups jusqu'à
    l'absurde sur 375 points de large : « 3. [ ?! », « 4. D… ! ». Un ruban qui
    n'affiche plus la notation ne sert plus à se repérer, ce qui est son unique
    fonction.
  */
  const [combien, setCombien] = useState(5)
  useEffect(() => {
    const mesurer = () => setCombien(window.innerWidth < 640 ? 3 : 5)
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [])

  const moitie = Math.floor(combien / 2)
  const debut = Math.max(0, Math.min(cursor - moitie, report.moves.length - combien))
  const visibles = report.moves.slice(debut, debut + combien)

  return (
    <div className="mt-3 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onCursor(Math.max(0, cursor - 1))}
        disabled={cursor === 0}
        aria-label={t('moves.previous')}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover disabled:opacity-30"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {visibles.map((coup) => {
          const index = report.moves.indexOf(coup)
          const style = QUALITY_STYLES[coup.quality]
          const courant = index === cursor
          return (
            <button
              key={coup.ply}
              type="button"
              onClick={() => onCursor(index)}
              className={clsx(
                'flex min-w-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[14px] transition-colors',
                courant ? 'bg-surface-strong font-bold' : 'text-muted hover:bg-surface-hover',
              )}
            >
              <span className="shrink-0 text-[12px] tabular-nums text-faint">
                {coup.moveNumber}
                {coup.color === 'w' ? '.' : '…'}
              </span>
              {masque && courant ? (
                <span className="font-mono text-accent">? ? ?</span>
              ) : (
                <>
                  <span className="truncate font-mono">{format(coup.san)}</span>
                  <span
                    className="shrink-0"
                    style={{ color: `var(--q-${style.token})` }}
                    aria-hidden
                  >
                    {style.glyph}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onCursor(Math.min(report.moves.length - 1, cursor + 1))}
        disabled={cursor >= report.moves.length - 1}
        aria-label="Coup suivant"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover disabled:opacity-30"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  )
}
