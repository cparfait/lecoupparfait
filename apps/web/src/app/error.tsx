'use client'

/**
 * Ce qu'on montre quand une page casse.
 *
 * Sans ce fichier, une exception dans un composant donnait l'écran gris de
 * Next — un fond blanc, une phrase en anglais, et rien pour s'en sortir. Sur
 * une plateforme où l'on est souvent au milieu d'une partie, c'est le pire
 * moment pour disparaître sans explication.
 *
 * **`retry` et non `reset`.** Next 16 a renommé la prop : `retry()` refait la
 * requête *et* le rendu du segment, là où `reset()` se contentait de vider
 * l'état de la frontière. C'est `retry` qu'on veut ici — l'incident le plus
 * fréquent est une requête qui a échoué, et la relancer suffit.
 *
 * On ne montre pas `error.message` : en production, Next remplace le message
 * d'une erreur serveur par un texte générique et une empreinte, précisément
 * pour ne pas laisser fuiter le détail. On affiche donc l'empreinte, qui sert
 * à retrouver la ligne dans les journaux du serveur.
 */

import { useEffect } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'

export default function Erreur({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const t = useT()
  useEffect(() => {
    // La console du navigateur, faute de service de rapport : l'application
    // n'en a pas, et n'en veut pas — voir le README, rubrique vie privée.
    console.error('[erreur]', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <TriangleAlert size={40} strokeWidth={1.6} className="text-faint" aria-hidden />

      <div>
        <h1 className="text-xl font-semibold">{t('errors.somethingWrong')}</h1>
        <p className="mt-2 text-sm text-muted">{t('errors.somethingWrongHint')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="primary"
          icon={<RotateCcw size={15} aria-hidden />}
          onClick={() => retry()}
        >
          {t('common.retry')}
        </Button>
        <ButtonLink href="/">{t('errors.backHome')}</ButtonLink>
      </div>

      {error.digest && (
        // Sans traduction ni mise en forme : c'est un identifiant, il se
        // recopie tel quel dans un signalement.
        <p className="text-xs text-faint">
          {t('errors.incidentRef')} <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </main>
  )
}
