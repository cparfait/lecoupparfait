'use client'

/**
 * Le programme en écoute — les leçons sans les mains.
 *
 * Tout le reste de l'application demande d'agir : on place une pièce, on trouve
 * un coup, on clique sur « continuer ». C'est le bon principe pour apprendre, et
 * il a un angle mort — les moments où l'on ne peut pas agir. Dans les
 * transports, en faisant la vaisselle, avant de dormir. Les trois cent vingt-huit
 * étapes du programme sont écrites pour être **entendues** (voir l'en-tête de
 * `lessons/types.ts`) : phrases courtes, pas de parenthèses, pas de symboles
 * imprononçables, notation convertie. Elles étaient écrites pour ça et on ne
 * pouvait pas les écouter.
 *
 * ── Ce que ce mode fait, et ce qu'il ne remplace pas ─────────────────────────
 *
 * Il déroule les étapes tout seul : le coach parle, l'échiquier suit, et l'étape
 * suivante arrive quand la phrase est finie. Rien à toucher. Les étapes qui
 * demandent normalement un coup sont jouées pour vous — leur première réponse
 * acceptée — ce qui veut dire qu'on écoute la solution au lieu de la chercher.
 *
 * C'est une **révision**, pas un apprentissage, et la page le dit. On y revient
 * sur ce qu'on a déjà fait, ou l'on prend l'avance sur ce qu'on fera vraiment
 * ensuite, l'échiquier sous les doigts.
 *
 * ── Détails qui font la différence entre écoutable et pénible ────────────────
 *
 *  - **L'écran reste allumé** pendant la lecture : un téléphone qui s'éteint au
 *    bout de trente secondes coupe la voix sur la plupart des navigateurs.
 *  - **La voix passe outre le réglage « voix du coach »**, comme le bouton
 *    « écouter » du glossaire : ce réglage fait taire ce qui parle tout seul, et
 *    ici on a explicitement demandé à écouter.
 *  - **La position est reprise** d'une visite à l'autre : on ne réécoute pas
 *    « voici un échiquier » à chaque fois.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Headphones, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { CHAPTERS, type Lesson } from '@/lib/lessons/index.ts'
import { positionAtStep } from '@/lib/lessons/playback.ts'
import { speak, stopSpeaking } from '@/lib/speech.ts'
import { useEcranAllume } from '@/lib/ecranAllume.ts'

const TEINTE = 'var(--rub-apprendre)'

/** Où l'on en était, conservé dans le navigateur. */
const CLE = 'coupparfait.ecoute'

/**
 * Silence entre deux étapes.
 *
 * Sans lui, la phrase suivante s'enchaîne sur la précédente et l'on perd le
 * découpage : trois étapes deviennent un seul paragraphe. Une seconde suffit à
 * faire entendre qu'on a changé d'idée, et à laisser l'échiquier bouger avant
 * qu'on parle de la nouvelle position.
 */
const SILENCE_MS = 1000

interface Piste {
  lesson: Lesson
  chapitre: string
  /** Index de l'étape dans la leçon. */
  etape: number
}

export default function EcoutePage() {
  /** Chapitre écouté, ou `null` pour tout le programme. */
  const [chapitreId, setChapitreId] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const [enLecture, setEnLecture] = useState(false)
  /** Vrai le temps du silence entre deux étapes. */
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * L'avance de secours, quand la synthèse ne rend jamais la main.
   *
   * Séparée du minuteur du silence : les deux courent en même temps, et
   * confondre les deux références laisserait l'un des deux en vie au démontage.
   */
  const secours = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Le téléphone posé sur la table ne doit pas éteindre l'écran au milieu d'une
  // leçon : sur la plupart des navigateurs, l'extinction coupe la synthèse.
  useEcranAllume(enLecture)

  /**
   * La liste des étapes à dérouler, mise à plat.
   *
   * Une piste par étape et non par leçon : c'est l'unité qu'on écoute, celle qui
   * porte une position et une phrase. Le titre de la leçon s'affiche à part.
   */
  const pistes = useMemo<Piste[]>(() => {
    const chapitres = chapitreId
      ? CHAPTERS.filter((chapitre) => chapitre.id === chapitreId)
      : CHAPTERS
    return chapitres.flatMap((chapitre) =>
      chapitre.lessons.flatMap((lesson) =>
        lesson.steps.map((_, etape) => ({ lesson, chapitre: chapitre.title, etape })),
      ),
    )
  }, [chapitreId])

  // Reprise de la dernière écoute. Lue après le montage : le stockage local
  // n'existe pas au rendu serveur.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE)
      if (!brut) return
      const enregistre = JSON.parse(brut) as { chapitre: string | null; position: number }
      setChapitreId(enregistre.chapitre ?? null)
      setPosition(Math.max(0, enregistre.position ?? 0))
    } catch {
      // Stockage illisible : on repart du début, ce qui est un défaut acceptable.
    }
  }, [])

  const piste = pistes[Math.min(position, pistes.length - 1)] ?? null
  const etape = piste?.lesson.steps[piste.etape] ?? null

  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify({ chapitre: chapitreId, position }))
    } catch {
      // Sans stockage, la reprise ne marche pas. L'écoute, si.
    }
  }, [chapitreId, position])

  /** Position de l'échiquier à cette étape, recalculée depuis le début. */
  const plateau = useMemo(() => (piste ? positionAtStep(piste.lesson, piste.etape) : null), [piste])

  const arreter = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current)
    if (secours.current) clearTimeout(secours.current)
    minuteur.current = null
    secours.current = null
    stopSpeaking()
    setEnLecture(false)
  }, [])

  const allerA = useCallback(
    (suivante: number) => {
      if (minuteur.current) clearTimeout(minuteur.current)
      if (secours.current) clearTimeout(secours.current)
      minuteur.current = null
      secours.current = null
      stopSpeaking()
      setPosition(Math.max(0, Math.min(pistes.length - 1, suivante)))
    },
    [pistes.length],
  )

  /*
    La lecture elle-même.

    Un effet sur (lecture, position) : à chaque étape on prononce la phrase, et
    le rappel de fin programme la suivante après un silence. C'est la synthèse
    qui donne le rythme, et non un minuteur calculé sur le nombre de mots — une
    voix neuronale et une voix système ne lisent pas à la même vitesse, et un
    minuteur fixe couperait l'une ou ferait attendre l'autre.

    `force: true` : la voix du coach peut être coupée dans les préférences, ce
    qui fait taire ce qui parle tout seul. Ici, on a appuyé sur « écouter ».
  */
  useEffect(() => {
    if (!enLecture || !etape) return

    let vivant = true
    let avance = false
    const passerALaSuite = (delai: number) => {
      if (!vivant || avance) return
      avance = true
      minuteur.current = setTimeout(() => {
        if (!vivant) return
        setPosition((courante) => {
          if (courante + 1 >= pistes.length) {
            setEnLecture(false)
            return courante
          }
          return courante + 1
        })
      }, delai)
    }

    // Le texte part tel quel : `speak` convertit déjà la notation citée dans une
    // phrase — « Mieux valait Cf3 » devient « cavalier f 3 » — et applique la
    // table des prononciations. Le refaire ici serait une seconde version de la
    // même règle, qui divergerait.
    speak(etape.say, { force: true, onEnd: () => passerALaSuite(SILENCE_MS) })

    /*
      Le filet de sécurité, et il n'est pas théorique.

      Tout le mode repose sur `onEnd` : la phrase finit, l'étape suivante
      arrive. Or ce rappel peut ne jamais venir — navigateur sans synthèse
      vocale, voix absente du système, onglet dont l'audio est bloqué, ou le
      défaut bien connu de Chrome qui abandonne un énoncé long au milieu. Dans
      tous ces cas, un mode « mains libres » se fige sur l'étape une, sans rien
      afficher, et l'on ne peut que cliquer — exactement ce qu'on venait
      éviter.

      On programme donc une avance de secours, calée large sur la longueur du
      texte : deux cent cinquante mots à la minute est un débit rapide, on
      compte le double du temps qu'il faudrait, plus quatre secondes de marge
      pour le calcul d'une voix neuronale. La première des deux qui se
      déclenche gagne, `avance` garantissant qu'on ne saute pas deux étapes.
    */
    const mots = etape.say.trim().split(/\s+/).length
    passerALaSuiteAuPireCas(mots)

    function passerALaSuiteAuPireCas(nombreDeMots: number) {
      secours.current = setTimeout(() => passerALaSuite(0), 4000 + nombreDeMots * 480 + SILENCE_MS)
    }

    return () => {
      vivant = false
      if (minuteur.current) clearTimeout(minuteur.current)
      if (secours.current) clearTimeout(secours.current)
      minuteur.current = null
      secours.current = null
      stopSpeaking()
    }
  }, [enLecture, position, etape, pistes.length])

  // Quitter la page ne doit pas laisser une voix qui continue dans le vide.
  useEffect(() => () => stopSpeaking(), [])

  const total = pistes.length
  const avancement = total > 0 ? Math.round(((position + 1) / total) * 100) : 0

  return (
    <div className="page">
      <TitreDePage
        retour={{ href: '/apprendre', label: 'Apprendre' }}
        intro="Le programme lu à voix haute, sans rien à toucher : le coach parle, l’échiquier suit, l’étape suivante arrive quand la phrase est finie. Pour réviser en faisant autre chose."
      >
        Écouter le programme
      </TitreDePage>

      {/* L'honnêteté d'abord : ce mode ne remplace pas les leçons, et le dire
          évite qu'on l'utilise à la place. */}
      <Card className="p-4">
        <p className="max-w-3xl text-[14px] leading-relaxed text-muted">
          Les étapes qui demandent normalement de jouer un coup sont jouées pour toi : tu écoutes la
          solution au lieu de la chercher. C’est donc une{' '}
          <strong className="text-ink">révision</strong>, pas un apprentissage — reviens sur{' '}
          <Link href="/apprendre" className="lien">
            les leçons guidées
          </Link>{' '}
          pour la première fois, et écoute-les ensuite.
        </p>
      </Card>

      {/* ── Ce qu'on écoute ─────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            arreter()
            setChapitreId(null)
            setPosition(0)
          }}
          className={clsx(
            'rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] font-semibold transition-colors',
            chapitreId === null
              ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
              : 'border-line bg-bg-elev hover:bg-surface-hover',
          )}
        >
          Tout le programme
        </button>
        {CHAPTERS.map((chapitre) => (
          <button
            key={chapitre.id}
            type="button"
            onClick={() => {
              arreter()
              setChapitreId(chapitre.id)
              setPosition(0)
            }}
            className={clsx(
              'rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] font-semibold transition-colors',
              chapitreId === chapitre.id
                ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                : 'border-line bg-bg-elev hover:bg-surface-hover',
            )}
          >
            <span aria-hidden className="mr-1.5">
              {chapitre.icon}
            </span>
            {chapitre.title}
          </button>
        ))}
      </div>

      {/* ── Le lecteur ──────────────────────────────────────────────────── */}
      {piste && etape && plateau && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <div>
            <ChessBoard
              fen={plateau.fen}
              orientation={etape.orientation ?? 'w'}
              playable={null}
              lastMove={plateau.lastMove}
              highlights={etape.highlight}
              spotlight={etape.spotlight}
              arrows={etape.arrows?.map((fleche) => ({
                from: fleche.from,
                to: fleche.to,
                color: fleche.color ?? 'green',
              }))}
              circles={etape.circles?.map((cercle) => ({
                square: cercle.square,
                color: cercle.color ?? 'green',
              }))}
            />
          </div>

          <div className="space-y-3">
            <Card className="overflow-hidden">
              <EnTeteDeCarte
                titre={piste.lesson.title}
                icone={<Headphones size={14} aria-hidden />}
                teinte={TEINTE}
                fin={`étape ${piste.etape + 1} / ${piste.lesson.steps.length}`}
              />
              <div className="p-4">
                <Chip>{piste.chapitre}</Chip>
                {/* La phrase en grand : c'est ce qu'on entend, et quelqu'un qui
                    regarde l'écran doit pouvoir suivre sans tendre l'oreille. */}
                <p className="mt-3 text-[16px] leading-relaxed">{etape.say}</p>
                {etape.instruction && (
                  <p className="mt-2 text-[13px] text-faint">
                    En leçon, c’est ici qu’on te demanderait&nbsp;: {etape.instruction}. Le coup est
                    joué pour toi.
                  </p>
                )}
              </div>
            </Card>

            {/* ── Commandes ───────────────────────────────────────────── */}
            <Card className="p-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<SkipBack size={16} />}
                  onClick={() => allerA(position - 1)}
                  disabled={position === 0}
                  aria-label="Étape précédente"
                />
                <Button
                  variant="primary"
                  size="lg"
                  icon={enLecture ? <Pause size={18} /> : <Play size={18} />}
                  onClick={() => (enLecture ? arreter() : setEnLecture(true))}
                >
                  {enLecture ? 'Pause' : 'Écouter'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<SkipForward size={16} />}
                  onClick={() => allerA(position + 1)}
                  disabled={position + 1 >= total}
                  aria-label="Étape suivante"
                />
              </div>

              {/* Sauter la leçon entière, et pas seulement l'étape : trois cent
                  vingt-huit étapes, c'est vingt-cinq clics pour passer une leçon
                  qu'on connaît. */}
              <div className="mt-2 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => allerA(position - piste.etape - 1)}
                  disabled={position - piste.etape - 1 < 0}
                  className="lien disabled:pointer-events-none disabled:opacity-40"
                >
                  Leçon précédente
                </button>
                <button
                  type="button"
                  onClick={() => allerA(position + (piste.lesson.steps.length - piste.etape))}
                  disabled={position + (piste.lesson.steps.length - piste.etape) >= total}
                  className="lien disabled:pointer-events-none disabled:opacity-40"
                >
                  Leçon suivante
                </button>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${avancement}%`, background: TEINTE }}
                />
              </div>
              <p className="mt-1.5 flex items-center justify-between text-[12px] text-faint">
                <span className="flex items-center gap-1.5">
                  {enLecture ? (
                    <Volume2 size={12} aria-hidden />
                  ) : (
                    <VolumeX size={12} aria-hidden />
                  )}
                  {enLecture ? 'en lecture' : 'en pause'}
                </span>
                <span className="tabular-nums">
                  {position + 1} / {total} étapes
                </span>
              </p>
            </Card>

            <Card className="p-3">
              <p className="text-[13px] leading-relaxed text-muted">
                Cette leçon t’intéresse ? Fais-la pour de vrai —{' '}
                <Link href={`/apprendre/${piste.lesson.id}`} className="lien">
                  {piste.lesson.title}
                </Link>
                . On retient ce qu’on a joué, pas ce qu’on a entendu.
              </p>
            </Card>
          </div>
        </div>
      )}

      <AutresDeLaSection section="apprendre" />
    </div>
  )
}
