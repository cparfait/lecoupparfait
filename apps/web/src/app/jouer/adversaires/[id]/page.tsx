/**
 * La fiche d'un adversaire.
 *
 * Les sept personnalités portaient un nom, une phrase et un portrait, et rien
 * derrière : on ne pouvait pas cliquer dessus, donc il n'y avait rien à en
 * savoir. Ce sont pourtant les seuls adversaires que la plupart des joueurs
 * affronteront, pendant des heures — et un adversaire dont on ne sait rien
 * reste un curseur de difficulté déguisé en personnage.
 *
 * Ce fichier-ci ne fait plus que trois choses : énumérer les sept adresses
 * pour le rendu statique, poser le titre de l'onglet, et refuser un
 * identifiant inconnu. Le rendu vit dans `FicheAdversaire`, composant client :
 * les étiquettes de la page se lisent dans le dictionnaire, ce qu'un composant
 * serveur ne sait pas faire — la langue choisie est une préférence de
 * navigateur. Le titre de l'onglet, lui, reste en français : il s'adresse au
 * moteur de recherche, dans la langue de référence du projet.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BOT_PERSONALITIES, type BotPersonalityId } from '@coupparfait/core'
import { FicheAdversaire } from '@/components/brand/FicheAdversaire.tsx'

const IDS = Object.keys(BOT_PERSONALITIES) as BotPersonalityId[]

export function generateStaticParams() {
  return IDS.map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const personnalite = BOT_PERSONALITIES[id as BotPersonalityId]
  if (!personnalite) return { title: 'Adversaire introuvable' }
  return {
    title: `${personnalite.name.fr} — adversaire artificiel`,
    description: personnalite.blurb.fr,
  }
}

export default async function PageAdversaire({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!BOT_PERSONALITIES[id as BotPersonalityId]) notFound()
  return <FicheAdversaire id={id as BotPersonalityId} />
}
