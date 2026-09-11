'use client'

/**
 * Le tirage au sort.
 *
 * Trois gestes qu'on fait au club avec une pièce cachée dans une main ou des
 * papiers pliés, et qui finissent toujours par une contestation : qui a les
 * Blancs, qui joue contre qui, dans quel ordre on passe. L'écran tire, et
 * tout le monde voit le même résultat.
 *
 * ── Ce qu'on a voulu ───────────────────────────────────────────────────────
 *
 *  - **Un vrai hasard.** `crypto.getRandomValues`, pas `Math.random` : ce
 *    n'est pas que l'un soit plus juste que l'autre à l'œil, c'est qu'on ne
 *    veut pas avoir à en discuter.
 *  - **La liste est saisie une fois.** Les paires et l'ordre de passage se
 *    tirent sur les mêmes noms ; on ne les retape pas en changeant d'onglet.
 *  - **Un nombre impair ne bloque rien.** Il reste quelqu'un d'exempt, et il
 *    est nommé — c'est le point qu'on oublie et qui fait râler.
 */

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Dices } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Input, SegmentedControl } from '@/components/ui/index.tsx'

type Mode = 'couleurs' | 'paires' | 'ordre'

/** Un entier au hasard dans `[0, n[`, sans biais de modulo sensible à l'échelle. */
function entier(n: number): number {
  const tirage = new Uint32Array(1)
  crypto.getRandomValues(tirage)
  return Math.floor((tirage[0]! / 2 ** 32) * n)
}

/** Fisher-Yates, sur une copie. */
function melanger<T>(liste: T[]): T[] {
  const copie = [...liste]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = entier(i + 1)
    ;[copie[i], copie[j]] = [copie[j]!, copie[i]!]
  }
  return copie
}

/** Les noms, un par ligne, sans les vides ni les doublons d'espaces. */
function lireNoms(texte: string): string[] {
  return texte
    .split('\n')
    .map((ligne) => ligne.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

interface Paire {
  blancs: string
  noirs: string
}

export default function TiragePage() {
  const [mode, setMode] = useState<Mode>('couleurs')

  // Couleurs.
  const [joueur1, setJoueur1] = useState('')
  const [joueur2, setJoueur2] = useState('')
  const [blancs, setBlancs] = useState<1 | 2 | null>(null)

  // Paires et ordre : la même liste.
  const [texte, setTexte] = useState('')
  const [paires, setPaires] = useState<{ tables: Paire[]; exempt: string | null } | null>(null)
  const [ordre, setOrdre] = useState<string[] | null>(null)

  const noms = lireNoms(texte)
  const nom1 = joueur1.trim() || 'Joueur 1'
  const nom2 = joueur2.trim() || 'Joueur 2'

  const tirerCouleurs = () => setBlancs(entier(2) === 0 ? 1 : 2)

  const formerPaires = () => {
    const melange = melanger(noms)
    const exempt = melange.length % 2 === 1 ? melange.pop()! : null
    const tables: Paire[] = []
    for (let i = 0; i < melange.length; i += 2) {
      tables.push({ blancs: melange[i]!, noirs: melange[i + 1]! })
    }
    setPaires({ tables, exempt })
  }

  const tirerOrdre = () => setOrdre(melanger(noms))

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <Link
        href="/outils"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        Outils
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Tirage au sort</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Les couleurs d’une partie, les paires d’une ronde, l’ordre de passage. Un tirage que tout le
        monde voit, et personne ne conteste.
      </p>

      <div className="mt-5">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          label="Quoi tirer"
          options={[
            { value: 'couleurs', label: 'Couleurs' },
            { value: 'paires', label: 'Paires' },
            { value: 'ordre', label: 'Ordre de passage' },
          ]}
        />
      </div>

      {mode === 'couleurs' && (
        <Card className="mt-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Premier joueur"
              name="joueur1"
              placeholder="Joueur 1"
              value={joueur1}
              onChange={(e) => {
                setJoueur1(e.target.value)
                setBlancs(null)
              }}
            />
            <Input
              label="Second joueur"
              name="joueur2"
              placeholder="Joueur 2"
              value={joueur2}
              onChange={(e) => {
                setJoueur2(e.target.value)
                setBlancs(null)
              }}
            />
          </div>
          <Button icon={<Dices size={16} />} className="mt-4" onClick={tirerCouleurs}>
            {blancs ? 'Retirer' : 'Tirer les couleurs'}
          </Button>

          {blancs && (
            <div
              className="mt-4 grid gap-2 sm:grid-cols-2"
              role="status"
              aria-live="polite"
              aria-label="Résultat du tirage"
            >
              {[
                { nom: blancs === 1 ? nom1 : nom2, couleur: 'Blancs', symbole: '♔' },
                { nom: blancs === 1 ? nom2 : nom1, couleur: 'Noirs', symbole: '♚' },
              ].map((cote) => (
                <div
                  key={cote.couleur}
                  className={clsx(
                    'flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3',
                    cote.couleur === 'Blancs'
                      ? 'border-line-strong bg-[#f2eee8] text-[#141418]'
                      : 'border-line bg-[#17171c] text-[#f2eee8]',
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {cote.symbole}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-bold">
                      {cote.nom}
                    </span>
                    <span className="block text-xs opacity-70">a les {cote.couleur}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {mode !== 'couleurs' && (
        <Card className="mt-3 p-4">
          <label htmlFor="noms" className="mb-1.5 block text-sm font-medium">
            Les joueurs, un par ligne
          </label>
          <textarea
            id="noms"
            rows={6}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value)
              setPaires(null)
              setOrdre(null)
            }}
            placeholder={'Alice\nBernard\nChloé\nDavid'}
            className="w-full resize-y rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 py-2.5 text-sm leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
          />
          <p className="mt-1.5 text-xs text-faint">
            {noms.length === 0
              ? 'Aucun nom pour l’instant.'
              : `${noms.length} joueur${noms.length > 1 ? 's' : ''}`}
            {mode === 'paires' && noms.length % 2 === 1 && noms.length > 1
              ? ' — nombre impair, il y aura un exempt.'
              : ''}
          </p>

          {mode === 'paires' && (
            <>
              <Button
                icon={<Dices size={16} />}
                className="mt-3"
                disabled={noms.length < 2}
                onClick={formerPaires}
              >
                {paires ? 'Refaire les paires' : 'Former les paires'}
              </Button>
              {paires && (
                <ol className="mt-4 space-y-1.5" aria-label="Les tables">
                  {paires.tables.map((table, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-sm"
                    >
                      <span className="w-14 shrink-0 text-xs font-semibold text-faint">
                        Table {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span aria-hidden>♔ </span>
                        <span className="font-medium">{table.blancs}</span>
                      </span>
                      <span className="text-faint" aria-hidden>
                        –
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span aria-hidden>♚ </span>
                        <span className="font-medium">{table.noirs}</span>
                      </span>
                    </li>
                  ))}
                  {paires.exempt && (
                    <li className="rounded-[var(--radius-sm)] border border-dashed border-line px-3 py-2 text-sm text-muted">
                      <span className="font-medium text-ink">{paires.exempt}</span> ne joue pas
                      cette ronde.
                    </li>
                  )}
                </ol>
              )}
            </>
          )}

          {mode === 'ordre' && (
            <>
              <Button
                icon={<Dices size={16} />}
                className="mt-3"
                disabled={noms.length < 2}
                onClick={tirerOrdre}
              >
                {ordre ? 'Remélanger' : 'Tirer l’ordre'}
              </Button>
              {ordre && (
                <ol className="mt-4 space-y-1.5" aria-label="Ordre de passage">
                  {ordre.map((nom, index) => (
                    <li
                      key={`${index}-${nom}`}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-sm"
                    >
                      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-faint">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{nom}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}
