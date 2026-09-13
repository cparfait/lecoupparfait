'use client'

/**
 * Les deux propositions qu'on ne faisait jamais.
 *
 * L'application sait recevoir des notifications et sait s'installer sur un
 * téléphone. Les deux fonctionnaient ; les deux étaient introuvables. Les
 * notifications se réglaient au cinquième onglet des préférences, écran qu'on
 * ouvre pour changer de thème et pas pour se demander si l'on veut être
 * prévenu ; l'installation, elle, n'était proposée nulle part — voir `pwa.ts`.
 *
 * Le résultat se voyait sur la fonctionnalité qui en dépend le plus : une
 * invitation expire en cinq minutes, et sans notification elle mourait dans un
 * téléphone en poche.
 *
 * D'où ce bandeau. Trois règles, et elles comptent plus que le dessin :
 *
 *  1. **Une proposition à la fois.** Deux bandeaux empilés se lisent comme une
 *     régie publicitaire. Les notifications passent devant : elles servent à
 *     quelque chose qui a une échéance.
 *  2. **Une seule fois.** Refusée, la proposition ne revient pas — le réglage
 *     reste dans les préférences, qui est sa place pour qui la cherche.
 *  3. **Jamais pendant une partie.** L'écran de jeu est calibré au pixel près,
 *     et l'on n'interrompt pas quelqu'un qui réfléchit.
 *
 * La permission du navigateur, elle, reste demandée **dans le clic** — c'est la
 * demande faite sans geste que Firefox rejette et que Chrome enterre. « Dès le
 * début » veut donc dire : proposé tôt et visiblement, à un clic de distance.
 */

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Download, Share, X } from 'lucide-react'
import { Alerte } from '@/components/ui/Alerte.tsx'
import { Button } from '@/components/ui/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { usePartieEnLigne } from '@/lib/game/partieEnLigne.ts'
import { useNotifications } from '@/lib/notifications.ts'
import { useInstallation } from '@/lib/pwa.ts'
import { useT } from '@/lib/i18n/index.tsx'

/** Ce qui a déjà été proposé, pour ne pas le reproposer. */
const CLES = {
  notifications: 'coupparfait.propose.notifications',
  installation: 'coupparfait.propose.installation',
} as const

function dejaPropose(cle: string): boolean {
  try {
    return window.localStorage.getItem(cle) === '1'
  } catch {
    // Stockage refusé : on préfère reproposer que ne jamais proposer.
    return false
  }
}

function marquerPropose(cle: string) {
  try {
    window.localStorage.setItem(cle, '1')
  } catch {
    // Sans conséquence : la proposition reparaîtra à la prochaine visite.
  }
}

/**
 * Le temps qu'on laisse à la page avant de parler.
 *
 * Un bandeau qui apparaît en même temps que le contenu se lit comme une partie
 * du contenu, et se referme au même réflexe que les bandeaux de cookies. Trois
 * secondes suffisent à ce qu'il soit perçu comme une remarque, pas comme un
 * péage.
 */
const DELAI_MS = 3_000

export function MiseEnRoute() {
  const t = useT()
  const identite = useIdentite()
  const installation = useInstallation()
  const partieEnCours = usePartieEnLigne()
  const pathname = usePathname()

  const [murie, setMurie] = useState(false)
  const [ecarte, setEcarte] = useState<string | null>(null)

  useEffect(() => {
    const minuteur = setTimeout(() => setMurie(true), DELAI_MS)
    return () => clearTimeout(minuteur)
  }, [])

  const ecarter = useCallback((cle: string) => {
    marquerPropose(cle)
    setEcarte(cle)
  }, [])

  if (!murie) return null

  /*
    Jamais sur l'écran d'inscription.

    C'est là que `BienvenueCompte` pose les mêmes questions, en mieux : une par
    écran, expliquées, dans l'ordre. Le bandeau s'y ajoutait dans le coin,
    proposant l'installation pendant que l'écran de bienvenue s'apprêtait à la
    proposer aussi — deux fois la même demande, dont l'une par-dessus l'autre.
  */
  if (pathname.startsWith('/connexion')) return null

  // Une partie en cours passe avant tout le reste : elle occupe le même coin de
  // l'écran, et son adversaire, lui, attend vraiment. Suivie et non lue une
  // fois : la partie commence après l'affichage du bandeau aussi souvent
  // qu'avant, et deux encarts superposés valent moins que pas d'encart du tout.
  if (partieEnCours) return null

  /*
    L'installation : ce qu'on propose quand les notifications n'ont rien à
    proposer. Calculée d'abord parce qu'elle sert de repli au bandeau des
    notifications, qui ne sait qu'à l'exécution — et depuis un composant enfant
    — s'il a quelque chose à dire.
  */
  const proposeInstallation =
    !installation.installee &&
    (installation.possible || installation.manuelle) &&
    ecarte !== CLES.installation &&
    !dejaPropose(CLES.installation)

  const bandeauInstallation = !proposeInstallation ? null : installation.manuelle ? (
    // Sur iPhone, il n'y a pas de bouton à offrir : seulement le geste à décrire.
    <Bandeau
      icone={<Share size={18} aria-hidden />}
      titre={t('last.installTitle')}
      detail={t('last.installIos')}
      onFermer={() => ecarter(CLES.installation)}
      action={
        <Button size="sm" variant="ghost" onClick={() => ecarter(CLES.installation)}>
          {t('common.close')}
        </Button>
      }
    />
  ) : (
    <Bandeau
      icone={<Download size={18} aria-hidden />}
      titre={t('last.installTitle')}
      detail={t('last.installBlurb')}
      onFermer={() => ecarter(CLES.installation)}
      action={
        <Button
          size="sm"
          variant="primary"
          icon={<Download size={14} />}
          onClick={() => {
            marquerPropose(CLES.installation)
            void installation.installer()
          }}
        >
          {t('auth.install')}
        </Button>
      }
    />
  )

  /*
    Les notifications d'abord, et seulement à quelqu'un de connecté : une
    invitation s'adresse à un compte, et proposer d'être prévenu quand on ne
    peut pas l'être serait une promesse en l'air.

    Le crochet vit dans un composant à part, monté seulement à ce moment-là.
    Appelé ici, il interrogeait `/api/notifications` à chaque chargement de
    page, y compris chez les visiteurs anonymes — qui sont la majorité, sur une
    application dont l'argument est qu'on peut jouer sans compte — pour une
    réponse dont on n'aurait rien fait.
  */
  if (identite != null && ecarte !== CLES.notifications && !dejaPropose(CLES.notifications)) {
    return (
      <ProposerNotifications
        onFermer={() => ecarter(CLES.notifications)}
        secours={bandeauInstallation}
      />
    )
  }

  return bandeauInstallation
}

/**
 * Le bandeau des notifications, et lui seul.
 *
 * Séparé de `MiseEnRoute` pour une raison de coût : `useNotifications`
 * interroge le serveur et inspecte le travailleur de service. Monté dans la
 * coque, il le faisait à chaque chargement de page pour tout le monde, y
 * compris les visiteurs sans compte — qui ne verront jamais ce bandeau.
 *
 * `secours` est ce qu'on affiche quand il n'y a rien à proposer ici : l'état
 * des notifications ne se connaît qu'après un aller-retour, et sans ce relais
 * un compte déjà abonné n'aurait jamais vu la proposition d'installation.
 */
function ProposerNotifications({
  onFermer,
  secours,
}: {
  onFermer: () => void
  secours: React.ReactNode
}) {
  const t = useT()
  const { etat, occupe, activer } = useNotifications()

  // `inconnu` le temps de la vérification : on ne montre pas le repli pendant
  // ce délai, sinon le bandeau d'installation apparaîtrait puis serait remplacé.
  if (etat === 'inconnu') return null
  if (etat !== 'a-activer') return <>{secours}</>

  return (
    <Bandeau
      icone={<Bell size={18} aria-hidden />}
      titre={t('last.notifyTitle')}
      detail={t('last.notifyBlurb')}
      onFermer={onFermer}
      action={
        <Button
          size="sm"
          variant="primary"
          icon={<Bell size={14} />}
          disabled={occupe}
          onClick={() => {
            marquerPropose(CLES.notifications)
            void activer()
          }}
        >
          {t('notifications.enable')}
        </Button>
      }
    />
  )
}

/**
 * L'habillage commun.
 *
 * Il vivait en bas de l'écran, au-dessus de la barre de pouce sur téléphone et
 * dans le coin bas-droit ailleurs. Il rejoint la pile d'alertes, sous
 * l'en-tête et au centre — voir `Alerte`. Il ne repousse toujours rien : la
 * pile est en position fixe, et la page ne bouge pas quand il se referme.
 */
function Bandeau({
  icone,
  titre,
  detail,
  action,
  onFermer,
}: {
  icone: React.ReactNode
  titre: string
  detail: string
  action: React.ReactNode
  onFermer: () => void
}) {
  const t = useT()
  return (
    <Alerte label={titre} className="popover p-3.5 shadow-[var(--shadow-lg)]">
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent"
          aria-hidden
        >
          {icone}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{titre}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{detail}</p>
          <div className="mt-2.5 flex items-center gap-2">
            {action}
            <button
              type="button"
              onClick={onFermer}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {t('last.later')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label={t('common.close')}
          className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
    </Alerte>
  )
}
