'use client'

/**
 * La flamme de la série, réservée aux comptes.
 *
 * Elle apparaît à deux endroits — dans la barre du haut, et dans l'en-tête de
 * la carte du défi du jour. Les deux montrent le même chiffre et obéissent aux
 * mêmes conditions d'apparition ; c'est pour cela qu'elles vivent ici plutôt
 * que d'être écrites deux fois.
 *
 * Elle disparaît complètement tant qu'il n'y a pas de série : afficher
 * « 0 jour » à quelqu'un qui découvre le site, c'est lui reprocher quelque
 * chose avant même qu'il ait commencé.
 *
 * Sans compte, elle **ne s'affiche pas du tout**, et c'est le point à
 * comprendre avant de la remettre.
 *
 * La série d'un visiteur non connecté vit dans le stockage local de son
 * navigateur : elle ne suit pas d'un appareil à l'autre, ne survit pas à un
 * nettoyage, et personne ne peut la lui rendre une fois perdue. Un compteur qui
 * demande un engagement quotidien et qu'on n'est pas en mesure de garder ne
 * récompense rien — il prépare une déception.
 *
 * L'invitation à créer un compte se fait ailleurs, sur le défi du jour, qui est
 * un geste qu'on vient d'accomplir plutôt qu'un chiffre qu'on risque de perdre.
 * Voir `DefiDuJour`.
 *
 * ── Ce qu'elle fait au clic ──────────────────────────────────────────────
 *
 * Dans la barre du haut, elle **s'ouvre** au lieu de partir. Elle menait droit
 * au défi du jour : un chiffre orange qu'on touche par curiosité — « c'est
 * quoi, ce 7 ? » — et l'on se retrouvait devant un échiquier, sans avoir eu la
 * réponse. Pire quand le défi était déjà relevé : on rejouait la position du
 * jour sans que rien ne le dise.
 *
 * Le panneau répond d'abord à la question posée — ce qu'est une série, où en
 * est la sienne, ce qu'il faut faire pour la garder — puis propose le défi,
 * ou annonce qu'il est déjà fait. Les sept derniers jours s'y allument l'un
 * après l'autre : une série est une suite, et une suite se montre.
 */

import Link from 'next/link'
import { ArrowRight, Check, Flame } from 'lucide-react'
import clsx from 'clsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { QUETES, queteFaite } from '@/lib/daily/quotidien.ts'
import type { EtatQuotidien } from '@/lib/daily/quotidien.ts'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'

/**
 * Deux habillages pour le même objet.
 *
 * `entete` est une cible cliquable dans la barre du haut : il lui faut la
 * hauteur et le survol des autres boutons qui l'entourent. `carte` est posé
 * dans un titre de section, où une zone de survol de trente-six pixels de haut
 * décalerait la ligne.
 */
type Habillage = 'entete' | 'carte'

const HABILLAGES: Record<Habillage, string> = {
  // Dans la barre, la flamme est une commande parmi les autres : elle prend
  // leur hauteur et leur surface au survol. Plus de liseré, comme les icônes
  // voisines — six cadres alignés faisaient une rangée de cases, et la barre
  // se lisait comme un tableau.
  entete: 'h-9 gap-1 rounded-[var(--radius-sm)] px-2 hover:bg-surface-hover',
  carte: 'gap-1 hover:underline',
}

/** Combien de jours le panneau montre en arrière. */
const JOURS_MONTRES = 7

export function FlammeSerie({
  habillage = 'entete',
  className,
}: {
  habillage?: Habillage
  className?: string
}) {
  const t = useT()
  const { etat } = useQuotidien()
  const identite = useIdentite()
  const serie = etat?.serie ?? 0

  // Deux raisons de ne rien afficher, et `undefined` compte pour la seconde :
  // tant qu'on ne sait pas s'il y a une session, montrer la flamme puis la
  // retirer une seconde plus tard est exactement le clignotement qu'on évite
  // partout ailleurs.
  if (!identite) return null
  if (serie <= 0) return null

  const jours = `${serie} jour${serie > 1 ? 's' : ''}`
  const record = etat && etat.meilleureSerie > serie ? ` · record : ${etat.meilleureSerie}` : ''
  const classe = clsx(
    'flex shrink-0 items-center text-sm font-semibold text-[var(--q-inaccuracy)] transition-colors',
    HABILLAGES[habillage],
    className,
  )
  const contenu = (
    <>
      <Flame size={15} aria-hidden />
      <span className="tabular-nums">{habillage === 'carte' ? `${serie} j` : serie}</span>
    </>
  )

  /*
    Sur la carte du défi du jour, la flamme reste un lien.

    Le panneau y expliquerait ce que la carte dit déjà, à trois centimètres
    au-dessous : la quête, son état, et le bouton pour la faire. C'est dans la
    barre du haut qu'un chiffre isolé appelle une explication.
  */
  if (habillage === 'carte') {
    return (
      <Link
        href="/puzzles?defi=1"
        title={`${t('streak.streakOf', { n: jours })}${record}`}
        className={classe}
      >
        {contenu}
        <span className="sr-only">{t('streak.goToDaily')}</span>
      </Link>
    )
  }

  return (
    <Menu
      align="right"
      largeur="w-[19rem]"
      label={t('streak.streakOf', { n: jours })}
      className="shrink-0"
      // Le déclencheur *est* la pastille : sans cela, le bouton de `Menu`
      // rapporterait son propre cadre, celui-là même qu'on vient de retirer aux
      // icônes voisines.
      boutonClassName={clsx(classe, 'cible-doigt')}
      declencheur={() => (
        <>
          {contenu}
          <span className="sr-only">{t('streak.seeStreak')}</span>
        </>
      )}
    >
      <PanneauSerie etat={etat} serie={serie} />
    </Menu>
  )
}

/**
 * Le panneau de la série.
 *
 * Il répond à trois questions, dans l'ordre où on les pose : *qu'est-ce que ce
 * chiffre*, *où j'en suis aujourd'hui*, *qu'est-ce que je fais maintenant*.
 */
function PanneauSerie({ etat, serie }: { etat: EtatQuotidien | null; serie: number }) {
  const t = useT()
  // « Aujourd'hui compte-t-il déjà ? » — c'est ce qui décale la frise d'un cran
  // et change entièrement le message : tant qu'aucune quête n'est finie, la
  // flamme d'aujourd'hui n'est pas allumée, et elle est en jeu.
  const faitAujourdhui = etat ? QUETES.some((quete) => queteFaite(etat, quete.id)) : false
  const defiFait = etat ? queteFaite(etat, 'defi') : false
  const finies = etat ? QUETES.filter((quete) => queteFaite(etat, quete.id)).length : 0

  return (
    <div className="p-2">
      <div className="flex items-baseline gap-2 px-1">
        <p className="font-display text-lg font-bold tracking-tight">
          {serie} jour{serie > 1 ? 's' : ''} d’affilée
        </p>
        {etat && etat.meilleureSerie > serie && (
          <span className="text-[12px] text-faint">record : {etat.meilleureSerie}</span>
        )}
      </div>

      {/* ── Les sept derniers jours ────────────────────────────────────
          Déduits de la série, et non d'un journal : le navigateur ne garde que
          le compteur et la journée en cours. C'est suffisant pour ce que la
          frise a à dire — voilà la suite, voilà où elle s'arrête. */}
      <div className="mt-2.5 flex items-end gap-1 px-1" aria-hidden>
        {Array.from({ length: JOURS_MONTRES }, (_, index) => {
          // 0 = il y a six jours … 6 = aujourd'hui.
          const recul = JOURS_MONTRES - 1 - index
          const allume = faitAujourdhui ? recul < serie : recul >= 1 && recul <= serie
          const aujourdhui = recul === 0
          return (
            <span
              key={index}
              style={{ ['--retard' as string]: `${index * 55}ms` }}
              className={clsx(
                'animate-flamme-jour grid h-8 flex-1 place-items-center rounded-[var(--radius-sm)]',
                allume
                  ? 'bg-[color-mix(in_oklab,var(--q-inaccuracy)_22%,transparent)] text-[var(--q-inaccuracy)]'
                  : 'bg-surface text-faint',
                aujourdhui && 'ring-1 ring-inset ring-[var(--q-inaccuracy)]',
              )}
            >
              <Flame size={14} strokeWidth={allume ? 2.4 : 1.6} />
            </span>
          )
        })}
      </div>
      <p className="mt-1 px-1 text-[12px] text-faint">{t('streak.lastSevenDays')}</p>

      {/* « Le défi du jour en est une » n'est pas un détail de formulation.
          Le site nomme deux choses à part — le défi du jour, les quêtes du
          jour — sans jamais dire que la première est la première des secondes.
          On y lisait donc deux devoirs quotidiens là où il n'y en a qu'un
          ensemble. La quête « analyser une partie » citée ici avait par
          ailleurs disparu du catalogue il y a longtemps. */}
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-muted">
        {t('streak.dayCounts', { n: QUETES.length })}{' '}
        <strong className="font-semibold text-ink">{t('streak.resetsToZero')}</strong>
      </p>

      <p className="mt-2 px-1 text-[12px] text-muted">
        {t('streak.todayBefore')} <strong className="font-semibold text-ink">{finies}</strong>{' '}
        {t(finies > 1 ? 'streak.questsOf' : 'streak.questOf', { total: QUETES.length })}
        {!faitAujourdhui && t('streak.atStake')}
      </p>

      {/* ── Ce qu'on peut faire maintenant ────────────────────────────
          Le défi du jour, s'il reste à faire ; le dire, sinon. La flamme
          menait ici sans condition, et rejouer une position déjà résolue ne
          rapporte rien — ni série, ni quête, ni classement. */}
      <div className="mt-3 border-t border-line/60 pt-2">
        {defiFait ? (
          <>
            <p className="flex items-center gap-1.5 px-1 text-[12px] font-medium text-[var(--q-best)]">
              <Check size={13} aria-hidden />
              {t('streak.dailyAlreadyDone')}
            </p>
            {/* `#aujourdhui`, et non `/` : le lien menait à la page où l'on
                était déjà, sur une carte repliée. L'ancre l'ouvre et l'amène
                sous les yeux — voir `Aujourdhui`.

                Et une ancre ordinaire, pas un `Link`. Le routeur de Next change
                l'adresse par `pushState`, qui n'émet **aucun** événement :
                depuis l'accueil, la carte n'apprenait jamais qu'on venait de la
                désigner, et le lien continuait de ne rien faire. Une balise
                `<a>` déclenche la navigation de fragment du navigateur, donc un
                `hashchange`, sans recharger quoi que ce soit tant qu'on est
                déjà sur la page. Depuis une autre page, elle recharge — c'est
                une navigation de toute façon. */}
            {}
            <a
              href="/#aujourdhui"
              className="mt-1 flex items-center justify-between rounded-[var(--radius-sm)] px-1 py-1.5 text-[14px] font-medium transition-colors hover:bg-surface-hover"
            >
              {t('streak.otherQuests', { n: QUETES.length - 1 })}
              <ArrowRight size={14} aria-hidden />
            </a>
          </>
        ) : (
          <Link
            href="/puzzles?defi=1"
            className="flex items-center justify-between rounded-[var(--radius-sm)] bg-accent/15 px-2.5 py-2 text-[14px] font-semibold text-accent transition-colors hover:bg-accent/25"
          >
            {t('streak.takeDaily')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
