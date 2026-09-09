'use client'

/**
 * La carte « aujourd'hui » : défi partagé, quêtes, série.
 *
 * Le défi est le même pour tout le monde et change à minuit. C'est ce qui rend
 * la chose racontable — on peut demander à quelqu'un s'il a trouvé celui du
 * jour, ce qu'aucune progression personnalisée ne permet.
 *
 * Les quêtes tiennent en cinq lignes et la série en un chiffre. On affiche ce
 * qui reste à faire, pas un tableau de bord : cette carte doit se lire en deux
 * secondes avant d'aller jouer, sinon elle devient la destination au lieu du
 * point de départ.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronUp, Sun, Swords } from 'lucide-react'
import clsx from 'clsx'
import { Card, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { QUETES, queteFaite, jourLocal } from '@/lib/daily/quotidien.ts'
import { FlammeSerie } from './FlammeSerie.tsx'
import { ListeDesQuetes } from './ListeDesQuetes.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { XP_TOTAL } from '@/lib/daily/quetes.ts'
import { tranchesAuDessus } from '@coupparfait/core'

interface DefiPuzzle {
  id: string
  rating: number
  themes: string[]
}

/** La tranche de niveau servie, et celles qu'on peut aller voir au-dessus. */
interface Tranche {
  id: string
  nom: string
  min: number
  max: number
}

export function DefiDuJour({ className }: { className?: string }) {
  const { etat, xp, marquer: _marquer } = useQuotidien()
  const [defi, setDefi] = useState<DefiPuzzle | null>(null)
  const [tranche, setTranche] = useState<Tranche | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let vivant = true
    // Le jour est calculé côté client : il dépend du fuseau du joueur, et le
    // serveur ne le connaît pas.
    void fetch(`/api/defi-du-jour?jour=${jourLocal()}`, { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((donnees) => {
        if (!vivant) return
        setDefi(donnees?.puzzle ?? null)
        setTranche(donnees?.tranche ?? null)
        setChargement(false)
      })
      .catch(() => {
        if (vivant) setChargement(false)
      })
    return () => {
      vivant = false
    }
  }, [])

  const defiFait = etat ? queteFaite(etat, 'defi') : false
  /**
   * Le bloc se replie quand le défi est relevé.
   *
   * Une fois la position du jour résolue, la carte gardait sa taille entière —
   * l'échiquier de la position, la ligne « reviens demain », la barre de points
   * et les quatre quêtes — en haut de l'accueil, tous les jours, alors qu'elle
   * n'annonce plus rien à faire. Elle repoussait d'un écran ce qu'on vient
   * vraiment voir : reprendre une partie, une leçon.
   *
   * Repliée, elle tient en une ligne qui dit l'essentiel — c'est fait, et
   * voilà où en est le reste de la journée — et se rouvre d'un geste. Le choix
   * ne vit que le temps de la visite : demain, il y a de nouveau un défi à
   * relever, et la carte doit reprendre sa place.
   */
  const [deplie, setDeplie] = useState(false)
  const quetesFaites = etat ? QUETES.filter((quete) => queteFaite(etat, quete.id)).length : 0
  const replie = defiFait && !deplie

  return (
    // `relative` : le recouvrement de `DefiCliquable` s'étend sur cette carte,
    // et un `absolute inset-0` cherche le premier ancêtre positionné.
    // Le fond de l'accent tant que le défi attend, le vert quand il est
    // relevé — voir `teinte-defi` et `teinte-reussi` dans `globals.css`. La
    // carte publique est là pour montrer ce qu'un compte apporte : elle doit
    // se voir avant de se lire.
    <Card className={clsx('relative p-5', defiFait ? 'teinte-reussi' : 'teinte-defi', className)}>
      <SectionTitle
        hint="La même position pour tout le monde de ton niveau, jusqu’à minuit."
        // La même flamme que dans la barre du haut, et volontairement le même
        // composant : `FlammeSerie` décide seul quand se montrer — il faut une
        // série, et il faut un compte.
        // `relative z-10` : la flamme est rendue avant le recouvrement dans le
        // document, donc celui-ci passerait devant elle et intercepterait son
        // clic. Elle est le seul élément de la carte qui mène ailleurs.
        action={<FlammeSerie habillage="carte" className="relative z-10" />}
      >
        <span className="flex items-center gap-2">
          <Swords size={16} className="text-accent" aria-hidden />
          Le défi du jour
        </span>
      </SectionTitle>

      {replie ? (
        <button
          type="button"
          onClick={() => setDeplie(true)}
          aria-expanded={false}
          className="mt-1 flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-left transition-colors hover:bg-surface-hover"
        >
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_20%,transparent)]"
            aria-hidden
          >
            <Check size={14} className="text-[var(--q-best)]" />
          </span>
          <span className="min-w-0 flex-1 text-[14px] leading-snug">
            <span className="block font-semibold text-[var(--q-best)]">Défi du jour relevé</span>
            <span className="block text-muted">
              {quetesFaites} quête{quetesFaites > 1 ? 's' : ''} sur {QUETES.length} · {xp} /{' '}
              {XP_TOTAL} points · la prochaine position arrive à minuit
            </span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-faint" aria-hidden />
        </button>
      ) : chargement ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <Spinner size={13} /> Tirage du jour…
        </p>
      ) : defi ? (
        <>
          <DefiCliquable defi={defi} defiFait={defiFait} tranche={tranche} />
          {tranche && <PlusDur tranche={tranche} />}
        </>
      ) : (
        <p className="py-2 text-sm text-muted">
          Le défi du jour n’est pas disponible — la base de puzzles n’est peut-être pas encore
          importée.
        </p>
      )}

      {/* ── Quêtes ────────────────────────────────────────────────────── */}
      {/* Un encart à part, dans l'ambre de la flamme : les quêtes ne sont pas
          le défi, et leur fond le dit avant le libellé. `relative z-10` pour la
          même raison que la flamme du titre — le recouvrement de
          `DefiCliquable` couvre toute la carte, et un fond posé après lui le
          masquerait. Il reste donc dessous : l'encart se voit, la carte entière
          reste cliquable. */}
      <div
        className={clsx(
          'mt-4 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-inaccuracy)_10%,transparent)] px-3 py-2.5',
          replie && 'hidden',
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[color-mix(in_oklab,var(--q-inaccuracy)_62%,var(--text))]">
            <Sun size={12} strokeWidth={2.5} aria-hidden />
            {/* « Les quêtes du jour », et non « Aujourd'hui » : cet encart est
                dans une carte qui s'appelle déjà « Le défi du jour », et dont
                la liste commence par « Résoudre le défi du jour ». Le mot
                « aujourd'hui » ne départageait rien — il vaut pour les deux. */}
            Les quêtes du jour
          </span>
          <span className="text-xs tabular-nums text-muted">
            {xp} / {XP_TOTAL} points
          </span>
        </div>

        <div
          className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemin={0}
          aria-valuemax={XP_TOTAL}
          aria-label="Points du jour"
        >
          <div
            className="h-full rounded-full bg-[var(--q-inaccuracy)] transition-[width] duration-500"
            style={{ width: `${(xp / XP_TOTAL) * 100}%` }}
          />
        </div>

        {/* Une ligne par quête, une destination par ligne : voir `ListeDesQuetes`. */}
        <ListeDesQuetes etat={etat} />

        {/* Refermer, une fois qu'on a regardé. Seulement quand le défi est
            relevé : tant qu'il reste à faire, la carte est ce qu'on vient
            chercher. */}
        {defiFait && (
          <button
            type="button"
            onClick={() => setDeplie(false)}
            aria-expanded
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <ChevronUp size={13} aria-hidden />
            Replier le défi du jour
          </button>
        )}
      </div>
    </Card>
  )
}

/**
 * Le défi lui-même : toujours montré, mais réservé aux comptes.
 *
 * Le choix mérite d'être posé, parce que l'inverse était défendable. On aurait
 * pu masquer le défi à qui n'a pas de compte, comme on masque la flamme. C'est
 * ce qu'on fait pour la série, et pour une raison précise : la série est un
 * capital qu'on accumule, et l'afficher sans pouvoir le garder prépare une
 * déception.
 *
 * Le défi n'est pas un capital, c'est une invitation — une position, la même
 * pour tout le monde, valable aujourd'hui. La montrer ne promet rien qu'on ne
 * puisse tenir, et c'est le meilleur argument dont on dispose pour expliquer à
 * quoi sert un compte : on le demande au moment où quelqu'un veut faire quelque
 * chose, pas au moment où il arrive.
 *
 * D'où cette forme : la carte reste identique, et c'est le clic qui bifurque.
 * Le message part **avant** la navigation — arriver sur un formulaire de
 * connexion sans savoir pourquoi est la manière la plus sûre de le quitter.
 */
function DefiCliquable({
  defi,
  defiFait,
  tranche,
}: {
  defi: DefiPuzzle
  defiFait: boolean
  tranche: Tranche | null
}) {
  const identite = useIdentite()
  const router = useRouter()

  /**
   * L'encadré visible, et une zone de clic qui déborde sur toute la carte.
   *
   * `after:absolute after:inset-0` étend la cible à la carte entière sans rien
   * changer à ce qu'on voit : le titre, la barre de progression et la liste des
   * quêtes deviennent cliquables alors qu'ils restent du texte. C'est le seul
   * moyen d'y arriver — envelopper la carte dans un `<button>` ou un `<a>`
   * placerait une liste et une barre de progression à l'intérieur, ce qui n'est
   * pas du HTML valide et casse la lecture d'écran.
   *
   * `after:z-[1]` n'est pas décoratif. Le recouvrement se peint avec le bouton,
   * et le bouton vient avant les quêtes dans le document : sans rang explicite,
   * tout ce qui le suit passe **par-dessus** lui. La moitié basse de la carte
   * restait inerte, et rien ne le laissait voir puisque le recouvrement est
   * transparent. La flamme reste au-dessus, à `z-10`.
   */
  const apparence = clsx(
    'flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition-colors',
    "after:absolute after:inset-0 after:z-[1] after:content-['']",
    defiFait
      ? 'border-[color-mix(in_oklab,var(--q-best)_35%,transparent)] bg-[color-mix(in_oklab,var(--q-best)_10%,transparent)]'
      : 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] hover:brightness-110',
  )

  const contenu = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">
          {defiFait ? 'Défi relevé' : 'Trouve le coup gagnant'}
        </span>
        <span className="block text-xs text-muted">
          {tranche ? `${tranche.nom} · niveau ${defi.rating}` : `Niveau ${defi.rating}`}
          {defiFait ? ' · reviens demain' : ' · une seule position'}
        </span>
      </span>
      {defiFait ? (
        <Check size={18} className="shrink-0 text-[var(--q-best)]" aria-hidden />
      ) : (
        <span className="shrink-0 text-sm font-semibold text-accent">Jouer →</span>
      )}
    </>
  )

  // `undefined` — on ne sait pas encore — se comporte comme « connecté » : le
  // lien vers le défi est le plus inoffensif des deux, là où un renvoi vers la
  // connexion imposé à tort à quelqu'un de connecté serait une faute.
  if (identite === null) {
    return (
      <button
        type="button"
        className={apparence}
        onClick={() => {
          toast.info(
            'Le défi du jour demande un compte — gratuit, et sans publicité.',
            'Il est le même pour tout le monde et compte pour ta série : sans compte, on ne saurait ni à qui l’attribuer, ni la retrouver demain. Jouer, apprendre et analyser restent accessibles sans rien créer.',
          )
          router.push('/connexion')
        }}
      >
        {contenu}
      </button>
    )
  }

  return (
    <Link
      href={tranche ? `/puzzles?defi=1&tranche=${tranche.id}` : '/puzzles?defi=1'}
      className={apparence}
    >
      {contenu}
    </Link>
  )
}

/**
 * « Plus dur ? » — les deux tranches au-dessus de la sienne.
 *
 * Le défi du jour vise le niveau du joueur, pour qu'il le réussisse la plupart
 * du temps : c'est ce qui fait revenir. Mais un défi qu'on gagne toujours cesse
 * d'en être un, et certains jours on veut se mesurer plus haut. Les deux
 * tranches suivantes sont donc proposées, jamais imposées — et elles restent
 * partagées, elles aussi : le « Club » du jour est le même pour tous les
 * joueurs de club.
 *
 * Deux et pas six : au-delà, un défi quotidien devient un catalogue.
 */
function PlusDur({ tranche }: { tranche: Tranche }) {
  const superieures = tranchesAuDessus(tranche)
  if (superieures.length === 0) return null

  return (
    <p className="relative z-10 mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-faint">
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
  )
}
