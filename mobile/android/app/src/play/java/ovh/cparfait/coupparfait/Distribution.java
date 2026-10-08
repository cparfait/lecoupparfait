package ovh.cparfait.coupparfait;

import com.getcapacitor.BridgeActivity;

/**
 * Rien de propre au Play Store : c'est lui qui met l'appli à jour.
 *
 * Google interdit qu'une appli publiée chez lui se mette à jour par un autre
 * moyen, et refuse la permission `REQUEST_INSTALL_PACKAGES` dans ce but. Ni
 * `MiseAJourPlugin` ni cette permission n'entrent donc dans cette saveur :
 * ils vivent dans `src/site/`.
 */
final class Distribution {

    private Distribution() {}

    static void enregistrer(BridgeActivity activite) {}
}
