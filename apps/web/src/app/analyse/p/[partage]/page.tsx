'use client'

/**
 * Une analyse partagée, ouverte par son lien.
 *
 * Aucune session n'est demandée : c'est le principe même du partage, et l'un
 * des principes de la plateforme — un compte est un confort, pas un péage.
 *
 * Le rapport n'est pas transmis tel quel : la base garde les **évaluations**
 * position par position, et `rejouerAnalyse` reconstruit tout le reste —
 * classification des coups, explications, résumé du coach. C'est la même
 * mécanique que pour rouvrir une de ses propres analyses, et c'est ce qui fait
 * qu'un lien partagé ne se périme pas quand les explications s'améliorent.
 */

import { useEffect, useState } from 'react'
import { use } from 'react'
import { rejouerAnalyse, type AnalysisOutcome } from '@/lib/analysis/runner.ts'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { usePreferencesDe } from '@/lib/store/preferences.ts'
import { Card, EmptyState, Skeleton } from '@/components/ui/index.tsx'
import { ButtonLink } from '@/components/ui/index.tsx'
import { ReviewScreen } from '@/app/analyse/page.tsx'

interface AnalysePartagee {
  moves: string[]
  startFen: string | null
  positions: unknown[]
  lecteur: 'w' | 'b' | null
  headers: Record<string, string>
}

export default function AnalysePartageePage({ params }: { params: Promise<{ partage: string }> }) {
  const { partage } = use(params)
  const { locale, notation } = usePreferencesDe('locale', 'notation')
  const { book } = useOpeningBook()

  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null)
  const [introuvable, setIntrouvable] = useState(false)

  useEffect(() => {
    const controleur = new AbortController()

    void fetch(`/api/analyses/partagee/${encodeURIComponent(partage)}`, {
      signal: controleur.signal,
    })
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error('introuvable')
        return (await reponse.json()) as { analyse: AnalysePartagee | null }
      })
      .then(async ({ analyse }) => {
        if (!analyse) throw new Error('introuvable')
        setOutcome(
          await rejouerAnalyse({
            moves: analyse.moves,
            positions: analyse.positions as never,
            startFen: analyse.startFen ?? undefined,
            headers: analyse.headers,
            lecteur: analyse.lecteur,
            book,
            locale,
            notation,
          }),
        )
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setIntrouvable(true)
      })

    return () => controleur.abort()
  }, [partage, book, locale, notation])

  if (introuvable) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card>
          <EmptyState
            title="Ce lien ne mène à rien"
            description="L’analyse a peut-être cessé d’être partagée, ou le lien est incomplet."
            action={<ButtonLink href="/analyse">Analyser une partie</ButtonLink>}
          />
        </Card>
      </div>
    )
  }

  if (!outcome) {
    return (
      <div className="page space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[28rem] w-full" />
      </div>
    )
  }

  // `side` reste `null` : celui qui ouvre le lien n'a joué aucune des deux
  // couleurs, et présenter la partie « de son côté » n'aurait pas de sens.
  return <ReviewScreen outcome={outcome} side={null} onReset={() => {}} lectureSeule />
}
