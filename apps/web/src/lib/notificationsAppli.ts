'use client'

/**
 * Les notifications dans l'appli Android.
 *
 * La WebView de l'appli n'a ni `PushManager` ni `Notification` : le push du
 * navigateur n'y existe pas. L'appli embarque à la place le module
 * `@capacitor/push-notifications`, qui obtient un jeton Firebase pour le
 * téléphone et affiche lui-même les messages reçus. Ce fichier en est la
 * traduction pour le site : `notifications.ts` s'en sert quand il tourne dans
 * l'appli, et garde son état, ses textes et ses réglages tels quels.
 */

import { moduleNatif } from './appliAndroid.ts'

type Permission = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'

interface Ecoute {
  remove: () => Promise<void>
}

/** Ce qu'on utilise de `@capacitor/push-notifications`. */
interface PluginNotifications {
  checkPermissions(): Promise<{ receive: Permission }>
  requestPermissions(): Promise<{ receive: Permission }>
  register(): Promise<void>
  createChannel(canal: {
    id: string
    name: string
    importance: 1 | 2 | 3 | 4 | 5
    visibility?: -1 | 0 | 1
    vibration?: boolean
  }): Promise<void>
  addListener(
    evenement: 'registration',
    rappel: (jeton: { value: string }) => void,
  ): Promise<Ecoute>
  addListener(
    evenement: 'registrationError',
    rappel: (erreur: { error: string }) => void,
  ): Promise<Ecoute>
  addListener(
    evenement: 'pushNotificationActionPerformed',
    rappel: (action: { notification: { data?: Record<string, unknown> } }) => void,
  ): Promise<Ecoute>
}

export function pluginNotifications(): PluginNotifications | null {
  return moduleNatif<PluginNotifications>('PushNotifications')
}

export async function permissionAppli(plugin: PluginNotifications): Promise<Permission> {
  return (await plugin.checkPermissions()).receive
}

/**
 * Le jeton Firebase du téléphone.
 *
 * `register()` ne le rend pas : il arrive par l'événement `registration`, qu'il
 * faut donc écouter avant d'appeler. Quinze secondes au plus — sans réseau ni
 * services Google, l'événement ne viendrait jamais et le bouton tournerait
 * sans fin.
 */
export async function jetonAppli(plugin: PluginNotifications): Promise<string> {
  let resoudre: (jeton: string) => void = () => undefined
  let rejeter: (erreur: Error) => void = () => undefined
  const jeton = new Promise<string>((ok, ko) => {
    resoudre = ok
    rejeter = ko
  })
  const ecoutes = [
    await plugin.addListener('registration', ({ value }) => resoudre(value)),
    await plugin.addListener('registrationError', ({ error }) => rejeter(new Error(error))),
  ]
  const delai = setTimeout(() => rejeter(new Error('registration timeout')), 15_000)
  try {
    await plugin.register()
    return await jeton
  } finally {
    clearTimeout(delai)
    for (const ecoute of ecoutes) void ecoute.remove()
  }
}

/** Les noms de canaux, dans la langue de la page. */
export interface NomsDeCanaux {
  invitation: string
  ami: string
  correspondance: string
  defiDuJour: string
}

/**
 * Crée les canaux Android, un par fil de notification.
 *
 * Depuis Android 8, chaque notification appartient à un canal que la personne
 * règle à part dans les paramètres du téléphone : couper le rappel du jour
 * sans perdre les invitations, par exemple. Les identifiants sont les `fil`
 * que le serveur envoie. Recréer un canal existant ne fait que mettre son nom
 * à jour, d'où un appel à chaque activation, dans la langue du moment.
 *
 * L'importance suit l'urgence : une invitation expire en cinq minutes et doit
 * s'afficher par-dessus l'écran ; un rappel du jour peut attendre qu'on
 * regarde ses notifications.
 */
export async function creerCanaux(plugin: PluginNotifications, noms: NomsDeCanaux) {
  await Promise.all([
    plugin.createChannel({
      id: 'invitation',
      name: noms.invitation,
      importance: 4,
      vibration: true,
    }),
    plugin.createChannel({ id: 'correspondance', name: noms.correspondance, importance: 4 }),
    plugin.createChannel({ id: 'ami', name: noms.ami, importance: 3 }),
    plugin.createChannel({ id: 'defi-du-jour', name: noms.defiDuJour, importance: 3 }),
  ])
}

let toucherBranche = false

/**
 * Ouvre la bonne page quand on touche une notification.
 *
 * Le module natif garde l'événement jusqu'à ce qu'on l'écoute : une
 * notification touchée alors que l'appli était fermée arrive donc ici, une
 * fois le site chargé. Seul un chemin du site est suivi — le message vient de
 * notre serveur, mais une adresse d'ailleurs n'a rien à faire dans l'appli.
 */
export function brancherToucher(naviguer: (chemin: string) => void) {
  const plugin = pluginNotifications()
  if (!plugin || toucherBranche) return
  toucherBranche = true
  void plugin.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = notification.data?.url
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) naviguer(url)
  })
}
