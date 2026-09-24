'use client'

/**
 * Partie contre l'ordinateur.
 *
 * Deux écrans successifs : le choix de l'adversaire, puis la partie elle-même.
 * Le choix reste volontairement court — une échelle d'adversaires, une couleur, une
 * cadence — parce qu'un formulaire de douze champs est le meilleur moyen de
 * décourager quelqu'un qui voulait juste jouer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import { BOT_PERSONALITIES, maiaCouvre, botLevel, normalizeTimeControlId } from '@coupparfait/core'
import { seanceDeLUrl } from '@/lib/game/seance.ts'
import { lireNiveauEstime, niveauBotPour } from '@/lib/apprendre/palier.ts'
import { toast } from '@/components/ui/Toast.tsx'
import {
  chargerPartieEnCours,
  oublierPartieEnCours,
  type PartieEnCours,
} from '@/lib/game/partieEnCours.ts'
import { chapitreDeLUrl } from '@/lib/carriere/useCarriere.ts'
import {
  chapitre as chapitreCarriere,
  niveauEffectif,
  type BotPersonalityId,
  type Chapitre,
} from '@coupparfait/core'
import { playSound } from '@/lib/sound.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { GameScreen } from './GameScreen.tsx'
import { SetupScreen, type Setup } from './SetupScreen.tsx'

type Phase = 'setup' | 'playing'

export default function PlayComputerPage() {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('setup')

  /**
   * Passer à la partie ramène en haut de la page.
   *
   * Un changement de phase est une navigation : on remplace tout l'écran. Le
   * navigateur, lui, ne voit qu'un rendu de plus et garde la position de
   * défilement de l'écran précédent. Sur téléphone, où les colonnes s'empilent,
   * on cliquait « Reprendre » depuis un écran de réglages déroulé et l'on
   * arrivait au milieu de la liste des coups, l'échiquier hors champ au-dessus.
   *
   * `instant` et non `smooth` : ce n'est pas un déplacement dans la page, c'est
   * son point de départ. L'animer donnerait à voir un défilement que personne
   * n'a demandé.
   */
  useEffect(() => {
    if (phase === 'playing') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [phase])
  const [setup, setSetup] = useState<Setup>({
    level: 8,
    // Le hasard par défaut, et non les Blancs.
    //
    // Jouer toujours du même côté fait progresser de travers : on apprend les
    // ouvertures d'un camp, on ne voit jamais les positions de l'autre, et le
    // demi-avantage du trait finit par se confondre avec son propre niveau.
    // Choisir reste possible d'un clic — c'est le défaut qui change.
    color: 'random',
    timeControlId: '600+5',
    // Par défaut : un adversaire qui se trompe comme un humain. C'est ce
    // qu'on veut faire affronter à quelqu'un qui débute.
    human: true,
    // Non par défaut : on vient d'abord s'entraîner, et s'entraîner suppose de
    // pouvoir revenir en arrière.
    classee: false,
    seance: null,
  })
  const [resolvedColor, setResolvedColor] = useState<Color>('w')
  const [gameKey, setGameKey] = useState(0)

  /**
   * Partie laissée en plan, s'il y en a une.
   *
   * `undefined` tant qu'on n'a pas demandé, `null` quand il n'y a rien : sans
   * cette distinction, le bandeau de reprise apparaîtrait après coup chez tout
   * le monde, y compris ceux qui n'ont rien à reprendre.
   */
  const [reprise, setReprise] = useState<PartieEnCours | null | undefined>(undefined)
  const [coupsRepris, setCoupsRepris] = useState<string[] | undefined>(undefined)
  const [horlogeReprise, setHorlogeReprise] = useState<{ w: number; b: number } | null>(null)

  useEffect(() => {
    void chargerPartieEnCours().then(setReprise)
  }, [])

  /**
   * Arrivé par la carrière : on saute l'écran de réglages.
   *
   * Le chapitre a déjà tout choisi — l'adversaire, sa force, son style — et
   * c'est justement ce qui fait de lui un chapitre. Redemander « quel niveau ?
   * quelle couleur ? » à quelqu'un qui vient de cliquer « Affronter
   * l'adversaire » lui ferait défaire ce que le mode venait de décider pour
   * lui.
   *
   * `null` quand on n'y est pas, et c'est le cas ordinaire.
   */
  const [duel, setDuel] = useState<Chapitre | null>(null)
  const duelLance = useRef(false)
  /**
   * Arrivé par une séance pédagogique : même parti pris que la carrière.
   *
   * L'écran de préparation a déjà répondu aux deux seules questions qui
   * comptent — à quel palier, sur quel thème — et il en a déduit le niveau de
   * l'adversaire. Repasser par le curseur des niveaux annulerait exactement ce
   * que la séance venait d'épargner.
   *
   * `commente` voyage à part plutôt que d'écrire dans les préférences : allumer
   * le mode commenté pour une séance ne doit pas changer le réglage de
   * quelqu'un pour toutes ses parties suivantes. Voir son traitement dans
   * `GameScreen`.
   */
  const [seanceCommentee, setSeanceCommentee] = useState(false)
  const seanceLancee = useRef(false)
  /**
   * Cette partie appartient-elle à un tournoi contre l'ordinateur ?
   *
   * Même principe que le duel de carrière : le tournoi a déjà choisi
   * l'adversaire, sa force, la couleur et la cadence — les redemander
   * reviendrait à défaire ce qu'il vient de décider. La différence est qu'ici
   * on ne rend pas un « fait » au serveur mais un résultat au tableau, qui vit
   * dans le navigateur.
   */
  const [tournoi, setTournoi] = useState(false)
  const [styleImpose, setStyleImpose] = useState<BotPersonalityId | null>(null)
  /**
   * L'adversaire demandé depuis sa fiche.
   *
   * `?perso=` n'était lu que dans l'effet du tournoi, derrière son
   * `if (tournoi !== '1') return` : arriver ici par « Jouer contre Mirage »
   * ignorait donc le paramètre en silence, et l'on tombait sur la personnalité
   * du niveau conseillé — Pion, la plupart du temps. La promesse du bouton
   * n'était pas tenue, et rien ne disait pourquoi.
   *
   * Il ne force pas un style par-dessus un niveau : il **choisit le niveau**
   * qui porte cette personnalité, au plus près de celui qu'on jouerait sinon.
   * C'est la seule façon d'être cohérent — le portrait, l'Elo annoncé et le
   * style viennent tous du niveau, et les faire diverger produirait un Pion de
   * 2 250 Elo qui joue comme Mirage.
   */
  const [persoDemande, setPersoDemande] = useState<BotPersonalityId | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tournoi') === '1') return
    const perso = params.get('perso')
    if (perso && perso in BOT_PERSONALITIES) setPersoDemande(perso as BotPersonalityId)
  }, [])
  const tournoiLance = useRef(false)
  useEffect(() => {
    if (tournoiLance.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tournoi') !== '1') return
    const niveau = Number(params.get('niveau'))
    const couleur = params.get('couleur') === 'b' ? 'b' : 'w'
    if (!Number.isInteger(niveau) || niveau < 1) return

    tournoiLance.current = true
    setTournoi(true)
    const perso = params.get('perso')
    if (perso && perso in BOT_PERSONALITIES) setStyleImpose(perso as BotPersonalityId)
    setSetup({
      level: niveau,
      color: couleur,
      // Même piège que pour la partie en direct : `+` se décode en espace.
      timeControlId: normalizeTimeControlId(params.get('tc') ?? '600+5'),
      // Stockfish et non Maia : le tournoi annonce une force en Elo, et c'est
      // le barème des niveaux qui la garantit.
      human: false,
      // Un tournoi tient son propre tableau : il n'alimente pas le classement.
      classee: false,
      seance: null,
    })
    setResolvedColor(couleur)
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])
  useEffect(() => {
    if (duelLance.current) return
    const numero = chapitreDeLUrl(window.location.search)
    if (numero === null) return
    const chapitre = chapitreCarriere(numero)
    if (!chapitre) return

    duelLance.current = true
    setDuel(chapitre)
    // La force effective tient compte du coup de main : trois défaites
    // d'affilée allègent l'adversaire, et c'est l'écran de carrière qui
    // l'annonce. On relit la progression pour appliquer la même règle.
    void fetch('/api/carriere', { cache: 'no-store' })
      .then((reponse) => reponse.json())
      .then((data: { progression: { losingStreak: number; helpUsed: number } | null }) => {
        const niveau = data.progression
          ? niveauEffectif(chapitre, {
              ...data.progression,
              chapter: chapitre.numero,
              lessonDone: true,
              puzzlesDone: 0,
              winsInChapter: 0,
              stars: {},
              xp: 0,
              badges: [],
            })
          : chapitre.niveau
        demarrerDuel(niveau)
      })
      .catch(() => demarrerDuel(chapitre.niveau))

    function demarrerDuel(niveau: number) {
      setSetup({
        level: niveau,
        color: 'random',
        timeControlId: '600+5',
        human: false,
        classee: false,
        seance: null,
      })
      setResolvedColor(Math.random() < 0.5 ? 'w' : 'b')
      setCoupsRepris(undefined)
      setHorlogeReprise(null)
      oublierPartieEnCours()
      setGameKey((key) => key + 1)
      setPhase('playing')
      playSound('start')
    }
  }, [])

  useEffect(() => {
    if (seanceLancee.current) return
    const demandee = seanceDeLUrl(window.location.search)
    if (!demandee) return

    seanceLancee.current = true
    setSeanceCommentee(new URLSearchParams(window.location.search).get('commente') === '1')

    setSetup({
      // Même règle que l'écran de préparation, qui a annoncé cet adversaire :
      // `suggestedLevel`, appliqué au niveau estimé s'il tombe dans le palier.
      level: niveauBotPour(demandee.palier, lireNiveauEstime()?.elo),
      color: 'random',
      timeControlId: '600+5',
      // Stockfish et non Maia : la séance annonce une force en Elo, et c'est le
      // barème des niveaux qui la garantit.
      human: false,
      // Jamais classée, et pour la même raison que le duel de carrière : on y
      // joue avec le mode commenté allumé, c'est-à-dire avec le moteur qui
      // montre le meilleur coup. Porter cela au classement n'aurait aucun sens.
      classee: false,
      seance: demandee,
    })
    setResolvedColor(Math.random() < 0.5 ? 'w' : 'b')
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  /**
   * Position composée dans l'éditeur, transmise par l'adresse.
   *
   * L'éditeur proposait « La jouer contre l'ordinateur » et pointait ici avec
   * `?fen=…`. Le paramètre n'était lu nulle part : on composait sa position, on
   * cliquait, et l'on tombait sur une partie qui commençait au coup un. Sans un
   * mot — le pire des cas, puisqu'on ne sait pas si l'on a mal fait ou si c'est
   * cassé.
   *
   * Comme la carrière et le tournoi, on saute l'écran de réglages : quelqu'un
   * qui vient de poser vingt pièces à la main a déjà répondu à la seule
   * question qui compte. La couleur, elle, n'est plus un choix — c'est le trait
   * de la position qui la donne.
   *
   * **Jamais classée** : une position fabriquée n'est pas une partie, et rien
   * n'empêcherait d'y composer une dame de plus.
   */
  const [fenImposee, setFenImposee] = useState<string | null>(null)
  const fenLancee = useRef(false)
  useEffect(() => {
    if (fenLancee.current) return
    const brut = new URLSearchParams(window.location.search).get('fen')
    if (!brut) return

    // Le paramètre n'est lu qu'une fois, quoi qu'il en sorte. Marqué après le
    // refus comme après l'acceptation : en développement, React monte deux fois,
    // et une garde posée seulement sur la réussite affichait le message d'erreur
    // en double.
    fenLancee.current = true

    // Une position illisible est ignorée plutôt qu'affichée : un plateau vide
    // sur lequel rien ne répond serait plus déroutant qu'un départ ordinaire.
    let position: string
    try {
      position = new Chess(brut).fen()
    } catch {
      toast.error(t('computer.badFen'), t('computer.badFenHint'))
      return
    }

    setFenImposee(position)
    setSetup((actuel) => ({
      ...actuel,
      color: position.split(' ')[1] === 'b' ? 'b' : 'w',
      classee: false,
    }))
    setResolvedColor(position.split(' ')[1] === 'b' ? 'b' : 'w')
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
    // `t` : le message de position illisible, au début du même effet.
  }, [t])

  /**
   * Le niveau a-t-il déjà été arbitré par le joueur ?
   *
   * Tant que non, l'écran de réglages le pose sur le dernier niveau battu :
   * c'est la seule valeur de départ qui veuille dire quelque chose, et elle
   * évite de faire redescendre l'échelle à chaque visite. Dès qu'une partie a
   * été lancée ou reprise, le niveau retenu est un choix : on le garde tel
   * quel, et la suggestion ne repasse plus derrière.
   */
  const niveauArbitre = useRef(false)

  const start = useCallback((next: Setup) => {
    niveauArbitre.current = true
    setSetup(next)
    // La séance lancée depuis l'écran de réglages suit la préférence du mode
    // commenté ; seul le lien d'une séance porte son propre `commente=1`.
    setSeanceCommentee(false)
    setResolvedColor(next.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : next.color)
    // Commencer une partie remplace celle qu'on gardait : on ne conserve que la
    // dernière, et la nouvelle l'écrasera de toute façon au premier coup.
    setCoupsRepris(undefined)
    setHorlogeReprise(null)
    oublierPartieEnCours()
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  const reprendre = useCallback((partie: PartieEnCours) => {
    niveauArbitre.current = true
    setSetup({
      level: partie.level,
      color: partie.playerColor,
      timeControlId: partie.timeControlId,
      // Une partie enregistrée avant que la plage de Maia ne soit respectée
      // pouvait demander un niveau qu'elle ne sait pas jouer : elle reprend
      // alors avec Stockfish, à la force annoncée.
      human: partie.human && maiaCouvre(botLevel(partie.level).elo),
      // Une partie reprise n'est pas classée : rien ne dit ce qui s'est passé
      // pendant la séance précédente, ni quelles aides on y a utilisées.
      classee: false,
      seance: null,
    })
    setResolvedColor(partie.playerColor)
    setCoupsRepris(partie.moves)
    setHorlogeReprise(partie.clock)
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  if (phase === 'setup') {
    return (
      <SetupScreen
        initial={setup}
        onStart={start}
        reprise={reprise ?? null}
        onReprendre={reprendre}
        suggererNiveau={!niveauArbitre.current}
        personnaliteVoulue={persoDemande}
      />
    )
  }

  return (
    <GameScreen
      key={gameKey}
      duel={duel}
      seance={setup.seance}
      seanceCommentee={seanceCommentee}
      startFen={fenImposee}
      tournoi={tournoi}
      styleImpose={styleImpose}
      level={setup.level}
      playerColor={resolvedColor}
      timeControlId={setup.timeControlId}
      human={setup.human}
      classee={setup.classee}
      initialMoves={coupsRepris}
      initialClock={horlogeReprise}
      onNewGame={() => setPhase('setup')}
      onRematch={() => {
        setResolvedColor(
          setup.color === 'random'
            ? Math.random() < 0.5
              ? 'w'
              : 'b'
            : resolvedColor === 'w'
              ? 'b'
              : 'w',
        )
        setCoupsRepris(undefined)
        setHorlogeReprise(null)
        setGameKey((key) => key + 1)
      }}
    />
  )
}
