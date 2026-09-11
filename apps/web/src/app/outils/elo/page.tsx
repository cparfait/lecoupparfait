'use client'

/**
 * Le calculateur Elo.
 *
 * Ce qu'on fait à la sortie d'un tournoi, la grille à la main : « j'ai fait
 * 3 sur 5 contre une moyenne de 1620, ça me donne combien ? ». Le calcul est
 * dans `lib/outils/elo.ts` ; cet écran ne fait que poser les questions dans
 * l'ordre où l'on se les pose — ma cote, mon K, mes parties — et lire le
 * bilan.
 *
 * ── Deux partis pris ───────────────────────────────────────────────────────
 *
 *  1. **Le K se choisit, il ne se devine pas.** La règle FIDE tient en trois
 *     cas et on la montre ; mais celui qui sait qu'il est à 20 n'a pas à
 *     répondre à trois questions pour l'obtenir. Les trois valeurs sont donc
 *     trois boutons, et l'aide dit à qui va laquelle.
 *  2. **On lit le détail, pas seulement le total.** Une variation de −3 sur
 *     un tournoi cache toujours une partie qui a coûté 12 : c'est celle-là
 *     qu'on veut voir.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Input } from '@/components/ui/index.tsx'
import { bilan, scoreAttendu, variation, type Resultat } from '@/lib/outils/elo.ts'

interface Ligne {
  id: number
  adversaire: string
  resultat: Resultat
}

const RESULTATS: Array<{ valeur: Resultat; libelle: string; titre: string }> = [
  { valeur: 1, libelle: '1', titre: 'Victoire' },
  { valeur: 0.5, libelle: '½', titre: 'Nulle' },
  { valeur: 0, libelle: '0', titre: 'Défaite' },
]

const COEFFICIENTS: Array<{ k: 40 | 20 | 10; pour: string }> = [
  { k: 40, pour: 'moins de 30 parties classées, ou moins de 18 ans sous 2300' },
  { k: 20, pour: 'le cas général, sous 2400' },
  { k: 10, pour: 'une fois 2400 atteint, même redescendu' },
]

/** Signe explicite et virgule : « +12,4 » et « −7,1 », « 0 » quand il ne se passe rien. */
function signe(n: number, decimales = 0): string {
  const arrondi = n.toFixed(decimales)
  if (Number(arrondi) === 0) return '0'
  return (n > 0 ? `+${arrondi}` : `−${arrondi.slice(1)}`).replace('.', ',')
}

/** « 2,5 » plutôt que « 2.5 », et « 3 » plutôt que « 3.0 ». */
function points(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

let prochainId = 1

export default function EloPage() {
  const [cote, setCote] = useState('1500')
  const [k, setK] = useState<40 | 20 | 10>(20)
  const [lignes, setLignes] = useState<Ligne[]>([{ id: 0, adversaire: '1500', resultat: 1 }])

  const modifier = (id: number, changement: Partial<Ligne>) =>
    setLignes((liste) =>
      liste.map((ligne) => (ligne.id === id ? { ...ligne, ...changement } : ligne)),
    )

  const coteNombre = Number(cote)
  const coteValide = Number.isFinite(coteNombre) && coteNombre >= 1000 && coteNombre <= 3500

  /* Seules les lignes dont la cote est lisible entrent dans le calcul : une
     ligne vide en cours de saisie ne doit pas faire disparaître le bilan. */
  const parties = useMemo(
    () =>
      lignes
        .map((ligne) => ({ adversaire: Number(ligne.adversaire), resultat: ligne.resultat }))
        .filter((partie) => Number.isFinite(partie.adversaire) && partie.adversaire >= 1000),
    [lignes],
  )
  const resultat = useMemo(
    () => (coteValide ? bilan(coteNombre, k, parties) : null),
    [coteValide, coteNombre, k, parties],
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <Link
        href="/outils"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        Outils
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Calculateur Elo</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Ta cote, ton coefficient, tes parties : ce que le tournoi te rapporte ou te coûte, partie
        par partie, et ta performance. Le barème est celui de la FIDE.
      </p>

      <Card className="mt-5 p-4">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Input
            label="Ta cote"
            name="cote"
            type="number"
            inputMode="numeric"
            min={1000}
            max={3500}
            value={cote}
            onChange={(e) => setCote(e.target.value)}
            error={cote !== '' && !coteValide ? 'Entre 1000 et 3500.' : undefined}
          />
          <div>
            <p className="mb-1.5 block text-sm font-medium">Coefficient K</p>
            <div className="flex flex-wrap gap-2">
              {COEFFICIENTS.map((choix) => (
                <button
                  key={choix.k}
                  type="button"
                  onClick={() => setK(choix.k)}
                  aria-pressed={k === choix.k}
                  className={clsx(
                    'rounded-full border px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                    k === choix.k
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {choix.k}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-faint">
              {COEFFICIENTS.map((choix) => (
                <span key={choix.k} className="block">
                  <strong className="font-semibold text-muted">{choix.k}</strong> : {choix.pour}
                </span>
              ))}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-semibold text-faint">Tes parties</p>
          <p className="text-xs text-faint">cote de l’adversaire, puis le résultat</p>
        </div>
        <ul className="mt-2 space-y-2">
          {lignes.map((ligne, index) => (
            <li key={ligne.id} className="flex items-center gap-2">
              {/* Le numéro et les largeurs se serrent sous `sm` : en 375 px, la
                  ligne débordait et la corbeille sortait de l'écran. */}
              <span className="hidden w-5 shrink-0 text-right text-xs tabular-nums text-faint sm:block">
                {index + 1}
              </span>
              <input
                aria-label={`Cote de l’adversaire ${index + 1}`}
                type="number"
                inputMode="numeric"
                min={1000}
                max={3500}
                placeholder="1500"
                value={ligne.adversaire}
                onChange={(e) => modifier(ligne.id, { adversaire: e.target.value })}
                className="h-10 w-[4.5rem] rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 text-sm tabular-nums placeholder:text-faint focus:border-accent focus:outline-none sm:w-28 sm:px-3"
              />
              <div
                role="radiogroup"
                aria-label={`Résultat de la partie ${index + 1}`}
                className="inline-flex gap-0.5 rounded-[var(--radius-sm)] border border-line bg-surface p-0.5"
              >
                {RESULTATS.map((choix) => (
                  <button
                    key={choix.valeur}
                    type="button"
                    role="radio"
                    aria-checked={ligne.resultat === choix.valeur}
                    title={choix.titre}
                    onClick={() => modifier(ligne.id, { resultat: choix.valeur })}
                    className={clsx(
                      'h-8 w-8 rounded-[calc(var(--radius-sm)-2px)] text-sm font-semibold transition-colors sm:w-9',
                      ligne.resultat === choix.valeur
                        ? 'bg-accent text-[var(--accent-contrast)]'
                        : 'text-muted hover:bg-surface-hover hover:text-ink',
                    )}
                  >
                    {choix.libelle}
                  </button>
                ))}
              </div>
              {/* La variation de la ligne, sous les yeux : c'est elle qu'on
                  cherche quand le total surprend. */}
              <span className="ml-auto min-w-[3rem] text-right text-sm font-semibold tabular-nums">
                {(() => {
                  const adversaire = Number(ligne.adversaire)
                  if (!coteValide || !Number.isFinite(adversaire) || adversaire < 1000)
                    return <span className="text-faint">—</span>
                  const v = variation(k, ligne.resultat, scoreAttendu(coteNombre, adversaire))
                  return (
                    <span
                      className={
                        v > 0
                          ? 'text-[var(--q-best)]'
                          : v < 0
                            ? 'text-[var(--q-blunder)]'
                            : 'text-muted'
                      }
                    >
                      {signe(v, 1)}
                    </span>
                  )
                })()}
              </span>
              <button
                type="button"
                onClick={() => setLignes((liste) => liste.filter((l) => l.id !== ligne.id))}
                disabled={lignes.length === 1}
                aria-label={`Retirer la partie ${index + 1}`}
                className="grid h-8 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30 sm:w-8"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          className="mt-3"
          onClick={() =>
            setLignes((liste) => [
              ...liste,
              {
                id: prochainId++,
                adversaire: liste[liste.length - 1]?.adversaire ?? '1500',
                resultat: 1,
              },
            ])
          }
        >
          Ajouter une partie
        </Button>
      </Card>

      {resultat && parties.length > 0 && (
        <Card className="mt-3 p-4">
          <p className="text-[12px] font-semibold text-faint">Bilan</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Variation</p>
              <p
                className={clsx(
                  'font-display text-3xl font-bold tabular-nums',
                  resultat.variation > 0.5
                    ? 'text-[var(--q-best)]'
                    : resultat.variation < -0.5
                      ? 'text-[var(--q-blunder)]'
                      : '',
                )}
              >
                {signe(resultat.variation, 1)}
              </p>
              <p className="text-xs text-faint">
                nouvelle cote{' '}
                <strong className="font-semibold text-muted tabular-nums">
                  {resultat.nouvelleCote}
                </strong>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Score</p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {points(resultat.points)}
                <span className="text-lg text-faint"> / {parties.length}</span>
              </p>
              <p className="text-xs text-faint">
                attendu{' '}
                <strong className="font-semibold text-muted tabular-nums">
                  {resultat.attendu.toFixed(2).replace('.', ',')}
                </strong>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Performance</p>
              <p className="font-display text-3xl font-bold tabular-nums">{resultat.performance}</p>
              <p className="text-xs text-faint">
                adversaires à{' '}
                <strong className="font-semibold text-muted tabular-nums">
                  {Math.round(resultat.moyenneAdversaires ?? 0)}
                </strong>{' '}
                en moyenne
              </p>
            </div>
          </div>
          <p className="mt-3 border-t border-line/60 pt-2.5 text-xs leading-relaxed text-faint">
            Score attendu par la formule logistique, écart plafonné à 400 points comme à la FIDE ;
            performance lue dans sa table de conversion, bornée à ±800. La FFE applique le même
            barème à sa cote nationale.
          </p>
        </Card>
      )}
    </div>
  )
}
