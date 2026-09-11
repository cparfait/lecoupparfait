'use client'

/**
 * Mes études.
 *
 * Le classeur : ses ouvertures, une partie qu'on veut comprendre, un thème de
 * finale. C'est ce qui manquait le plus par rapport aux grandes plateformes,
 * et c'est le seul outil ici qui serve à *ranger* plutôt qu'à jouer.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookMarked, Link2, Lock, Plus } from 'lucide-react'
import { Button, Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

interface StudySummary {
  id: string
  slug: string
  title: string
  description: string | null
  visibility: string
  updatedAt: string
  chapters: number
}

export default function StudiesPage() {
  const router = useRouter()
  const [studies, setStudies] = useState<StudySummary[] | null>(null)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/etudes')
    if (response.status === 401) {
      setSignedIn(false)
      setStudies([])
      return
    }
    setSignedIn(true)
    const data: { studies: StudySummary[] } = await response.json()
    setStudies(data.studies ?? [])
  }, [])

  useEffect(() => {
    void refresh().catch(() => setStudies([]))
  }, [refresh])

  const create = useCallback(async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/etudes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create', title }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error ?? 'Création impossible.')
        return
      }
      router.push(`/etudes/${data.slug}`)
    } finally {
      setBusy(false)
    }
  }, [title, router])

  if (studies === null) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (signedIn === false) {
    return (
      <div className="page-etroite">
        <EmptyState
          icon={<BookMarked size={28} />}
          title="Les études demandent un compte"
          description="Une étude t’appartient et se retrouve d’une session à l’autre : il faut donc savoir à qui elle est."
          action={
            <Link href="/connexion">
              <Button variant="primary">Créer un compte</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-etroite">
      <SectionTitle hint="Range des positions commentées : tes ouvertures, une partie à comprendre, un thème de finale.">
        Mes études
      </SectionTitle>

      <Card className="mt-4 p-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre de l’étude — « Ma défense contre 1.e4 »"
              aria-label="Titre de la nouvelle étude"
              maxLength={120}
            />
          </div>
          <Button type="submit" variant="primary" icon={<Plus size={15} />} disabled={busy}>
            Créer
          </Button>
        </form>
      </Card>

      {studies.length === 0 ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-faint">
          Aucune étude pour l’instant. Commence par celle qui te servira le plus :
          <br />
          l’ouverture que tu joues et que tu ne comprends pas encore.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {studies.map((study) => (
            <Link key={study.id} href={`/etudes/${study.slug}`} className="block">
              <Card className="p-3 transition-colors hover:bg-surface-hover">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong text-accent"
                    aria-hidden
                  >
                    <BookMarked size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{study.title}</span>
                    <span className="block text-[12px] text-faint">
                      {study.chapters === 0
                        ? 'Aucun chapitre'
                        : `${study.chapters} chapitre${study.chapters > 1 ? 's' : ''}`}
                      {' · modifiée le '}
                      {new Date(study.updatedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-faint"
                    title={study.visibility === 'unlisted' ? 'Partageable par lien' : 'Privée'}
                    aria-label={study.visibility === 'unlisted' ? 'Partageable' : 'Privée'}
                  >
                    {study.visibility === 'unlisted' ? <Link2 size={14} /> : <Lock size={14} />}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
