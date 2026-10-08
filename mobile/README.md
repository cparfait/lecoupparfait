# L'appli Android

Une coque [Capacitor](https://capacitorjs.com) autour du site en ligne : l'APK
ouvre `https://coupparfait.cparfait.ovh` dans sa propre WebView, avec son
icône, son écran de démarrage et son module de mise à jour. Le contenu vient
toujours du serveur, et chaque déploiement du site est donc visible dans
l'appli sans rien réinstaller.

Ce dossier ne fait pas partie des espaces de travail npm : ses dépendances
s'installent à part (`cd mobile && npm ci`) et n'entrent ni dans le
`npm ci` de la racine, ni dans les images Docker (`.dockerignore`).

## Prérequis

- Java 21 ;
- le SDK Android, avec `platforms/android-36` et `build-tools/35.0.0`, et
  `android/local.properties` qui le désigne :
  `sdk.dir=C\:/Users/<toi>/AppData/Local/Android/Sdk` ;
- la clé de signature (ci-dessous).

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

## Ce qui diffère du site

- **Notifications** : une WebView n'a pas de service de push. Il faudra
  brancher Firebase Cloud Messaging (`@capacitor/push-notifications`, un
  projet Firebase et son `google-services.json`).
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
