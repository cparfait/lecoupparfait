package ovh.cparfait.coupparfait;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ce que l'appli dit d'elle-même au site : sa version, et par où elle a été
 * distribuée. Et ce que le site lui confie en retour : le réglage des sons.
 *
 * `distribution` vaut toujours `play` désormais. Les anciens APK du site
 * répondaient `site`, et le site s'en sert pour les envoyer au Play Store :
 * leur coque ne se mettra plus à jour.
 */
@CapacitorPlugin(name = "Appli")
public class AppliPlugin extends Plugin {

    @PluginMethod
    public void version(PluginCall call) {
        JSObject reponse = new JSObject();
        reponse.put("code", BuildConfig.VERSION_CODE);
        reponse.put("nom", BuildConfig.VERSION_NAME);
        reponse.put("distribution", "play");
        call.resolve(reponse);
    }

    /** Où la coque garde le réglage des sons d'un lancement à l'autre. */
    static final String REGLAGES = "reglages";
    static final String SONS_ACTIFS = "sonsActifs";
    static final String SONS_VOLUME = "sonsVolume";

    /**
     * Le réglage « sons » du site, que l'ouverture animée doit respecter.
     *
     * Il vit dans le stockage de la WebView, que la coque ne sait pas lire au
     * démarrage, avant que le site soit chargé. Le site le recopie donc ici à
     * chaque changement ; `Ouverture` le relit au lancement suivant.
     */
    @PluginMethod
    public void reglerSons(PluginCall call) {
        Boolean actifs = call.getBoolean("actifs");
        Float volume = call.getFloat("volume");
        if (actifs == null || volume == null) {
            call.reject("actifs et volume sont requis");
            return;
        }
        reglages(getContext())
            .edit()
            .putBoolean(SONS_ACTIFS, actifs)
            .putFloat(SONS_VOLUME, Math.max(0f, Math.min(1f, volume)))
            .apply();
        call.resolve();
    }

    static SharedPreferences reglages(Context contexte) {
        return contexte.getSharedPreferences(REGLAGES, Context.MODE_PRIVATE);
    }
}
