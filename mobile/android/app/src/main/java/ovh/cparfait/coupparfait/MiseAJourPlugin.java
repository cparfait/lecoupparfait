package ovh.cparfait.coupparfait;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * La mise à jour de l'appli par elle-même.
 *
 * L'APK ne passe pas par le Play Store : personne ne le mettrait donc à jour.
 * Le site, lui, connaît toujours la dernière version publiée, puisqu'il est
 * chargé en direct. Il compare avec `version()` et, s'il le faut, demande ici
 * de télécharger le nouvel APK puis d'ouvrir l'installeur d'Android.
 *
 * Android exige deux consentements qu'aucune appli hors Play Store ne peut
 * contourner : l'autorisation d'« installer des applis inconnues », donnée une
 * fois pour toutes dans les paramètres (`autoriser()` y mène), puis la
 * confirmation de chaque mise à jour dans l'installeur.
 */
@CapacitorPlugin(name = "MiseAJour")
public class MiseAJourPlugin extends Plugin {

    private static final String DOSSIER = "mises-a-jour";
    private static final String TYPE_APK = "application/vnd.android.package-archive";

    private final ExecutorService executeur = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void version(PluginCall call) {
        JSObject reponse = new JSObject();
        reponse.put("code", BuildConfig.VERSION_CODE);
        reponse.put("nom", BuildConfig.VERSION_NAME);
        reponse.put("installationAutorisee", installationAutorisee());
        call.resolve(reponse);
    }

    /** Ouvre le réglage « Installer des applis inconnues » de cette appli. */
    @PluginMethod
    public void autoriser(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Avant Android 8, le réglage est global et l'installeur le propose lui-même.
            call.resolve();
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void installer(PluginCall call) {
        String adresse = call.getString("url");
        Uri cible = adresse == null ? null : Uri.parse(adresse);
        Uri serveur = Uri.parse(getBridge().getServerUrl());

        // Seul le serveur de l'appli peut fournir sa mise à jour : toute page
        // chargée dans la WebView peut appeler ce module. Même protocole, même
        // hôte, même port — donc HTTPS en production.
        if (
            cible == null ||
            cible.getScheme() == null ||
            !cible.getScheme().equals(serveur.getScheme()) ||
            cible.getHost() == null ||
            !cible.getHost().equalsIgnoreCase(serveur.getHost()) ||
            cible.getPort() != serveur.getPort()
        ) {
            call.reject("Adresse de mise à jour refusée", "ADRESSE");
            return;
        }
        if (!installationAutorisee()) {
            call.reject("Installation d'applis inconnues non autorisée", "AUTORISATION");
            return;
        }

        executeur.execute(() -> {
            try {
                File apk = telecharger(adresse);
                verifier(apk);
                Uri contenu = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(contenu, TYPE_APK);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception erreur) {
                call.reject(erreur.getMessage(), "TELECHARGEMENT", erreur);
            }
        });
    }

    private boolean installationAutorisee() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private File telecharger(String adresse) throws IOException {
        File dossier = new File(getContext().getCacheDir(), DOSSIER);
        if (!dossier.isDirectory() && !dossier.mkdirs()) {
            throw new IOException("Dossier de mise à jour impossible à créer");
        }
        File apk = new File(dossier, "le-coup-parfait.apk");

        HttpURLConnection connexion = (HttpURLConnection) new URL(adresse).openConnection();
        connexion.setConnectTimeout(15_000);
        connexion.setReadTimeout(30_000);
        try {
            int statut = connexion.getResponseCode();
            if (statut != HttpURLConnection.HTTP_OK) {
                throw new IOException("Le serveur a répondu " + statut);
            }
            long total = connexion.getContentLengthLong();
            try (InputStream entree = connexion.getInputStream(); OutputStream sortie = new FileOutputStream(apk)) {
                byte[] tampon = new byte[64 * 1024];
                long recus = 0;
                int dernier = -1;
                int lus;
                while ((lus = entree.read(tampon)) != -1) {
                    sortie.write(tampon, 0, lus);
                    recus += lus;
                    if (total > 0) {
                        int pourcentage = (int) ((recus * 100) / total);
                        if (pourcentage != dernier) {
                            dernier = pourcentage;
                            JSObject progression = new JSObject();
                            progression.put("pourcentage", pourcentage);
                            notifyListeners("progression", progression);
                        }
                    }
                }
            }
        } finally {
            connexion.disconnect();
        }
        return apk;
    }

    /**
     * Le fichier doit être une version de cette appli-ci. L'installeur refuserait
     * de toute façon une autre signature, mais avec un message qui ne dit rien au
     * joueur ; une page d'erreur servie avec un statut 200 se repère ici.
     */
    private void verifier(File apk) throws IOException {
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getPath(), 0);
        if (info == null || !getContext().getPackageName().equals(info.packageName)) {
            throw new IOException("Le fichier téléchargé n'est pas une version de l'appli");
        }
    }
}
