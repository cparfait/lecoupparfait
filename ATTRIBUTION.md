# Attribution des ressources

Le Coup Parfait réutilise des ressources graphiques et sonores libres. Chacune reste
la propriété de son auteur et conserve sa licence d’origine, reproduite ici
comme ces licences l’exigent.

## Jeux de pièces

Récupérés depuis [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece).

| Jeu (Le Coup Parfait) | Dossier d’origine | Auteur                      | Licence           |
| --------------------- | ----------------- | --------------------------- | ----------------- |
| `staunton`            | `piece/cburnett`  | Colin M. L. Burnett         | GPL-2.0-or-later  |
| `merida`              | `piece/merida`    | Armando Hernandez Marroquin | GPL-2.0-or-later  |
| `alpha`               | `piece/alpha`     | les auteurs de lila         | AGPL-3.0-or-later |
| `chessnut`            | `piece/chessnut`  | Alexis Luengas              | Apache-2.0        |
| `fantasy`             | `piece/fantasy`   | Maurizio Monge              | MIT               |
| `celtic`              | `piece/celtic`    | Maurizio Monge              | MIT               |
| `spatial`             | `piece/spatial`   | Maurizio Monge              | MIT               |
| `rhosgfx`             | `piece/rhosgfx`   | RhosGFX                     | CC0-1.0           |
| `pixel`               | `piece/pixel`     | therealqtpi                 | AGPL-3.0-or-later |
| `letter`              | `piece/letter`    | usolando                    | AGPL-3.0-or-later |

> Les jeux de pièces publiés sous licence **CC BY-NC-SA** (usage non commercial)
> ont été délibérément écartés : leur clause non commerciale est incompatible
> avec une redistribution libre du projet.

## Identité visuelle

Cavale — le cavalier de la marque — est dessiné pour le projet et n’emprunte
rien : `components/brand/LogoMark.tsx` et `public/brand/logo.svg` sont du
vectoriel écrit à la main.

Les onze visuels de `public/brand/cavale-*.png` et
`public/brand/adversaires/*.png` sont **générés localement** par
`scripts/build-cavale.mjs`, qui pilote une installation ComfyUI. Le prompt, la
graine, le modèle et les réglages sont versionnés dans ce script : l’image se
rejoue à l’identique, et rien n’est téléversé nulle part.

| Composant                    | Auteur              | Licence                  |
| ---------------------------- | ------------------- | ------------------------ |
| Juggernaut XL (Ragnarök)     | RunDiffusion        | CreativeML Open RAIL++-M |
| BiRefNet-General (détourage) | Peng Zheng _et al._ | MIT                      |
| ComfyUI                      | Comfy Org           | GPL-3.0-or-later         |

> `RMBG-2.0`, plus connu pour le détourage, a été écarté : son dépôt est fermé
> et sa licence interdit l’usage commercial, ce qui ne se marie pas avec une
> redistribution libre.

## Bruitages

| Fichiers       | Auteur                                                             | Licence           |
| -------------- | ------------------------------------------------------------------ | ----------------- |
| `sounds/*.mp3` | [Enigmahack](https://github.com/Enigmahack) et les auteurs de lila | AGPL-3.0-or-later |

## Données

| Jeu de données                       | Source                                                                      | Licence       |
| ------------------------------------ | --------------------------------------------------------------------------- | ------------- |
| Ouvertures ECO (3 810 entrées)       | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | CC0-1.0       |
| Base de puzzles (6 057 356 entrées)  | [database.lichess.org](https://database.lichess.org/)                       | CC0-1.0       |
| Base d’évaluations (394 M positions) | [database.lichess.org](https://database.lichess.org/)                       | CC0-1.0       |
| Tables de finales Syzygy (API)       | [tablebase.lichess.ovh](https://tablebase.lichess.ovh/)                     | libre d’accès |

## Drapeaux

| Fichiers                | Auteur                                                                   | Licence |
| ----------------------- | ------------------------------------------------------------------------ | ------- |
| `public/drapeaux/*.svg` | Panayiotis Lipiridis ([flag-icons](https://github.com/lipis/flag-icons)) | MIT     |

> Ils servent uniquement de vignettes dans le sélecteur de langue. Une langue
> n’est pas un pays : celles qu’aucun drapeau ne représente honnêtement —
> l’arabe, l’espagnol, le portugais — n’en portent aucun, et affichent les deux
> premières lettres de leur nom à la place. Voir l’en-tête de
> `lib/i18n/langues.ts`.
>
> Des images et non des émojis, parce que Windows n’embarque aucune police de
> drapeaux et affiche les deux lettres du code régional à leur place — ce qui
> ressemble à un défaut d’affichage.

## Moteur

| Composant                             | Auteur                       | Licence          |
| ------------------------------------- | ---------------------------- | ---------------- |
| Stockfish 18 (natif, serveur)         | les auteurs de Stockfish     | GPL-3.0-or-later |
| Stockfish 18 WebAssembly (navigateur) | Nathan Rugg (`stockfish.js`) | GPL-3.0-or-later |

C’est cette dépendance à Stockfish qui impose au projet une licence de la
famille GPL ; Le Coup Parfait est donc publié sous **AGPL-3.0-or-later**.
