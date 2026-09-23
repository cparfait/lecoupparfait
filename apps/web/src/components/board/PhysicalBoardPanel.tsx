'use client'

/**
 * Branchement d'un échiquier électronique.
 *
 * Le panneau reste volontairement bavard tant que la carte n'est pas d'accord
 * avec la partie : c'est le seul moment où l'utilisateur a besoin d'aide, et
 * une carte silencieuse qui ne joue pas est la pire des situations.
 */

import { useEffect, useState } from 'react'
import { Bluetooth, Check, CircleAlert, Hand, Unplug, Usb } from 'lucide-react'
import type { PieceSymbol } from 'chess.js'
import { Button, Card, Chip, SectionTitle } from '@/components/ui/index.tsx'
import { availableDrivers } from '@/lib/board/registry.ts'
import type { BoardDriver } from '@/lib/board/types.ts'
import type { PhysicalBoardState } from '@/lib/board/usePhysicalBoard.ts'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'

const PROMOTION_LABELS: ReadonlyArray<{ piece: PieceSymbol; label: TranslationKey }> = [
  { piece: 'q', label: 'board.pieceQueen' },
  { piece: 'r', label: 'board.pieceRook' },
  { piece: 'b', label: 'board.pieceBishop' },
  { piece: 'n', label: 'board.pieceKnight' },
]

export function PhysicalBoardPanel({
  state,
  className,
}: {
  state: PhysicalBoardState
  className?: string
}) {
  const t = useT()
  // Les trois APIs se lisent sur `navigator` : le rendu serveur n'en sait
  // rien, et afficher la liste dès le premier rendu produirait une
  // discordance d'hydratation. On attend donc le navigateur.
  const [drivers, setDrivers] = useState<BoardDriver[]>([])
  useEffect(() => setDrivers(availableDrivers()), [])

  /**
   * Replié tant qu'aucun plateau n'est branché.
   *
   * Déplié, ce panneau énumère six marques d'échiquiers électroniques. C'est
   * précieux pour qui en possède un, et c'est du bruit pour tous les autres —
   * c'est-à-dire la quasi-totalité des joueurs, à qui l'on montrait une liste
   * de matériel qu'ils n'ont pas, en permanence, à côté de l'échiquier.
   *
   * On garde donc une seule ligne discrète, et le panneau complet ne s'ouvre
   * qu'à la demande. Dès qu'un plateau est connecté, il s'ouvre de lui-même :
   * c'est à ce moment-là qu'on a besoin de le voir.
   */
  const [deplie, setDeplie] = useState(false)

  // Aucune des trois APIs — Safari, Firefox, iOS. Le panneau n'a alors rien à
  // proposer : mieux vaut ne pas l'afficher du tout que promettre en vain.
  if (drivers.length === 0 && !state.board) return null

  if (!state.board && !deplie) {
    return (
      <button
        type="button"
        onClick={() => setDeplie(true)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs text-faint transition-colors hover:bg-surface-hover hover:text-muted pointer-coarse:min-h-11"
      >
        <Bluetooth size={13} className="shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{t('board.connect')}</span>
        <span aria-hidden>+</span>
      </button>
    )
  }

  return (
    <Card className={className ?? 'p-4'}>
      <SectionTitle
        hint={t('board.hint')}
        action={
          !state.board ? (
            <button
              type="button"
              onClick={() => setDeplie(false)}
              className="shrink-0 text-xs text-faint transition-colors hover:text-ink"
            >
              {t('bits.hide')}
            </button>
          ) : null
        }
      >
        {t('board.title')}
      </SectionTitle>

      {!state.board && (
        <div className="flex flex-col gap-1.5">
          {drivers.map((driver) => (
            <Button
              key={driver.id}
              size="sm"
              variant="ghost"
              className="justify-start"
              loading={state.status === 'connecting'}
              icon={driver.transport === 'bluetooth' ? <Bluetooth size={14} /> : <Usb size={14} />}
              onClick={() => void state.connect(driver)}
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="text-sm">{t(driver.labelKey)}</span>
                <span className="truncate text-[12px] text-muted">{t(driver.modelsKey)}</span>
              </span>
            </Button>
          ))}
        </div>
      )}

      {state.board && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <StatusChip state={state} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{state.board.label}</span>
            <Button
              size="sm"
              variant="ghost"
              icon={<Unplug size={14} />}
              onClick={() => void state.disconnect()}
            >
              {t('board.disconnect')}
            </Button>
          </div>

          {state.flipped && <p className="text-xs text-muted">{t('board.upsideDown')}</p>}

          {!state.board.lights && state.status === 'mismatch' && (
            <p className="text-xs text-muted">{t('board.noLeds')}</p>
          )}

          {state.message && <p className="text-xs text-muted">{state.message}</p>}

          {state.pendingPromotion && (
            <div>
              <p className="mb-1.5 text-xs">
                {t('board.promotionOn', { case: state.pendingPromotion.to })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PROMOTION_LABELS.map(({ piece, label }) => (
                  <Button
                    key={piece}
                    size="sm"
                    variant={piece === 'q' ? 'primary' : 'ghost'}
                    onClick={() => state.choosePromotion(piece)}
                  >
                    {t(label)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function StatusChip({ state }: { state: PhysicalBoardState }) {
  const t = useT()
  if (state.status === 'mismatch') {
    return (
      <Chip tone="warning">
        <CircleAlert size={12} className="mr-1 inline" />
        {t('board.toFix')}
      </Chip>
    )
  }
  if (state.status === 'lifted') {
    return (
      <Chip tone="neutral">
        <Hand size={12} className="mr-1 inline" />
        {t('board.pieceInHand')}
      </Chip>
    )
  }
  if (state.status === 'error') return <Chip tone="danger">{t('common.error')}</Chip>
  return (
    <Chip tone="success">
      <Check size={12} className="mr-1 inline" />
      {t('board.ready')}
    </Chip>
  )
}
