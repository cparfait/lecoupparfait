'use client'

/**
 * Notifications éphémères.
 *
 * Un store minimal plutôt qu'une dépendance : trois fonctions et un composant.
 * Les messages rejoignent la pile d'alertes — sous l'en-tête, au centre, avec
 * la reprise d'une partie et le défi d'un ami. Ils s'empilaient auparavant en
 * bas sur téléphone et en haut à droite sur grand écran : deux positions, deux
 * coins, et dans les deux cas hors du chemin du regard. Voir `Alerte`.
 *
 * Chacun bat de sa propre teinte à l'arrivée : un avertissement orange et une
 * confirmation verte ne demandent pas la même attention, et le halo le dit
 * avant qu'on ait lu.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import clsx from 'clsx'
import { Alerte } from '@/components/ui/Alerte.tsx'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  description?: string
  durationMs: number
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()
let nextId = 1

function emit(): void {
  for (const listener of listeners) listener([...toasts])
}

function dismiss(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

function push(kind: ToastKind, message: string, description?: string, durationMs = 4000): number {
  const id = nextId++
  toasts = [...toasts, { id, kind, message, description, durationMs }]
  emit()
  if (durationMs > 0) {
    setTimeout(() => dismiss(id), durationMs)
  }
  return id
}

export const toast = {
  info: (message: string, description?: string) => push('info', message, description),
  success: (message: string, description?: string) => push('success', message, description),
  warning: (message: string, description?: string) => push('warning', message, description),
  error: (message: string, description?: string) => push('error', message, description, 6000),
  dismiss,
}

const ICONS = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
} as const

const TONES = {
  info: 'text-accent',
  success: 'text-[var(--q-best)]',
  warning: 'text-[var(--q-inaccuracy)]',
  error: 'text-[var(--q-blunder)]',
} as const

/** La même échelle, pour le halo qui bat à l'apparition. */
const TEINTES = {
  info: 'var(--accent)',
  success: 'var(--q-best)',
  warning: 'var(--q-inaccuracy)',
  error: 'var(--q-blunder)',
} as const

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.add(setItems)

    /*
      Rattraper ce qui a été poussé avant l'abonnement.

      React exécute les effets en remontant l'arbre : ceux d'une page partent
      avant celui de cet hôte, qui vit dans la coque. Un message émis au
      montage d'une page — « cette position n'est pas jouable », « ta session a
      expiré » — arrivait donc dans une pile que personne n'écoutait encore, et
      disparaissait sans avoir été vu. Il restait bien dans `toasts`, mais
      l'hôte partait de son tableau vide et ne l'en sortait jamais.

      C'est le cas des messages qui comptent le plus : ceux qui expliquent
      pourquoi l'écran n'est pas celui qu'on attendait.
    */
    if (toasts.length > 0) setItems([...toasts])

    return () => {
      listeners.delete(setItems)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <>
      {items.map((item) => {
        const Icon = ICONS[item.kind]
        return (
          <Alerte
            key={item.id}
            role="status"
            label="Notification"
            teinte={TEINTES[item.kind]}
            // Opaque : un message posé par-dessus la page se lit d'un coup
            // d'œil ou ne sert à rien, et le verre laissait passer le texte
            // qu'il recouvrait.
            className="popover flex items-start gap-3 p-3 shadow-[var(--shadow)]"
          >
            <Icon size={17} className={clsx('mt-0.5 shrink-0', TONES[item.kind])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{item.message}</p>
              {item.description && (
                <p className="mt-0.5 text-xs leading-snug text-muted">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded p-0.5 text-faint transition-colors hover:text-ink"
              aria-label="Fermer"
            >
              <X size={14} aria-hidden />
            </button>
          </Alerte>
        )
      })}
    </>
  )
}
