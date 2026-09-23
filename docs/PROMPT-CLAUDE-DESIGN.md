# Prompt — Claude Design

> À coller dans Claude Design. Joindre si possible des captures actuelles de
> l'accueil, de `/jouer/ordinateur` et de l'écran de partie, sur mobile, dans
> les deux thèmes : elles valent mieux qu'une description.

---

Tu conçois l'interface de **Le Coup Parfait**, une application web d'échecs
libre, gratuite, sans publicité, installable sur téléphone (PWA). Sa
promesse : **« Les échecs, enfin expliqués »**. Quand le joueur se trompe,
l'application lui dit en français ce qu'il a raté, avec les mots des joueurs
(fourchette, clouage, mat du couloir), et un coach le lui lit à voix haute.

## Pour qui

- **Priorité 1 :** le débutant complet, adulte ou adolescent, qui n'a jamais
  joué en club et qu'un écran chargé fait fuir.
- **Priorité 2 :** le joueur de 800 à 1 600 Elo qui veut progresser et
  cherche ce qu'il doit travailler.
- Usage à 70 % sur téléphone, d'une main, souvent par séances de 5 à 15
  minutes. Le PC doit rester confortable.

## Ce qui existe et qu'on garde

- **Deux thèmes seulement.**

  |                 | « Sombre » (par défaut) | « Clair » |
  | --------------- | ----------------------- | --------- |
  | Fond            | `#0e0f1f`               | `#f3f2f8` |
  | Surface         | `#1c1e33`               | `#ffffff` |
  | Texte           | `#f2f1f8`               | `#14141c` |
  | Violet d'action | `#7c5cff`               | `#5b3ce0` |

  Le sombre a un fond « aurore » discret.

- **Le violet est réservé à l'action** : bouton principal, sélection, onglet
  actif. Rien d'autre.
- **Une teinte par rubrique**, posée uniquement sur la pastille d'icône, jamais
  sur toute la carte :

  | Rubrique    | Sombre    | Clair     |
  | ----------- | --------- | --------- |
  | Jouer       | `#5b8def` | `#2f6ad9` |
  | Apprendre   | `#00e5a8` | `#00926e` |
  | S'entraîner | `#ff7a59` | `#d4562f` |
  | Analyser    | `#22c4d8` | `#0e8fa3` |
  | Communauté  | `#ef5da8` | `#c73d86` |
  | Outils      | `#f2c14e` | `#a8790a` |

- **Typographies :** Bricolage Grotesque pour les titres, Geist pour le texte.
- **Arrondis :** 12, 18, 28 et 36 px. Icônes lucide.
- **Pas de contour dégradé sur les cartes**, pas de couleur secondaire par
  carte.
- **Ton :** tutoiement, phrases courtes et concrètes, jamais de jargon
  marketing.
- **Sept adversaires-personnages** en portraits de cavaliers stylisés 3D :
  Pion, Brasier, Rempart, Éclair, Mirage, Boussole, Oracle. Chacun a un style
  de jeu. Ils répartissent 18 niveaux, de 100 à 3 200 Elo.

## Le problème à résoudre

L'application fait beaucoup (leçons, paliers, carrière, séances, puzzles,
finales, analyse, ouvertures, tournois, amis…) et **ça se voit trop** :

1. Il y a trois programmes pour progresser (Leçons, Palier, Carrière) et le
   joueur ne sait pas lequel suivre.
2. Il y a cinq façons de jouer contre l'ordinateur. Sur l'écran de réglage,
   le choix de l'adversaire se fait par trois contrôles à la fois : portraits,
   curseur de niveau et puces « Je débute / Club / Sans pitié ».
3. Les icônes mélangent trois familles : emojis pour les cadences, glyphes
   Unicode pour la couleur, lucide ailleurs.
4. La barre mobile a six onglets : Accueil, Jouer, Apprendre, S'entraîner,
   Analyse, Plus.
5. Plusieurs échelles de niveau (Elo des adversaires, palier, classement,
   rang de carrière) s'affichent sans lien visible entre elles.

## Ce que je te demande

Propose une **direction** puis maquette ces écrans, **mobile 390×844
d'abord**, puis leur version bureau 1440 px, dans le thème sombre. Le thème
clair n'est demandé que pour l'accueil et l'écran de partie.

1. **Accueil visiteur.** Un seul appel principal, « Par où commencer ? »,
   qui mène soit à la première leçon, soit au test de niveau (six minutes,
   douze positions). En second : jouer tout de suite. Le défi du jour reste
   visible et doit se jouer sans compte.
2. **Accueil connecté : « Ton chemin ».** Un seul fil conducteur qui fusionne
   palier et carrière. On y voit où j'en suis (mon palier parmi six :
   0-600, 600-1000, 1000-1300, 1300-1600, 1600-1800, 1800+), la prochaine
   chose à faire (leçon, séance ou puzzle), ma série de jours et le défi du
   jour. **Une seule échelle de niveau visible**, celle des paliers, les
   autres nombres étant rangés dans le profil.
3. **« Contre l'ordinateur » : le réglage.** Un seul contrôle pour choisir
   l'adversaire, qui couvre les 18 niveaux avec les 7 personnages. Ensuite,
   couleur (icônes, pas d'emoji), cadence (8 choix : 3, 5, 5+3, 10, 10+5,
   15+10, 30 min, sans limite), et deux options : « partie classée » et
   « commenter chaque coup ». L'option « séance avec thème et bilan » remplace
   l'ancienne entrée séparée. Le tout doit tenir sans défilement, ou presque,
   sur 390×844, avec un bouton « Commencer » fixe en bas.
4. **Écran de partie.** L'échiquier est maximal. Les deux barres joueur
   portent pendule, portrait du personnage et son nom, **sans** « Stockfish ».
   Viennent ensuite un ruban des coups et une barre d'actions : Options,
   Indice, Annuler, et Abandonner discret avec confirmation. Montre aussi
   l'état « mode commenté » : trois meilleures options, flèche sur
   l'échiquier et bouton de réécoute de la voix.
5. **Navigation.** Une barre mobile à **cinq onglets** au plus (propose la
   répartition), et l'en-tête bureau équivalent. « Plus » regroupe
   communauté, outils, compte et réglages.
6. **Mini-système de composants** issu de ces écrans : bouton principal et
   secondaire, carte de destination (pastille teintée, titre, une ligne,
   flèche), en-tête de page unique pour toutes les rubriques, puce, segment,
   interrupteur, barre joueur, carte d'adversaire.

## Contraintes

- Accessibilité **WCAG AA** en contraste dans les deux thèmes. Cibles
  tactiles de 44 px minimum. Tout doit rester utilisable au clavier.
- Aucune animation indispensable : tout doit rester lisible avec
  `prefers-reduced-motion`.
- L'arabe, l'hébreu et le persan retournent l'interface (RTL). Évite ce qui
  casse en miroir, et prévois des libellés **30 % plus longs** (allemand).
- Pas de nouvelle couleur hors de celles ci-dessus, sauf les états
  succès / erreur / avertissement si tu les justifies.
- Une interface calme : plus d'espace, moins de cartes. Si un écran a plus de
  six cartes, c'est qu'il faut regrouper.

## Ce que j'attends en retour

1. Une page de direction : trois principes en une phrase chacun, avec ce que
   tu as retiré et pourquoi.
2. Les maquettes ci-dessus, annotées sur les choix non évidents.
3. La liste des composants avec leurs états (repos, survol, focus, actif,
   désactivé).
4. Les questions que tu te poses et que je devrais trancher.
