/**
 * Supprimer son propre compte.
 *
 *   DELETE /api/compte   { motDePasse, pseudo }
 *
 * Le Play Store exige que tout compte créé dans une appli puisse être supprimé
 * depuis l'appli et depuis le web ; c'est de toute façon un droit. Ce que la
 * suppression efface, et ce qu'elle garde anonymisé : `@coupparfait/db/suppression`.
 *
 * Trois garde-fous, parce que le geste est sans retour :
 *  - **le mot de passe**, même avec une session ouverte : un téléphone prêté
 *    ne doit pas suffire ;
 *  - **le pseudo retapé**, contre le doigt qui glisse ;
 *  - **pas d'administrateur.** Le droit d'administrer tient au pseudo
 *    (`ADMIN_USERNAMES`) : un compte administrateur supprimé libérerait son
 *    pseudo, et le premier venu qui s'inscrirait sous ce nom hériterait du
 *    droit. Un administrateur quitte d'abord la liste, ou passe par la base.
 */

import { NextResponse } from 'next/server'
import { etatGoogle } from '@coupparfait/db/google'
import { supprimerCompte, verifierMotDePasse } from '@coupparfait/db/suppression'
import { estAdministrateur } from '@/lib/server/admin.ts'
import { ipClient } from '@/lib/server/ip.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { endSession, getCurrentUser } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cinq essais de mot de passe par quart d'heure : de quoi se tromper, pas de quoi deviner. */
const tentatives = creerLimiteur(15 * 60_000, 5)

export async function DELETE(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  let body: { motDePasse?: unknown; pseudo?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  if (estAdministrateur(me)) {
    return NextResponse.json({ error: t('api.deleteAccountAdmin') }, { status: 403 })
  }

  const cle = `suppression:${ipClient(request)}:${me.userId}`
  if (tentatives.depasse(cle)) {
    return NextResponse.json(
      { error: t('api.tooManyAttempts') },
      { status: 429, headers: { 'Retry-After': String(tentatives.attente(cle)) } },
    )
  }

  if (
    typeof body.pseudo !== 'string' ||
    body.pseudo.trim().toLowerCase() !== me.username.toLowerCase()
  ) {
    return NextResponse.json({ error: t('api.deleteAccountWrongName') }, { status: 400 })
  }
  // Un compte créé par Google n'a pas de mot de passe : la session et le
  // pseudo retapé tiennent alors lieu de confirmation.
  const { sansMotDePasse } = await etatGoogle(me.userId)
  if (
    !sansMotDePasse &&
    (typeof body.motDePasse !== 'string' || !(await verifierMotDePasse(me.userId, body.motDePasse)))
  ) {
    return NextResponse.json({ error: t('api.deleteAccountWrongPassword') }, { status: 403 })
  }
  tentatives.oublie(cle)

  try {
    const pseudo = await supprimerCompte(me.userId)
    // Le nouveau pseudo seulement : l'ancien est justement ce qu'on efface, il
    // n'a rien à faire dans les journaux du serveur.
    console.warn(`[compte] un compte a été supprimé par son titulaire, devenu ${pseudo}`)
  } catch (erreur) {
    console.error('[compte] suppression impossible :', erreur)
    return NextResponse.json({ error: t('api.deleteFailed') }, { status: 500 })
  }

  // Les sessions sont déjà effacées en base ; reste le témoin de ce navigateur.
  await endSession()
  return NextResponse.json({ ok: true })
}
