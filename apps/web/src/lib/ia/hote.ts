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
  const hote = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')

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
 *
 * Pas de `node:net` ici : ce fichier est aussi chargé par le navigateur
 * (`transport.ts`). L'IPv6 est donc décodée à la main, en huit groupes de
 * seize bits, **avant** tout test. Les motifs appliqués à la chaîne brute
 * laissaient passer `::7f00:1`, `::127.0.0.1` ou `64:ff9b::a9fe:a9fe` : la
 * même adresse privée, simplement écrite autrement.
 */
export function estAdresseLocale(adresse: string): boolean {
  const valeur = adresse
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    // L'identifiant de zone (`fe80::1%eth0`) ne change pas l'adresse visée.
    .replace(/%.*$/, '')

  const ipv4 = lireIpv4(valeur)
  if (ipv4) return ipv4EstLocale(ipv4)

  const groupes = lireIpv6(valeur)
  return groupes ? ipv6EstLocale(groupes) : false
}

/** Les quatre octets d'une IPv4 en notation pointée, ou `null`. */
function lireIpv4(valeur: string): number[] | null {
  const morceaux = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(valeur)
  if (!morceaux) return null
  const octets = morceaux.slice(1).map(Number)
  return octets.every((octet) => octet <= 255) ? octets : null
}

function ipv4EstLocale([a = 0, b = 0]: number[]): boolean {
  if (a === 0) return true // « cet hôte-ci »
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // bouclage
  if (a === 169 && b === 254) return true // lien-local, dont les métadonnées cloud
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10, CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15, bancs d'essai
  if (a >= 224) return true // multicast et réservé
  return false
}

/**
 * Les huit groupes de seize bits d'une IPv6, ou `null` si ce n'en est pas une.
 *
 * Accepte l'abréviation `::` et une IPv4 pointée en fin d'adresse
 * (`::ffff:1.2.3.4`), qui compte pour deux groupes.
 */
function lireIpv6(valeur: string): number[] | null {
  if (!valeur.includes(':')) return null
  let texte = valeur
  const finIpv4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(texte)?.[1]
  if (finIpv4) {
    const octets = lireIpv4(finIpv4)
    if (!octets) return null
    const [a = 0, b = 0, c = 0, d = 0] = octets
    const hex = (haut: number, bas: number) => ((haut << 8) | bas).toString(16)
    texte = texte.slice(0, -finIpv4.length) + `${hex(a, b)}:${hex(c, d)}`
  }

  const moities = texte.split('::')
  if (moities.length > 2) return null
  const lire = (partie = '') => (partie === '' ? [] : partie.split(':'))
  const tete = lire(moities[0])
  const queue = lire(moities[1])
  const manquants = 8 - tete.length - queue.length
  if (moities.length === 2 ? manquants < 1 : manquants !== 0) return null

  const groupes: number[] = []
  for (const groupe of [...tete, ...Array<string>(manquants).fill('0'), ...queue]) {
    if (!/^[0-9a-f]{1,4}$/.test(groupe)) return null
    groupes.push(parseInt(groupe, 16))
  }
  return groupes
}

function ipv6EstLocale(g: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, , g4 = 0, g5 = 0, g6 = 0, g7 = 0] = g
  /** L'IPv4 portée par deux groupes consécutifs. */
  const ipv4 = (haut: number, bas: number) => [haut >> 8, haut & 0xff, bas >> 8, bas & 0xff]
  const nuls = (debut: number, fin: number) => g.slice(debut, fin).every((x) => x === 0)

  // `::` (non spécifiée) et `::1` (bouclage).
  if (nuls(0, 7) && (g7 === 0 || g7 === 1)) return true
  // Lien-local fe80::/10, locales uniques fc00::/7, multicast ff00::/8.
  if ((g0 & 0xffc0) === 0xfe80) return true
  if ((g0 & 0xfe00) === 0xfc00) return true
  if ((g0 & 0xff00) === 0xff00) return true

  // Les formes qui transportent une IPv4 : on juge l'IPv4 qu'elles portent,
  // puisque c'est elle que la pile réseau finira par joindre.
  // Compatible ::a.b.c.d et mappée ::ffff:a.b.c.d.
  if (nuls(0, 5) && (g5 === 0 || g5 === 0xffff)) return ipv4EstLocale(ipv4(g6, g7))
  // Traduite ::ffff:0:a.b.c.d (RFC 2765).
  if (nuls(0, 4) && g4 === 0xffff && g5 === 0) return ipv4EstLocale(ipv4(g6, g7))
  // NAT64 64:ff9b::/96, et 64:ff9b:1::/48, réservé aux traducteurs locaux.
  if (g0 === 0x64 && g1 === 0xff9b) {
    if (g2 === 1) return true
    if (nuls(2, 6)) return ipv4EstLocale(ipv4(g6, g7))
  }
  // 6to4 2002::/16 : l'IPv4 suit immédiatement le préfixe.
  if (g0 === 0x2002) return ipv4EstLocale(ipv4(g1, g2))
  // Teredo 2001::/32 : l'IPv4 du client occupe les 32 derniers bits, inversés.
  if (g0 === 0x2001 && g1 === 0) return ipv4EstLocale(ipv4(g6 ^ 0xffff, g7 ^ 0xffff))

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
