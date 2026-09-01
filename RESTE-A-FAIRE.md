# Reste à faire

État au 1er septembre 2026, fin de seconde séance. Le travail est découpé et
commité sur `main` : douze commits, de `a5ae968` à `32b9d58`. Rien n'est poussé.

Chacun des douze passe `npm run typecheck` pris isolément ; `npm test` passe sur
la pointe (189 étapes de leçon, 274 vérifications).

Ce fichier n'est pas suivi : c'est une note de séance, à supprimer quand elle
n'aura plus d'objet.

---

## Ce qui a été vu tourner cette séance

Les pré-coups, qui n'avaient jamais été à l'écran, le sont maintenant sur les
cinq points prévus :

1. **Contre l'ordinateur** — les deux cases virent au bleu, le coup part dès que
   le trait revient.
2. **Devenu illégal** — pré-coup `exd4` alors que rien n'arrive en d4 : jeté en
   silence, sans message ni demi-coup fantôme.
3. **L'annulation** — un clic ailleurs efface le pré-coup, et rien ne part au
   tour suivant. Attention en le rejouant : l'adversaire de niveau 6 répond en
   une seconde, il faut poser et annuler sans aller-retour entre les deux, sans
   quoi on observe un pré-coup déjà parti.
4. **La promotion** — le sélecteur s'ouvre au moment de l'enregistrement, et la
   pièce choisie est celle qui arrive : cavalier demandé, `b8=♘` joué.
5. **En partie en direct** — vérifié avec deux vrais clients. Le second onglet
   suffit si on lui donne un `clientId` distinct **avant** de le faire entrer :

   ```
   localStorage.setItem('coupparfait.clientId', 'ffffffff0000ffffffff0000ffffffff')
   ```

   Le premier onglet garde le sien, déjà lu à la connexion. Résultat : `1. e4
   e5` où `e5` était posé d'avance, parti à la seconde où le coup adverse est
   arrivé. Et hors de son tour, rien ne part : la liste des coups reste vide
   pendant que les deux cases sont bleues.

La **position composée** joue, l'ordinateur y répond, et une position illisible
affiche bien son message avant de démarrer une partie ordinaire.

Le **duel de carrière** joue coup après coup — atteint en invité par
`/jouer/ordinateur?carriere=3`, que la page tolère sans session
(`/api/carriere` rend `progression: null`, l'adversaire démarre sur le niveau du
chapitre).

---

## 1. Trois choses trouvées en vérifiant, et corrigées

Elles ne figuraient pas au programme, elles sont sorties des essais.

### Les messages émis au montage d'une page étaient perdus

`ToastHost` partait d'une pile vide et n'apprenait l'existence d'un message que
par abonnement. Or React exécute les effets en remontant l'arbre : celui d'une
page part **avant** celui de l'hôte, qui vit dans la coque. Tout message poussé
au montage arrivait donc dans une pile que personne n'écoutait.

C'est ainsi que « Cette position n'est pas jouable » n'apparaissait jamais — le
défaut touchait tous les écrans, pas seulement celui-là.

`apps/web/src/components/ui/Toast.tsx` — l'hôte relit la pile en s'abonnant.

### Toute cadence choisie retombait sur 10 | 5

Les cadences voyagent dans l'adresse (`?tc=1800+20`) et leur identifiant
contient un `+`. Dans une chaîne de requête, `+` est l'écriture historique de
l'espace : `URLSearchParams` rendait `1800 20`, que `parseTimeControl`
refusait. **Les seize cadences étaient perdues**, toutes ramenées au repli
10 | 5 — et sans un mot, une pendule à dix minutes n'ayant l'air de rien
d'anormal.

C'est le serveur qui règle les pendules d'un salon à sa création, sur la valeur
que le premier arrivant lui annonce : un salon né sur le repli ne se rattrapait
plus.

Le symptôme avait déjà été chassé une fois et attribué à `useSearchParams`, qui
peut rendre une collection vide au premier rendu. Vraie cause, mais pas la
seule.

- `packages/core/src/clock.ts` — `normalizeTimeControlId`, et `parseTimeControl`
  qui tolère l'espace. Répare aussi les liens déjà envoyés, qui ne se
  réécrivent pas.
- Les deux endroits qui lisent l'adresse.
- `scripts/check-cadences.mjs` — nouveau, dans `npm test` : les seize cadences
  font l'aller-retour par une adresse. Le contrôle échoue bien 16 fois sur 16
  avec l'ancien analyseur.

Vérifié à l'écran : lien 30 | 20, pendules à 30:00 des deux côtés.

### L'abandon comptait une tentative depuis une position composée

La fin de partie et la chute du drapeau se gardaient d'appeler `recordBotGame`
quand la partie part d'une position fabriquée. L'abandon, non : on gonflait son
nombre de tentatives en abandonnant des positions qu'on venait de composer.

`apps/web/src/app/jouer/ordinateur/page.tsx`, `handleResign`.

Le garde-fou lui-même est vérifié : mat depuis une position composée, aucun
`POST /api/progression` ne part.

---

## 2. Ce qui demande un compte

C'est tout ce qui reste, et cela demande des mains humaines : je ne crée pas de
compte et je ne saisis pas de mot de passe.

- **La carte de carrière.** Le duel joue, mais l'écran du chapitre lui-même et
  le dépôt d'XP en fin de duel (`deposerGains`) n'ont pas été vus.
- **La progression après une position composée.** Le garde-fou est vérifié par
  la trace réseau ; reste à constater sur un compte que le plus haut niveau
  battu ne bouge pas.

Un compte de démonstration existe : `npm run seed:demo` crée des pseudos en
`_demo`.

---

## Hors périmètre, laissé de côté

- Une position composée est traitée comme une partie ordinaire par deux
  affichages, qui racontent alors n'importe quoi : le bandeau d'ouverture
  reconnaît une « Ouverture Clemenz » sur un `h3` joué dans une finale de pions,
  et la barre des pièces prises affiche tout ce qui manque par rapport au départ
  standard — une vingtaine de pièces. Rien ne casse, mais les deux mentent.
- `announceMoves` dans `apps/web/src/lib/store/preferences.ts` : déclaré, jamais
  lu, jamais affiché. Mort mais invisible.
- Le serveur temps réel n'autorise que l'origine `NEXT_PUBLIC_APP_URL`. Si le
  port 3000 est pris par un autre projet, la solution de contournement
  (`npm run dev -w @coupparfait/web -- -p 3100`) fait tourner l'interface mais
  **pas** les parties en direct.
