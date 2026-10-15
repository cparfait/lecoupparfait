'use client'

/**
 * L'appli Android : où l'obtenir, et ce qu'on a installé.
 *
 * Deux pages en une. Depuis un navigateur, c'est le lien vers le Play Store.
 * Depuis l'appli elle-même, c'est sa version — et, pour qui a encore l'APK
 * que le site servait autrefois, l'invitation à passer au Play Store : cette
 * coque-là ne se mettra plus jamais à jour. Voir `lib/appliAndroid.ts`.
 */

import { Bell, ExternalLink, RefreshCw, Smartphone } from 'lucide-react'
import { ButtonLink, Card, Chip, TitreDePage, TitreDeSection } from '@/components/ui/index.tsx'
import { APPLI_ANDROID, URL_PLAY_STORE, useAppliAndroid } from '@/lib/appliAndroid.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function AppliPage() {
  const t = useT()
  const appli = useAppliAndroid()

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('appli.intro')}>{t('appli.title')}</TitreDePage>

      {appli.natif ? <TonAppli /> : <PlayStore />}

      <section className="mt-10">
        <TitreDeSection icon={RefreshCw}>{t('appli.updatesTitle')}</TitreDeSection>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted">
          <p>{t('appli.updatesContent')}</p>
          <p>{t('appli.updatesShell')}</p>
        </div>
      </section>

      <section className="mt-10">
        <TitreDeSection icon={Bell}>{t('appli.notificationsTitle')}</TitreDeSection>
        <p className="text-[15px] leading-relaxed text-muted">{t('appli.notificationsInApp')}</p>
      </section>
    </div>
  )
}

/** Le bouton vers la fiche, partagé par les deux vues. */
function BoutonPlayStore() {
  const t = useT()
  return (
    // Une fiche hors du site : nouvel onglet dans un navigateur ; dans l'appli,
    // la coque confie l'adresse à Android, qui ouvre le Play Store.
    <ButtonLink
      href={URL_PLAY_STORE}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      variant="primary"
      size="lg"
      icon={<ExternalLink size={18} aria-hidden />}
    >
      {t('appli.playStore')}
    </ButtonLink>
  )
}

function PlayStore() {
  const t = useT()
  return (
    <>
      <Card className="p-5">
        <BoutonPlayStore />
        <p className="mt-3 text-xs text-muted">{t('appli.playStoreLine')}</p>
      </Card>
      <div className="mt-6 space-y-2 text-sm leading-relaxed text-faint">
        <p>{t('appli.fromComputer')}</p>
        <p>{t('appli.iphone')}</p>
      </div>
    </>
  )
}

function TonAppli() {
  const t = useT()
  const appli = useAppliAndroid()
  const aJour =
    appli.installee !== null &&
    !appli.aQuitterLeSite &&
    appli.installee.code >= APPLI_ANDROID.versionCode

  return (
    <Card className="p-5">
      <TitreDeSection
        icon={Smartphone}
        hint={
          appli.installee
            ? t('appli.installedVersion', { version: appli.installee.nom })
            : undefined
        }
        action={aJour ? <Chip tone="success">{t('appli.upToDate')}</Chip> : null}
      >
        {t('appli.yourApp')}
      </TitreDeSection>

      {appli.aQuitterLeSite ? (
        <>
          <p className="text-[15px] font-medium text-ink">{t('appli.leaveSiteTitle')}</p>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-muted">{t('appli.leaveSiteText')}</p>
          <BoutonPlayStore />
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted">{t('appli.updatesByPlay')}</p>
      )}
    </Card>
  )
}
