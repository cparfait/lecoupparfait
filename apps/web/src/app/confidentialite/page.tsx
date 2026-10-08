/**
 * La politique de confidentialité, à une adresse fixe.
 *
 * Le Play Store en exige une, publique, qu'on donne dans la fiche de l'appli.
 * La page est rendue à chaque demande : l'adresse de contact vient de
 * l'environnement de l'instance (`CONTACT_EMAIL`), qui n'existe pas au moment
 * de construire l'image.
 */

import { connection } from 'next/server'
import { PolitiqueConfidentialite } from '@/components/confidentialite/PolitiqueConfidentialite.tsx'

export default async function ConfidentialitePage() {
  await connection()
  const contact = process.env.CONTACT_EMAIL?.trim() || null
  return <PolitiqueConfidentialite contact={contact} />
}
