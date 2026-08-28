'use client'

/**
 * Le défi qui arrive pendant qu'on fait autre chose.
 *
 * Un ami vous propose une partie : il faut le savoir sans avoir à surveiller
 * une page. Ce guetteur vit dans la coque de l'application, interroge le
 * serveur toutes les quelques secondes et affiche la proposition par-dessus
 * tout le reste, avec ses deux réponses.
 *
 * Il se tait pour les visiteurs non connectés — pas de compte, pas d'amis,
 * donc rien à guetter et aucune requête à faire.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Check, Swords, X } from 'lucide-react'
import { SPEED_LABELS, speedCategory } from '@coupparfait/core'
import { playSound } from '@/lib/sound.ts'
import { toast } from '@/components/ui/Toast.tsx'

interface Challenge {
  id: string
  slug: string
  from: { username: string }
  initialTime: number
  increment: number
  rated: boolean
}

/** Un défi qu'on a lancé, dont on guette l'acceptation. */
interface Outgoing {
  id: string
  slug: string
  status: string
  initialTime: number
  increment: number
  rated: boolean
}

/**
 * Rythme d'interrogation.
 *
 * Quatre secondes : celui qui défie ne trouve pas le temps long, et une
 * requête toutes les quatre secondes reste négligeable pour un serveur qui
 * fait tourner Stockfish à côté.
 */
const POLL_MS = 4000

export function ChallengeWatcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [answering, setAnswering] = useState(false)

  /**
   * Sait-on déjà qu'il y a un compte ?
   *
   * `null` tant qu'on n'a pas demandé, `false` pour un visiteur — auquel cas
   * on cesse définitivement d'interroger.
   */
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    void fetch('/api/auth')
      .then((response) => response.json())
      .then((data: { user: unknown }) => setSignedIn(data.user != null))
      .catch(() => setSignedIn(false))
  }, [])

  // On se tait pendant une partie : y annoncer une autre proposition
  // reviendrait à inviter quelqu'un à abandonner celle qu'il joue.
  const silent = pathname.startsWith('/jouer/partie/')

  /**
   * Emmener celui qui a proposé, dès que l'autre accepte.
   *
   * Cette surveillance-là vivait dans la page du carnet — donc seulement si
   * l'on y restait. Qui lançait un défi puis allait faire un puzzle n'était
   * jamais conduit sur l'échiquier, et l'autre attendait devant une partie
   * vide. Elle vit ici, où elle suit partout.
   */
  const navigated = useRef<string | null>(null)

  useEffect(() => {
    if (!signedIn || silent) return

    let alive = true
    const look = async () => {
      try {
        const response = await fetch('/api/defis')
        if (!response.ok || !alive) return
        const data: { incoming?: Challenge[]; outgoing?: Outgoing[] } = await response.json()
        setChallenge(data.incoming?.[0] ?? null)

        const accepted = data.outgoing?.find((entry) => entry.status === 'accepted')
        if (accepted && navigated.current !== accepted.id) {
          navigated.current = accepted.id
          const tc = `${accepted.initialTime}+${accepted.increment}`
          router.push(
            `/jouer/partie/${accepted.slug}?tc=${tc}${accepted.rated ? '&classee=1' : ''}`,
          )
        }
      } catch {
        // Serveur injoignable : on réessaiera au prochain tour.
      }
    }

    void look()
    const timer = setInterval(() => void look(), POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [signedIn, silent, router])

  const respond = useCallback(
    async (accept: boolean) => {
      if (!challenge || answering) return
      setAnswering(true)
      try {
        const response = await fetch('/api/defis', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'respond', id: challenge.id, accept }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          toast.error(data.error ?? 'Défi expiré.')
          setChallenge(null)
          return
        }

        if (accept && data.slug) {
          const tc = `${data.initialTime}+${data.increment}`
          router.push(`/jouer/partie/${data.slug}?tc=${tc}${data.rated ? '&classee=1' : ''}`)
        }
        setChallenge(null)
      } finally {
        setAnswering(false)
      }
    },
    [challenge, answering, router],
  )

  // Une proposition qu'on n'a pas vue passer ne sert à rien : on la signale
  // aussi au son, une seule fois par défi.
  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (!challenge || announced.current === challenge.id) return
    announced.current = challenge.id
    // Le bruitage peut être refusé tant que la page n'a pas été touchée : sans
    // gravité, l'annonce reste visible.
    playSound('start')
  }, [challenge])

  if (!challenge) return null

  const minutes = Math.round(challenge.initialTime / 60)
  const speed = speedCategory({
    initial: challenge.initialTime,
    increment: challenge.increment,
  })

  return (
    <div className="fixed inset-x-0 bottom-4 z-[95] flex justify-center px-4 md:bottom-6">
      <div className="animate-slide-up popover flex w-full max-w-md items-center gap-3 p-3 shadow-[var(--shadow-lg)]">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
          aria-hidden
        >
          <Swords size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">
            {challenge.from.username} te propose une partie
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {minutes} min{challenge.increment > 0 ? ` + ${challenge.increment} s` : ''} ·{' '}
            {SPEED_LABELS[speed]?.fr ?? speed}
            {challenge.rated ? ' · classée' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void respond(false)}
          disabled={answering}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50"
          aria-label="Refuser"
          title="Refuser"
        >
          <X size={17} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void respond(true)}
          disabled={answering}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          <Check size={15} aria-hidden />
          Accepter
        </button>
      </div>
    </div>
  )
}
