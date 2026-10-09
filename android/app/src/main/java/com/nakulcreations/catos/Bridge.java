package com.nakulcreations.catos;

import android.os.Bundle;
import android.webkit.JavascriptInterface;

import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

/**
 * window.CatOSAndroid, as the page sees it (src/core/native.js). Called on
 * the WebView's bridge thread, so anything that touches the UI hops back.
 * Calls with an `id` answer later through MainActivity.reply.
 */
final class Bridge {
    private final MainActivity a;

    Bridge(MainActivity a) { this.a = a; }

    @JavascriptInterface public boolean isOnline() { return a.online(); }
    @JavascriptInterface public boolean isPro() { return a.billing.isPro(); }
    @JavascriptInterface public String proPlan() { return a.billing.plan(); }
    @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }

    @JavascriptInterface public void showRewarded(String id, String placement) {
        a.runOnUiThread(() -> a.ads.show(json -> a.reply(id, json)));
    }
    @JavascriptInterface public void products(String id) {
        a.runOnUiThread(() -> a.billing.products(json -> a.reply(id, json)));
    }
    @JavascriptInterface public void buy(String id, String product) {
        a.runOnUiThread(() -> a.billing.buy(product, json -> a.reply(id, json)));
    }
    @JavascriptInterface public void restore(String id) {
        a.runOnUiThread(() -> a.billing.refresh(pro -> a.reply(id, "{\"pro\":" + pro + "}")));
    }
    @JavascriptInterface public void share(String text) { a.runOnUiThread(() -> a.share(text)); }
    @JavascriptInterface public void openExternal(String url) { a.runOnUiThread(() -> a.openExternal(url)); }
    @JavascriptInterface public void saveFile(String id, String name, String text) {
        a.runOnUiThread(() -> a.saveFile(id, name, text));
    }

    // EEA/UK consent: the way back to Google's form (Ads.java).
    @JavascriptInterface public boolean privacyOptionsRequired() { return a.ads.privacyRequired(); }
    @JavascriptInterface public void showPrivacyOptions() { a.runOnUiThread(() -> a.ads.privacyOptions()); }

    // Sign in with Google and the cloud save (Cloud.java).
    @JavascriptInterface public String account() { return a.cloud.account(); }
    @JavascriptInterface public void signIn(String id) { a.runOnUiThread(() -> a.cloud.signIn(json -> a.reply(id, json))); }
    @JavascriptInterface public void signOut(String id) { a.runOnUiThread(() -> a.cloud.signOut(json -> a.reply(id, json))); }
    @JavascriptInterface public void cloudSave(String id, String backup) { a.runOnUiThread(() -> a.cloud.save(backup, json -> a.reply(id, json))); }
    @JavascriptInterface public void cloudLoad(String id) { a.runOnUiThread(() -> a.cloud.load(json -> a.reply(id, json))); }
    @JavascriptInterface public void deleteAccount(String id) { a.runOnUiThread(() -> a.cloud.delete(json -> a.reply(id, json))); }

    /** A page event into Google Analytics (Firebase): whole numbers stay numbers, the rest become strings. */
    @JavascriptInterface public void logEvent(String name, String params) {
        Bundle b = new Bundle();
        try {
            JSONObject o = new JSONObject(params);
            for (Iterator<String> k = o.keys(); k.hasNext(); ) {
                String key = k.next();
                Object v = o.get(key);
                if (v instanceof Integer || v instanceof Long) b.putLong(key, ((Number) v).longValue());
                else if (v instanceof Number) b.putDouble(key, ((Number) v).doubleValue());
                else b.putString(key, String.valueOf(v));
            }
        } catch (JSONException ignored) { }
        FirebaseAnalytics.getInstance(a).logEvent(name, b);
    }
}
