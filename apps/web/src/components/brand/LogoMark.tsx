/**
 * La marque du Coup Parfait : Cavale, le cavalier.
 *
 * Le cavalier plutôt que le roi ou la dame, parce que c'est la pièce qui saute
 * par-dessus les autres — l'idée d'un chemin qu'on ne voyait pas.
 *
 * C'est une **image**, et le détour par lequel on y arrive mérite d'être
 * raconté, parce que le réflexe inverse est très fort.
 *
 * La marque a d'abord été un tracé vectoriel : un cavalier dessiné à la main,
 * puis un contour relevé sur une sculpture et simplifié. Le vecteur avait deux
 * arguments imparables — net à 16 px, et teintable par les variables de thème,
 * donc une seule marque pour quatre habillages. Il en avait un troisième, moins
 * dit : il était laid. Le contour alpha d'un rendu photographique est bosselé,
 * la simplification laisse des ressauts, l'arête dorsale reprise du contour se
 * lit comme un liseré autour de la pièce plutôt que comme une crinière, et
 * l'aplat de couleur qui remplit tout ça ne dit plus rien de la matière.
 *
 * Une sculpture éclairée ne se réduit pas à sa silhouette sans perdre ce qui la
 * rendait belle. On garde donc le tirage tel quel : `public/brand/logo-cavale.png`,
 * produit par `scripts/build-cavale.mjs --cible logo` — une pièce de buis
 * sculptée sur champ violet, prompt et graine versionnés dans le script.
 *
 * Ce qu'on perd, et qu'il faut assumer : la marque ne suit plus les quatre
 * thèmes. Elle reste violette sur `club` comme sur `contraste`. C'est le sort
 * ordinaire d'un logo — celui de tout le monde ne change pas de couleur selon
 * la page — et c'est le prix d'une marque qu'on a envie de regarder.
 */

import Image from 'next/image'
import clsx from 'clsx'

/**
 * ── Le champ violet, et pourquoi il disparaît ────────────────────────────
 *
 * Le tirage `logo-cavale.png` est un carré **plein** : la sculpture est posée
 * sur un aplat violet cuit dans le fichier. Cela donnait une pastille violette
 * dans un en-tête qui l'est déjà, sur un fond qui l'est encore — la marque se
 * dissolvait dans son propre habillage, et se retrouvait franchement fausse
 * sur les thèmes qui ne sont pas violets.
 *
 * On compose donc la vignette ici plutôt que de la subir : un fond noir, la
 * sculpture détourée posée dessus, et un anneau à la couleur d'accent du
 * thème. Le noir fait ressortir le bois et la résine bien mieux que le violet,
 * et l'anneau rend enfin à la marque ce que le tirage lui refusait — suivre
 * l'habillage choisi.
 *
 * La sculpture vient de `cavale-aurora.png`, la seule déclinaison au fond
 * transparent qui soit cadrée en pied. Elle est ancrée en bas : un cavalier
 * d'échecs repose sur sa base, le faire flotter au centre d'un carré lui
 * retire son socle.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={clsx(
        // `items-end` puis `justify-items-center` séparément : un
        // `place-items` suivi d'un `justify-items` fait dépendre le résultat de
        // l'ordre des règles dans la feuille produite, ce qui n'est pas une
        // garantie.
        'relative grid shrink-0 items-end justify-items-center overflow-hidden',
        'rounded-[22%] bg-[#08070d] ring-1 ring-inset ring-accent/70',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/brand/cavale-aurora.png"
        alt=""
        width={size * 2}
        height={size * 2}
        // Au-dessus de la ligne de flottaison sur toutes les pages, et
        // minuscule : la charger tout de suite coûte quelques kilo-octets et
        // évite que l'en-tête se compose sans sa marque.
        //
        // `priority` et non `preload` : ce dernier n'existe pas côté `Image`,
        // il partait tel quel dans le HTML comme attribut inconnu et ne
        // préchargeait donc rien du tout.
        priority
        className="h-[86%] w-auto object-contain object-bottom"
      />
    </span>
  )
}

/**
 * Le verrou complet : la marque et le nom, à utiliser partout où la place le
 * permet. En dessous de `sm`, l'en-tête n'affiche que la marque.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={className}>
      <LogoMark size={size} />
      <span className="font-display font-semibold tracking-tight">Le Coup Parfait</span>
    </span>
  )
}
