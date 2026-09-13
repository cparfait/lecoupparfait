'use client'

/**
 * Le dernier filet : une erreur dans la mise en page racine elle-même.
 *
 * `error.tsx` enveloppe les pages, mais **pas** la mise en page qui est
 * au-dessus de lui. Quand c'est celle-ci qui casse — les polices, les
 * fournisseurs de contexte, la coque —, il ne reste que ce fichier.
 *
 * Il remplace alors le document entier, d'où le `<html>` et le `<body>` écrits
 * à la main. Et il ne reçoit **ni les styles globaux, ni le thème** : le
 * document de secours ne les charge pas. Toute la mise en forme est donc en
 * ligne, volontairement minimale, et suit le thème du système plutôt que celui
 * de l'application — qu'on ne peut pas connaître ici.
 *
 * Minimal aussi par prudence : ce composant doit s'afficher quand le reste a
 * échoué. Chaque import qu'on lui ajoute est une chose de plus qui peut
 * l'empêcher de s'afficher.
 *
 * ── Et pourtant il est traduit ──────────────────────────────────────────────
 *
 * Ses quatre phrases étaient écrites en français, au motif qu'il vit hors du
 * fournisseur de traduction. C'était vrai et ce n'était pas une raison : l'écran
 * qui s'affiche quand tout a échoué est le dernier endroit où l'on peut se
 * permettre de n'être pas compris.
 *
 * Les deux imports qu'il s'autorise ne coûtent rien à la prudence : le
 * dictionnaire est de la donnée pure — pas de React, pas d'API du navigateur,
 * rien qui puisse lever —, et il est déjà chargé par le reste de l'application,
 * si bien qu'aucun module nouveau n'arrive dans ce chemin d'erreur.
 *
 * La langue vient du témoin, lu à la main : `useI18n` est un crochet, et il n'y a
 * ici aucun fournisseur pour le porter.
 */

import { fabriquerT } from '@/lib/i18n/resoudre.ts'
import { TEMOIN_LANGUE } from '@/lib/i18n/temoin.ts'
import { langue } from '@/lib/i18n/langues.ts'

/**
 * La langue choisie, ou le français.
 *
 * Rendu serveur compris : `document` n'existe pas au premier rendu, et le lire
 * sans précaution ferait échouer l'écran qui sert justement à rattraper un
 * échec.
 */
function localeDuTemoin(): string {
  if (typeof document === 'undefined') return 'fr'
  const trouve = new RegExp(`(?:^|;\\s*)${TEMOIN_LANGUE}=([A-Za-z-]{2,8})`).exec(document.cookie)
  return trouve?.[1] ?? 'fr'
}

export default function ErreurGlobale({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const locale = localeDuTemoin()
  const t = fabriquerT(locale)
  const choisie = langue(locale)

  return (
    <html lang={choisie.bcp47} dir={choisie.rtl ? 'rtl' : 'ltr'}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          colorScheme: 'light dark',
        }}
      >
        <main>
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 .5rem' }}>{t('crash.title')}</h1>
          <p style={{ margin: '0 0 1.25rem', opacity: 0.75, maxWidth: '32rem' }}>
            {t('crash.blurb')}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              font: 'inherit',
              padding: '.5rem 1rem',
              borderRadius: '.5rem',
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            {t('crash.retry')}
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.25rem', fontSize: '.75rem', opacity: 0.6 }}>
              {t('crash.reference')} <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
