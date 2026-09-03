import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display, Space_Grotesk } from 'next/font/google'
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

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'Le Coup Parfait — apprendre, jouer, progresser aux échecs',
    template: '%s · Le Coup Parfait',
  },
  description:
    'Plateforme d’échecs libre et gratuite : leçons guidées à la voix, analyse expliquée coup par coup, 25 niveaux d’adversaires et parties entre amis. Sans publicité, sans compte obligatoire.',
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
    title: 'Le Coup Parfait — les échecs, enfin expliqués',
    description:
      'Un moteur qui explique pourquoi, une voix qui accompagne, et zéro euro. Libre et auto-hébergeable.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07070c' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7f9' },
  ],
  width: 'device-width',
  initialScale: 1,
  // L'échiquier occupe déjà toute la largeur : autoriser le zoom pincé le
  // rendrait ingérable pendant une partie. Le zoom navigateur reste disponible.
  maximumScale: 1,
  viewportFit: 'cover',
}

/**
 * Applique le thème avant le premier rendu.
 *
 * Sans cela, la page s'affiche une fraction de seconde dans le thème par défaut
 * avant de basculer — un clignotement blanc particulièrement désagréable pour
 * quelqu'un qui joue en thème sombre le soir.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('coupparfait.preferences');
    var state = stored ? (JSON.parse(stored).state || {}) : {};
    document.documentElement.dataset.theme = state.theme || 'aurora';
    document.documentElement.lang = state.locale || 'fr';
    var effects = state.effects;
    if (!effects) {
      var cores = navigator.hardwareConcurrency || 4;
      var memory = navigator.deviceMemory || 4;
      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      effects = (reduced || (cores <= 4 && memory <= 4)) ? 'low' : 'high';
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${playfair.variable}`}
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
