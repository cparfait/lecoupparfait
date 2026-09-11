# Audit graphique — inventaire et journal

Journal de la mission « rendu irréprochable sur téléphone » (voir
`PROMPT-OPTIM-GRAPHIQUE.md`). Ce fichier est la mémoire du travail : ce qui a
été constaté, corrigé, laissé de côté, et pourquoi. Il se lit de haut en bas et
doit permettre de reprendre sans relire le code.

Ouvert le 2 septembre 2026. État du dépôt au départ : `main` sur `e04eca7`,
deux fichiers modifiés non commités qui ne sont pas de ce chantier
(`apps/web/src/lib/server/push.ts`, `docs/notifications.md`) — on ne les touche
pas.

## Comment on constate

- Serveur de dev sur le port 3000 (libre ce jour), volet navigateur intégré en
  émulation d'appareil. Le volet se masque entre deux actions : dans cet état,
  `requestAnimationFrame` et les minuteries ne tournent plus, et les mesures
  passent par `MessageChannel` ou du code synchrone.
- Les six résolutions de référence : 360×640, 390×844, 430×932, 844×390,
  768×1024, 1024×768. Le volet rend 390×844 à `devicePixelRatio` 2, et
  n'émule pas le 3.
- Une émulation n'est pas un téléphone. Les points qui exigent un vrai
  appareil sont listés en fin de fichier.

---

## Lot 1 — Échiquier 2D : inventaire (phase 0)

Fichiers lus en entier : `Board2D.tsx`, `ChessBoard.tsx`,
`PromotionPicker.tsx`, `boardKit.ts`, `ArrowLegend.tsx`, `globals.css`,
`lib/store/preferences.ts`, `app/layout.tsx`, `components/Providers.tsx`, et
le montage du plateau dans `app/jouer/ordinateur/page.tsx`.

Sévérités : **bloquant** (le critère d'acceptation est faux), **gênant**
(visible ou mesurable sur un appareil réel), **cosmétique**.

### B1 — Aucune pièce ne glisse : la clé React d'une pièce est sa case — bloquant

`boardKit.ts:354-357` :

```ts
pieces.push({
  id: square,
  square,
```

et `Board2D.tsx:704` : `key={piece.id}`. Une pièce qui va de e7 en e5 est
donc, pour React, la disparition de la clé `e7` et l'apparition de la clé
`e5` : l'ancien nœud est démonté, un nouveau est monté déjà en place, et la
transition `transform` de `Board2D.tsx:720` n'a jamais rien à animer.

**Constaté** sur `/jouer/ordinateur` à 390×844 : nœud du pion e7 marqué,
coup e7-e5 joué, puis `isConnected === false` sur le nœud marqué et un nœud
neuf en e5. Le réglage « durée d'animation » des préférences et le
`animationMs={420}` que la page pose sur le coup de l'adversaire
(`page.tsx:1868`) sont sans effet en 2D. Le commentaire de `boardKit.ts:351`
annonce que l'animation « est gérée séparément, en connaissant le coup joué » ;
ce code n'existe pas.

Conséquence : on ne voit pas _quelle_ pièce a bougé, seulement que la
position a changé — exactement ce que l'auteur du réglage voulait éviter.

Correction prévue : donner aux pièces une identité stable d'une position à
l'autre, sans connaître les règles — apparier chaque pièce de la nouvelle
position à une pièce de l'ancienne (même case et même figure d'abord, puis
`lastMove` pour la pièce déplacée, puis même couleur et même figure la plus
proche pour le roque, la prise en passant et la promotion). C'est de la
présentation, pas de la logique de jeu.

À vérifier après correction : rafale de coups (l'animation précédente
s'interrompt sans fantôme), retour arrière, pré-coup qui part, promotion
(la pièce glisse puis change d'image), roque (les deux pièces glissent).

### B2 — Le glisser-déposer re-rend les 64 cases à chaque mouvement du doigt — gênant (bloquant à 4× de ralentissement)

`Board2D.tsx:443-446` : chaque `pointermove` fait `setDrag({...})` et
`setHoverSquare(...)`. Le plateau entier est rendu de nouveau — les 64 cases
(`Board2D.tsx:591-608`, écrites en ligne, sans composant mémoïsé), les 32
pièces, les surlignages, la couche SVG. `relativePoint`
(`Board2D.tsx:267-274`) lit en plus `getBoundingClientRect()` à chaque
événement, sur une mise en page que le rendu précédent vient de salir.

**Mesuré** sur `/puzzles` à 390×844, 60 `pointermove` espacés d'une tâche :

|                                                          |         |
| -------------------------------------------------------- | ------- |
| coût par `pointermove`, processeur de bureau non ralenti | 5,1 ms  |
| budget d'une image à 60 i/s                              | 16,7 ms |

À 4× de ralentissement, on dépasse le budget : le glisser saccade sur un
milieu de gamme. Le même chemin sert au tracé de flèche (`setDraft`,
`Board2D.tsx:435`).

Correction prévue : sortir les cases dans un composant mémoïsé qui ne dépend
que de la case, de l'habillage et du projecteur ; déplacer la pièce traînée
par une écriture directe de `style.transform` sur son nœud (via une
référence) au lieu de passer par l'état ; ne poser `hoverSquare` que quand la
case change ; mémoriser le rectangle du plateau au `pointerdown`.

### B3 — Le plateau ne tient pas dans l'écran en paysage, et ne regrandit pas après une rotation — bloquant

`ChessBoard.tsx:127-148`, mode `fitParentHeight` : la hauteur disponible est
lue sur le parent. Le commentaire (`ChessBoard.tsx:62-65`) affirme que « le
calcul ne boucle pas : le conteneur tient sa hauteur du partage flex ». C'est
vrai au-dessus de `lg` (1024 px), où la grille de `jouer/ordinateur` a une
hauteur imposée (`page.tsx:1782`). En dessous, les colonnes s'empilent, le
parent tient sa hauteur de son contenu — c'est-à-dire du plateau lui-même.
La mesure est circulaire : le plateau peut rétrécir, jamais regrandir.

**Constaté** :

| fenêtre                              | plateau                    | page                                                  |
| ------------------------------------ | -------------------------- | ----------------------------------------------------- |
| 844×390 (paysage téléphone)          | 344–384 px                 | hauteur défilable 902 px : le plateau sort de l'écran |
| 768×1024, après passage par 1024×768 | 466 px sur 752 disponibles | le plateau est resté à la taille du paysage           |

En paysage, le repli `calc(100dvh - reservedHeight - toggleRow)` donnerait
206 px, sous le plancher `MIN_BOARD_PX = 260` (`ChessBoard.tsx:77`) : même
sans la circularité, la page défilerait. La disposition à deux colonnes en
paysage relève du lot 3 ; la mesure circulaire, elle, est ici.

Correction prévue : n'appliquer la mesure du parent que lorsque celui-ci a une
hauteur qui ne dépend pas de son contenu (la détecter plutôt que la supposer),
et sinon retomber sur la borne en `dvh`. À revoir avec le lot 3 pour le
paysage.

### B4 — La bascule 2D/3D et le plein écran ont des cibles de 32 px — gênant

`ChessBoard.tsx:275` et `:292` : `h-8 w-8`. **Mesuré** à 390×844 : 32×32 px
pour « Vue 2D », « Vue 3D », dans la barre d'actions de la page de jeu. La
règle est 44×44 sur mobile. Le conteneur en pilule peut garder son dessin ;
c'est la zone cliquable qui doit grandir (marge négative ou pseudo-élément),
sans changer la charte.

### B5 — Le plein écran est proposé là où il n'existe pas — gênant sur iPhone

`ChessBoard.tsx:160-174` : le bouton appelle `requestFullscreen` et avale le
refus. Safari iOS ne propose le plein écran que sur `<video>` : le bouton ne
fait rien, sans un mot. Il devrait ne pas s'afficher quand
`document.fullscreenEnabled` est faux (lecture après montage, pas pendant le
rendu — voir B9). Non constaté (pas d'iPhone), déduit de la plateforme.

### B6 — Le sélecteur de promotion et le surlignage pulsé ne respectent pas `data-effects='low'` — gênant

- `PromotionPicker.tsx:372` et `:415` : `backdrop-blur-[2px]` sur le voile.
  La règle `[data-effects='low']` de `globals.css:776-781` ne coupe le flou
  que sur `.glass` et `.glass-strong` ; ici il reste, sur un plateau entier,
  au moment où l'on doit choisir vite.
- `Board2D.tsx:952` : les cases mises en avant par l'analyse pulsent en
  boucle infinie en animant `box-shadow` (`pulse-ring`,
  `globals.css:690-694`) — une propriété de peinture, pas de composition.
  Tant que le commentaire affiche des motifs, le plateau se repeint sans
  arrêt. Le sillage (`MoveTrail`) et les ondes du mat sont déjà conditionnés
  à `effects === 'high'` (`Board2D.tsx:619`, `:678`) ; la pulsation ne l'est
  pas.
- `Board2D.tsx:706` : `will-change-transform` sur les 32 pièces en permanence,
  soit 32 couches de composition tenues en mémoire GPU même quand rien ne
  bouge. À restreindre à la pièce qui bouge ou à retirer en mode léger.

### B7 — Annoter l'échiquier n'est possible qu'à la souris — gênant, arbitrage demandé

`Board2D.tsx:338` : flèches et cercles ne se tracent qu'au bouton droit
(`event.button === 2`) et les couleurs se choisissent au clavier
(`shiftKey`, `altKey`, `ctrlKey`). Aucun geste tactile n'y mène. C'est un
« état qui ne s'atteint qu'à la souris », mais l'ajouter est une fonction
nouvelle (appui long puis glisser, par exemple), pas une correction de rendu.
**Question posée** avant de décider.

### B8 — Le focus clavier sur le plateau est invisible — gênant (accessibilité)

`Board2D.tsx:488-534` : les flèches déplacent `focusSquare`, Entrée
sélectionne, mais rien à l'écran ne montre la case qui a le focus. Le plateau
reçoit `outline-none` (`Board2D.tsx:581`). Un utilisateur au clavier joue à
l'aveugle. Pas une régression, mais le critère « focus visible » est faux
aujourd'hui. Correction : un anneau sur `focusSquare` quand le plateau a
`:focus-visible`.

### B9 — Lectures de `window` au montage, avec un premier rendu faux — cosmétique

- `ChessBoard.tsx:115-122` : `compact` part à `false`, donc le premier rendu
  sur téléphone réserve 40 px pour la rangée de boutons, retirés après
  l'effet. Décalage possible au premier affichage. **Mesuré** sur `/puzzles`
  à 390×844 : CLS 0 — le plateau y est monté après le chargement du puzzle,
  hors du chemin critique. À surveiller sur les pages qui montent le plateau
  dès le serveur.
- `fitSide` (`ChessBoard.tsx:99`) part à `null` : première image sur la borne
  en `dvh`, seconde sur la mesure. Même remarque.
- Hydratation : les préférences (habillage, jeu de pièces, coordonnées) sont
  lues pendant le rendu via `usePreferences()`. **Constaté** : aucune erreur
  d'hydratation en console sur `/` ni sur `/puzzles` avec un habillage et un
  jeu de pièces non par défaut — les plateaux y sont montés côté client.
  Point ouvert, pas défaut.

### B10 — Ordre des couches — cosmétique, à constater

- Les coordonnées (`z-[15]`, `Board2D.tsx:987`) passent **au-dessus** des
  pièces (`z-10`, `Board2D.tsx:722`). Visible à 390×844 : la lettre de
  colonne mord sur le bas de la tour du coin. Sur les diagrammes imprimés, le
  repère est sous la pièce.
- La pastille de verdict (`Board2D.tsx:924-931`) vit dans la couche de
  surlignage, sans `z-index`, donc sous les pièces (`z-10`) : débordant sur le
  coin haut-droit de sa case, elle sera masquée par une pièce posée sur la
  case voisine. À constater en mode commenté avant de trancher.
- Le sillage (`MoveTrail`, `z-20`) passe au-dessus des pièces ; probablement
  voulu (il est à 45 % d'opacité), on ne touche pas.

### B11 — `usePreferences()` sans sélecteur — cosmétique

`Board2D.tsx:206` : le plateau s'abonne à tout le magasin. Tout réglage
modifié (volume, voix, langue) re-rend le plateau. Sans effet en partie ;
noté pour ne pas l'aggraver. Pas de « pendule » dans ce magasin : les
pendules vivent dans l'état de la page, et `Board2D` est `memo` — les props
sont stables tant que la position ne change pas.

### B12 — Petites choses vues en lisant — cosmétique

- `Board2D.tsx:633-634`, `:646`, `:927` : couleurs littérales (bleu du
  pré-coup, anneau de survol, fond blanc de la pastille). Antérieures à ce
  chantier ; le plateau a sa propre palette (`BOARD_SKINS`), qui est
  volontairement hors thème. On n'en ajoute pas ; on ne les retire pas.
- `Board2D.tsx:750` : `title` sur les cases d'arrivée (sûreté du coup),
  sans équivalent tactile — mais la couleur porte déjà l'information, et
  `ArrowLegend.tsx:596-625` la légende. Rien à faire.
- `Board2D.tsx:578` : `role="grid"` sans `role="row"` autour des cellules.
  Structure ARIA incomplète ; ne bloque rien.
- `ChessBoard.tsx:184` et `:201` : `100vh`/`100vw` en plein écran. Dans
  l'API plein écran, l'élément _est_ la fenêtre et il n'y a pas de barre
  d'adresse : `vh` y est juste. `dvh` ne coûte rien et évite un faux positif
  aux recherches futures.
- `globals.css` ne définit nulle part `-webkit-tap-highlight-color` : sur
  Android, chaque bouton tapé s'illumine d'un rectangle gris système
  (bascule de vue, sélecteur de promotion, barre d'actions). Une ligne
  globale, qui profite à tous les lots.
- `PromotionPicker.tsx:387` et `:437` : `slide-up` en `fill-mode: both`, en
  ligne. Sous `prefers-reduced-motion`, la règle globale
  (`globals.css:790-799`) ramène la durée à 0,01 ms, et l'animation
  _finit_ visible : pas le piège documenté. Rien à faire.

### Ce qui a été cherché et non trouvé

- `100vh` hors plein écran : aucun. Le corps est en `min-height: 100dvh`
  (`globals.css:466`), la coque en `min-h-dvh`.
- Animation de pièce par `left`/`top` : aucune, les pièces sont en
  `translate()` sur `left: 0; top: 0` (`Board2D.tsx:709-720`).
- Liserés entre cases : **non constatés** à 390×844 (cases de 46,75 px,
  dpr 2) ni à 430×932 (61,25 px). Le volet ne sait ni zoomer ni émuler
  dpr 3 : point ouvert pour un appareil réel.
- Défilement horizontal dû au plateau : aucun. Celui qu'on a vu vient de
  l'en-tête (voir H1).
- `touch-action` : `touch-none` sur le plateau (`Board2D.tsx:581`),
  `manipulation` sur `html` (`globals.css:436`), `-webkit-touch-callout: none`
  via `.no-select`. Correct.
- Flèches SVG : `viewBox 0 0 100 100`, aucune coordonnée en pixels
  (`Board2D.tsx:1053-1057`). Correct.

---

---

## Lot 2 — Échiquier 3D : inventaire et journal

Fichiers lus : `Board3D.tsx`, `pieceGeometry.ts`. Vérifications faites à
1024×768 (rendu complet) et 390×844 (rendu léger, `useMobileGPU`).

### Ce qui était déjà en place, et vérifié

- `dpr` plafonné à `[1, 2]` en rendu complet, 1 en léger ; `antialias` et
  `powerPreference` conditionnés ; ombres, ombres de contact, `clearcoat`,
  `transmission`, `sheen` coupés en léger ; 20 segments de révolution au lieu
  de 48. Le rendu léger est imposé sur pointeur grossier et écran étroit
  (`useMobileGPU`), indépendamment du nombre de cœurs.
- Géométries partagées et mises en cache par (figure, qualité) : douze pour
  toute la partie.
- Aucun HDRI ni fichier réseau : fond dégradé peint en mémoire.
- Contexte perdu : `preventDefault` sur `webglcontextlost`, message et deux
  sorties (réessayer, revenir en 2D).
- `three` chargé en différé (`next/dynamic`, `ssr: false`). **Constaté** en
  dev : sur `/puzzles` en vue 2D, aucun des paquets `node_modules_three_*`
  n'est chargé (seul le petit paquet d'enveloppe de `Board3D.tsx` l'est).
  Production : vérification par le manifeste en cours.
- Cadrage : le canevas est carré (`min(largeur, hauteur)`) et la caméra est
  calculée pour y faire tenir le plateau — **constaté** à 390×844 : canevas
  374 × 374, plateau entier visible, pas de défilement horizontal.
- Fuites : dix bascules 2D → 3D → 2D laissent un seul `<canvas>` et une
  mémoire JS qui revient (35 → 44 → 41 Mo). **Constaté** à 390×844.

### C1 — Rendu continu à 60 images par seconde — bloquant, corrigé (`1e7e537`)

**Mesuré** avant : 264 appels de dessin par image, en continu, échiquier
immobile. Trois causes cumulées : `frameloop` par défaut ; `Board3D` non
mémoïsé alors que la page se re-rend dix fois par seconde (pendule) ; et
`play` dans `useChessGame` (`lib/game/useChessGame.ts:173`) qui changeait
d'identité à chaque rendu de la page — dépendant de `options`, objet
littéral recréé, et de `state`, reconstruit —, ce qui cassait le `memo` des
deux échiquiers. Corrigé par `frameloop="demand"`, `invalidate()` depuis
chaque pièce tant qu'elle glisse (coupé au millième), `memo` sur `Board3D`,
et lecture des options et de l'état par référence dans `play`.

**Mesuré** après : 0 appel de dessin sur deux fenêtres de 4 s au repos,
pendule qui tourne ; 1 884 pendant un coup et la réponse du moteur, puis 0.

### C2 — Aucune pièce ne glissait en 3D non plus — bloquant, corrigé (`0b23bcd`)

Même clé-par-case qu'en 2D ; l'interpolation de `Piece3D` n'avait jamais
rien à faire. Réutilise `reconduireIdentites`, et pose la position au
montage seulement (passée en propriété, R3F la réappliquait et la pièce
sautait). **Constaté** : après h7-h6, aucun objet créé ni détruit, le même
groupe passé de (−3,5 ; 2,5) à (−3,5 ; 1,5).

### C3 — Sans WebGL, plantage au lieu d'un message — gênant, corrigé (`cac92d3`)

Vérification de `getContext('webgl2' | 'webgl')` après montage ; message et
bouton « Passer en 2D ». **Constaté** en forçant `getContext` à `null`.

### Choisi de ne pas faire

- `InstancedMesh` pour les pions et matériaux partagés : non mesuré comme
  goulot ; les appels de dessin ne sont plus qu'au coup. On ne touche pas.
- L'arc du cavalier annoncé dans l'en-tête du fichier n'existe pas ; ce
  n'est pas un défaut de rendu, on ne l'ajoute pas.
- `alpha: true` sur le contexte, inutile avec un fond opaque : non mesuré.
- Le curseur `pointer` posé sur `document.body` au survol d'une pièce peut
  rester si le plateau se démonte pendant un survol — cosmétique, souris
  seulement.
- `usePreferences()` sans sélecteur dans `Scene` et `Piece3D` : pas d'effet
  mesuré.

### Ce qui demande un vrai appareil

- ≥ 30 i/s en rendu léger sur un milieu de gamme : le volet n'émule pas le
  GPU.
- Le picking au doigt sur le canevas (R3F sur `pointerdown`/`click`) et le
  vol du défilement par `OrbitControls` (`touch-action: none` sur le
  canevas, comme `touch-none` en 2D).

---

## Lot 3 — HUD de partie : inventaire (phase 0)

Fichiers lus : `EvalBar`, `PlayerBar`, `MoveList`, `GameNav`,
`TurnIndicator`, `GameOverDialog`, `RubanCoups` ; `LiveCommentary` survolé
(pas de conteneur défilant, une `Card` en flux) ; mise en page de
`jouer/ordinateur` (`page.tsx:1781-2260`), `jouer/partie/[slug]:518`,
`jouer/local:196`. Constats à 360×640, 390×844, 844×390.

### Déjà en place, vérifié

- Pendules et compteurs en `tabular-nums` (`PlayerBar.tsx:136`, `EvalBar`,
  `MoveList`, `RubanCoups`). Rien ne tremble.
- `MoveList` : conteneur `min-h-0 flex-1 overflow-y-auto`, `overscroll-contain`
  seulement à partir de `lg` — le fichier explique pourquoi (`:209-220`) ;
  défilement interne calculé à la main pour ne jamais faire bouger le
  document.
- `GameOverDialog` : `fixed inset-0` sans ancêtre transformé. **Constaté** à
  360×640 après abandon : voile sur toute la fenêtre, boîte centrée (centre
  184 × 333 pour 367 × 653), opaque. (La première capture la montrait
  translucide : c'était l'animation `slide-up` figée par le volet masqué,
  pas un défaut.)
- Le plateau ne suit plus les re-rendus de `LiveCommentary` ni de la
  pendule : `memo` et `play` stable (lot 2, C1).
- Portrait 360×640 et 390×844 : rien ne déborde, rien ne se chevauche ;
  l'en-tête collant recouvre le haut du plateau au défilement, ce qui est
  attendu (il est opaque à 72 % et flouté).

### D1 — `EvalBar` anime `height` et `width` — gênant

`EvalBar.tsx:53` (`transition-[width]`) et `:85` (`transition-[height]`) :
une propriété de mise en page animée une demi-seconde à chaque coup. À
remplacer par `transform: scaleY()` / `scaleX()` sur un remplissage
`inset-0` avec l'origine en bas / à gauche. Le libellé se place déjà par
classe selon le camp qui mène, il n'en dépend pas.

### D2 — En paysage sur téléphone, plateau de 260 px et tout empilé — bloquant

**Constaté** à 844×390 : plateau de 260 px (plancher) centré entre deux
marges vides de 290 px, pendules au-dessus et au-dessous, barre d'actions
et liste des coups sous la ligne de flottaison (page de 726 px). La grille
à deux colonnes n'existe qu'à partir de `lg` (`page.tsx:1782`).

Prévu : une variante `paysage` (orientation paysage et hauteur ≤ 540 px)
qui impose la hauteur de la grille (`100dvh − 5rem`) et donne à la colonne
du plateau la largeur de cette hauteur ; les pendules et la barre d'actions
quittent la colonne du plateau pour la colonne de droite, par zones de
grille (`grid-template-areas`) et non par duplication de composants. Le
plateau y fait alors `hauteur − rangée de bascule` ≈ 274 px à 390 de haut,
entièrement visible, la liste des coups à côté.

### D3 — Cibles tactiles sous 44 px dans le HUD — gênant

**Mesuré** à 360×640 : flèches de `RubanCoups` 36 × 36 (`:120`, `:176`),
commandes de `MoveList` 36 × 32 (`NavButton`, `:354`), `GameNav` 32 × 32
(`:131`, `:186`), barre du pouce 43 px de haut, boutons d'en-tête 36 × 36
(lot 4). À porter à 44 au pointeur grossier, comme la bascule du lot 1.

### D4 — `TurnIndicator` pulse une ombre en boucle — cosmétique

`TurnIndicator.tsx:37` : `pulse-ring` infini, propriété de peinture, tant
que c'est à nous de jouer. Petit élément, repeint en continu. À réserver au
mode spectaculaire comme les autres pulsations.

### D5 — Aucune zone sûre en haut, ni sur les côtés — bloquant en mode installé

`viewport-fit: cover` est déclaré (`layout.tsx:77`) et `.safe-top` existe
(`globals.css:807`) mais **n'est utilisé nulle part** : l'en-tête collant
(`AppShell.tsx:92`, `h-14`) commence sous la barre d'état et l'encoche en
mode installé sur iPhone (`statusBarStyle: black-translucent`). Seule la
barre du bas a `safe-bottom`. Les pages immersives (`jouer/*`,
`puzzles/*`, `apprendre/*`) n'ont aucun rembourrage bas : en installé, la
barre du pouce passe sous la barre de gestes. En paysage, rien ne protège
des encoches latérales. Déduit de la plateforme, non constaté (pas
d'appareil) ; corrigé dans la coque, remonté du lot 4.

### Journal du lot 3

| #   | commit                                                                                               | constaté                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | `EvalBar` en `transform`                                                                             | `scaleY(0.5)`, origine en bas, transition sur `transform` seul (1024×768, évaluation affichée) |
| D4  | pastille du trait sans pulsation en mode léger                                                       | `animation-name: none` sous `data-effects='low'`                                               |
| D5  | zones sûres dans la coque (en-tête, côtés, bas des écrans immersifs)                                 | `env()` vaut 0 dans le volet : sans régression, à voir sur iPhone                              |
| D3  | cibles ≥ 44 px au pointeur grossier (ruban, liste, navigation, barre du pouce, panneau électronique) | 360×640 : plus rien sous 44 px dans la page de partie, hors en-tête                            |
| D2  | `.grille-partie` (zones nommées, hauteurs calées bordure comprise) sur `jouer/ordinateur`            | 844×390 : plateau 273 px entier, page 390 ; 1024×768 : page 768 (777 avant)                    |
| D2  | même grille sur `jouer/local` et `jouer/partie/[slug]`                                               | 844×390 : plateau 297 px entier, page 390 ; 1024×768 : 768                                     |

Ce que ces corrections ont pu casser, revérifié : portrait 390×844 inchangé
sur les trois pages (plateau 374 px, tout empilé) ; la bascule 2D / 3D
reste accessible en paysage par la barre d'actions (le plateau cède sa
rangée) ; `fitParentHeight` sur les deux pages qui ne l'avaient pas se
replie sur la borne en `dvh` en portrait (B3).

### Choisi de ne pas faire (lot 3)

- `LiveCommentary` (47 Ko) : pas de conteneur défilant à corriger ; ses
  re-rendus ne touchent plus le plateau. Pas de découpage « parce qu'il est
  gros ».
- Les `title` des commandes de navigation doublent des `aria-label` et des
  raccourcis clavier : rien de porté par le survol seul.

---

## Lot 4 — Le reste de l'interface : inventaire (phase 0)

Balayage à 360×640 de 25 routes publiques (`/`, `puzzles`, `puzzles/rush`,
`apprendre`, `apprendre/echiquier`, `carriere`, `analyse`, `preferences`,
`tournois`, `tournois/ordinateur`, `classement`, `jouer`, `jouer/ami`,
`jouer/regarder`, `ouvertures`, `finales`, `etudes`, `vision`, `glossaire`,
`statistiques`, `editeur`, `connexion`, `a-propos`, `credits`, `amis`,
`correspondance`), mesure de la largeur défilable, des éléments qui
dépassent le bord droit et des images sans dimensions.

- **Aucun défilement horizontal** sur les 25 (largeur défilable = fenêtre).
  Les seuls éléments au-delà du bord sont les puces des filtres de
  `puzzles` et les onglets de `preferences`, dans des rangées qui défilent
  horizontalement — voulu.
- **Aucune image sans dimension** (toutes portent `h-`/`w-` ou des
  attributs).
- Les écrans réservés (études, statistiques, correspondance, amis) montrent
  leur invitation à se connecter, centrée, sans débordement.

### E1 — En paysage, les pages à échiquier hors partie le coupent — gênant

**Mesuré** à 844×390 : `apprendre/echiquier` plateau 260 px, bas à 401 ;
`editeur` bas à 399 ; `ouvertures` bas à 435 ; `puzzles` haut à 245 (les
puces de filtres passent sur deux rangées), bas à 505. La barre de
navigation du bas (67 px) recouvre en plus le bas de l'écran sur les pages
non immersives. Traitement : la barre du bas disparaît en paysage (le menu
de l'en-tête reste), puis chaque page à échiquier reçoit sa disposition
paysage, dans l'ordre `puzzles`, `apprendre/[lessonId]`, `editeur`,
`ouvertures`, `finales`, `puzzles/rush`, `analyse`.

**E1 corrigé** : barre du bas retirée en paysage ; classes `.etude*` dans
`globals.css` ; `fitParentHeight` et un cadre autour du plateau sur les
cinq pages ; l'en-tête des pages à plusieurs blocs (`puzzles`, leçon) tient
sur une ligne. **Constaté** à 844×390, plateau entier et page sans
défilement : puzzles 273 px, leçon 277, éditeur 260, ouvertures 260,
finales 265. Portrait et 1024×768 inchangés.

`puzzles/rush` en manche, **constaté** à 844×390 : plateau de 260 px de
113 à 373, entier ; la légende passe sous le bord (page de 417 px). Laissé
ainsi.

`analyse` avec une partie chargée, **constaté** à 844×390 avant : plateau
de 260 px de 144 à 404, dix pixels sous le bord, page qui défile. La
disposition « page d'étude » y a d'abord été essayée puis retirée : la
colonne du plateau porte aussi la navigation, la courbe et le bilan, qui
ne tiennent pas dans 390 px — le plateau passait par-dessus. **Corrigé
ensuite** par une grille à zones propre à la page (`.grille-analyse`) : en
paysage le plateau à gauche, navigation et courbe en haut à droite, la
colonne qui défile dessous, le bilan et les pastilles d'en-tête retirés
(la colonne donne le résumé). **Constaté** : plateau 273 px de 109 à 382,
page sans défilement ; portrait et 1024×768 inchangés.

E3 **corrigé** : l'expression « immersive » ne retient plus que les écrans
où l'on joue ; `jouer/ami` retrouve sa barre du bas (**constaté** à
360×640).

Quatre thèmes : la page de partie revue en aurora, club, clair et contraste,
en portrait et en paysage ; les corrections n'introduisent aucune couleur
littérale hors le jaune des flèches tactiles, qui rejoint la palette des
annotations (elle-même hors thème, comme le damier). L'anneau de focus
prend `--accent` : jaune en contraste, violet ailleurs.

Tablette 768×1024 : `/`, `apprendre` sans débordement, disposition
empilée avec la barre du bas — c'est celle du téléphone, plus large.

Sélecteur de promotion, **constaté** à 360×640 sur une position composée
(pion blanc en g7) : colonne des quatre pièces déroulée depuis g8, voile
flouté de 2 px en mode spectaculaire, choix du cavalier joué (`g8=♘`).
Les boutons font 43 × 43 px à cette largeur (un huitième du plateau) —
44 dès 368 px de large ; laissé ainsi, la colonne doit rester calée sur
la case d'arrivée.

CLS au chargement, **mesuré** (`layout-shift` en tampon) : 0 sur `/`,
`/puzzles`, `/apprendre/echiquier`, `/jouer`.

Changement de thème en 3D : le thème ne touche pas la scène (le damier
suit `boardStyle`, pas `theme`) ; un changement de damier recrée la seule
texture de fond et la libère, le canevas garde sa clé. Vérifié dans le
code, pas à l'écran.

### E2 — Cibles de l'en-tête à 36 px — gênant

Thème, préférences, menu : 36 × 36 (`AppShell.tsx:137-166`). Au pointeur
grossier, 44.

**Corrigé**, avec un détour : passer les boutons à 44 px faisait déborder
la barre de 24 px à 360 (**mesuré**, largeur défilable 391) — le fichier
prévenait que cinq commandes y tiennent à 36. On agrandit la zone qui
répond au doigt par un pseudo-élément (`.cible-doigt`, `inset: -4px` au
pointeur grossier), pas le dessin. **Constaté** : largeur défilable égale
à la fenêtre, `::after` en place sur les quatre commandes.

### E3 — `jouer/ami` et `jouer/regarder` privés de barre du bas — cosmétique

L'expression `^/(jouer|puzzles|apprendre)/[^/]+` (`AppShell.tsx:86`) traite
toute sous-page comme immersive : les écrans de choix de cadence et de
liste des parties en direct perdent la navigation du bas sans raison. Non
corrigé (arbitrage produit, hors rendu) ; noté.

## Hors lot 1, mais bloquant — remonté

### H1 — L'en-tête déborde de l'écran entre 768 et ~900 px — bloquant

`components/layout/AppShell.tsx:125` : la navigation principale apparaît dès
`md` (768 px) à côté du titre, du thème, des préférences, de « Se connecter »
et du menu. **Mesuré** : largeur défilable 895 px à 768×1024, 887 px à
844×390. C'est le seul défilement horizontal trouvé, et il touche la tablette
en portrait et le téléphone en paysage — deux des quatre cibles. Il sera
traité avant le lot 4, sitôt le lot 1 fermé.

---

## Arbitrages demandés et rendus (2 septembre 2026)

- **B7, annotations au doigt** : l'utilisateur veut un geste tactile, limité
  aux déplacements possibles de la pièce, dans une couleur distincte du coup
  joué et du coup conseillé (orange ou jaune). Retenu : appui long sur une
  pièce → flèches **jaunes** vers ses cases d'arrivée légales. Jaune plutôt
  qu'orange, déjà pris par l'indice.
- **B10, coordonnées** : sous les pièces.
- **H1, en-tête** : à corriger juste après le lot 1, avant la 3D.
- `zzsccreens/` n'est pas à utiliser (demande de l'utilisateur).

## Journal des corrections

Dix commits sur `main`, `cebffe4` → `289f3e0`, non poussés. Chacun passe
`npm run typecheck` et `npm test` (71 vérifications).

| #   | commit                                                                                                                                    | constaté                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| B1  | `cebffe4` — identité des pièces reconduite (`reconduireIdentites`, `boardKit.ts`)                                                         | même nœud DOM avant et après e2-e4, matrice calculée qui glisse de 280,5 à 187 px                       |
| B2  | `d749c0f` — pièce traînée hors de l'état React, cases/pièces/couches mémoïsées                                                            | 1,0 ms par `pointermove` au lieu de 5,1 ; 0,4 ms pour une flèche ; glisser-déposer complet joué (2. d4) |
| B3  | `12e8204` — mesure du parent seulement s'il impose sa hauteur                                                                             | 1024×768 → 466 px, 768×1024 → 726 px, 844×390 → 260 px, 390×844 → 374 px                                |
| B4  | `5c47065` — bascule 44 px au pointeur grossier                                                                                            | 44 × 44 px mesurés en émulation tactile à 390×844                                                       |
| B5  | `d4a6b44` — plein écran caché si `fullscreenEnabled` est faux ; `dvh`/`dvw`                                                               | 3 boutons puis 2 après forçage de `fullscreenEnabled` à faux                                            |
| B10 | `a233360` — coordonnées sous les pièces (`z-[5]`)                                                                                         | `z-index` calculé à 5, pièces à 10                                                                      |
| B8  | `656a440` — anneau de focus clavier                                                                                                       | focus programmatique sans anneau, deux flèches → anneau sur la case                                     |
| B6  | `5c2f753` — `will-change` sur la seule pièce tenue, pulsation en mode spectaculaire seulement, voile de promotion sans flou en mode léger | `will-change: auto` × 32, `backdrop-filter: none` sous `data-effects='low'`                             |
| B12 | `f7afcf8` — `-webkit-tap-highlight-color: transparent` sur `html`                                                                         | valeur calculée `rgba(0, 0, 0, 0)`                                                                      |
| B7  | `289f3e0` — appui long → flèches jaunes vers les coups légaux                                                                             | 450 ms sur e7 : deux flèches vers e6 et e5, pièce non soulevée ; glisser franc : aucune flèche, e5 joué |

Ce que ces corrections ont pu casser, et ce qui a été revérifié :

- B1 : l'éditeur de position et l'analyse (sauts de plusieurs coups) passent
  par le même appariement — les pièces nouvelles reçoivent un identifiant
  neuf, les autres glissent au plus court. Non constaté à l'écran sur
  l'éditeur ; à faire au lot 4.
- B2 : le dépôt d'une pièce repasse par une transition depuis la position
  du doigt — vu en 390×844. Les événements synthétiques envoyés dans la
  même tâche ne reproduisent pas un vrai geste (React n'a pas re-rendu entre
  deux) : les vérifications espacent les événements d'une tâche.
- B3 : en dessous de `lg`, `fitParentHeight` retombe sur la borne en `dvh`,
  ce qui donne 260 px en paysage téléphone — la page défile. C'est le
  plancher voulu ; la disposition paysage est au lot 3.

---

## Bilan au 2 septembre 2026

Vingt-cinq commits de corrections sur `main`, de `cebffe4` à `3e264f9`, non poussés.
`npm run typecheck`, `npm test` (71 vérifications) et `npm run build`
passent sur la pointe, sans avertissement.

### Critères d'acceptation — état

**Mise en page**

- Défilement horizontal : **aucun** sur 25 routes à 360, sur les pages
  vérifiées à 390, 430, 768, 844 et 1024 (l'en-tête qui débordait entre 768
  et 900 est corrigé).
- Encoche et barre de gestes : zones sûres posées (en-tête, côtés, bas des
  écrans immersifs) ; **à constater sur iPhone**, `env()` vaut 0 dans le
  volet.
- `100vh` : plus aucun (les deux du plein écran passés en `dvh`/`dvw`).
- Paysage téléphone, échiquier entier : **vrai** sur les trois pages de
  partie, puzzles, leçon, éditeur, ouvertures, finales, manche
  chronométrée et l'analyse détaillée.
- CLS : 0 mesuré sur `/puzzles` ; non mesuré ailleurs.

**Échiquier**

- Pavage sans liseré : rien vu à dpr 2 ; dpr 3 **à constater** sur
  appareil.
- Pièce animée par `transform` seul : **vrai**, et désormais elle glisse
  réellement (2D et 3D).
- Rafale de coups : transitions CSS interruptibles par construction ; **à
  constater** en blitz sur appareil.
- Glisser au doigt : coût par mouvement divisé par cinq ; défilement, sélection
  et zoom déjà neutralisés ; **à constater** sur appareil.
- Couches alignées : **vrai**, par construction et vu à cinq largeurs.

**Performance**

- 2D à 60 i/s en 4× : non mesuré au profil (le volet n'a pas de ralentisseur
  CPU) ; 1,0 ms par mouvement de glisser sur processeur de bureau.
- 3D : **0 rendu au repos**, constaté ; ≥ 30 i/s **à constater** sur
  appareil.
- `three` hors des paquets initiaux : **vrai**, vérifié sur le manifeste de
  production (39 routes, aucune ne le référence) et en dev.
- Fuites : dix bascules 2D/3D → un seul canevas, mémoire qui revient.
- `data-effects='low'` : plus léger en 2D (will-change, pulsations, flou) et
  en 3D (déjà en place, vérifié).

**Thèmes et accessibilité**

- Quatre thèmes : page de partie revue dans les quatre ; aucune couleur
  littérale nouvelle hors le jaune des annotations tactiles.
- `prefers-reduced-motion` : rien d'ajouté qui ne soit couvert par la règle
  globale ; rien ne dépend d'une animation pour être visible.
- `:hover` porteur d'information : les infobulles doublent des libellés ou
  des `aria-label` ; l'annotation à la souris a un équivalent tactile.
- Cibles ≥ 44 px : **vrai** sur le plateau, sa bascule, le HUD, l'en-tête
  (par zone de toucher élargie).

**Non-régression** : typecheck, tests, build — **vrai**.

### Ce qui reste

- Écrans réservés à un compte (études, statistiques, profil, tournois en
  cours, correspondance, amis) : seule l'invitation à se connecter a été
  vue.

### Ce qui demande un vrai appareil plutôt qu'une émulation

- iPhone : zones sûres en installé (encoche, barre de gestes, côtés en
  paysage), barre d'adresse Safari au défilement, bouton plein écran
  désormais caché, rebond de sur-défilement.
- Android milieu de gamme : 60 i/s pendant un glisser et une animation de
  coup, ≥ 30 i/s en 3D, rectangle de tap neutralisé, appui long sur une
  pièce (le `contextmenu` du système ne doit pas interrompre le pointeur).
- dpr 3 : liserés entre cases.
- Clavier virtuel : aucun formulaire de partie n'est concerné ; les pages de
  connexion n'ont pas été testées avec le clavier ouvert.

## Choisi de ne pas faire

- **B9** : rien — aucune erreur d'hydratation constatée, CLS mesuré à 0 sur
  `/puzzles`. À surveiller au lot 4 sur les pages qui montent un plateau
  côté serveur.
- **B11** : `usePreferences()` sans sélecteur dans `Board2D`. Sans effet
  mesuré en partie (les props sont stables, le composant est `memo`) ; on
  ne sème pas d'optimisation non mesurée.
- **B12, couleurs littérales du plateau** (`rgba(90,140,255,.45)` du
  pré-coup, `#fff` de la pastille de verdict) : antérieures, dans un
  composant dont la palette est volontairement hors thème. On n'en a pas
  ajouté d'autres que le jaune des flèches, qui rejoint la palette des
  annotations.
- **Liserés entre cases** : rien vu en émulation ; pas de correction
  spéculative.

## Lot 1 — état des critères d'acceptation

- Pièce animée par `transform` seul : **vrai, constaté**.
- Rafale de coups : les transitions CSS se recalent d'elles-mêmes sur la
  nouvelle cible ; **à constater** en blitz sur appareil.
- Glisser au doigt sans défilement ni sélection ni zoom : `touch-none`,
  `no-select`, `touch-action: manipulation` déjà là ; coût par mouvement
  divisé par cinq. **À constater** sur appareil.
- Couches alignées à toute taille : SVG en `viewBox`, pourcentages partout ;
  **vrai** par construction, vu à 390, 430, 768, 1024.
- Cibles ≥ 44 px sur le plateau et sa bascule : **vrai**. Le reste des
  cibles de la page (barre d'actions, liste des coups) est au lot 3.
- `data-effects='low'` plus léger en 2D : **vrai, constaté**.
- Focus visible : **vrai, constaté**.

## Ce qui demande un vrai appareil

- Liserés entre cases à `devicePixelRatio` 3 (iPhone Pro, Android haut de
  gamme).
- Le plein écran sur iOS (B5) et le comportement de la barre d'adresse Safari
  au défilement.
- Le rectangle de tap Android (`-webkit-tap-highlight-color`).
- La tenue à 60 i/s pendant un glisser sur un vrai milieu de gamme — le
  ralentissement 4× est une approximation.

---

## Lot 5 — Ergonomie mobile et accessibilité, suite d'audit (11 septembre 2026)

Corrections faites en parallèle d'un autre agent sur `Board2D`, les pages
`jouer/*` et le serveur : seuls les composants partagés, la feuille de style,
la coque et le magasin des préférences ont été touchés. Rien n'est commité.
`typecheck` et `eslint` passent ; `globals.css` compilé par Tailwind pour
vérifier que chaque nouvelle classe est bien émise.

### Ce qui a changé

- **Plateau en portrait** (`ChessBoard.tsx`, `.colonne-plateau` dans
  `globals.css`) : la réserve de hauteur demandée par la page passe par une
  variable, et la feuille de style la relève à 18 rem au moins en portrait
  sous `lg` — les écrans de partie demandent 9 rem, mesuré pour le paysage.
  Choix CSS plutôt que requête média en JavaScript, qui vaut `false` avant
  montage et aurait fait sauter le plateau au chargement. Les zones sûres
  haut et bas se retranchent aussi du calcul. Calcul documenté dans le
  composant.
- **Effets réduits sans perdre les anneaux** : la règle `box-shadow: none`
  sur tout sous `data-effects='low'` effaçait aussi les `ring-*` (focus clavier,
  joueur au trait, case active). Remplacé par `--tw-shadow: 0 0 #0000` —
  Tailwind compose anneau et ombre dans la même propriété à partir de
  variables — plus une liste des ombres écrites en clair (`glass`,
  `popover`). Heuristique d'effets unifiée entre l'amorce de `layout.tsx` et
  `detectEffectsCapability` : même règle, recopiée et commentée des deux
  côtés.
- **Zones sûres** : `--entete` inclut `env(safe-area-inset-top)` ; la pile
  d'alertes se cale sur `--entete + 0,75rem` au lieu de 4,25 rem en dur ;
  `main` réserve `5rem + env(safe-area-inset-bottom)` sous la barre du bas.
- **Fenêtre d'affichage** : `maximumScale: 1` retiré (la loupe redevient
  possible ; l'échiquier se protège du double-tap par `touch-action`) ;
  `interactiveWidget: 'resizes-content'` pour que le clavier virtuel
  réduise la fenêtre au lieu de recouvrir les champs.
- **Thème du système** : sans thème enregistré, l'amorce suit
  `prefers-color-scheme` ; le magasin relit l'attribut posé (`merge` de
  `persist`) au lieu de recalculer, donc aucun désaccord entre l'amorce et
  l'hydratation.
- **Cibles tactiles** : `Button` sm/md, `SegmentedControl`, bouton de `Menu`,
  entrées `MenuItem`, croix du `Toast` et de `GameOverDialog` à 44 px au
  pointeur grossier. `PromotionPicker` passe au centre dès que la case fait
  moins de 44 px (mesuré avant la première peinture, resuivi à la rotation).
- **Retour utilisateur** : `role="alert"` pour les erreurs, `status` pour le
  reste ; compte à rebours suspendu au survol ou au doigt et repris de là où
  il en était ; six secondes au moins quand il y a une description. « À toi
  de jouer » annoncé par `aria-live="polite"` dans `PlayerBar` — un seul
  endroit, `TurnIndicator` n'est monté nulle part. Les pastilles de camp et
  la rangée des prises passent en `role="img"` : un `aria-label` sur un
  `span` sans rôle n'était pas lu.
- **Menu** : `MenuItem` exporté (rôle, hauteur au doigt, habillage, `href`
  ou `onClick`, `danger`) ; focus sur la première entrée à l'ouverture ; un
  clic sur un contrôle marqué `data-garde-ouvert` ne referme pas le panneau.
- **Flèches du clavier** : un seul écouteur global (`useNavigationClavier`
  dans `GameNav.tsx`), un seul gestionnaire servi, un seul `preventDefault`.
  `MoveList` ne s'inscrit que quand `controls` est vrai.
- **Contraste** : jetons `--danger-strong` / `--on-danger` (4,8:1 en aurora,
  5,2:1 en clair) pour le bouton `danger` et la pendule critique ;
  `--q-inaccuracy-text` (5,8:1 en clair) pour `Chip tone="warning"` ; barre
  du bas à 11 px avec interlettrage resserré ; la requête
  `prefers-contrast: more` renforce `--border`, `--border-strong` et `--text-faint` dans les
  deux thèmes.
- **`confirmMove`** retiré du type, des défauts, des traductions ; migration
  v7 efface la clé enregistrée. Aucun autre fichier ne la lisait.
- **Manifeste** : `theme_color` / `background_color` alignés sur `--bg` du
  thème sombre (`#0b0b14`), comme `themeColor` de `layout.tsx`. Pas de
  `screenshots` : aucune capture n'existe dans `public/`.

### À faire dans les pages `jouer/*` (hors périmètre de ce lot)

- Remplacer les `<button>` / `<Link>` écrits à la main dans les menus
  « Options de la partie » par `MenuItem` (rôle `menuitem`, 44 px).
- Poser `data-garde-ouvert` sur l'enveloppe de `CommentaryToggle` dans ces
  menus, sinon commuter le mode commenté referme toujours le panneau.

### Ce qui reste à constater sur appareil

- iPhone en mode installé : l'en-tête, la pile d'alertes et le plateau
  tiennent compte de l'encoche par `env()` — à voir sur un vrai appareil,
  l'émulation ne fournit pas les zones sûres.
- Clavier virtuel Android et iOS avec `resizes-content` : tchat d'une
  partie en direct et page de connexion.
- Portrait 360×640 et 390×844 : plateau, bandeaux, ruban et barre du pouce
  sans défilement — vérifié par le calcul (277 px autour d'un plateau de
  344, soit 621 sur 640), pas encore à l'écran.
- `prefers-contrast: more` et `prefers-color-scheme: light` sans thème
  enregistré : à voir sur un appareil réglé ainsi.
