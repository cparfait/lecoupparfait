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

import { useEffect, useRef, useState } from 'react'
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

/**
 * Deux lignes demandent six secondes.
 *
 * Quatre secondes suffisent pour lire un titre ; avec une description, on en
 * était encore au milieu quand le message disparaissait. Le compte à rebours
 * lui-même vit dans l'hôte, par message : c'est lui qui sait quand le
 * pointeur est dessus, et qui doit alors attendre.
 */
const DUREE_MIN_AVEC_DESCRIPTION_MS = 6000

function push(kind: ToastKind, message: string, description?: string, durationMs = 4000): number {
  const id = nextId++
  const duree =
    durationMs > 0 && description ? Math.max(durationMs, DUREE_MIN_AVEC_DESCRIPTION_MS) : durationMs
  toasts = [...toasts, { id, kind, message, description, durationMs: duree }]
  emit()
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
      {items.map((item) => (
        <Message key={item.id} item={item} />
      ))}
    </>
  )
}

/**
 * Un message, et son compte à rebours.
 *
 * Le délai part au montage et **s'arrête tant que le pointeur est dessus** —
 * souris ou doigt : on ne retire pas sous les yeux ce qu'on est en train de
 * lire, ni sous le doigt ce qu'on allait fermer. Le temps restant est mémorisé
 * à la pause et repart de là, pas de zéro.
 *
 * `role="alert"` pour une erreur, `status` pour le reste : l'erreur interrompt
 * le lecteur d'écran, une confirmation attend qu'il ait fini sa phrase.
 */
function Message({ item }: { item: Toast }) {
  const Icon = ICONS[item.kind]
  const restant = useRef(item.durationMs)
  const departDu = useRef<number | null>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suspendre = () => {
    if (minuterie.current === null) return
    clearTimeout(minuterie.current)
    minuterie.current = null
    if (departDu.current !== null) restant.current -= Date.now() - departDu.current
    departDu.current = null
  }
  const reprendre = () => {
    if (item.durationMs <= 0 || minuterie.current !== null) return
    departDu.current = Date.now()
    minuterie.current = setTimeout(() => dismiss(item.id), Math.max(0, restant.current))
  }

  useEffect(() => {
    reprendre()
    return suspendre
    // Le message est figé à sa création : rien à resuivre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Alerte
      role={item.kind === 'error' ? 'alert' : 'status'}
      label="Notification"
      teinte={TEINTES[item.kind]}
      // Opaque : un message posé par-dessus la page se lit d'un coup
      // d'œil ou ne sert à rien, et le verre laissait passer le texte
      // qu'il recouvrait.
      className="popover shadow-[var(--shadow)]"
    >
      <div
        className="flex items-start gap-3 p-3"
        onPointerEnter={suspendre}
        onPointerLeave={reprendre}
      >
        <Icon size={17} className={clsx('mt-0.5 shrink-0', TONES[item.kind])} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{item.message}</p>
          {item.description && (
            <p className="mt-0.5 text-xs leading-snug text-muted">{item.description}</p>
          )}
        </div>
        {/* Quarante-quatre points de cible sans grossir la boîte : les marges
            négatives rendent au bouton la place que le rembourrage prenait. */}
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          className="-my-3 -mr-3 grid h-11 w-11 shrink-0 place-items-center rounded text-faint transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </Alerte>
  )
}
