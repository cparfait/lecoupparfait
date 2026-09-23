---
name: constater-a-l-ecran
description: Comment vérifier dans le navigateur un changement visible de Le Coup Parfait — lancer le serveur, basculer de thème, émuler le téléphone, jouer une partie, et les pièges de l'environnement local (pas de base, pas de Stockfish). À utiliser après toute modification d'interface, d'échiquier ou de parcours.
---

# Constater à l'écran

## Lancer

- Serveur de dev : `preview_start` avec le nom `web` (port 3000). Les
  variantes `web-3001` et `web-3005` servent quand le port est pris
  (`.claude/launch.json`). Ne jamais lancer `npm run dev` par Bash.
- `npm run dev` démarre deux processus : `web` (Next, 3000) et `api`
  (serveur temps réel, 3001).
- En local, sans `.env`, il n'y a **ni base de données ni Stockfish natif**.
  Les parties ne sont pas enregistrées, le défi du jour affiche « base de
  puzzles pas importée », et l'analyse passe par le moteur du navigateur.
  Ce n'est pas un bug du changement en cours.
- Au premier chargement, une page affiche des squelettes gris pendant la
  compilation Turbopack. Attends 3 à 5 s avant de juger.

## Thèmes

Deux thèmes, `aurora` (sombre, par défaut) et `clair`. Le choix est rangé
dans `localStorage['coupparfait.preferences']`, sous `state.theme`, et prime
sur `prefers-color-scheme`. Pour basculer :

```js
const p = JSON.parse(localStorage.getItem('coupparfait.preferences'))
p.state.theme = 'aurora' // ou 'clair'
localStorage.setItem('coupparfait.preferences', JSON.stringify(p))
location.reload()
```

Remets le thème d'origine après la vérification.

## Tailles de référence

Téléphone 375×812 ou 390×844 d'abord (`resize_window` avec `mobile`), puis
tablette 768×1024 et bureau. Vérifie aussi 360×640 pour les écrans étroits,
844×390 pour le paysage et l'absence de défilement horizontal
(`document.documentElement.scrollWidth === innerWidth`). Termine toujours par
`resize_window` avec `desktop`.

## Parcours à rejouer selon ce qui a changé

| Changement                  | Pages                                                       |
| --------------------------- | ----------------------------------------------------------- |
| navigation, en-tête, barre  | `/`, `/jouer`, `/apprendre`, `/entrainer`, `/analyse`, `/plus` |
| adversaires, niveaux        | `/jouer/ordinateur`, `/jouer/adversaires`, `/carriere`, `/apprendre/palier` |
| échiquier, partie           | `/jouer/ordinateur` → « Commencer la partie », jouer 3 coups |
| leçons                      | `/apprendre`, puis une leçon `/apprendre/<id>`              |
| textes                      | la page en `fr` **et** en `en` (réglage de langue)          |

## Preuve

Lis la page avec `get_page_text` / `read_page` pour le texte, et
`read_console_messages` avec `onlyErrors` pour les erreurs. Termine par une
capture d'écran (`scale` 0.5 suffit) à montrer à l'utilisateur. Une animation
se vérifie aussi avec `prefers-reduced-motion`.
