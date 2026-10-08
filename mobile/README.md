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
- **Partage et téléchargements** : `navigator.share` n'existe pas dans une
  WebView (le site retombe sur la copie du lien), et l'export d'image d'une
  position ne télécharge rien.
- **Icônes** : `node scripts/icones.mjs`, depuis le cavalier détouré de la
  marque. Les PNG produits sont versionnés.
