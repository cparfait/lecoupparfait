'use client'

/**
 * Réglages de l'assistant IA.
 *
 * Le parti pris de cet écran : dire la vérité sur ce qu'on fait de la clé.
 * L'utilisateur confie un secret qui lui est facturé ; il a le droit de savoir
 * où il est rangé et par où il passe, en français et sans périphrase. C'est
 * aussi ce qui rend l'option Ollama lisible pour ce qu'elle est — la seule qui
 * n'expose rien à personne.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Check, Plus, RefreshCw, Trash2, TriangleAlert, X } from 'lucide-react'
import clsx from 'clsx'
import {
  Button,
  Card,
  Chip,
  Input,
  SectionTitle,
  Slider,
  Spinner,
  Toggle,
} from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { allProviders, getProvider, PROVIDERS } from '@/lib/ia/providers/index.ts'
import {
  newCustomProviderId,
  setCustomProviders,
  type CustomProviderDef,
} from '@/lib/ia/providers/custom.ts'
import { effacerToutesLesCles, getCle, setCle } from '@/lib/ia/cle.ts'
import { fetchModels } from '@/lib/ia/modeles.ts'
import { testerConnexion } from '@/lib/ia/coach.ts'
import type { ModelInfo } from '@/lib/ia/types.ts'

export function PanneauIA() {
  const t = useT()
  const enabled = usePreferences((state) => state.iaEnabled)
  const providerId = usePreferences((state) => state.iaProvider)
  const model = usePreferences((state) => state.iaModel)
  const maxTokens = usePreferences((state) => state.iaMaxTokens)
  const customDefs = usePreferences((state) => state.iaCustomProviders)
  const hydrated = usePreferences((state) => state.hydrated)
  const set = usePreferences((state) => state.set)

  // Les fournisseurs personnalisés sont reconstruits à partir des préférences.
  // Il faut le faire avant tout rendu qui les cherche dans le registre, d'où
  // l'exécution pendant le rendu plutôt que dans un effet.
  const customSignature = JSON.stringify(customDefs)
  useMemo(() => setCustomProviders(customDefs), [customSignature])

  const provider = getProvider(providerId)

  // La clé vit hors de React (localStorage, module `cle.ts`) : on la recopie
  // dans un état local à la sélection du fournisseur, sinon le champ ne se
  // remplirait pas au retour sur la page.
  const [cle, setCleLocale] = useState('')
  useEffect(() => {
    setCleLocale(providerId ? getCle(providerId) : '')
  }, [providerId])

  const [modeles, setModeles] = useState<ModelInfo[]>([])
  const [chargeModeles, setChargeModeles] = useState(false)
  const [test, setTest] = useState<'idle' | 'running' | 'ok' | 'ko'>('idle')

  const chargerModeles = useCallback(async () => {
    if (!provider) return
    setChargeModeles(true)
    try {
      setModeles(await fetchModels(provider, getCle(provider.id)))
    } finally {
      setChargeModeles(false)
    }
  }, [provider])

  useEffect(() => {
    if (!enabled || !provider) {
      setModeles([])
      return
    }
    void chargerModeles()
  }, [enabled, provider, chargerModeles])

  const lancerTest = useCallback(async () => {
    if (!provider) return
    setTest('running')
    const resultat = await testerConnexion({
      provider,
      model,
      apiKey: getCle(provider.id),
    })
    setTest(resultat.ok ? 'ok' : 'ko')
    if (resultat.ok) {
      toast.success(t('ia.answers'), `${provider.name} · ${model}`)
    } else {
      toast.error(t('ia.noAnswer'), resultat.erreur)
    }
  }, [provider, model, t])

  const choisirFournisseur = useCallback(
    (id: string) => {
      set('iaProvider', id)
      // Un modèle n'a de sens que chez son fournisseur : le garder produirait
      // un 404 incompréhensible au premier appel.
      set('iaModel', '')
      setTest('idle')
    },
    [set],
  )

  const retire = provider?.isRetiredModel?.(model) ?? false
  const distant = provider ? provider.local !== true : false

  if (!hydrated) return null

  return (
    <Card className="p-5">
      <SectionTitle hint={t('ia.optional')}>
        <span className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-accent" aria-hidden />
          {t('ia.title')}
        </span>
      </SectionTitle>

      <p className="mb-3 text-sm text-muted">
        {t('ia.blurbBefore')} <strong className="text-ink">{t('ia.blurbStrong')}</strong>{' '}
        {t('ia.blurbAfter')}
      </p>

      <Toggle
        checked={enabled}
        onChange={(value) => set('iaEnabled', value)}
        label={t('ia.enable')}
        description={t('ia.enableHint')}
      />

      {enabled && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          {/* ── Fournisseur ─────────────────────────────────────────── */}
          <div>
            <span className="mb-2 block text-sm font-medium">{t('ia.provider')}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allProviders().map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => choisirFournisseur(entry.id)}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm transition-colors',
                    entry.id === providerId
                      ? 'border-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                      : 'border-line bg-surface hover:bg-surface-hover',
                  )}
                >
                  <span className="block truncate font-medium">{entry.name}</span>
                  <span className="mt-0.5 block text-[12px] text-faint">
                    {t(
                      entry.local
                        ? 'ia.onYourMachine'
                        : entry.needsKey
                          ? 'ia.keyRequired'
                          : 'ia.keyOptional',
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {provider && (
            <>
              {/* ── Clé ──────────────────────────────────────────────── */}
              {(provider.needsKey || provider.custom) && (
                <Input
                  type="password"
                  name="ia-cle"
                  label={t('ia.apiKey')}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    provider.needsKey ? t('ia.pasteKey') : t('ia.keyOptionalPlaceholder')
                  }
                  value={cle}
                  onChange={(event) => {
                    setCleLocale(event.target.value)
                    setCle(provider.id, event.target.value)
                    setTest('idle')
                  }}
                  hint={t('ia.keyStorage')}
                />
              )}

              {/* ── Modèle ───────────────────────────────────────────── */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor="ia-modele" className="text-sm font-medium">
                    {t('ia.model')}
                  </label>
                  <button
                    type="button"
                    onClick={() => void chargerModeles()}
                    className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
                  >
                    {chargeModeles ? <Spinner size={12} /> : <RefreshCw size={12} aria-hidden />}
                    {t('ia.refreshList')}
                  </button>
                </div>
                <select
                  id="ia-modele"
                  value={model}
                  onChange={(event) => {
                    set('iaModel', event.target.value)
                    setTest('idle')
                  }}
                  className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">{t('ia.pickModel')}</option>
                  {modeles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                  {/* Un modèle enregistré mais absent de la liste reste
                      sélectionnable : sinon le réglage se viderait tout seul
                      quand la liste n'a pas pu être chargée. */}
                  {model && !modeles.some((entry) => entry.id === model) && (
                    <option value={model}>{t('ia.savedModel', { modele: model })}</option>
                  )}
                </select>

                {modeles.length === 0 && !chargeModeles && (
                  <p className="mt-1.5 text-xs text-faint">
                    {t(provider.local ? 'ia.noModelLocal' : 'ia.noModelRemote')}
                  </p>
                )}

                {retire && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--q-inaccuracy)]">
                    <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden />
                    {t('ia.retiredModel')}
                  </p>
                )}

                {provider.docsUrl && (
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1.5 inline-block text-xs text-accent hover:underline"
                  >
                    {t('ia.seeModels', { fournisseur: provider.name })}
                  </a>
                )}
              </div>

              {/* ── Longueur des réponses ────────────────────────────── */}
              <Slider
                label={t('ia.answerLength')}
                value={maxTokens}
                onChange={(value) => set('iaMaxTokens', value)}
                min={200}
                max={2000}
                step={100}
                format={(value) =>
                  t(
                    value <= 400
                      ? 'ia.lengthShort'
                      : value <= 900
                        ? 'ia.lengthMedium'
                        : 'ia.lengthLong',
                  )
                }
              />

              {/* ── Vérification ─────────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={test === 'running'}
                  onClick={() => void lancerTest()}
                  icon={
                    test === 'ok' ? (
                      <Check size={14} aria-hidden />
                    ) : test === 'ko' ? (
                      <X size={14} aria-hidden />
                    ) : undefined
                  }
                >
                  {t('ia.testConnection')}
                </Button>
                {test === 'ok' && <Chip tone="success">{t('ia.testOk')}</Chip>}
                {test === 'ko' && <Chip tone="danger">{t('ia.testKo')}</Chip>}
              </div>

              {/* ── Ce qu'on fait de la clé ──────────────────────────── */}
              <p className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
                {distant ? (
                  <>
                    {t('ia.remoteKeyBefore')} {provider.name}
                    {t('ia.remoteKeyMiddle')}{' '}
                    <strong className="text-ink">{t('ia.remoteKeyStrong')}</strong>
                    {t('ia.remoteKeyAfter')}
                  </>
                ) : (
                  <>
                    {t('ia.localKeyBefore')}{' '}
                    <strong className="text-ink">{t('ia.localKeyStrong')}</strong>
                    {t('ia.localKeyAfter')} <code>OLLAMA_ORIGINS</code> {t('ia.localKeyEnd')}
                  </>
                )}
              </p>
            </>
          )}

          <FournisseursPersonnalises
            defs={customDefs}
            onChange={(next) => {
              set('iaCustomProviders', next)
              // Le fournisseur sélectionné vient d'être supprimé : on ne laisse
              // pas une préférence pointer dans le vide.
              if (providerId && !next.some((def) => def.id === providerId)) {
                const encoreLa = PROVIDERS.some((entry) => entry.id === providerId)
                if (!encoreLa) {
                  set('iaProvider', '')
                  set('iaModel', '')
                }
              }
            }}
          />

          <button
            type="button"
            onClick={() => {
              effacerToutesLesCles()
              setCleLocale('')
              setTest('idle')
              toast.success(t('ia.keysCleared'))
            }}
            className="text-xs text-muted underline-offset-2 transition-colors hover:text-[var(--q-blunder)] hover:underline"
          >
            {t('ia.clearKeys')}
          </button>
        </div>
      )}
    </Card>
  )
}

/**
 * Ajout de services compatibles OpenAI.
 *
 * Le format `/chat/completions` est devenu un standard de fait : Groq, xAI,
 * Together, LM Studio, vLLM et la plupart des passerelles d'entreprise le
 * parlent. Un champ d'adresse suffit donc à couvrir tout ce qu'on n'a pas
 * intégré nommément — et à éviter d'avoir à intégrer chaque nouveau venu.
 */
function FournisseursPersonnalises({
  defs,
  onChange,
}: {
  defs: CustomProviderDef[]
  onChange: (defs: CustomProviderDef[]) => void
}) {
  const t = useT()
  const [ouvert, setOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [url, setUrl] = useState('')

  const ajouter = () => {
    const adresse = url.trim()
    if (!adresse) return
    try {
      new URL(adresse)
    } catch {
      toast.error(t('ia.badAddress'), t('ia.badAddressHint'))
      return
    }
    onChange([
      ...defs,
      {
        id: newCustomProviderId(),
        name: nom.trim() || t('ia.defaultCustomName'),
        baseUrl: adresse,
      },
    ])
    setNom('')
    setUrl('')
    setOuvert(false)
  }

  return (
    <div className="border-t border-line pt-4">
      <span className="mb-2 block text-sm font-medium">{t('ia.otherService')}</span>

      {defs.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {defs.map((def) => (
            <li
              key={def.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{def.name}</span>
                <span className="block truncate text-[12px] text-faint">{def.baseUrl}</span>
              </span>
              <button
                type="button"
                aria-label={t('ia.removeProvider', { nom: def.name })}
                onClick={() => onChange(defs.filter((entry) => entry.id !== def.id))}
                className="shrink-0 text-muted transition-colors hover:text-[var(--q-blunder)]"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ouvert ? (
        <div className="space-y-2 rounded-[var(--radius-sm)] border border-line p-3">
          <Input
            name="ia-custom-nom"
            label={t('ia.customName')}
            placeholder="Groq"
            value={nom}
            onChange={(event) => setNom(event.target.value)}
          />
          <Input
            name="ia-custom-url"
            label={t('ia.customUrl')}
            placeholder="https://api.groq.com/openai/v1"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            hint={t('ia.customUrlHint')}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={ajouter}>
              {t('ia.customAdd')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOuvert(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus size={14} aria-hidden />}
          onClick={() => setOuvert(true)}
        >
          {t('ia.addOpenAiService')}
        </Button>
      )}
    </div>
  )
}
