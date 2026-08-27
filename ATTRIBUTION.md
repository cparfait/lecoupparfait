# Attribution des ressources

Le Coup Parfait réutilise des ressources graphiques et sonores libres. Chacune reste
la propriété de son auteur et conserve sa licence d’origine, reproduite ici
comme ces licences l’exigent.

## Jeux de pièces

Récupérés depuis [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece).

| Jeu (Le Coup Parfait) | Dossier d’origine | Auteur | Licence |
| --- | --- | --- | --- |
| `staunton` | `piece/cburnett` | Colin M. L. Burnett | GPL-2.0-or-later |
| `merida` | `piece/merida` | Armando Hernandez Marroquin | GPL-2.0-or-later |
| `alpha` | `piece/alpha` | les auteurs de lila | AGPL-3.0-or-later |
| `chessnut` | `piece/chessnut` | Alexis Luengas | Apache-2.0 |
| `fantasy` | `piece/fantasy` | Maurizio Monge | MIT |
| `celtic` | `piece/celtic` | Maurizio Monge | MIT |
| `spatial` | `piece/spatial` | Maurizio Monge | MIT |
| `rhosgfx` | `piece/rhosgfx` | RhosGFX | CC0-1.0 |
| `pixel` | `piece/pixel` | therealqtpi | AGPL-3.0-or-later |
| `letter` | `piece/letter` | usolando | AGPL-3.0-or-later |

> Les jeux de pièces publiés sous licence **CC BY-NC-SA** (usage non commercial)
> ont été délibérément écartés : leur clause non commerciale est incompatible
> avec une redistribution libre du projet.

## Bruitages

| Fichiers | Auteur | Licence |
| --- | --- | --- |
| `sounds/*.mp3` | [Enigmahack](https://github.com/Enigmahack) et les auteurs de lila | AGPL-3.0-or-later |

## Données

| Jeu de données | Source | Licence |
| --- | --- | --- |
| Ouvertures ECO (3 810 entrées) | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | CC0-1.0 |
| Base de puzzles (6 057 356 entrées) | [database.lichess.org](https://database.lichess.org/) | CC0-1.0 |
| Base d’évaluations (394 M positions) | [database.lichess.org](https://database.lichess.org/) | CC0-1.0 |
| Tables de finales Syzygy (API) | [tablebase.lichess.ovh](https://tablebase.lichess.ovh/) | libre d’accès |

## Moteur

| Composant | Auteur | Licence |
| --- | --- | --- |
| Stockfish 18 (natif, serveur) | les auteurs de Stockfish | GPL-3.0-or-later |
| Stockfish 18 WebAssembly (navigateur) | Nathan Rugg (`stockfish.js`) | GPL-3.0-or-later |

C’est cette dépendance à Stockfish qui impose au projet une licence de la
famille GPL ; Le Coup Parfait est donc publié sous **AGPL-3.0-or-later**.
