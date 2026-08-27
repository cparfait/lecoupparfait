'use client'

/**
 * Notifications éphémères.
 *
 * Un store minimal plutôt qu'une dépendance : trois fonctions et un composant.
 * Les messages s'empilent en bas sur mobile, en haut à droite sur grand écran —
 * là où le pouce ne les recouvre pas.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import clsx from 'clsx'

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

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div
      className={clsx(
        'pointer-events-none fixed z-[100] flex flex-col gap-2',
        'inset-x-3 bottom-3 safe-bottom',
        'sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:w-80',
      )}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {items.map((item) => {
        const Icon = ICONS[item.kind]
        return (
          <div
            key={item.id}
            className="animate-slide-up pointer-events-auto flex items-start gap-3 rounded-[var(--radius)] glass-strong p-3 shadow-[var(--shadow)]"
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
          </div>
        )
      })}
    </div>
  )
}
