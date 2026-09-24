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
import { Button, Card, EmptyState, Input, Spinner, TitreDePage } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'

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
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
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
        toast.error(data.error ?? t('studies.createFailed'))
        return
      }
      router.push(`/etudes/${data.slug}`)
    } finally {
      setBusy(false)
    }
  }, [title, router, t])

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
          title={t('studies.needsAccount')}
          description={t('studies.needsAccountHint')}
          action={
            <Link href="/connexion">
              <Button variant="primary">{t('auth.signUp')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('studies.hint')}>{t('studies.title')}</TitreDePage>

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
              placeholder={t('studies.newTitlePlaceholder')}
              aria-label={t('studies.newTitleAria')}
              maxLength={120}
            />
          </div>
          <Button type="submit" variant="primary" icon={<Plus size={15} />} disabled={busy}>
            {t('studies.create')}
          </Button>
        </form>
      </Card>

      {studies.length === 0 ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-faint">
          {t('studies.empty')}
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
                        ? t('studies.noChapterShort')
                        : t(study.chapters > 1 ? 'studies.chapters' : 'studies.oneChapter', {
                            n: study.chapters,
                          })}
                      {t('studies.updatedOn')}
                      {new Date(study.updatedAt).toLocaleDateString(bcp47)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-faint"
                    title={t(
                      study.visibility === 'unlisted' ? 'studies.shareable' : 'studies.private',
                    )}
                    aria-label={t(
                      study.visibility === 'unlisted'
                        ? 'studies.shareableShort'
                        : 'studies.private',
                    )}
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
