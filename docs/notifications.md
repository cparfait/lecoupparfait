# Les notifications

Le Coup Parfait envoie deux notifications, et jamais rien d'autre :

- **une invitation** — quelqu'un de ton carnet te propose une partie ;
- **le rappel du défi du jour**, une fois par jour, en fin d'après-midi, et
  seulement si tu ne l'as pas déjà résolu.

Pas de relance « ça fait longtemps », pas d'annonce de nouveauté, pas de
notification pour un coup joué en correspondance. Les deux se coupent
séparément, dans **Préférences → Notifications**.

## Pourquoi c'est ce qui manquait

Un défi entre amis expire au bout de cinq minutes. Jusqu'ici, le destinataire ne
l'apprenait qu'en ayant l'application ouverte : la bannière d'invitation vient
d'une interrogation du serveur toutes les quatre secondes, qui ne tourne que
dans un onglet vivant. Une invitation lancée à quelqu'un qui avait son téléphone
dans sa poche mourait sans que personne ne l'ait vue — et celui qui l'avait
lancée en concluait que l'autre ne voulait pas jouer.

## Installer l'application

Les notifications arrivent aussi bien dans un onglet ordinaire, **sauf sur
iPhone et iPad** : Safari ne les autorise qu'à une application installée sur
l'écran d'accueil. Bouton de partage, puis « Sur l'écran d'accueil ».

Sur Android et sur ordinateur, le navigateur propose l'installation de lui-même.

## Mettre en service

Rien n'est envoyé tant que le serveur n'a pas sa paire de clés. Tant qu'elle
manque, le réglage n'apparaît pas dans les préférences — plutôt que de proposer
un abonnement qui ne recevrait jamais rien.

```bash
npm run vapid
```

Le script écrit `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` dans `.env`. Puis :

```bash
docker compose up -d web server
```

Les deux conteneurs lisent les clés au démarrage : **rien à reconstruire**. La
clé publique n'a délibérément pas le préfixe `NEXT_PUBLIC_`, parce qu'elle n'est
jamais lue par le code du navigateur — il la demande à `/api/notifications`.

### Ne regénère pas la paire sans raison

Un abonnement est lié à la clé publique avec laquelle il a été pris. Changer de
clé rend muets tous les appareils déjà abonnés, **sans qu'ils le sachent** : ils
se croient abonnés et ne reçoivent plus rien. Le script refuse donc d'écraser
des clés existantes à moins qu'on insiste avec `--force`.

### Deux réglages facultatifs

```ini
# L'adresse que Google ou Mozilla utilisent pour joindre l'exploitant du serveur
# en cas de problème d'envoi. Jamais montrée aux joueurs. Par défaut, MAIL_FROM.
VAPID_SUBJECT=mailto:admin@coupparfait.example

# Heure locale du rappel du défi, sur 24 h. Hors de [0, 23] : pas de rappel.
DEFI_RAPPEL_HEURE=18
```

L'heure est celle **du joueur**, pas celle du serveur : le fuseau du navigateur
est enregistré avec l'abonnement. Dix-huit heures à Paris pour l'un, dix-huit
heures à Montréal pour l'autre.

## Vérifier que ça marche

Le bouton **« Envoyer un essai »**, dans les préférences, envoie une
notification à l'appareil depuis lequel on clique. Il ne sert pas qu'à
rassurer : la permission accordée et la notification reçue sont deux choses
différentes — un mode « ne pas déranger », un blocage au niveau du système, une
application non installée sous iOS. Sans lui, on ne le découvre qu'au moment où
l'on rate une invitation.

## Ce que le serveur sait de toi

Une ligne par appareil abonné, dans `push_subscriptions` : l'adresse fabriquée
par le service de messagerie de ton navigateur, deux clés de chiffrement, tes
deux choix, et ton fuseau horaire. Rien d'autre.

Le contenu des notifications est **chiffré pour ton navigateur** : Google,
Mozilla ou Apple les relaient sans pouvoir les lire. Ils savent qu'un message
part de ce serveur vers cet appareil, et c'est tout ce qu'ils sauront jamais.

« Ne plus recevoir » supprime la ligne. Supprimer son compte aussi.

## Où c'est écrit

| Rôle | Fichier |
| --- | --- |
| Travailleur de service (réception, clic) | `apps/web/public/sw.js` |
| Abonnement, côté navigateur | `apps/web/src/lib/notifications.ts` |
| Réglage dans les préférences | `apps/web/src/components/settings/ReglageNotifications.tsx` |
| API d'abonnement | `apps/web/src/app/api/notifications/route.ts` |
| Envoi d'une invitation | `apps/web/src/lib/server/push.ts` |
| Rappel du défi du jour | `apps/server/src/rappels.ts` |
| Table des abonnements | `packages/db/src/push.ts` |

Le rappel quotidien vit dans le **serveur temps réel** et non dans
l'application web : il doit partir vers quelqu'un qui n'est justement pas venu,
donc depuis le seul processus qui tourne en permanence. Il y côtoie la boucle
des arènes, pour la même raison.
