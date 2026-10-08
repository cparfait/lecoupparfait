'use client'

/**
 * « Continuer avec Google ».
 *
 * Un lien et non un bouton : c'est le navigateur entier qui part chez Google et
 * en revient, par `api/auth/google`. Voir `lib/server/google.ts`.
 *
 * Absent dans deux cas :
 *  - le serveur n'a pas de client Google configuré ;
 *  - on est dans l'appli Android. Google refuse sa connexion dans une WebView
 *    (« disallowed_useragent ») : le bouton y mènerait à une page d'erreur de
 *    Google. Il y reviendra quand l'appli saura passer par le navigateur du
 *    téléphone et revenir.
 */

import { useEffect, useState } from 'react'
import { classesBouton } from '@/components/ui/index.tsx'
import { dansAppliAndroid } from '@/lib/appliAndroid.ts'
import { useGoogleDisponible } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function BoutonGoogle({
  mode = 'connexion',
  suite = '/',
  libelle,
  className,
  separateur = false,
}: {
  mode?: 'connexion' | 'lier'
  /** Le chemin où revenir une fois connecté ou lié. */
  suite?: string
  libelle?: string
  className?: string
  /** Un « ou » dessous, avant un formulaire : il disparaît avec le bouton. */
  separateur?: boolean
}) {
  const t = useT()
  const disponible = useGoogleDisponible()
  // Lu après l'hydratation : le serveur ne sait pas s'il rend pour l'appli.
  const [dansAppli, setDansAppli] = useState(false)
  useEffect(() => setDansAppli(dansAppliAndroid()), [])

  if (!disponible || dansAppli) return null

  return (
    <>
      <a
        href={`/api/auth/google?${new URLSearchParams({ mode, suite })}`}
        className={classesBouton('secondary', 'lg', { fullWidth: true, className })}
      >
        <LogoGoogle />
        {libelle ?? t('auth.google.button')}
      </a>
      {separateur && (
        <div className="my-5 flex items-center gap-3 text-xs text-faint" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          {t('auth.google.or')}
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
    </>
  )
}

/**
 * Le « G » de Google, dans ses quatre couleurs.
 *
 * Seule exception aux icônes de lucide et aux jetons de couleur, et elle est
 * imposée : les règles de marque de Google exigent ce logo-ci, tel quel, sur
 * tout bouton de connexion qui porte son nom.
 */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
