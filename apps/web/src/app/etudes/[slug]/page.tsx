'use client'

/**
 * Une étude, ouverte.
 *
 * Chapitres à gauche, échiquier au centre, commentaire à droite : la
 * disposition de tous les outils du genre, parce qu'elle marche.
 *
 * L'auteur joue les coups directement sur l'échiquier — pas de mode
 * « édition » à activer. Un visiteur, lui, ne fait que naviguer : la même page
 * sert aux deux, ce qui évite qu'une étude partagée ne s'affiche autrement que
 * chez son auteur.
 *
 * L'enregistrement est automatique et différé : on écrit un commentaire au fil
 * de la pensée, pas en cliquant « enregistrer » toutes les deux phrases.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { BookMarked, Check, Link2, Lock, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { GameNav } from '@/components/game/GameNav.tsx'
import { Button, Card, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useSan } from '@/lib/notation.ts'
import { useTitreDeLOnglet } from '@/lib/titreOnglet.ts'

interface Chapter {
  id: string
  title: string
  startFen: string | null
  moves: string[]
  comments: Record<string, string>
}

interface Study {
  id: string
  slug: string
  title: string
  visibility: string
  owner: { id: string; username: string }
  chapters: Chapter[]
}

/** Délai avant enregistrement : le temps d'une phrase, pas d'un mot. */
const SAVE_MS = 900

export default function StudyPage() {
  const slug = String(useParams().slug ?? '')
  const format = useSan()

  const [study, setStudy] = useState<Study | null | undefined>(undefined)
  const [own, setOwn] = useState(false)
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void fetch(`/api/etudes?slug=${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) {
          setStudy(null)
          return
        }
        const data: { study: Study; own: boolean } = await response.json()
        setStudy(data.study)
        setOwn(data.own)
        setChapterId(data.study.chapters[0]?.id ?? null)
      })
      .catch(() => setStudy(null))
  }, [slug])

  // L'onglet prend le nom de l'étude dès qu'on le connaît : « Étude » ne
  // distingue pas deux onglets ouverts côte à côte, ni un signet d'un autre.
  useTitreDeLOnglet(study?.title)

  const chapter = study?.chapters.find((entry) => entry.id === chapterId) ?? null

  /** La position au curseur : on rejoue depuis le début, c'est instantané. */
  const board = useMemo(() => {
    const game = new Chess(chapter?.startFen ?? undefined)
    if (!chapter) return game
    for (const san of chapter.moves.slice(0, cursor + 1)) {
      try {
        game.move(san)
      } catch {
        break
      }
    }
    return game
  }, [chapter, cursor])

  // ── Enregistrement différé ──────────────────────────────────────────────
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = useCallback(
    (patch: { moves?: string[]; comments?: Record<string, string>; title?: string }) => {
      if (!chapterId || !own) return
      if (pending.current) clearTimeout(pending.current)
      pending.current = setTimeout(() => {
        void fetch('/api/etudes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'saveChapter', chapterId, ...patch }),
        }).catch(() => toast.error('Enregistrement impossible.'))
      }, SAVE_MS)
    },
    [chapterId, own],
  )

  /** Jouer un coup l'ajoute à la suite, en coupant ce qui venait après. */
  const onMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      if (!chapter || !own) return
      const game = new Chess(chapter.startFen ?? undefined)
      for (const san of chapter.moves.slice(0, cursor + 1)) game.move(san)

      let played
      try {
        played = game.move({ from, to, promotion: (promotion ?? 'q') as never })
      } catch {
        return
      }

      const moves = [...chapter.moves.slice(0, cursor + 1), played.san]
      setStudy((current) =>
        current
          ? {
              ...current,
              chapters: current.chapters.map((entry) =>
                entry.id === chapter.id ? { ...entry, moves } : entry,
              ),
            }
          : current,
      )
      setCursor(moves.length - 1)
      save({ moves })
    },
    [chapter, cursor, own, save],
  )

  const writeComment = useCallback(
    (text: string) => {
      if (!chapter) return
      const comments = { ...chapter.comments, [String(cursor)]: text }
      setStudy((current) =>
        current
          ? {
              ...current,
              chapters: current.chapters.map((entry) =>
                entry.id === chapter.id ? { ...entry, comments } : entry,
              ),
            }
          : current,
      )
      save({ comments })
    },
    [chapter, cursor, save],
  )

  const addChapter = useCallback(async () => {
    if (!study) return
    const response = await fetch('/api/etudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'addChapter',
        studyId: study.id,
        title: `Chapitre ${study.chapters.length + 1}`,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(data.error ?? 'Ajout impossible.')
      return
    }
    setStudy((current) =>
      current ? { ...current, chapters: [...current.chapters, data.chapter] } : current,
    )
    setChapterId(data.chapter.id)
    setCursor(-1)
  }, [study])

  const share = useCallback(async () => {
    if (!study) return
    // Partager suppose d'être accessible : on bascule la visibilité en même
    // temps, plutôt que d'envoyer un lien qui afficherait « introuvable ».
    if (study.visibility !== 'unlisted') {
      await fetch('/api/etudes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: study.id, visibility: 'unlisted' }),
      })
      setStudy((current) => (current ? { ...current, visibility: 'unlisted' } : current))
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien copié.', 'L’étude est désormais accessible à qui l’ouvre.')
    } catch {
      toast.warning('Copie refusée.', 'Sélectionne l’adresse à la main.')
    }
  }, [study])

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (study === undefined) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center px-4 py-20">
        <Spinner size={24} />
      </div>
    )
  }

  if (study === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<BookMarked size={28} />}
          title="Étude introuvable"
          description="Elle n’existe pas, ou son auteur ne l’a pas partagée."
          action={
            <Link href="/etudes">
              <Button variant="secondary">Mes études</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const comment = chapter?.comments[String(cursor)] ?? ''

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BookMarked size={18} className="text-accent" aria-hidden />
        <h1 className="font-display text-xl font-bold tracking-tight">{study.title}</h1>
        <span className="text-[12px] text-faint">par {study.owner.username}</span>
        {own && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            icon={
              copied ? (
                <Check size={14} />
              ) : study.visibility === 'unlisted' ? (
                <Link2 size={14} />
              ) : (
                <Lock size={14} />
              )
            }
            onClick={() => void share()}
          >
            {copied ? 'Lien copié' : 'Partager'}
          </Button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)_300px]">
        {/* ── Chapitres ────────────────────────────────────────────── */}
        <Card className="p-2">
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Chapitres
          </p>
          <div className="space-y-0.5">
            {study.chapters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setChapterId(entry.id)
                  setCursor(-1)
                }}
                className={clsx(
                  'flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[13px] transition-colors',
                  entry.id === chapterId
                    ? 'bg-accent/18 font-medium text-ink'
                    : 'text-muted hover:bg-surface-hover',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-faint">
                  {entry.moves.length}
                </span>
              </button>
            ))}
          </div>
          {own && (
            <Button
              size="sm"
              variant="ghost"
              fullWidth
              className="mt-1.5"
              icon={<Plus size={14} />}
              onClick={() => void addChapter()}
            >
              Chapitre
            </Button>
          )}
        </Card>

        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          {chapter ? (
            <>
              <ChessBoard
                fen={board.fen()}
                orientation="w"
                playable={own ? 'both' : null}
                onMove={onMove}
                showViewToggle={false}
                reservedHeight={13}
              />
              <div className="mt-2 flex items-center gap-2">
                <GameNav
                  cursor={cursor}
                  count={chapter.moves.length}
                  onSeek={setCursor}
                  min={-1}
                  fen={board.fen()}
                />
                <p className="text-[12px] text-muted">
                  {own
                    ? 'Joue les coups sur l’échiquier : ils s’ajoutent au chapitre.'
                    : 'Navigue dans les coups du chapitre.'}
                </p>
              </div>
            </>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted">
                {own
                  ? 'Ajoute un chapitre pour commencer : chaque chapitre est une position et sa suite.'
                  : 'Cette étude ne contient encore aucun chapitre.'}
              </p>
            </Card>
          )}
        </div>

        {/* ── Coups et commentaire ─────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-2">
          <Card className="max-h-52 overflow-y-auto p-2">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Coups
            </p>
            {chapter && chapter.moves.length > 0 ? (
              <div className="flex flex-wrap gap-0.5">
                {chapter.moves.map((san, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCursor(index)}
                    title={chapter.comments[String(index)] ? 'Ce coup est commenté' : undefined}
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[13px] transition-colors',
                      index === cursor
                        ? 'bg-accent/20 font-semibold text-ink'
                        : 'hover:bg-surface-hover',
                      chapter.comments[String(index)] &&
                        'underline decoration-accent decoration-dotted underline-offset-2',
                    )}
                  >
                    {index % 2 === 0 && (
                      <span className="mr-0.5 text-faint">{Math.floor(index / 2) + 1}.</span>
                    )}
                    {format(san)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-2 text-[13px] text-faint">Aucun coup pour l’instant.</p>
            )}
          </Card>

          <Card className="flex min-h-[180px] flex-1 flex-col p-2">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
              {cursor < 0 ? 'Note sur la position de départ' : 'Note sur ce coup'}
            </p>
            {own ? (
              <textarea
                value={comment}
                onChange={(event) => writeComment(event.target.value)}
                placeholder="Pourquoi ce coup ? Qu’est-ce qu’il prépare ?"
                maxLength={2000}
                aria-label="Commentaire du coup"
                className="min-h-0 flex-1 resize-none rounded-[var(--radius-sm)] bg-transparent px-1.5 py-1 text-[13px] leading-relaxed placeholder:text-faint focus:outline-none"
              />
            ) : (
              <p className="min-h-0 flex-1 whitespace-pre-wrap px-1.5 py-1 text-[13px] leading-relaxed text-muted">
                {comment || <span className="text-faint">Pas de note sur ce coup.</span>}
              </p>
            )}
          </Card>

          {own && chapter && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={14} />}
              onClick={async () => {
                await fetch('/api/etudes', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ action: 'deleteChapter', chapterId: chapter.id }),
                })
                setStudy((current) =>
                  current
                    ? { ...current, chapters: current.chapters.filter((c) => c.id !== chapter.id) }
                    : current,
                )
                setChapterId(study.chapters.find((c) => c.id !== chapter.id)?.id ?? null)
                setCursor(-1)
              }}
            >
              Supprimer ce chapitre
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
