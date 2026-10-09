package com.nakulcreations.catos;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/**
 * The app's only ad: a rewarded video the learner asks for by tapping
 * "Watch a short video" on a locked explanation. One is kept loaded so it
 * starts at once. Answers {"rewarded":true}, or a reason: "closed" (they
 * left early, the explanation stays shut) or "unavailable" (no video could
 * be had; the page opens the explanation anyway).
 *
 * In the EEA, the UK and Switzerland Google's consent form (UMP, the message
 * set up in AdMob, Privacy and messaging) comes first and nothing loads
 * until it is answered; everywhere else it answers at once and asks nothing.
 * The same answer reaches Google Analytics through consent mode.
 */
final class Ads {
    private static final long WAIT_MS = 8000;
    private final Activity act;
    private final BooleanSupplier pro;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<Runnable> waiting = new ArrayList<>();
    private final ConsentInformation consent;
    private RewardedAd ad;
    private boolean loading, ready, started;

    Ads(Activity act, BooleanSupplier pro) {
        this.act = act;
        this.pro = pro;
        consent = UserMessagingPlatform.getConsentInformation(act);
        consent.requestConsentInfoUpdate(act, new ConsentRequestParameters.Builder().build(),
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(act, e -> start()),
                e -> start());
        start();   // an answer given on an earlier day already counts
    }

    private void start() {
        if (started || !consent.canRequestAds()) return;
        started = true;
        new Thread(() -> MobileAds.initialize(act, status -> main.post(() -> { ready = true; if (!pro.getAsBoolean()) load(); }))).start();
    }

    /** Settings shows "Privacy choices" only where the law asks for a way back in. */
    boolean privacyRequired() {
        return consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    void privacyOptions() { UserMessagingPlatform.showPrivacyOptionsForm(act, e -> start()); }

    private void load() {
        if (!ready || ad != null || loading) return;
        loading = true;
        RewardedAd.load(act, BuildConfig.REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull RewardedAd a) { ad = a; loading = false; flush(); }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { loading = false; flush(); }
        });
    }

    private void flush() {
        List<Runnable> now = new ArrayList<>(waiting);
        waiting.clear();
        for (Runnable r : now) r.run();
    }

    void show(Consumer<String> done) {
        if (ad != null) { present(done); return; }
        boolean[] answered = {false};
        Runnable attempt = () -> {
            if (answered[0]) return;
            answered[0] = true;
            if (ad != null) present(done); else done.accept("{\"rewarded\":false,\"reason\":\"unavailable\"}");
        };
        waiting.add(attempt);
        main.postDelayed(attempt, WAIT_MS);
        if (!ready) return;   // initialisation finishes, loads, and flushes
        load();
    }

    private void present(Consumer<String> done) {
        RewardedAd a = ad;
        ad = null;
        boolean[] earned = {false};
        a.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() {
                done.accept(earned[0] ? "{\"rewarded\":true}" : "{\"rewarded\":false,\"reason\":\"closed\"}");
                load();
            }
            @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) {
                done.accept("{\"rewarded\":false,\"reason\":\"unavailable\"}");
                load();
            }
        });
        a.show(act, item -> earned[0] = true);
    }
}
