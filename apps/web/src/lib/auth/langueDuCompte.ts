'use client'

/**
 * Attache la langue choisie au compte, quand il y en a un.
 *
 * La langue est d'abord une préférence de navigateur, et elle le reste : la
 * plateforme s'utilise sans compte, et tout ce qui n'existerait qu'en base
 * disparaîtrait pour la moitié de ceux qui s'en servent.
 *
 * Mais quand un compte existe, elle lui appartient aussi. On la demande au
 * formulaire d'inscription, et il faut donc pouvoir la corriger : sans cela,
 * changer de langue dans les préférences n'aurait d'effet que sur l'appareil du
 * moment, et se connecter ailleurs aurait ramené celle de l'inscription — un
 * réglage de compte qu'on ne peut modifier que d'un seul endroit.
 *
 * L'envoi est **sans attente et sans bruit** : c'est un réglage d'affichage,
 * déjà appliqué localement, et rien de ce qu'on voit à l'écran n'en dépend. Un
 * serveur injoignable ne doit pas produire un message d'erreur pour un clic sur
 * un drapeau ; la prochaine modification repartira.
 */

export function enregistrerLangueDuCompte(locale: string): void {
  void fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'langue', locale }),
  }).catch(() => {
    // Sans compte, sans réseau, ou serveur éteint : la préférence locale a déjà
    // pris, c'est elle qui compte à l'écran.
  })
}
