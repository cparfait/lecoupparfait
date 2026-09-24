'use client'

/**
 * Les courriels qu'on aurait envoyés.
 *
 * Éprouver une inscription supposait jusqu'ici une vraie adresse et un vrai
 * serveur de messagerie — donc, en pratique, de ne pas l'éprouver du tout. En
 * développement, les messages sont écrits sur le disque au lieu de partir, et
 * cette page les montre tels qu'ils seraient reçus.
 *
 * Elle n'existe qu'en développement : la route qui l'alimente répond 404 en
 * production, publier la liste des courriels envoyés revenant à publier les
 * adresses des inscrits.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'

interface CapturedMail {
  id: string
  to: string
  subject: string
  body: string
  sentAt: string
}

/** Assez vif pour qu'un message apparaisse pendant qu'on regarde la page. */
const POLL_MS = 3000

export default function MailboxPage() {
  const t = useT()
  const [mails, setMails] = useState<CapturedMail[] | null>(null)
  const [available, setAvailable] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/dev/courriels')
      if (response.status === 404) {
        setAvailable(false)
        setMails([])
        return
      }
      const data: { mails: CapturedMail[] } = await response.json()
      setMails(data.mails)
    } catch {
      setMails([])
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  if (mails === null) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (!available) {
    return (
      <div className="page-etroite">
        <EmptyState
          icon={<Mail size={28} />}
          title={t('rest.devOnly')}
          description={t('rest.devOnlyHint')}
        />
      </div>
    )
  }

  return (
    <div className="page-etroite">
      <SectionTitle
        hint={t('rest.mailboxHint')}
        action={
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw size={14} />}
              onClick={() => void refresh()}
            >
              {t('bits.refresh')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={14} />}
              onClick={async () => {
                await fetch('/api/dev/courriels', { method: 'DELETE' })
                await refresh()
              }}
            >
              {t('bits.clear')}
            </Button>
          </div>
        }
      >
        {t('rest.mailbox')}
      </SectionTitle>

      {mails.length === 0 ? (
        <EmptyState
          icon={<Mail size={28} />}
          title={t('bits.noMessage')}
          description={t('rest.mailboxEmptyHint')}
          action={
            <Link href="/connexion">
              <Button variant="primary">{t('rest.createAccount')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {mails.map((mail) => (
            <Card key={mail.id} className="overflow-hidden">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line/60 px-4 py-2.5">
                <span className="font-semibold">{mail.subject}</span>
                <span className="text-[14px] text-muted">
                  {t('common.to', { adresse: mail.to })}
                </span>
                <span className="ml-auto text-[12px] tabular-nums text-faint">
                  {new Date(mail.sentAt).toLocaleString('fr-FR')}
                </span>
              </div>
              <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-[14px] leading-relaxed text-muted">
                {mail.body}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
