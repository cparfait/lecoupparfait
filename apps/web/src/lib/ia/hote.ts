/**
 * Reconnaissance des hôtes locaux.
 *
 * Cette distinction commande deux comportements opposés, et c'est pour ça
 * qu'elle vit dans son propre fichier plutôt que dupliquée aux deux endroits :
 *
 *  - **côté navigateur** (`transport.ts`), un hôte local est appelé
 *    directement : le modèle tourne sur la machine de l'utilisateur, faire un
 *    détour par le serveur serait absurde, et de toute façon le serveur ne
 *    saurait pas l'atteindre ;
 *  - **côté serveur** (les routes de relais), un hôte local est au contraire
 *    **refusé** : accepter de relayer vers `localhost` transformerait le relais
 *    en outil d'exploration du réseau interne de l'instance.
 *
 * Le même test, donc, avec deux conclusions inverses — d'où l'intérêt qu'il
 * n'existe qu'en un seul exemplaire.
 */

/**
 * Vrai si le nom d'hôte désigne la machine locale ou un réseau privé.
 *
 * Le test porte sur le nom écrit dans l'URL, pas sur une résolution DNS : côté
 * navigateur c'est suffisant et c'est tout ce qu'on peut faire. Côté serveur,
 * les routes de relais ajoutent une résolution DNS par-dessus, parce qu'un nom
 * public peut parfaitement pointer vers une adresse privée.
 */
export function estHoteLocal(hostname: string): boolean {
  const hote = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '')

  if (hote === 'localhost' || hote.endsWith('.localhost')) return true
  if (hote === '::1' || hote === '0.0.0.0' || hote === '::') return true
  // `.local` est le domaine de résolution mDNS du réseau domestique.
  if (hote.endsWith('.local')) return true

  return estAdresseLocale(hote)
}

/**
 * Vrai si la chaîne est une adresse IP littérale non routable sur Internet.
 *
 * Utilisé aussi bien sur le nom d'hôte écrit dans l'URL que sur les adresses
 * obtenues par résolution DNS côté serveur.
 */
export function estAdresseLocale(adresse: string): boolean {
  const valeur = adresse.trim().toLowerCase().replace(/^\[|\]$/g, '')

  // IPv6 : bouclage, lien-local (fe80::/10) et adresses uniques locales
  // (fc00::/7, c'est-à-dire les préfixes fc et fd).
  if (valeur === '::1' || valeur === '::') return true
  if (/^fe[89ab][0-9a-f]:/.test(valeur)) return true
  if (/^f[cd][0-9a-f]{2}:/.test(valeur)) return true
  // IPv6 encapsulant une IPv4 (`::ffff:127.0.0.1`) : on teste la partie IPv4.
  const encapsulee = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(valeur)?.[1]
  if (encapsulee) return estAdresseLocale(encapsulee)

  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(valeur)
  if (!octets) return false
  const [a, b] = [Number(octets[1]), Number(octets[2])]
  if (octets.slice(1).some((octet) => Number(octet) > 255)) return false

  if (a === 0) return true // « cet hôte-ci »
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // bouclage
  if (a === 169 && b === 254) return true // lien-local, dont les métadonnées cloud
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10, CGNAT
  if (a >= 224) return true // multicast et réservé

  return false
}

/** Vrai si l'URL vise la machine locale ou un réseau privé. Tolère l'invalide. */
export function urlEstLocale(url: string): boolean {
  try {
    return estHoteLocal(new URL(url).hostname)
  } catch {
    return false
  }
}
