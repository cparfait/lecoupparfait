/**
 * Le travailleur de service.
 *
 * Il ne met rien en cache. C'est délibéré : l'application charge un moteur
 * WebAssembly de plusieurs mégaoctets, des modèles de réseau de neurones et
 * une base de puzzles, et un cache écrit à la va-vite servirait un jour une
 * version du plateau qui ne parle plus à une version du moteur. Next gère déjà
 * ses propres en-têtes de cache, et ils sont bons.
 *
 * Ce fichier n'existe donc que pour une chose : **recevoir les notifications**.
 * Un navigateur refuse d'abonner une page qui n'a pas de travailleur de
 * service, parce que la notification doit pouvoir arriver alors que plus aucun
 * onglet n'est ouvert — c'est justement le cas intéressant, celui où un ami
 * vous invite pendant que le téléphone est dans une poche.
 *
 * Il est écrit en JavaScript ordinaire, servi tel quel depuis `public/` : le
 * faire passer par la compilation ajouterait une étape pour un fichier de
 * cinquante lignes qui ne dépend de rien.
 */

/*
  Prise de fonction immédiate.

  Sans ces deux lignes, une version corrigée du travailleur reste « en
  attente » jusqu'à ce que tous les onglets soient fermés — sur un téléphone où
  l'application reste ouverte des semaines, cela veut dire jamais.
*/
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

/*
  Un gestionnaire de requêtes qui ne fait rien — et qui sert à quelque chose.

  Ne pas appeler `respondWith` laisse le navigateur suivre son chemin habituel :
  aucune requête n'est détournée, rien n'est mis en cache. Sa seule fonction est
  d'exister, parce que c'est ce que les navigateurs vérifient avant de proposer
  « ajouter à l'écran d'accueil ». Ils reconnaissent d'ailleurs ce cas et
  court-circuitent le travailleur pour ne pas payer le détour à chaque requête.

  La tentation serait d'en profiter pour mettre l'application en cache. Voir
  l'en-tête du fichier : on ne le fait pas, et ce n'est pas un oubli.
*/
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  /*
    Toujours afficher quelque chose.

    L'abonnement est pris en `userVisibleOnly: true` : le navigateur exige une
    notification visible pour chaque message reçu, et sanctionne — jusqu'à
    couper l'abonnement — celui qui reçoit sans rien montrer. Un message
    illisible vaut donc mieux qu'un silence.
  */
  let charge = {}
  try {
    charge = event.data ? event.data.json() : {}
  } catch {
    charge = {}
  }

  const titre = charge.titre || 'Le Coup Parfait'
  const options = {
    body: charge.corps || 'Quelque chose vous attend.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    lang: 'fr',
    // La vibration ne se déclenche que sur les appareils qui en ont une, et
    // reste courte : c'est une invitation aux échecs, pas une alarme.
    vibrate: [80, 40, 80],
    data: { url: charge.url || '/' },
    /*
      Un fil par sorte de notification.

      `tag` fait qu'une nouvelle notification remplace la précédente du même
      fil au lieu de s'empiler. Trois invitations en deux minutes doivent
      laisser une ligne dans le volet, pas trois.
    */
    tag: charge.fil || 'coupparfait',
    renotify: charge.fil === 'invitation',
  }

  event.waitUntil(self.registration.showNotification(titre, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = (event.notification.data && event.notification.data.url) || '/'

  /*
    Réutiliser l'onglet déjà ouvert plutôt qu'en ouvrir un autre.

    Quelqu'un qui a l'application au premier plan et qui touche la
    notification s'attend à voir sa page changer, pas à se retrouver avec deux
    copies de l'application — et sur téléphone, la seconde repartirait de zéro,
    moteur WebAssembly compris.
  */
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.includes(new URL(cible, self.location.origin).pathname)) {
          return fenetre.focus()
        }
      }
      const premiere = fenetres[0]
      if (premiere && 'navigate' in premiere) {
        return premiere.navigate(cible).then((f) => (f ? f.focus() : undefined))
      }
      return self.clients.openWindow(cible)
    }),
  )
})
