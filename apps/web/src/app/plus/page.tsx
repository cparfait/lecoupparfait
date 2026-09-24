'use client'

/**
 * « Plus » : ce que la barre du bas ne porte pas, en grand.
 *
 * La barre mobile a cinq onglets, et l'application cinq rubriques plus un
 * compte et des réglages. Ce qui ne tient pas dans la barre vit ici, sur une
 * page pleine et non dans un panneau : on voit d'un coup d'œil ce qui existe,
 * à taille de doigt, sans avoir à déplier quoi que ce soit.
 *
 * La page lit `SECTIONS` et `PAGES_APPLICATION`, comme l'en-tête et le menu du
 * compte : un seul endroit de vérité, et rien ici qui ne soit ailleurs.
 *
 * Elle s'ouvre aussi sur grand écran — depuis un lien, ou l'historique — et y
 * reste lisible : c'est simplement un sommaire.
 */

import Link from 'next/link'
import { LogIn, LogOut, ShieldCheck, User, UserPlus } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { TitreDePage, TitreDeSection } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { useEstAdmin, useIdentite } from '@/lib/auth/useIdentite.ts'
import { PAGES_APPLICATION, SECTIONS, SECTIONS_DANS_PLUS } from '@/lib/navigation.ts'

export default function PlusPage() {
  const t = useT()
  const me = useIdentite()
  const estAdmin = useEstAdmin()

  const rubriques = SECTIONS_DANS_PLUS.map((id) => SECTIONS.find((s) => s.id === id)).filter(
    (s): s is NonNullable<typeof s> => s != null,
  )

  return (
    <div className="page">
      <TitreDePage intro={t('nav.moreHint')}>{t('nav.more')}</TitreDePage>

      {rubriques.map((section) => (
        <section key={section.id} className="mt-8">
          <TitreDeSection
            icon={section.icon}
            teinte={section.teinte}
            action={
              section.sommaire && (
                <Link href={section.sommaire} className="lien">
                  {t('last.seeThePage')}
                </Link>
              )
            }
          >
            {t(section.labelKey)}
          </TitreDeSection>
          <div className="grille-cartes">
            {section.entrees.map((entree) => (
              <CarteDestination
                key={entree.href}
                href={entree.href}
                icon={entree.icon}
                teinte={section.teinte}
                titre={t(entree.labelKey)}
                phrase={entree.hintKey ? t(entree.hintKey, entree.hintVars) : undefined}
                compacte
              />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-8">
        <TitreDeSection icon={User}>{t('nav.account')}</TitreDeSection>
        <div className="grille-cartes">
          {me ? (
            <>
              <CarteDestination
                href={`/profil/${me.username}`}
                icon={User}
                titre={t('nav.myProfile')}
                phrase={me.username}
                compacte
              />
              <CarteDestination
                href="/deconnexion"
                icon={LogOut}
                titre={t('nav.signOut')}
                compacte
                onClick={async (event) => {
                  event.preventDefault()
                  await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signout' }),
                  })
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Rechargement complet et non `router.push` : la déconnexion doit vider tout l'état client — identité partagée, préférences, caches — qu'une navigation cliente conserverait.
                  window.location.assign('/')
                }}
              />
            </>
          ) : (
            <>
              <CarteDestination
                href="/connexion"
                icon={LogIn}
                titre={t('nav.signIn')}
                phrase={t('bits.aNameAndPassword')}
                compacte
              />
              <CarteDestination
                href="/connexion?inscription=1"
                icon={UserPlus}
                titre={t('nav.signUp')}
                phrase={t('bits.freeNoEmail')}
                compacte
              />
            </>
          )}
          {estAdmin && (
            <CarteDestination href="/admin" icon={ShieldCheck} titre={t('nav.admin')} compacte />
          )}
          {PAGES_APPLICATION.map((page) => (
            <CarteDestination
              key={page.href}
              href={page.href}
              icon={page.icon}
              titre={t(page.labelKey)}
              compacte
            />
          ))}
        </div>
      </section>
    </div>
  )
}
