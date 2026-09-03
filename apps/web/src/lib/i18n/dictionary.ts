/**
 * Dictionnaire de l'interface.
 *
 * Volontairement sans bibliothèque : un objet imbriqué, une fonction `t()` qui
 * accepte un chemin pointé et des variables. C'est 40 lignes de code plutôt
 * qu'une dépendance, et le typage garantit qu'aucune clé n'est inventée.
 *
 * Le français est la langue de référence : c'est lui qui définit la forme du
 * dictionnaire, l'anglais doit s'y conformer.
 *
 * Les deux langues vivaient ici, dans un seul fichier de sept cent soixante
 * lignes où l'on ne trouvait plus une clé sans faire défiler la moitié de
 * l'autre. Elles sont maintenant dans `fr.ts` et `en.ts` ; ce fichier ne garde
 * que ce qui les assemble.
 */

import { fr } from './fr.ts'
import { en } from './en.ts'

export { fr } from './fr.ts'
export { en } from './en.ts'
export type { Dictionary } from './fr.ts'

export const dictionaries = { fr, en } as const
export type Locale = keyof typeof dictionaries
export const LOCALES: Locale[] = ['fr', 'en']
export const DEFAULT_LOCALE: Locale = 'fr'

export const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  fr: { label: 'Français', flag: '🇫🇷' },
  en: { label: 'English', flag: '🇬🇧' },
}
