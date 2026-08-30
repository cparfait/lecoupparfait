'use client'

/**
 * Cavale, dans la bannière.
 *
 * La sculpture est posée derrière l'échiquier, pas à côté : la maquette la met
 * au centre et laisse le plateau flotter par-dessus. C'est ce chevauchement qui
 * donne la profondeur — deux colonnes bien rangées côte à côte auraient l'air
 * d'un gabarit.
 *
 * Ce composant affichait auparavant une photographie de coach, produite par
 * `build-coach.mjs` : un septuagénaire à lunettes, tiré au sort entre un homme
 * et une femme selon le thème. C'était une image de banque, sans rapport avec
 * le cavalier du logo, et qui obligeait à trancher des questions d'âge, de
 * genre et d'origine que `lib/avatars.ts` refuse explicitement de poser
 * ailleurs. Cavale ne les pose pas : c'est une pièce de jeu.
 *
 * Quatre contraintes tiennent ce composant :
 *
 *  1. **Un tirage par thème.** Cavale porte la couleur d'accent de l'habillage
 *     choisi : résine violette en `aurora`, buis en `club`, laque jaune en
 *     `contraste`. Les images viennent de `scripts/build-cavale.mjs`.
 *  2. **L'image peut ne pas exister.** Tant qu'un thème n'a pas la sienne, la
 *     bannière doit rester présentable : on masque le calque au lieu
 *     d'afficher une icône cassée.
 *  3. **Le fond doit être transparent.** L'application a quatre thèmes, dont un
 *     clair. Un fond incrusté dans le PNG se verrait comme un rectangle sur
 *     `#f7f7f9`. Le fondu radial ci-dessous fait le reste du raccord.
 *  4. **Rien en dessous de `lg`.** Sur mobile la colonne unique empile texte et
 *     échiquier ; une sculpture en fond ne ferait que gêner la lecture.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePreferences } from '@/lib/store/preferences.ts'

export function CavalePortrait() {
  const theme = usePreferences((state) => state.theme)
  const hydrated = usePreferences((state) => state.hydrated)
  const [manquants, setManquants] = useState<string[]>([])

  // Avant l'hydratation, `layout.tsx` pose `data-theme="aurora"` sur le
  // document : on s'aligne dessus, sinon le serveur et le client rendraient
  // deux `src` différents.
  const actuel = hydrated ? theme : 'aurora'
  const src = `/brand/cavale-${actuel}.png`

  if (manquants.includes(src)) return null

  return (
    <div
      aria-hidden
      // `left-[33%]`, et le chiffre se lit entre deux voisins.
      //
      // À droite, l'échiquier commence à 60 % de la bannière. À gauche, le
      // sous-titre pousse ses lignes les plus longues jusqu'à 40 %. La
      // sculpture fait 30 % de large : il n'existe aucune position qui dégage
      // les deux, l'intervalle libre étant plus étroit qu'elle.
      //
      // Le réglage arbitre donc entre deux gênes. À 37 %, le plateau mangeait
      // 38 % de la pièce — et c'était sa tête, la seule partie qui la rende
      // reconnaissable. À 30 %, il n'en mangeait plus que 16 %, mais le mufle
      // passait sous deux lignes du sous-titre. À 33 %, le plateau en couvre un
      // quart par l'arrière-train, et il ne reste qu'une ligne effleurée.
      className="pointer-events-none absolute inset-y-0 left-[33%] hidden w-[40%] select-none lg:block"
      style={{
        // Un fondu **radial** d'abord, un fondu vertical ensuite.
        //
        // Les fondus latéraux linéaires qu'on avait ici ne servaient à rien, et
        // pour une raison qui ne saute pas aux yeux : le masque s'applique au
        // cadre, alors que `object-contain` centre la photo **à l'intérieur**
        // de ce cadre. Le bord réel de l'image tombait donc au milieu de la
        // zone opaque du masque, et restait franc — la coupe verticale du
        // blazer était parfaitement visible pendant que le dégradé, lui,
        // s'appliquait sagement à du vide.
        //
        // Un dégradé radial n'a aucun bord droit par construction : quel que
        // soit le cadrage obtenu au tirage, aucune arête rectangulaire ne peut
        // survivre. Il est placé en premier pour qu'il reste seul actif sur les
        // moteurs qui ignorent `mask-composite` — le pire cas garde donc le
        // comportement qu'on cherche.
        // **Un seul calque de masque**, et c'est le point important.
        //
        // La version précédente en superposait deux — un fondu latéral, un
        // fondu vers le bas — en comptant sur `mask-composite: intersect` pour
        // ne garder que leur intersection. Quand cette propriété n'est pas
        // appliquée, les calques s'*additionnent* : un pixel reste visible dès
        // qu'un seul des deux le laisse passer. Le fondu vertical, opaque sur
        // toute la largeur en haut, réaffichait donc exactement le bord droit
        // que le fondu latéral venait d'effacer. Deux masques qui se défont
        // l'un l'autre, et une découpe franche à l'écran.
        //
        // Une seule ellipse règle la question : elle n'a aucun bord droit, elle
        // fond les quatre côtés à la fois, et il n'y a plus rien à composer.
        // Le fondu est long — il commence à 26 % du rayon — parce qu'un dégradé
        // court ne supprime pas la ligne, il la déplace : l'œil ne voit pas la
        // transition, il voit l'endroit où elle s'arrête.
        // Le rayon a longtemps dû rester **sous 50 %**, et cette contrainte est
        // levée. Elle mérite d'être expliquée, parce qu'elle a l'air d'une
        // règle générale alors que c'en était une locale.
        //
        // Tant que l'image remplissait le cadre — `object-cover`, imposé par
        // des portraits au fond incrusté — un rayon de 64 % plaçait les bords
        // gauche et droit du cadre à 50/64, soit 78 % du dégradé, où le masque
        // est encore opaque à un tiers. Le fondu ne s'achevait jamais et
        // l'image se terminait par une arête franche : exactement la ligne
        // droite qu'on essayait d'effacer. À 46 %, le bord du cadre tombait
        // au-delà du rayon, donc dans le transparent, et l'arête disparaissait.
        //
        // En `object-contain`, la sculpture n'occupe plus que le milieu du
        // cadre — 429 px sur 572 — et ses bords gauche et droit sont à 12 % et
        // 88 %. Les bords du cadre, eux, sont vides : il n'y a plus rien à y
        // couper, et le rayon peut dépasser 50 % sans rien réveiller.
        //
        // On en profite, parce que le réglage serré avait un défaut que
        // `cover` masquait : à 46 %, les flancs de la pièce tombaient dans la
        // zone à 9 % d'opacité et s'effaçaient presque. La sculpture était
        // entière et illisible. Le cœur opaque va donc jusqu'à 42 % du rayon,
        // et le fondu ne travaille plus que sur le pourtour.
        maskImage:
          'radial-gradient(58% 66% at 50% 38%, #000 42%, rgba(0,0,0,0.88) 62%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.14) 92%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(58% 66% at 50% 38%, #000 42%, rgba(0,0,0,0.88) 62%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.14) 92%, transparent 100%)',
      }}
    >
      <Image
        // La clé force un remontage au changement de thème : sans elle, React
        // réutilise la balise et `onError` ne se redéclenche pas pour la
        // nouvelle source.
        key={src}
        src={src}
        alt=""
        fill
        sizes="40vw"
        // Élément le plus lourd de la bannière, et au-dessus de la ligne de
        // flottaison : on le charge tout de suite. `preload` remplace
        // `priority`, déprécié depuis Next 16.
        preload
        onError={() => setManquants((liste) => [...liste, src])}
        // `contain`, et c'est un retour en arrière assumé.
        //
        // Ce fichier a longtemps porté `cover`, pour une raison écrite noir sur
        // blanc : en `contain`, le bord franc de l'image tombait à l'intérieur
        // de la zone encore opaque du masque et ressortait net. C'était exact,
        // et c'était un symptôme. Les portraits du coach avaient un fond de
        // studio **incrusté** — le détourage n'avait jamais fonctionné, voir
        // `build-cavale.mjs` — donc ils avaient un bord rectangulaire à faire
        // disparaître. `cover` le repoussait hors cadre ; il ne le supprimait
        // pas.
        //
        // Les tirages de Cavale sont réellement détourés et recadrés au plus
        // près du sujet. Il n'y a plus de rectangle : le seul bord est la
        // silhouette de la sculpture, que le fondu n'a aucune raison de cacher.
        //
        // Et `cover` avait entre-temps un coût qu'on ne payait plus pour rien.
        // Le cadre est plus large, en proportion, que l'image ne l'est : pour le
        // remplir, `cover` agrandissait la sculpture jusqu'à en couper le quart
        // inférieur. On ne voyait plus une pièce d'échecs mais un fragment
        // grossi — encolure et bas de crinière — que le masque achevait de
        // rendre illisible. `contain` la montre entière, donc plus petite, donc
        // reconnaissable.
        className="object-contain object-top"
      />
    </div>
  )
}
