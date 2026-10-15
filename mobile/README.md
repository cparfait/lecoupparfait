# L'appli Android

Une coque [Capacitor](https://capacitorjs.com) autour du site en ligne : l'appli
ouvre `https://coupparfait.cparfait.ovh` dans sa propre WebView, avec son
icône, son écran de démarrage et ses notifications. Le contenu vient toujours
du serveur, et chaque déploiement du site est donc visible dans l'appli sans
rien réinstaller.

Elle existe en deux distributions, tirées du même code (`android/app/build.gradle`) :

| Distribution | Fichier | Mises à jour                                                       |
| ------------ | ------- | ------------------------------------------------------------------ |
| `site`       | APK     | par l'appli elle-même (`MiseAJourPlugin`), depuis la page `/appli` |
| `play`       | AAB     | par le Play Store, seul autorisé à le faire                        |

Ce dossier ne fait pas partie des espaces de travail npm : ses dépendances
s'installent à part (`cd mobile && npm ci`) et n'entrent ni dans le
`npm ci` de la racine, ni dans les images Docker (`.dockerignore`).

## Prérequis

- Java 21 ;
- le SDK Android, avec `platforms/android-36` et `build-tools/35.0.0`, et
  `android/local.properties` qui le désigne :
  `sdk.dir=C\:/Users/<toi>/AppData/Local/Android/Sdk` ;
- la clé de signature (ci-dessous) ;
- `android/app/google-services.json`, la configuration Firebase de l'appli :
  console Firebase, Paramètres du projet, appli Android
  `ovh.cparfait.coupparfait`. Git l'ignore. Sans lui, l'APK se construit mais
  ne reçoit aucune notification.

## Publier une nouvelle version

1. Augmenter `versionCode` (de 1) et `versionName` dans
   `android/app/build.gradle`, et les mêmes valeurs dans `APPLI_ANDROID`
   (`apps/web/src/lib/appliAndroid.ts`). Le test `appliAndroid.test.ts`
   refuse un écart entre les deux.
2. `npm run apk` : synchronise la configuration, construit l'APK signé et le
   dépose dans `apps/web/public/telechargements/`.
3. Commiter, puis déployer le site. Les appareils équipés voient le bandeau
   « Nouvelle version de l'appli » au lancement suivant, et ceux qui ont gardé
   la mise à jour automatique la téléchargent d'eux-mêmes. Android demande
   toujours de confirmer l'installation.
4. `npm run aab`, puis téléverser `android/app/build/outputs/bundle/playRelease/app-play-release.aab`
   dans Play Console (Tester et publier → Créer une version). Le Play Store
   refuse un `versionCode` déjà envoyé : c'est le même que celui de l'APK.

Une nouvelle version n'est nécessaire que si la coque change (icône,
configuration Capacitor, code Java) : pour le reste, déployer le site suffit.

## La clé de signature

`signature/coupparfait.jks` et `signature/keystore.properties`, que Git
ignore. À sauvegarder hors de cette machine : un APK signé d'une autre clé ne
peut pas mettre à jour celui qui est installé, et chaque joueur devrait
désinstaller l'appli pour en changer.

`keystore.properties` contient :

```properties
storeFile=coupparfait.jks
storePassword=…
keyAlias=coupparfait
keyPassword=…
```

## Le Play Store

Ce que Google exige, et où c'est fait :

- **Pas d'auto-mise à jour** : la distribution `play` n'a ni `MiseAJourPlugin`
  ni la permission `REQUEST_INSTALL_PACKAGES` (elles vivent dans `src/site/`).
  Le site lit la distribution (`AppliPlugin`) et n'y propose aucune mise à jour.
- **Format AAB**, cible Android 36 (`variables.gradle`).
- **Suppression du compte** dans l'appli et par une adresse web : profil,
  « Ton compte », et `/compte/supprimer`.
- **Politique de confidentialité** publique : `/confidentialite`.
- **La fiche** : textes, icône, bannière et captures dans `play-store/`.
  `node scripts/fiche-play.mjs` régénère l'icône et la bannière ; les captures
  viennent du site affiché au format téléphone (405 × 720, zoom 1,6).

**La signature.** Google signe lui-même les appli du Play Store (« Play App
Signing »). Pour qu'un joueur puisse passer de l'APK du site à la version du
Play Store sans désinstaller, il faut lui confier **notre** clé plutôt que de
le laisser en créer une. À la première version, dans Play Console : Intégrité
de l'appli → Signature de l'appli → « Utiliser une clé exportée depuis un
keystore Java ». Google fournit `pepk.jar` et une clé publique de chiffrement :

```bash
java -jar pepk.jar --keystore=signature/coupparfait.jks --alias=coupparfait --output=signature/cle-pour-google.zip --include-cert --rsa-aes-encryption --encryption-key-path=encryption_public_key.pem
```

puis téléverser `cle-pour-google.zip`. Le mot de passe demandé est celui de
`keystore.properties`. Ce choix ne se refait pas : une fois la première version
envoyée, la clé de signature d'une appli ne change plus.

## Ce qui diffère du site

- **Notifications** : une WebView n'a pas de service de push. L'appli passe
  par Firebase Cloud Messaging (`@capacitor/push-notifications`), et le serveur
  envoie par la même voie dès que `FCM_COMPTE_SERVICE` est posé. Voir
  `docs/notifications.md`.
- **Stockfish** : Capacitor relaie chaque page pour y injecter son pont, et
  la resert sans les en-têtes `Cross-Origin-Opener-Policy` et
  `Cross-Origin-Embedder-Policy`. La page n'est donc pas isolée,
  `SharedArrayBuffer` n'existe pas, et le moteur du navigateur tourne sur un
  seul fil. Remettre les en-têtes dans `shouldInterceptRequest` n'a pas suffi
  au premier essai (Pixel 10 Pro, WebView 153) : reste à savoir si la WebView
  accepte l'isolation.
- **Connexion avec Google** : Google refuse sa page dans une WebView
  (« disallowed_useragent »). L'appli l'ouvre dans Chrome
  (`@capacitor/browser`), qui revient par le lien
  `ovh.cparfait.coupparfait://connexion` déclaré dans le manifeste
  (`@capacitor/app`). Le lien ne porte rien : l'issue attend sur le serveur,
  et seule la WebView qui l'a demandée peut la retirer. Voir « Depuis
  l'appli » dans `apps/web/src/lib/server/google.ts`.
- **Partage et téléchargements** : `navigator.share` n'existe pas dans une
  WebView (le site retombe sur la copie du lien), et l'export d'image d'une
  position ne télécharge rien.
- **Icônes** : `node scripts/icones.mjs`, depuis le cavalier détouré de la
  marque. Les PNG produits sont versionnés. Le même script produit l'image de
  l'écran de démarrage (`drawable-*/splash_cavale.png`, la Cavale violette de
  l'accueil).
- **Ouverture animée** (`Ouverture.java`) : dès la première image, l'écran de
  démarrage natif cède la place à `res/raw/ouverture.webp`, dont la première
  image lui est identique. La Cavale grandit en s'élevant, le nom et la frise de damier
  apparaissent, l'image finale tient une seconde, et plus jusqu'à ce que le site
  soit peint (six secondes au plus). Avant Android 9, l'écran natif reste seul.
  Ses bruitages (`res/raw/son_coup.mp3` et `son_mat.mp3`, copies de
  `apps/web/public/sounds/move.mp3` et `victory.mp3`) se taisent en silencieux
  ou en vibreur, et quand le joueur a coupé les sons : le site recopie ce
  réglage dans la coque (`AppliPlugin.reglerSons`), qui s'en sert au lancement
  suivant.
  L'animation se rend avec HyperFrames depuis `video/ouverture-appli` :

  ```bash
  cd video/ouverture-appli
  npx hyperframes render . --format png-sequence -o ./renders/frames
  ffmpeg -framerate 30 -i renders/frames/frame_%06d.png -c:v libwebp_anim -pix_fmt yuva420p -lossless 0 -quality 85 -compression_level 6 -loop 1 ../../mobile/android/app/src/main/res/raw/ouverture.webp
  ```

  La Cavale de l'animation (`assets/cavale.png`, 840 px de haut) doit rester
  celle de `splash_cavale.png` : même source, détourée. Elle part à l'échelle
  0,6, soit 504 px (168 dp à 3×), la taille de l'écran natif.
