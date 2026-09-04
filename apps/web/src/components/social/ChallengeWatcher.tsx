'use client'

/**
 * Le défi qui arrive pendant qu'on fait autre chose.
 *
 * Un ami vous propose une partie : il faut le savoir sans avoir à surveiller
 * une page. Ce guetteur vit dans la coque de l'application, interroge le
 * serveur toutes les quelques secondes et affiche la proposition par-dessus
 * tout le reste, avec ses deux réponses.
 *
 * Elle s'affiche **en haut**, juste sous l'en-tête, et sur toutes les pages
 * sans exception. En bas de l'écran, elle passait inaperçue : sur téléphone la
 * barre de navigation occupe déjà ce coin-là, et sur un écran de jeu le regard
 * ne quitte pas l'échiquier. Une invitation dure quelques minutes, il faut la
 * voir tout de suite ou elle expire toute seule.
 *
 * ── Deux corrections, et elles portent sur le même défaut : on la ratait ──
 *
 *  1. **Elle n'existait pas en plein écran.** Le bouton « plein écran » de
 *     l'échiquier appelle `requestFullscreen` sur le conteneur du plateau : le
 *     navigateur ne rend alors plus *que* cet élément et ses descendants. Le
 *     bandeau, qui vit dans la coque, était donc littéralement hors du rendu —
 *     sur les écrans de jeu, ceux où l'on passe le plus de temps. Il est
 *     maintenant projeté (`createPortal`) dans l'élément en plein écran quand
 *     il y en a un, et dans `document.body` sinon. Au passage, la projection
 *     dans le corps du document le met hors d'atteinte de tout contexte
 *     d'empilement qu'un écran pourrait créer au-dessus de lui.
 *  2. **Elle ressemblait à un menu.** Fond `popover`, texte ordinaire : la même
 *     surface que la liste des thèmes. Une invitation qui expire en cinq
 *     minutes n'est pas un panneau, c'est une alerte — elle est donc peinte à
 *     l'accent, avec un halo qui bat tant qu'on n'a pas répondu.
 *
 * Il se tait pour les visiteurs non connectés — pas de compte, pas d'amis,
 * donc rien à guetter et aucune requête à faire.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { Check, Swords, X } from 'lucide-react'
import { SPEED_LABELS, speedCategory } from '@coupparfait/core'
import { playSound } from '@/lib/sound.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

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
  const identite = useIdentite()
  const signedIn = identite === undefined ? null : identite !== null

  /**
   * Est-on en train de jouer contre quelqu'un ?
   *
   * On n'en cache plus la proposition — elle était tue ici, et l'on manquait
   * l'invitation d'un ami pour la seule raison qu'on finissait une partie
   * contre l'ordinateur juste avant. Mais on prévient : accepter emmène sur un
   * autre échiquier, et celui qu'on quitte continue à tourner.
   */
  const enPartie = pathname.startsWith('/jouer/partie/')

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
    if (!signedIn) return

    let alive = true
    const look = async () => {
      // Rien tant que l'onglet n'est pas devant. Une application installée sur
      // l'écran d'accueil ne se ferme pas : sans cette garde, elle interrogeait
      // le serveur toutes les quatre secondes pendant des journées entières,
      // pour une invitation que personne n'était là pour voir. On reprend au
      // retour au premier plan, immédiatement.
      if (document.visibilityState !== 'visible') return
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

    const reprendre = () => void look()
    void look()
    const timer = setInterval(reprendre, POLL_MS)
    document.addEventListener('visibilitychange', reprendre)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', reprendre)
    }
  }, [signedIn, router])

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

  /**
   * Où poser le bandeau.
   *
   * `document.body` d'ordinaire — et l'élément en plein écran quand il y en a
   * un. C'est tout le correctif des écrans de jeu : en plein écran, le
   * navigateur ne rend que le sous-arbre de l'élément demandé, et la coque de
   * l'application n'en fait pas partie. On guette donc `fullscreenchange`,
   * qui est aussi émis à la sortie.
   *
   * `null` au premier rendu : le serveur n'a pas de `document`, et rendre le
   * portail dès le rendu initial ferait diverger l'hydratation.
   */
  const [hote, setHote] = useState<Element | null>(null)
  useEffect(() => {
    const suivre = () => setHote(document.fullscreenElement ?? document.body)
    suivre()
    document.addEventListener('fullscreenchange', suivre)
    return () => document.removeEventListener('fullscreenchange', suivre)
  }, [])

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

  if (!challenge || !hote) return null

  const minutes = Math.round(challenge.initialTime / 60)
  const speed = speedCategory({
    initial: challenge.initialTime,
    increment: challenge.increment,
  })

  return createPortal(
    // `top-[4.25rem]` : l'en-tête est collant et mesure 57 px — le bandeau se
    // pose juste dessous, jamais derrière. Et au-dessus de tout le reste
    // (`z-[200]`), sans quoi le menu mobile déplié ou une fenêtre de fin de
    // partie le recouvrirait.
    <div className="fixed inset-x-0 top-[4.25rem] z-[200] flex justify-center px-4" role="alert">
      {/*
        Peint à l'accent, et non en surface neutre.

        Le bandeau empruntait la surface `popover` — celle des menus. Posé sur
        un écran de jeu, il se lisait comme un panneau de plus, et l'on y
        répondait quand on l'avait fini de regarder, c'est-à-dire trop tard :
        une invitation expire en cinq minutes. Le halo qui bat n'est pas une
        coquetterie, c'est la seule chose qui attire l'œil hors de l'échiquier ;
        il s'arrête pour qui demande moins d'animations.
      */}
      {/* Deux enveloppes, parce que deux animations : l'entrée par le haut et
          le halo qui bat écrivent la même propriété CSS, et l'une annulerait
          l'autre sur un même élément. */}
      <div className="animate-slide-down w-full max-w-md">
        <div className="animate-pulse-ring rounded-[var(--radius)] bg-accent p-[2px] shadow-[var(--shadow-lg)] motion-reduce:animate-none">
          <div className="flex items-center gap-3 rounded-[calc(var(--radius)-2px)] bg-[var(--bg-elev)] p-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-[var(--accent-contrast)]"
              aria-hidden
            >
              <Swords size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-accent">
                Invitation
              </p>
              <p className="text-sm font-semibold leading-snug">
                {challenge.from.username} te propose une partie
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {minutes} min{challenge.increment > 0 ? ` + ${challenge.increment} s` : ''} ·{' '}
                {SPEED_LABELS[speed]?.fr ?? speed}
                {challenge.rated ? ' · classée' : ''}
              </p>
              {/* Accepter quitte l'échiquier en cours — la pendule, elle, continue
                de tourner. On le dit avant, pas après. */}
              {enPartie && (
                <p className="mt-0.5 text-[12px] font-medium text-[var(--q-inaccuracy)]">
                  Tu joues une partie : accepter t’emmène ailleurs.
                </p>
              )}
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
      </div>
    </div>,
    hote,
  )
}
