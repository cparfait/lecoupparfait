#!/usr/bin/env node
/**
 * Génère les visuels de Cavale, via ComfyUI.
 *
 * Cavale est le cavalier du logo (`components/brand/LogoMark.tsx`). Ce script
 * lui donne du volume : une **sculpture** photographiée en studio, et non un
 * cheval vivant ni une mascotte de dessin animé. C'est ce qui permet au logo,
 * à la bannière et aux adversaires de raconter la même chose.
 *
 * Il remplace `build-coach.mjs`, qui produisait des portraits photoréalistes de
 * septuagénaires : une image de banque, sans lien avec la marque, et qui
 * obligeait à trancher des questions d'âge, de genre et d'origine que
 * `lib/avatars.ts` refuse explicitement de poser ailleurs. Une sculpture ne les
 * pose pas.
 *
 *   node scripts/build-cavale.mjs                        # les onze visuels
 *   node scripts/build-cavale.mjs --cible banniere
 *   node scripts/build-cavale.mjs --cible banniere --theme club
 *   node scripts/build-cavale.mjs --cible adversaires --qui machine
 *   COMFY_URL=http://127.0.0.1:8188 node scripts/build-cavale.mjs
 *
 * Onze visuels, et pas trente-deux, parce que les deux familles ne se déclinent
 * pas de la même façon :
 *
 *  - **La bannière suit le thème.** Cavale y porte la couleur d'accent de
 *    l'habillage choisi, comme le faisait le coach : quatre tirages, un par
 *    thème, dans `public/brand/cavale-<thème>.png`.
 *  - **Les adversaires suivent leur caractère.** Ils se distinguent par la
 *    matière — bois brut, granit, bronze chauffé, verre, obsidienne — et cette
 *    matière ne peut pas dépendre de l'habillage sans que Brasier cesse d'être
 *    reconnaissable en thème `club`. Sept tirages, un par personnalité, dans
 *    `public/brand/adversaires/<id>.png`. Seul le fond de leur pastille suit le
 *    thème, et il est déjà en CSS.
 *
 * Deux passes s'enchaînent, comme pour le coach :
 *
 *  1. **Le modèle de diffusion** produit l'objet sur fond de studio uni.
 *  2. **BiRefNet** le détoure et écrit un PNG à fond transparent — l'application
 *     a un thème clair, un fond incrusté s'y verrait comme un rectangle.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const COMFY = (process.env.COMFY_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

// ─────────────────────────────────────────────────────────────────────────────
//  Le personnage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * L'anatomie, commune à tous les tirages.
 *
 * Elle décrit le tracé `TETE` de `LogoMark.tsx` en anglais : chanfrein droit,
 * oreilles dressées et écartées, ganache marquée, encolure épaisse, socle
 * cylindrique. Sans ce socle, le modèle produit une tête coupée qui flotte ;
 * avec lui, il comprend qu'il s'agit d'une pièce de jeu.
 *
 * Le mot « bust » a été essayé, puis retiré. Il servait à exclure les jambes et
 * les sabots — une sculpture équestre entière n'est plus une pièce d'échecs —
 * mais c'est en anglais le terme d'un buste **humain**, et il tirait tout le
 * tirage de ce côté. Sur le thème `club`, où la matière ambrée ajoutait une
 * couleur de peau, le modèle a produit deux fois de suite un buste de femme aux
 * oreilles pointues : deux termes anodins qui, mis bout à bout, ont changé le
 * sujet. « head and neck », qui dit la même chose sans désigner personne, règle
 * la question.
 */
const ANATOMIE = [
  'sculpted chess knight piece, a stylised horse head, no legs, no hooves, no rider,',
  'sharp straight muzzle, tall alert ears set wide apart,',
  // « Court et épais », martelé, parce que le premier essai sans « bust » a
  // produit une encolure de serpent : le mot retiré ne disait pas seulement
  // « humain », il disait aussi « compact », et il faut le remplacer aux deux
  // sens. Le socle est décrit à part et en fin de phrase, là où le modèle le
  // lit encore — sans quoi il l'omet et la pièce n'a plus de pied.
  'heavy jaw, short thick powerful neck, compact and stocky, not elongated,',
  'standing on a round polished chess piece base,',
].join(' ')

/**
 * L'œil, et pourquoi il n'y en a qu'un.
 *
 * Une amande sombre et un unique point de lumière. Deux yeux visibles feraient
 * un animal ; un seul, vu de trois quarts, garde l'objet du côté de la
 * sculpture. Il n'y a ni bouche ni sourcils — le caractère passe par la posture
 * et la matière, jamais par une expression.
 *
 * La règle venait du tracé vectoriel `mascotte.svg`, supprimé depuis : il ne
 * servait plus nulle part, la marque étant désormais un rendu. La règle, elle,
 * reste bonne.
 */
const OEIL =
  '(one visible open almond-shaped eye, dark and deep, with a single small specular highlight:1.2)'

/**
 * La règle des 10 %.
 *
 * `LogoMark.tsx` la formule ainsi : la seconde couleur ne sert qu'aux arêtes.
 * Une matière brillante contre une matière mate, c'est ce qui donne le volume ;
 * deux aplats à parts égales n'en donnent aucun. La crinière est donc une arête
 * dorsale polie, pas une chevelure.
 *
 * Le poids de cette clause est le réglage le plus délicat du script, et il n'a
 * pas de zone confortable :
 *
 *  - **Sans pondération**, SDXL l'ignore. Le premier tirage est sorti d'un seul
 *    violet, arête comprise : le modèle ramène spontanément un objet à une
 *    seule matière.
 *  - **À 1,5**, il la suit trop bien et la couleur déborde partout. Le tirage
 *    suivant est sorti entièrement menthe, le violet réduit à une calotte sur le
 *    crâne — les deux teintes inversées, et la règle des 10 % renversée.
 *
 * 1,25 tient les deux bouts pour une couleur franche. Le poids reste réglable
 * parce que toutes ne se valent pas : le sauge de `club` est une teinte sourde,
 * que le modèle laisse tomber là où il retient sans peine une menthe saturée.
 * Une couleur discrète coûte plus cher à obtenir qu'une couleur vive.
 *
 * Le mot « inlaid » aide aussi, parce qu'il décrit une incrustation dans une
 * matière qui reste dominante, là où « mane of mint » décrivait une couleur
 * libre de s'étendre.
 */
const criniere = (matiere, poids = 1.25) =>
  `(a narrow ridge of ${matiere} inlaid along the top edge of the neck like a stylised mane:${poids}), ` +
  // « Le long de l'encolure » ne suffit pas : le modèle a compris le devant du
  // cou et a produit un plastron sauge, c'est-à-dire l'aplat à parts égales que
  // la règle des 10 % existe pour empêcher. Il faut dire d'où part l'arête et
  // où elle va.
  'running from between the ears down the back of the neck only, ' +
  'never on the chest or the face, covering only a tenth of the surface, ' +
  'glossy against the matte body'

// ─────────────────────────────────────────────────────────────────────────────
//  La bannière : un tirage par thème
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les quatre habillages.
 *
 * Les teintes sont celles de `globals.css` — `--accent` pour le corps,
 * `--accent-2` pour la crinière. Deux précautions héritées de `build-coach.mjs` :
 *
 *  - **Le violet doit être démenti.** SDXL rabat spontanément les violets
 *    sombres vers le bleu marine. Il faut nommer la couleur *et* nier celle
 *    qu'on ne veut pas — « purple, not blue » fait toute la différence.
 *  - **La lumière dépend du fond.** `clair` a un fond `#f7f7f9` : une clé basse
 *    y donnerait un objet sombre sur page blanche. `contraste` est en jaune sur
 *    noir, et supporte — demande, même — une lumière dure.
 *
 * L'éclairage vient d'en **haut à droite** dans les quatre cas. Ce n'est pas un
 * choix esthétique : `app/page.tsx` pose son halo de fond à `62% 8%`, et le
 * commentaire du fichier dit que ce halo « éclaire le coin haut-droit d'où vient
 * la lumière du portrait ». Les deux sources doivent coïncider, sinon la page et
 * l'objet ont deux soleils.
 */
const THEMES = {
  aurora: {
    // Pondéré comme `contraste`, et pour la raison symétrique : là-bas le noir
    // avalait le jaune, ici la menthe avale le violet. Une teinte saturée posée
    // à côté d'une teinte sourde gagne toujours, quel que soit le sens ; la
    // seule parade est de peser celle qu'on veut voir dominer.
    matiere:
      '(translucent violet resin, the exact soft violet of #7c5cff:1.3), ' +
      'soft subsurface scattering, halfway between lavender and royal purple, ' +
      'purple not navy blue, satin finish',
    criniere: 'bright mint green #00e5a8 polished enamel',
    // Le corps pesé à 1,3, l'arête doit l'être à proportion, sinon elle passe
    // sous la table : les deux poids se lisent l'un par rapport à l'autre, pas
    // dans l'absolu.
    poids: 1.35,
    // Aucun négatif de couleur ici, et c'est le résultat de trois essais.
    // « teal, turquoise, green horse » supprimait le corps vert *et* la
    // crinière ; le resserrer à « green body, green neck » n'a rien changé —
    // SDXL ne fait pas la différence entre refuser une couleur sur une partie
    // de l'objet et la refuser sur l'objet. Le seul levier qui distingue les
    // deux teintes est le rapport des poids, pas l'interdiction.
    lumiere:
      'key light from the upper right through a large softbox, soft fill from the left, ' +
      'deep charcoal seamless studio backdrop',
  },
  club: {
    // Du buis, et non de la résine ambrée comme les trois autres.
    //
    // Deux tirages de suite ont donné un buste d'homme torse nu : l'ambre chaud
    // est une couleur de peau, « bust » est un format de sculpture humaine, et
    // les deux ensemble suffisent à faire basculer le modèle. Le bois n'a pas
    // cette ambiguïté — et c'est aussi la matière dont sont faites les pièces
    // d'un club d'échecs, ce que le thème s'appelle.
    matiere:
      'warm golden boxwood, the honey-gold colour of #c9a227, ' +
      'fine visible wood grain, hand-waxed satin finish',
    negatifSup: 'human bust, bare shoulders, skin, torso, muscular, portrait bust,',
    miroir: true,
    criniere: 'soft sage eucalyptus green #7fa87c polished enamel',
    // Le sauge est la teinte la plus sourde des quatre, et le premier tirage l'a
    // purement et simplement escamotée : le cavalier est sorti tout ambre.
    poids: 1.3,
    lumiere:
      'warm golden key light from the upper right, soft amber fill, ' +
      'deep sepia-brown seamless studio backdrop, cosy library atmosphere',
  },
  clair: {
    matiere:
      'deep blue-violet resin, the exact violet of #5b3ce0, purple not navy blue, ' +
      'polished satin finish with soft internal glow',
    criniere: 'deep emerald green #00926e polished enamel',
    lumiere:
      'bright high-key lighting, large softbox above and to the upper right, ' +
      'clean and airy, soft shadows, pale light-grey seamless backdrop',
  },
  contraste: {
    // Le seul thème où la crinière n'est pas `--accent-2` : `globals.css`
    // bascule `--logo-criniere` sur `--accent-contrast`, c'est-à-dire le noir.
    // Sur un corps jaune pur, une arête verte se perdrait ; une arête noire
    // tient le contraste que ce thème existe pour garantir.
    // Le seul thème où la teinte du corps doit être pondérée, et pour une
    // raison qui tient à la nature du noir : ce n'est pas une couleur parmi
    // d'autres pour un modèle de diffusion, c'est un puits. Le premier tirage
    // est sorti d'un cavalier noir au museau jaune — exactement l'inverse de la
    // consigne, et la règle des 10 % appliquée à la mauvaise des deux teintes.
    matiere:
      '(pure vivid yellow #ffe600 lacquer:1.35), flat and saturated, hard glossy finish',
    criniere: 'deep matte black',
    negatifSup: 'black body, dark body, yellow face, painted mask, cartoon face, smiling,',
    lumiere:
      'single hard key light from the upper right, crisp high-contrast lighting, ' +
      'clean bright highlights and deep blacks, pure black seamless backdrop',
  },
}

function promptBanniere(theme) {
  const habillage = THEMES[theme]
  return [
    'Studio product photograph of a',
    ANATOMIE,
    // La matière du corps est nommée avant la crinière **et** requalifiée par
    // « the entire body ». C'est redondant à la lecture, et nécessaire au
    // tirage : sans cette reprise, la teinte de l'arête déteint sur toute la
    // sculpture.
    `carved from ${habillage.matiere}. The entire body is ${habillage.matiere}.`,
    `${criniere(habillage.criniere, habillage.poids)}.`,
    `${OEIL}.`,
    // On ne demande pas d'orientation : SDXL tire à droite ou à gauche selon
    // l'humeur de la graine, et le lui interdire ne marche pas — gauche et
    // droite sont les deux notions qu'un modèle de diffusion confond le plus
    // volontiers. On le laisse faire et `miroir` remet la tête du bon côté,
    // voir `graphe()`.
    'Three-quarter view, chin slightly raised, calm and attentive.',
    // On ne demande plus de cadrage serré : SDXL n'obéit pas, et il n'a pas à
    // le faire. Le recadrage se fait après coup, sur le masque de détourage —
    // voir `graphe()`. Ce qu'on demande ici, c'est au contraire un objet isolé
    // avec de la marge, parce que c'est ce qui donne un beau masque.
    'Single object centred in frame with generous margin around it.',
    `${habillage.lumiere}.`,
    'Museum object photography, shot on 85mm at f/4, shallow depth of field, fine surface detail.',
  ].join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
//  La marque : un seul tirage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La marque, en plusieurs partis pris.
 *
 * Le premier essai relevait le contour d'une sculpture pour en faire un tracé
 * vectoriel. L'intention était bonne — un vecteur reste net à 16 px et suit les
 * quatre thèmes — mais le résultat ne l'était pas : le contour alpha d'un rendu
 * photographique est bosselé, la simplification laisse des ressauts, et l'arête
 * dorsale reprise du contour se lit comme un liseré autour de la pièce plutôt
 * que comme une crinière. Un logo ne se relève pas, il se compose.
 *
 * On tire donc **l'emblème entier**, pavé compris. C'est ce que le modèle sait
 * faire : un objet éclairé dans un cadre, avec sa matière et son ombre propre.
 * Ce qu'il ne sait pas faire — un aplat vectoriel propre — on cesse de le lui
 * demander.
 *
 * Chaque entrée ci-dessous est une piste distincte, pas une variante de
 * réglage. On les tire toutes, on regarde, on en garde une.
 */
/**
 * Le cadre, commun aux six pistes — et c'est ce qui manquait au premier jet.
 *
 * Demander « app icon of a chess knight » donne une **photographie d'une icône**
 * posée quelque part : la première série est sortie en pin's sur du tissu, en
 * médaille sur un bureau, en carré violet sur une page blanche. Le modèle
 * comprend « icône » comme un objet du monde, et il le met donc dans un monde.
 *
 * Il faut lui retirer ce monde explicitement : que le pavé touche les quatre
 * bords, qu'il n'y ait pas de vue en perspective, pas de surface en dessous, pas
 * d'ombre portée. Ce qui reste est un aplat vu de face — c'est-à-dire une icône.
 */
const CADRE = [
  'A flat app icon, seen perfectly straight on, orthographic, no perspective.',
  '(The deep violet rounded square fills the entire image, edge to edge, bleeding off all four sides:1.4).',
  'Nothing whatsoever around it, no page, no surface, no second colour outside it.',
  // « Chess knight », répété et qualifié. Le raccourci ne suffit pas : à la
  // deuxième passe, la piste « or » est sortie en profil de guerrier grec sous
  // son casque — « struck in relief » et « heraldic » suffisent à faire basculer
  // le sujet vers la médaille antique, dont le cheval a disparu.
  'Centred in it, the head of a horse — a chess knight piece, an animal head with',
  'a long straight muzzle, two upright ears and a mane, definitely not a human face,',
].join(' ')

const MARQUES = {
  /**
   * Le buis d'un jeu de club, aplati en icône. C'est la piste retenue.
   *
   * Le bois est **clair**, et c'est le seul réglage qui décide de tout : un
   * noyer foncé sur un pavé violet donne deux valeurs sombres côte à côte, et
   * la pièce disparaît dès qu'on descend à trente-deux pixels. Le buis blond
   * tranche, et c'est ce qui fait tenir la silhouette en petit.
   */
  bois: [
    CADRE,
    '(hand-carved from pale honey-blond boxwood, light warm golden wood:1.3),',
    'satin polish, fine visible grain, deeply and crisply carved stepped mane,',
    'strong jaw, tall alert ears, standing on a turned wooden base,',
    '(the pale wooden piece stands out brightly against the dark violet field:1.2),',
    'large in the frame with only a small even margin, soft even light from the upper left,',
    'rich and simple, no clutter.',
  ].join(' '),

  /** L'émail cloisonné : la matière que les modèles rendent le mieux en petit. */
  email: [
    CADRE,
    'a hard-enamel chess knight head, cream enamel with a mint green enamel mane,',
    'crisp raised gold cloisonné outline, glossy enamel surface, facing left,',
    'on a deep violet enamel field, bold simple shapes, no small details.',
  ].join(' '),

  /** Le creux : le cavalier n'est pas posé sur le pavé, il en est retiré. */
  creux: [
    CADRE,
    'a chess knight head cut cleanly out of a solid violet surface,',
    'negative space cutout revealing a flat mint green layer beneath,',
    'crisp paper-cut edges, one soft inner shadow along the cut, facing left,',
    'no texture, no gradient, only two flat colours.',
  ].join(' '),

  /** L'or gravé : la piste la plus classique, celle d'un club d'échecs ancien. */
  or: [
    CADRE,
    'a chess knight head struck in polished gold relief, bevelled edges,',
    'facing left, on a deep violet field, heraldic and minimal,',
    'soft raking light from the upper left, no fine engraving, bold readable shapes.',
  ].join(' '),

  /** Le verre : la matière d'`aurora`, en objet précieux. */
  verre: [
    CADRE,
    'a chess knight carved from translucent violet crystal, glowing from within,',
    'polished facets, a mint green light along the crest of the mane, facing left,',
    'on a dark violet field with a soft halo, jewel-like, bold silhouette.',
  ].join(' '),

  /** Le trait : un contour seul, sans remplissage. */
  trait: [
    CADRE,
    'a chess knight head drawn as a single thick mint green outline, no fill,',
    'even heavy line weight, geometric and confident, facing left,',
    'on a flat deep violet field, no shading, no texture, no gradient.',
  ].join(' '),
}

/**
 * La piste retenue.
 *
 * Elle sert de défaut à `--cible logo`, pour qu'une régénération ordinaire
 * refasse la marque en place sans réveiller les cinq autres.
 */
const MARQUE_RETENUE = 'bois'

/**
 * Les réglages propres à la piste retenue.
 *
 * La graine est **fixée à part** de celle des cinq autres. Les six pistes se
 * tirent d'ordinaire sur la graine de base plus leur rang, ce qui suffit pour
 * comparer des directions ; mais une fois la direction choisie, on ne compare
 * plus, on cherche le meilleur tirage. Celui-ci est sorti au quatrième essai —
 * les trois autres avaient soit une coulure sous le mors, soit la pièce posée
 * sur une table que le cadrage devait exclure.
 *
 * C'est bien la graine **effective**, celle passée au générateur, et non la
 * graine de base : les essais comparatifs y ajoutent le rang de la piste dans
 * `MARQUES`, et noter la seconde ici aurait rendu un autre tirage.
 *
 * Le miroir aligne la marque sur le reste : la bannière, les sept adversaires
 * et l'ancien logo regardent tous vers la gauche.
 */
const MARQUE_REGLAGES = { seed: 20261033, miroir: true }

/**
 * Ce que la marque doit refuser.
 *
 * Le fond fait partie du tirage cette fois, donc il faut interdire ce qui vient
 * avec un fond : le décor, l'échiquier posé derrière, la table de studio. Et
 * proscrire le texte, que le modèle ajoute spontanément sous un logo — sous
 * forme de lettres qui n'en sont pas.
 */
const NEGATIF_LOGO =
  'text, letters, words, typography, signature, watermark, caption, ' +
  'chessboard, table, desk, room, landscape, scenery, multiple pieces, collage, grid of icons, ' +
  // Ce qui a fait échouer la première série : le modèle photographiait l'icône
  // au lieu de la dessiner. Il faut refuser la mise en scène, pas seulement la
  // demander autrement.
  'photograph of an object, product photo, mockup, tilted, angled view, perspective, ' +
  'drop shadow, cast shadow, floor, wall, fabric, paper background, border, frame, margin, ' +
  // Les dérives de la deuxième passe, chacune vue au moins une fois : une corne
  // au milieu du front, un mufle de chèvre, et un buste d'hoplite.
  'unicorn, horn, spiral horn, goat, dragon, cat, deer, ' +
  'human face, human profile, helmet, warrior, greek coin, portrait,'

// ─────────────────────────────────────────────────────────────────────────────
//  Les adversaires : un tirage par personnalité
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les sept caractères, en matière.
 *
 * Les identifiants sont ceux de `BOT_PERSONALITIES` (`packages/core/src/bots.ts`)
 * et les partis pris découlent des biais de style qu'on y trouve : Rempart a
 * `sacrifice: -80`, il est donc en granit ; Brasier a `sacrifice: 45` et
 * `quiet: -40`, il est donc en bronze surchauffé.
 *
 * Trois choses seulement varient — la matière, la posture, un attribut. Le
 * cadrage et la lumière sont communs : les sept vignettes s'affichent côte à
 * côte dans `/jouer`, et une lumière qui change d'une case à l'autre casse la
 * série plus sûrement qu'une matière mal choisie.
 */
const ADVERSAIRES = {
  novice: {
    nom: 'Pion',
    matiere:
      'pale unfinished basswood, raw tool marks still visible, soft rounded edges, unpolished',
    criniere: 'short soft downy pale green fibres',
    // Proportions de poulain : c'est ce qui dit « il apprend en même temps que
    // toi » sans avoir à l'écrire.
    posture:
      'foal proportions, oversized head, ears too large for the body, short stubby neck, ' +
      'leaning eagerly forward, curious',
  },
  prudent: {
    nom: 'Rempart',
    matiere: 'grey-blue granite, coarse stone grain, small patches of moss in the hollows',
    criniere: 'a low band of dark weathered iron',
    posture:
      'massive squat neck, low heavy muzzle, riveted iron barding plates strapped across the neck, ' +
      'wide solid base, head drawn back and tucked in, immovable',
    // La barde est de l'armure : le garde-fou qui l'interdit ailleurs doit
    // sauter ici, sinon les plaques disparaissent au tirage.
    armure: true,
  },
  fonceur: {
    nom: 'Brasier',
    matiere:
      'superheated bronze, cracked surface with molten orange incandescence glowing from within the fissures',
    criniere: 'a frozen crest of flame, orange and white hot',
    posture: 'thrown violently forward, nostrils flared, ears pinned back, charging',
  },
  tacticien: {
    nom: 'Éclair',
    // Du cristal **givré**, et non du verre transparent.
    //
    // Le premier tirage était limpide, et c'est ce qui l'a tué deux fois : le
    // détourage n'a su décider où finissait l'objet — il en a laissé des débris
    // flottants — et ce qui restait devenait invisible sur le thème clair. Une
    // vignette de quarante pixels n'a pas les moyens de la transparence. Le
    // givre garde les facettes et la fêlure, en leur donnant un corps opaque.
    matiere:
      'frosted pale ice-blue crystal, semi-opaque and milky, sharp faceted planes, crisp edges, ' +
      'one luminous crack running clean through the neck',
    criniere: 'a thin blade of white light along the crest',
    // Le premier tirage est sorti de face, seul de la série : le verre facetté
    // appelle la symétrie, et SDXL a produit quelque chose qui tenait du masque
    // plus que du cavalier. Il faut redemander le profil explicitement.
    posture:
      'seen in three-quarter profile with the head clearly turned to the side, muzzle in profile, ' +
      'head held high, sharply alert, poised and precise',
    negatifSup: 'front view, facing the viewer, symmetrical mask, insect, alien head,',
    miroir: true,
  },
  positionnel: {
    nom: 'Boussole',
    matiere: 'patinated brass and dark polished rosewood, fine marine-instrument craftsmanship',
    criniere: 'an engraved brass ridge',
    posture:
      'perfectly plumb and still, fine compass-rose engraving etched into the side of the neck, ' +
      'calm and unhurried',
    // Le seul adversaire en laiton gravé : lui interdire la dorure et la
    // gravure ornementale reviendrait à lui retirer sa matière.
    dorure: true,
  },
  gambiteur: {
    nom: 'Mirage',
    matiere:
      'translucent smoked resin that doubles on itself, ghosted double contours, ' +
      'slight chromatic offset, the rear of the neck almost dissolved into air',
    criniere: 'a shimmering iridescent ridge',
    posture: 'caught mid-movement, blurred at the trailing edge, elusive',
  },
  machine: {
    nom: 'Oracle',
    // Pondéré, et le négatif renforcé : le premier tirage est sorti en marbre
    // blanc. « Obsidian » suffit à décrire la matière mais pas la couleur, et
    // SDXL retombe sur le marbre dès qu'on lui dit « sculpture polie » — c'est
    // sa statue par défaut. Il faut nommer le noir et interdire le blanc.
    matiere:
      '(jet black polished obsidian, pure black volcanic glass:1.3), absolutely smooth, ' +
      'no grain, no texture whatsoever',
    criniere: 'a single razor-thin line of cold white light along the crest',
    negatifSup: 'white marble, ivory, alabaster, pale stone, light coloured, grey stone,',
    miroir: true,
    // Le seul frontal de la série, et le seul strictement symétrique : « aucun
    // style, aucune pitié » se dit par la géométrie.
    posture: 'strictly frontal, perfectly symmetrical, motionless, facing the viewer head on',
  },
}

function promptAdversaire(id) {
  const bot = ADVERSAIRES[id]
  return [
    'Studio product photograph of a',
    ANATOMIE,
    `carved from ${bot.matiere}.`,
    `${bot.posture}.`,
    `${criniere(bot.criniere)}.`,
    `${OEIL}.`,
    // Lumière commune aux sept, et neutre : les matières doivent différer, pas
    // l'éclairage.
    'Even soft studio lighting from front and slightly above, neutral seamless mid-grey backdrop,',
    'single object centred in a square frame, generous margin around the piece.',
    'Museum object photography, sharp focus throughout, fine surface detail.',
  ].join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
//  Graphe ComfyUI, au format API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ce que SDXL doit éviter — et c'est l'exact inverse du script du coach.
 *
 * Là-bas, `3d render, cgi, sculpture` figuraient dans le négatif parce qu'on
 * cherchait une photographie. Ici c'est ce qu'on veut, et le négatif proscrit à
 * l'inverse la photographie animalière et la mascotte enfantine — les deux
 * dérives naturelles du modèle dès qu'on écrit « horse ».
 *
 * Deux clauses sont isolées parce qu'un adversaire les contredit :
 *
 *  - `armure` — « chess knight » fait dériver SDXL vers le chevalier en armure
 *    une fois sur trois. On l'interdit partout, sauf chez Rempart dont la barde
 *    rivetée est justement le sujet.
 *  - `dorure` — le modèle associe « objet de musée » à la dorure et en ajoute
 *    spontanément. On l'interdit partout, sauf chez Boussole qui est en laiton.
 */
function negatif({ armure = false, dorure = false, sup = '' } = {}) {
  return [
    // Ce qu'un visuel donné doit refuser en plus des autres : voir le champ
    // `negatifSup`, que portent aussi bien un thème qu'un adversaire. Placé en
    // tête, là où le conditionnement pèse le plus.
    sup,
    'real horse, live animal, fur, hair, mane of real hair, animal photography, taxidermy,',
    'human, human face, rider, horseback,',
    armure ? '' : 'medieval knight, suit of armour, soldier, helmet, sword, shield,',
    dorure ? '' : 'gold trim, gilt edging, gold rim, ornamental filigree,',
    'cartoon, anime, chibi, cute mascot, plush toy, stuffed animal, childrens illustration, clay,',
    'colour blocking, striped, two-tone body, coloured chest, bib,',
    'medallion, emblem, badge, coin, seal, gem, jewel, pendant, necklace, collar,',
    'full body, legs, hooves, tail, running horse, equestrian statue,',
    'chessboard, multiple chess pieces, cluttered background, hands,',
    'deformed, two heads, extra ears, asymmetric eyes, melted, distorted anatomy,',
    'watermark, text, logo, signature, low resolution, blurry, jpeg artifacts',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Le modèle, et pourquoi celui-là.
 *
 * JuggernautXL est réglé pour le photoréalisme, ce qui reste ce qu'on cherche :
 * une sculpture *photographiée*, pas un rendu 3D. Il tient dans 6,6 Go, poids,
 * encodeurs et VAE compris — le seul choix qui passe sans acrobatie sur une
 * machine à 32 Go.
 *
 * Deux formats, chacun dans le domaine d'entraînement de SDXL : 832×1216 pour
 * la bannière (le 2:3 debout), 1024×1024 pour les vignettes. En sortir produit
 * des sujets dupliqués — deux têtes sur la même encolure.
 */
const MODELE = { ckpt: 'juggernautXL_ragnarokBy.safetensors', poids: 6.6 }

/**
 * Les deux formats de tirage, et la réserve laissée autour du sujet au
 * recadrage.
 *
 * La bannière garde de l'air au-dessus de la tête et rien en dessous : le
 * conteneur de `CavalePortrait` est plus haut que large et applique
 * `object-cover object-top`, si bien que le bas de l'image sort du cadre de
 * toute façon. Autant que ce soit le socle qui en sorte.
 *
 * Les vignettes ont la même réserve des quatre côtés, parce qu'elles sont
 * affichées en `object-contain` dans un carré : c'est l'égalité des marges qui
 * fait qu'elles ont l'air d'une série.
 */
const FORMATS = {
  banniere: {
    largeur: 832,
    hauteur: 1216,
    reserve: { top_reserve: 56, bottom_reserve: 0, left_reserve: 24, right_reserve: 24 },
  },
  adversaires: {
    largeur: 1024,
    hauteur: 1024,
    reserve: { top_reserve: 24, bottom_reserve: 24, left_reserve: 24, right_reserve: 24 },
  },
  // La marque est recadrée au plus près : elle sera posée dans un pavé arrondi
  // par `LogoMark`, et toute marge incluse dans le PNG s'ajouterait à celle du
  // pavé. Autant la régler à un seul endroit, en CSS.
  logo: {
    largeur: 1024,
    hauteur: 1024,
    reserve: { top_reserve: 8, bottom_reserve: 8, left_reserve: 8, right_reserve: 8 },
  },
}

/**
 * Le graphe complet, du bruit au PNG détouré.
 *
 * `cfg` est plus ferme que pour le coach — 6,8 contre 5,5. Un visage humain
 * supporte la latitude d'un guidage lâche ; une consigne de matière ne la
 * supporte pas. En dessous de 6,5, « verre fracturé » et « résine dédoublée »
 * ressortent en résine grise ordinaire : le modèle retombe sur sa moyenne dès
 * qu'on lui laisse le choix.
 */
function graphe({
  seed,
  steps,
  cfg,
  texte,
  largeur,
  hauteur,
  cutout,
  armure,
  dorure,
  sup,
  miroir,
  reserve,
  detail = true,
}) {
  const g = {
    modele: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: MODELE.ckpt } },
    positif: { class_type: 'CLIPTextEncode', inputs: { text: texte, clip: ['modele', 1] } },
    negatif: {
      class_type: 'CLIPTextEncode',
      inputs: { text: negatif({ armure, dorure, sup }), clip: ['modele', 1] },
    },
    latent: {
      class_type: 'EmptyLatentImage',
      inputs: { width: largeur, height: hauteur, batch_size: 1 },
    },
    echantillon: {
      class_type: 'KSampler',
      inputs: {
        model: ['modele', 0],
        seed,
        steps,
        cfg,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        positive: ['positif', 0],
        negative: ['negatif', 0],
        latent_image: ['latent', 0],
        denoise: 1,
      },
    },
    decode: { class_type: 'VAEDecode', inputs: { samples: ['echantillon', 0], vae: ['modele', 2] } },
  }

  // Le miroir, et pourquoi il vient ici plutôt qu'à la fin.
  //
  // Retourner l'image juste après le décodage met tout l'aval en accord : le
  // détourage travaille sur l'image déjà retournée, donc le masque tombe au bon
  // endroit sans qu'on ait à le retourner lui aussi.
  let image = 'decode'
  if (miroir) {
    g.miroir = {
      class_type: 'ImageFlip',
      inputs: { image: ['decode', 0], flip_method: 'y-axis: horizontally' },
    }
    image = 'miroir'
  }

  if (!cutout) {
    g.sortie = { class_type: 'SaveImage', inputs: { images: [image, 0], filename_prefix: 'cavale' } }
    return g
  }

  // `BiRefNet-General` plutôt que `RMBG-2.0` : le second est un dépôt fermé sur
  // HuggingFace et sa licence interdit l'usage commercial — deux raisons
  // rédhibitoires pour un projet sous AGPL.
  //
  // `process_detail` affine la frontière au pixel près. Il passe par
  // `cv2.erode`, et certaines installations de ComfyUI ont un OpenCV amputé —
  // typiquement quand `opencv-python` et `opencv-python-headless` cohabitent.
  // `main()` retombe alors sur le masque brut, très correct sur fond uni.
  g.birefnet = { class_type: 'LayerMask: LoadBiRefNetModelV2', inputs: { version: 'BiRefNet-General' } }
  g.detourage = {
    class_type: 'LayerMask: BiRefNetUltraV2',
    inputs: {
      image: [image, 0],
      birefnet_model: ['birefnet', 0],
      detail_method: 'VITMatte',
      detail_erode: 4,
      detail_dilate: 2,
      black_point: 0.01,
      white_point: 0.99,
      process_detail: detail,
      device: 'cuda',
      max_megapixels: 2,
    },
  }

  // Le cadrage, une fois le sujet connu.
  //
  // Demander un cadrage serré dans le prompt ne marche pas — SDXL centre son
  // objet et lui laisse la marge qu'il veut, et le résultat varie d'une graine
  // à l'autre. Or les sept adversaires s'affichent en série : une vignette dont
  // le sujet occupe 60 % de la hauteur à côté d'une autre où il en occupe 85 %
  // se voit immédiatement, et se lit comme un défaut de fabrication.
  //
  // Le masque, lui, donne la boîte exacte du sujet. On recadre dessus avec une
  // réserve fixe, et les onze visuels sortent cadrés de la même façon quelle
  // que soit la composition d'origine. Le cadrage cesse d'être une supplique
  // adressée au modèle pour devenir une opération.
  g.cadre = {
    class_type: 'LayerUtility: CropByMask V2',
    inputs: {
      image: [image, 0],
      mask: ['detourage', 1],
      invert_mask: false,
      detect: 'mask_area',
      ...reserve,
      round_to_multiple: '8',
    },
  }

  // Le détourage produit **deux** sorties, et c'est tout le piège.
  //
  // `build-coach.mjs` enregistrait directement la première — une `IMAGE`, donc
  // trois canaux, donc un fond opaque. Il annonçait des PNG transparents et
  // n'en produisait aucun : les quatre portraits du coach ont toujours eu leur
  // fond de studio incrusté. Personne ne l'a vu parce que le masque radial de
  // `CoachPortrait` effaçait les bords, c'est-à-dire précisément là où le
  // rectangle se serait remarqué.
  //
  // La transparence est dans la seconde sortie, la `MASK`. Il faut la recoller
  // à l'image comme quatrième canal — c'est le rôle de `JoinImageWithAlpha`.
  //
  // Et il faut l'inverser avant. `JoinImageWithAlpha` applique `1 - masque`,
  // parce qu'une `MASK` ComfyUI désigne par convention ce qu'on *retire* ; or
  // BiRefNet suit la convention inverse et marque le sujet à 1. Sans
  // `InvertMask`, on obtient très exactement le contraire de ce qu'on veut :
  // une sculpture transparente sur un fond opaque.
  g.alpha = { class_type: 'InvertMask', inputs: { mask: ['cadre', 1] } }
  g.rvba = {
    class_type: 'JoinImageWithAlpha',
    inputs: { image: ['cadre', 0], alpha: ['alpha', 0] },
  }
  g.sortie = { class_type: 'SaveImage', inputs: { images: ['rvba', 0], filename_prefix: 'cavale' } }
  return g
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dialogue avec ComfyUI
// ─────────────────────────────────────────────────────────────────────────────

async function api(chemin, options) {
  const reponse = await fetch(`${COMFY}${chemin}`, options)
  if (!reponse.ok) {
    throw new Error(`${chemin} → ${reponse.status} ${reponse.statusText}\n${await reponse.text()}`)
  }
  return reponse
}

/** Empile le graphe et rend l'identifiant de tâche. */
async function soumettre(prompt) {
  const reponse = await api('/prompt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: 'build-cavale' }),
  })
  const { prompt_id: id, node_errors: erreurs } = await reponse.json()
  if (erreurs && Object.keys(erreurs).length > 0) {
    throw new Error(`ComfyUI refuse le graphe :\n${JSON.stringify(erreurs, null, 2)}`)
  }
  return id
}

/**
 * Attend la fin de la tâche. On interroge `/history` en boucle plutôt que
 * d'ouvrir la WebSocket : suivre la progression nœud par nœud n'apporterait rien
 * ici, et un `fetch` de plus évite une dépendance.
 */
async function attendre(id, { timeoutMs = 15 * 60_000 } = {}) {
  const limite = Date.now() + timeoutMs
  let dernierPoint = 0

  while (Date.now() < limite) {
    const historique = await (await api(`/history/${id}`)).json()
    const tache = historique[id]

    if (tache) {
      const statut = tache.status ?? {}
      if (statut.status_str === 'error' || statut.completed === false) {
        const message = (statut.messages ?? [])
          .filter(([type]) => type === 'execution_error')
          .map(([, detail]) => `${detail.node_type} : ${detail.exception_message}`)
          .join('\n')
        throw new Error(message || 'ComfyUI a interrompu la tâche.')
      }
      if (statut.completed) return tache
    }

    // Une ligne de points, pour qu'un rendu de trois minutes n'ait pas l'air figé.
    if (Date.now() - dernierPoint > 5_000) {
      process.stdout.write('.')
      dernierPoint = Date.now()
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Toujours rien après ${Math.round(timeoutMs / 60_000)} minutes — tâche ${id}.`)
}

/** Extrait la dernière image produite par la tâche — celle qui sort du détourage. */
async function recuperer(tache) {
  const images = Object.values(tache.outputs ?? {}).flatMap((sortie) => sortie.images ?? [])
  const image = images.at(-1)
  if (!image) throw new Error("La tâche s'est terminée sans produire d'image.")

  const requete = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? '',
    type: image.type ?? 'output',
  })
  const reponse = await api(`/view?${requete}`)
  return Buffer.from(await reponse.arrayBuffer())
}

// ─────────────────────────────────────────────────────────────────────────────

function lireOptions(argv) {
  const valeur = (nom, defaut) => {
    const index = argv.indexOf(nom)
    return index === -1 ? defaut : argv[index + 1]
  }
  return {
    // Graine fixe : deux exécutions doivent rendre les mêmes onze images, sinon
    // la charte dérive à chaque passage. Chaque visuel décale cette base d'un
    // rang, pour que sept adversaires ne partagent pas le même bruit initial.
    seed: Number(valeur('--seed', 20260829)),
    steps: Number(valeur('--steps', 32)),
    cfg: Number(valeur('--cfg', 6.8)),
    cutout: !argv.includes('--no-cutout'),
    cible: valeur('--cible', 'tout'),
    theme: valeur('--theme', null),
    qui: valeur('--qui', null),
    style: valeur('--style', null),
    out: valeur('--out', null),
  }
}

/**
 * La liste des visuels à produire, dans l'ordre.
 *
 * Le décalage de graine se calcule sur le rang dans la liste **complète**, et
 * jamais sur celui dans la liste filtrée. Autrement `--qui machine` tirerait la
 * première graine de la série au lieu de la septième, et refabriquerait une
 * autre image que celle qu'une passe complète vient de produire — la promesse
 * de reproductibilité tomberait précisément au moment où l'on s'en sert, c'est-
 * à-dire quand on reprend un seul visuel raté.
 */
function programme(options) {
  const travaux = []

  if (options.cible === 'tout' || options.cible === 'banniere') {
    const tous = Object.keys(THEMES)
    const themes = options.theme ? [options.theme] : tous
    themes.forEach((theme) => {
      travaux.push({
        nom: `bannière ${theme}`,
        texte: promptBanniere(theme),
        ...FORMATS.banniere,
        seed: options.seed + tous.indexOf(theme),
        negatifSup: THEMES[theme].negatifSup ?? '',
        // Cavale doit regarder vers la **gauche** du cadre : la bannière place
        // le portrait en fond derrière l'échiquier, titre et boutons à sa
        // gauche. Un regard vers la droite sort de la page ; un regard vers la
        // gauche y ramène l'œil.
        //
        // Comme pour les adversaires, l'orientation ne se demande pas, elle se
        // constate — chaque thème note ici s'il faut le retourner.
        miroir: THEMES[theme].miroir ?? false,
        sortie: `apps/web/public/brand/cavale-${theme}.png`,
      })
    })
  }

  if (options.cible === 'tout' || options.cible === 'logo') {
    const tous = Object.keys(MARQUES)
    // Sans `--style`, on ne tire que la piste retenue. La série complète se
    // redemande par `--style tous` quand on veut rouvrir le sujet.
    const styles = options.style === 'tous' ? tous : [options.style ?? MARQUE_RETENUE]
    styles.forEach((style) => {
      travaux.push({
        nom: `marque ${style}`,
        texte: MARQUES[style],
        ...FORMATS.logo,
        // 200 de décalage, sur le même principe que les adversaires : chaque
        // famille garde sa plage de graines même si une autre s'allonge.
        seed:
          style === MARQUE_RETENUE && !options.styleDemande
            ? MARQUE_REGLAGES.seed
            : options.seed + 200 + tous.indexOf(style),
        miroir: style === MARQUE_RETENUE ? MARQUE_REGLAGES.miroir : false,
        negatifSup: NEGATIF_LOGO,
        // Pas de détourage : le pavé fait partie du tirage, et le détourer
        // reviendrait à jeter la moitié du logo.
        sansDetourage: true,
        sortie:
          style === MARQUE_RETENUE
            ? 'apps/web/public/brand/logo-cavale.png'
            : `.essais/marque-${style}.png`,
      })
    })
  }

  if (options.cible === 'tout' || options.cible === 'adversaires') {
    const tous = Object.keys(ADVERSAIRES)
    const ids = options.qui ? [options.qui] : tous
    ids.forEach((id) => {
      travaux.push({
        nom: `${ADVERSAIRES[id].nom} (${id})`,
        texte: promptAdversaire(id),
        ...FORMATS.adversaires,
        // Décalage de 100 pour que la série des adversaires ne recoupe jamais
        // celle des bannières, même si l'une des deux s'allonge un jour.
        seed: options.seed + 100 + tous.indexOf(id),
        armure: ADVERSAIRES[id].armure ?? false,
        dorure: ADVERSAIRES[id].dorure ?? false,
        negatifSup: ADVERSAIRES[id].negatifSup ?? '',
        // Corrigé au cas par cas, après examen des tirages. On ne peut pas le
        // demander au prompt : gauche et droite sont les deux notions qu'un
        // modèle de diffusion confond le plus volontiers, et cinq des sept
        // adversaires sont sortis tournés à gauche sans qu'on ait rien demandé.
        // Retourner les deux autres coûte une ligne ; obtenir sept fois la même
        // orientation par la persuasion coûterait bien davantage.
        miroir: ADVERSAIRES[id].miroir ?? false,
        sortie: `apps/web/public/brand/adversaires/${id}.png`,
      })
    })
  }

  return travaux
}

async function main() {
  const options = lireOptions(process.argv.slice(2))

  if (!['tout', 'banniere', 'adversaires', 'logo'].includes(options.cible)) {
    console.error(`Cible inconnue : ${options.cible}. Au choix : tout, banniere, adversaires, logo.`)
    process.exit(1)
  }
  if (options.theme && !THEMES[options.theme]) {
    console.error(`Thème inconnu : ${options.theme}. Au choix : ${Object.keys(THEMES).join(', ')}.`)
    process.exit(1)
  }
  if (options.style && options.style !== 'tous' && !MARQUES[options.style]) {
    console.error(
      `Style de marque inconnu : ${options.style}. Au choix : ${Object.keys(MARQUES).join(', ')}, ou « tous ».`,
    )
    process.exit(1)
  }
  if (options.qui && !ADVERSAIRES[options.qui]) {
    console.error(`Adversaire inconnu : ${options.qui}. Au choix : ${Object.keys(ADVERSAIRES).join(', ')}.`)
    process.exit(1)
  }

  let stats
  try {
    stats = await (await api('/system_stats')).json()
  } catch {
    console.error(
      `ComfyUI ne répond pas sur ${COMFY}.\n` +
        "Lance-le, puis relance ce script. Si le port diffère, passe-le par COMFY_URL.",
    )
    process.exit(1)
  }

  // Les poids transitent par la RAM avant de rejoindre la VRAM, et c'est le
  // *libre* qui décide. On avertit sans bloquer — ComfyUI sait souvent s'en
  // sortir en déchargeant ce qu'il garde d'un rendu précédent.
  const ramLibre = stats.system.ram_free / 2 ** 30
  const vramLibre = Math.max(...stats.devices.map((d) => d.vram_free / 2 ** 30))
  if (MODELE.poids > Math.max(ramLibre, vramLibre)) {
    console.warn(
      `Attention : ${MODELE.poids} Go à charger, pour ${ramLibre.toFixed(1)} Go de RAM libre ` +
        `et ${vramLibre.toFixed(1)} Go de VRAM libre. Ferme quelques applications si ça échoue.`,
    )
  }

  // On rend à ComfyUI ce qu'il garde d'une session précédente — une fois, au
  // début. Le faire entre chaque visuel obligerait à recharger les 6,6 Go onze
  // fois de suite.
  await api('/free', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ unload_models: true, free_memory: true }),
  }).catch(() => {})

  const travaux = programme(options)
  console.log(
    `Cavale — ${travaux.length} visuel(s), graine ${options.seed}, ` +
      `${options.steps} étapes, guidage ${options.cfg}`,
  )
  if (!options.cutout) console.log('Détourage désactivé : le fond restera opaque.')

  for (const travail of travaux) {
    const rendre = async (detail) =>
      attendre(
        await soumettre(
          graphe({
            seed: travail.seed,
            steps: options.steps,
            cfg: options.cfg,
            texte: travail.texte,
            largeur: travail.largeur,
            hauteur: travail.hauteur,
            cutout: options.cutout && !travail.sansDetourage,
            armure: travail.armure ?? false,
            dorure: travail.dorure ?? false,
            sup: travail.negatifSup ?? '',
            miroir: travail.miroir ?? false,
            reserve: travail.reserve,
            detail,
          }),
        ),
      )

    process.stdout.write(`${travail.nom} `)
    let tache
    try {
      tache = await rendre(true)
    } catch (erreur) {
      if (!options.cutout || !/cv2|opencv/i.test(erreur.message)) throw erreur
      console.warn(
        `\nOpenCV incomplet dans le venv de ComfyUI (${erreur.message.trim()}).\n` +
          "Nouvel essai sans l'affinage des contours.",
      )
      tache = await rendre(false)
    }

    const png = await recuperer(tache)
    const sortie = resolve(ROOT, options.out ?? travail.sortie)
    await mkdir(dirname(sortie), { recursive: true })
    await writeFile(sortie, png)
    console.log(` → ${travail.sortie} (${Math.round(png.length / 1024)} Ko)`)
  }
}

main().catch((erreur) => {
  console.error(`\n${erreur.message}`)
  process.exit(1)
})
