/**
 * Le refus d'une inscription, dans la langue de celui qui s'inscrit.
 *
 * Ces phrases étaient écrites en français dans la route, et ce sont les seules
 * que lit quelqu'un qui n'a pas encore de compte : il découvrait donc
 * l'application par un message qu'il ne comprenait pas, sans même avoir eu
 * l'occasion de choisir sa langue.
 *
 * Partagé par l'inscription classique (`api/auth`) et celle qui passe par
 * Google (`api/auth/google/inscription`) : le même pseudo refusé doit l'être
 * avec les mêmes mots.
 */

import type { ValidationError } from '@coupparfait/db/auth'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

export const CLES_DE_REFUS: Record<ValidationError, TranslationKey> = {
  usernameTooShort: 'auth.errors.usernameTooShort',
  usernameTooLong: 'auth.errors.usernameTooLong',
  usernameCharacters: 'auth.errors.usernameCharacters',
  usernameTaken: 'auth.errors.usernameTaken',
  weakPassword: 'auth.errors.weakPassword',
  emailTaken: 'auth.errors.emailTaken',
  invalidCredentials: 'auth.errors.invalidCredentials',
}
