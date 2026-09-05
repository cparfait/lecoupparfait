'use client'

/**
 * Trousse d'interface.
 *
 * Un petit nombre de composants sans dépendance externe, tous branchés sur les
 * variables de thème. Chaque thème les recolore sans qu'aucun d'eux ne
 * connaisse une seule couleur littérale.
 */

import { forwardRef } from 'react'
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  Ref,
} from 'react'
import Link from 'next/link'
import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
//  Bouton
// ─────────────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Le bouton principal est en dégradé, pas en aplat.
 *
 * Un aplat de couleur unie reste plat quelle que soit la couleur : c'est un
 * rectangle teinté. Deux teintes proches — l'accent et sa variante claire —
 * suffisent à lui donner du relief, et la lueur qui s'intensifie au survol
 * fait le reste. C'est le seul élément de l'interface qui a le droit de
 * briller ; s'ils brillent tous, plus rien ne se distingue.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(140deg,var(--accent-soft),var(--accent)_55%,var(--accent-deep))] ' +
    'text-[var(--accent-contrast)] shadow-[var(--glow)] ' +
    'hover:brightness-108 hover:shadow-[var(--glow),0_10px_30px_-10px_color-mix(in_oklab,var(--accent)_70%,transparent)] ' +
    'active:brightness-95',
  secondary:
    'bg-surface-strong text-ink hover:bg-surface-hover border border-line hover:border-[color-mix(in_oklab,var(--accent)_32%,var(--border))]',
  outline:
    'border border-line-strong text-ink hover:bg-surface-hover hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border-strong))]',
  ghost: 'text-muted hover:text-ink hover:bg-surface-hover',
  danger: 'bg-[var(--q-blunder)] text-white hover:brightness-110 active:brightness-95',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-sm)]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[var(--radius)]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading,
    icon,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-all duration-150 active:scale-[.985]',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 14} /> : icon}
      {children}
    </button>
  )
})

/** Même apparence que {@link Button}, mais c'est un lien. */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  ...rest
}: {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
  children: ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-all duration-150 active:scale-[.985]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  )
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('animate-spin', className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.22" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Conteneurs
// ─────────────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  glow,
  as: Tag = 'div',
  id,
  ref,
}: {
  children: ReactNode
  className?: string
  /** Ancre, pour ce qu'un lien doit pouvoir viser depuis une autre page. */
  id?: string
  /** Ajoute le contour dégradé caractéristique du thème. */
  glow?: boolean
  as?: 'div' | 'section' | 'article' | 'aside'
  /**
   * Accès à l'élément, pour ce qui a besoin de le mesurer ou d'y aller.
   *
   * Le tchat d'une partie s'ouvre par un bouton posé sous l'échiquier alors
   * que le panneau vit tout en bas de la colonne : il faut pouvoir le faire
   * défiler jusque sous les yeux. React 19 passe `ref` comme une propriété
   * ordinaire, aucun `forwardRef` n'est nécessaire.
   */
  ref?: Ref<HTMLElement>
}) {
  return (
    <Tag id={id} ref={ref as never} className={clsx('glass', glow && 'gradient-ring', className)}>
      {children}
    </Tag>
  )
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode
  hint?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export type TonChip = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONS_CHIP: Record<TonChip, string> = {
  neutral: 'bg-surface text-muted border-line',
  accent:
    'bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-accent border-[color-mix(in_oklab,var(--accent)_35%,transparent)]',
  success:
    'bg-[color-mix(in_oklab,var(--q-best)_16%,transparent)] text-[var(--q-best)] border-[color-mix(in_oklab,var(--q-best)_32%,transparent)]',
  warning:
    'bg-[color-mix(in_oklab,var(--q-inaccuracy)_16%,transparent)] text-[var(--q-inaccuracy)] border-[color-mix(in_oklab,var(--q-inaccuracy)_32%,transparent)]',
  danger:
    'bg-[color-mix(in_oklab,var(--q-blunder)_16%,transparent)] text-[var(--q-blunder)] border-[color-mix(in_oklab,var(--q-blunder)_32%,transparent)]',
}

/**
 * L'habillage d'une pastille, sans la pastille.
 *
 * Exporté pour ce qui doit *être* une pastille sans passer par `Chip` : la
 * pastille des points de carrière ouvre un panneau, donc son bouton est celui
 * de `Menu`. Recopier les classes à la main, c'est se garantir qu'un jour l'une
 * des deux aura la bonne bordure et l'autre l'ancienne.
 */
export function classesChip(tone: TonChip = 'neutral', className?: string): string {
  return clsx(
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
    'text-[11px] font-semibold uppercase tracking-wide',
    TONS_CHIP[tone],
    className,
  )
}

/** Étiquette compacte, pour les codes ECO, les cadences, les thèmes. */
export function Chip({
  children,
  tone = 'neutral',
  className,
  style,
  onClick,
  active,
  title,
}: {
  children: ReactNode
  tone?: TonChip
  className?: string
  /**
   * Teinte imposée, hors des cinq tons prévus.
   *
   * Sert quand la couleur ne vient pas du barème mais d'ailleurs — les
   * étiquettes « joué » et « meilleur » de la liste des alternatives reprennent
   * celle de leur flèche sur l'échiquier, qui est définie dans `boardKit`.
   */
  style?: CSSProperties
  onClick?: () => void
  active?: boolean
  /** Infobulle : sert notamment à afficher la définition d'un motif tactique. */
  title?: string
}) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      title={title}
      style={style}
      className={classesChip(
        tone,
        clsx(
          onClick && 'cursor-pointer transition-colors hover:brightness-125',
          active && 'ring-1 ring-accent',
          className,
        ),
      )}
    >
      {children}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Contrôles de formulaire
// ─────────────────────────────────────────────────────────────────────────────

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }
>(function Input({ label, hint, error, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={clsx(
          'h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 text-sm',
          'placeholder:text-faint transition-colors',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]',
          error ? 'border-[var(--q-blunder)]' : 'border-line',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-[var(--q-blunder)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-center justify-between gap-4 py-2',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-surface-strong border border-line',
        )}
      >
        <span
          className={clsx(
            // `left-0` est indispensable : sans origine explicite, la pastille
            // part de sa position statique, et les boutons sont centrés par
            // défaut. Elle se retrouvait alors décalée de la moitié du rail et
            // débordait à droite.
            'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  format?: (value: number) => string
}) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs tabular-nums text-muted">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-strong accent-[var(--accent)]"
        style={{
          background: `linear-gradient(to right, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--surface-strong) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  )
}

/** Groupe de boutons exclusifs — plus rapide qu'un menu déroulant. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: ReactNode; title?: string }>
  label?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-full gap-0.5 rounded-[var(--radius-sm)] border border-line bg-surface p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex-1 rounded-[calc(var(--radius-sm)-2px)] font-medium transition-all',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === option.value
              ? 'bg-accent text-[var(--accent-contrast)] shadow-sm'
              : 'text-muted hover:bg-surface-hover hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  États
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Squelette de chargement, avec le miroitement du thème. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('rounded-[var(--radius-sm)] bg-surface-strong', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--text) 8%, transparent) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s linear infinite',
      }}
      aria-hidden
    />
  )
}
