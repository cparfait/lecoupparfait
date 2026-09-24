/**
 * `POST /api/ia/chat` — le relais vers le fournisseur d'IA ne doit pas pouvoir
 * être retourné vers le réseau interne de l'instance.
 *
 * Tout se passe sur la machine, sans réseau extérieur : deux petits serveurs
 * HTTP locaux jouent le fournisseur et le service interne.
 */

import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, test } from 'node:test'
import { simulerModule } from './support/modules.ts'

/** Le service interne qu'une redirection essaierait d'atteindre. */
let interne: Server
let appelsInterne = 0
/** Un fournisseur « public » qui répond toujours par une redirection. */
let fournisseur: Server
let appelsFournisseur = 0

function ecouter(serveur: Server): Promise<string> {
  return new Promise((resoudre) => {
    serveur.listen(0, '127.0.0.1', () => {
      const { port } = serveur.address() as AddressInfo
      resoudre(`http://127.0.0.1:${port}`)
    })
  })
}

let adresseInterne = ''
let adresseFournisseur = ''

before(async () => {
  interne = createServer((_requete, reponse) => {
    appelsInterne++
    reponse.end('secret du réseau interne')
  })
  adresseInterne = await ecouter(interne)

  fournisseur = createServer((_requete, reponse) => {
    appelsFournisseur++
    reponse.writeHead(302, { location: `${adresseInterne}/secret` })
    reponse.end('corps de la redirection')
  })
  adresseFournisseur = await ecouter(fournisseur)
})

after(() => {
  interne.close()
  fournisseur.close()
})

beforeEach(() => {
  appelsInterne = 0
  appelsFournisseur = 0
})

/*
  Le `relayer` réel, dérouté vers le fournisseur local.

  Une URL de fournisseur intégré passe `verifierCible` sans résolution DNS ;
  c'est ensuite `relayer` qui ouvrirait la connexion vers Internet. On garde
  donc tout le module tel quel — contrôles compris —, et l'on remplace
  seulement l'adresse que `relayer` joint par celle du serveur local. Écrite en
  IP littérale, elle ne passe pas par la résolution qui refuse le bouclage :
  c'est ce qui permet au faux fournisseur d'être joint, et à la route d'être
  mise face à une vraie `302`.
*/
const cheminRelais = new URL('../src/lib/ia/relais.ts', import.meta.url).href
const relaisReel = await import(cheminRelais)
const ciblesDemandees: string[] = []
simulerModule(cheminRelais, {
  ...relaisReel,
  relayer: (url: string, init: Parameters<typeof relaisReel.relayer>[1]) => {
    ciblesDemandees.push(url)
    return relaisReel.relayer(adresseFournisseur, init)
  },
})

const { POST } = await import('../src/app/api/ia/chat/route.ts')
const { PROVIDERS } = await import('../src/lib/ia/providers/index.ts')

let numero = 0
function relayer(charge: Record<string, unknown>) {
  numero++
  return POST(
    new Request('http://test/api/ia/chat', {
      method: 'POST',
      // Une adresse par appel : le limiteur de la route compte par adresse,
      // et ce n'est pas lui qu'on teste ici.
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${numero}` },
      body: JSON.stringify({ body: { messages: [] }, ...charge }),
    }),
  )
}

test('une adresse locale ou privée est refusée avant tout appel', async () => {
  const port = new URL(adresseInterne).port
  for (const url of [
    `http://127.0.0.1:${port}/secret`,
    `http://localhost:${port}/secret`,
    `http://[::1]:${port}/secret`,
    `http://[::ffff:7f00:1]:${port}/secret`,
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://postgres.local:5432/',
  ]) {
    const reponse = await relayer({ providerId: 'custom-essai', url })
    assert.equal(reponse.status, 400, url)
  }
  assert.equal(appelsInterne, 0, 'le service interne n’a jamais été joint')
  assert.equal(ciblesDemandees.length, 0, 'relayer n’a jamais été appelé')
})

test('un fournisseur intégré ne peut viser que sa propre origine', async () => {
  const reponse = await relayer({ providerId: 'openai', url: 'https://exemple.invalid/v1/chat' })
  assert.equal(reponse.status, 400)
  assert.equal(ciblesDemandees.length, 0)
})

test('une redirection du fournisseur n’est pas suivie', async () => {
  const openai = PROVIDERS.find((provider) => provider.id === 'openai')
  assert.ok(openai, 'le fournisseur openai existe')
  const reponse = await relayer({ providerId: 'openai', url: openai.chatUrl('modele', 'cle') })

  assert.equal(appelsFournisseur, 1, 'le fournisseur a bien été appelé')
  assert.equal(reponse.status, 502)
  const texte = await reponse.text()
  assert.doesNotMatch(texte, /secret du réseau interne/)
  assert.doesNotMatch(texte, /corps de la redirection/)
  assert.equal(appelsInterne, 0, 'la cible de la redirection n’a pas été jointe')
})
