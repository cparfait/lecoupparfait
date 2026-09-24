# Maquettes — « L'échiquier calme »

Copie des planches du canevas de design
(https://claude.ai/artifact/PJ68xXdux9LxErwu71sMFw), validées le 24 septembre 2026. Chaque `.dc.html` est une planche : HTML statique et une petite classe
`Component` qui calcule les valeurs. Les couleurs y sont écrites en clair ;
dans l'application, elles passent par les jetons de `globals.css`.

| Planche                    | Écran                                                |
| -------------------------- | ---------------------------------------------------- |
| `Direction.dc.html`        | principes, ce qu'on retire, décisions                |
| `Composants.dc.html`       | boutons, cartes, en-tête, barre joueur, abandon      |
| `AccueilVisiteur.dc.html`  | accueil sans compte                                  |
| `TonChemin.dc.html`        | accueil connecté (palier + carrière + rang)          |
| `ContreOrdinateur.dc.html` | réglage : échelle de 18 adversaires, options         |
| `Partie.dc.html`           | écran de partie (prop `commente` : panneau du coach) |
| `TonCheminBureau.dc.html`  | accueil connecté, 1 440 px                           |
| `PartieBureau.dc.html`     | partie, 1 440 px                                     |
| `BarreOnglets.dc.html`     | barre mobile à cinq onglets                          |
| `Echiquier.dc.html`        | échiquier de maquette (pas celui de l'application)   |

Décisions : cinq onglets (Accueil, Jouer, Progresser, Analyser, Plus) ; rang
de carrière dans « Ton chemin » ; l'échelle des adversaires défile ; le moteur
reste nommé en second plan ; le coach est un panneau fixe sous l'échiquier
sur téléphone.
