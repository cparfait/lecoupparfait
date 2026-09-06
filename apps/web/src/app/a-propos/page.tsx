/**
 * À propos.
 *
 * Une page qui répond aux trois questions que se pose quelqu'un qui découvre un
 * outil gratuit : c'est quoi, pourquoi c'est gratuit, et où vont mes données.
 * Y répondre franchement vaut mieux que n'importe quel argumentaire.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BOT_LEVELS, BOT_PERSONALITIES, CHAPITRES, motifGlossary } from '@coupparfait/core'
import { Card, Chip } from '@/components/ui/index.tsx'
import { CURRICULUM_STATS } from '@/lib/lessons/index.ts'
import { TERMS } from '@/lib/glossaire.ts'

export const metadata: Metadata = {
  title: 'À propos',
  description:
    'Ce qu’est Le Coup Parfait, pourquoi c’est gratuit, et ce qu’il advient de tes données. Réponse courte : rien, elles restent chez toi.',
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-14">
      <Chip tone="accent">Logiciel libre · AGPL-3.0</Chip>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        À propos du Coup Parfait
      </h1>

      <div className="mt-6 space-y-5 leading-relaxed text-muted">
        <p>
          Le Coup Parfait est une plateforme d’échecs conçue pour{' '}
          <strong className="text-ink">apprendre</strong>, pas seulement pour jouer. La différence
          tient en une chose : quand tu fais une erreur, l’outil ne se contente pas d’afficher un
          nombre — il te dit ce que tu as raté, avec les mots que les joueurs d’échecs utilisent
          entre eux.
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          Pourquoi c’est gratuit
        </h2>
        <p>
          Parce que rien ici ne coûte cher. Le moteur — Stockfish — est libre et gratuit. Les jeux
          de données d’ouvertures et de puzzles sont dans le domaine public, offerts par Lichess.
          Les pièces et les sons sont sous licence libre. La synthèse vocale est celle de ton
          système d’exploitation, elle ne passe par aucun service payant.
        </p>
        <p>
          Il ne reste que l’hébergement, et cette application est faite pour tourner sur une machine
          modeste. Il n’y a donc aucune fonctionnalité payante, aucun abonnement, aucune limite
          quotidienne — et rien de tout cela n’est prévu pour plus tard.
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          Ce qu’il advient de tes données
        </h2>
        <p>
          Aucun traqueur, aucune publicité, aucun outil d’analyse d’audience. Aucune requête n’est
          envoyée à un domaine tiers : même les polices de caractères sont servies depuis ce
          serveur, précisément pour que ton adresse IP ne parte pas ailleurs.
        </p>
        <p>
          Tes préférences vivent dans ton navigateur. Si tu crées un compte, on stocke un pseudo,
          une empreinte de mot de passe, tes classements et tes parties — rien d’autre. L’adresse
          e-mail est facultative et ne sert qu’à récupérer un mot de passe oublié.
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          Comment ça marche
        </h2>
        <p>
          Deux moteurs travaillent ensemble. Dans ton navigateur, une version WebAssembly de
          Stockfish donne un avis instantané après chaque coup, sans rien envoyer nulle part. Sur le
          serveur, une version native tourne à pleine puissance pour les analyses de partie
          complètes.
        </p>
        <p>
          Les explications, elles, ne viennent pas d’un modèle de langue mais d’un{' '}
          <strong className="text-ink">analyseur géométrique</strong> écrit pour ce projet : il
          reconnaît sur l’échiquier les fourchettes, clouages, enfilades, pions passés, avant-postes
          — une quarantaine de motifs — et rédige à partir de là. Conséquence directe : ce qu’il
          affirme est toujours vérifiable sur l’échiquier, et la même position produit toujours la
          même explication.
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          Héberge-le toi-même
        </h2>
        <p>
          Le code est sous licence AGPL. Tu peux le télécharger, le modifier et le faire tourner
          chez toi — un{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[14px]">
            docker compose up
          </code>{' '}
          suffit. C’est même l’usage prévu : une instance pour toi et tes amis, sans dépendre de
          personne.
        </p>
      </div>

      <Card className="mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">En quelques chiffres</h2>
        {/* Les chiffres se comptent, ils ne se recopient pas.

            « 30 leçons guidées » était écrit à la main, et le programme en
            comptait déjà davantage : une page qui se veut franche sur ses
            données ne peut pas se tromper sur les siennes. Tout ce qui vit dans
            le code se lit donc à la source — leçons, niveaux, personnalités,
            chapitres, vocabulaire — et ne peut plus vieillir. Restent en dur
            les deux jeux de données extérieurs, ouvertures et puzzles, dont le
            volume est fixé par l'import. */}
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            { value: '3 810', label: 'ouvertures nommées' },
            { value: '6 M', label: 'puzzles tactiques' },
            { value: String(CURRICULUM_STATS.lessons), label: 'leçons guidées' },
            { value: String(Object.keys(BOT_LEVELS).length), label: 'niveaux d’adversaires' },
            {
              value: String(Object.keys(BOT_PERSONALITIES).length),
              label: 'personnalités, chacune son style',
            },
            { value: String(CHAPITRES.length), label: 'chapitres de carrière' },
            {
              value: String(TERMS.length + motifGlossary('fr').length),
              label: 'mots définis en français clair',
            },
            { value: '7', label: 'pièces : les finales jouées à la perfection' },
          ].map((entry) => (
            <div key={entry.label}>
              <dt className="font-display text-xl font-bold tabular-nums text-ink">
                {entry.value}
              </dt>
              <dd className="mt-0.5 text-xs leading-snug text-muted">{entry.label}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mt-6 text-center text-sm">
        <Link href="/credits" className="text-accent hover:underline">
          Crédits &amp; licences des ressources utilisées
        </Link>
      </p>
    </div>
  )
}
