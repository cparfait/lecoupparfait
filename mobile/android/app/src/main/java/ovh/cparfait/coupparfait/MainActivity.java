package ovh.cparfait.coupparfait;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Avant `super.onCreate`, comme le veut androidx : sans cet appel,
        // Android 7 à 11 n'affichaient que le fond, sans la Cavale.
        SplashScreen ecran = SplashScreen.installSplashScreen(this);
        // Avant `super.onCreate` : c'est là que le pont charge ses modules.
        registerPlugin(AppliPlugin.class);
        // La mise à jour par l'appli elle-même, pour l'APK du site seulement.
        Distribution.enregistrer(this);
        super.onCreate(savedInstanceState);
        // L'animation d'ouverture, jusqu'à ce que le site soit peint.
        Ouverture.installer(this, ecran);

        // Le bouton Retour fermait l'appli depuis n'importe quelle page :
        // Capacitor ne le relie pas à l'historique de la WebView sans le module
        // @capacitor/app. On remonte donc l'historique, et l'on ne rend la main
        // au système qu'une fois revenu à la première page.
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView vue = getBridge().getWebView();
                        if (vue.canGoBack()) {
                            vue.goBack();
                            return;
                        }
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                }
            );
    }
}
