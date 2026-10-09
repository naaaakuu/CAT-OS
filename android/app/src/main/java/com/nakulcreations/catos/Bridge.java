package com.nakulcreations.catos;

import android.webkit.JavascriptInterface;

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
}
