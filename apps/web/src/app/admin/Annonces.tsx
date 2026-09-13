'use client'

/**
 * Les annonces : parler aux joueurs depuis l'administration.
 *
 * Un seul écran pour les deux portées. Le champ « destinataire » vide s'adresse
 * à tout le monde ; on y écrit un pseudo pour ne parler qu'à une personne. Deux
 * onglets séparés auraient doublé le formulaire pour une différence qui tient
 * dans une ligne de saisie — et auraient obligé à choisir la portée avant
 * d'écrire le message, alors que c'est en l'écrivant qu'on sait à qui on parle.
 *
 * Ce qui a été dit reste affiché dessous, avec le nombre de lectures. Pour une
 * annonce générale c'est une mesure d'audience ; pour un message adressé à
 * quelqu'un, c'est la seule façon de savoir s'il est arrivé.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Megaphone, Send, Trash2, UserRound, Users } from 'lucide-react'
import clsx from 'clsx'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  SectionTitle,
  SegmentedControl,
  Skeleton,
} from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { langue, useI18n, useT } from '@/lib/i18n/index.tsx'

interface Annonce {
  id: string
  message: string
  tone: string
  cible: string | null
  auteur: string
  expireLe: string | null
  retireeLe: string | null
  creeeLe: string
  lectures: number
}

const MAX_MESSAGE = 600

/** En deçà, la recherche ramènerait l'annuaire entier. */
const MIN_RECHERCHE = 2
/** Le temps qu'on laisse à la frappe avant d'interroger le serveur. */
const ATTENTE_FRAPPE_MS = 250
/** Ce qu'on montre : plus haut, la liste dépasse l'écran d'un téléphone. */
const MAX_SUGGESTIONS = 6

/** Un compte proposé sous le champ « destinataire ». */
interface Suggestion {
  username: string
  avatar: string | null
  disabled: boolean
  parties: number
}

export function Annonces() {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47

  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)
  const [message, setMessage] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [tone, setTone] = useState<'info' | 'important'>('info')
  const [jours, setJours] = useState('7')
  const [envoi, setEnvoi] = useState(false)

  /*
    La recherche de destinataire.

    Le champ était une saisie libre : on écrivait un pseudo de mémoire, et l'on
    apprenait qu'il n'existait pas en cliquant « Envoyer » — ou pire, on
    envoyait à côté sans le savoir si un autre compte portait un nom proche.
    Les suggestions viennent de `/api/admin/comptes?q=`, la recherche que
    l'onglet des comptes utilise déjà : elle est réservée à l'administration,
    et elle voit aussi les comptes désactivés, qu'on a de bonnes raisons de
    vouloir prévenir.
  */
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [surligne, setSurligne] = useState(-1)
  /** Le pseudo qu'on vient de choisir : il ne doit pas relancer la recherche. */
  const choisi = useRef<string | null>(null)

  useEffect(() => {
    const recherche = pseudo.trim()
    if (recherche.length < MIN_RECHERCHE || recherche === choisi.current) {
      setSuggestions(null)
      return
    }

    // Une requête par frappe inonderait le serveur et ferait clignoter la
    // liste ; l'`AbortController` évite en plus qu'une réponse tardive écrase
    // une plus récente, ce qui affichait les suggestions du mot d'avant.
    const controle = new AbortController()
    const minuterie = setTimeout(() => {
      void fetch(`/api/admin/comptes?q=${encodeURIComponent(recherche)}`, {
        cache: 'no-store',
        signal: controle.signal,
      })
        .then((reponse) => (reponse.ok ? reponse.json() : null))
        .then((donnees: { comptes?: Suggestion[] } | null) => {
          setSuggestions((donnees?.comptes ?? []).slice(0, MAX_SUGGESTIONS))
          setSurligne(-1)
        })
        .catch(() => {
          // Recherche abandonnée ou serveur muet : on n'affiche rien plutôt
          // qu'une liste périmée. Le champ reste utilisable à la main.
          setSuggestions(null)
        })
    }, ATTENTE_FRAPPE_MS)

    return () => {
      clearTimeout(minuterie)
      controle.abort()
    }
  }, [pseudo])

  const retenir = useCallback((username: string) => {
    choisi.current = username
    setPseudo(username)
    setSuggestions(null)
    setSurligne(-1)
  }, [])

  /** Les flèches parcourent la liste, Entrée retient, Échap la referme. */
  const auClavier = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions || suggestions.length === 0) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const pas = event.key === 'ArrowDown' ? 1 : -1
        setSurligne((rang) => (rang + pas + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' && surligne >= 0) {
        event.preventDefault()
        retenir(suggestions[surligne]!.username)
        return
      }
      if (event.key === 'Escape') setSuggestions(null)
    },
    [retenir, suggestions, surligne],
  )

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/admin/annonces', { cache: 'no-store' })
      if (!reponse.ok) throw new Error()
      const donnees = await reponse.json()
      setAnnonces(donnees.annonces ?? [])
    } catch {
      toast.error(t('admin.readFailed'))
      setAnnonces([])
    }
  }, [t])

  useEffect(() => {
    void charger()
  }, [charger])

  const envoyer = useCallback(async () => {
    if (!message.trim() || envoi) return
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/admin/annonces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          pseudo: pseudo.trim() || null,
          tone,
          jours: Number(jours) || 0,
        }),
      })
      /*
        Une réponse illisible n'est pas un serveur injoignable.

        Le repli disait « le serveur est injoignable » dès que le corps n'était
        pas du JSON — ce qui arrive quand la route n'existe pas dans la version
        servie et que Next rend sa page 404 en HTML. On accusait le réseau d'une
        panne de déploiement, et il n'y avait rien à chercher du bon côté. Le
        code HTTP est donc dit tel quel.
      */
      const donnees = (await reponse.json().catch(() => null)) as { error?: string } | null
      if (!reponse.ok) {
        toast.error(donnees?.error ?? t('admin.badResponse', { code: reponse.status }))
        return
      }
      toast.success(
        pseudo.trim()
          ? t('admin.announceSentTo', { pseudo: pseudo.trim() })
          : t('admin.announceSentAll'),
        t('admin.loggedInJournal'),
      )
      setMessage('')
      setPseudo('')
      await charger()
    } catch {
      toast.error(t('admin.serverDown'))
    } finally {
      setEnvoi(false)
    }
  }, [charger, envoi, jours, message, pseudo, t, tone])

  const retirer = useCallback(
    async (id: string) => {
      try {
        const reponse = await fetch(`/api/admin/annonces?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!reponse.ok) {
          const donnees = (await reponse.json().catch(() => null)) as { error?: string } | null
          toast.error(donnees?.error ?? t('admin.badResponse', { code: reponse.status }))
          return
        }
        toast.success(t('admin.announceWithdrawn'), t('admin.loggedInJournal'))
        await charger()
      } catch {
        toast.error(t('admin.serverDown'))
      }
    },
    [charger, t],
  )

  return (
    <div className="space-y-5">
      {/* ── Écrire ────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle hint={t('admin.announceHint')}>{t('admin.announceNew')}</SectionTitle>
        <Card className="space-y-3 p-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('admin.announcePlaceholder')}
            maxLength={MAX_MESSAGE}
            aria-label={t('admin.announceNew')}
            className="min-h-[6rem] w-full resize-y rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2.5 text-[14px] leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {/* La liste est positionnée sur ce bloc, pas sur la grille : sinon
                elle se place par rapport à la carte et recouvre le champ des
                jours. */}
            <div className="relative">
              <Input
                name="destinataire"
                label={t('admin.announceTarget')}
                hint={t('admin.announceTargetHint')}
                placeholder={t('admin.announceEveryone')}
                value={pseudo}
                onChange={(event) => {
                  choisi.current = null
                  setPseudo(event.target.value)
                }}
                onKeyDown={auClavier}
                onBlur={() => {
                  // Laisser le clic sur une suggestion se produire avant de
                  // fermer : `blur` part avant `click`, et la liste disparue
                  // emportait le choix qu'on venait de faire.
                  window.setTimeout(() => setSuggestions(null), 150)
                }}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestions !== null && suggestions.length > 0}
                aria-autocomplete="list"
                aria-controls="suggestions-destinataire"
              />

              {suggestions !== null && (
                <ul
                  id="suggestions-destinataire"
                  role="listbox"
                  className="absolute inset-x-0 top-[calc(100%-1.25rem)] z-30 overflow-hidden rounded-[var(--radius-sm)] border border-line-strong bg-[var(--flottant)] shadow-lg backdrop-blur-xl"
                >
                  {suggestions.length === 0 ? (
                    <li className="px-3 py-2 text-[13px] text-faint">
                      {t('admin.announceNoMatch')}
                    </li>
                  ) : (
                    suggestions.map((compte, rang) => (
                      <li key={compte.username} role="option" aria-selected={rang === surligne}>
                        <button
                          type="button"
                          // `mouseDown` et non `click` : le `blur` du champ
                          // referme la liste, et un `click` n'arriverait
                          // jamais jusqu'ici.
                          onMouseDown={(event) => {
                            event.preventDefault()
                            retenir(compte.username)
                          }}
                          onMouseEnter={() => setSurligne(rang)}
                          className={clsx(
                            'flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors',
                            rang === surligne ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                          )}
                        >
                          <span aria-hidden>{compte.avatar ?? '♟️'}</span>
                          <span className="min-w-0 flex-1 truncate">{compte.username}</span>
                          {compte.disabled && (
                            <Chip tone="danger">{t('admin.announceDisabled')}</Chip>
                          )}
                          <span className="shrink-0 text-[12px] tabular-nums text-faint">
                            {t('admin.halfMovesGames', { n: compte.parties })}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <Input
              name="jours"
              type="number"
              min={0}
              max={365}
              label={t('admin.announceDays')}
              hint={t('admin.announceDaysHint')}
              value={jours}
              onChange={(event) => setJours(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              value={tone}
              onChange={(valeur: 'info' | 'important') => setTone(valeur)}
              options={[
                { value: 'info', label: t('admin.announceToneInfo') },
                { value: 'important', label: t('admin.announceToneImportant') },
              ]}
            />
            <span className="ml-auto flex items-center gap-3">
              <span className="text-[12px] tabular-nums text-faint">
                {message.length} / {MAX_MESSAGE}
              </span>
              <Button
                variant="primary"
                icon={<Send size={15} />}
                disabled={!message.trim() || envoi}
                onClick={() => void envoyer()}
              >
                {pseudo.trim() ? t('admin.announceSend') : t('admin.announceSendAll')}
              </Button>
            </span>
          </div>

          {/* Qui va le voir, dit en clair avant d'envoyer : le champ vide est
              la portée la plus large, et c'est le défaut — il vaut mieux le
              lire une fois de trop que l'apprendre après coup. */}
          <p className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-surface-strong px-3 py-2 text-[13px] text-muted">
            {pseudo.trim() ? <UserRound size={14} aria-hidden /> : <Users size={14} aria-hidden />}
            {pseudo.trim()
              ? t('admin.announceScopeOne', { pseudo: pseudo.trim() })
              : t('admin.announceScopeAll')}
          </p>
        </Card>
      </div>

      {/* ── Ce qui a été dit ──────────────────────────────────────────── */}
      <div>
        <SectionTitle hint={t('admin.announceSentHint')}>{t('admin.announceSent')}</SectionTitle>
        {annonces === null ? (
          <Skeleton className="h-32 w-full" />
        ) : annonces.length === 0 ? (
          <EmptyState title={t('admin.announceNone')} />
        ) : (
          <div className="space-y-1.5">
            {annonces.map((annonce) => {
              const eteinte =
                annonce.retireeLe !== null ||
                (annonce.expireLe !== null && new Date(annonce.expireLe) < new Date())
              return (
                <Card key={annonce.id} className="flex items-start gap-3 p-3">
                  <span className="mt-0.5 text-faint" aria-hidden>
                    {annonce.cible ? <UserRound size={15} /> : <Megaphone size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-pre-wrap text-[14px] leading-relaxed">
                      {annonce.message}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-faint">
                      <Chip tone={annonce.cible ? 'accent' : 'neutral'}>
                        {annonce.cible ?? t('admin.announceEveryone')}
                      </Chip>
                      {annonce.tone === 'important' && (
                        <Chip tone="warning">{t('admin.announceToneImportant')}</Chip>
                      )}
                      {eteinte && <Chip tone="neutral">{t('admin.announceOff')}</Chip>}
                      <span>
                        {t('admin.announceReads', { n: annonce.lectures })} ·{' '}
                        {new Date(annonce.creeeLe).toLocaleDateString(bcp47)} · {annonce.auteur}
                      </span>
                    </span>
                  </span>
                  {!eteinte && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t('admin.announceWithdraw')}
                      icon={<Trash2 size={13} />}
                      onClick={() => void retirer(annonce.id)}
                    >
                      {''}
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
