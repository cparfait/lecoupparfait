'use client'

/**
 * L'échelle des adversaires : une carte par échelon de `BOT_LEVELS`, qui
 * défile de côté, et au-dessus la carte détaillée de celui qu'on a choisi.
 *
 * Elle remplace trois contrôles qui disaient la même chose : une galerie de
 * sept portraits (un par personnalité, alors qu'une personnalité revient à
 * plusieurs échelons), un curseur « niveau fin » et cinq puces « Je débute…
 * Sans pitié ». Trois façons de régler une seule valeur, qui se contredisaient
 * dès qu'on touchait l'une d'elles : la puce « Club » restait allumée pendant
 * qu'on glissait le curseur, la vignette de Pion annonçait un autre niveau que
 * celui du curseur. Ici, chaque échelon est une carte et une seule, avec son
 * portrait, son numéro et son Elo — ce que le clic choisit, on le voit.
 */

import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { BOT_LEVELS, BOT_PERSONALITIES, botLevel, niveauxDe } from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { Defilement } from '@/components/ui/Defilement.tsx'
import { palierPour } from '@/lib/apprendre/palier.ts'
import { TEINTES_ADVERSAIRES } from '@/lib/adversaires.ts'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

/** La carte de l'adversaire retenu : portrait, nom, force, et sa phrase. */
export function AdversaireChoisi({ level }: { level: number }) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const bot = botLevel(level)
  const personnalite = BOT_PERSONALITIES[bot.personality]

  return (
    <div className="flex items-center gap-3.5 rounded-[var(--radius)] border border-line bg-surface p-3.5">
      <span
        className="grid h-[4.75rem] w-[4.75rem] shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong"
        aria-hidden
      >
        <PortraitAdversaire personality={personnalite} size={64} />
      </span>
      {/* La phrase réserve ses lignes : sa longueur varie d'un adversaire à
          l'autre, et l'échelle juste en dessous ne doit pas sauter d'un cran
          à chaque choix — le pouce perdrait sa cible. */}
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-bold leading-tight tracking-tight">
          {tCoeur(t, personnalite.name)}
        </h3>
        <span className="text-[13px] font-semibold text-accent">
          {t('computer.opponentStrength', {
            elo: bot.elo.toLocaleString(bcp47),
            n: bot.level,
            total: BOT_LEVELS.length,
          })}
        </span>
        <p className="min-h-[3lh] text-[13px] leading-snug text-muted sm:min-h-[2lh]">
          {tCoeur(t, personnalite.blurb)}
        </p>
      </div>
    </div>
  )
}

export function EchelleDesAdversaires({
  level,
  onChoisir,
  battus = [],
}: {
  level: number
  onChoisir: (niveau: number) => void
  /** Niveaux déjà gagnés sans aide : ils portent une coche. */
  battus?: readonly number[]
}) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const rangee = useRef<HTMLDivElement>(null)
  const cartes = useRef<Map<number, HTMLButtonElement>>(new Map())
  const monte = useRef(false)

  /**
   * La carte choisie défile en vue — la rangée seule, jamais la page.
   *
   * Venu d'une fiche (« Jouer contre Mirage »), d'un lien `?perso=`, ou revenu
   * après une partie au niveau 14, la carte choisie était hors champ et la
   * rangée montrait les premiers échelons avec l'air de n'avoir rien
   * sélectionné. `scrollIntoView` aurait aussi fait défiler le document ; on
   * mesure donc l'écart entre le centre de la carte et celui de la rangée, ce
   * qui vaut aussi en arabe ou en hébreu, où la rangée part de la droite.
   *
   * Au montage, d'un coup : un défilement animé lancé pendant que la page se
   * construit est interrompu par le rendu suivant. Ensuite, en douceur, sauf
   * si le système demande moins d'animations.
   */
  useEffect(() => {
    const conteneur = rangee.current
    const carte = cartes.current.get(level)
    if (!conteneur || !carte) return
    const cadre = conteneur.getBoundingClientRect()
    const cible = carte.getBoundingClientRect()
    const ecart = cible.left + cible.width / 2 - (cadre.left + cadre.width / 2)
    const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    conteneur.scrollBy({ left: ecart, behavior: monte.current && !calme ? 'smooth' : 'instant' })
    monte.current = true
  }, [level])

  /**
   * Les flèches passent d'un échelon à l'autre, Début et Fin vont aux bouts.
   *
   * Une seule carte est dans l'ordre de tabulation — la choisie — sinon il
   * fallait vingt appuis sur Tab pour atteindre la couleur. Les flèches
   * suivent le sens de lecture : en arabe, la flèche gauche monte d'un cran.
   */
  const auClavier = (event: KeyboardEvent<HTMLDivElement>) => {
    const style = getComputedStyle(event.currentTarget)
    const rtl = style.direction === 'rtl'
    // En grille (grand écran), haut et bas changent de rangée : un pas vaut
    // alors le nombre de colonnes.
    const colonnes =
      style.display === 'grid' ? style.gridTemplateColumns.split(' ').filter(Boolean).length : 0
    const pas: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ...(colonnes > 0 ? { ArrowDown: colonnes, ArrowUp: -colonnes } : {}),
    }
    let suivant: number | null = null
    if (event.key in pas) suivant = level + (pas[event.key] ?? 0)
    else if (event.key === 'Home') suivant = 1
    else if (event.key === 'End') suivant = BOT_LEVELS.length
    if (suivant === null) return
    event.preventDefault()
    const borne = Math.max(1, Math.min(BOT_LEVELS.length, suivant))
    onChoisir(borne)
    cartes.current.get(borne)?.focus({ preventScroll: true })
  }

  const palier = palierPour(botLevel(level).elo)

  return (
    <>
      <Defilement
        ref={rangee}
        className="-mx-4 mt-3 sm:-mx-6"
        classeRangee="snap-x snap-mandatory scroll-px-4 gap-2 px-4 py-1 sm:scroll-px-6 sm:px-6"
        role="group"
        label={t('computer.ladderLabel', { n: BOT_LEVELS.length })}
      >
        {/* Le gestionnaire de clavier est posé sur un conteneur sans rôle :
            `Defilement` ne transmet pas d'évènement, et les cartes restent
            des boutons ordinaires, chacun avec `aria-pressed`. */}
        {/* Une rangée qui défile au doigt ; sur grand écran, la place ne
            manque pas et les vingt échelons se rangent les uns sous les
            autres, autant par ligne que la colonne en tient sans écraser les
            portraits. Les cartes y deviennent horizontales et portent le nom
            du personnage : vingt vignettes de trente pixels, alignées sans
            nom, ne se lisaient pas. On les voit toutes d'un coup, et
            `Defilement` n'affiche plus ses flèches puisque rien ne déborde. */}
        <div
          className="flex gap-2 lg:grid lg:w-full lg:grid-cols-4 lg:gap-1.5"
          onKeyDown={auClavier}
        >
          {BOT_LEVELS.map((echelon) => {
            const choisi = echelon.level === level
            const battu = battus.includes(echelon.level)
            const personnalite = BOT_PERSONALITIES[echelon.personality]
            /*
              Le fond dit à qui appartient la carte, et combien elle pèse dans
              sa bande. Chaque personnage tient des niveaux d'affilée ; sa
              teinte — celle de la matière de sa sculpture — colore ses cartes,
              plus soutenue à mesure qu'on monte dans la bande. Les groupes se
              lisent d'un coup d'œil, et la marche d'un échelon au suivant
              aussi.
            */
            const teinte = TEINTES_ADVERSAIRES[echelon.personality]
            const bande = niveauxDe(echelon.personality)
            const rang = bande.findIndex((niveau) => niveau.level === echelon.level)
            const force = 12 + Math.round((16 * rang) / Math.max(1, bande.length - 1))
            return (
              <button
                key={echelon.level}
                ref={(element) => {
                  if (element) cartes.current.set(echelon.level, element)
                  else cartes.current.delete(echelon.level)
                }}
                type="button"
                aria-pressed={choisi}
                tabIndex={choisi ? 0 : -1}
                aria-label={
                  t('computer.ladderCard', {
                    n: echelon.level,
                    nom: tCoeur(t, personnalite.name),
                    elo: echelon.elo,
                  }) + (battu ? `, ${t('computer.ladderBeaten')}` : '')
                }
                onClick={() => onChoisir(echelon.level)}
                className={clsx(
                  // La même carte partout : le niveau d'abord — c'est ce qu'on
                  // choisit —, puis le personnage et son Elo. Au doigt, elles
                  // défilent sur une rangée ; sur grand écran, quatre
                  // colonnes, la forme des boutons de cadence voisins.
                  'relative flex min-h-11 w-[8.75rem] shrink-0 snap-start items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-1.5 text-start transition-colors',
                  'lg:w-auto lg:snap-none',
                  choisi ? 'border-accent ring-1 ring-accent' : 'hover:brightness-[1.03]',
                )}
                style={{
                  background: `linear-gradient(135deg, color-mix(in oklab, ${teinte} ${force + 6}%, var(--surface)), color-mix(in oklab, ${teinte} ${Math.max(4, force - 6)}%, var(--surface)))`,
                  ...(choisi
                    ? {}
                    : { borderColor: `color-mix(in oklab, ${teinte} 38%, var(--border))` }),
                }}
              >
                <PortraitAdversaire personality={personnalite} size={30} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-bold leading-tight tabular-nums">
                    {t('computer.ladderLevel', { n: echelon.level })}
                  </span>
                  <span className="truncate text-[11px] leading-tight tabular-nums text-faint">
                    {t('computer.ladderNameElo', {
                      nom: tCoeur(t, personnalite.name),
                      elo: echelon.elo.toLocaleString(bcp47),
                    })}
                  </span>
                </span>
                {/* Déjà battu sans aide : une coche, dans la couleur du bon coup. */}
                {battu && (
                  <span
                    className="absolute -end-1 -top-1 grid h-[1.1rem] w-[1.1rem] place-items-center rounded-full bg-[var(--q-best)] text-white shadow-sm"
                    aria-hidden
                  >
                    <Check size={11} strokeWidth={3.2} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Defilement>

      {/* Un seul vocabulaire de niveau face au joueur, les six paliers : le
          numéro d'échelon reste un rang, le palier dit ce qu'on y travaille. */}
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {t('computer.ladderTier', { palier: t(palier.nom) })}{' '}
        <Link href="/apprendre/niveau" className="lien font-semibold">
          {t('computer.ladderTest')}
        </Link>
      </p>
    </>
  )
}
