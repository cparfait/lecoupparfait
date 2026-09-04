/**
 * Crédits et licences.
 *
 * Ce n'est pas une page de politesse : les licences GPL, CC BY et CC BY-SA
 * **exigent** l'attribution. Sans cette page, la redistribution du projet serait
 * illégale. Elle sert aussi à montrer sur quoi le projet est bâti — c'est une
 * bonne façon de découvrir l'écosystème libre des échecs.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/index.tsx'

export const metadata: Metadata = {
  title: 'Crédits & licences',
  description:
    'Les logiciels, jeux de données et ressources graphiques libres sur lesquels Le Coup Parfait est construit, avec leurs auteurs et leurs licences.',
}

interface Credit {
  name: string
  author: string
  licence: string
  url: string
  note: string
}

const ENGINE: Credit[] = [
  {
    name: 'Stockfish 18',
    author: 'les auteurs de Stockfish',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/official-stockfish/Stockfish',
    note: 'Le moteur d’échecs le plus fort au monde. Il tourne côté serveur en version native, et dans le navigateur en WebAssembly.',
  },
  {
    name: 'Stockfish.js',
    author: 'Nathan Rugg',
    licence: 'GPL-3.0-or-later',
    url: 'https://github.com/nmrugg/stockfish.js',
    note: 'La compilation WebAssembly de Stockfish, qui permet d’analyser sans rien envoyer à un serveur.',
  },
  {
    name: 'chess.js',
    author: 'Jeff Hlywa',
    licence: 'BSD-2-Clause',
    url: 'https://github.com/jhlywa/chess.js',
    note: 'Les règles du jeu : génération des coups légaux, détection du mat, lecture du PGN.',
  },
]

const DATA: Credit[] = [
  {
    name: 'Base d’ouvertures ECO',
    author: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://github.com/lichess-org/chess-openings',
    note: '3 810 ouvertures nommées et classées, traduites en français pour ce projet.',
  },
  {
    name: 'Base de puzzles',
    author: 'Lichess',
    licence: 'CC0-1.0 (domaine public)',
    url: 'https://database.lichess.org/',
    note: '6 057 356 positions tactiques, notées et étiquetées par thème, extraites de vraies parties.',
  },
  {
    name: 'Base de positions de finales',
    author: 'supertorpe et les contributeurs',
    licence: 'GPL-3.0',
    url: 'https://github.com/supertorpe/chessendgametraining',
    note: '3 568 positions de finales classées par matériel, de « mater avec une dame » à « tenir la nulle avec une tour de moins », traduites et re-cotées en difficulté pour ce projet.',
  },
  {
    name: 'Tables de finales Syzygy',
    author: 'Ronald de Man, service hébergé par Lichess',
    licence: 'accès libre',
    url: 'https://tablebase.lichess.ovh/',
    note: 'Le jeu parfait dans toutes les finales à sept pièces ou moins. Une certitude, pas une évaluation.',
  },
]

const ASSETS: Credit[] = [
  {
    name: 'Pièces Staunton (cburnett)',
    author: 'Colin M. L. Burnett',
    licence: 'GPL-2.0-or-later',
    url: 'https://en.wikipedia.org/wiki/User:Cburnett',
    note: 'Le jeu de pièces vectoriel le plus utilisé du monde libre.',
  },
  {
    name: 'Pièces Merida',
    author: 'Armando Hernandez Marroquin',
    licence: 'GPL-2.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece/merida',
    note: 'Contours nets, excellente lisibilité en petite taille.',
  },
  {
    name: 'Pièces Fantasy, Spatial, Celtique',
    author: 'Maurizio Monge',
    licence: 'MIT',
    url: 'https://github.com/maurimo/chess-art',
    note: 'Trois jeux de caractère, aux volumes sculptés.',
  },
  {
    name: 'Pièces Chessnut',
    author: 'Alexis Luengas',
    licence: 'Apache-2.0',
    url: 'https://github.com/LexLuengas/chessnut-pieces',
    note: 'Épuré et contemporain.',
  },
  {
    name: 'Pièces Rhos',
    author: 'RhosGFX',
    licence: 'CC0-1.0',
    url: 'https://rhosgfx.itch.io/',
    note: 'Aplats colorés, domaine public.',
  },
  {
    name: 'Pièces Alpha, Pixel, Lettres',
    author: 'les auteurs de lila, therealqtpi, usolando',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/piece',
    note: 'Trois approches minimalistes, dont un jeu en lettres pour la lisibilité maximale.',
  },
  {
    name: 'Bruitages',
    author: 'Enigmahack et les auteurs de lila',
    licence: 'AGPL-3.0-or-later',
    url: 'https://github.com/lichess-org/lila/tree/master/public/sound',
    note: 'Déplacement, capture, échec, fin de partie.',
  },
]

export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Crédits &amp; licences</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[13px]">
        Le Coup Parfait n’aurait pas pu exister sans le travail libre d’autres personnes. Tout ce
        qui suit est réutilisé dans le respect de sa licence — et cette page en fait partie :
        plusieurs de ces licences exigent explicitement l’attribution.
      </p>

      <Section title="Moteur et règles" credits={ENGINE} />
      <Section title="Jeux de données" credits={DATA} />
      <Section title="Ressources graphiques et sonores" credits={ASSETS} />

      <Card className="mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">La licence du Coup Parfait</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Le Coup Parfait est publié sous licence{' '}
          <strong className="text-ink">GNU Affero General Public License v3 ou ultérieure</strong>.
          Ce choix n’est pas arbitraire : Stockfish est sous GPL, et toute œuvre qui l’intègre doit
          adopter une licence compatible. L’AGPL ajoute une clause décisive pour un service en ligne
          — quiconque héberge une version modifiée doit en publier le code source.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Concrètement : tu peux l’utiliser, le modifier, l’héberger pour tes amis, le redistribuer.
          La seule obligation est de laisser les suivants faire pareil.
        </p>
        <p className="mt-3 text-xs text-faint">
          Les jeux de pièces publiés sous licence <span className="font-mono">CC BY-NC-SA</span>{' '}
          (usage non commercial) ont été délibérément écartés du projet, aussi beaux soient-ils :
          leur clause rendrait la redistribution libre impossible.
        </p>
      </Card>

      <p className="mt-8 text-center text-sm">
        <Link href="/a-propos" className="text-accent hover:underline">
          En savoir plus sur le projet
        </Link>
      </p>
    </div>
  )
}

function Section({ title, credits }: { title: string; credits: Credit[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-2">
        {credits.map((credit) => (
          <Card key={credit.name} className="p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-accent hover:underline"
              >
                {credit.name}
              </a>
              <span className="text-xs text-muted">par {credit.author}</span>
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-faint">
                {credit.licence}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{credit.note}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
