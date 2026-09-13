'use client'

/**
 * « C'est quoi, l'ouverture hongroise ? »
 *
 * Les statistiques nomment sans définir : ouvertures, cadences, fins de
 * partie. Le nom seul suffit à celui qui le connaît déjà — c'est-à-dire à
 * celui qui n'a rien à apprendre de cet écran. Pour les autres, chaque libellé
 * s'ouvre ici, et l'on revient à sa page sans l'avoir quittée : un lien vers le
 * glossaire aurait fait perdre le tableau qu'on était en train de lire.
 *
 * Trois sources, une seule boîte :
 *  - **les cadences et les fins** ont leur texte écrit, dans `explications.ts`,
 *    qui puise lui-même dans le glossaire ;
 *  - **les ouvertures** n'en ont pas, et ne peuvent pas en avoir : il y en a
 *    3 810. On construit leur explication au moment du clic, à partir du livre
 *    d'ouvertures — le volume ECO dit la famille, la suite de coups dit le
 *    reste, et c'est bien plus parlant qu'une phrase.
 *
 * Le livre pèse 650 Ko : il n'est chargé qu'à l'ouverture d'une ouverture, et
 * partagé ensuite avec l'explorateur et l'analyse.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/index.tsx'
import { BookOpen, ExternalLink, X } from 'lucide-react'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol } from 'chess.js'
import { ECO_VOLUMES } from '@coupparfait/core'
import { Chip, Spinner } from '@/components/ui/index.tsx'
import { BoutonEcouter } from '@/components/ui/BoutonEcouter.tsx'
import { useDialogue } from '@/lib/useDialogue.ts'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { useSan } from '@/lib/notation.ts'
import { localeDuContenu } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { renderBold } from '@/lib/gras.tsx'
import { CADENCES, FINS } from '@/lib/explications.ts'

/** Ce qu'on a cliqué. */
export type DemandeExplication =
  | {
      type: 'ouverture'
      eco: string | null
      nom: string
      /** Le bilan personnel, déjà calculé par la page : on le redit ici. */
      parties: number
      taux: number
      blancs: number
    }
  | { type: 'cadence'; cle: string; parties?: number; taux?: number }
  | { type: 'fin'; cle: string; parties?: number; gagnees?: number }

export function BoiteExplication({
  demande,
  onFermer,
}: {
  demande: DemandeExplication
  onFermer: () => void
}) {
  const t = useT()
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, { onFermer })

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explication-titre"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onFermer} aria-hidden />

      <div
        ref={boite}
        className="popover animate-slide-up relative max-h-[85dvh] w-full max-w-md overflow-y-auto p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <button
          type="button"
          onClick={onFermer}
          className="absolute right-3 top-3 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={16} aria-hidden />
        </button>

        {demande.type === 'ouverture' ? (
          <Ouverture demande={demande} />
        ) : (
          <TexteEcrit demande={demande} />
        )}
      </div>
    </div>
  )
}

/**
 * Une cadence ou une fin de partie : le texte existe, on l'affiche.
 *
 * Le bilan personnel est rappelé sous la définition plutôt qu'au-dessus : on
 * vient de le lire dans le tableau, il sert ici de rattachement — « voilà de
 * quoi on parle, et voilà ce que tu en fais ».
 */
function TexteEcrit({
  demande,
}: {
  demande: Extract<DemandeExplication, { type: 'cadence' | 'fin' }>
}) {
  const t = useT()
  const source = demande.type === 'cadence' ? CADENCES : FINS
  const explication = source[demande.cle]

  if (!explication) {
    return <p className="text-sm text-muted">{t('explain.noExplanation', { cle: demande.cle })}</p>
  }

  return (
    <>
      {/* Ces définitions viennent du glossaire, qui se laisse écouter depuis
          sa page : elles s'écoutent donc ici aussi, sans quoi le même texte
          serait lisible à voix haute d'un côté et muet de l'autre. */}
      <div className="flex items-start gap-2 pr-8">
        <h2
          id="explication-titre"
          className="min-w-0 flex-1 font-display text-xl font-bold tracking-tight"
        >
          {explication.titre}
        </h2>
        <BoutonEcouter
          quoi={explication.titre}
          texte={`${explication.titre}. ${explication.texte}`}
          className="-mt-1"
        />
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">{renderBold(explication.texte)}</p>

      {demande.type === 'cadence' && demande.parties !== undefined && (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-[14px]">
          {t('explain.yourGamesBefore')}{' '}
          <strong className="font-semibold">{demande.parties}</strong>
          {t('explain.yourGamesAfter')} <strong className="font-semibold">{demande.taux}</strong>{' '}
          {t('explain.pointsScored')}
        </p>
      )}
      {demande.type === 'fin' && demande.parties !== undefined && (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-[14px]">
          {t('explain.endedThusBefore')}{' '}
          <strong className="font-semibold">{demande.parties}</strong>
          {t('explain.endedThusMiddle')}{' '}
          <strong className="font-semibold">{demande.gagnees}</strong>{' '}
          {t((demande.gagnees ?? 0) > 1 ? 'explain.wonSuffix' : 'explain.wonSuffixOne')}
        </p>
      )}

      {explication.terme && (
        <Link
          href="/glossaire"
          className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
        >
          <BookOpen size={13} aria-hidden />
          {t('explain.inGlossary', { terme: explication.terme })}
        </Link>
      )}
    </>
  )
}

/**
 * Une ouverture, expliquée par sa ligne.
 *
 * Une définition en prose de la hongroise vaudrait moins que ses quatre
 * premiers coups : c'est un ordre de coups, ça se lit comme tel. On y ajoute
 * le volume ECO — la famille à laquelle elle appartient — parce que c'est ce
 * qui permet de la ranger dans ce qu'on connaît déjà.
 */
function Ouverture({ demande }: { demande: Extract<DemandeExplication, { type: 'ouverture' }> }) {
  const t = useT()
  const { book, ready } = useOpeningBook()
  const format = useSan()
  /*
    La langue du **contenu**, et non celle de l'interface.

    L'interface existe dans trente-six langues ; les explications de coups, les
    définitions de motifs et les noms d'ouvertures sont rédigés, pas traduits,
    et le cœur ne les produit qu'en français et en anglais. Toute frontière vers
    le cœur passe donc par `localeDuContenu`, qui ramène les trente-quatre
    autres à l'anglais. Sans cela, choisir le polonais produirait des phrases
    qui n'existent pas.
  */
  const locale = usePreferences((state) => localeDuContenu(state.locale))
  const [ligne, setLigne] = useState<string[] | null>(null)

  useEffect(() => {
    if (!book) return
    // On cherche par nom, puis on retient l'entrée du même code ECO : deux
    // ouvertures peuvent porter des noms voisins, le code les départage.
    const trouvees = book.search(demande.nom, 20, locale)
    const exacte =
      trouvees.find(
        (entree) => entree.label === demande.nom && (!demande.eco || entree.eco === demande.eco),
      ) ??
      trouvees.find((entree) => !demande.eco || entree.eco === demande.eco) ??
      trouvees[0]
    if (!exacte?.uci) {
      setLigne([])
      return
    }
    setLigne(sanDeLaLigne(exacte.uci))
  }, [book, demande.nom, demande.eco, locale])

  const initiale = demande.eco?.[0]
  const volume = initiale ? ECO_VOLUMES.find((entree) => entree.id === initiale) : null

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-2 pr-8">
        <h2 id="explication-titre" className="font-display text-xl font-bold tracking-tight">
          {demande.nom}
        </h2>
        {demande.eco && <Chip tone="accent">{demande.eco}</Chip>}
      </div>

      {volume && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          <strong className="font-semibold text-ink">{volume.name.fr}</strong> ({volume.range}) —{' '}
          {volume.description.fr}
        </p>
      )}

      {/* ── La ligne ─────────────────────────────────────────────────── */}
      <div className="mt-4">
        <p className="mb-1.5 text-[12px] font-semibold text-faint">{t('explain.definingMoves')}</p>
        {!ready || ligne === null ? (
          <span className="flex items-center gap-2 text-[14px] text-faint">
            <Spinner size={14} /> {t('explain.readingBook')}
          </span>
        ) : ligne.length === 0 ? (
          <p className="text-[14px] text-faint">{t('explain.notInBook')}</p>
        ) : (
          <p className="rounded-[var(--radius-sm)] bg-surface px-3 py-2 font-mono text-[14px] leading-relaxed">
            {ligne.map((san, index) => (
              <span key={index}>
                {index % 2 === 0 && <span className="text-faint">{index / 2 + 1}. </span>}
                {format(san)}{' '}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* ── Ton bilan ────────────────────────────────────────────────── */}
      <p className="mt-4 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-[14px] leading-relaxed">
        {t('explain.youPlayedItBefore')}{' '}
        <strong className="font-semibold">{demande.parties}</strong> {t('explain.youPlayedItAfter')}{' '}
        {t('explain.withWhite', { n: demande.blancs ?? 0 })}{' '}
        <strong className="font-semibold">{demande.taux}</strong> {t('explain.pointsScored')}
      </p>

      <Link
        href={`/ouvertures?q=${encodeURIComponent(demande.nom)}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
      >
        <ExternalLink size={13} aria-hidden />
        {t('explain.exploreOpening')}
      </Link>
    </>
  )
}

/**
 * La suite UCI du livre, rejouée en notation algébrique.
 *
 * Le livre range les coups en UCI — `e2e4 e7e5 g1f3` — parce que c'est la
 * seule écriture qui se relit sans échiquier. L'affichage, lui, se fait dans
 * la notation du lecteur : on rejoue donc la ligne pour la traduire.
 */
function sanDeLaLigne(uci: string): string[] {
  const board = new Chess()
  const sortie: string[] = []
  for (const coup of uci.split(' ').filter(Boolean)) {
    try {
      sortie.push(
        board.move({
          from: coup.slice(0, 2) as Square,
          to: coup.slice(2, 4) as Square,
          promotion: (coup[4] as PieceSymbol) ?? undefined,
        }).san,
      )
    } catch {
      // Ligne inattendue : on montre ce qui a pu être rejoué, jamais un coup faux.
      break
    }
  }
  return sortie
}
