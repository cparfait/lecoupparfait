'use client'

/**
 * Préparer une séance pédagogique.
 *
 * Deux questions, et pas douze : à quel palier, et sur quel thème. Le niveau de
 * l'adversaire, la cadence et le mode commenté en découlent — c'est tout
 * l'intérêt, puisque régler soi-même un curseur de niveau avant de jouer est
 * exactement ce qui empêche de commencer.
 *
 * Le palier arrive prérempli : depuis la page « Ton palier » il est dans
 * l'adresse, sinon on le déduit du test de niveau conservé dans le navigateur.
 * On peut toujours le changer — personne n'a à se justifier de vouloir jouer
 * plus fort ou plus faible que son classement.
 */

import { useEffect, useMemo, useState } from 'react'
import { Crown, GraduationCap, MessageSquare, Play, Shuffle, Target } from 'lucide-react'
import clsx from 'clsx'
import { botLevel } from '@coupparfait/core'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { Button, ButtonLink, Card, Chip, TitreDePage, Toggle } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { PALIERS, lireNiveauEstime, niveauBotPour } from '@/lib/apprendre/palier.ts'
import {
  lienDeSeance,
  lireSeances,
  palierParDefaut,
  themesPour,
  type SeancesFaites,
} from '@/lib/game/seance.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export default function SeancePage() {
  const t = useT()
  const [palierId, setPalierId] = useState<string | null>(null)
  const [themeId, setThemeId] = useState<string | null>(null)
  const [commente, setCommente] = useState(true)
  const [faites, setFaites] = useState<SeancesFaites>({})
  // Le niveau estimé, lu dans l'effet et non au rendu : il vit dans le
  // navigateur, et le lire pendant le rendu ferait diverger l'hydratation.
  const [eloEstime, setEloEstime] = useState<number | null>(null)

  /*
    Le palier de départ.

    Trois sources dans cet ordre : l'adresse — on arrive de « Ton palier », qui
    sait déjà lequel c'est —, le test de niveau, puis le repli de
    `palierParDefaut`. Lu dans un effet plutôt qu'avec `useSearchParams` : le
    paramètre ne sert qu'au premier rendu, et cette forme évite d'imposer une
    frontière de suspense à toute la page pour une chaîne de caractères.
  */
  useEffect(() => {
    setFaites(lireSeances())
    const estime = lireNiveauEstime()?.elo ?? null
    setEloEstime(estime)

    const demande = new URLSearchParams(window.location.search).get('palier')
    if (demande && PALIERS.some((palier) => palier.id === demande)) {
      setPalierId(demande)
      return
    }
    setPalierId(palierParDefaut(estime).id)
  }, [])

  const palier = PALIERS.find((entree) => entree.id === palierId) ?? null
  const themes = useMemo(() => (palier ? themesPour(palier.id) : []), [palier])

  // Changer de palier peut rendre le thème choisi hors sujet : on le relâche
  // plutôt que de lancer une séance d'avant-postes à un joueur de 500 Elo.
  useEffect(() => {
    if (themeId && !themes.some((theme) => theme.id === themeId)) setThemeId(null)
  }, [themes, themeId])

  const theme = themes.find((entree) => entree.id === themeId) ?? null
  // La même règle que l'écran de partie, qui recalcule ce niveau au lancement :
  // l'adversaire annoncé ici est celui qu'on affronte.
  const adversaire = palier ? botLevel(niveauBotPour(palier, eloEstime)) : null

  return (
    <div className="page">
      <TitreDePage retour={{ href: '/jouer', label: t('nav.play') }} intro={t('session.intro')}>
        {t('session.title')}
      </TitreDePage>

      {/* ── 1. Le palier ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <EnTeteDeCarte
          titre={t('session.whichLevel')}
          icone={<Target size={14} aria-hidden />}
          teinte="var(--rub-jouer)"
          fin={
            adversaire
              ? t('session.opponentLevel', { elo: adversaire.elo, niveau: adversaire.level })
              : undefined
          }
        />
        <div className="p-4">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {PALIERS.map((entree) => (
              <button
                key={entree.id}
                type="button"
                onClick={() => setPalierId(entree.id)}
                aria-pressed={entree.id === palierId}
                className={clsx(
                  'rounded-[var(--radius-sm)] border p-3 text-left transition-colors',
                  entree.id === palierId
                    ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                    : 'border-line bg-bg-elev hover:bg-surface-hover',
                )}
              >
                <span className="block text-[12px] tabular-nums text-faint">
                  {entree.max === Number.POSITIVE_INFINITY
                    ? `${entree.min} +`
                    : `${entree.min} – ${entree.max}`}
                </span>
                <span className="mt-0.5 block text-[13px] font-semibold leading-snug">
                  {t(entree.nom)}
                </span>
              </button>
            ))}
          </div>

          {palier && adversaire && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {t('session.opponentBefore')}{' '}
              <strong className="text-ink">{tCoeur(t, adversaire.nomKey)}</strong>
              {t('session.opponentAfter', { elo: adversaire.elo })}
            </p>
          )}
        </div>
      </Card>

      {/* ── 2. Le thème ─────────────────────────────────────────────────── */}
      <Card className="mt-4 overflow-hidden">
        <EnTeteDeCarte
          titre={t('session.whichTheme')}
          icone={<GraduationCap size={14} aria-hidden />}
          teinte="var(--rub-apprendre)"
          fin={t('session.atThisTier', { n: themes.length })}
        />
        <div className="p-4">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {themes.map((entree) => {
              const deja = faites[entree.id] ?? 0
              return (
                <button
                  key={entree.id}
                  type="button"
                  onClick={() => setThemeId(entree.id)}
                  aria-pressed={entree.id === themeId}
                  className={clsx(
                    'flex items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-left transition-colors',
                    entree.id === themeId
                      ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                      : 'border-line bg-bg-elev hover:bg-surface-hover',
                  )}
                >
                  <span className="text-xl" aria-hidden>
                    {entree.icone}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">{t(entree.nom)}</span>
                      {deja > 0 && (
                        <Chip tone="success">
                          {t(deja > 1 ? 'session.countMany' : 'session.countOne', { n: deja })}
                        </Chip>
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                      {entree.consigne}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const tire = themes[Math.floor(Math.random() * themes.length)]
              if (tire) setThemeId(tire.id)
            }}
            className="lien mt-3 inline-flex items-center gap-1.5"
          >
            <Shuffle size={13} aria-hidden />
            {t('session.pickForMe')}
          </button>
        </div>
      </Card>

      {/* ── 3. Lancer ───────────────────────────────────────────────────── */}
      <Card className="mt-4 overflow-hidden">
        <EnTeteDeCarte
          titre={t('session.beforeStarting')}
          icone={<MessageSquare size={14} aria-hidden />}
          teinte="var(--rub-analyser)"
        />
        <div className="p-4">
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 py-1.5">
            <Toggle
              checked={commente}
              onChange={setCommente}
              label={t('session.commentEachMove')}
              description={t('session.commentEachMoveHint')}
            />
          </div>

          {/* La promesse du bilan, dite avant et non après : c'est elle qui
              donne une raison de tenir le thème pendant quarante coups. */}
          {theme && (
            <div className="mt-4 glass p-4">
              <p className="text-[13px] font-semibold text-faint">{t('session.whatYouWatch')}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t(theme.aRegarder)}</p>
              <p className="mt-3 text-[13px] font-semibold text-faint">{t('session.atTheEnd')}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                {t('session.debriefPromise', { theme: t(theme.nom).toLowerCase() })}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {palier && theme ? (
              <ButtonLink
                href={`${lienDeSeance(palier.id, theme.id)}${commente ? '&commente=1' : ''}`}
                variant="primary"
                size="lg"
                icon={<Play size={16} />}
              >
                {t('session.start')}
              </ButtonLink>
            ) : (
              <Button variant="primary" size="lg" icon={<Play size={16} />} disabled>
                {t('session.pickTheme')}
              </Button>
            )}
            <ButtonLink href="/apprendre/palier" size="lg" icon={<Crown size={15} />}>
              {t('bits.seeMyTier')}
            </ButtonLink>
          </div>
        </div>
      </Card>

      <AutresDeLaSection section="jouer" />
    </div>
  )
}
