'use client'

/**
 * Une question avant une action qu'on ne voudrait pas faire par erreur.
 *
 * Elle remplace `window.confirm`, dont la boîte appartient au navigateur : elle
 * s'ouvre en haut de l'écran, loin de l'échiquier, aux couleurs du système,
 * et titrée du nom de domaine — « coupparfait.cparfait.ovh indique ». On la
 * prenait pour un message d'un autre site plutôt que pour une question du jeu.
 *
 * Le focus part sur « Annuler » : la réponse qui ne coûte rien est celle
 * qu'un Entrée réflexe doit donner. Échap et un clic à côté annulent aussi.
 */

import { useId, useRef } from 'react'
import { useT } from '@/lib/i18n/index.tsx'
import { useDialogue } from '@/lib/useDialogue.ts'
import { Button } from './index.tsx'

export function BoiteConfirmation({
  titre,
  texte,
  confirmer,
  danger = false,
  onConfirmer,
  onAnnuler,
}: {
  titre: string
  texte?: string
  /** Libellé du bouton qui agit : un verbe, jamais « OK ». */
  confirmer: string
  /** L'action perd quelque chose — un abandon, par exemple. */
  danger?: boolean
  onConfirmer: () => void
  onAnnuler: () => void
}) {
  const t = useT()
  const boite = useRef<HTMLDivElement>(null)
  const annuler = useRef<HTMLButtonElement>(null)
  const idTitre = useId()
  useDialogue(boite, { onFermer: onAnnuler, focusInitial: annuler })

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={idTitre}
    >
      <div className="absolute inset-0 bg-black/45" onClick={onAnnuler} aria-hidden />

      <div
        ref={boite}
        className="popover animate-slide-up relative w-full max-w-sm p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <h2 id={idTitre} className="font-display text-lg font-bold tracking-tight">
          {titre}
        </h2>
        {texte && <p className="mt-2 text-[14px] leading-relaxed text-muted">{texte}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={annuler} variant="secondary" onClick={onAnnuler}>
            {t('common.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirmer}>
            {confirmer}
          </Button>
        </div>
      </div>
    </div>
  )
}
