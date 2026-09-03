'use client'

/**
 * Le moment où l'on a gagné quelque chose.
 *
 * Trois choses se produisent en même temps quand un chapitre tombe : de
 * l'expérience, des étoiles, parfois un haut fait. Les annoncer l'une après
 * l'autre dans un coin de l'écran reviendrait à ne rien annoncer du tout — on
 * les rassemble donc en un seul instant, plein cadre, qu'on ferme d'un clic ou
 * d'une touche.
 *
 * **Ce composant ne décide de rien.** Il affiche ce que le serveur a accordé,
 * transmis tel quel par la route `/api/carriere`. C'est ce qui garantit qu'on
 * ne célèbre jamais une étoile qui n'a pas été enregistrée — le défaut le plus
 * décevant possible pour ce genre d'écran.
 */

import { useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import { HAUTS_FAITS, rangPour } from '@coupparfait/core'
import { Button } from '@/components/ui/index.tsx'

export interface Gains {
  xp: number
  etoiles: number
  badges: string[]
  chapitreTermine: boolean
}

/** Assez de pièces pour que ça pleuve, assez peu pour que ça reste fluide. */
const CONFETTIS = 46

export function Celebration({
  gains,
  xpTotal,
  titre,
  onFermer,
}: {
  gains: Gains
  /** Expérience après le gain, pour annoncer un éventuel changement de rang. */
  xpTotal: number
  /** Ce qui vient d'être accompli, en une ligne. */
  titre: string
  onFermer: () => void
}) {
  const fermerRef = useRef(onFermer)
  fermerRef.current = onFermer

  // Fermer à la touche Échap comme à l'Entrée : on vient de cliquer pour
  // valider quelque chose, la main est encore sur le clavier.
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape' || evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault()
        fermerRef.current()
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  /**
   * Les confettis, tirés une seule fois.
   *
   * Dans un `useMemo` et non recalculés à chaque rendu : sans cela, le moindre
   * nouveau rendu redistribuerait les positions et la pluie sauterait d'un
   * coup. Les valeurs viennent de l'index et d'un pseudo-hasard déterministe
   * plutôt que de `Math.random`, pour que le rendu serveur et le rendu client
   * ne se contredisent pas.
   */
  const confettis = useMemo(
    () =>
      Array.from({ length: CONFETTIS }, (_, i) => {
        // Suite de Weyl : bien répartie, sans état, et identique des deux côtés.
        const a = (i * 0.618_033_988_75) % 1
        const b = (i * 0.381_966_011_25) % 1
        return {
          gauche: `${Math.round(a * 100)}%`,
          derive: `${Math.round((b - 0.5) * 160)}px`,
          tour: `${Math.round(b * 1080 - 360)}deg`,
          duree: `${(1.8 + b * 1.6).toFixed(2)}s`,
          retard: `${(a * 0.5).toFixed(2)}s`,
          taille: 6 + Math.round(b * 8),
          teinte: TEINTES[i % TEINTES.length]!,
          rond: i % 3 === 0,
        }
      }),
    [],
  )

  const rang = rangPour(xpTotal)
  const rangPrecedent = rangPour(Math.max(0, xpTotal - gains.xp))
  const monteEnRang = rang.rang.nom !== rangPrecedent.rang.nom

  const badges = gains.badges
    .map((id) => HAUTS_FAITS.find((h) => h.id === id))
    .filter((h): h is (typeof HAUTS_FAITS)[number] => Boolean(h))

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      onClick={onFermer}
    >
      {/* La pluie est au-dessus du voile mais sous la carte : on la voit
          derrière le texte sans qu'elle le rende illisible. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {confettis.map((c, i) => (
          <span
            key={i}
            className="animate-carriere-confetti absolute top-0 block"
            style={{
              left: c.gauche,
              width: c.taille,
              height: c.taille,
              background: c.teinte,
              borderRadius: c.rond ? '50%' : '2px',
              ['--derive' as string]: c.derive,
              ['--tour' as string]: c.tour,
              ['--duree' as string]: c.duree,
              ['--retard' as string]: c.retard,
            }}
          />
        ))}
      </div>

      <div
        className="animate-carriere-tampon glass relative w-full max-w-sm rounded-[var(--radius-lg)] border border-line p-6 text-center shadow-[var(--shadow-lg)]"
        onClick={(evenement) => evenement.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {gains.chapitreTermine ? 'Chapitre terminé' : 'Bien joué'}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{titre}</h2>

        {gains.etoiles > 0 && (
          <div
            className="mt-4 flex justify-center gap-2"
            aria-label={`${gains.etoiles} étoiles sur 3`}
          >
            {[1, 2, 3].map((rang) => (
              <span
                key={rang}
                className={clsx(
                  'text-4xl',
                  rang <= gains.etoiles
                    ? 'animate-carriere-etoile text-[var(--q-inaccuracy)]'
                    : 'opacity-20',
                )}
                style={{ animationDelay: `${0.15 + rang * 0.16}s` }}
              >
                ★
              </span>
            ))}
          </div>
        )}

        {gains.xp > 0 && (
          <p className="mt-4 font-display text-3xl font-bold tabular-nums text-accent">
            +{gains.xp}
            <span className="ml-1 text-sm font-semibold text-muted">points</span>
          </p>
        )}

        {monteEnRang && (
          <p className="mt-3 rounded-[var(--radius-sm)] border border-accent/40 bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-3 py-2 text-sm font-semibold">
            <span className="mr-1.5 text-lg">{rang.rang.emoji}</span>
            Nouveau rang : {rang.rang.nom}
          </p>
        )}

        {badges.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-left"
              >
                <span className="text-xl" aria-hidden>
                  {badge.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{badge.nom}</span>
                  <span className="block truncate text-[11px] text-faint">{badge.condition}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <Button variant="primary" className="mt-5 w-full" onClick={onFermer} autoFocus>
          Continuer
        </Button>
      </div>
    </div>
  )
}

/** Teintes des confettis : celles de la marque, plus deux chaudes. */
const TEINTES = ['#7c5cff', '#22b8cf', '#51cf66', '#fcc419', '#ff922b', '#e64980']
