import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

/**
 * Charge le fichier `.env` de la racine du dépôt.
 *
 * Next.js ne lit que le `.env` situé à côté de son propre `package.json`. Dans
 * un monorepo, la configuration est partagée entre l'application web, le
 * serveur et les scripts d'import : la dupliquer serait la première source de
 * décalage entre les environnements. On lit donc le fichier racine à la main,
 * **sans écraser** les variables déjà définies — celles de Docker priment.
 */
function loadRootEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(here, '..', '..', '.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    // Les valeurs peuvent être entourées de guillemets.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadRootEnv()

/**
 * Configuration Next.js du Coup Parfait.
 *
 * Deux points méritent une explication :
 *
 * 1. **Isolation d'origine croisée** (`COOP`/`COEP`). Stockfish compilé en
 *    WebAssembly ne peut utiliser plusieurs fils d'exécution qu'à travers
 *    `SharedArrayBuffer`, que les navigateurs réservent aux pages isolées.
 *    Sans ces en-têtes, le moteur retombe sur sa version mono-fil : jouable,
 *    mais trois à quatre fois plus lent.
 *
 *    On utilise `require-corp` et non `credentialless` : les fils d'exécution
 *    d'Emscripten créent des *workers* imbriqués, que la variante permissive
 *    refuse de démarrer. La contrepartie — plus aucune ressource externe sans
 *    en-tête CORP — ne coûte rien ici : les polices sont auto-hébergées et
 *    l'application ne charge rien d'autre depuis un autre domaine. C'est de
 *    toute façon préférable : aucune requête vers un tiers, donc aucune fuite
 *    de l'adresse IP des joueurs, et l'application fonctionne hors ligne.
 *
 * 2. **`transpilePackages`**. Le paquet `@coupparfait/core` est consommé sous forme
 *    de TypeScript source, sans étape de compilation intermédiaire. Next doit
 *    donc le transpiler comme s'il faisait partie de l'application.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@coupparfait/core'],

  experimental: {
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },

  // Sortie autonome : l'image Docker n'embarque que le strict nécessaire.
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Le moteur pèse plusieurs mégaoctets et ne change qu'avec la version :
        // on le met en cache pour un an.
        source: '/engine/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/data/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }],
      },
      {
        // Le travailleur de service ne se met jamais en cache. C'est le seul
        // fichier de l'application dont une version périmée ne se rattrape pas
        // par un rechargement : c'est lui qui décide quoi servir. Un correctif
        // resterait coincé le temps du cache — jusqu'à vingt-quatre heures.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
