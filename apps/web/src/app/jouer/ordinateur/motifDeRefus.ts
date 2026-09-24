import type { useT } from '@/lib/i18n/index.tsx'

/**
 * Le refus du serveur, en une phrase que le joueur peut lire.
 *
 * La route rend un code — `trop-courte`, `non-annoncee`… — et non une phrase :
 * elle parlerait français à quelqu'un qui lit l'application en japonais. La
 * correspondance est ici, et le cas inconnu rend une phrase générique plutôt
 * que rien : un code qu'on aurait ajouté côté serveur sans passer par ici ne
 * doit pas redevenir un silence.
 */
export function motifDeRefus(t: ReturnType<typeof useT>, code: string): string {
  switch (code) {
    case 'adversaire-sans-classement':
      return t('computer.unratedNoOpponent')
    case 'resultat-non-verifiable':
      return t('computer.unratedUnverifiable')
    case 'position-imposee':
      return t('computer.unratedSetupPosition')
    case 'non-annoncee':
      return t('computer.unratedNotAnnounced')
    case 'annonce-differente':
      return t('computer.unratedMismatch')
    case 'trop-rapide':
      return t('computer.unratedTooFast')
    case 'trop-courte':
      return t('computer.unratedTooShort')
    case 'trop-frequente':
      return t('computer.unratedTooSoon')
    case 'classement-indisponible':
      return t('computer.unratedUnavailable')
    default:
      return t('computer.unratedUnknown')
  }
}
