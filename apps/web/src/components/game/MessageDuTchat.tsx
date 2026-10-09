'use client'

/**
 * Un message du tchat d'une partie, avec de quoi le signaler ou faire taire
 * son auteur.
 *
 * Google l'exige de toute appli où des inconnus s'écrivent, et plus encore
 * quand des enfants y jouent : chaque message reçu doit pouvoir être signalé,
 * et son auteur bloqué. Les deux gestes se replient derrière « … », au bout du
 * message — ils doivent être là sans encombrer une conversation qui, la
 * plupart du temps, se résume à « bien joué ».
 *
 * Pas de menu déroulant : le fil défile, et un panneau posé dedans y serait
 * coupé par son bord. Les deux boutons se déplient sous le message, dans le
 * flux du fil.
 */

import { useState } from 'react'
import { Ban, Ellipsis, Flag } from 'lucide-react'
import type { ChatMessage } from '@/lib/game/useLiveGame.ts'
import { useT } from '@/lib/i18n/index.tsx'

const ACTION =
  'inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-11'

export function MessageDuTchat({
  message,
  texte,
  siens,
  signale,
  onSignaler,
  onBloquer,
}: {
  message: ChatMessage
  /** Le texte à afficher, traduit s'il s'agit d'une annonce du salon. */
  texte: string
  /** Écrit par soi : rien à signaler ni à bloquer. */
  siens: boolean
  /** Déjà signalé depuis cette page. */
  signale: boolean
  onSignaler: () => void
  onBloquer: () => void
}) {
  const t = useT()
  const [ouvert, setOuvert] = useState(false)

  if (message.system) return <p className="text-xs italic text-faint">{texte}</p>

  // Un message sans numéro vient d'avant un redémarrage du serveur : son
  // auteur est oublié, il n'y a plus personne à signaler ni à bloquer.
  const moderable = !siens && Boolean(message.id && message.auteur)

  return (
    <div>
      <div className="flex items-start gap-1">
        <p className="min-w-0 flex-1 break-words">
          <span className="font-semibold text-accent">{message.from} : </span>
          {texte}
        </p>
        {moderable && (
          <button
            type="button"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-expanded={ouvert}
            aria-label={t('live.messageActions', { nom: message.from })}
            className="-my-0.5 flex shrink-0 items-center justify-center rounded p-1 text-faint transition-colors hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          >
            <Ellipsis size={15} aria-hidden />
          </button>
        )}
      </div>
      {moderable && ouvert && (
        <div className="mt-1.5 mb-1 flex flex-wrap gap-1.5">
          <button
            type="button"
            className={ACTION}
            disabled={signale}
            onClick={() => {
              onSignaler()
              setOuvert(false)
            }}
          >
            <Flag size={13} aria-hidden />
            {t(signale ? 'live.reported' : 'live.report')}
          </button>
          <button
            type="button"
            className={ACTION}
            onClick={() => {
              onBloquer()
              setOuvert(false)
            }}
          >
            <Ban size={13} aria-hidden />
            {t('live.block', { nom: message.from })}
          </button>
        </div>
      )}
    </div>
  )
}
