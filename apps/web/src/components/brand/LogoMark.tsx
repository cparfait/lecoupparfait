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

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-cavale.png"
      alt=""
      // Décoratif : le lien qui l'entoure porte déjà « Le Coup Parfait —
      // accueil », et le nom est écrit à côté dès que la place le permet.
      aria-hidden
      width={size}
      height={size}
      // Au-dessus de la ligne de flottaison sur toutes les pages, et minuscule :
      // la charger tout de suite coûte quelques kilo-octets et évite que
      // l'en-tête se compose sans sa marque.
      preload
      // Les coins arrondis sont ici et non dans le fichier : le tirage est un
      // carré plein, et le même fichier sert aux icônes système, que
      // `build-icons.mjs` arrondit de son côté au rayon qui leur convient.
      className={clsx('rounded-[22%] object-cover', className)}
      style={{ width: size, height: size }}
    />
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
