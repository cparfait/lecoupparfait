'use client'

/**
 * Le Coup Parfait sur son ordinateur : le raccourci des joueurs au clavier.
 *
 * Rien à télécharger. Chrome et Edge savent installer un site comme une
 * application — une icône sur le bureau, une fenêtre à elle — et le
 * proposent par `beforeinstallprompt`, que `lib/pwa.ts` retient. Le bouton
 * rouvre cette proposition. Quand le navigateur ne l'a pas faite — Firefox ne
 * sait pas installer, Safari passe par son menu —, on donne le geste à la
 * main, en une ligne par navigateur.
 *
 * Réservée à l'ordinateur : les menus la masquent au doigt (`bureau` dans
 * `lib/navigation.ts`). Sur téléphone, l'installation se propose déjà dans
 * la mise en route et les préférences.
 */

import { useState } from 'react'
import { Check, Download } from 'lucide-react'
import { Button, Card, TitreDePage } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { useInstallation } from '@/lib/pwa.ts'

export default function InstallerPage() {
  const t = useT()
  const { possible, installee, installer } = useInstallation()
  // Une fois l'installation acceptée, cet onglet-ci reste un onglet : rien ne
  // le distinguerait d'un navigateur qui n'a rien proposé. On le retient.
  const [fait, setFait] = useState(false)

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('installDesktop.intro')}>{t('installDesktop.title')}</TitreDePage>

      <Card className="p-5">
        {installee || fait ? (
          <p className="flex items-center gap-2 text-[15px] text-ink">
            <Check size={16} className="shrink-0 text-[var(--q-best)]" aria-hidden />
            {t('installDesktop.done')}
          </p>
        ) : possible ? (
          <Button
            variant="primary"
            size="lg"
            icon={<Download size={18} aria-hidden />}
            onClick={() => void installer().then((accepte) => setFait(accepte))}
          >
            {t('installDesktop.button')}
          </Button>
        ) : (
          <ul className="space-y-2 text-[15px] leading-relaxed text-muted">
            <li>{t('installDesktop.chrome')}</li>
            <li>{t('installDesktop.safari')}</li>
            <li>{t('installDesktop.firefox')}</li>
          </ul>
        )}
      </Card>
    </div>
  )
}
