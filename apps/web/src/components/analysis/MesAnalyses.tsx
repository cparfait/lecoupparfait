'use client'

/**
 * Les analyses déjà faites, à rouvrir sans rien recalculer.
 *
 * Le bloc n'apparaît que pour un compte connecté et une réserve non vide :
 * proposer « tes analyses » à quelqu'un qui n'en a aucune, c'est ajouter du
 * vide à un écran déjà chargé. L'invitation à créer un compte est ailleurs, sur
 * la page d'accueil, et n'a pas à être répétée ici.
 *
 * Rouvrir est instantané parce qu'on ne conserve pas le rapport rédigé mais les
 * évaluations du moteur : le texte est refabriqué à la volée. Voir
 * `lib/analysis/enregistrees.ts`.
 */

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Link2, Link2Off, Loader2, Trash2 } from 'lucide-react'
import { SectionTitle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import {
  listerAnalyses,
  oublierAnalyse,
  partagerAnalyse,
  type AnalyseEnregistree,
} from '@/lib/analysis/enregistrees.ts'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { MarqueService } from '@/components/brand/MarqueService.tsx'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'

/** Ce qu'on affiche à gauche de chaque ligne, selon la provenance. */
const PROVENANCE: Record<AnalyseEnregistree['source'], { glyphe: string; nom: TranslationKey }> = {
  local: { glyphe: '♟', nom: 'savedAnalyses.sourceLocal' },
  chesscom: { glyphe: '♜', nom: 'savedAnalyses.sourceChesscom' },
  lichess: { glyphe: '♞', nom: 'savedAnalyses.sourceLichess' },
  pgn: { glyphe: '📋', nom: 'savedAnalyses.sourcePgn' },
}

export function MesAnalyses({
  onOuvrir,
}: {
  /** Appelé au clic sur une ligne : à l'appelant de rejouer le rapport. */
  onOuvrir: (id: string) => void
}) {
  const t = useT()
  const identite = useIdentite()
  const [analyses, setAnalyses] = useState<AnalyseEnregistree[] | null>(null)
  const [ouverture, setOuverture] = useState<string | null>(null)

  useEffect(() => {
    // `undefined` = on ne sait pas encore si quelqu'un est connecté ; `null` =
    // personne. On n'interroge que dans le premier cas résolu.
    if (!identite) {
      setAnalyses(identite === null ? [] : null)
      return
    }
    let vivant = true
    void listerAnalyses().then((liste) => {
      if (vivant) setAnalyses(liste)
    })
    return () => {
      vivant = false
    }
  }, [identite])

  /**
   * Partage, ou retire le partage.
   *
   * Le lien est copié dans la foulée : partager pour devoir ensuite aller
   * chercher l'adresse ailleurs ferait deux gestes là où il en faut un. Sur un
   * retrait, on ne copie rien — il n'y a plus de lien.
   *
   * Le partage est un **état** : retirer coupe le lien pour de bon, et
   * repartager en engendre un nouveau. C'est la mécanique des études, reprise
   * telle quelle.
   */
  const basculerLePartage = useCallback(
    async (id: string, partageActuel: string | null) => {
      const partage = await partagerAnalyse(id, partageActuel === null)

      if (partageActuel !== null) {
        if (partage !== null) {
          toast.error(t('savedAnalyses.removeFailed'), t('analysis.tryAgainSoon'))
          return
        }
        setAnalyses(
          (liste) => liste?.map((a) => (a.id === id ? { ...a, partage: null } : a)) ?? liste,
        )
        toast.info(t('savedAnalyses.linkRemoved'), t('savedAnalyses.linkRemovedHint'))
        return
      }

      if (!partage) {
        toast.error(t('savedAnalyses.shareFailed'), t('analysis.tryAgainSoon'))
        return
      }
      setAnalyses((liste) => liste?.map((a) => (a.id === id ? { ...a, partage } : a)) ?? liste)

      const lien = `${window.location.origin}/analyse/p/${partage}`
      try {
        await navigator.clipboard.writeText(lien)
        toast.success(t('savedAnalyses.linkCopied'), lien)
      } catch {
        // Le presse-papiers peut être refusé — contexte non sécurisé, permission
        // absente. Le lien s'affiche alors, il reste sélectionnable à la main.
        toast.info(t('savedAnalyses.shareLink'), lien)
      }
    },
    [t],
  )

  const oublier = useCallback(
    async (id: string) => {
      // Retrait immédiat de la liste : attendre le serveur pour faire disparaître
      // une ligne qu'on vient de supprimer donne l'impression que le clic a raté.
      setAnalyses((liste) => liste?.filter((a) => a.id !== id) ?? liste)
      if (!(await oublierAnalyse(id))) {
        toast.error(t('savedAnalyses.deleteFailed'), t('analysis.tryAgainSoon'))
        setAnalyses(await listerAnalyses())
      }
    },
    [t],
  )

  if (!identite || analyses === null) return null
  if (analyses.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionTitle>{t('savedAnalyses.title')}</SectionTitle>
      <p className="text-xs text-muted">{t('savedAnalyses.hint')}</p>

      <ul className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
        {analyses.map((analyse) => {
          const marque = PROVENANCE[analyse.source] ?? PROVENANCE.pgn
          const precision = analyse.lecteur === 'b' ? analyse.accuracyBlack : analyse.accuracyWhite

          return (
            <li key={analyse.id}>
              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-2 transition-colors hover:bg-surface-hover">
                {/* Les deux services extérieurs portent leur vignette : dans
                    une liste où se mêlent parties d'ici, PGN collés et
                    imports, la provenance se lit à la couleur avant le mot. */}
                {analyse.source === 'chesscom' || analyse.source === 'lichess' ? (
                  <MarqueService
                    service={analyse.source}
                    taille={28}
                    className="rounded-[var(--radius-sm)]"
                  />
                ) : (
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-strong text-sm"
                    title={t(marque.nom)}
                    aria-hidden
                  >
                    {marque.glyphe}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOuverture(analyse.id)
                    onOuvrir(analyse.id)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[14px] font-medium">
                    {analyse.whiteName ?? t('common.white')}
                    <span className="mx-1 font-normal text-faint">
                      {resultatCourt(analyse.result)}
                    </span>
                    {analyse.blackName ?? t('common.black')}
                  </p>
                  <p className="truncate text-[12px] text-faint">
                    {[
                      analyse.opening,
                      analyse.coups ? t('analysis.halfMoves', { n: analyse.coups }) : null,
                      t('savedAnalyses.depth', { n: analyse.depth }),
                      precision !== null && precision !== undefined
                        ? t('savedAnalyses.accuracy', { n: precision.toFixed(0) })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>

                {ouverture === analyse.id ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-muted" aria-hidden />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void basculerLePartage(analyse.id, analyse.partage)}
                      title={
                        analyse.partage ? t('savedAnalyses.unshare') : t('savedAnalyses.share')
                      }
                      aria-label={t(
                        analyse.partage ? 'savedAnalyses.unshareAria' : 'savedAnalyses.shareAria',
                        {
                          blancs: analyse.whiteName ?? t('common.white'),
                          noirs: analyse.blackName ?? t('common.black'),
                        },
                      )}
                      aria-pressed={analyse.partage !== null}
                      className={clsx(
                        'shrink-0 rounded-[var(--radius-sm)] p-1 transition-colors hover:bg-surface-strong',
                        analyse.partage ? 'text-accent' : 'text-faint hover:text-ink',
                      )}
                    >
                      {analyse.partage ? (
                        <Link2Off size={13} aria-hidden />
                      ) : (
                        <Link2 size={13} aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void oublier(analyse.id)}
                      title={t('savedAnalyses.forget')}
                      aria-label={t('savedAnalyses.forgetNamed', {
                        blancs: analyse.whiteName ?? t('settings.white'),
                        noirs: analyse.blackName ?? t('settings.black'),
                      })}
                      className="shrink-0 rounded-[var(--radius-sm)] p-1 text-faint transition-colors hover:bg-surface-strong hover:text-[var(--q-blunder)]"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** `1-0` se lit mal au milieu de deux pseudos ; `1–0` respire. */
function resultatCourt(result: string): string {
  switch (result) {
    case '1-0':
      return '1–0'
    case '0-1':
      return '0–1'
    case '1/2-1/2':
      return '½–½'
    default:
      return '–'
  }
}
