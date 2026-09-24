'use client'

import { Flag, LayoutGrid, Lightbulb, MoreHorizontal, RefreshCw, Undo2 } from 'lucide-react'
import { CommentaryToggle } from '@/components/game/LiveCommentary.tsx'
import { Menu, MenuItem } from '@/components/ui/Menu.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { ActionDuPouce } from './ActionDuPouce.tsx'

/**
 * La barre du bas de l'écran de jeu, sur téléphone.
 *
 * Les mêmes actions que la version grand écran, en colonnes égales, icône
 * au-dessus du mot — voir le commentaire « Téléphone : le ruban, puis la
 * barre du pouce » dans l'écran de jeu, et `ActionDuPouce`. Elle ne décide
 * rien : l'écran lui dit ce qui est permis et ce que fait chaque case.
 */
export function BarreDuPouce({
  classee,
  gameOver,
  sansAide,
  commentaryMode,
  onCommentaryChange,
  onNewGame,
  onRematch,
  onResign,
  onHint,
  onUndo,
  hintDisabled,
  undoDisabled,
}: {
  /** Partie classée : l'interrupteur du mode commenté disparaît du menu. */
  classee: boolean
  gameOver: boolean
  /** Ni indice ni annulation : partie classée ou ronde de tournoi. */
  sansAide: boolean
  commentaryMode: boolean
  onCommentaryChange: (value: boolean) => void
  onNewGame: () => void
  onRematch: () => void
  onResign: () => void
  onHint: () => void
  onUndo: () => void
  hintDisabled: boolean
  undoDisabled: boolean
}) {
  const t = useT()

  return (
    <div className="mt-1 flex items-stretch justify-around gap-1 border-t border-line/60 pt-1">
      <Menu
        align="right"
        sens="haut"
        largeur="w-60"
        label={t('computer.gameOptions')}
        className="flex-1"
        declencheur={() => (
          <span className="flex min-h-11 w-full flex-col items-center justify-center gap-0.5">
            <MoreHorizontal size={19} aria-hidden />
            <span className="text-[12px] font-medium leading-none">{t('bits.options')}</span>
          </span>
        )}
      >
        <MenuItem
          onClick={onNewGame}
          icone={<RefreshCw size={15} className="shrink-0 text-accent" aria-hidden />}
        >
          {t('game.newGame')}
        </MenuItem>
        <MenuItem
          href="/jouer"
          icone={<LayoutGrid size={15} className="shrink-0 text-accent" aria-hidden />}
        >
          {t('game.over.backToMenu')}
        </MenuItem>
        {!classee && (
          <div data-garde-ouvert className="mt-1 border-t border-line/60 pt-1">
            {/* `data-garde-ouvert` : commuter le mode commenté ne doit pas refermer
    le menu, sinon on ne voit pas ce qu’on vient de changer. */}
            <CommentaryToggle active={commentaryMode} onChange={onCommentaryChange} />
          </div>
        )}
      </Menu>

      {gameOver ? (
        <>
          <ActionDuPouce
            icone={<RefreshCw size={19} aria-hidden />}
            libelle={t('rush.playAgain')}
            onClick={onRematch}
          />
          <ActionDuPouce
            icone={<LayoutGrid size={19} aria-hidden />}
            libelle={t('nav.menu')}
            href="/jouer"
          />
        </>
      ) : (
        <>
          <ActionDuPouce
            icone={<Flag size={19} aria-hidden />}
            libelle={t('game.resign')}
            onClick={onResign}
            discret
          />
          {!sansAide && (
            <>
              <ActionDuPouce
                icone={<Lightbulb size={19} aria-hidden />}
                libelle={t('game.hint')}
                onClick={onHint}
                disabled={hintDisabled}
              />
              <ActionDuPouce
                icone={<Undo2 size={19} aria-hidden />}
                libelle={t('bits.undo')}
                onClick={onUndo}
                disabled={undoDisabled}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
