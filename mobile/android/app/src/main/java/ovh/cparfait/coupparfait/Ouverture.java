package ovh.cparfait.coupparfait;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.ImageDecoder;
import android.graphics.drawable.Animatable2;
import android.graphics.drawable.AnimatedImageDrawable;
import android.graphics.drawable.Drawable;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateInterpolator;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.HashSet;
import java.util.Set;

/**
 * L'ouverture de l'appli.
 *
 * L'écran de démarrage natif d'Android ne sait montrer qu'une image fixe (ou
 * un dessin vectoriel animé, que la Cavale photographiée n'est pas). Il cède
 * donc la place, dès la première image de l'activité, à une animation posée
 * par-dessus la WebView : `res/raw/ouverture.webp`, rendue depuis
 * `video/ouverture-appli` (voir mobile/README.md). Sa première image est
 * identique à l'écran natif, la Cavale au même endroit et à la même taille :
 * le passage de l'un à l'autre ne se voit pas. Elle tient sa dernière image
 * jusqu'à ce que le site soit peint, puis s'efface.
 *
 * L'animation a ses bruitages, ceux des parties : le « clac » d'un coup quand
 * la Cavale se pose, la victoire du mat sur « !! ». Ils se taisent quand le
 * téléphone est en silencieux ou en vibreur, et quand le joueur a coupé les
 * sons dans les préférences du site (recopiées par `AppliPlugin.reglerSons`).
 *
 * Avant Android 9, faute de lecteur d'images animées, l'écran natif reste
 * affiché jusqu'au site, puis la Cavale s'élève et s'efface, en silence.
 */
final class Ouverture {

    /**
     * Au-delà, l'ouverture s'efface même si le site n'a rien peint : sur un
     * réseau lent, mieux vaut le fond de l'appli qu'une Cavale figée.
     */
    private static final long PLAFOND_MS = 6000;

    /** Si l'écran natif ne s'est pas montré, l'animation part quand même. */
    private static final long DEPART_AU_PLUS_TARD_MS = 800;

    /*
     * Les instants des bruitages, depuis le début de l'animation
     * (video/ouverture-appli, une seconde en tout) : la Cavale finit de
     * s'élever à 0,47 s, « !! » claque à 0,7 s. On retranche le silence qui
     * ouvre chaque fichier (58 ms pour le coup, 45 ms pour la victoire), pour
     * que le son tombe sur l'image.
     */
    private static final long INSTANT_COUP_MS = 470 - 58;
    private static final long INSTANT_MAT_MS = 700 - 45;
    /** Les gains de `apps/web/src/lib/sound.ts` : certains fichiers sont plus forts. */
    private static final float GAIN_COUP = 0.85f;
    private static final float GAIN_MAT = 0.8f;
    /** Le réglage par défaut du site, tant que celui-ci ne l'a pas transmis. */
    private static final float VOLUME_PAR_DEFAUT = 0.55f;

    /** Le canevas de l'animation, en dp : 1080 × 1440 px rendus à 3×. */
    private static final int LARGEUR_DP = 360;
    private static final int HAUTEUR_DP = 480;

    private final BridgeActivity activite;
    private final Handler fil = new Handler(Looper.getMainLooper());

    private boolean siteAffiche = false;
    private boolean animationFinie = false;
    private boolean animationPartie = false;
    private FrameLayout voile;
    private AnimatedImageDrawable animation;

    private SoundPool sons;
    private float volume;
    private int sonCoup;
    private int sonMat;
    /** Les sons chargés et prêts : SoundPool les décode en tâche de fond. */
    private final Set<Integer> sonsPrets = new HashSet<>();

    private Ouverture(BridgeActivity activite) {
        this.activite = activite;
    }

    /** À appeler juste après `super.onCreate`, avec l'écran installé avant. */
    static void installer(BridgeActivity activite, SplashScreen ecran) {
        new Ouverture(activite).brancher(ecran);
    }

    private void brancher(SplashScreen ecran) {
        activite
            .getBridge()
            .addWebViewListener(
                new WebViewListener() {
                    @Override
                    public void onPageCommitVisible(WebView vue, String url) {
                        siteEstAffiche();
                    }

                    @Override
                    public void onPageLoaded(WebView vue) {
                        siteEstAffiche();
                    }
                }
            );
        fil.postDelayed(
            () -> {
                animationFinie = true;
                siteEstAffiche();
            },
            PLAFOND_MS
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && poserVoile()) {
            preparerSons();
            // L'écran natif s'efface aussitôt : la première image de
            // l'animation, déjà en place dessous, est la même.
            ecran.setOnExitAnimationListener(fin -> {
                fin.remove();
                lancerAnimation();
            });
            fil.postDelayed(this::lancerAnimation, DEPART_AU_PLUS_TARD_MS);
        } else {
            ecran.setKeepOnScreenCondition(() -> !siteAffiche);
            ecran.setOnExitAnimationListener(fin -> {
                View icone = fin.getIconView();
                icone
                    .animate()
                    .translationY(-icone.getHeight() * 0.06f)
                    .scaleX(1.06f)
                    .scaleY(1.06f)
                    .alpha(0f)
                    .setInterpolator(new AccelerateInterpolator())
                    .setDuration(300)
                    .start();
                fin.getView().animate().alpha(0f).setStartDelay(100).setDuration(300).withEndAction(fin::remove).start();
            });
        }
    }

    /** Le voile plein écran, couleur du fond, avec l'animation au centre. */
    private boolean poserVoile() {
        Drawable image;
        try {
            image = ImageDecoder.decodeDrawable(ImageDecoder.createSource(activite.getResources(), R.raw.ouverture));
        } catch (Exception e) {
            return false;
        }
        if (!(image instanceof AnimatedImageDrawable)) {
            return false;
        }
        animation = (AnimatedImageDrawable) image;
        animation.setRepeatCount(0);
        animation.registerAnimationCallback(
            new Animatable2.AnimationCallback() {
                @Override
                public void onAnimationEnd(Drawable drawable) {
                    animationFinie = true;
                    peutSEffacer();
                }
            }
        );

        ImageView vue = new ImageView(activite);
        vue.setImageDrawable(animation);
        vue.setScaleType(ImageView.ScaleType.FIT_CENTER);

        voile = new FrameLayout(activite);
        voile.setBackgroundColor(ContextCompat.getColor(activite, R.color.fond));
        // Le voile retient les touchers tant qu'il est là.
        voile.setClickable(true);
        voile.addView(vue, new FrameLayout.LayoutParams(dp(LARGEUR_DP), dp(HAUTEUR_DP), Gravity.CENTER));
        // Sur la vue racine de la fenêtre, comme l'écran natif : centrée sur
        // l'écran entier, barres système comprises.
        ((ViewGroup) activite.getWindow().getDecorView()).addView(
                voile,
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            );
        return true;
    }

    private void lancerAnimation() {
        if (animationPartie || animation == null) {
            return;
        }
        animationPartie = true;
        animation.start();
        if (sons != null) {
            fil.postDelayed(() -> jouer(sonCoup, GAIN_COUP), INSTANT_COUP_MS);
            fil.postDelayed(() -> jouer(sonMat, GAIN_MAT), INSTANT_MAT_MS);
        }
    }

    /**
     * Charge les bruitages, si le joueur et le téléphone veulent du son. Le
     * chargement prend quelques dizaines de millisecondes : il est fini bien
     * avant le premier son, à 0,4 s.
     */
    private void preparerSons() {
        SharedPreferences reglages = AppliPlugin.reglages(activite);
        boolean actifs = reglages.getBoolean(AppliPlugin.SONS_ACTIFS, true);
        volume = reglages.getFloat(AppliPlugin.SONS_VOLUME, VOLUME_PAR_DEFAUT);
        AudioManager audio = (AudioManager) activite.getSystemService(Context.AUDIO_SERVICE);
        boolean sonnerie = audio != null && audio.getRingerMode() == AudioManager.RINGER_MODE_NORMAL;
        if (!actifs || volume <= 0f || !sonnerie) {
            return;
        }
        sons = new SoundPool.Builder()
            .setMaxStreams(2)
            .setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .build();
        sons.setOnLoadCompleteListener((pool, id, statut) -> {
            if (statut == 0) {
                sonsPrets.add(id);
            }
        });
        sonCoup = sons.load(activite, R.raw.son_coup, 1);
        sonMat = sons.load(activite, R.raw.son_mat, 1);
    }

    /** Un son pas encore chargé est sauté plutôt que joué en retard, à contretemps. */
    private void jouer(int son, float gain) {
        if (sons == null || !sonsPrets.contains(son)) {
            return;
        }
        float niveau = volume * gain;
        sons.play(son, niveau, niveau, 1, 0, 1f);
    }

    /** Après la victoire (0,63 s), les sons ne servent plus. */
    private void libererSons() {
        if (sons != null) {
            sons.release();
            sons = null;
        }
    }

    private void siteEstAffiche() {
        siteAffiche = true;
        peutSEffacer();
    }

    private void peutSEffacer() {
        if (voile == null || !siteAffiche || !animationFinie) {
            return;
        }
        FrameLayout partant = voile;
        voile = null;
        partant
            .animate()
            .alpha(0f)
            .setDuration(300)
            .withEndAction(() -> {
                ((ViewGroup) partant.getParent()).removeView(partant);
                animation.stop();
            })
            .start();
        fil.postDelayed(this::libererSons, 1500);
    }

    private int dp(int valeur) {
        return Math.round(
            TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, valeur, activite.getResources().getDisplayMetrics())
        );
    }
}
