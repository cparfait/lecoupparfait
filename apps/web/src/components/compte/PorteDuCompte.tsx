'use client'

/**
 * « Cette rubrique demande un compte » — dit au moment du clic.
 *
 * Trois partis pris, et ce sont eux qui font la différence entre une
 * explication et un péage.
 *
 * **On dit pourquoi celle-ci.** Une phrase propre à la rubrique, jamais un
 * argumentaire général : quelqu'un qui clique sur « Correspondance » veut
 * savoir pourquoi *elle* est fermée alors que jouer ne l'est pas. Le fichier
 * `lib/compte/avantages.ts` tient ces phrases.
 *
 * **On rappelle ce qui reste libre.** La première ligne le dit avant les
 * boutons. C'est la promesse du projet, et une incitation qui la passerait sous
 * silence pour paraître plus convaincante se retournerait contre elle.
 *
 * **On peut passer.** « Voir quand même » ouvre la page : elle explique la même
 * chose à sa façon, et rien ne justifie d'empêcher quelqu'un d'aller regarder.
 * Un dialogue sans issue transformerait l'explication en mur, ce qu'elle
 * remplace précisément.
 */

import { useRef } from 'react'
import { useDialogue } from '@/lib/useDialogue.ts'
import Link from 'next/link'
import { Check, Lock, X } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/index.tsx'
import type { AvantageCompte } from '@/lib/compte/avantages.ts'

export function PorteDuCompte({
  avantage,
  href,
  onFermer,
}: {
  avantage: AvantageCompte
  /** La destination, pour « Voir quand même ». */
  href: string
  onFermer: () => void
}) {
  // Échap, focus initial, piège à Tab et retour du focus à la fermeture :
  // les quatre gestes d'un dialogue modal, dans `useDialogue`. Seul le premier
  // était fait ici.
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, { onFermer })

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="porte-compte-titre"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onFermer} aria-hidden />

      <div
        ref={boite}
        className="popover animate-slide-up relative w-full max-w-sm overflow-hidden p-6 shadow-[var(--shadow-lg)]"
      >
        <button
          type="button"
          onClick={onFermer}
          className="absolute right-3 top-3 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={16} aria-hidden />
        </button>

        <span
          className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent"
          aria-hidden
        >
          <Lock size={19} />
        </span>

        <h2 id="porte-compte-titre" className="font-display text-xl font-bold tracking-tight">
          {avantage.titre}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{avantage.raison}</p>

        <ul className="mt-4 space-y-1.5">
          {avantage.gains.map((gain) => (
            <li key={gain} className="flex items-start gap-2 text-[14px] leading-snug">
              <Check size={14} className="mt-0.5 shrink-0 text-[var(--q-best)]" aria-hidden />
              <span>{gain}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[12px] leading-relaxed text-muted">
          Jouer, apprendre, résoudre des puzzles et analyser tes parties restent entièrement libres,
          sans rien créer. Le compte est gratuit : un pseudo, un mot de passe, et l’adresse est
          facultative.
        </p>

        <div className="mt-4 space-y-2">
          <ButtonLink href="/connexion" variant="primary" fullWidth>
            Créer un compte
          </ButtonLink>
          <div className="flex gap-2">
            <Link href="/connexion" className="min-w-0 flex-1">
              <Button variant="secondary" fullWidth>
                Se connecter
              </Button>
            </Link>
            <Link href={href} className="min-w-0 flex-1" onClick={onFermer}>
              <Button variant="ghost" fullWidth>
                Voir quand même
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
