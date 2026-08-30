/**
 * Garde-fous du relais d'IA — code serveur uniquement.
 *
 * Le relais existe pour une raison unique : les navigateurs refusent d'appeler
 * directement les API des fournisseurs distants. Il ne doit donc rien faire de
 * plus que recopier une requête vers une poignée d'adresses connues.
 *
 * Sans ces vérifications, la route deviendrait un proxy ouvert : n'importe qui
 * pourrait s'en servir pour faire émettre à notre serveur des requêtes vers le
 * réseau interne de l'hébergeur — base de données, service d'analyse,
 * métadonnées d'instance cloud. C'est la faille dite « SSRF », et elle est
 * d'autant plus facile à introduire ici que le relais est, par nature, une
 * fonction qui prend une URL en paramètre.
 *
 * Deux règles, donc :
 *   1. un fournisseur intégré ne peut viser que sa propre origine ;
 *   2. un fournisseur personnalisé ne peut viser qu'une adresse publique,
 *      vérifiée par résolution DNS — un nom public peut très bien pointer vers
 *      une adresse privée.
 */

import { lookup } from 'node:dns/promises'
import { PROVIDERS } from './providers/index.ts'
import { estAdresseLocale, estHoteLocal } from './hote.ts'

/**
 * Origines autorisées, déduites des fournisseurs eux-mêmes.
 *
 * On ne recopie pas les domaines à la main : on demande à chaque fournisseur
 * l'URL qu'il utiliserait. Ajouter un fournisseur dans `providers/` suffit donc
 * à l'autoriser ici, et il est impossible que les deux listes divergent.
 */
const ORIGINES_INTEGREES: Map<string, Set<string>> = new Map(
  PROVIDERS.map((provider) => {
    const origines = new Set<string>()
    for (const url of [
      provider.chatUrl('modele', 'cle'),
      provider.streamChatUrl('modele', 'cle'),
      provider.modelsUrl('cle'),
    ]) {
      try {
        origines.add(new URL(url).origin)
      } catch {
        // Une URL malformée dans un fournisseur : on ne l'autorise pas, et le
        // fournisseur sera simplement inutilisable via le relais.
      }
    }
    return [provider.id, origines] as const
  }),
)

export interface Refus {
  message: string
  status: number
}

/**
 * Vérifie qu'on a le droit de relayer vers cette URL. `null` = autorisé.
 *
 * L'ordre des contrôles compte : on écarte d'abord ce qui est structurellement
 * inacceptable (protocole, hôte local) avant de faire la moindre résolution
 * DNS, qui est la seule étape coûteuse.
 */
export async function verifierCible(providerId: unknown, url: unknown): Promise<Refus | null> {
  if (typeof providerId !== 'string' || typeof url !== 'string' || !providerId || !url) {
    return { message: 'Requête incomplète.', status: 400 }
  }

  let cible: URL
  try {
    cible = new URL(url)
  } catch {
    return { message: 'Adresse illisible.', status: 400 }
  }

  if (cible.protocol !== 'https:' && cible.protocol !== 'http:') {
    return { message: 'Seuls http et https sont relayés.', status: 400 }
  }

  // Un service local se joint depuis le navigateur, jamais depuis le serveur :
  // le relais n'a donc aucune raison légitime de viser une adresse privée.
  if (estHoteLocal(cible.hostname)) {
    return {
      message: 'Un service local s’appelle depuis ton navigateur, pas par le serveur.',
      status: 400,
    }
  }

  const integre = ORIGINES_INTEGREES.get(providerId)
  if (integre) {
    if (!integre.has(cible.origin)) {
      return { message: 'Cette adresse ne correspond pas à ce fournisseur.', status: 400 }
    }
    return null
  }

  // Fournisseur personnalisé : l'utilisateur choisit l'adresse, on ne peut donc
  // pas la comparer à une liste. On vérifie ce qui reste vérifiable — qu'elle
  // sort bien sur Internet.
  if (!providerId.startsWith('custom-')) {
    return { message: 'Fournisseur inconnu.', status: 400 }
  }

  try {
    const adresses = await lookup(cible.hostname, { all: true })
    if (adresses.length === 0) {
      return { message: 'Nom d’hôte introuvable.', status: 400 }
    }
    if (adresses.some((entree) => estAdresseLocale(entree.address))) {
      return { message: 'Cette adresse pointe vers un réseau privé.', status: 400 }
    }
  } catch {
    return { message: 'Nom d’hôte introuvable.', status: 400 }
  }

  return null
}

/**
 * Normalise les en-têtes reçus du navigateur.
 *
 * On ne recopie pas aveuglément : un en-tête `Host` ou `Cookie` glissé dans la
 * liste partirait chez le fournisseur avec la session de l'utilisateur.
 */
export function nettoyerEntetes(brut: unknown): Array<[string, string]> {
  if (!Array.isArray(brut)) return []
  const interdits = new Set(['host', 'cookie', 'set-cookie', 'connection', 'content-length'])
  const entetes: Array<[string, string]> = []
  for (const entree of brut) {
    if (!Array.isArray(entree) || entree.length !== 2) continue
    const [nom, valeur] = entree
    if (typeof nom !== 'string' || typeof valeur !== 'string') continue
    if (interdits.has(nom.toLowerCase())) continue
    entetes.push([nom, valeur])
  }
  return entetes
}
