'use client'

/**
 * Préférences.
 *
 * Tout est appliqué **immédiatement**, sans bouton « enregistrer » : on voit
 * l'effet de chaque réglage au moment où on le change, avec un échiquier de
 * démonstration juste à côté. C'est la seule façon de choisir un jeu de pièces
 * ou un damier de façon éclairée.
 */

import { useEffect, useState } from 'react'
import { Bell, BrainCircuit, Grid3x3, Palette, RotateCcw, Volume2, Zap } from 'lucide-react'
import clsx from 'clsx'
import { Board2D } from '@/components/board/Board2D.tsx'
import { PanneauIA } from '@/components/ia/PanneauIA.tsx'
import { ReglageInstallation } from '@/components/settings/ReglageInstallation.tsx'
import { ReglageNotifications } from '@/components/settings/ReglageNotifications.tsx'
import {
  Button,
  Card,
  SectionTitle,
  SegmentedControl,
  Slider,
  Toggle,
} from '@/components/ui/index.tsx'
import { pieceUrl } from '@/components/board/boardKit.ts'
import {
  BOARD_STYLES,
  PIECE_COLOURS,
  PIECE_MATERIALS,
  PIECE_SETS,
  THEME_LIST,
  usePreferences,
  type BoardStyleId,
  type PieceColourId,
  type PieceSetId,
} from '@/lib/store/preferences.ts'
import { LOCALE_LABELS, LOCALES, useT } from '@/lib/i18n/index.tsx'
import {
  listVoices,
  loadNeuralVoices,
  testVoice,
  type NeuralVoice,
  type VoiceOption,
} from '@/lib/speech.ts'
import { toast } from '@/components/ui/Toast.tsx'
import { playSound } from '@/lib/sound.ts'

/** Position de démonstration : quelques pièces variées, pas l'échiquier initial. */
const DEMO_FEN = 'r2q1rk1/pp2bppp/2n1bn2/2pp4/3P4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 1'

/**
 * Les réglages, par famille.
 *
 * Huit sections empilées faisaient six écrans de défilement : pour couper la
 * voix du coach, il fallait passer devant les quatre thèmes, les huit damiers,
 * les dix jeux de pièces et vingt interrupteurs d'affichage. On ne cherche pas
 * un réglage en le lisant, on le cherche en sachant à peu près où il est —
 * encore faut-il qu'il y ait un « où ».
 */
const ONGLETS = [
  { id: 'apparence', label: 'Apparence', icon: Palette },
  { id: 'echiquier', label: 'Échiquier', icon: Grid3x3 },
  { id: 'son', label: 'Son et voix', icon: Volume2 },
  { id: 'ia', label: 'Assistant IA', icon: BrainCircuit },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const

type OngletId = (typeof ONGLETS)[number]['id']

export default function PreferencesPage() {
  const prefs = usePreferences()
  const set = usePreferences((state) => state.set)
  const reset = usePreferences((state) => state.reset)
  const t = useT()

  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [neural, setNeural] = useState<NeuralVoice[]>([])

  useEffect(() => {
    void listVoices(prefs.locale).then(setVoices)
  }, [prefs.locale])

  // Voix neuronales servies par le serveur. Leur absence est le cas normal sur
  // une installation minimale : on n'en fait pas un incident, mais on le dit.
  const [neuralProbed, setNeuralProbed] = useState(false)
  useEffect(() => {
    void loadNeuralVoices().then((list) => {
      setNeural(list)
      setNeuralProbed(true)
    })
  }, [])

  const neuralForLocale = neural.filter((voice) => voice.language === prefs.locale)

  /**
   * Onglet affiché, reflété dans l'adresse.
   *
   * Le paramètre est lu dans un effet plutôt qu'avec `useSearchParams` : il ne
   * sert qu'au premier rendu, et cette forme évite d'imposer une frontière de
   * suspense à toute la page pour une chaîne de caractères. On écrit ensuite
   * l'onglet dans l'historique en `replace`, pour que le bouton « précédent »
   * ramène à la page d'où l'on vient et non à l'onglet précédent.
   */
  const [onglet, setOnglet] = useState<OngletId>('apparence')
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('onglet')
    if (ONGLETS.some((entry) => entry.id === demande)) setOnglet(demande as OngletId)
  }, [])

  const choisirOnglet = (id: OngletId) => {
    setOnglet(id)
    const url = new URL(window.location.href)
    url.searchParams.set('onglet', id)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Préférences</h1>
      <p className="mt-2 text-muted">
        Tout s’applique immédiatement et reste enregistré dans ton navigateur.
      </p>

      {/* ── Onglets ──────────────────────────────────────────────────
          Horizontaux et non en colonne latérale : la colonne de droite est
          déjà prise par l'aperçu de l'échiquier, qui doit rester visible
          pendant qu'on change de damier. Une troisième colonne aurait réduit
          les réglages à un couloir. */}
      <div
        role="tablist"
        aria-label="Familles de réglages"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-line pb-px"
      >
        {ONGLETS.map((entry) => {
          const Icone = entry.icon
          const actif = onglet === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={actif}
              /* L'onglet actif se met de lui-même dans le champ de vision.
                 La bande déborde sur téléphone : arriver par un lien qui
                 désigne le dernier onglet affichait son contenu sous une bande
                 restée au début, où c'était le *premier* onglet qui semblait
                 choisi. On voyait donc les notifications sous le titre
                 « Apparence ». */
              ref={
                actif
                  ? (element) =>
                      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                  : undefined
              }
              onClick={() => choisirOnglet(entry.id)}
              className={clsx(
                'relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
                actif ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icone size={15} aria-hidden />
              {entry.label}
              {actif && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Réglages ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Thème */}
          {onglet === 'apparence' && (
          <Card className="p-5">
            <SectionTitle hint="Change l’ambiance de toute l’application.">
              <span className="flex items-center gap-2">
                <Palette size={16} className="text-accent" aria-hidden />
                Thème
              </span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEME_LIST.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => set('theme', entry.id)}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border p-2.5 text-left transition-all',
                    prefs.theme === entry.id
                      ? 'border-accent ring-1 ring-accent'
                      : 'border-line hover:bg-surface-hover',
                  )}
                >
                  <span className="mb-2 flex gap-1" aria-hidden>
                    {entry.swatch.map((colour) => (
                      <span
                        key={colour}
                        className="h-6 flex-1 rounded-[3px] ring-1 ring-black/20"
                        style={{ background: colour }}
                      />
                    ))}
                  </span>
                  <span className="text-xs font-medium">
                    {t(`settings.themes.${entry.id}` as never)}
                  </span>
                </button>
              ))}
            </div>
          </Card>
          )}

          {/* Échiquier */}
          {onglet === 'echiquier' && (
          <Card className="p-5">
            <SectionTitle>Damier</SectionTitle>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {BOARD_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => set('boardStyle', style.id as BoardStyleId)}
                  title={style.label}
                  aria-label={style.label}
                  className={clsx(
                    'aspect-square overflow-hidden rounded-[var(--radius-sm)] border transition-all',
                    prefs.boardStyle === style.id
                      ? 'border-accent ring-1 ring-accent'
                      : 'border-line hover:scale-105',
                  )}
                >
                  <span className="grid h-full w-full grid-cols-2 grid-rows-2" aria-hidden>
                    <span style={{ background: style.light }} />
                    <span style={{ background: style.dark }} />
                    <span style={{ background: style.dark }} />
                    <span style={{ background: style.light }} />
                  </span>
                </button>
              ))}
            </div>

            <SectionTitle
              hint="Tous sous licence libre — voir la page Crédits."
              action={undefined}
            >
              <span className="mt-5 block">Jeu de pièces</span>
            </SectionTitle>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PIECE_SETS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => set('pieceSet', entry.id as PieceSetId)}
                  title={entry.blurb}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border p-2 transition-all',
                    prefs.pieceSet === entry.id
                      ? 'border-accent ring-1 ring-accent'
                      : 'border-line hover:bg-surface-hover',
                  )}
                >
                  <span className="flex" aria-hidden>
                    <img src={pieceUrl(entry.id, 'w', 'n')} alt="" className="h-7 w-7" />
                    <img src={pieceUrl(entry.id, 'b', 'q')} alt="" className="h-7 w-7" />
                  </span>
                  <span className="text-[11px] font-medium">{entry.label}</span>
                </button>
              ))}
            </div>
          </Card>
          )}

          {/* Affichage */}
          {onglet === 'echiquier' && (
          <Card className="p-5">
            <SectionTitle>Affichage</SectionTitle>

            <div className="mb-3">
              <p className="mb-1.5 text-sm font-medium">Vue par défaut</p>
              <SegmentedControl
                value={prefs.view}
                onChange={(value) => set('view', value)}
                label="Vue par défaut"
                options={[
                  { value: '2d' as const, label: '2D' },
                  { value: '3d' as const, label: '3D' },
                ]}
              />
            </div>

            {prefs.view === '3d' && (
              <>
                <div className="mb-3">
                  <p className="mb-1.5 text-sm font-medium">Matériau des pièces</p>
                  <SegmentedControl
                    value={prefs.pieceMaterial}
                    onChange={(value) => set('pieceMaterial', value)}
                    label="Matériau"
                    options={PIECE_MATERIALS.map((material) => ({
                      value: material.id,
                      label: material.label,
                    }))}
                  />
                </div>

                <div className="mb-3">
                  <p className="mb-1.5 text-sm font-medium">Couleur des pièces</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PIECE_COLOURS.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => set('pieceColours', entry.id as PieceColourId)}
                        title={entry.blurb}
                        className={clsx(
                          'flex items-center gap-2 rounded-[var(--radius-sm)] border p-2 text-left transition-all',
                          prefs.pieceColours === entry.id
                            ? 'border-accent ring-1 ring-accent'
                            : 'border-line hover:bg-surface-hover',
                        )}
                      >
                        <span className="flex shrink-0 gap-0.5" aria-hidden>
                          <span
                            className="h-6 w-3 rounded-l-full ring-1 ring-black/25"
                            style={{
                              background:
                                entry.white ||
                                (entry.id === 'custom'
                                  ? prefs.pieceWhiteCustom
                                  : 'var(--sq-light)'),
                            }}
                          />
                          <span
                            className="h-6 w-3 rounded-r-full ring-1 ring-black/25"
                            style={{
                              background:
                                entry.black ||
                                (entry.id === 'custom'
                                  ? prefs.pieceBlackCustom
                                  : 'var(--sq-dark)'),
                            }}
                          />
                        </span>
                        <span className="min-w-0 text-[11px] font-medium leading-tight">
                          {entry.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {prefs.pieceColours === 'custom' && (
                    <div className="mt-2 flex gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="color"
                          value={prefs.pieceWhiteCustom}
                          onChange={(event) => set('pieceWhiteCustom', event.target.value)}
                          className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent"
                          aria-label="Couleur des pièces blanches"
                        />
                        Blancs
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="color"
                          value={prefs.pieceBlackCustom}
                          onChange={(event) => set('pieceBlackCustom', event.target.value)}
                          className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent"
                          aria-label="Couleur des pièces noires"
                        />
                        Noirs
                      </label>
                    </div>
                  )}

                  <p className="mt-2 text-xs leading-relaxed text-faint">
                    Ne concerne que la vue 3D : les pièces 2D sont des dessins vectoriels aux
                    couleurs fixes.
                  </p>
                </div>
              </>
            )}

            <div className="divide-y divide-line/50">
              <Toggle
                label="Coordonnées"
                description="Lettres et chiffres sur les bords de l’échiquier."
                checked={prefs.showCoordinates}
                onChange={(value) => set('showCoordinates', value)}
              />
              <Toggle
                label="Coups légaux"
                description="Affiche les cases où la pièce sélectionnée peut aller."
                checked={prefs.showLegalMoves}
                onChange={(value) => set('showLegalMoves', value)}
              />
              <Toggle
                label="Coups colorés selon le danger"
                description="Vert : la pièce y est en sécurité. Rouge : elle serait perdue. Doré : le coup gagne du matériel. Une béquille d’apprentissage — désactive-la dès que tu vois ces choses tout seul."
                checked={prefs.moveSafetyHints}
                onChange={(value) => set('moveSafetyHints', value)}
                disabled={!prefs.showLegalMoves}
              />
              <Toggle
                label="Nom de l’ouverture en partie"
                description="Affiche le nom de l’ouverture jouée, mis à jour à chaque coup. C’est la façon la plus efficace d’apprendre les noms : on les voit sur ses propres parties."
                checked={prefs.showOpeningName}
                onChange={(value) => set('showOpeningName', value)}
              />
              <Toggle
                label="Annoncer l’ouverture à voix haute"
                description="Le coach prononce le nom quand il change."
                checked={prefs.announceOpenings}
                onChange={(value) => set('announceOpenings', value)}
                disabled={!prefs.showOpeningName || !prefs.voiceEnabled}
              />
              <Toggle
                label="Mode commenté"
                description="Après chaque coup, le moteur montre ce que tu aurais pu jouer, avec les trois meilleures options et la raison de chacune. Indisponible en partie contre un ami."
                checked={prefs.commentaryMode}
                onChange={(value) => set('commentaryMode', value)}
              />
              <Toggle
                label="Attendre que tu aies lu"
                description="En mode commenté, l’adversaire patiente après chaque coup jusqu’à ce que tu dises « Continuer ». Sans cette pause il répond en une seconde, et le commentaire décrit une position déjà dépassée."
                checked={prefs.commentaryPauses}
                onChange={(value) => set('commentaryPauses', value)}
                disabled={!prefs.commentaryMode}
              />
              <Toggle
                label="Surligner le dernier coup"
                checked={prefs.highlightLastMove}
                onChange={(value) => set('highlightLastMove', value)}
              />
              <div className="py-2">
                <label htmlFor="notation" className="mb-1.5 block text-sm font-medium">
                  Écriture des coups
                </label>
                <select
                  id="notation"
                  value={prefs.notation}
                  onChange={(event) =>
                    set('notation', event.target.value as 'lettres' | 'figurine')
                  }
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="lettres">Lettres — Cf3, Dxd5+</option>
                  <option value="figurine">Figurine — ♘f3, ♕xd5+</option>
                </select>
                <p className="mt-1.5 text-xs text-faint">
                  La notation figurine est celle des livres et des revues : elle ne dépend
                  d’aucune langue, et on apprend au passage des symboles qu’on retrouve
                  partout.
                </p>
              </div>

              <Toggle
                label="Les Blancs toujours en bas"
                description="Fige le sens de l’échiquier au lieu de le retourner selon ta couleur. Les diagrammes des livres et des leçons sont presque tous vus des Blancs."
                checked={prefs.whiteAlwaysBottom}
                onChange={(value) => set('whiteAlwaysBottom', value)}
              />
              <Toggle
                label="Signaler l’échec"
                description="Halo rouge autour du roi attaqué."
                checked={prefs.highlightCheck}
                onChange={(value) => set('highlightCheck', value)}
              />
              <Toggle
                label="Pré-coups"
                description="Jouer pendant le tour de l’adversaire ; le coup part dès qu’il a joué."
                checked={prefs.premove}
                onChange={(value) => set('premove', value)}
              />
              <Toggle
                label="Barre d’évaluation en partie"
                description="Déconseillé : voir l’évaluation pendant qu’on joue empêche d’apprendre à évaluer soi-même."
                checked={prefs.showEvalDuringGame}
                onChange={(value) => set('showEvalDuringGame', value)}
              />
            </div>

            <Slider
              label="Vitesse d’animation"
              value={prefs.animationMs}
              onChange={(value) => set('animationMs', value)}
              min={0}
              max={500}
              step={10}
              format={(value) => (value === 0 ? 'instantané' : `${value} ms`)}
            />
          </Card>
          )}

          {/* Effets */}
          {onglet === 'apparence' && (
          <Card className="p-5">
            <SectionTitle hint="Réduis les effets si l’interface saccade.">
              <span className="flex items-center gap-2">
                <Zap size={16} className="text-accent" aria-hidden />
                Effets visuels
              </span>
            </SectionTitle>
            <SegmentedControl
              value={prefs.effects}
              onChange={(value) => set('effects', value)}
              label="Effets visuels"
              options={[
                { value: 'high' as const, label: 'Spectaculaires' },
                { value: 'low' as const, label: 'Performance' },
              ]}
            />
            <p className="mt-2.5 text-xs leading-relaxed text-muted">
              En mode spectaculaire : verre dépoli, ombres portées, halos, reflets et ombres
              de contact en 3D. En mode performance, tout cela est désactivé — l’application
              reste identique, simplement plus sobre et beaucoup plus légère.
            </p>
          </Card>
          )}

          {/* Son et voix */}
          {onglet === 'son' && (
          <Card className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Volume2 size={16} className="text-accent" aria-hidden />
                Son et voix
              </span>
            </SectionTitle>

            <div className="divide-y divide-line/50">
              <Toggle
                label="Bruitages"
                description="Un son différent selon qu’on déplace, capture ou donne échec."
                checked={prefs.soundEnabled}
                onChange={(value) => {
                  set('soundEnabled', value)
                  if (value) playSound('move')
                }}
              />
              <Toggle
                label="Commentaire vocal"
                description="Le coach lit ses explications à voix haute pendant les leçons et l’analyse."
                checked={prefs.voiceEnabled}
                onChange={(value) => set('voiceEnabled', value)}
              />
            </div>

            {prefs.soundEnabled && (
              <Slider
                label="Volume"
                value={Math.round(prefs.volume * 100)}
                onChange={(value) => {
                  set('volume', value / 100)
                  playSound('move')
                }}
                min={0}
                max={100}
                format={(value) => `${value} %`}
              />
            )}

            {prefs.voiceEnabled && (
              <>
                {neuralForLocale.length > 0 && (
                  <div className="mt-3">
                    <label htmlFor="engine" className="mb-1.5 block text-sm font-medium">
                      Moteur de synthèse
                    </label>
                    <select
                      id="engine"
                      value={prefs.voiceEngine}
                      onChange={(event) =>
                        set('voiceEngine', event.target.value as 'neural' | 'system')
                      }
                      className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="neural">Voix neuronale (recommandé)</option>
                      <option value="system">Voix du navigateur</option>
                    </select>
                    <p className="mt-1.5 text-xs text-faint">
                      La voix neuronale est calculée par ton propre serveur, hors ligne et
                      sans service tiers. Elle est nettement plus naturelle, mais démarre
                      avec une fraction de seconde de retard.
                    </p>
                  </div>
                )}

                {neuralForLocale.length > 0 && prefs.voiceEngine === 'neural' && (
                  <div className="mt-3">
                    <label htmlFor="neural-voice" className="mb-1.5 block text-sm font-medium">
                      Voix neuronale
                    </label>
                    <select
                      id="neural-voice"
                      value={prefs.neuralVoice ?? ''}
                      onChange={(event) => set('neuralVoice', event.target.value || null)}
                      className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="">Première voix disponible</option>
                      {neuralForLocale.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-3">
                  <label htmlFor="voice" className="mb-1.5 block text-sm font-medium">
                    {neuralForLocale.length > 0 ? 'Voix du navigateur (secours)' : 'Voix'}
                  </label>
                  <select
                    id="voice"
                    value={prefs.voiceName ?? ''}
                    onChange={(event) => set('voiceName', event.target.value || null)}
                    className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="">Voix par défaut du système</option>
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} {voice.localService ? '' : '(en ligne)'}
                      </option>
                    ))}
                  </select>
                  {voices.length === 0 && (
                    <p className="mt-1.5 text-xs text-faint">
                      Aucune voix française détectée. Installe un pack vocal depuis les
                      réglages de ton système.
                    </p>
                  )}
                </div>

                <Slider
                  label="Débit"
                  value={Math.round(prefs.voiceRate * 100)}
                  onChange={(value) => set('voiceRate', value / 100)}
                  min={60}
                  max={180}
                  format={(value) => `${(value / 100).toFixed(2)}×`}
                />
                <Slider
                  label="Hauteur"
                  value={Math.round(prefs.voicePitch * 100)}
                  onChange={(value) => set('voicePitch', value / 100)}
                  min={50}
                  max={150}
                  format={(value) => `${(value / 100).toFixed(2)}×`}
                />

                {/*
                  Le réglage existait dans le store depuis le début et n'était
                  lu nulle part : la case manquait, donc rien ne pouvait
                  l'activer. La région `aria-live` de l'échiquier, elle, est
                  toujours posée — un lecteur d'écran est informé du coup
                  adverse que cette case soit cochée ou non. Ici, c'est de la
                  voix qu'il s'agit.
                */}
                <Toggle
                  label="Annoncer chaque coup"
                  description="Lit à voix haute le coup joué — « cavalier f3 », « prend en e5 », « échec ». Utile pour jouer sans regarder l’écran en permanence."
                  checked={prefs.announceMoves}
                  onChange={(value) => set('announceMoves', value)}
                />

                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    // On annonce qui parle : c'est la seule façon de savoir si
                    // l'on écoute vraiment la voix qu'on a choisie.
                    void testVoice(prefs.locale).then((result) => {
                      if (result.engine === 'neural') {
                        toast.success('Voix neuronale', result.voice)
                      } else {
                        toast.info(
                          'Voix du navigateur',
                          [result.voice, result.reason].filter(Boolean).join(' — '),
                        )
                      }
                    })
                  }}
                >
                  Tester la voix
                </Button>

                {/* État de la voix neuronale, toujours visible : une panne
                    silencieuse se confond avec un défaut de qualité. */}
                {neuralProbed && neuralForLocale.length === 0 && (
                  <p className="mt-2 text-xs text-faint">
                    Voix neuronale indisponible : le serveur ne propose aucune voix
                    installée. Lance{' '}
                    <code className="rounded bg-surface px-1 py-0.5">
                      npm run voice:install
                    </code>{' '}
                    puis redémarre le serveur.
                  </p>
                )}
              </>
            )}
          </Card>
          )}

          {/* Assistant IA */}
          {onglet === 'ia' && (
          <PanneauIA />
          )}

          {/* Notifications */}
          {onglet === 'notifications' && (
            <>
              <ReglageNotifications />
              {/* Sous les notifications, et pas ailleurs : sur iPhone, c'est
                  l'installation qui les rend possibles, et lire l'un juste
                  après l'autre suffit à faire le lien. */}
              <ReglageInstallation />
            </>
          )}

          {/* Langue */}
          {onglet === 'apparence' && (
          <Card className="p-5">
            <SectionTitle>Langue</SectionTitle>
            <SegmentedControl
              value={prefs.locale}
              onChange={(value) => set('locale', value)}
              label="Langue"
              options={LOCALES.map((code) => ({
                value: code,
                label: `${LOCALE_LABELS[code].flag} ${LOCALE_LABELS[code].label}`,
              }))}
            />
          </Card>
          )}

          <Button
            variant="ghost"
            icon={<RotateCcw size={15} />}
            onClick={() => {
              if (confirm('Rétablir tous les réglages par défaut ?')) reset()
            }}
          >
            Rétablir les réglages par défaut
          </Button>
        </div>

        {/* ── Aperçu ───────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Aperçu en direct
          </p>
          <Board2D
            fen={DEMO_FEN}
            playable="both"
            lastMove={{ from: 'e2', to: 'e2' }}
            allowAnnotations={false}
          />
          <p className="mt-2 text-xs leading-relaxed text-faint">
            Damier « {BOARD_STYLES.find((style) => style.id === prefs.boardStyle)?.label} »,
            pièces « {PIECE_SETS.find((entry) => entry.id === prefs.pieceSet)?.label} ». Clique
            une pièce pour voir les indications de coups légaux.
          </p>
        </div>
      </div>
    </div>
  )
}
