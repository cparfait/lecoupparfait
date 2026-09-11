'use client'

/**
 * Sommaire de l'entraînement.
 *
 * Trois écrans qui travaillent la même matière — six millions de positions
 * notées — mais pas la même compétence : les puzzles apprennent à *chercher*,
 * la manche chronométrée à *reconnaître*, le défi du jour à *revenir*.
 *
 * Trois portes de la même forme, dans la teinte de la rubrique.
 */

import { Check, Puzzle, Timer, Zap } from 'lucide-react'
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
] as const

export default function EntrainementPage() {
  const { etat: journee } = useQuotidien()
  // `null` tant que la journée n'est pas lue : on n'annonce pas « déjà relevé »
  // à quelqu'un qui ne l'a pas fait, le temps d'un rendu.
  const defiFait = journee != null && queteFaite(journee, 'defi')

  return (
    <div className="page">
      <TitreDePage intro="Les mêmes positions, trois façons de les travailler : chercher le coup juste, le reconnaître vite, ou en résoudre une par jour.">
        S’entraîner
      </TitreDePage>

      <div className="grille-cartes">
        {EXERCICES.map(({ href, icon, titre, phrase, detail }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
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
