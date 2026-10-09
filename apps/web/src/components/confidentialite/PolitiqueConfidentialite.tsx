'use client'

/**
 * La politique de confidentialité.
 *
 * Écrite d'après le code, pas d'après l'idée qu'on s'en fait : chaque phrase
 * correspond à une table, un témoin ou un appel sortant qu'on peut retrouver.
 * Quand le code change ce qu'il garde ou ce qu'il envoie ailleurs, cette page
 * change avec lui — et `MISE_A_JOUR` aussi.
 *
 * Le contact est propre à chaque instance (`CONTACT_EMAIL`) : la page serveur
 * le lit et le passe ici.
 */

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { ButtonLink, TitreDePage } from '@/components/ui/index.tsx'
import { avecElements, langue, useI18n, type TranslationKey } from '@/lib/i18n/index.tsx'

/** Date de la dernière révision du texte. */
const MISE_A_JOUR = new Date('2026-10-09T12:00:00Z')

const SECTIONS: Array<{
  titre: TranslationKey
  paragraphes?: TranslationKey[]
  liste?: TranslationKey[]
}> = [
  { titre: 'confidentialite.withoutAccountTitle', paragraphes: ['confidentialite.withoutAccount'] },
  {
    titre: 'confidentialite.accountTitle',
    liste: [
      'confidentialite.accountPublic',
      'confidentialite.accountPassword',
      'confidentialite.accountGoogle',
      'confidentialite.accountEmail',
      'confidentialite.accountProgress',
      'confidentialite.accountSessions',
    ],
  },
  { titre: 'confidentialite.notificationsTitle', paragraphes: ['confidentialite.notifications'] },
  {
    titre: 'confidentialite.outsideTitle',
    liste: [
      'confidentialite.outsideTablebase',
      'confidentialite.outsideImport',
      'confidentialite.outsideAi',
      'confidentialite.outsideEmail',
      'confidentialite.outsideVoice',
      'confidentialite.outsideNothingElse',
    ],
  },
  { titre: 'confidentialite.chatTitle', paragraphes: ['confidentialite.chat'] },
  { titre: 'confidentialite.retentionTitle', paragraphes: ['confidentialite.retention'] },
]

const TITRE_DE_SECTION = 'pt-2 font-display text-xl font-semibold tracking-tight text-ink'

export function PolitiqueConfidentialite({ contact }: { contact: string | null }) {
  const { t, locale } = useI18n()
  const date = new Intl.DateTimeFormat(langue(locale).bcp47, { dateStyle: 'long' }).format(
    MISE_A_JOUR,
  )

  return (
    <div className="page-etroite">
      <TitreDePage intro={t('confidentialite.intro')}>{t('confidentialite.title')}</TitreDePage>

      <div className="space-y-5 leading-relaxed text-muted">
        <h2 className={TITRE_DE_SECTION}>{t('confidentialite.whoTitle')}</h2>
        <p>{t('confidentialite.who')}</p>
        <p>
          {contact
            ? avecElements(t('confidentialite.contact'), {
                contact: (
                  <a href={`mailto:${contact}`} className="text-accent hover:underline">
                    {contact}
                  </a>
                ),
              })
            : t('confidentialite.contactUnknown')}
        </p>

        {SECTIONS.map((section) => (
          <section key={section.titre} className="space-y-3">
            <h2 className={TITRE_DE_SECTION}>{t(section.titre)}</h2>
            {section.paragraphes?.map((cle) => (
              <p key={cle}>{t(cle)}</p>
            ))}
            {section.liste && (
              <ul className="list-disc space-y-2 ps-5">
                {section.liste.map((cle) => (
                  <li key={cle}>{t(cle)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <h2 className={TITRE_DE_SECTION}>{t('confidentialite.deleteTitle')}</h2>
        <p>{t('confidentialite.delete')}</p>
        <ButtonLink href="/compte/supprimer" icon={<Trash2 size={15} aria-hidden />}>
          {t('suppressionCompte.link')}
        </ButtonLink>

        <h2 className={TITRE_DE_SECTION}>{t('confidentialite.rightsTitle')}</h2>
        <p>{t('confidentialite.rights')}</p>
      </div>

      <p className="mt-8 text-sm text-faint">
        {t('confidentialite.updated', { date })} ·{' '}
        <Link href="/a-propos" className="text-accent hover:underline">
          {t('nav.about')}
        </Link>
      </p>
    </div>
  )
}
