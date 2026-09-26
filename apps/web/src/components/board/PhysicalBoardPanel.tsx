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
import { Button, Card, Chip, SectionTitle, Spinner } from '@/components/ui/index.tsx'
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
  ouvert,
  onFermer,
}: {
  state: PhysicalBoardState
  className?: string
  /**
   * Ouverture pilotée de l'extérieur.
   *
   * Fournie, le panneau ne pose plus sa ligne « Brancher un échiquier
   * électronique » : c'est l'écran qui offre l'entrée ailleurs — le menu
   * « … » de la partie contre l'ordinateur, où elle ne prend aucune place à
   * côté de l'échiquier. Il ne s'affiche alors que demandé, ou branché.
   */
  ouvert?: boolean
  onFermer?: () => void
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
  const [deplieInterne, setDeplieInterne] = useState(false)
  const pilote = ouvert !== undefined
  const deplie = pilote ? ouvert : deplieInterne
  const setDeplie = (valeur: boolean) => {
    if (!pilote) setDeplieInterne(valeur)
    else if (!valeur) onFermer?.()
  }

  // Aucune des trois APIs — Safari, Firefox, iOS. Le panneau n'a alors rien à
  // proposer : mieux vaut ne pas l'afficher du tout que promettre en vain.
  if (drivers.length === 0 && !state.board) return null

  if (!state.board && !deplie) {
    if (pilote) return null
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
        <div className="flex flex-col gap-0.5">
          {/* Des lignes, et non des `Button` : ceux-ci ont une hauteur fixe
              et ne passent jamais à la ligne. Deux lignes de texte y
              débordaient l'une sur l'autre, et la liste des modèles
              — « Exclusive, Supreme Tournament 55, King Performance, eONE » —
              sortait de la carte par la droite. Ici elle revient à la ligne :
              c'est le détail qui dit si l'on a le bon plateau. */}
          {drivers.map((driver) => (
            <button
              key={driver.id}
              type="button"
              disabled={state.status === 'connecting'}
              onClick={() => void state.connect(driver)}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-surface-hover disabled:opacity-50 pointer-coarse:min-h-11"
            >
              <span className="shrink-0 text-muted" aria-hidden>
                {state.status === 'connecting' ? (
                  <Spinner size={14} />
                ) : driver.transport === 'bluetooth' ? (
                  <Bluetooth size={14} />
                ) : (
                  <Usb size={14} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t(driver.labelKey)}</span>
                <span className="block text-[12px] leading-snug text-muted">
                  {t(driver.modelsKey)}
                </span>
              </span>
            </button>
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
