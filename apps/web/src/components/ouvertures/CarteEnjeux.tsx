'use client'

/**
 * La fiche « enjeux » d'une ouverture.
 *
 * Affichée à deux endroits, d'où ce composant plutôt qu'un bloc recopié : sur
 * la page qui les liste toutes, et dans l'explorateur dès que les coups joués
 * correspondent à l'une d'elles. Le second cas est le plus utile — on lit « ce
 * que cherche la sicilienne » au moment où on vient de la jouer sur
 * l'échiquier.
 *
 * L'ordre des cinq blocs n'est pas indifférent : l'idée d'abord parce qu'elle
 * donne le sens, la structure ensuite parce que c'est elle qui commande les
 * plans, les deux plans côte à côte parce qu'ils s'opposent et qu'on doit les
 * lire ensemble, le piège à la fin parce que c'est ce qu'on retient.
 */

import Link from 'next/link'
import clsx from 'clsx'
import { AlertTriangle, GraduationCap, Grid3x3 } from 'lucide-react'
import { Card, Chip } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { BoutonEcouter } from '@/components/ui/BoutonEcouter.tsx'
import type { FicheEnjeux } from '@/lib/ouvertures/enjeux.ts'

const TEINTE = 'var(--rub-apprendre)'

export function CarteEnjeux({
  fiche,
  /** Le lien « voir sur l'échiquier ». Omis quand on y est déjà. */
  versEchiquier = true,
  /** Les coups, écrits dans la notation choisie par le lecteur. */
  ecrire,
  className,
}: {
  fiche: FicheEnjeux
  versEchiquier?: boolean
  ecrire?: (san: string) => string
  className?: string
}) {
  const suite = fiche.coups
    .map((coup, index) =>
      index % 2 === 0
        ? `${index / 2 + 1}.${ecrire ? ecrire(coup) : coup}`
        : ecrire
          ? ecrire(coup)
          : coup,
    )
    .join(' ')

  return (
    /* L'ancre porte l'identifiant de la fiche : c'est ce que visent les noms
       d'ouverture rendus cliquables au fil des textes — un principe qui cite
       « l'est-indienne » mène ici, sur la bonne carte, et pas en haut d'une
       liste de vingt-cinq. */
    <Card
      id={fiche.id}
      className={clsx(
        // L'en-tête de l'application est collant : une ancre visée sans marge
        // amène la carte pile sous lui, titre compris. On réserve sa hauteur,
        // comme le fait déjà l'explorateur pour son plateau.
        'scroll-mt-[calc(var(--entete)+0.75rem)]',
        className,
      )}
    >
      <EnTeteDeCarte
        titre={fiche.nom}
        icone={<Grid3x3 size={14} aria-hidden />}
        teinte={TEINTE}
        fin={
          <BoutonEcouter
            quoi={fiche.nom}
            annonce={`Écouter les enjeux de ${fiche.nom}`}
            texte={`${fiche.nom}. ${fiche.idee} La structure : ${fiche.structure} Le plan des Blancs : ${fiche.planBlancs} Le plan des Noirs : ${fiche.planNoirs} Le piège : ${fiche.piege}`}
          />
        }
      />

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="accent">{fiche.eco}</Chip>
          <Chip>pour les {fiche.pour}</Chip>
          <span className="font-mono text-[12px] text-muted">{suite}</span>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed">{fiche.idee}</p>

        <div className="mt-4">
          <p className="text-[12px] font-semibold text-faint">La structure</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{fiche.structure}</p>
        </div>

        {/* Les deux plans côte à côte sur grand écran : une ouverture n'a pas un
            plan mais deux qui s'opposent, et les empiler l'un sous l'autre les
            fait lire comme une succession au lieu d'une opposition. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border border-line bg-bg-elev p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-faint">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--eval-white)]" aria-hidden />
              Le plan des Blancs
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{fiche.planBlancs}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-line bg-bg-elev p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-faint">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[var(--eval-black)] ring-1 ring-line"
                aria-hidden
              />
              Le plan des Noirs
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{fiche.planNoirs}</p>
          </div>
        </div>

        {/* Le piège, en ambre : c'est un avertissement, et c'est ce qui décide
            les parties en club bien avant la théorie. */}
        <div
          className="mt-4 rounded-[var(--radius-sm)] border p-3"
          style={{
            borderColor: 'color-mix(in oklab, var(--q-inaccuracy) 35%, transparent)',
            background: 'color-mix(in oklab, var(--q-inaccuracy) 8%, transparent)',
          }}
        >
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--q-inaccuracy-text)]">
            <AlertTriangle size={12} aria-hidden />
            Le piège
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed">{fiche.piege}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {fiche.lecon && (
            <Link
              href={`/apprendre/${fiche.lecon}`}
              className="lien inline-flex items-center gap-1.5"
            >
              <GraduationCap size={13} aria-hidden />
              La leçon guidée
            </Link>
          )}
          {versEchiquier && (
            <Link
              href={`/ouvertures?fiche=${encodeURIComponent(fiche.id)}`}
              className="lien inline-flex items-center gap-1.5"
            >
              <Grid3x3 size={13} aria-hidden />
              Voir sur l’échiquier
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
