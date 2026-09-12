'use client'

/**
 * Sommaire de l'entraînement.
 *
 * Quatre écrans qui travaillent la même matière — six millions de positions
 * notées — mais pas la même compétence : les puzzles apprennent à *chercher*,
 * la manche chronométrée à *reconnaître*, le défi du jour à *revenir*. Le
 * quatrième n'apprend rien et c'est son rôle : il **mesure**. Les positions de
 * Lichess portent leur propre cote, établie sur des millions de tentatives, ce
 * qui en fait le seul instrument calibré dont l'application dispose.
 *
 * Quatre portes de la même forme, dans la teinte de la rubrique — sauf la
 * dernière, qui emprunte celle d'« Apprendre » parce qu'elle y conduit.
 */

import { Check, Gauge, Puzzle, Timer, Zap } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { Chip, TitreDePage } from '@/components/ui/index.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { queteFaite } from '@/lib/daily/quotidien.ts'
import { SECTIONS } from '@/lib/navigation.ts'

const TEINTE = SECTIONS.find((s) => s.id === 'entrainer')?.teinte

const EXERCICES = [
  {
    href: '/puzzles',
    icon: Puzzle,
    titre: 'Puzzles',
    phrase:
      'Une position, un coup à trouver. Le niveau suit le tien, et une erreur ne ferme pas l’exercice.',
    detail: '6 millions de positions · 12 thèmes · classement personnel',
  },
  {
    href: '/puzzles/rush',
    icon: Timer,
    titre: 'Puzzle rush',
    phrase:
      'Le plus de positions possible avant la fin du temps. On ne réfléchit plus, on reconnaît.',
    detail: '3 minutes, 5 minutes ou survie · trois erreurs et la manche s’arrête',
  },
  {
    href: '/puzzles?defi=1',
    icon: Zap,
    titre: 'Défi du jour',
    phrase:
      'Une seule position, la même pour tout le monde de ton niveau. La prochaine arrive à minuit.',
    detail: 'Compte pour la série et pour les quêtes du jour',
  },
  // Le test de niveau est rangé ici en plus de « Apprendre », et ce n'est pas
  // un doublon : il travaille la même matière que les trois autres — les
  // positions notées — et c'est depuis cet écran qu'on se demande « à quel
  // niveau je devrais m'entraîner ? ». Il ne touche à aucun classement.
  {
    href: '/apprendre/niveau',
    icon: Gauge,
    titre: 'Test de niveau',
    phrase:
      'Douze positions, plus dures ou plus simples selon tes réponses. À la fin, un niveau estimé et ce qu’il faut travailler.',
    detail: 'Six minutes · ne touche ni à ton Elo ni à ta cote de puzzles',
  },
] as const

export default function EntrainementPage() {
  const { etat: journee } = useQuotidien()
  // `null` tant que la journée n'est pas lue : on n'annonce pas « déjà relevé »
  // à quelqu'un qui ne l'a pas fait, le temps d'un rendu.
  const defiFait = journee != null && queteFaite(journee, 'defi')

  return (
    <div className="page">
      <TitreDePage intro="Les mêmes positions, quatre façons de s’en servir : chercher le coup juste, le reconnaître vite, en résoudre une par jour — ou s’en servir pour mesurer son niveau.">
        S’entraîner
      </TitreDePage>

      <div className="grille-cartes">
        {EXERCICES.map(({ href, icon, titre, phrase, detail }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            // Le test de niveau porte la teinte d'« Apprendre » : il mène là-bas,
            // et une pastille de la couleur de la rubrique aurait annoncé un
            // quatrième exercice alors que c'est une mesure.
            teinte={href.startsWith('/apprendre') ? 'var(--rub-apprendre)' : TEINTE}
            titre={titre}
            phrase={phrase}
            detail={detail}
            // Le défi relevé se dit ici plutôt que sur la position : on le
            // découvrait en arrivant devant l'échiquier, une fois le geste fait.
            badge={
              href.includes('defi=1') && defiFait ? (
                <Chip tone="success">
                  <Check size={11} aria-hidden />
                  relevé
                </Chip>
              ) : undefined
            }
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
