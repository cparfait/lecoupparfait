'use client'

/**
 * Le message de l'équipe, quand il y en a un.
 *
 * Un bandeau en bas de l'écran, au même endroit et de la même façon que le
 * retour vers une partie en direct : c'est la place déjà réservée aux choses
 * qui arrivent pendant qu'on fait autre chose.
 *
 * **Un seul message à la fois**, le plus récent — la route n'en rend jamais
 * plus d'un. Trois bandeaux empilés ne se lisent pas, ils se referment.
 *
 * **Refermer vaut lecture**, et c'est consigné pour les comptes : le message ne
 * revient pas à la page suivante, et l'administration peut voir qu'il est
 * arrivé. Sans compte, la fermeture ne vit que dans le navigateur — il n'y a
 * pas de ligne où l'écrire, et une annonce générale n'a pas de destinataire à
 * qui demander des comptes.
 *
 * **Jamais pendant une partie.** Le montage est décidé par la coque, qui sait
 * ce qu'est un écran immersif : un mot de l'équipe n'a pas à s'inviter au
 * milieu d'une finale.
 *
 * Le texte est celui qu'un humain a écrit, dans sa langue. C'est pour cela
 * qu'il est présenté comme un mot signé et non comme de l'interface : le reste
 * de l'écran suit la langue du lecteur, cette phrase-là non, et le dire est
 * plus honnête que de le laisser croire.
 */

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, UserRound, X } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/index.tsx'

interface Annonce {
  id: string
  message: string
  tone: string
  personnel: boolean
  auteur: string
}

/** Les annonces refermées sans compte, pour ne pas les revoir à chaque page. */
const CLE_LUES = 'coupparfait.annoncesLues'

function lues(): string[] {
  try {
    const brut = window.localStorage.getItem(CLE_LUES)
    const liste = brut ? (JSON.parse(brut) as unknown) : []
    return Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function retenirLue(id: string): void {
  try {
    // Les vingt dernières suffisent : au-delà, l'annonce a expiré ou été
    // retirée, et la route ne la rendra plus de toute façon.
    window.localStorage.setItem(CLE_LUES, JSON.stringify([...lues(), id].slice(-20)))
  } catch {
    // Stockage refusé : le message réapparaîtra, ce qui est désagréable mais
    // sans conséquence. Rien à réparer ici.
  }
}

export function MotDeLEquipe() {
  const t = useT()
  const [annonce, setAnnonce] = useState<Annonce | null>(null)

  useEffect(() => {
    let vivant = true
    void fetch('/api/annonces', { cache: 'no-store' })
      .then((reponse) => (reponse.ok ? reponse.json() : { annonce: null }))
      .then((donnees: { annonce: Annonce | null }) => {
        if (!vivant || !donnees.annonce) return
        // La liste locale ne sert qu'aux visiteurs sans compte : pour les
        // autres, la route a déjà écarté ce qui est lu. La consulter dans les
        // deux cas ne coûte rien et évite une condition de plus.
        if (lues().includes(donnees.annonce.id)) return
        setAnnonce(donnees.annonce)
      })
      .catch(() => {
        // Silence : l'absence d'un message ne s'annonce pas.
      })
    return () => {
      vivant = false
    }
  }, [])

  const fermer = useCallback(() => {
    if (!annonce) return
    retenirLue(annonce.id)
    setAnnonce(null)
    void fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: annonce.id }),
    }).catch(() => {})
  }, [annonce])

  if (!annonce) return null

  const important = annonce.tone === 'important'

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-[min(34rem,calc(100%-1.5rem))] lg:bottom-6"
    >
      <div
        className={clsx(
          'flex items-start gap-3 rounded-[var(--radius)] border bg-[var(--flottant)]/95 p-3.5 shadow-lg backdrop-blur-xl',
          important
            ? 'border-[color-mix(in_oklab,var(--q-blunder)_45%,transparent)]'
            : 'border-line-strong',
        )}
      >
        <span
          className="mt-0.5 shrink-0 text-accent"
          style={important ? { color: 'var(--q-blunder)' } : undefined}
          aria-hidden
        >
          {annonce.personnel ? <UserRound size={17} /> : <Megaphone size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
            {t(annonce.personnel ? 'announce.forYou' : 'announce.fromTeam')}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {annonce.message}
          </p>
          <p className="mt-1.5 text-[12px] text-faint">
            {t('announce.signed', { auteur: annonce.auteur })}
          </p>
        </div>

        <button
          type="button"
          onClick={fermer}
          aria-label={t('announce.dismiss')}
          title={t('announce.dismiss')}
          className="-m-1 shrink-0 rounded-full p-1 text-faint transition-colors hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
