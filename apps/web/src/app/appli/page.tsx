'use client'

/**
 * L'appli Android : le fichier, la façon de l'installer, et ses mises à jour.
 *
 * Deux pages en une. Depuis un navigateur, c'est le téléchargement et le mode
 * d'emploi — un APK hors Play Store demande trois gestes qu'Android ne
 * explique pas, et l'on ne peut pas compter sur le joueur pour les deviner.
 * Depuis l'appli elle-même, c'est sa version, et l'interrupteur de mise à
 * jour automatique : voir `lib/appliAndroid.ts`.
 */

import { Download, Info, RefreshCw, Smartphone } from 'lucide-react'
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  TitreDePage,
  TitreDeSection,
  Toggle,
} from '@/components/ui/index.tsx'
import { messageEtape } from '@/components/appli/etapeMiseAJour.ts'
import {
  APPLI_ANDROID,
  URL_APK,
  choisirMiseAJourAuto,
  useAppliAndroid,
} from '@/lib/appliAndroid.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function AppliPage() {
  const t = useT()
  const appli = useAppliAndroid()

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('appli.intro')}>{t('appli.title')}</TitreDePage>

      {appli.natif ? <TonAppli /> : <Telechargement />}

      <section className="mt-10">
        <TitreDeSection icon={RefreshCw}>{t('appli.updatesTitle')}</TitreDeSection>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted">
          <p>{t('appli.updatesContent')}</p>
          <p>{t('appli.updatesShell')}</p>
        </div>
      </section>

      <section className="mt-10">
        <TitreDeSection icon={Info}>{t('appli.differencesTitle')}</TitreDeSection>
        <p className="text-[15px] leading-relaxed text-muted">{t('appli.noNotifications')}</p>
      </section>
    </div>
  )
}

function Telechargement() {
  const t = useT()
  const etapes = [t('appli.step1'), t('appli.step2'), t('appli.step3'), t('appli.step4')]

  return (
    <>
      <Card className="p-5">
        {/* Un lien de téléchargement, et non une navigation : `download` fait
            passer `Link` la main au navigateur, et `prefetch` désactivé évite
            de rapatrier l'APK entier dès que le bouton paraît à l'écran. */}
        <ButtonLink
          href={URL_APK}
          download="le-coup-parfait.apk"
          prefetch={false}
          variant="primary"
          size="lg"
          icon={<Download size={18} aria-hidden />}
        >
          {t('appli.download')}
        </ButtonLink>
        <p className="mt-3 text-xs text-muted">
          {t('appli.fileLine', { version: APPLI_ANDROID.versionName })}
        </p>
      </Card>

      <section className="mt-10">
        <TitreDeSection icon={Smartphone}>{t('appli.installTitle')}</TitreDeSection>
        <ol className="space-y-4">
          {etapes.map((etape, index) => (
            <li key={index} className="flex items-start gap-3">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-strong text-sm font-semibold tabular-nums text-ink"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="pt-0.5 text-[15px] leading-relaxed text-muted">{etape}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 space-y-2 text-sm leading-relaxed text-faint">
          <p>{t('appli.fromComputer')}</p>
          <p>{t('appli.iphone')}</p>
        </div>
      </section>
    </>
  )
}

function TonAppli() {
  const t = useT()
  const appli = useAppliAndroid()
  const message = messageEtape(t, appli)

  return (
    <Card className="p-5">
      <TitreDeSection
        icon={Smartphone}
        hint={
          appli.installee
            ? t('appli.installedVersion', { version: appli.installee.nom })
            : undefined
        }
        action={
          appli.installee && appli.aJour ? <Chip tone="success">{t('appli.upToDate')}</Chip> : null
        }
      >
        {t('appli.yourApp')}
      </TitreDeSection>

      {!appli.aJour && (
        <div className="mb-4">
          <p className="text-[15px] font-medium text-ink">
            {t('appli.newVersion', { version: APPLI_ANDROID.versionName })}
          </p>
          {message && (
            <p className="mt-1 text-sm leading-relaxed text-muted" role="status">
              {message}
            </p>
          )}
          <Button
            className="mt-3"
            variant="primary"
            icon={<Download size={16} aria-hidden />}
            disabled={appli.etape === 'telechargement'}
            onClick={() => void appli.mettreAJour()}
          >
            {t('appli.update')}
          </Button>
        </div>
      )}

      <div className="border-t border-line pt-2">
        <Toggle
          checked={appli.miseAJourAuto}
          onChange={choisirMiseAJourAuto}
          label={t('appli.auto')}
          description={t('appli.autoHint')}
        />
      </div>
    </Card>
  )
}
