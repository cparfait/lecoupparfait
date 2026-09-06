'use client'

/**
 * Les tracés du tableau de bord.
 *
 * **Pourquoi rien d'importé.** Une bibliothèque de graphiques pèse plus lourd
 * que tout le reste de cette page, pour dessiner quatre courbes et deux séries
 * de barres. Ce qu'on fait ici tient en SVG : une polyligne, des rectangles, et
 * l'échelle calculée à la main.
 *
 * **Les couleurs viennent des variables du thème**, jamais d'une palette écrite
 * ici : l'application a quatre habillages, et un graphique qui choisit ses
 * teintes en dur est illisible dans trois d'entre eux.
 *
 * **Ce qu'aucun de ces tracés ne fait : mentir sur l'échelle.** Les barres
 * partent de zéro, les courbes affichent leur maximum en clair, et un jour sans
 * événement vaut zéro et non un trou — le calage est fait côté serveur, dans
 * `api/admin/statistiques`.
 */

import { useState } from 'react'

/** Les teintes utilisées pour distinguer des séries, dans l'ordre. */
export const TEINTES = [
  'var(--accent)',
  'var(--q-best)',
  'var(--q-inaccuracy)',
  'var(--q-great)',
  'var(--q-mistake)',
  'var(--q-brilliant)',
  'var(--q-book)',
  'var(--q-forced)',
] as const

export function teinte(index: number): string {
  return TEINTES[index % TEINTES.length]!
}

/** `12 345` plutôt que `12345` : un nombre long ne se lit pas d'un coup d'œil. */
export function nombre(valeur: number | null | undefined): string {
  return valeur == null ? '—' : valeur.toLocaleString('fr-FR')
}

/** Un pourcentage, ou `—` quand le dénominateur est nul — jamais `NaN %`. */
export function part(valeur: number, total: number): string {
  if (!total) return '—'
  return `${Math.round((valeur / total) * 100)} %`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Courbe
// ─────────────────────────────────────────────────────────────────────────────

export interface Serie {
  nom: string
  valeurs: number[]
  couleur: string
}

/**
 * Plusieurs séries sur une même échelle, avec la valeur du jour survolé.
 *
 * L'échelle est **commune** aux séries : c'est ce qui permet de comparer les
 * inscriptions aux parties d'un coup d'œil. La conséquence est assumée — une
 * série cent fois plus petite qu'une autre s'aplatit contre l'axe, et c'est une
 * information juste, pas un défaut d'affichage.
 */
export function Courbe({
  series,
  jours,
  hauteur = 132,
}: {
  series: Serie[]
  jours: string[]
  hauteur?: number
}) {
  const [survol, setSurvol] = useState<number | null>(null)

  const points = jours.length
  const maximum = Math.max(1, ...series.flatMap((serie) => serie.valeurs))
  // Une marge en haut : une courbe qui touche le bord donne l'impression d'être
  // coupée, et l'on ne sait plus si le sommet est le maximum ou le cadre.
  const echelle = maximum * 1.1

  const abscisse = (index: number) => (index / Math.max(1, points - 1)) * 100
  const ordonnee = (valeur: number) => 100 - (valeur / echelle) * 100

  const chemin = (valeurs: number[]) =>
    valeurs
      .map(
        (valeur, index) =>
          `${index === 0 ? 'M' : 'L'} ${abscisse(index).toFixed(2)},${ordonnee(valeur).toFixed(2)}`,
      )
      .join(' ')

  const jourSurvole = survol == null ? null : jours[survol]

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ height: hauteur }}
          className="w-full touch-none"
          role="img"
          aria-label={`Évolution sur ${points} jours de : ${series.map((serie) => serie.nom).join(', ')}`}
          onPointerLeave={() => setSurvol(null)}
          onPointerMove={(evenement) => {
            const cadre = evenement.currentTarget.getBoundingClientRect()
            const ratio = (evenement.clientX - cadre.left) / cadre.width
            setSurvol(Math.min(points - 1, Math.max(0, Math.round(ratio * (points - 1)))))
          }}
        >
          {/* Trois repères horizontaux, assez pâles pour ne pas concurrencer
              les courbes, assez visibles pour donner une échelle. */}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2="100"
              y1={100 * fraction}
              y2={100 * fraction}
              stroke="var(--border)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {series.map((serie) => (
            <path
              key={serie.nom}
              d={chemin(serie.valeurs)}
              fill="none"
              stroke={serie.couleur}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {survol != null && (
            <line
              x1={abscisse(survol)}
              x2={abscisse(survol)}
              y1="0"
              y2="100"
              stroke="var(--text-faint)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Le maximum est écrit plutôt que gradué : une seule valeur suffit à
            calibrer l'œil, et une échelle complète mangerait la place du tracé. */}
        <span className="pointer-events-none absolute right-1 top-0 rounded bg-[var(--bg-elev)]/80 px-1 text-[12px] tabular-nums text-faint">
          {nombre(maximum)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {series.map((serie, index) => (
          <span key={serie.nom} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: serie.couleur }}
              aria-hidden
            />
            <span className="text-muted">{serie.nom}</span>
            <span className="tabular-nums font-medium">
              {survol == null
                ? nombre(serie.valeurs.reduce((somme, valeur) => somme + valeur, 0))
                : nombre(serie.valeurs[survol] ?? 0)}
            </span>
            {index === series.length - 1 && (
              <span className="text-faint">
                {survol == null ? 'sur la période' : formaterJour(jourSurvole)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function formaterJour(jour: string | null | undefined): string {
  if (!jour) return ''
  // Le jour arrive en `AAAA-MM-JJ` sans heure : `new Date` le lirait en UTC et
  // l'afficherait décalé d'un jour à l'ouest de Greenwich. On le découpe.
  const [annee, mois, numero] = jour.split('-').map(Number)
  if (!annee || !mois || !numero) return jour
  return new Date(annee, mois - 1, numero).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Barres
// ─────────────────────────────────────────────────────────────────────────────

export interface Part {
  cle: string
  n: number
  note?: string
}

/**
 * Une répartition, en barres horizontales.
 *
 * Horizontales et non verticales : les libellés sont des mots — « correspondance
 * », « Défense sicilienne » — et un mot écrit à la verticale ou de biais ne se
 * lit pas. La longueur reste comparée à la plus grande valeur, pas au total :
 * c'est le rapport entre les catégories qu'on regarde.
 */
export function Barres({ parts, total }: { parts: Part[]; total?: number }) {
  const maximum = Math.max(1, ...parts.map((element) => element.n))
  const somme = total ?? parts.reduce((accumulateur, element) => accumulateur + element.n, 0)

  if (parts.length === 0) {
    return <p className="py-3 text-[12px] text-faint">Rien à montrer sur cette période.</p>
  }

  return (
    <ul className="space-y-1.5">
      {parts.map((element, index) => (
        // La clé joint le libellé à sa note : deux lignes peuvent porter le
        // même mot — « Blitz classée » et « Blitz amicale » — et React
        // confondrait alors deux barres distinctes.
        <li key={`${element.cle}·${element.note ?? ''}`}>
          <div className="flex items-baseline gap-2 text-[12px]">
            <span className="min-w-0 flex-1 truncate">{element.cle}</span>
            {element.note && (
              <span className="shrink-0 text-[12px] text-faint">{element.note}</span>
            )}
            <span className="shrink-0 tabular-nums font-medium">{nombre(element.n)}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-faint">
              {part(element.n, somme)}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(element.n / maximum) * 100}%`,
                background: teinte(index),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Histogramme
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Une série courte et cyclique, en colonnes — les heures de la journée.
 *
 * En colonnes parce que l'axe est un temps qui se lit de gauche à droite, et
 * que le libellé est un nombre à deux chiffres : le seul cas où la verticale
 * reste lisible.
 */
export function Histogramme({
  valeurs,
  etiquette,
  couleur = 'var(--accent)',
}: {
  valeurs: number[]
  etiquette: (index: number) => string
  couleur?: string
}) {
  const maximum = Math.max(1, ...valeurs)

  return (
    <div>
      <div className="flex h-24 items-end gap-[2px]">
        {valeurs.map((valeur, index) => (
          <div
            key={index}
            className="min-w-0 flex-1 rounded-t-[2px]"
            style={{
              // Un pixel de haut même à zéro : une colonne absente se confond
              // avec un trou dans les données, une colonne plate dit « zéro ».
              height: `${Math.max(1, (valeur / maximum) * 100)}%`,
              background:
                valeur === 0
                  ? 'var(--surface-strong)'
                  : `color-mix(in oklab, ${couleur} 85%, transparent)`,
            }}
            title={`${etiquette(index)} — ${nombre(valeur)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[12px] tabular-nums text-faint">
        <span>{etiquette(0)}</span>
        <span>{etiquette(Math.floor(valeurs.length / 2))}</span>
        <span>{etiquette(valeurs.length - 1)}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mesure
// ─────────────────────────────────────────────────────────────────────────────

/** Un chiffre, son intitulé, et la phrase qui dit comment le lire. */
export function Mesure({
  titre,
  valeur,
  note,
  ton,
}: {
  titre: string
  valeur: number | string | null
  note?: string
  ton?: 'bon' | 'attention'
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-[var(--surface)] p-3">
      <p className="text-[12px] text-faint">{titre}</p>
      <p
        className="font-display text-2xl font-bold tabular-nums"
        style={{
          color:
            ton === 'bon'
              ? 'var(--q-best)'
              : ton === 'attention'
                ? 'var(--q-inaccuracy)'
                : undefined,
        }}
      >
        {typeof valeur === 'number' ? nombre(valeur) : (valeur ?? '—')}
      </p>
      {note && <p className="text-[12px] leading-snug text-faint">{note}</p>}
    </div>
  )
}
