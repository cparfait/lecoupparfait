'use client'

/**
 * Le message de l'équipe, quand il y en a un.
 *
 * Une boîte au milieu de l'écran, et non plus un bandeau en bas. Le bandeau
 * était le choix prudent — il ne coupait rien — et c'était son défaut : posé
 * dans un coin, il se referme d'un geste machinal sans avoir été lu, et il ne
 * s'affichait pas du tout pendant une partie. Un message d'administration
 * existe précisément pour les cas où il faut être sûr qu'il est passé : une
 * maintenance dans l'heure, un avertissement adressé à quelqu'un. S'il peut
 * être manqué, il ne sert à rien.
 *
 * **Y compris pendant une partie**, donc, contrairement à `MiseEnRoute` qui
 * propose et peut attendre. Ce que ça coûte est réel : la boîte s'ouvre sur
 * une position en cours et la pendule continue de tourner derrière. C'est la
 * raison pour laquelle elle se ferme de trois façons — le bouton, Échap,
 * l'arrière-plan — et pour laquelle on n'en montre **jamais deux** : la route
 * n'en rend qu'une à la fois, la plus récente.
 *
 * **Refermer vaut lecture**, et c'est consigné pour les comptes : le message ne
 * revient pas à la page suivante, et l'administration voit qu'il est arrivé.
 * Sans compte, la fermeture ne vit que dans le navigateur — il n'y a pas de
 * ligne où l'écrire, et une annonce générale n'a de destinataire à qui
 * demander des comptes.
 *
 * Le texte est celui qu'un humain a écrit, dans sa langue. C'est pour cela
 * qu'il est présenté comme un mot signé et non comme de l'interface : le reste
 * de l'écran suit la langue du lecteur, cette phrase-là non, et le dire est
 * plus honnête que de le laisser croire.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Megaphone, UserRound } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/components/ui/index.tsx'
import { useDialogue } from '@/lib/useDialogue.ts'
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
  const boite = useRef<HTMLDivElement>(null)

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

  // Échap ferme, le focus vient ici et y reste tant que la boîte est ouverte,
  // puis retourne d'où il venait — au plateau, s'il en venait. `actif` est
  // indispensable : le crochet est appelé à chaque rendu, y compris quand il
  // n'y a aucun message, et il poserait sinon un piège à focus autour d'un
  // conteneur qui n'existe pas.
  useDialogue(boite, { onFermer: fermer, actif: annonce !== null })

  if (!annonce) return null

  const important = annonce.tone === 'important'

  return (
    <div
      className="fixed inset-0 z-[93] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mot-equipe-titre"
    >
      {/* L'arrière-plan ferme, comme partout ailleurs dans l'application. Il
          est assombri sans être flouté : derrière, il y a peut-être une
          position qu'on est en train de calculer. */}
      <div className="absolute inset-0 bg-black/40" onClick={fermer} aria-hidden />

      <div
        ref={boite}
        className={clsx(
          'popover animate-slide-up relative w-full max-w-md overflow-hidden p-6 shadow-[var(--shadow-lg)]',
          important && 'border-[color-mix(in_oklab,var(--q-blunder)_45%,transparent)]',
        )}
      >
        <span
          className="mb-3 grid h-11 w-11 place-items-center rounded-full"
          style={{
            background: important
              ? 'color-mix(in oklab, var(--q-blunder) 18%, transparent)'
              : 'color-mix(in oklab, var(--accent) 18%, transparent)',
            color: important ? 'var(--q-blunder)' : 'var(--accent)',
          }}
          aria-hidden
        >
          {annonce.personnel ? <UserRound size={20} /> : <Megaphone size={20} />}
        </span>

        <p
          id="mot-equipe-titre"
          className="text-[12px] font-semibold uppercase tracking-wide text-faint"
        >
          {t(annonce.personnel ? 'announce.forYou' : 'announce.fromTeam')}
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          {annonce.message}
        </p>
        <p className="mt-2 text-[12px] text-faint">
          {t('announce.signed', { auteur: annonce.auteur })}
        </p>

        <Button variant="primary" fullWidth className="mt-5" onClick={fermer}>
          {t('announce.dismiss')}
        </Button>
      </div>
    </div>
  )
}
