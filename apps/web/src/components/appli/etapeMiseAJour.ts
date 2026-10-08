/**
 * Ce que dit l'interface pendant une mise à jour de l'appli Android.
 *
 * Partagé par le bandeau de `MiseEnRoute` et la page `/appli`, qui montrent le
 * même téléchargement : ils doivent aussi le décrire avec les mêmes mots.
 */

import type { EtatAppli } from '@/lib/appliAndroid.ts'
import type { useT } from '@/lib/i18n/index.tsx'

export function messageEtape(
  t: ReturnType<typeof useT>,
  { etape, pourcentage }: Pick<EtatAppli, 'etape' | 'pourcentage'>,
): string | null {
  switch (etape) {
    case 'autorisation':
      return t('appli.stepAuthorize')
    case 'telechargement':
      return pourcentage === null
        ? t('appli.stepDownload')
        : t('appli.stepDownloadPercent', { pourcentage })
    case 'installeur':
      return t('appli.stepInstaller')
    case 'erreur':
      return t('appli.stepError')
    case 'repos':
      return null
  }
}
