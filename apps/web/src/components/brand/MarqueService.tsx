/**
 * La vignette d'un service extérieur : Chess.com, Lichess.
 *
 * Les deux se listaient en texte, l'un sous l'autre, avec une pièce d'échecs en
 * caractère typographique à gauche — une tour pour l'un, un cavalier pour
 * l'autre, choisies au hasard. Rien ne les distinguait au premier regard, alors
 * que ce sont deux sites qu'on reconnaît instantanément à leur couleur : le
 * vert de l'un, le noir et blanc de l'autre.
 *
 * ── Pourquoi une vignette dessinée, et non le vrai logo ───────────────────
 *
 * Deux raisons, et la seconde compte autant que la première.
 *
 * **Le droit.** Le logo de Chess.com est une marque déposée ; celui de Lichess
 * est libre, mais les mêler donnerait à croire que les deux le sont. On ne
 * reproduit donc aucune œuvre : une tuile, une couleur, une pièce d'échecs
 * dessinée par nous. C'est un repère, pas une imitation.
 *
 * **La vie privée.** Aller chercher les favicons chez eux ferait connaître à
 * chess.com et à lichess.org l'adresse IP de quiconque ouvre l'écran
 * d'analyse — y compris ceux qui n'y ont pas de compte. Une plateforme qui
 * promet zéro traqueur ne charge pas d'image chez un tiers pour décorer une
 * liste.
 *
 * Les couleurs sont celles des services, parce que c'est ce qui les rend
 * reconnaissables — et une couleur ne s'approprie pas.
 */

import clsx from 'clsx'

export type Service = 'chesscom' | 'lichess'

const MARQUES: Record<Service, { nom: string; fond: string; encre: string; piece: string }> = {
  // Le vert de l'échiquier de chess.com, et un pion : la pièce de tout le monde.
  chesscom: { nom: 'Chess.com', fond: '#81b64c', encre: '#ffffff', piece: '♟' },
  // Lichess joue le noir et blanc, et son emblème est un cavalier.
  lichess: { nom: 'Lichess', fond: '#f4f4f4', encre: '#111111', piece: '♞' },
}

export function MarqueService({
  service,
  taille = 20,
  className,
}: {
  service: Service
  /** Côté de la tuile, en pixels. */
  taille?: number
  className?: string
}) {
  const marque = MARQUES[service]

  return (
    <span
      className={clsx('grid shrink-0 place-items-center rounded-[5px] leading-none', className)}
      style={{
        width: taille,
        height: taille,
        background: marque.fond,
        color: marque.encre,
        // La pièce occupe les trois quarts de la tuile : plus grande, elle
        // touche les bords ; plus petite, elle disparaît à 16 px.
        fontSize: Math.round(taille * 0.72),
      }}
      title={marque.nom}
      aria-hidden
    >
      {marque.piece}
    </span>
  )
}

/** Le nom du service, tel qu'il s'écrit. */
export function nomDuService(service: Service): string {
  return MARQUES[service].nom
}
