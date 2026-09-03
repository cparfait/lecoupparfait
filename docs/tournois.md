# Tournois — cahier des charges

État : **l'arène est implémentée**, constaté le 3 septembre 2026.
Ce document a d'abord été une étude préalable ; il décrit maintenant ce qui
existe, et signale en fin de page ce qui a été tranché autrement que prévu.

Ce qui tourne aujourd'hui : `packages/db/src/tournaments.ts` (création,
inscription, appariement, points, classement), la boucle d'arènes du serveur
temps réel (`apps/server/src/index.ts`, qui bat toutes les trois secondes), et
trois écrans — `/tournois`, `/tournois/[slug]`, `/tournois/ordinateur`.
`scripts/check-tournoi.mjs` couvre l'appariement et le barème de points.

## Ce qu'on veut, et ce qu'on ne veut pas

Un tournoi n'a d'intérêt qu'avec **du monde en même temps**. Une arène à trois
joueurs est un salon d'attente déguisé. C'est le seul vrai prérequis, et il ne
dépend pas du code : tant que Le Coup Parfait sert un cercle d'amis qui jouent
quand ils peuvent, un tournoi restera vide.

On écarte d'emblée :

- **Les tournois à élimination directe.** Ils demandent que tout le monde soit
  présent à l'heure dite, et qu'un absent soit remplacé ou éliminé. Beaucoup de
  règles pour un usage rare.
- **Les tournois par équipes.** Ils supposent des équipes, donc une notion de
  groupe qui n'existe pas ici et qu'il faudrait inventer avant.

Restent deux formats, dans cet ordre de priorité.

## Format 1 — l'arène

Le format de Lichess, et le seul qui tolère qu'on arrive en retard ou qu'on
parte avant la fin. **C'est ce qui le rend praticable pour un cercle d'amis.**

- Une durée fixe : le tournoi dure 45 minutes, pas un nombre de rondes.
- On rejoint quand on veut, on quitte quand on veut.
- Dès qu'une partie finit, on est réapparié presque aussitôt.
- Le classement se fait aux points, avec un mécanisme de série : deux victoires
  d'affilée doublent la valeur des suivantes. C'est ce qui empêche de jouer
  petit bras en tête du classement.

**Appariement.** Le plus proche disponible au classement, en évitant de
réapparier deux joueurs qui viennent de s'affronter. Un simple tri par
classement sur la file d'attente suffit ; il n'y a pas besoin d'un algorithme
suisse.

## Format 2 — le suisse

Pour une soirée annoncée à l'avance, avec un nombre de rondes fixe. Plus juste,
mais il faut être présent à chaque ronde et attendre la fin de toutes les
parties avant d'apparier la suivante. **À ne faire qu'après l'arène**, si le
besoin se manifeste.

## Ce qu'il faudrait en base

Trois tables. Aucune n'existe.

```
tournaments        id, slug, name, ownerId, format ('arena'|'swiss'),
                   startsAt, durationMinutes, initialTime, increment,
                   rated, status ('scheduled'|'running'|'finished')

tournament_players tournamentId, userId, score, streak, joinedAt, active
                   -- `active` : le joueur est-il en file d'attente ?
                   --  On ne le retire pas de la table quand il fait une
                   --  pause, sinon il perdrait ses points.

tournament_pairings tournamentId, round, whiteId, blackId, gameSlug, result
                   -- `gameSlug` renvoie vers un salon temps réel ordinaire :
                   --  un tournoi n'a pas besoin de son propre moteur de partie.
```

## Ce qu'il faudrait côté serveur

Le point délicat, et la raison pour laquelle ce chantier est plus gros qu'il
n'en a l'air : **un tournoi est un processus qui vit sans que personne ne le
regarde.** Tout le reste de l'application réagit à une requête ; là, il faut
une boucle qui tourne toutes les quelques secondes pour :

1. démarrer les tournois dont l'heure est venue ;
2. apparier les joueurs en attente ;
3. constater les parties finies et attribuer les points ;
4. clore le tournoi à l'heure dite.

Cette boucle vit naturellement dans le serveur temps réel (`apps/server`), qui
tient déjà les salons en mémoire et sait quand une partie se termine — il
émet déjà un événement `end`. C'est le seul endroit où le brancher sans
dupliquer d'état.

**Conséquence à ne pas oublier :** il ne doit y avoir **qu'un seul** processus
qui apparie. Deux instances du serveur créeraient deux fois les mêmes paires.
Si l'on passe un jour à plusieurs instances, il faudra un verrou en base.

## Ce qu'il faudrait côté web

- `/tournois` — la liste : à venir, en cours, terminés.
- `/tournois/[slug]` — le classement en direct, le bouton « rejoindre », et le
  renvoi automatique vers sa partie dès qu'on est apparié. Le guetteur de défis
  (`ChallengeWatcher`) fait déjà exactement ce transport-là : il faudrait
  l'étendre plutôt que d'en écrire un second.
- Une notification à l'ouverture du tournoi, pour ceux qui s'y sont inscrits.

## Estimation honnête

C'est le plus gros des chantiers restants — nettement plus que les études.
L'essentiel du travail n'est pas l'interface mais la boucle d'appariement et
ses cas limites : quelqu'un qui se déconnecte en pleine partie, une partie qui
dépasse la fin du tournoi, un joueur seul en file d'attente, deux joueurs qui
viennent de s'affronter et qu'il ne faut pas réapparier.

**Recommandation.** Ne pas commencer tant qu'il n'y a pas eu, au moins une
fois, six joueurs connectés en même temps. Le jour où cela arrive, faire
l'arène seule, sans le suisse, et sans classement dédié : les points du tournoi
suffisent, inutile de toucher au Glicko.

---

## Ce qui a été tranché autrement

Écrit après coup, en relisant le code qui tourne.

1. **La recommandation d'attendre six joueurs n'a pas été suivie**, et c'est
   sans regret : l'arène a été écrite avant, et elle est prête le jour où le
   monde arrivera. L'avertissement reste vrai — une arène à trois joueurs est
   un salon d'attente déguisé —, et l'écran le dit désormais lui-même, sous la
   liste.

2. **Le tournoi contre l'ordinateur n'était pas prévu du tout.** Il est né de
   la même remarque prise à l'envers : puisqu'un tournoi entre humains demande
   du monde, on en a fait un qui n'en demande pas. Trois à sept adversaires
   artificiels, un calendrier, un classement — c'est aujourd'hui le seul
   tournoi qu'on peut jouer seul, et de loin le plus joué. Il vit dans
   `packages/core/src/tournoi-solo.ts`, hors de la base : rien à synchroniser.

3. **Le format suisse n'est pas fait**, comme recommandé. Il reste hors
   périmètre.

4. **La boucle d'arènes suppose une seule instance du serveur.** Deux
   processus créeraient deux fois les mêmes paires. Un verrou consultatif
   PostgreSQL autour de l'appariement serait nécessaire avant toute mise à
   l'échelle — c'est écrit dans le code, et c'est répété au README, rubrique
   « Ce que ça ne fait pas ».

5. **Le guetteur de défis a bien été étendu** plutôt que dupliqué, comme le
   document le suggérait : `ChallengeWatcher` transporte vers sa partie aussi
   bien un défi accepté qu'un appariement d'arène.

Reste ouvert :

- **la notification à l'ouverture du tournoi** n'est pas envoyée. Le mécanisme
  existe pourtant — c'est celui des invitations —, il n'est simplement pas
  branché sur le démarrage d'une arène ;
- **pas de classement dédié aux tournois**, comme recommandé : les points de
  l'arène suffisent, et le Glicko n'est pas touché.
