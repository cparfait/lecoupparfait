package ovh.cparfait.coupparfait;

import com.getcapacitor.BridgeActivity;

/** Les modules propres à l'APK distribué par le site : la mise à jour par lui-même. */
final class Distribution {

    private Distribution() {}

    static void enregistrer(BridgeActivity activite) {
        activite.registerPlugin(MiseAJourPlugin.class);
    }
}
