'use client'

/**
 * Menu déroulant : un bouton, un panneau, et les gestes qu'on attend.
 *
 * Extrait du sélecteur de thème de l'en-tête, qui en contenait déjà la
 * mécanique complète — et qui a disparu depuis, le réglage vivant dans les
 * préférences.
 * L'en-tête en compte désormais cinq : sans mise en commun, on aurait six
 * implémentations de la même chose, et elles auraient dérivé — c'est toujours
 * la fermeture au clic extérieur qu'on oublie dans la sixième.
 *
 * Ouverture **au clic**, jamais au survol : un menu qui se déploie au passage
 * de la souris s'ouvre par accident dès qu'on vise le lien d'en dessous.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Referme au clic extérieur et à la touche Échap.
 *
 * `pointerdown` plutôt que `click` : un menu qui ne se referme qu'au relâchement
 * reste ouvert pendant tout un glisser-déposer commencé ailleurs.
 */
export function useFermetureExterieure(
  ouvert: boolean,
  fermer: () => void,
): React.RefObject<HTMLDivElement | null> {
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const surPointeur = (evenement: PointerEvent) => {
      if (!conteneur.current?.contains(evenement.target as Node)) fermer()
    }
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') fermer()
    }
    document.addEventListener('pointerdown', surPointeur)
    document.addEventListener('keydown', surTouche)
    return () => {
      document.removeEventListener('pointerdown', surPointeur)
      document.removeEventListener('keydown', surTouche)
    }
  }, [ouvert, fermer])

  return conteneur
}

export function Menu({
  declencheur,
  children,
  label,
  align = 'left',
  sens = 'bas',
  largeur = 'w-64',
  className,
  boutonClassName,
}: {
  /** Contenu du bouton. Reçoit l'état d'ouverture pour orienter un chevron. */
  declencheur: (ouvert: boolean) => ReactNode
  children: ReactNode
  /** Nom accessible du menu. */
  label: string
  align?: 'left' | 'right'
  /**
   * Sens d'ouverture du panneau.
   *
   * `haut` pour un déclencheur posé en bas de fenêtre — la barre d'actions
   * d'une partie, par exemple. Un panneau qui s'ouvre vers le bas y sort du
   * cadre : on voit les deux premières entrées et les suivantes n'existent
   * plus, sans même un défilement pour les atteindre.
   */
  sens?: 'bas' | 'haut'
  largeur?: string
  className?: string
  /**
   * Habillage du déclencheur, en remplacement du bouton par défaut.
   *
   * Sert quand le menu s'ouvre depuis quelque chose qui a déjà sa forme
   * ailleurs dans la page — une pastille de l'en-tête d'accueil, par exemple.
   * Lui imposer l'aspect d'un bouton de barre de navigation la ferait détonner
   * à côté de sa voisine, qui n'en est pas un.
   */
  boutonClassName?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const fermer = useCallback(() => setOuvert(false), [])
  const conteneur = useFermetureExterieure(ouvert, fermer)
  const panneauId = useId()
  const boutonRef = useRef<HTMLButtonElement>(null)
  const panneauRef = useRef<HTMLDivElement>(null)

  /**
   * Ramène le panneau dans l'écran.
   *
   * Le panneau s'accroche à son bouton — `left-0` ou `right-0` — et prend une
   * largeur fixe. Tant que le bouton est près du bord correspondant, tout va
   * bien ; ailleurs, le compte n'y est pas. La barre d'actions d'une partie se
   * replie sur téléphone, et son bouton « … » se retrouve n'importe où : un
   * panneau de 240 points aligné à droite d'un bouton posé à 150 points du bord
   * gauche commence à moins 90 — la moitié du texte hors de l'écran, et la page
   * qui se met à défiler latéralement.
   *
   * On mesure donc après ouverture et on décale de ce qu'il faut, jamais plus.
   * Un vrai positionnement d'ancrage CSS ferait cela sans mesure, mais il n'est
   * pas encore là où sont nos utilisateurs.
   *
   * `translate` et non `transform` : l'animation d'entrée anime `transform` en
   * `fill-mode: both`, donc sa valeur finale l'emporterait sur tout ce qu'on
   * écrirait en style en ligne. Les deux propriétés se composent.
   */
  const [decalage, setDecalage] = useState(0)
  /** Ce qui est effectivement appliqué au panneau, pour repartir de l'ancrage. */
  const decalageApplique = useRef(0)

  useEffect(() => {
    if (!ouvert) {
      decalageApplique.current = 0
      setDecalage(0)
      return
    }
    const recadrer = () => {
      const panneau = panneauRef.current
      if (!panneau) return

      const marge = 8
      const cadre = panneau.getBoundingClientRect()
      // Le cadre mesuré inclut le décalage déjà appliqué : on repart de la
      // position ancrée pour ne pas empiler deux corrections.
      const gauche = cadre.left - decalageApplique.current
      const droite = cadre.right - decalageApplique.current

      let ecart = 0
      if (droite > window.innerWidth - marge) ecart = window.innerWidth - marge - droite
      if (gauche + ecart < marge) ecart = marge - gauche

      decalageApplique.current = ecart
      setDecalage(ecart)
    }

    recadrer()
    // Un téléphone qu'on tourne pendant que le menu est ouvert : la fenêtre
    // change de largeur, le panneau doit resuivre.
    window.addEventListener('resize', recadrer)
    return () => window.removeEventListener('resize', recadrer)
  }, [ouvert])

  /**
   * Navigation au clavier dans le panneau.
   *
   * Les flèches parcourent les entrées, `Échap` referme **et rend le focus au
   * bouton** — sans ce retour, on se retrouve projeté en haut du document et il
   * faut retraverser toute la page à la tabulation pour revenir où l'on était.
   */
  const surToucheDuPanneau = useCallback((evenement: React.KeyboardEvent<HTMLDivElement>) => {
    if (evenement.key === 'Escape') {
      setOuvert(false)
      boutonRef.current?.focus()
      return
    }
    if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return

    const cibles = Array.from(
      evenement.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    )
    if (cibles.length === 0) return
    evenement.preventDefault()

    const courant = cibles.indexOf(document.activeElement as HTMLElement)
    const pas = evenement.key === 'ArrowDown' ? 1 : -1
    const suivant = (courant + pas + cibles.length) % cibles.length
    cibles[suivant]?.focus()
  }, [])

  return (
    <div ref={conteneur} className={clsx('relative', className)}>
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((valeur) => !valeur)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={ouvert ? panneauId : undefined}
        /*
          Un bouton de menu doit ressembler à un bouton.

          Celui-ci était un mot gris posé sur le fond de la page : rien ne le
          distinguait d'un titre, et l'on n'apprenait qu'il s'ouvrait qu'en le
          survolant — ce qui n'existe pas au doigt. Il porte donc une surface et
          un liseré, en permanence, et passe à la surface forte une fois
          ouvert. Le texte est en pleine encre : c'est de la navigation, pas
          une mention secondaire.
        */
        className={
          boutonClassName ??
          clsx(
            'flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors',
            ouvert
              ? 'bg-surface-strong text-ink ring-accent/50'
              : 'bg-surface-strong text-ink ring-line-strong hover:bg-surface-hover',
          )
        }
      >
        {declencheur(ouvert)}
      </button>

      {ouvert && (
        <div
          ref={panneauRef}
          id={panneauId}
          role="menu"
          aria-label={label}
          onKeyDown={surToucheDuPanneau}
          onClick={fermer}
          style={decalage === 0 ? undefined : { translate: `${decalage}px` }}
          className={clsx(
            'animate-slide-up popover absolute z-50 p-1.5 shadow-[var(--shadow-lg)]',
            // Un plafond de hauteur avec défilement : même dans le bon sens,
            // un panneau plus grand que la fenêtre reste inaccessible par le
            // bas. Là, on peut au moins l'atteindre.
            'max-h-[70dvh] overflow-y-auto',
            // Et un plafond de largeur, pour la même raison : sur un téléphone
            // étroit, `w-64` dépasse à lui seul la fenêtre, et aucun décalage
            // ne rattrape un panneau plus large que l'écran.
            'max-w-[calc(100vw-1rem)]',
            largeur,
            align === 'right' ? 'right-0' : 'left-0',
            sens === 'haut' ? 'bottom-11' : 'top-11',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
