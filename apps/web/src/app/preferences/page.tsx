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
import { localeDuContenu, useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { LANGUES } from '@/lib/i18n/langues.ts'
import { enregistrerLangueDuCompte } from '@/lib/auth/langueDuCompte.ts'
import { Drapeau } from '@/components/ui/Drapeau.tsx'
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
  { id: 'apparence', icon: Palette },
  { id: 'echiquier', icon: Grid3x3 },
  { id: 'son', icon: Volume2 },
  { id: 'ia', icon: BrainCircuit },
  { id: 'notifications', icon: Bell },
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
    // Les voix du système, pour la langue du contenu : la synthèse ne parle
    // que ce que le cœur écrit, et proposer une voix polonaise pour lire une
    // phrase anglaise ne servirait personne.
    void listVoices(localeDuContenu(prefs.locale)).then(setVoices)
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
    <div className="page">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('settings.title')}
      </h1>
      <p className="mt-2 text-muted">{t('settings.subtitle')}</p>

      {/* ── Onglets ──────────────────────────────────────────────────
          Horizontaux et non en colonne latérale : la colonne de droite est
          déjà prise par l'aperçu de l'échiquier, qui doit rester visible
          pendant qu'on change de damier. Une troisième colonne aurait réduit
          les réglages à un couloir. */}
      <div
        role="tablist"
        aria-label={t('settings.tabsLabel')}
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
                  ? (element) => element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                  : undefined
              }
              onClick={() => choisirOnglet(entry.id)}
              className={clsx(
                'relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
                actif ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icone size={15} aria-hidden />
              {t(`settings.tabs.${entry.id}` as never)}
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
              <SectionTitle hint={t('settings.themeHint')}>
                <span className="flex items-center gap-2">
                  <Palette size={16} className="text-accent" aria-hidden />
                  {t('settings.theme')}
                </span>
              </SectionTitle>
              <div className="grid max-w-md grid-cols-2 gap-2">
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
              <SectionTitle>{t('settings.boardTexture')}</SectionTitle>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {BOARD_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => set('boardStyle', style.id as BoardStyleId)}
                    title={t(style.labelKey)}
                    aria-label={t(style.labelKey)}
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

              <SectionTitle hint={t('settings.pieceSetHint')} action={undefined}>
                <span className="mt-5 block">{t('settings.pieceSet')}</span>
              </SectionTitle>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {PIECE_SETS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => set('pieceSet', entry.id as PieceSetId)}
                    title={t(entry.blurbKey)}
                    className={clsx(
                      'flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border p-2 transition-all',
                      prefs.pieceSet === entry.id
                        ? 'border-accent ring-1 ring-accent'
                        : 'border-line hover:bg-surface-hover',
                    )}
                  >
                    {/*
                      `<img>` et non `next/image`, volontairement : `pieceUrl`
                      rend un SVG, que l'optimiseur d'images ne touche pas — il
                      redimensionne des pixels, un SVG n'en a pas. On y
                      gagnerait un composant et zéro octet.
                    */}
                    <span className="flex" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pieceUrl(entry.id, 'w', 'n')} alt="" className="h-7 w-7" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pieceUrl(entry.id, 'b', 'q')} alt="" className="h-7 w-7" />
                    </span>
                    <span className="text-[12px] font-medium">{t(entry.labelKey)}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Affichage */}
          {onglet === 'echiquier' && (
            <Card className="p-5">
              <SectionTitle>{t('settings.display')}</SectionTitle>

              <div className="mb-3">
                <p className="mb-1.5 text-sm font-medium">{t('settings.defaultView')}</p>
                <SegmentedControl
                  value={prefs.view}
                  onChange={(value) => set('view', value)}
                  label={t('settings.defaultView')}
                  options={[
                    { value: '2d' as const, label: '2D' },
                    { value: '3d' as const, label: '3D' },
                  ]}
                />
              </div>

              {prefs.view === '3d' && (
                <>
                  <div className="mb-3">
                    <p className="mb-1.5 text-sm font-medium">{t('settings.pieceMaterial')}</p>
                    <SegmentedControl
                      value={prefs.pieceMaterial}
                      onChange={(value) => set('pieceMaterial', value)}
                      label={t('settings.material')}
                      options={PIECE_MATERIALS.map((material) => ({
                        value: material.id,
                        label: t(material.labelKey),
                      }))}
                    />
                  </div>

                  <div className="mb-3">
                    <p className="mb-1.5 text-sm font-medium">{t('settings.pieceColours')}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PIECE_COLOURS.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => set('pieceColours', entry.id as PieceColourId)}
                          title={t(entry.blurbKey)}
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
                          <span className="min-w-0 text-[12px] font-medium leading-tight">
                            {t(entry.labelKey)}
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
                            aria-label={t('settings.whitePiecesColour')}
                          />
                          {t('settings.white')}
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="color"
                            value={prefs.pieceBlackCustom}
                            onChange={(event) => set('pieceBlackCustom', event.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent"
                            aria-label={t('settings.blackPiecesColour')}
                          />
                          {t('settings.black')}
                        </label>
                      </div>
                    )}

                    <p className="mt-2 text-xs leading-relaxed text-faint">
                      {t('settings.colours3dOnly')}
                    </p>
                  </div>
                </>
              )}

              <div className="divide-y divide-line/50">
                <Toggle
                  label={t('settings.coordinates')}
                  description={t('settings.coordinatesHint')}
                  checked={prefs.showCoordinates}
                  onChange={(value) => set('showCoordinates', value)}
                />
                <Toggle
                  label={t('settings.legalMoveHints')}
                  description={t('settings.legalMoveHintsHint')}
                  checked={prefs.showLegalMoves}
                  onChange={(value) => set('showLegalMoves', value)}
                />
                <Toggle
                  label={t('settings.safetyHints')}
                  description={t('settings.safetyHintsHint')}
                  checked={prefs.moveSafetyHints}
                  onChange={(value) => set('moveSafetyHints', value)}
                  disabled={!prefs.showLegalMoves}
                />
                {/* Le mémo est rangé avec les autres béquilles, juste après
                    les coups colorés : ce sont les deux seules aides qui
                    s'adressent au moment *avant* le coup. La différence, et
                    elle mérite d'être dite ici, est que celle-ci ne consulte
                    pas le moteur — d'où sa présence même en partie classée. */}
                <Toggle
                  label={t('settings.memo')}
                  description={t('settings.memoHint')}
                  checked={prefs.memoAvantCoup}
                  onChange={(value) => set('memoAvantCoup', value)}
                />
                <Toggle
                  label={t('settings.openingName')}
                  description={t('settings.openingNameHint')}
                  checked={prefs.showOpeningName}
                  onChange={(value) => set('showOpeningName', value)}
                />
                <Toggle
                  label={t('settings.announceOpening')}
                  description={t('settings.announceOpeningHint')}
                  checked={prefs.announceOpenings}
                  onChange={(value) => set('announceOpenings', value)}
                  disabled={!prefs.showOpeningName || !prefs.voiceEnabled}
                />
                <Toggle
                  label={t('settings.commentary')}
                  description={t('settings.commentaryHint')}
                  checked={prefs.commentaryMode}
                  onChange={(value) => set('commentaryMode', value)}
                />
                <Toggle
                  label={t('settings.commentaryPause')}
                  description={t('settings.commentaryPauseHint')}
                  checked={prefs.commentaryPauses}
                  onChange={(value) => set('commentaryPauses', value)}
                  disabled={!prefs.commentaryMode}
                />
                <Toggle
                  label={t('settings.lastMoveHighlight')}
                  checked={prefs.highlightLastMove}
                  onChange={(value) => set('highlightLastMove', value)}
                />
                <div className="py-2">
                  <label htmlFor="notation" className="mb-1.5 block text-sm font-medium">
                    {t('settings.notation')}
                  </label>
                  <select
                    id="notation"
                    value={prefs.notation}
                    onChange={(event) =>
                      set('notation', event.target.value as 'lettres' | 'figurine')
                    }
                    className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="lettres">{t('settings.notationLetters')}</option>
                    <option value="figurine">{t('settings.notationFigurine')}</option>
                  </select>
                  <p className="mt-1.5 text-xs text-faint">{t('settings.notationHint')}</p>
                </div>

                <Toggle
                  label={t('settings.whiteAlwaysBottom')}
                  description={t('settings.whiteAlwaysBottomHint')}
                  checked={prefs.whiteAlwaysBottom}
                  onChange={(value) => set('whiteAlwaysBottom', value)}
                />
                <Toggle
                  label={t('settings.highlightCheck')}
                  description={t('settings.highlightCheckHint')}
                  checked={prefs.highlightCheck}
                  onChange={(value) => set('highlightCheck', value)}
                />
                <Toggle
                  label={t('settings.premove')}
                  description={t('settings.premoveHint')}
                  checked={prefs.premove}
                  onChange={(value) => set('premove', value)}
                />
                <Toggle
                  label={t('settings.evalBarInGame')}
                  description={t('settings.evalBarInGameHint')}
                  checked={prefs.showEvalDuringGame}
                  onChange={(value) => set('showEvalDuringGame', value)}
                />
              </div>

              <Slider
                label={t('settings.animationSpeed')}
                value={prefs.animationMs}
                onChange={(value) => set('animationMs', value)}
                min={0}
                max={500}
                step={10}
                format={(value) => (value === 0 ? t('settings.animationInstant') : `${value} ms`)}
              />
            </Card>
          )}

          {/* Effets */}
          {onglet === 'apparence' && (
            <Card className="p-5">
              <SectionTitle hint={t('settings.effectsHint')}>
                <span className="flex items-center gap-2">
                  <Zap size={16} className="text-accent" aria-hidden />
                  {t('settings.effects')}
                </span>
              </SectionTitle>
              <SegmentedControl
                value={prefs.effects}
                onChange={(value) => set('effects', value)}
                label={t('settings.effects')}
                options={[
                  { value: 'high' as const, label: t('settings.effectsHigh') },
                  { value: 'low' as const, label: t('settings.effectsLow') },
                ]}
              />
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                {t('settings.effectsDetail')}
              </p>
            </Card>
          )}

          {/* Son et voix */}
          {onglet === 'son' && (
            <Card className="p-5">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Volume2 size={16} className="text-accent" aria-hidden />
                  {t('settings.sound')}
                </span>
              </SectionTitle>

              <div className="divide-y divide-line/50">
                <Toggle
                  label={t('settings.soundEffects')}
                  description={t('settings.soundEffectsHint')}
                  checked={prefs.soundEnabled}
                  onChange={(value) => {
                    set('soundEnabled', value)
                    if (value) playSound('move')
                  }}
                />
                <Toggle
                  label={t('settings.voiceEnabled')}
                  description={t('settings.voiceEnabledHint')}
                  checked={prefs.voiceEnabled}
                  onChange={(value) => set('voiceEnabled', value)}
                />
              </div>

              {prefs.soundEnabled && (
                <Slider
                  label={t('settings.volume')}
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
                        {t('settings.speechEngine')}
                      </label>
                      <select
                        id="engine"
                        value={prefs.voiceEngine}
                        onChange={(event) =>
                          set('voiceEngine', event.target.value as 'neural' | 'system')
                        }
                        className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                      >
                        <option value="neural">{t('settings.engineNeural')}</option>
                        <option value="system">{t('settings.engineSystem')}</option>
                      </select>
                      <p className="mt-1.5 text-xs text-faint">{t('settings.engineHint')}</p>
                    </div>
                  )}

                  {neuralForLocale.length > 0 && prefs.voiceEngine === 'neural' && (
                    <div className="mt-3">
                      <label htmlFor="neural-voice" className="mb-1.5 block text-sm font-medium">
                        {t('settings.neuralVoice')}
                      </label>
                      <select
                        id="neural-voice"
                        value={prefs.neuralVoice ?? ''}
                        onChange={(event) => set('neuralVoice', event.target.value || null)}
                        className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                      >
                        <option value="">{t('settings.neuralVoiceFirst')}</option>
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
                      {neuralForLocale.length > 0
                        ? t('settings.browserVoiceFallback')
                        : t('settings.voiceSelect')}
                    </label>
                    <select
                      id="voice"
                      value={prefs.voiceName ?? ''}
                      onChange={(event) => set('voiceName', event.target.value || null)}
                      className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="">{t('settings.systemDefaultVoice')}</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} {voice.localService ? '' : t('settings.voiceOnline')}
                        </option>
                      ))}
                    </select>
                    {voices.length === 0 && (
                      <p className="mt-1.5 text-xs text-faint">{t('settings.noVoices')}</p>
                    )}
                  </div>

                  <Slider
                    label={t('settings.voiceRate')}
                    value={Math.round(prefs.voiceRate * 100)}
                    onChange={(value) => set('voiceRate', value / 100)}
                    min={60}
                    max={180}
                    format={(value) => `${(value / 100).toFixed(2)}×`}
                  />
                  <Slider
                    label={t('settings.voicePitch')}
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
                    label={t('settings.announceMoves')}
                    description={t('settings.announceMovesHint')}
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
                      void testVoice(localeDuContenu(prefs.locale)).then((result) => {
                        if (result.engine === 'neural') {
                          toast.success(
                            t('settings.testVoiceNeural'),
                            result.voice ?? t('parts.defaultVoice'),
                          )
                        } else {
                          toast.info(
                            t('settings.testVoiceBrowser'),
                            [
                              result.voice ?? t('parts.systemDefaultVoice'),
                              result.neuralDown ? t('parts.neuralDown') : null,
                            ]
                              .filter(Boolean)
                              .join(' — '),
                          )
                        }
                      })
                    }}
                  >
                    {t('settings.testVoice')}
                  </Button>

                  {/* État de la voix neuronale, toujours visible : une panne
                    silencieuse se confond avec un défaut de qualité. */}
                  {neuralProbed && neuralForLocale.length === 0 && (
                    <p className="mt-2 text-xs text-faint">
                      {t('settings.neuralUnavailable')}{' '}
                      <code className="rounded bg-surface px-1 py-0.5">npm run voice:install</code>{' '}
                      {t('settings.neuralUnavailableAfter')}
                    </p>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Assistant IA */}
          {onglet === 'ia' && <PanneauIA />}

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

          {/* ── Langue ───────────────────────────────────────────────────
              Deux boutons côte à côte convenaient à deux langues. À
              trente-six, il faut une liste : une grille de vignettes, chacune
              portant le nom de la langue **dans cette langue** — personne ne
              cherche « allemand », on cherche « Deutsch ».

              Les drapeaux sont des images et non des émojis : Windows n'a pas
              de police de drapeaux et affichait « FR » et « GB » en petites
              capitales, ce qui ressemblait à un affichage cassé. Voir
              `Drapeau`. */}
          {onglet === 'apparence' && (
            <Card className="p-5">
              <SectionTitle hint={t('settings.languageHint')}>
                {t('settings.language')}
              </SectionTitle>

              <div
                role="radiogroup"
                aria-label={t('settings.languageGroupLabel')}
                className="grid grid-cols-2 gap-1 sm:grid-cols-3"
              >
                {LANGUES.map((langue) => {
                  const choisie = prefs.locale === langue.code
                  return (
                    <button
                      key={langue.code}
                      type="button"
                      role="radio"
                      aria-checked={choisie}
                      onClick={() => {
                        set('locale', langue.code)
                        // La même langue sur le compte : voir
                        // `enregistrerLangueDuCompte`.
                        enregistrerLangueDuCompte(langue.code)
                      }}
                      className={clsx(
                        'flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition-colors',
                        'pointer-coarse:min-h-11',
                        choisie
                          ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]'
                          : 'border-line bg-bg-elev hover:bg-surface-hover',
                      )}
                    >
                      <Drapeau code={langue.drapeau ?? ''} langue={langue.nom} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {langue.nom}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* La couverture, dite franchement. Une langue à moitié traduite
                  qui se présente comme complète fait douter du reste de
                  l'application ; annoncée, elle donne au contraire envie d'aider
                  à la finir. */}
              <p className="mt-3 text-xs leading-relaxed text-faint">
                {t('settings.languageCoverage')}
              </p>
            </Card>
          )}

          <Button
            variant="ghost"
            icon={<RotateCcw size={15} />}
            onClick={() => {
              if (confirm(t('settings.resetConfirm'))) reset()
            }}
          >
            {t('settings.reset')}
          </Button>
        </div>

        {/* ── Aperçu ───────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-[12px] font-semibold text-faint">{t('settings.preview')}</p>
          <Board2D
            fen={DEMO_FEN}
            playable="both"
            lastMove={{ from: 'e2', to: 'e2' }}
            allowAnnotations={false}
          />
          <p className="mt-2 text-xs leading-relaxed text-faint">
            {t('settings.previewHint', {
              damier: libelleOuVide(
                BOARD_STYLES.find((style) => style.id === prefs.boardStyle)?.labelKey,
                t,
              ),
              pieces: libelleOuVide(
                PIECE_SETS.find((entry) => entry.id === prefs.pieceSet)?.labelKey,
                t,
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Le libellé d'une entrée de catalogue, ou rien.
 *
 * Les quatre catalogues portent des clés de dictionnaire et non du texte ; la
 * recherche par identifiant peut ne rien trouver — un réglage conservé dans le
 * navigateur peut nommer un jeu de pièces retiré depuis. On rend alors la chaîne
 * vide, comme avant.
 */
function libelleOuVide(cle: TranslationKey | undefined, t: ReturnType<typeof useT>): string {
  return cle ? t(cle) : ''
}
