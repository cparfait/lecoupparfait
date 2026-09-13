import type { Metadata, Viewport } from 'next'
import { tDesMetadonnees } from '@/lib/i18n/metadonnees.ts'
import type { Traducteur } from '@/lib/i18n/resoudre.ts'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers.tsx'
import { AppShell } from '@/components/layout/AppShell.tsx'

/**
 * Polices auto-hébergées.
 *
 * `next/font` télécharge les fichiers à la construction et les sert depuis
 * notre propre domaine. Deux bénéfices : aucune requête vers Google donc
 * aucune fuite d'adresse IP, et aucun décalage de mise en page au chargement.
 * C'est aussi ce qui rend possible l'en-tête `COEP: require-corp` dont
 * Stockfish multi-fils a besoin.
 *
 * Il y en avait un troisième d'annoncé, « une application qui fonctionne hors
 * ligne », et il était faux : rien n'est mis en cache. Ne dépendre d'aucun
 * tiers n'est pas se passer du réseau. Voir le README, « Ce que ça ne fait pas ».
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export async function generateMetadata(): Promise<Metadata> {
  return metadonneesRacine(await tDesMetadonnees())
}

/**
 * Les métadonnées du document, à part pour rester lisibles.
 *
 * Tout ce qui est du texte passe par le dictionnaire ; tout ce qui est un nom, un
 * chemin ou un drapeau reste écrit tel quel. « Le Coup Parfait » est le nom du
 * site : il ne se traduit nulle part, gabarit de titre compris.
 */
function metadonneesRacine(t: Traducteur): Metadata {
  return {
    title: {
      default: t('meta.rootTitle'),
      template: '%s · Le Coup Parfait',
    },
    description: t('meta.rootDesc'),
    applicationName: 'Le Coup Parfait',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: 'Le Coup Parfait',
      statusBarStyle: 'black-translucent',
    },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/icons/icon-192.png',
    },
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDesc'),
      type: 'website',
    },
  }
}

export const viewport: Viewport = {
  // Le fond de page de chaque thème (`--bg`), pour que la barre d'état se
  // fonde dans la page. Le manifeste dit la même chose pour le thème sombre.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0b14' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7f9' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Pas de `maximumScale` : interdire le zoom pincé prive de la loupe ceux
  // qui en ont besoin, et l'échiquier se protège lui-même du double-tap par
  // `touch-action`. Le zoom accidentel pendant une partie n'était qu'une
  // crainte ; l'accessibilité est un critère.
  viewportFit: 'cover',
  // Le clavier virtuel réduit la fenêtre au lieu de la recouvrir : un champ
  // de saisie — le tchat d'une partie, la connexion — reste au-dessus du
  // clavier au lieu de passer dessous, et `dvh` suit.
  interactiveWidget: 'resizes-content',
}

/**
 * Applique le thème avant le premier rendu.
 *
 * Sans cela, la page s'affiche une fraction de seconde dans le thème par défaut
 * avant de basculer — un clignotement blanc particulièrement désagréable pour
 * quelqu'un qui joue en thème sombre le soir.
 *
 * Sans thème enregistré, on suit celui du système : quelqu'un qui a réglé son
 * téléphone en clair n'a pas à découvrir le réglage pour ne plus être ébloui.
 * Le magasin des préférences relit ensuite l'attribut posé ici plutôt que de
 * recalculer — voir `preferences.ts`, `merge`.
 *
 * Le niveau d'effets est deviné avec **la même règle** que
 * `detectEffectsCapability` dans `preferences.ts` : ce script est en ligne,
 * il ne peut rien importer, la règle est donc recopiée telle quelle. Toute
 * modification se fait aux deux endroits.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('coupparfait.preferences');
    var state = stored ? (JSON.parse(stored).state || {}) : {};
    var theme = state.theme;
    if (theme !== 'aurora' && theme !== 'clair') {
      theme = matchMedia('(prefers-color-scheme: light)').matches ? 'clair' : 'aurora';
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = state.locale || 'fr';
    var effects = state.effects;
    if (!effects) {
      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var cores = navigator.hardwareConcurrency || 4;
      var memory = navigator.deviceMemory || 4;
      var coarse = matchMedia('(pointer: coarse)').matches;
      effects = (reduced || (cores <= 4 && memory <= 4) || (coarse && cores <= 6)) ? 'low' : 'high';
    }
    document.documentElement.dataset.effects = effects;
  } catch (e) {
    document.documentElement.dataset.theme = 'aurora';
    document.documentElement.dataset.effects = 'high';
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-theme="aurora"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <div className="ambient-backdrop" aria-hidden />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
