package ovh.cparfait.coupparfait;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ce que l'appli dit d'elle-même au site : sa version, et par où elle a été
 * distribuée.
 *
 * Deux saveurs de la même appli existent (voir app/build.gradle). L'APK
 * téléchargé depuis le site se met à jour lui-même (`MiseAJourPlugin`) ;
 * celui du Play Store n'en a pas le droit — Google l'interdit — et reçoit ses
 * mises à jour du Play Store. Le site lit `distribution` pour savoir s'il doit
 * proposer quoi que ce soit.
 */
@CapacitorPlugin(name = "Appli")
public class AppliPlugin extends Plugin {

    @PluginMethod
    public void version(PluginCall call) {
        JSObject reponse = new JSObject();
        reponse.put("code", BuildConfig.VERSION_CODE);
        reponse.put("nom", BuildConfig.VERSION_NAME);
        reponse.put("distribution", BuildConfig.FLAVOR);
        call.resolve(reponse);
    }
}
