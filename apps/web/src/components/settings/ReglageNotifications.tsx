'use client'

/**
 * Le réglage des notifications.
 *
 * Un seul écran doit répondre à une question simple — « est-ce que mon
 * téléphone me préviendra ? » — dans un domaine où *sept* choses différentes
 * peuvent l'en empêcher : navigateur trop ancien, application non installée
 * sur iOS, serveur sans clés, permission jamais demandée, permission refusée,
 * abonnement non enregistré, notifications coupées au niveau du système.
 *
 * D'où la forme retenue : **un seul état affiché à la fois**, avec la phrase
 * qui explique quoi faire, et un bouton d'essai une fois que c'est actif. Le
 * bouton d'essai n'est pas un gadget : il est le seul moyen de distinguer
 * « abonné » de « abonné mais le téléphone ne sonnera pas », et cette
 * distinction ne se découvre autrement qu'en ratant une invitation.
 */

import { Bell, BellOff, BellRing, Send } from 'lucide-react'
import { Button, Card, SectionTitle, Toggle } from '@/components/ui/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { iosSansInstallation, useNotifications } from '@/lib/notifications.ts'

export function ReglageNotifications() {
  const identite = useIdentite()
  const { etat, occupe, erreur, choix, activer, desactiver, changerChoix, essayer } =
    useNotifications()

  // Rien tant qu'on ne sait pas : voir `useIdentite`. Un panneau qui dit
  // « connecte-toi » puis se transforme en réglages fait clignoter la page.
  if (etat === 'inconnu' || identite === undefined) return null

  // Serveur sans clés VAPID : le réglage n'a pas d'objet. On ne le montre pas
  // plutôt que de le montrer grisé — un interrupteur grisé invite à chercher
  // comment le dégriser, et il n'y a rien à trouver côté joueur.
  if (etat === 'indisponible') return null

  return (
    <Card className="p-5">
      <SectionTitle hint="Sur cet appareil uniquement.">
        <span className="flex items-center gap-2">
          <Bell size={16} className="text-accent" aria-hidden />
          Notifications
        </span>
      </SectionTitle>

      {etat === 'impossible' ? (
        <p className="text-sm leading-relaxed text-muted">
          {iosSansInstallation() ? (
            <>
              Sur iPhone et iPad, les notifications ne fonctionnent qu’une fois l’application
              installée. Touche le bouton de partage, puis «&nbsp;Sur l’écran d’accueil&nbsp;», et
              reviens ici depuis l’icône.
            </>
          ) : (
            <>Ce navigateur ne sait pas recevoir de notifications.</>
          )}
        </p>
      ) : !identite ? (
        <p className="text-sm leading-relaxed text-muted">
          Il faut un compte : une invitation s’adresse à quelqu’un.
        </p>
      ) : etat === 'refuse' ? (
        <p className="text-sm leading-relaxed text-muted">
          Les notifications ont été refusées pour ce site. Le navigateur ne redemandera pas — il
          faut les réautoriser dans ses réglages, à côté de l’adresse du site.
        </p>
      ) : etat === 'actif' ? (
        <>
          <p className="flex items-center gap-2 text-sm text-ink">
            <BellRing size={15} className="text-accent" aria-hidden />
            Cet appareil est prévenu.
          </p>

          <div className="mt-2 divide-y divide-line">
            <Toggle
              checked={choix.invitations}
              onChange={(value) => void changerChoix({ ...choix, invitations: value })}
              label="Quand quelqu’un t’attend"
              description="Une partie proposée, une demande d’ami, un coup joué contre toi en correspondance."
            />
            <Toggle
              checked={choix.defiDuJour}
              onChange={(value) => void changerChoix({ ...choix, defiDuJour: value })}
              label="Défi du jour"
              description="Un rappel en fin de journée, si tu n’y as pas encore touché."
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Send size={14} />}
              disabled={occupe}
              onClick={() => void essayer()}
            >
              Envoyer un essai
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<BellOff size={14} />}
              disabled={occupe}
              onClick={() => void desactiver()}
            >
              Ne plus recevoir
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Être prévenu quand un ami t’invite à jouer, et rappelé du défi du jour. Rien d’autre :
            ni actualités, ni relances.
          </p>
          <Button
            className="mt-3"
            size="sm"
            icon={<Bell size={14} />}
            disabled={occupe}
            onClick={() => void activer()}
          >
            Activer les notifications
          </Button>
        </>
      )}

      {erreur && (
        <p
          className="mt-3 rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] px-3 py-2 text-sm text-[var(--q-blunder)]"
          role="alert"
        >
          {erreur}
        </p>
      )}
    </Card>
  )
}
