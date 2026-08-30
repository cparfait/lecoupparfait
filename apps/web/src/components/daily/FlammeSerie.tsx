'use client'

/**
 * La flamme de la série, réservée aux comptes.
 *
 * Elle apparaît à deux endroits — dans la barre du haut, et dans l'en-tête de
 * la carte du défi du jour. Les deux montrent le même chiffre et obéissent aux
 * mêmes conditions d'apparition ; c'est pour cela qu'elles vivent ici plutôt
 * que d'être écrites deux fois.
 *
 * Elle disparaît complètement tant qu'il n'y a pas de série : afficher
 * « 0 jour » à quelqu'un qui découvre le site, c'est lui reprocher quelque
 * chose avant même qu'il ait commencé.
 *
 * Sans compte, elle **ne s'affiche pas du tout**, et c'est le point à
 * comprendre avant de la remettre.
 *
 * La série d'un visiteur non connecté vit dans le stockage local de son
 * navigateur : elle ne suit pas d'un appareil à l'autre, ne survit pas à un
 * nettoyage, et personne ne peut la lui rendre une fois perdue. Un compteur qui
 * demande un engagement quotidien et qu'on n'est pas en mesure de garder ne
 * récompense rien — il prépare une déception.
 *
 * L'invitation à créer un compte se fait ailleurs, sur le défi du jour, qui est
 * un geste qu'on vient d'accomplir plutôt qu'un chiffre qu'on risque de perdre.
 * Voir `DefiDuJour`.
 */

import Link from 'next/link'
import { Flame } from 'lucide-react'
import clsx from 'clsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

/**
 * Deux habillages pour le même objet.
 *
 * `entete` est une cible cliquable dans la barre du haut : il lui faut la
 * hauteur et le survol des autres boutons qui l'entourent. `carte` est posé
 * dans un titre de section, où une zone de survol de trente-six pixels de haut
 * décalerait la ligne.
 */
type Habillage = 'entete' | 'carte'

const HABILLAGES: Record<Habillage, string> = {
  entete: 'h-9 gap-1 rounded-[var(--radius-sm)] px-2 hover:bg-surface-hover',
  carte: 'gap-1 hover:underline',
}

export function FlammeSerie({
  habillage = 'entete',
  className,
}: {
  habillage?: Habillage
  className?: string
}) {
  const { etat } = useQuotidien()
  const identite = useIdentite()
  const serie = etat?.serie ?? 0

  // Deux raisons de ne rien afficher, et `undefined` compte pour la seconde :
  // tant qu'on ne sait pas s'il y a une session, montrer la flamme puis la
  // retirer une seconde plus tard est exactement le clignotement qu'on évite
  // partout ailleurs.
  if (!identite) return null
  if (serie <= 0) return null

  const jours = `${serie} jour${serie > 1 ? 's' : ''}`
  const record = etat && etat.meilleureSerie > serie ? ` · record : ${etat.meilleureSerie}` : ''
  const classe = clsx(
    'flex shrink-0 items-center text-sm font-semibold text-[var(--q-inaccuracy)] transition-colors',
    HABILLAGES[habillage],
    className,
  )
  const contenu = (
    <>
      <Flame size={15} aria-hidden />
      <span className="tabular-nums">{habillage === 'carte' ? `${serie} j` : serie}</span>
    </>
  )

  return (
    <Link href="/puzzles?defi=1" title={`Série de ${jours}${record}`} className={classe}>
      {contenu}
      <span className="sr-only">jours consécutifs — aller au défi du jour</span>
    </Link>
  )
}
