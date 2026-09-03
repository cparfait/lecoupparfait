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
        /*
          Aucune réponse d'API n'est gardée par un relais, sauf demande contraire.

          Six routes sur trente-six posaient un `Cache-Control` ; les trente
          autres laissaient la question ouverte, et « ouvert » ne veut pas dire
          « rien » — un relais sans consigne applique la sienne. Le risque n'est
          pas le gaspillage, c'est qu'une réponse **personnelle** — un carnet
          d'amis, une progression, un profil connecté — soit gardée par un cache
          partagé puis resservie à quelqu'un d'autre.

          On pose donc le défaut le plus prudent ici, en un seul endroit, plutôt
          que de compter sur trente fichiers pour y penser.
        */
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        /*
          Les exceptions : les routes qui servent la même chose à tout le monde.

          Elles sont **après** le défaut, et c'est ce qui les fait gagner : à
          clé égale, c'est la dernière règle qui correspond qui l'emporte. Et
          c'est aussi pourquoi elles sont ici et non dans le corps des routes —
          un en-tête posé sur la réponse se fait écraser par celui-ci, ce qui
          est exactement le piège dans lequel on est tombé en l'écrivant.

          Une minute de fraîcheur, cinq de sursis : passé la minute, le relais
          sert la version périmée **et** va en chercher une neuve derrière.
          Personne n'attend jamais un recalcul, et une base indisponible ne
          vide pas l'écran pendant cinq minutes.

          Aucune de ces routes ne lit de session : deux visiteurs qui posent la
          même question reçoivent la même réponse. C'est la seule condition.
        */
        source: '/api/:route(classement|joueurs|sante)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        // Une fiche publique. Le pseudo fait partie de l'adresse, donc de la clé.
        source: '/api/profil/:username',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        // Les parties en cours changent vite : quinze secondes, pas soixante.
        source: '/api/parties',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=15, stale-while-revalidate=60' },
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
