/**
 * Le nom du témoin qui porte la langue choisie.
 *
 * Dans son propre fichier parce qu'il a deux lecteurs qui ne peuvent pas
 * s'importer l'un l'autre : le client qui l'écrit (`Providers`) et les routes
 * d'API qui le lisent (`lib/i18n/serveur.ts`, marqué `server-only`). Le
 * pourquoi du témoin est expliqué là-bas.
 */
export const TEMOIN_LANGUE = 'coupparfait.langue'
