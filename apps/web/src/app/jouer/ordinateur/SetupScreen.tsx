'use client'

/**
 * L'écran de réglages de la partie contre l'ordinateur : l'adversaire, les
 * conditions, les aides. Voir la page pour le parcours complet.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  Button,
  Card,
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
import { palierPour } from '@/lib/apprendre/palier.ts'
import { themesPour, type Seance } from '@/lib/game/seance.ts'
import type { Progression } from './progression.ts'
import { AdversaireChoisi, EchelleDesAdversaires } from './EchelleDesAdversaires.tsx'

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
  /**
   * Séance à thème : un thème annoncé avant la partie et un bilan qui compte
   * où il est apparu. Jamais avec une partie classée. `null` sans séance.
   */
  seance: Seance | null
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
   * Poser l’échelle sur le dernier niveau battu dès que la progression arrive.
   *
   * Faux dès qu'une partie a été lancée dans la session : le niveau affiché est
   * alors celui qu'on vient de choisir, et le remplacer serait défaire un choix.
   */
  suggererNiveau?: boolean
  /**
   * L'adversaire demandé depuis sa fiche, s'il y en a un.
   *
   * Il contraint le niveau de départ — et lui seul : l'échelle reste libre,
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
  /** La séance à thème : allumée, et le thème retenu. Voir l'étape 3. */
  const [seanceActive, setSeanceActive] = useState(initial.seance !== null)
  const [themeId, setThemeId] = useState<string | null>(initial.seance?.theme.id ?? null)

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
   * L'échelle part du dernier niveau battu.
   *
   * Il partait de six, c'est-à-dire d'un nombre choisi une fois pour tous : pour
   * qui a déjà battu le niveau onze, c'est cinq crans à remonter à la main avant
   * chaque partie ; pour qui n'a encore rien battu, c'est un adversaire six fois
   * trop fort. La progression est justement la seule chose que l'application
   * sache de la force du joueur — autant s'en servir comme point de départ.
   *
   * Le *dernier battu* et non le suivant : l'échelle propose ce qu'on sait
   * faire, et le bouton juste au-dessus propose de monter d'un cran. Deux
   * choses différentes, laissées toutes deux à un clic.
   *
   * `toucheRef` protège la course : la progression arrive du réseau, et il ne
   * faut pas qu'elle vienne écraser un choix déjà fait entre-temps.
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
   * moment où l'état initial du niveau est calculé, il vaut encore `null`.
   * L'initialisateur de `useState` ne se rejoue pas — d'où cet effet, qui pose
   * le niveau une fois et une seule, et jamais par-dessus un niveau déjà
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
   * Les thèmes proposés sont ceux du palier de l'adversaire choisi, comme sur
   * la page de séance. Changer d'adversaire peut rendre le thème hors sujet :
   * on retombe alors sur le premier du palier plutôt que de lancer une séance
   * d'avant-postes contre un adversaire de 250 Elo.
   */
  const palierAdversaire = palierPour(bot.elo)
  const themes = themesPour(palierAdversaire.id)
  const themeRetenu = themes.find((theme) => theme.id === themeId) ?? themes[0] ?? null
  const seanceRetenue: Seance | null =
    seanceActive && !classee && themeRetenu
      ? { palier: palierAdversaire, theme: themeRetenu }
      : null

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
            {/* Un seul contrôle : l'adversaire choisi en grand, puis l'échelle
                de ses échelons qui défile. Voir `EchelleDesAdversaires`. */}
            <AdversaireChoisi level={level} />
            <EchelleDesAdversaires level={level} onChoisir={choisirNiveau} />

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
            {/* L'ordre de la maquette : ce qu'on allume pour apprendre, puis ce
            qu'on allume pour être mesuré. La partie classée commande les deux
            autres — cochée, elle retire le mode commenté, l'indice,
            l'annulation et la séance —, ce qui rend le résultat
            interprétable. Éteinte par défaut : on vient d'abord s'entraîner. */}
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

            {/* ── La séance à thème ─────────────────────────────────────────
            Elle vivait sur sa propre page, /jouer/pedagogique, qui choisissait
            l'adversaire à ta place d'après un palier. C'est pourtant la même
            partie, avec un thème annoncé et un bilan : on la propose ici, avec
            l'adversaire qu'on vient de choisir, et les thèmes sont ceux du
            palier de cet adversaire (`themesPour`). La page reste pour les
            liens qui y mènent. */}
            <div className="mt-3 border-t border-line/60 pt-3">
              <Toggle
                label={t('computer.sessionToggle')}
                description={classee ? t('computer.sessionRated') : t('computer.sessionHint')}
                checked={seanceActive && !classee}
                disabled={classee}
                onChange={setSeanceActive}
              />
              {seanceActive && !classee && themeRetenu && (
                <div className="mt-2">
                  <div
                    role="radiogroup"
                    aria-label={t('computer.sessionThemes', { palier: t(palierAdversaire.nom) })}
                    className="flex flex-wrap gap-1.5"
                  >
                    {themes.map((theme) => {
                      const choisi = theme.id === themeRetenu.id
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          role="radio"
                          aria-checked={choisi}
                          onClick={() => setThemeId(theme.id)}
                          className={clsx(
                            'min-h-11 rounded-[var(--radius-sm)] border px-3 text-[13px] font-medium transition-colors',
                            choisi
                              ? 'border-accent bg-accent/15 text-ink ring-1 ring-accent'
                              : 'border-line bg-surface text-muted hover:bg-surface-hover hover:text-ink',
                          )}
                        >
                          {t(theme.nom)}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const tire = themes[Math.floor(Math.random() * themes.length)]
                        if (tire) setThemeId(tire.id)
                      }}
                      className="lien inline-flex min-h-11 items-center gap-1.5 px-1"
                    >
                      <Shuffle size={13} aria-hidden />
                      {t('session.pickForMe')}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {t(themeRetenu.consigne)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-line/60 pt-3">
              <Toggle
                label={t('friendGame.ratedLabel')}
                description={
                  connecte === false
                    ? t('computer.ratedNeedsAccount')
                    : seanceActive
                      ? t('computer.ratedSession')
                      : t('computer.ratedHint')
                }
                checked={classee && connecte !== false && !seanceActive}
                disabled={connecte === false || seanceActive}
                onChange={setClassee}
              />
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
                mode: seanceRetenue
                  ? t('computer.summarySession', { theme: t(seanceRetenue.theme.nom) })
                  : classee && connecte === true
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
                classee: classee && connecte === true && !seanceRetenue,
                seance: seanceRetenue,
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
