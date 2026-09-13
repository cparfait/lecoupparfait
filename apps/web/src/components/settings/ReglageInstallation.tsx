'use client'

/**
 * L'installation, depuis les préférences.
 *
 * Le bandeau de mise en route ne se montre qu'une fois — c'est ce qui le rend
 * supportable. Il faut donc que la proposition reste atteignable ensuite, sans
 * quoi « Plus tard » voudrait dire « jamais ». Elle est ici, à côté des
 * notifications, parce que les deux se posent la même question : que fait cette
 * application quand elle n'est pas à l'écran ?
 */

import { Check, Download, Share, Smartphone } from 'lucide-react'
import { Button, Card, SectionTitle } from '@/components/ui/index.tsx'
import { useInstallation } from '@/lib/pwa.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function ReglageInstallation() {
  const t = useT()
  const { possible, installee, manuelle, installer } = useInstallation()

  return (
    <Card className="p-5">
      <SectionTitle hint={t('notifications.thisDeviceOnly')}>
        <span className="flex items-center gap-2">
          <Smartphone size={16} className="text-accent" aria-hidden />
          {t('rest.installApp')}
        </span>
      </SectionTitle>

      {installee ? (
        <p className="flex items-center gap-2 text-sm text-ink">
          <Check size={15} className="text-[var(--q-best)]" aria-hidden />
          {t('install.alreadyDone')}
        </p>
      ) : manuelle ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
          <Share size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>{t('install.ios')}</span>
        </p>
      ) : possible ? (
        <>
          <p className="text-sm leading-relaxed text-muted">{t('install.blurb')}</p>
          <Button
            className="mt-3"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => void installer()}
          >
            Installer
          </Button>
        </>
      ) : (
        /*
          Ni installée, ni installable, ni iOS. Deux causes, et l'on ne sait pas
          les distinguer depuis la page : un navigateur qui ne le propose pas —
          Firefox sur ordinateur, par exemple — ou un navigateur qui l'a déjà
          proposé pendant cette visite et attend son heure. On décrit donc le
          chemin manuel, qui existe dans les deux cas.
        */
        <p className="text-sm leading-relaxed text-muted">{t('install.manual')}</p>
      )}
    </Card>
  )
}
