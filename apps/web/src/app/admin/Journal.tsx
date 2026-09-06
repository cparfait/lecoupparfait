'use client'

/**
 * Le journal des actes d'administration.
 *
 * **Aucun bouton n'y touche.** Pas de suppression, pas d'édition, pas même un
 * « masquer » : un journal qu'on peut nettoyer depuis l'écran qu'il surveille
 * ne prouve rien. C'est le seul onglet en lecture seule, et c'est la raison
 * d'être de l'onglet.
 *
 * Les lignes sont chargées par paquets, à la demande. Un journal se lit par le
 * haut — les derniers actes d'abord — et l'on descend seulement quand on
 * cherche quelque chose de précis ; charger tout d'avance serait payer pour le
 * cas rare.
 */

import { useCallback, useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { Button, Card, Chip, EmptyState, SectionTitle, Skeleton } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

interface Ligne {
  id: string
  auteur: string
  action: string
  cible: string | null
  cibleNom: string | null
  detail: Record<string, unknown> | null
  quand: string
}

/**
 * Les actes, dits en français, avec leur gravité.
 *
 * `danger` est réservé à ce qui ne se défait pas : anonymiser un compte,
 * supprimer une partie. Le reste se rattrape d'un clic, et le signaler en rouge
 * ferait perdre au rouge son sens.
 */
const ACTES: Record<string, { texte: string; ton?: 'danger' | 'accent' }> = {
  desactiver: { texte: 'a désactivé' },
  reactiver: { texte: 'a réactivé' },
  promouvoir: { texte: 'a promu administrateur', ton: 'accent' },
  retrograder: { texte: 'a rétrogradé', ton: 'accent' },
  motDePasse: { texte: 'a changé le mot de passe de', ton: 'accent' },
  anonymiser: { texte: 'a anonymisé', ton: 'danger' },
  supprimerPartie: { texte: 'a supprimé la partie', ton: 'danger' },
  supprimerAnalyse: { texte: 'a supprimé l’analyse', ton: 'danger' },
  purge: { texte: 'a purgé' },
}

export function Journal() {
  const [lignes, setLignes] = useState<Ligne[] | null>(null)
  const [curseur, setCurseur] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [auteurs, setAuteurs] = useState<string[]>([])
  const [filtreAction, setFiltreAction] = useState<string | null>(null)
  const [filtreAuteur, setFiltreAuteur] = useState<string | null>(null)
  const [chargeSuite, setChargeSuite] = useState(false)

  const charger = useCallback(
    async (avant?: string) => {
      const parametres = new URLSearchParams()
      if (filtreAction) parametres.set('action', filtreAction)
      if (filtreAuteur) parametres.set('auteur', filtreAuteur)
      if (avant) parametres.set('avant', avant)

      try {
        const reponse = await fetch(`/api/admin/journal?${parametres}`, { cache: 'no-store' })
        if (!reponse.ok) throw new Error()
        const donnees = await reponse.json()
        // En pagination on ajoute, en premier chargement on remplace : sans
        // cette distinction, « voir plus » effacerait ce qu'on vient de lire.
        setLignes((anciennes) =>
          avant ? [...(anciennes ?? []), ...donnees.lignes] : donnees.lignes,
        )
        setCurseur(donnees.curseur)
        setActions(donnees.actions)
        setAuteurs(donnees.auteurs)
      } catch {
        toast.error('Lecture impossible.')
        setLignes([])
      }
    },
    [filtreAction, filtreAuteur],
  )

  useEffect(() => {
    setLignes(null)
    void charger()
  }, [charger])

  if (lignes === null) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <SectionTitle hint="Le journal ne s’efface pas depuis cette page : une trace qu’on peut retirer d’un clic ne vaut pas comme trace.">
          Filtrer
        </SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          <Filtre actif={filtreAction === null} onClick={() => setFiltreAction(null)}>
            tous les actes
          </Filtre>
          {actions.map((action) => (
            <Filtre
              key={action}
              actif={filtreAction === action}
              onClick={() => setFiltreAction(action)}
            >
              {ACTES[action]?.texte.replace(/^a /, '') ?? action}
            </Filtre>
          ))}
        </div>
        {auteurs.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/60 pt-2">
            <Filtre actif={filtreAuteur === null} onClick={() => setFiltreAuteur(null)}>
              tous les auteurs
            </Filtre>
            {auteurs.map((auteur) => (
              <Filtre
                key={auteur}
                actif={filtreAuteur === auteur}
                onClick={() => setFiltreAuteur(auteur)}
              >
                {auteur}
              </Filtre>
            ))}
          </div>
        )}
      </Card>

      {lignes.length === 0 ? (
        <EmptyState
          title="Rien dans le journal"
          description="Aucun acte d’administration n’a encore été enregistré — ou aucun ne correspond à ce filtre."
        />
      ) : (
        <>
          <ol className="space-y-1.5">
            {lignes.map((ligne) => (
              <LigneJournal key={ligne.id} ligne={ligne} />
            ))}
          </ol>

          {curseur && (
            <Button
              variant="secondary"
              className="w-full"
              loading={chargeSuite}
              icon={<ScrollText size={14} />}
              onClick={() => {
                setChargeSuite(true)
                void charger(curseur).finally(() => setChargeSuite(false))
              }}
            >
              Voir plus loin dans le passé
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function Filtre({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        actif
          ? 'rounded-full bg-[var(--accent)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-contrast)]'
          : 'rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:bg-[var(--surface-hover)]'
      }
    >
      {children}
    </button>
  )
}

function LigneJournal({ ligne }: { ligne: Ligne }) {
  const acte = ACTES[ligne.action] ?? { texte: ligne.action }
  const quand = new Date(ligne.quand)
  const resume = ligne.detail ? resumerDetail(ligne.detail) : ''

  return (
    <li>
      <Card className="p-2.5">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[14px]">
          <strong className="font-semibold">{ligne.auteur}</strong>
          <span className="text-muted">{acte.texte}</span>
          {ligne.cibleNom && <span className="font-medium">{ligne.cibleNom}</span>}
          {acte.ton && (
            <Chip tone={acte.ton}>{acte.ton === 'danger' ? 'sans retour' : 'droits'}</Chip>
          )}
        </p>
        <p className="mt-0.5 text-[12px] text-faint">
          <time dateTime={ligne.quand} title={quand.toLocaleString('fr-FR')}>
            {formaterQuand(quand)}
          </time>
          {resume && <span> · {resume}</span>}
        </p>
      </Card>
    </li>
  )
}

/**
 * « il y a douze minutes » plutôt qu'une date complète.
 *
 * Ce qu'on cherche dans un journal est presque toujours *récent* : la date
 * exacte reste au survol, et l'écart au présent est ce qui répond à « est-ce
 * que ça vient de se passer ? ».
 */
function formaterQuand(quand: Date): string {
  const secondes = Math.round((Date.now() - quand.getTime()) / 1000)
  const relatif = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

  if (secondes < 60) return relatif.format(-secondes, 'second')
  if (secondes < 3600) return relatif.format(-Math.round(secondes / 60), 'minute')
  if (secondes < 86400) return relatif.format(-Math.round(secondes / 3600), 'hour')
  if (secondes < 30 * 86400) return relatif.format(-Math.round(secondes / 86400), 'day')
  return quand.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Le détail JSON, réduit à ce qui se lit d'un coup d'œil. */
function resumerDetail(detail: Record<string, unknown>): string {
  const morceaux: string[] = []

  if (typeof detail.retirees === 'number') morceaux.push(`${detail.retirees} ligne(s) retirée(s)`)
  if (typeof detail.devenu === 'string') morceaux.push(`devenu ${detail.devenu}`)

  const avant = detail.avant as { role?: string; disabled?: boolean } | undefined
  if (avant?.role === 'admin') morceaux.push('était administrateur')
  if (avant?.disabled) morceaux.push('était déjà désactivé')

  return morceaux.join(' · ')
}
