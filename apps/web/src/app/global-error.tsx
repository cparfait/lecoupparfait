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
 */

export default function ErreurGlobale({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="fr">
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
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 .5rem' }}>
            Le Coup Parfait n’a pas pu démarrer
          </h1>
          <p style={{ margin: '0 0 1.25rem', opacity: 0.75, maxWidth: '32rem' }}>
            L’application elle-même a rencontré un problème. Réessayer relance
            le chargement complet.
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
            Réessayer
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.25rem', fontSize: '.75rem', opacity: 0.6 }}>
              Référence de l’incident : <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
