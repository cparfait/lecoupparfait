'use client'

/**
 * Les outils : ce sur quoi le projet est bâti, et ce qui a bougé depuis.
 *
 * Cet onglet répond à trois questions, dans l'ordre où elles se posent quand on
 * l'ouvre : **est-ce que tout est crédité** (plusieurs licences l'exigent),
 * **est-ce que la page publique dit encore la vérité**, et **est-ce qu'il existe
 * plus récent**.
 *
 * Les deux premières se répondent sans réseau, en confrontant le catalogue aux
 * `package.json` du dépôt. La troisième demande d'aller voir dehors — registre
 * npm et étiquettes GitHub — et ne part donc qu'au clic, jamais au chargement :
 * le projet ne fait aucune requête vers un tiers, et cette exception doit rester
 * un geste volontaire d'administrateur.
 *
 * Ce n'est pas un tableau de bord de sécurité. Il ne dit pas si une version
 * porte une faille — c'est le travail de `npm audit`, qui a son propre langage —
 * mais il dit ce qu'on utilise, sous quelle licence, et depuis quand on ne l'a
 * pas regardé.
 */

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Package, RefreshCw, Search } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Chip, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { TITRES_CATEGORIE, type CategorieCredit } from '@/lib/credits/catalogue.ts'
import { Mesure } from './graphiques.tsx'

interface Outil {
  nom: string
  auteur: string
  licence: string
  url: string
  categorie: CategorieCredit
  paquet: string | null
  github: string | null
  versionCatalogue: string | null
  plage: string | null
  installee: string | null
  licenceReelle: string | null
  derniere: string | null
}

interface Reponse {
  outils: Outil[]
  nonCredites: Array<{
    paquet: string
    plage: string
    installee: string | null
    licenceReelle: string | null
    espaces: string[]
  }>
  orphelins: Array<{ nom: string; paquet?: string }>
  versionsDivergentes: Array<{
    nom: string
    version: string
    fichier: string
    introuvable: boolean
  }>
  depot: { lu: boolean; espacesLus: string[]; espacesIllisibles: string[] }
  majCherchees: boolean
}

const ORDRE: CategorieCredit[] = ['moteur', 'donnees', 'ressources', 'bibliotheque']

/**
 * Deux versions désignent-elles la même chose ?
 *
 * Les étiquettes ne s'écrivent pas partout pareil : Stockfish publie `sf_18`
 * quand le catalogue dit « 18 », Lc0 publie `v0.32.1`. On normalise le peu
 * qu'il faut, et l'on préfère répondre « à vérifier » plutôt que d'affirmer
 * « obsolète » sur une différence de préfixe.
 */
function normaliser(version: string): string {
  return version.trim().toLowerCase().replace(/^sf_/, '').replace(/^v/, '')
}

type Etat = 'ajour' | 'plusrecent' | 'inconnue'

function comparer(actuelle: string | null, derniere: string | null): Etat {
  if (!actuelle || !derniere) return 'inconnue'
  return normaliser(actuelle) === normaliser(derniere) ? 'ajour' : 'plusrecent'
}

export function Outils() {
  const [donnees, setDonnees] = useState<Reponse | null>(null)
  const [cherche, setCherche] = useState(false)

  const charger = useCallback(async (avecMaj: boolean) => {
    if (avecMaj) setCherche(true)
    try {
      const reponse = await fetch(`/api/admin/outils${avecMaj ? '?maj=1' : ''}`, {
        cache: 'no-store',
      })
      if (!reponse.ok) {
        toast.error('Lecture impossible.')
        return
      }
      setDonnees(await reponse.json())
    } catch {
      toast.error('Le serveur est injoignable.')
    } finally {
      setCherche(false)
    }
  }, [])

  useEffect(() => {
    void charger(false)
  }, [charger])

  if (!donnees) return <Skeleton className="h-64 w-full" />

  const aMettreAJour = donnees.outils.filter(
    (outil) => comparer(outil.installee ?? outil.versionCatalogue, outil.derniere) === 'plusrecent',
  )
  const alertes =
    donnees.nonCredites.length + donnees.orphelins.length + donnees.versionsDivergentes.length

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Mesure
          titre="Outils suivis"
          valeur={donnees.outils.length}
          note="moteurs, données, ressources, bibliothèques"
        />
        <Mesure
          titre="Bibliothèques"
          valeur={donnees.outils.filter((outil) => outil.paquet).length}
          note="dépendances d’exécution"
        />
        <Mesure
          titre="À corriger"
          valeur={alertes}
          note={alertes === 0 ? 'catalogue et dépôt d’accord' : 'détail ci-dessous'}
        />
        <Mesure
          titre="Mises à jour"
          valeur={donnees.majCherchees ? aMettreAJour.length : null}
          note={donnees.majCherchees ? 'versions plus récentes publiées' : 'pas encore cherchées'}
        />
      </div>

      {/* ── Ce qui ne va pas ────────────────────────────────────────────
          En haut, et seulement quand il y a quelque chose : un encadré
          permanent qui dit « rien à signaler » finit par ne plus se lire. */}
      {alertes > 0 && (
        <Card className="border border-[color-mix(in_oklab,var(--q-inaccuracy)_40%,transparent)] p-4">
          <SectionTitle hint="Le même contrôle tourne dans `npm test` : ces écarts font échouer la construction.">
            À corriger
          </SectionTitle>
          <div className="space-y-3">
            {donnees.nonCredites.length > 0 && (
              <Anomalie
                titre={`${donnees.nonCredites.length} paquet(s) non crédité(s)`}
                detail="Déclarés dans un package.json, absents du catalogue. Leur licence exige peut-être l’attribution."
              >
                {donnees.nonCredites.map((entree) => (
                  <li key={entree.paquet} className="flex flex-wrap items-baseline gap-2">
                    <code className="text-ink">{entree.paquet}</code>
                    <span className="text-faint">{entree.installee ?? entree.plage}</span>
                    {entree.licenceReelle && (
                      <span className="font-mono text-[12px] text-faint">
                        {entree.licenceReelle}
                      </span>
                    )}
                    <span className="text-faint">· {entree.espaces.join(', ')}</span>
                  </li>
                ))}
              </Anomalie>
            )}

            {donnees.orphelins.length > 0 && (
              <Anomalie
                titre={`${donnees.orphelins.length} crédit(s) orphelin(s)`}
                detail="Le catalogue cite un paquet que plus aucun espace de travail ne déclare."
              >
                {donnees.orphelins.map((entree) => (
                  <li key={entree.nom}>
                    {entree.nom} <code className="text-faint">{entree.paquet}</code>
                  </li>
                ))}
              </Anomalie>
            )}

            {donnees.versionsDivergentes.length > 0 && (
              <Anomalie
                titre={`${donnees.versionsDivergentes.length} version(s) qui a dérivé`}
                detail="La version affichée ne se trouve plus dans le fichier qui fait autorité."
              >
                {donnees.versionsDivergentes.map((entree) => (
                  <li key={entree.nom}>
                    {entree.nom} <strong className="text-ink">{entree.version}</strong> —{' '}
                    {entree.introuvable
                      ? `introuvable dans ${entree.fichier}`
                      : `${entree.fichier} illisible ici`}
                  </li>
                ))}
              </Anomalie>
            )}
          </div>
        </Card>
      )}

      {donnees.depot.espacesIllisibles.length > 0 && (
        <p className="text-[12px] leading-relaxed text-faint">
          {donnees.depot.espacesIllisibles.join(', ')} n’
          {donnees.depot.espacesIllisibles.length > 1 ? 'ont' : 'a'} pas pu être lu
          {donnees.depot.espacesIllisibles.length > 1 ? 's' : ''} depuis ce serveur — l’image de
          production n’embarque pas tous les manifestes. Le contrôle des tests, lui, voit le dépôt
          entier.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={cherche}
          icon={<Search size={14} />}
          onClick={() => void charger(true)}
        >
          Chercher les mises à jour
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={() => void charger(false)}
        >
          Relire
        </Button>
        <span className="text-[12px] leading-snug text-faint">
          Interroge le registre npm et GitHub depuis le serveur. Rien d’autre que des noms de
          paquets publics ne sort d’ici.
        </span>
      </div>

      {ORDRE.map((categorie) => {
        const dedans = donnees.outils.filter((outil) => outil.categorie === categorie)
        if (dedans.length === 0) return null
        return (
          <Card key={categorie} className="overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-line/60 px-4 py-2.5">
              <p className="text-[12px] font-semibold text-faint">{TITRES_CATEGORIE[categorie]}</p>
              <p className="text-[12px] tabular-nums text-muted">{dedans.length}</p>
            </div>
            <ul>
              {dedans.map((outil) => (
                <Ligne key={outil.nom} outil={outil} />
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

function Anomalie({
  titre,
  detail,
  children,
}: {
  titre: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--q-inaccuracy)]">
        <AlertTriangle size={13} aria-hidden />
        {titre}
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{detail}</p>
      <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted">{children}</ul>
    </div>
  )
}

function Ligne({ outil }: { outil: Outil }) {
  const actuelle = outil.installee ?? outil.versionCatalogue
  const etat = comparer(actuelle, outil.derniere)
  /* Le catalogue peut se tromper de licence : le paquet la déclare lui-même. */
  const licenceDiverge =
    outil.licenceReelle !== null &&
    outil.licenceReelle.toLowerCase() !== outil.licence.toLowerCase()

  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-line/40 px-4 py-2 last:border-0">
      <a
        href={outil.url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[14px] font-semibold text-accent hover:underline"
      >
        {outil.nom}
      </a>
      {outil.paquet && (
        <code className="text-[12px] text-faint">
          <Package size={10} className="mr-0.5 inline" aria-hidden />
          {outil.paquet}
        </code>
      )}
      {actuelle && <span className="text-[12px] tabular-nums text-muted">{actuelle}</span>}

      {etat === 'plusrecent' && (
        <Chip tone="warning" title="Version publiée par l’auteur">
          {outil.derniere}
        </Chip>
      )}
      {etat === 'ajour' && (
        <span
          className="flex items-center gap-0.5 text-[12px] text-[var(--q-best)]"
          title="Dernière version publiée"
        >
          <Check size={11} aria-hidden />à jour
        </span>
      )}

      <span
        className={clsx(
          'ml-auto shrink-0 font-mono text-[12px]',
          licenceDiverge ? 'text-[var(--q-inaccuracy)]' : 'text-faint',
        )}
        title={
          licenceDiverge
            ? `Le paquet déclare « ${outil.licenceReelle} » — le catalogue dit autre chose.`
            : undefined
        }
      >
        {outil.licence}
      </span>
    </li>
  )
}
