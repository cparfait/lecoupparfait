'use client'

/**
 * « Trouver un adversaire » : la partie contre quelqu'un qu'on ne connaît pas.
 *
 * Les autres chemins de « Contre quelqu'un » supposent qu'on a déjà quelqu'un
 * en tête — à qui envoyer le lien, qui défier dans le carnet. Celui-ci ne
 * demande qu'une cadence : le serveur met en relation deux personnes qui
 * cherchent la même, puis chacune arrive sur la partie comme par un lien.
 *
 * Trois temps sur la même carte : le choix de la cadence, l'attente (avec sa
 * durée et « Annuler », parce qu'une attente dont on ne voit pas la fin se
 * quitte en fermant l'onglet), puis la redirection.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import clsx from 'clsx'
import { SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import { Button, Card, SectionTitle } from '@/components/ui/index.tsx'
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useAppariement } from '@/lib/game/useAppariement.ts'

/**
 * Les cadences proposées, dans l'ordre de la grille.
 *
 * Deux par catégorie, du bullet au classique : c'est là qu'on cherche un
 * inconnu. Moins de cases, c'est aussi plus de monde par file — huit files
 * pleines valent mieux que quinze à moitié vides.
 */
const CADENCES = ['60+0', '120+1', '180+2', '300+3', '600+0', '600+5', '900+10', '1800+20']

/** « 3 + 2 », « 10 min » : composé ici, le cœur écrit ses libellés en français. */
function libelleCadence(id: string, t: ReturnType<typeof useT>): string {
  const cadence = TIME_CONTROLS.find((entree) => entree.id === id)
  if (!cadence) return id
  const minutes = Math.round(cadence.initial / 60)
  return cadence.increment > 0
    ? t('computer.tcIncrement', { m: minutes, s: cadence.increment })
    : t('computer.tcMinutes', { m: minutes })
}

/** « 1:05 » : minutes et secondes, sans zéro en tête sur les minutes. */
function duree(ms: number): string {
  const secondes = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`
}

export function RechercheAdversaire({
  cadenceInitiale,
  onRetour,
}: {
  /** La cadence choisie plus haut sur la page, si elle est proposée ici. */
  cadenceInitiale: string
  onRetour: () => void
}) {
  const t = useT()
  const router = useRouter()
  const contenu = usePreferences((state) => localeDuContenu(state.locale))
  const [cadence, setCadence] = useState(
    CADENCES.includes(cadenceInitiale) ? cadenceInitiale : '300+3',
  )
  const { etat, erreur, chercher, annuler } = useAppariement()

  /*
    L'horloge de l'attente. Tenue dans un état mis à jour par une minuterie,
    et non lue pendant le rendu : `Date.now()` au rendu diffère entre le
    serveur et le navigateur.
  */
  const [maintenant, setMaintenant] = useState(0)
  useEffect(() => {
    if (etat.phase !== 'attente') return
    setMaintenant(Date.now())
    const minuterie = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(minuterie)
  }, [etat.phase])

  // Trouvé : on entre dans la partie, où le siège est réservé.
  useEffect(() => {
    if (etat.phase !== 'trouve') return
    const { slug, timeControl, rated } = etat.partie
    router.push(`/jouer/partie/${slug}?tc=${timeControl}${rated ? '&classee=1' : ''}`)
  }, [etat, router])

  const categorie = TIME_CONTROLS.find((entree) => entree.id === cadence)?.category ?? 'blitz'

  if (etat.phase !== 'repos') {
    const trouve = etat.phase === 'trouve'
    return (
      <Card className="mt-5 p-5 text-center sm:p-6">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-accent"
          aria-hidden
        >
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none" />
        </span>
        <h2 className="font-display text-xl font-semibold" aria-live="polite">
          {trouve
            ? t('appariement.found', { pseudo: etat.partie.opponent.name })
            : t('appariement.searching')}
        </h2>
        {!trouve && (
          <>
            <p className="mt-1.5 text-sm text-muted">
              {t('appariement.searchingHint', { cadence: libelleCadence(etat.cadence, t) })}
            </p>
            <p className="mt-3 text-sm font-semibold tabular-nums">
              {t('appariement.elapsed', {
                duree: duree(maintenant > 0 ? maintenant - etat.depuis : 0),
              })}
            </p>
            <div className="mt-5">
              <Button variant="secondary" fullWidth onClick={annuler}>
                {t('appariement.cancel')}
              </Button>
            </div>
          </>
        )}
      </Card>
    )
  }

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <SectionTitle hint={t('appariement.intro')}>{t('appariement.title')}</SectionTitle>
      <div
        role="radiogroup"
        aria-label={t('appariement.timeControl')}
        className="grid grid-cols-4 gap-1.5"
      >
        {CADENCES.map((id) => {
          const choisie = cadence === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={choisie}
              onClick={() => setCadence(id)}
              className={clsx(
                'min-h-11 whitespace-nowrap rounded-[var(--radius-sm)] border px-1 text-[13px] font-semibold tabular-nums transition-colors',
                choisie
                  ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                  : 'border-line bg-surface text-muted hover:bg-surface-hover hover:text-ink',
              )}
            >
              {libelleCadence(id, t)}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-faint">
        {t('appariement.categoryNote', { categorie: SPEED_LABELS[categorie][contenu] })}
      </p>

      {erreur && (
        <p role="alert" className="mt-3 text-sm text-muted">
          {erreur}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onRetour}>
          {t('appariement.back')}
        </Button>
        <Button
          variant="primary"
          icon={<Search size={15} />}
          className="flex-1"
          onClick={() => chercher(cadence)}
        >
          {t('appariement.search')}
        </Button>
      </div>
    </Card>
  )
}
