'use client'

/**
 * La journée, en une carte compacte.
 *
 * Elle remplace, sur l'accueil connecté, la carte « Le défi du jour » — qui
 * faisait quatre choses sous un titre qui n'en annonçait qu'une : le défi, les
 * deux tranches plus dures, la barre de points, et les cinq quêtes. La liste des
 * quêtes occupait à elle seule les deux tiers de la hauteur, alors qu'elle n'est
 * pas le défi.
 *
 * Ici, les quêtes redeviennent ce qu'elles sont : un état, pas une destination.
 * Cinq lignes courtes, une barre, et c'est tout. Le défi du jour, lui, est
 * remonté dans « Maintenant » tant qu'il n'est pas résolu — c'est la seule chose
 * de l'écran qui expire, elle n'a rien à faire au milieu d'un bilan.
 *
 * `DefiDuJour` reste en place pour l'accueil public, où il joue un autre rôle :
 * montrer à un visiteur ce qu'un compte lui apporterait.
 *
 * **« points du jour » et non « points ».** L'en-tête de l'accueil affiche déjà
 * un total — l'expérience de carrière, plusieurs milliers. Deux compteurs
 * appelés du même nom sur le même écran, dont l'un est sur quatre-vingts et
 * l'autre sur des milliers, se lisent comme une incohérence. Trois mots
 * suffisent à les distinguer.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, ChevronUp, Swords } from 'lucide-react'
import clsx from 'clsx'
import { tranchesAuDessus } from '@coupparfait/core'
import { Card } from '@/components/ui/index.tsx'
import { ListeDesQuetes } from '@/components/daily/ListeDesQuetes.tsx'
import { XP_TOTAL } from '@/lib/daily/quetes.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'

/** L'ancre de la carte, visée depuis le panneau de la série. */
const ANCRE = 'aujourdhui'

export interface TrancheDefi {
  id: string
  nom: string
  min: number
  max: number
}

export function Aujourdhui({
  defiFait,
  tranche,
  niveauDefi,
}: {
  defiFait: boolean
  /** Tranche servie aujourd'hui, pour proposer celles du dessus. */
  tranche: TrancheDefi | null
  /** Cote du puzzle du jour, s'il est connu. */
  niveauDefi: number | null
}) {
  const { etat, xp } = useQuotidien()
  const superieures = tranche ? tranchesAuDessus(tranche) : []

  /**
   * Une fois le défi relevé, la carte se referme sur son titre.
   *
   * Elle gardait sa taille entière toute la journée : la barre de points, le
   * mot « reviens demain », les quatre quêtes et les tranches plus dures. Or
   * elle n'annonce plus rien à faire — elle constate. En haut de l'accueil,
   * cela repousse d'un demi-écran ce qu'on vient vraiment reprendre : une
   * partie, un chapitre, une leçon.
   *
   * Repliée, il reste la seule ligne qui compte : c'est fait, et voilà les
   * points du jour. Elle se rouvre d'un geste — les quêtes du jour restent à
   * portée, et c'est justement là qu'on va voir ce qui reste.
   *
   * Le choix ne dure que la visite : demain il y a un nouveau défi, et la carte
   * doit reprendre sa place d'elle-même.
   */
  const [deplie, setDeplie] = useState(false)
  const replie = defiFait && !deplie

  /*
    Sauf quand on vient exprès la voir.

    Le panneau de la flamme, dans la barre du haut, propose « Voir les quêtes
    du jour ». Il menait à `/` — c'est-à-dire à cette page, souvent celle où
    l'on était déjà : rien ne bougeait, et quand le défi était relevé les
    quêtes restaient repliées derrière le titre. Un lien qui ne fait rien est
    pire qu'un lien absent.

    Il vise désormais `#aujourdhui`. Le navigateur amène la carte sous les
    yeux ; à nous de l'ouvrir. Deux moments, et les deux comptent : au montage
    quand on arrive d'une autre page, et sur `hashchange` quand on était déjà
    ici.

    L'ancre est ensuite retirée de l'adresse. Sans cela, elle reste en place et
    un second clic sur le même lien n'émet plus rien — on replierait la carte,
    on redemanderait à la voir, et il ne se passerait rien.
  */
  useEffect(() => {
    const viser = () => {
      if (window.location.hash !== `#${ANCRE}`) return
      setDeplie(true)
      // Après le rendu, sinon on fait défiler vers une carte encore repliée et
      // l'on s'arrête quelques dizaines de pixels trop bas.
      requestAnimationFrame(() => {
        document.getElementById(ANCRE)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', window.location.pathname + window.location.search)
      })
    }
    viser()
    window.addEventListener('hashchange', viser)
    return () => window.removeEventListener('hashchange', viser)
  }, [])

  return (
    // `scroll-mt-20` : l'en-tête est collant, et sans cette marge la carte
    // s'arrête juste dessous — son titre caché par la barre.
    <Card id={ANCRE} className="scroll-mt-20 overflow-hidden">
      {/* Le liseré vert, comme la teinte de chapitre sur la carte voisine.
          C'est ce qui se voit sans lire, et c'est tout l'objet : la question
          « est-ce que j'ai fait le défi aujourd'hui ? » doit se répondre d'un
          coup d'œil, pas en cherchant une ligne au milieu d'une liste. */}
      {defiFait && <div className="h-1 bg-[var(--q-best)]" aria-hidden />}

      {/* Le titre devient le bouton, une fois le défi relevé : c'est la ligne
          qu'on regarde, autant qu'elle serve. Tant qu'il reste à faire, elle
          n'est qu'un titre — rien à replier. */}
      {defiFait ? (
        <button
          type="button"
          onClick={() => setDeplie((ouvert) => !ouvert)}
          aria-expanded={deplie}
          className={clsx(
            'flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover',
            !replie && 'border-b border-line/60',
          )}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--q-best)]">
            <Check size={12} strokeWidth={3} aria-hidden />
            Défi du jour relevé
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-muted">
            {xp} / {XP_TOTAL} points du jour
          </span>
          {replie ? (
            <ChevronDown size={14} className="shrink-0 text-faint" aria-hidden />
          ) : (
            <ChevronUp size={14} className="shrink-0 text-faint" aria-hidden />
          )}
        </button>
      ) : (
        <div className="flex items-baseline justify-between gap-2 border-b border-line/60 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Aujourd’hui
          </p>
          <p className="text-[11px] tabular-nums text-muted">
            {xp} / {XP_TOTAL} points du jour
          </p>
        </div>
      )}

      <div className={clsx('px-4 pb-3 pt-3', replie && 'hidden')}>
        <div
          className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemin={0}
          aria-valuemax={XP_TOTAL}
          aria-label="Points du jour"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${(xp / XP_TOTAL) * 100}%` }}
          />
        </div>

        {/* Le défi résolu se dit ici, et une seule fois. Non résolu, il est en
            tête de page dans « Maintenant » : le répéter à deux endroits ferait
            deux boutons pour une position unique. */}
        {defiFait && (
          <p className="mb-2.5 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-best)_10%,transparent)] px-2.5 py-2 text-[12px] leading-relaxed text-muted">
            {niveauDefi ? `La position du jour valait ${niveauDefi}. ` : ''}
            La prochaine arrive à minuit — reviens demain.
          </p>
        )}

        {/* Cinq lignes, cinq destinations : voir `ListeDesQuetes`. */}
        <ListeDesQuetes etat={etat} />

        {/* Les tranches plus dures, discrètes : c'est un écart qu'on prend
            certains jours, pas une consigne. Elles restent affichées même une
            fois le défi relevé — c'est justement là qu'on veut se mesurer plus
            haut. */}
        {superieures.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/40 pt-2.5 text-[11px] text-faint">
            <Swords size={11} aria-hidden />
            <span>Plus dur&nbsp;:</span>
            {superieures.map((autre) => (
              <Link
                key={autre.id}
                href={`/puzzles?defi=1&tranche=${autre.id}`}
                className="rounded-full border border-line px-2 py-0.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {autre.nom}
              </Link>
            ))}
          </p>
        )}
      </div>
    </Card>
  )
}
