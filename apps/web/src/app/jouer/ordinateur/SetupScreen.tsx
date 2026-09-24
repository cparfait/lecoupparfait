'use client'

/**
 * L'écran de réglages de la partie contre l'ordinateur : l'adversaire, les
 * conditions, les aides. Voir la page pour le parcours complet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Circle, Play, Shuffle, Trophy } from 'lucide-react'
import clsx from 'clsx'
import type { Color } from 'chess.js'
import {
  BOT_LEVELS,
  BOT_PERSONALITIES,
  MAIA_MAX_ELO,
  MAIA_MIN_ELO,
  maiaCouvre,
  TIME_CONTROLS,
  botLevel,
  niveauProche,
  type BotPersonalityId,
} from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { TEINTES_ADVERSAIRES } from '@/lib/adversaires.ts'
import { CarteAdversaire } from '@/components/brand/CarteAdversaire.tsx'
import { Defilement } from '@/components/ui/Defilement.tsx'
import {
  Button,
  Card,
  Chip,
  SegmentedControl,
  SectionTitle,
  TitreDePage,
  Toggle,
} from '@/components/ui/index.tsx'
import { getEngine } from '@/lib/engine/client.ts'
import { depuis, oublierPartieEnCours, type PartieEnCours } from '@/lib/game/partieEnCours.ts'
import { avecElements, langue, useI18n, useT, type TranslationKey } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { useFetchJson } from '@/lib/useFetchJson.ts'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import type { Progression } from './progression.ts'

export interface Setup {
  level: number
  color: Color | 'random'
  timeControlId: string
  /** Affronter Maia — un réseau humain — plutôt que Stockfish bridé. */
  human: boolean
  /**
   * Partie classée : le résultat met à jour le classement de la cadence.
   *
   * Elle se demande **avant** de commencer, et elle a un prix : ni annulation,
   * ni indice, ni mode commenté. Ces trois aides sont ce qui rend une partie
   * contre l'ordinateur ininterprétable — on ne peut pas mesurer quelqu'un qui
   * reprend ses coups et à qui l'on montre le meilleur. On les retire donc au
   * lieu d'essayer de les comptabiliser après coup.
   */
  classee: boolean
}

/**
 * L'échelle de force — et pourquoi elle ne peut pas être celle des portraits.
 *
 * La piste du curseur peignait chaque segment avec la teinte de la
 * personnalité qui tient ce niveau. Or une personnalité revient à plusieurs
 * échelons, et jamais dans l'ordre : Pion ivoire, Brasier orange, Rempart
 * ardoise, Éclair glace, Boussole laiton… La piste affichait donc une suite
 * de couleurs sans rapport avec ce qu'elle mesure, et l'œil y cherchait en
 * vain une progression. Une couleur qui varie sans rien dire est pire qu'une
 * couleur unie : elle promet une information qu'elle n'a pas.
 *
 * Les deux rôles se séparent. La teinte de personnalité reste là où elle dit
 * *qui* — la vignette, le portrait, le pouce du curseur, la carte de
 * l'adversaire choisi. La piste, elle, dit *combien*, et elle le dit par un
 * dégradé qui monte en température : ardoise froide au tout premier coup,
 * laiton au milieu de l'échelle, braise au sommet. Trois ancres et une
 * interpolation en oklab — donc un dégradé régulier à l'œil, sans la bande
 * terne que produit un mélange en sRVB.
 *
 * Les valeurs sont littérales, comme celles des portraits et pour la même
 * raison : elles ne changent pas avec le thème. Les deux extrêmes citent
 * d'ailleurs deux matières de la galerie — le laiton de Boussole, le feu de
 * Brasier —, ce qui raccorde l'échelle aux sculptures sans les copier.
 */
const ECHELLE_FORCE = ['#7f93b8', '#d9a441', '#ff6a3d'] as const

/**
 * La couleur d'un niveau sur l'échelle, de 0 (le plus faible) à 1.
 *
 * Deux segments plutôt qu'un seul mélange à trois : `color-mix` ne prend que
 * deux couleurs. On choisit la paire selon la moitié où l'on tombe, et l'on
 * y remet la position à l'échelle.
 */
function teinteDeForce(part: number): string {
  const [froid, tiede, chaud] = ECHELLE_FORCE
  const premiere = part <= 0.5
  const depart = premiere ? froid : tiede
  const arrivee = premiere ? tiede : chaud
  const avancement = (premiere ? part * 2 : (part - 0.5) * 2) * 100
  return `color-mix(in oklab, ${arrivee} ${avancement.toFixed(1)}%, ${depart})`
}

/**
 * Les huit cadences proposées, dans l'ordre de la grille, et la phrase qui
 * dit ce que chacune vaut. Les identifiants sont ceux de `TIME_CONTROLS`.
 */
const CADENCES: Array<{ id: string; aide: TranslationKey }> = [
  { id: '180+0', aide: 'computer.tcHelp3' },
  { id: '300+0', aide: 'computer.tcHelp5' },
  { id: '300+3', aide: 'computer.tcHelp5i3' },
  { id: '600+0', aide: 'computer.tcHelp10' },
  { id: '600+5', aide: 'computer.tcHelp10i5' },
  { id: '900+10', aide: 'computer.tcHelp15i10' },
  { id: '1800+0', aide: 'computer.tcHelp30' },
  { id: '0+0', aide: 'computer.tcHelpNone' },
]

/**
 * « 5 + 3 », « 10 min », « Sans limite ».
 *
 * Composé ici plutôt que lu dans `TIME_CONTROLS[].label` : le cœur écrit
 * « 5 | 3 » et « Sans limite » en dur, donc en français dans toutes les
 * langues. Une cadence que le tableau ne connaît pas s'affiche telle quelle.
 */
function libelleCadence(id: string, t: ReturnType<typeof useT>): string {
  const cadence = TIME_CONTROLS.find((entree) => entree.id === id)
  if (!cadence) return id
  if (cadence.initial <= 0) return t('computer.tcUnlimited')
  const minutes = Math.round(cadence.initial / 60)
  return cadence.increment > 0
    ? t('computer.tcIncrement', { m: minutes, s: cadence.increment })
    : t('computer.tcMinutes', { m: minutes })
}

export function SetupScreen({
  initial,
  onStart,
  reprise,
  onReprendre,
  suggererNiveau = false,
  personnaliteVoulue = null,
}: {
  initial: Setup
  onStart: (setup: Setup) => void
  /** Partie interrompue à reprendre, `null` s'il n'y en a pas. */
  reprise: PartieEnCours | null
  onReprendre: (partie: PartieEnCours) => void
  /**
   * Poser le curseur sur le dernier niveau battu dès que la progression arrive.
   *
   * Faux dès qu'une partie a été lancée dans la session : le niveau affiché est
   * alors celui qu'on vient de choisir, et le remplacer serait défaire un choix.
   */
  suggererNiveau?: boolean
  /**
   * L'adversaire demandé depuis sa fiche, s'il y en a un.
   *
   * Il contraint le niveau de départ — et lui seul : le curseur reste libre,
   * et le déplacer change d'adversaire comme d'habitude. Une barre qui
   * refuserait de sortir des paliers de Mirage serait une barre cassée.
   */
  personnaliteVoulue?: BotPersonalityId | null
}) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  /* La langue du **contenu** pour les sept adversaires : leurs noms et leurs
     phrases sont écrits dans le cœur, qui ne les produit qu'en français et en
     anglais. Voir `localeDuContenu`. */
  const [level, setLevel] = useState(() =>
    personnaliteVoulue ? niveauProche(personnaliteVoulue, initial.level) : initial.level,
  )
  const [color, setColor] = useState<Color | 'random'>(initial.color)
  const [timeControlId, setTimeControlId] = useState(initial.timeControlId)
  const [human, setHuman] = useState(initial.human)
  const [classee, setClassee] = useState(initial.classee)

  /**
   * A-t-on un compte ?
   *
   * Une partie classée met à jour un classement, et un classement se range
   * quelque part. `null` tant qu'on ne sait pas : on n'affiche pas une case
   * grisée à quelqu'un qui est peut-être connecté.
   */
  // `useIdentite` partage l'appel avec le reste de l'interface : l'en-tête, le
  // guetteur de défis et cet écran en faisaient trois, à chaque navigation.
  const identite = useIdentite()
  const connecte = identite === undefined ? null : identite !== null

  // Le mode commenté n'est pas un réglage de la partie mais une préférence
  // durable : on le lit et on l'écrit là où il vit, pour que le bouton de la
  // barre d'outils et cette case disent toujours la même chose.
  const commentaryMode = usePreferences((state) => state.commentaryMode)
  const commentaryOpponent = usePreferences((state) => state.commentaryOpponent)
  const setPreference = usePreferences((state) => state.set)

  /**
   * Le moteur se télécharge pendant qu'on choisit son adversaire.
   *
   * Sept mégaoctets de WebAssembly, chargés à la première demande — c'est-à-dire
   * au moment exact où l'ordinateur doit jouer son premier coup. Sur une
   * connexion moyenne, l'échiquier restait donc figé plusieurs secondes après
   * le coup d'ouverture, sans autre signe qu'un « Chargement du moteur… » en
   * petit sous le nom de l'adversaire.
   *
   * Cet écran-ci dure, lui : on y règle un niveau, une couleur, une cadence.
   * Autant s'en servir. Si le chargement échoue, on ne dit rien — la partie le
   * retentera d'elle-même, et c'est là que le message a un sens.
   */
  useEffect(() => {
    void getEngine()
      .start()
      .catch(() => undefined)
  }, [])

  /**
   * Maia est-elle installée sur ce serveur ?
   *
   * On ne propose pas un adversaire qu'on ne peut pas fournir : la case
   * n'apparaît que si le serveur a Lc0 et les poids.
   */
  // `useFetchJson` porte l'abandon au démontage : ces trois appels partaient
  // au montage et posaient leur état sans se demander si l'écran existait
  // encore. Voir `lib/useFetchJson.ts`.
  const sante = useFetchJson<{ maia?: boolean }>('/api/sante')
  const maiaReady = sante.data?.maia === true

  /** Où en est le joueur dans l'échelle. `null` tant qu'on ne sait pas. */
  const { data: progress } = useFetchJson<Progression>('/api/progression')

  /**
   * Le curseur part du dernier niveau battu.
   *
   * Il partait de six, c'est-à-dire d'un nombre choisi une fois pour tous : pour
   * qui a déjà battu le niveau onze, c'est cinq crans à remonter à la main avant
   * chaque partie ; pour qui n'a encore rien battu, c'est un adversaire six fois
   * trop fort. La progression est justement la seule chose que l'application
   * sache de la force du joueur — autant s'en servir comme point de départ.
   *
   * Le *dernier battu* et non le suivant : le curseur propose ce qu'on sait
   * faire, et le bouton juste au-dessus propose de monter d'un cran. Deux
   * choses différentes, laissées toutes deux à un clic.
   *
   * `toucheRef` protège la course : la progression arrive du réseau, et il ne
   * faut pas qu'elle vienne écraser un curseur déjà déplacé entre-temps.
   */
  const toucheRef = useRef(false)
  const choisirNiveau = useCallback((valeur: number) => {
    toucheRef.current = true
    setLevel(valeur)
  }, [])

  /**
   * L'adversaire demandé arrive après le premier rendu.
   *
   * Il est lu dans l'adresse, donc dans un effet du composant parent : au
   * moment où l'état initial du curseur est calculé, il vaut encore `null`.
   * L'initialisateur de `useState` ne se rejoue pas — d'où cet effet, qui pose
   * le niveau une fois et une seule, et jamais par-dessus un curseur déjà
   * déplacé à la main.
   */
  const persoApplique = useRef(false)
  useEffect(() => {
    if (!personnaliteVoulue || persoApplique.current || toucheRef.current) return
    persoApplique.current = true
    setLevel((actuel) => niveauProche(personnaliteVoulue, actuel))
  }, [personnaliteVoulue])
  useEffect(() => {
    if (!suggererNiveau || toucheRef.current) return
    if (!progress?.tracked || progress.defeated < 1) return
    const habituel = Math.min(BOT_LEVELS.length, progress.defeated)
    // Venu d'une fiche, on garde l'adversaire demandé et l'on approche
    // seulement la force habituelle : la progression ne doit pas défaire le
    // clic sur « Jouer contre Mirage ».
    setLevel(personnaliteVoulue ? niveauProche(personnaliteVoulue, habituel) : habituel)
  }, [progress, suggererNiveau, personnaliteVoulue])

  const bot = botLevel(level)
  const personality = BOT_PERSONALITIES[bot.personality]
  /** Position du curseur sur la barre, de 0 à 100. */
  const pourcentNiveau = ((level - 1) / (BOT_LEVELS.length - 1)) * 100

  /**
   * Maia peut-elle jouer *ce* niveau-là ?
   *
   * Ses réseaux s'arrêtent à 1100 en bas et à 1900 en haut. En dehors, le
   * serveur retombait sur le palier le plus proche sans rien dire : le curseur
   * de niveau ne changeait plus rien, et l'on se faisait battre par un joueur
   * de 1100 après avoir demandé un débutant complet. C'est Stockfish qui joue
   * dans ce cas — lui sait descendre — et l'écran l'annonce plutôt que de
   * laisser croire à un choix qui n'existe pas.
   */
  const maiaPossible = maiaReady && maiaCouvre(bot.elo)
  const niveauxMaia = BOT_LEVELS.filter((entree) => maiaCouvre(entree.elo))
  const premierNiveauMaia = niveauxMaia[0]?.level ?? 1
  const dernierNiveauMaia = niveauxMaia[niveauxMaia.length - 1]?.level ?? BOT_LEVELS.length
  /** L'adversaire réellement retenu, une fois Maia écartée si elle ne peut pas. */
  const humainRetenu = human && maiaPossible

  /**
   * Les sept personnalités, dans l'ordre où l'échelle les fait apparaître.
   *
   * C'est par elles qu'on choisit d'abord : « Pion », « Boussole », « Mirage »
   * disent un adversaire, là où « niveau 12 » ne dit qu'un rang. Elles ne
   * couvrent pas chacune une tranche : les niveaux les entremêlent — Pion aux
   * niveaux 1, 2, 3 et 6, Brasier aux 4, 7 et 14. Une fourchette d'Elo par
   * vignette mentait donc deux fois, en se chevauchant avec la voisine et en
   * laissant croire qu'on choisirait dans cette fourchette. Chaque vignette
   * annonce à la place le niveau qu'elle donnerait *maintenant* : le plus
   * proche du curseur, celui que le clic pose réellement.
   */
  const personnalites = useMemo(() => {
    const vues: BotPersonalityId[] = []
    for (const niveau of BOT_LEVELS) {
      if (!vues.includes(niveau.personality)) vues.push(niveau.personality)
    }
    return vues.map((id) => ({ id, personnalite: BOT_PERSONALITIES[id] }))
  }, [])

  /**
   * La vignette de l'adversaire en cours reste sous les yeux.
   *
   * La rangée défile : venu d'une fiche — « Jouer contre Mirage » — ou revenu
   * sur un niveau élevé, l'adversaire choisi était hors champ, et la rangée
   * montrait Pion et Brasier avec l'air de n'avoir rien sélectionné. On fait
   * défiler la rangée seule, jamais la page : centrer par `scrollIntoView`
   * aurait aussi déplacé le document.
   */
  const rangeePersonnalites = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rangee = rangeePersonnalites.current
    const actif = rangee?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!rangee || !actif) return
    // D'un coup, sans animation : un défilement animé lancé pendant que la
    // page finit de se construire est interrompu à mi-course par le premier
    // rendu suivant, et la vignette restait à moitié hors champ.
    rangee.scrollLeft = actif.offsetLeft - (rangee.clientWidth - actif.offsetWidth) / 2
  }, [bot.personality])

  const teinteCourante = TEINTES_ADVERSAIRES[bot.personality]

  /**
   * Le rail du curseur : un segment par niveau, sur l'échelle de force — de
   * l'ardoise froide à la braise. Ceux déjà parcourus gardent leur couleur ;
   * les autres s'éteignent à trente pour cent, assez pour lire la suite de
   * l'échelle, pas assez pour disputer l'attention au pouce.
   */
  const rail = BOT_LEVELS.map((niveau, index) => {
    const teinte = teinteDeForce(index / Math.max(1, BOT_LEVELS.length - 1))
    const couleur =
      niveau.level <= level ? teinte : `color-mix(in oklab, ${teinte} 30%, var(--surface-strong))`
    const debut = ((index / BOT_LEVELS.length) * 100).toFixed(2)
    const fin = (((index + 1) / BOT_LEVELS.length) * 100).toFixed(2)
    return `${couleur} ${debut}% ${fin}%`
  }).join(', ')

  const couleurChoisie =
    color === 'w'
      ? t('settings.white')
      : color === 'b'
        ? t('settings.black')
        : t('computer.randomColour')

  return (
    /* Une seule colonne, trois pas, et un résumé qui suit.

       L'écran a été deux cartes côte à côte, resserrées quand la fenêtre
       était basse, pour que le bouton « Commencer la partie » reste visible
       sans défiler. Il ne l'était toujours pas partout, et l'on empilait des
       cartes dans des cartes — l'adversaire dans le portrait, le curseur sous
       l'adversaire, les cadences sous la couleur — jusqu'à trois niveaux de
       liseré. On ne savait plus par où commencer.

       Trois pas numérotés se lisent de haut en bas : qui l'on affronte, dans
       quelles conditions, avec quelles aides. Le bouton, lui, ne se cherche
       plus : il est collé au bas de la fenêtre avec le résumé de ce qu'on a
       choisi, et il y reste quelle que soit la hauteur de l'écran. */
    <div className="mx-auto w-full max-w-[76rem] px-4 pb-4 pt-6 sm:px-6">
      {/* Le bandeau de la rubrique, comme sur la page « Jouer » : la couleur
          dit où l'on est, et le retour y est rangé. */}
      <TitreDePage
        retour={{ href: '/jouer', label: t('computer.back') }}
        intro={t('computer.intro', {
          n: BOT_LEVELS.length,
          p: Object.keys(BOT_PERSONALITIES).length,
        })}
      >
        {t('nav.vsComputer')}
      </TitreDePage>

      {/* ── Reprendre ──────────────────────────────────────────────────
          En tête, avant les réglages : quelqu'un qui a une partie en cours
          vient presque toujours pour elle. La lui faire chercher sous le
          formulaire reviendrait à lui demander de reconfigurer ce qu'il a
          déjà choisi. */}
      {reprise && (
        <Card glow className="mt-6 flex flex-wrap items-center gap-4 p-5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius)]"
            style={{ background: 'color-mix(in oklab, var(--accent) 15%, transparent)' }}
            aria-hidden
          >
            <PortraitAdversaire
              personality={BOT_PERSONALITIES[botLevel(reprise.level).personality]}
              size={40}
            />
          </span>
          {/* `min-w-[14rem]` et non `min-w-0` : une colonne autorisée à se
              réduire à zéro absorbe toute la compression au lieu de pousser
              ses voisins à la ligne, et la phrase se pliait à un mot par
              ligne sur téléphone. Le plancher rend le repli possible. */}
          <div className="min-w-[14rem] flex-1">
            <p className="font-display text-lg font-semibold">{t('computer.resume')}</p>
            <p className="mt-0.5 text-sm text-muted">
              {t('computer.resumeDetail', {
                moteur: reprise.human ? 'Maia' : 'Stockfish',
                niveau: reprise.level,
                couleur: reprise.playerColor === 'w' ? t('settings.white') : t('settings.black'),
                coups: reprise.moves.length,
                depuis: depuis(reprise.enregistreLe, bcp47, t),
              })}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="primary"
              icon={<Play size={16} />}
              onClick={() => onReprendre(reprise)}
            >
              {t('learn.resume')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                oublierPartieEnCours()
                // On ne recharge pas : la partie vient d'être effacée, et
                // masquer le bandeau sur-le-champ est la réponse attendue.
                location.reload()
              }}
            >
              {t('computer.forget')}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Deux colonnes sur grand écran ───────────────────────────────
          Trois pas empilés dans une colonne de sept cents pixels faisaient
          défiler un écran de 1 900 : l'adversaire à gauche, les conditions
          et les aides à droite, et tout se voit d'un coup — le bouton reste
          collé en bas. Sous `lg`, les pas s'empilent dans l'ordre. */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-7">
          {/* ── 1. L'adversaire ────────────────────────────────────────────── */}
          <Etape numero={1} titre={t('computer.step1')}>
            {/* Les personnalités défilent sur une rangée : sept vignettes, une
            par adversaire, et l'on voit d'un coup d'œil l'échelle entière.
            Choisir une vignette pose le curseur sur le niveau le plus proche
            de sa tranche — le curseur, en dessous, sert au réglage fin. */}
            <Defilement
              ref={rangeePersonnalites}
              className="-mx-4 sm:-mx-6"
              /* De l'air au-dessus et en dessous : les cartes se soulèvent et
             s'inclinent au survol, et la rangée, qui défile, couperait ce
             qui dépasse. */
              classeRangee="gap-3 px-4 py-3 sm:px-6"
              role="radiogroup"
              label={t('computer.opponentGroup')}
            >
              {personnalites.map((entree) => {
                const actif = entree.id === bot.personality
                /* Le niveau que le clic poserait, et son Elo : c'est ce que la
               vignette promet, et c'est ce qu'elle tient. */
                const cible = actif ? level : niveauProche(entree.id, level)
                return (
                  <CarteAdversaire
                    key={entree.id}
                    personnalite={entree.personnalite}
                    teinte={TEINTES_ADVERSAIRES[entree.id]}
                    actif={actif}
                    elo={botLevel(cible).elo}
                    niveau={cible}
                    onClick={() => choisirNiveau(cible)}
                  />
                )
              })}
            </Defilement>

            {/* L'adversaire retenu, en une ligne : le portrait en grand, le nom,
            l'Elo, et sa phrase. C'est ce que le curseur fait changer, et
            c'est juste au-dessus de lui. */}
            <div className="mt-4 flex items-center gap-4">
              {/* Le portrait retenu, sous le même projecteur que sa carte. */}
              <span
                className="relative grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border"
                style={{
                  background: `radial-gradient(70% 55% at 50% 20%, color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 55%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 26%, var(--surface)), color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 6%, var(--bg-elev)) 70%)`,
                  borderColor: `color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 50%, var(--border))`,
                  boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.18), 0 12px 28px -14px color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 70%, black)`,
                }}
                aria-hidden
              >
                <span
                  style={{
                    filter: `drop-shadow(0 10px 12px color-mix(in oklab, ${TEINTES_ADVERSAIRES[bot.personality]} 65%, transparent))`,
                  }}
                >
                  <PortraitAdversaire personality={personality} size={60} />
                </span>
              </span>
              {/* Tout ce bloc change avec le curseur, et le curseur est juste en
              dessous : sa hauteur ne doit pas dépendre de l'adversaire, sinon
              la page saute d'un cran à l'autre et le pouce perd sa cible.
              Deux précautions donc. Le nom et les puces ne partagent une
              ligne qu'à partir de `sm` — sur téléphone, « Boussole · 1550 Elo
              · Niveau 10 » débordait et passait sur deux lignes, « Pion · 250
              · Niveau 2 » non. Et la phrase réserve ses lignes en unités de
              ligne : trois sur téléphone, deux au-delà, ce que demande la
              plus longue des sept. */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
                  <h3 className="font-display text-xl font-semibold leading-tight">
                    {tCoeur(t, personality.name)}
                  </h3>
                  <span className="flex flex-wrap gap-2">
                    <Chip tone="accent">≈ {bot.elo} Elo</Chip>
                    <Chip>{t('computer.levelChip', { n: bot.level })}</Chip>
                  </span>
                </div>
                <p className="mt-1 min-h-[3lh] text-sm leading-relaxed text-muted sm:min-h-[2lh]">
                  {tCoeur(t, personality.blurb)}
                </p>
              </div>
            </div>

            {/* ── Le curseur, et le repère qui suit le pouce ──────────────────
            Un cran par niveau de `BOT_LEVELS`, plus haut tous les cinq. Le
            repère se cale sur la position du pouce : un pouce mesure 22 px,
            son centre ne parcourt pas toute la largeur mais celle-ci moins
            sa propre taille, d'où la correction de onze pixels sur chaque
            bord. Le même décalage borne la graduation en dessous. */}
            <div className="mt-4">
              <label htmlFor="level" className="block text-sm font-medium">
                {t('bits.fineLevel')}
              </label>
              {/* Le repère prend la teinte de l'adversaire, éclaircie pour que
              l'encre reste lisible sur toutes les matières. */}
              <div className="relative mt-1 h-5">
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#101018] transition-[left,background-color] duration-150"
                  style={{
                    left: `calc(${pourcentNiveau}% + ${14 - pourcentNiveau * 0.28}px)`,
                    background: `color-mix(in oklab, ${teinteCourante} 80%, white)`,
                    boxShadow: `0 0 14px -2px ${teinteCourante}`,
                  }}
                  aria-hidden
                >
                  {bot.level} · {tCoeur(t, personality.name)}
                </span>
              </div>
              {/* ── Le rail, peint adversaire par adversaire ───────────────────
              Un segment par niveau dans la teinte de la sculpture qui le joue :
              on voit d'un coup d'œil où Pion cède la place à Brasier, et où
              Oracle commence. La portion parcourue garde ses couleurs
              franches ; le reste s'éteint, sans disparaître. Le pouce porte le
              portrait de l'adversaire courant — voir `.curseur-adversaires`. */}
              <input
                id="level"
                type="range"
                min={1}
                max={BOT_LEVELS.length}
                step={1}
                value={level}
                onChange={(event) => choisirNiveau(Number(event.target.value))}
                /* La barre reste fine, la zone touchable ne l'est plus : le champ
               fait trente-deux points de haut et le rail est repeint au
               centre, sur huit. */
                className="curseur-adversaires h-8 w-full cursor-pointer appearance-none bg-transparent"
                style={
                  {
                    '--pouce-image': `url('${personality.portrait}')`,
                    '--pouce-teinte': teinteCourante,
                    backgroundImage: `linear-gradient(180deg, rgb(255 255 255 / 0.18), transparent 55%), linear-gradient(to right, ${rail})`,
                    backgroundSize: '100% 8px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    borderRadius: '9999px',
                  } as React.CSSProperties
                }
              />
              <div className="mx-[14px] flex items-end justify-between" aria-hidden>
                {BOT_LEVELS.map((niveau, index) => {
                  const jalon = niveau.level === 1 || niveau.level % 5 === 0
                  // Même échelle que la piste, sinon les crans la
                  // contrediraient un pixel plus bas.
                  const teinte = teinteDeForce(index / Math.max(1, BOT_LEVELS.length - 1))
                  return (
                    <span
                      key={niveau.level}
                      className={clsx('w-px rounded-full', jalon ? 'h-2' : 'h-1')}
                      style={{
                        background:
                          niveau.level <= level
                            ? teinte
                            : `color-mix(in oklab, ${teinte} 35%, var(--border-strong))`,
                      }}
                    />
                  )
                })}
              </div>
              {/* Les nombres sont posés à leur position réelle, et non répartis :
              quatre crans séparent 1 de 5, cinq les suivants. */}
              <div className="relative mx-[14px] mt-0.5 h-3.5" aria-hidden>
                {/* Bornés à l'échelle : « 20 » et « 25 » débordaient de la piste
                depuis que les niveaux sont moins de vingt. */}
                {[1, 5, 10, 15, 20, 25]
                  .filter((jalon) => jalon <= BOT_LEVELS.length)
                  .map((jalon) => (
                    <span
                      key={jalon}
                      className="absolute -translate-x-1/2 text-[12px] tabular-nums text-faint"
                      style={{ left: `${((jalon - 1) / (BOT_LEVELS.length - 1)) * 100}%` }}
                    >
                      {jalon}
                    </span>
                  ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[12px] text-faint">
                {/* Les bornes se lisent dans la table, elles ne s'y recopient pas :
                elles annonçaient « 1 · débutant complet (100) » et « 25 ·
                surhumain (3200) » alors que l'échelle était passée à dix-huit
                échelons partant de 100. */}
                <span>
                  {t('computer.scaleLow', {
                    n: BOT_LEVELS[0]?.level ?? 1,
                    elo: BOT_LEVELS[0]?.elo ?? 0,
                  })}
                </span>
                <span>
                  {t('computer.scaleHigh', {
                    n: BOT_LEVELS.at(-1)?.level ?? BOT_LEVELS.length,
                    elo: BOT_LEVELS.at(-1)?.elo ?? 0,
                  })}
                </span>
              </div>

              {/* Cinq raccourcis nommés d'après le joueur. « Je débute » vaut 1 :
              un préréglage nommé d'après le joueur doit désigner le bout de
              l'échelle qui lui correspond, pas deux crans au-dessus.

              Les rangs datent de l'échelle à dix-huit échelons — 100, 980,
              1650, 2250 et 3200 Elo. Ils avaient gardé ceux de l'échelle à
              vingt-cinq, et « Fort » comme « Sans pitié » désignaient des
              rangs qui n'existaient plus. */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { label: t('computer.presetBeginner'), level: 1 },
                  { label: t('computer.presetCasual'), level: 6 },
                  { label: t('computer.presetClub'), level: 10 },
                  { label: t('computer.presetStrong'), level: 13 },
                  { label: t('computer.presetRuthless'), level: BOT_LEVELS.length },
                ].map((preset) => {
                  /* Chaque raccourci porte la teinte de l'adversaire qu'il
                 désigne : le chip « Fort » a la couleur de la personnalité
                 qui attend à ce rang. */
                  const teinte = TEINTES_ADVERSAIRES[botLevel(preset.level).personality]
                  const choisi = level === preset.level
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => choisirNiveau(preset.level)}
                      className={clsx(
                        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-[background-color,box-shadow,color]',
                        choisi ? 'text-ink' : 'text-muted hover:text-ink',
                      )}
                      style={{
                        background: `color-mix(in oklab, ${teinte} ${choisi ? 30 : 10}%, var(--surface))`,
                        borderColor: choisi
                          ? 'var(--accent)'
                          : `color-mix(in oklab, ${teinte} 40%, var(--border))`,
                        boxShadow: choisi ? `0 0 16px -4px ${teinte}` : undefined,
                      }}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {progress && progress.tracked && (
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
                <Trophy size={15} className="shrink-0 text-accent" aria-hidden />
                {progress.defeated === 0 ? (
                  <span>{t('computer.noneBeaten')}</span>
                ) : (
                  <span>
                    {t('computer.bestBeaten')}{' '}
                    <strong className="font-semibold text-ink">{progress.defeated}</strong> (
                    {botLevel(progress.defeated).elo} Elo) ·{' '}
                    {t(progress.wins > 1 ? 'computer.winsOf' : 'computer.oneWinOf', {
                      victoires: progress.wins,
                      parties: progress.attempts,
                    })}
                  </span>
                )}
                {progress.defeated < BOT_LEVELS.length && (
                  <button
                    type="button"
                    onClick={() =>
                      choisirNiveau(Math.min(BOT_LEVELS.length, progress.defeated + 1))
                    }
                    className="font-semibold text-accent hover:underline"
                  >
                    {t('computer.nextToBeat', {
                      niveau: Math.min(BOT_LEVELS.length, progress.defeated + 1),
                    })}
                  </button>
                )}
              </p>
            )}

            {/* ── Le style de jeu, en second ──────────────────────────────────
            Maia et Stockfish étaient deux cartes qui se disputaient la place
            au-dessus du curseur, et Maia, grisée hors de sa tranche, avait
            l'air en panne. Ce n'est pas un second adversaire, c'est une façon
            de jouer le niveau qu'on vient de choisir : une ligne, deux
            options, et l'explication quand l'une ne s'applique pas. N'existe
            que si le serveur a Maia. */}
            {maiaReady && (
              <div className="mt-5 border-t border-line/60 pt-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-sm font-medium">{t('computer.playStyle')}</span>
                  <SegmentedControl
                    size="sm"
                    value={humainRetenu ? 'humain' : 'moteur'}
                    onChange={(valeur) => setHuman(valeur === 'humain')}
                    label={t('computer.playStyle')}
                    options={[
                      {
                        value: 'humain' as const,
                        label: t('computer.styleHuman'),
                        title: t('computer.styleHumanHint'),
                      },
                      {
                        value: 'moteur' as const,
                        label: t('computer.styleEngine'),
                        title: t('computer.styleEngineHint'),
                      },
                    ]}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {maiaPossible
                    ? humainRetenu
                      ? t('computer.styleHumanNote')
                      : t('computer.styleEngineNote')
                    : t('computer.styleOutOfRange', {
                        min: MAIA_MIN_ELO,
                        max: MAIA_MAX_ELO,
                        niveau: bot.level,
                        premier: premierNiveauMaia,
                        dernier: dernierNiveauMaia,
                      })}
                </p>
              </div>
            )}
          </Etape>
        </div>

        <div className="lg:col-span-5">
          {/* ── 2. Les conditions ──────────────────────────────────────────── */}
          <Etape numero={2} titre={t('computer.step2')}>
            <div className="flex flex-wrap gap-x-10 gap-y-5">
              <div>
                <SectionTitle>{t('computer.yourColour')}</SectionTitle>
                <SegmentedControl
                  value={color}
                  onChange={setColor}
                  label={t('computer.colour')}
                  /* Des icônes lucide et non plus « ♔ », « ♚ », « 🎲 » : ces
                     glyphes changent de dessin d'un système à l'autre, et le
                     dé en couleur criait au milieu d'un écran calme. Cercle
                     vide pour les Blancs, plein pour les Noirs. */
                  options={[
                    {
                      value: 'w' as const,
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          <Circle size={15} aria-hidden />
                          {t('friendGame.colourWhite')}
                        </span>
                      ),
                    },
                    {
                      value: 'b' as const,
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          <Circle size={15} fill="currentColor" aria-hidden />
                          {t('friendGame.colourBlack')}
                        </span>
                      ),
                    },
                    {
                      value: 'random' as const,
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          <Shuffle size={15} aria-hidden />
                          {t('friendGame.colourRandom')}
                        </span>
                      ),
                    },
                  ]}
                />
                <p className="mt-2 text-xs text-faint">{t('computer.whiteStarts')}</p>
              </div>

              {/* `min-w-[19rem]` et non `min-w-0` : une colonne qui s'autorise à
              descendre à zéro ne passe jamais à la ligne, elle se laisse
              écraser. Sur un téléphone un peu large — 400 px et plus, ce qui
              fait la moitié des modèles récents — la couleur tenait sur la
              première ligne et laissait cinquante pixels à la cadence : les
              huit pastilles s'empilaient une par ligne, « 5 | 3 » se coupait
              en trois, le titre débordait de l'écran, et la colonne à
              rallonge repoussait la rubrique 3 hors de vue. Le plancher dit
              la vraie condition : à côté de la couleur seulement s'il reste
              de quoi poser trois pastilles, sinon en pleine largeur dessous. */}
              <div className="min-w-[19rem] flex-1">
                <SectionTitle>{t('friendGame.timeControl')}</SectionTitle>
                {/* Huit boutons texte en grille de quatre, sans l'émoji de
                    catégorie (⚡, 🐇, 🐢, ✉️) : il redisait la durée en image,
                    et quatre couleurs d'émoji sur une ligne faisaient plus de
                    bruit que tout le reste de l'écran. La phrase dessous dit
                    ce que vaut la cadence choisie. */}
                <div
                  role="radiogroup"
                  aria-label={t('friendGame.timeControl')}
                  className="grid grid-cols-4 gap-1.5"
                >
                  {CADENCES.map((cadenceProposee) => {
                    const choisie = timeControlId === cadenceProposee.id
                    return (
                      <button
                        key={cadenceProposee.id}
                        type="button"
                        role="radio"
                        aria-checked={choisie}
                        onClick={() => setTimeControlId(cadenceProposee.id)}
                        className={clsx(
                          'min-h-11 whitespace-nowrap rounded-[var(--radius-sm)] border px-1 text-[13px] font-semibold tabular-nums transition-colors',
                          choisie
                            ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                            : 'border-line bg-surface text-muted hover:bg-surface-hover hover:text-ink',
                        )}
                      >
                        {libelleCadence(cadenceProposee.id, t)}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  {t(
                    CADENCES.find((entree) => entree.id === timeControlId)?.aide ??
                      'computer.tcHelp10i5',
                  )}
                </p>
              </div>
            </div>
          </Etape>

          {/* ── 3. Les aides ───────────────────────────────────────────────── */}
          <Etape numero={3} titre={t('computer.step3')}>
            {/* La partie classée en tête, parce qu'elle commande les autres :
            cochée, elle retire le mode commenté, l'indice et l'annulation.
            Ce n'est pas une punition, c'est ce qui rend le résultat
            interprétable. Éteinte par défaut : on vient d'abord s'entraîner. */}
            <Toggle
              label={t('friendGame.ratedLabel')}
              description={
                connecte === false ? t('computer.ratedNeedsAccount') : t('computer.ratedHint')
              }
              checked={classee && connecte !== false}
              disabled={connecte === false}
              onChange={setClassee}
            />

            <div className="mt-3 border-t border-line/60 pt-3">
              <Toggle
                label={t('computer.commentaryEach')}
                description={classee ? t('computer.commentaryRated') : t('computer.commentaryHint')}
                checked={commentaryMode && !classee}
                disabled={classee}
                onChange={(valeur) => setPreference('commentaryMode', valeur)}
              />

              {/* Subordonné : il n'apparaît qu'une fois le mode commenté actif. */}
              {commentaryMode && !classee && (
                <div className="mt-3 border-t border-line/60 pt-3">
                  <Toggle
                    label={t('computer.commentaryOpponent')}
                    description={t('computer.commentaryOpponentHint')}
                    checked={commentaryOpponent}
                    onChange={(valeur) => setPreference('commentaryOpponent', valeur)}
                  />
                </div>
              )}
            </div>
          </Etape>
        </div>
      </div>

      {/* ── Le résumé, et le bouton ────────────────────────────────────────
          Collés au bas de la fenêtre : quelle que soit la hauteur de l'écran,
          le bouton est là, et le résumé dit ce qu'il va lancer sans avoir à
          remonter vérifier. Sous `sm`, le résumé se tait : le bouton prend
          la largeur, et c'est lui qu'on cherche du pouce. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line-strong bg-[var(--flottant)]/95 px-4 py-3 backdrop-blur-xl safe-bottom sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-4">
          <p className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">
            {avecElements(
              t('computer.summaryLine', {
                elo: bot.elo,
                couleur: couleurChoisie,
                cadence: libelleCadence(timeControlId, t),
                mode:
                  classee && connecte === true
                    ? t('computer.summaryRated')
                    : commentaryMode
                      ? t('computer.summaryCoach')
                      : t('computer.summaryPlain'),
              }),
              {
                adversaire: (
                  <strong className="font-semibold text-ink">{tCoeur(t, personality.name)}</strong>
                ),
              },
            )}
          </p>
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={17} />}
            className="w-full sm:w-auto"
            onClick={() =>
              onStart({
                level,
                color,
                timeControlId,
                human: humainRetenu,
                classee: classee && connecte === true,
              })
            }
          >
            {t('play.start')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Un pas du parcours : un numéro dans un disque, un titre, et le contenu.
 *
 * Pas de carte : c'est précisément ce qu'on retire. Un filet au-dessus
 * suffit à séparer les pas, et le numéro dit l'ordre dans lequel on lit.
 */
function Etape({
  numero,
  titre,
  children,
}: {
  numero: number
  titre: string
  children: ReactNode
}) {
  return (
    <section className="mt-7 border-t border-line/60 pt-6 first-of-type:mt-0 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/20 text-[13px] font-bold text-accent"
          aria-hidden
        >
          {numero}
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{titre}</h2>
      </div>
      {children}
    </section>
  )
}
