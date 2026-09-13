'use client'

/**
 * Poser une question sur la position affichée.
 *
 * Le geste inverse du mode commenté : là où celui-ci pousse une explication
 * après chaque coup, celui-ci attend qu'on demande. Les deux sont utiles à des
 * moments différents — on subit le premier quand on sait déjà, on réclame le
 * second quand on bloque.
 *
 * La réponse s'affiche **sous** l'explication écrite, jamais à sa place, et
 * elle est signée du nom du modèle. Ce qui vient du moteur est vérifié ; ce qui
 * vient du modèle ne l'est pas, et l'utilisateur doit pouvoir faire la
 * différence d'un coup d'œil.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Volume2 } from 'lucide-react'
import { Button, Spinner } from '@/components/ui/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useAssistant } from '@/lib/ia/useAssistant.ts'
import { speak } from '@/lib/speech.ts'
import type { AIMessage } from '@/lib/ia/types.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function QuestionLibre({
  /** Bloc de faits sur la position — voir `lib/ia/contexte.ts`. */
  contexte,
  /** Question envoyée par le bouton « Approfondir ». */
  questionParDefaut,
  /** Suggestions cliquables, adaptées à la situation. */
  suggestions = [],
}: {
  contexte: string
  questionParDefaut: string
  suggestions?: string[]
}) {
  const t = useT()
  const assistant = useAssistant()
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)

  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)

  // L'échange complet, pour que « et pourquoi pas … ? » ait un sens. Le
  // contexte n'est joint qu'au premier message : le renvoyer à chaque tour
  // multiplierait le coût sans rien apporter, le modèle l'a déjà lu.
  const historique = useRef<AIMessage[]>([])

  // Changer de coup ouvre une nouvelle conversation. Sans cela, le contexte
  // n'étant joint qu'au premier message, le modèle continuerait à répondre sur
  // la position précédente — avec l'aplomb de qui croit parler de la bonne.
  useEffect(() => {
    historique.current = []
    setReponse('')
    setErreur(null)
    setQuestion('')
  }, [contexte])

  const envoyer = useCallback(
    async (texte: string) => {
      const propre = texte.trim()
      if (!propre || encours) return

      setEncours(true)
      setErreur(null)
      setReponse('')
      setQuestion('')

      const premier = historique.current.length === 0
      const contenu = premier ? `${propre}\n\n--- Analyse de la position ---\n${contexte}` : propre
      historique.current.push({ role: 'user', content: contenu })

      try {
        const complete = await assistant.demander({
          historique: historique.current,
          onFragment: (fragment) => setReponse((actuel) => actuel + fragment),
        })
        historique.current.push({ role: 'assistant', content: complete })
        if (voiceEnabled && complete) speak(complete)
      } catch (echec) {
        setErreur(echec instanceof Error ? echec.message : t('rest.requestFailed'))
        // On retire la question restée sans réponse : la laisser fausserait le
        // fil de la conversation au prochain essai.
        historique.current.pop()
      } finally {
        setEncours(false)
      }
    },
    [assistant, contexte, encours, voiceEnabled, t],
  )

  if (!assistant.disponible) return null

  return (
    <div className="mt-3 border-t border-line pt-3">
      {!reponse && !encours && (
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          icon={<Sparkles size={14} aria-hidden />}
          onClick={() => void envoyer(questionParDefaut)}
        >
          {t('bits.goDeeper')}
        </Button>
      )}

      {(reponse || encours) && (
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-faint">
            <Sparkles size={11} aria-hidden />
            {assistant.nomFournisseur ?? 'Assistant'}
            {encours && <Spinner size={11} />}
            {!encours && reponse && voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(reponse)}
                aria-label={t('rest.replayAnswer')}
                className="ml-auto text-muted transition-colors hover:text-ink"
              >
                <Volume2 size={12} aria-hidden />
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{reponse || '…'}</p>
        </div>
      )}

      {erreur && <p className="mt-2 text-xs text-[var(--q-blunder)]">{erreur}</p>}

      {suggestions.length > 0 && !encours && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((texte) => (
            <button
              key={texte}
              type="button"
              onClick={() => void envoyer(texte)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {texte}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-2 flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          void envoyer(question)
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t('rest.askPlaceholder')}
          aria-label={t('rest.askAboutPosition')}
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={!question.trim() || encours}
          aria-label={t('bits.send')}
          icon={<Send size={14} aria-hidden />}
        />
      </form>
    </div>
  )
}
