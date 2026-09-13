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
 * Trois lignes courtes, une barre, et c'est tout. Le défi du jour, lui, est
 * remonté dans « Maintenant » tant qu'il n'est pas résolu — c'est la seule chose
 * de l'écran qui expire, elle n'a rien à faire au milieu d'un bilan. Une fois
 * résolu, il devient une ligne verte en tête de cette carte, et c'est sa seule
 * trace ici : il n'est pas repris dans la liste des quêtes. Il y figurait, en
 * première ligne, et l'accueil disait alors le défi deux fois — en grand dans
 * « Maintenant », en petit trois centimètres plus bas — sans qu'on sache s'il
 * s'agissait d'une chose ou de deux.
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
import { Check, Sun, Swords } from 'lucide-react'
import clsx from 'clsx'
import { tranchesAuDessus } from '@coupparfait/core'
import { Card } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { ListeDesQuetes } from '@/components/daily/ListeDesQuetes.tsx'
import { XP_TOTAL } from '@/lib/daily/quetes.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { useT } from '@/lib/i18n/index.tsx'

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
  const t = useT()
  const { etat, xp } = useQuotidien()
  const superieures = tranche ? tranchesAuDessus(tranche) : []

  /**
   * Une fois la journée finie, la carte se referme sur son titre.
   *
   * Elle gardait sa taille entière toute la journée : la barre de points, le
   * mot « reviens demain », les quatre quêtes et les tranches plus dures. Or
   * elle n'annonce plus rien à faire — elle constate. En haut de l'accueil,
   * cela repousse d'un demi-écran ce qu'on vient vraiment reprendre : une
   * partie, un chapitre, une leçon.
   *
   * « Finie » veut dire toutes les quêtes, pas seulement le défi. Elle se
   * repliait dès le défi résolu, et l'on se retrouvait devant un titre vert et
   * « 50 / 70 points du jour » sans voir ce qui manquait : les deux quêtes
   * restantes étaient derrière le chevron, et la carrière prenait toute la
   * place à côté. Tant qu'il reste à faire, la carte reste ouverte : c'est la
   * liste des quêtes qu'on vient regarder.
   *
   * Repliée, il reste la seule ligne qui compte : c'est fait, et voilà les
   * points du jour. Elle se rouvre d'un geste, et se referme de même — on
   * garde le dernier choix, au-dessus de la règle. Il ne dure que la visite :
   * demain il y a un nouveau défi, et la carte doit reprendre sa place
   * d'elle-même.
   */
  const toutFait = defiFait && xp >= XP_TOTAL
  const [choix, setChoix] = useState<boolean | null>(null)
  const deplie = choix ?? !toutFait
  const replie = defiFait && !deplie

  /*
    Le titre nomme la carte, et il ne nomme qu'elle.

    Il disait « Aujourd'hui ». C'était exactement le mot que portait, juste
    au-dessus, la rubrique de « Maintenant » quand le défi y est mis en avant —
    et cette carte-ci commence par la ligne « Résoudre le défi du jour ». Deux
    blocs sous le même intitulé, le défi du jour écrit dans les deux : rien ne
    disait s'il s'agissait d'une chose ou de deux.

    Cette carte porte **les quêtes**, au pluriel ; le défi n'en est qu'une, et
    il n'est plus dans la liste — il a sa place au-dessus, dans « Maintenant »,
    tant qu'il reste à faire. Le titre le dit donc, et l'ancre garde son nom —
    elle est visée depuis le panneau de la flamme.

    « Journée faite » remplace « Défi du jour relevé » une fois tout terminé :
    le titre d'une carte de quêtes ne peut pas parler d'autre chose qu'elles.
    La question « ai-je fait le défi ? » se répond au liseré vert, qui n'a pas
    bougé, et à la ligne verte sous la barre.
  */
  const titre = t(toutFait ? 'today.done' : 'today.yourQuests')
  const Icone = toutFait ? Check : Sun

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
      setChoix(true)
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
    // `self-start` : dans la grille à deux colonnes, la carte prenait la
    // hauteur de sa voisine ; repliée, cela faisait un titre au-dessus d'un
    // grand vide.
    // Le fond dit l'état, avant le titre : ambre tant que la journée est en
    // cours — c'est la couleur de la flamme, que ces quêtes nourrissent — et
    // vert quand tout est fait. Les trois teintes sont décrites dans
    // `globals.css`. La couleur choisie ressort dans `--teinte`, que la barre
    // de points reprend, et dans `--teinte-texte` pour le libellé : un seul
    // endroit décide.
    <Card
      id={ANCRE}
      className={clsx(
        'scroll-mt-20 self-start overflow-hidden',
        toutFait ? 'teinte-reussi' : 'teinte-jour',
      )}
    >
      {/* Le liseré vert, comme la teinte de chapitre sur la carte voisine.
          C'est ce qui se voit sans lire, et c'est tout l'objet : la question
          « est-ce que j'ai fait le défi aujourd'hui ? » doit se répondre d'un
          coup d'œil, pas en cherchant une ligne au milieu d'une liste. */}
      {defiFait && <div className="h-1 bg-[var(--q-best)]" aria-hidden />}

      {/* Le titre devient le bouton, une fois le défi relevé : c'est la ligne
          qu'on regarde, autant qu'elle serve. Tant qu'il reste à faire, elle
          n'est qu'un titre — rien à replier.

          Le bandeau ne reçoit pas de teinte : il prend celle de la carte, qui
          la tient déjà de `teinte-jour` ou de `teinte-reussi`. Le titre passe
          donc de l'ambre au vert avec le reste, sans rien décider ici. */}
      <EnTeteDeCarte
        titre={titre}
        icone={<Icone size={14} strokeWidth={toutFait ? 3 : 2.5} aria-hidden />}
        fin={`${xp} / ${XP_TOTAL} points du jour`}
        filet={!replie}
        onClick={defiFait ? () => setChoix(!deplie) : undefined}
        ouvert={deplie}
      />

      <div className={clsx('px-4 pb-3 pt-3', replie && 'hidden')}>
        <div
          className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemin={0}
          aria-valuemax={XP_TOTAL}
          aria-label={t('today.pointsAria')}
        >
          <div
            className="h-full rounded-full bg-[var(--teinte)] transition-[width] duration-500"
            style={{ width: `${(xp / XP_TOTAL) * 100}%` }}
          />
        </div>

        {/* Le défi résolu se dit ici, et une seule fois. Non résolu, il est en
            tête de page dans « Maintenant » : le répéter à deux endroits ferait
            deux boutons pour une position unique — c'est pour cela qu'il n'est
            pas non plus dans la liste qui suit.

            Cette ligne **le nomme**. Elle disait « La prochaine arrive à
            minuit » et rien d'autre : tant que la liste commençait par
            « Résoudre le défi du jour », coché et barré, on savait de quoi
            parlait ce « la prochaine ». La ligne partie, la phrase n'avait
            plus d'antécédent — et les jours où la cote du puzzle manque, il ne
            restait rien du tout. C'est ici, désormais, que se lit la réponse à
            « ai-je fait le défi ? ». */}
        {defiFait && (
          <p className="mb-2.5 flex items-start gap-1.5 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-best)_10%,transparent)] px-2.5 py-2 text-[12px] leading-relaxed text-muted">
            <Check
              size={13}
              strokeWidth={3}
              className="mt-0.5 shrink-0 text-[var(--q-best)]"
              aria-hidden
            />
            <span>
              <strong className="font-semibold text-[var(--q-best)]">
                {t('streak.dailyAlreadyDone')}
              </strong>
              {niveauDefi ? ` — la position valait ${niveauDefi}.` : '.'} La prochaine arrive à
              minuit.
            </span>
          </p>
        )}

        {/* Trois lignes, trois destinations, le défi en moins : voir
            `ListeDesQuetes`. */}
        <ListeDesQuetes etat={etat} teinte="var(--teinte)" />

        {/* Les tranches plus dures, discrètes : c'est un écart qu'on prend
            certains jours, pas une consigne. Elles restent affichées même une
            fois le défi relevé — c'est justement là qu'on veut se mesurer plus
            haut. */}
        {superieures.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/40 pt-2.5 text-[12px] text-faint">
            <Swords size={11} aria-hidden />
            <span>{t('daily.harder')}</span>
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
