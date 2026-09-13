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
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

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
 * Les actes, avec leur gravité.
 *
 * `danger` est réservé à ce qui ne se défait pas : anonymiser un compte,
 * supprimer une partie. Le reste se rattrape d'un clic, et le signaler en rouge
 * ferait perdre au rouge son sens.
 *
 * Deux clés par acte, et non une amputée de son « a » : la phrase du journal se
 * lit « Chloé a désactivé Marc », le bouton de filtre dit « désactivé ». Le code
 * fabriquait le second en retirant « a » du premier — un découpage qui ne marche
 * qu'en français, et qui aurait rogné la première lettre de « anonymised ».
 */
const ACTES: Record<
  string,
  { texteKey: TranslationKey; filtreKey: TranslationKey; ton?: 'danger' | 'accent' }
> = {
  desactiver: { texteKey: 'admin.actDeactivate', filtreKey: 'admin.filterLabelDeactivate' },
  reactiver: { texteKey: 'admin.actReactivate', filtreKey: 'admin.filterLabelReactivate' },
  promouvoir: {
    texteKey: 'admin.actPromote',
    filtreKey: 'admin.filterLabelPromote',
    ton: 'accent',
  },
  retrograder: {
    texteKey: 'admin.actDemote',
    filtreKey: 'admin.filterLabelDemote',
    ton: 'accent',
  },
  motDePasse: {
    texteKey: 'admin.actPassword',
    filtreKey: 'admin.filterLabelPassword',
    ton: 'accent',
  },
  anonymiser: {
    texteKey: 'admin.actAnonymise',
    filtreKey: 'admin.filterLabelAnonymise',
    ton: 'danger',
  },
  supprimerPartie: {
    texteKey: 'admin.actDeleteGame',
    filtreKey: 'admin.filterLabelDeleteGame',
    ton: 'danger',
  },
  supprimerAnalyse: {
    texteKey: 'admin.actDeleteAnalysis',
    filtreKey: 'admin.filterLabelDeleteAnalysis',
    ton: 'danger',
  },
  purge: { texteKey: 'admin.actPurge', filtreKey: 'admin.filterLabelPurge' },
}

export function Journal() {
  const t = useT()
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
        toast.error(t('admin.readFailed'))
        setLignes([])
      }
    },
    [filtreAction, filtreAuteur, t],
  )

  useEffect(() => {
    setLignes(null)
    void charger()
  }, [charger])

  if (lignes === null) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <SectionTitle hint={t('admin.filterHint')}>{t('admin.filterTitle')}</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          <Filtre actif={filtreAction === null} onClick={() => setFiltreAction(null)}>
            {t('admin.allActs')}
          </Filtre>
          {actions.map((action) => (
            <Filtre
              key={action}
              actif={filtreAction === action}
              onClick={() => setFiltreAction(action)}
            >
              {ACTES[action] ? t(ACTES[action]!.filtreKey) : action}
            </Filtre>
          ))}
        </div>
        {auteurs.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/60 pt-2">
            <Filtre actif={filtreAuteur === null} onClick={() => setFiltreAuteur(null)}>
              {t('admin.allAuthors')}
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
        <EmptyState title={t('admin.emptyLog')} description={t('admin.emptyLogHint')} />
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
              {t('admin.seeFurtherBack')}
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
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const acte = ACTES[ligne.action]
  const quand = new Date(ligne.quand)
  const resume = ligne.detail ? resumerDetail(ligne.detail, t) : ''

  return (
    <li>
      <Card className="p-2.5">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[14px]">
          <strong className="font-semibold">{ligne.auteur}</strong>
          <span className="text-muted">{acte ? t(acte.texteKey) : ligne.action}</span>
          {ligne.cibleNom && <span className="font-medium">{ligne.cibleNom}</span>}
          {acte?.ton && (
            <Chip tone={acte.ton}>
              {t(acte.ton === 'danger' ? 'admin.noReturn' : 'admin.rights')}
            </Chip>
          )}
        </p>
        <p className="mt-0.5 text-[12px] text-faint">
          <time dateTime={ligne.quand} title={quand.toLocaleString(bcp47)}>
            {formaterQuand(quand, bcp47)}
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
function formaterQuand(quand: Date, bcp47: string): string {
  const secondes = Math.round((Date.now() - quand.getTime()) / 1000)
  const relatif = new Intl.RelativeTimeFormat(bcp47, { numeric: 'auto' })

  if (secondes < 60) return relatif.format(-secondes, 'second')
  if (secondes < 3600) return relatif.format(-Math.round(secondes / 60), 'minute')
  if (secondes < 86400) return relatif.format(-Math.round(secondes / 3600), 'hour')
  if (secondes < 30 * 86400) return relatif.format(-Math.round(secondes / 86400), 'day')
  return quand.toLocaleDateString(bcp47, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Le détail JSON, réduit à ce qui se lit d'un coup d'œil. */
function resumerDetail(detail: Record<string, unknown>, t: ReturnType<typeof useT>): string {
  const morceaux: string[] = []

  if (typeof detail.retirees === 'number') {
    morceaux.push(t('admin.linesRemoved', { n: detail.retirees }))
  }
  if (typeof detail.devenu === 'string')
    morceaux.push(t('admin.becameRole', { role: detail.devenu }))

  const avant = detail.avant as { role?: string; disabled?: boolean } | undefined
  if (avant?.role === 'admin') morceaux.push(t('admin.wasAdmin'))
  if (avant?.disabled) morceaux.push(t('admin.wasDisabled'))

  return morceaux.join(' · ')
}
