'use client'

/**
 * Créer une partie entre amis.
 *
 * Le geste doit tenir en dix secondes : choisir une cadence, obtenir un lien,
 * l'envoyer. Pas de compte, pas d'invitation à accepter, pas de salon d'attente
 * à rafraîchir. Celui qui ouvre le lien devient l'adversaire.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Link2, Share2, Users } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import { Button, Card, Chip, Input, SectionTitle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { generateGameSlug } from '@/lib/game/useLiveGame.ts'

export default function CreateFriendGamePage() {
  const router = useRouter()
  const [timeControlId, setTimeControlId] = useState('600+5')
  const [rated, setRated] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const url = slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/jouer/partie/${slug}?tc=${timeControlId}${rated ? '&classee=1' : ''}`
    : null

  const create = useCallback(() => {
    const created = generateGameSlug()
    setSlug(created)
    if (name.trim()) {
      try {
        localStorage.setItem('coupparfait.guestName', name.trim())
      } catch {
        // Stockage refusé : le pseudo sera simplement « Invité ».
      }
    }
  }, [name])

  const copy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Lien copié', 'Envoie-le à ton adversaire.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.warning('Copie impossible', 'Sélectionne le lien et copie-le à la main.')
    }
  }, [url])

  const share = useCallback(async () => {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Partie d’échecs sur Le Coup Parfait',
          text: 'Viens jouer une partie !',
          url,
        })
        return
      } catch {
        // Partage annulé par l'utilisateur : rien à signaler.
      }
    }
    void copy()
  }, [url, copy])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Jouer contre un ami</h1>
      <p className="mt-2 text-muted">
        Choisis une cadence, crée le lien, envoie-le. Ton ami n’a besoin d’aucun compte : il
        clique, il joue.
      </p>

      {!slug ? (
        <>
          <Card className="mt-7 p-5">
            <SectionTitle hint="Le premier nombre est le temps de départ, le second ce que chaque coup rapporte.">
              Cadence
            </SectionTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {TIME_CONTROLS.filter((tc) =>
                ['180+0', '180+2', '300+0', '300+3', '600+0', '600+5', '900+10', '1800+20'].includes(
                  tc.id,
                ),
              ).map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => setTimeControlId(tc.id)}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-2 py-2.5 text-xs font-medium transition-colors',
                    timeControlId === tc.id
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  <span className="block text-base" aria-hidden>
                    {SPEED_LABELS[tc.category].icon}
                  </span>
                  {tc.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <Input
              label="Ton pseudo (facultatif)"
              name="guestName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Invité"
              maxLength={20}
              hint="Sert uniquement à ce que ton adversaire sache qui il affronte."
            />

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={rated}
                onChange={(event) => setRated(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">Partie classée</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Le classement des deux joueurs sera mis à jour. Nécessite que vous ayez tous
                  les deux un compte.
                </span>
              </span>
            </label>
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-5"
            icon={<Link2 size={17} />}
            onClick={create}
          >
            Créer le lien de partie
          </Button>
        </>
      ) : (
        <Card glow className="mt-7 overflow-hidden">
          <div className="p-6 text-center">
            <span
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
              style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)' }}
              aria-hidden
            >
              <Users size={24} className="text-accent" />
            </span>
            <h2 className="font-display text-xl font-semibold">La partie est prête</h2>
            <p className="mt-1.5 text-sm text-muted">
              Envoie ce lien à ton adversaire. La partie commencera dès qu’il l’ouvrira.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface p-2">
              <code className="min-w-0 flex-1 truncate px-1 text-left font-mono text-[12px]">
                {url}
              </code>
              <Button
                size="sm"
                variant={copied ? 'primary' : 'secondary'}
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={copy}
              >
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" icon={<Share2 size={15} />} onClick={share} fullWidth>
                Partager
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() =>
                  router.push(
                    `/jouer/partie/${slug}?tc=${timeControlId}${rated ? '&classee=1' : ''}`,
                  )
                }
              >
                Entrer dans la partie
              </Button>
            </div>

            <div className="mt-5 flex justify-center gap-2">
              <Chip>
                {SPEED_LABELS[
                  TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.category ?? 'rapid'
                ].icon}{' '}
                {TIME_CONTROLS.find((tc) => tc.id === timeControlId)?.label}
              </Chip>
              <Chip tone={rated ? 'accent' : 'neutral'}>
                {rated ? 'Classée' : 'Amicale'}
              </Chip>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
