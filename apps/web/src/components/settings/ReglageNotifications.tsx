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
import { useT } from '@/lib/i18n/index.tsx'

export function ReglageNotifications() {
  const t = useT()
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
      <SectionTitle hint={t('notifications.thisDeviceOnly')}>
        <span className="flex items-center gap-2">
          <Bell size={16} className="text-accent" aria-hidden />
          {t('notifications.title')}
        </span>
      </SectionTitle>

      {etat === 'impossible' ? (
        <p className="text-sm leading-relaxed text-muted">
          {t(iosSansInstallation() ? 'notifications.iosNeedsInstall' : 'notifications.unsupported')}
        </p>
      ) : !identite ? (
        <p className="text-sm leading-relaxed text-muted">{t('notifications.needsAccount')}</p>
      ) : etat === 'refuse' ? (
        <p className="text-sm leading-relaxed text-muted">{t('notifications.refused')}</p>
      ) : etat === 'actif' ? (
        <>
          <p className="flex items-center gap-2 text-sm text-ink">
            <BellRing size={15} className="text-accent" aria-hidden />
            {t('notifications.active')}
          </p>

          <div className="mt-2 divide-y divide-line">
            <Toggle
              checked={choix.invitations}
              onChange={(value) => void changerChoix({ ...choix, invitations: value })}
              label={t('notifications.whenWaiting')}
              description={t('notifications.whenWaitingHint')}
            />
            <Toggle
              checked={choix.defiDuJour}
              onChange={(value) => void changerChoix({ ...choix, defiDuJour: value })}
              label={t('notifications.dailyChallenge')}
              description={t('notifications.dailyChallengeHint')}
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
              {t('notifications.sendTest')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<BellOff size={14} />}
              disabled={occupe}
              onClick={() => void desactiver()}
            >
              {t('notifications.stop')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">{t('notifications.blurb')}</p>
          <Button
            className="mt-3"
            size="sm"
            icon={<Bell size={14} />}
            disabled={occupe}
            onClick={() => void activer()}
          >
            {t('notifications.enable')}
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
