package com.nakulcreations.catos;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.SystemBarStyle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * The whole Android app: one WebView showing the web app from inside the
 * APK (build.gradle copyWeb), plus the few things a page cannot do itself,
 * offered to it as window.CatOSAndroid (Bridge): a rewarded video (Ads),
 * Pro through Google Play (Billing), the share sheet, Save as, and whether
 * the phone is online.
 */
public class MainActivity extends ComponentActivity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/www/index.html#/world";

    WebView web;
    Ads ads;
    Billing billing;
    private ConnectivityManager net;
    private ValueCallback<Uri[]> picked;
    private String saveId, saveText;
    private ActivityResultLauncher<String> openFile, saveFile;

    @Override
    protected void onCreate(Bundle state) {
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
        super.onCreate(state);

        // The page sits inside the system bars; the bars show the icon's green.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.brand));
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.paper));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });

        openFile = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (picked != null) picked.onReceiveValue(uri == null ? null : new Uri[]{uri});
            picked = null;
        });
        saveFile = registerForActivityResult(new ActivityResultContracts.CreateDocument("application/json"), uri -> {
            boolean ok = false;
            if (uri != null) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    out.write(saveText.getBytes(StandardCharsets.UTF_8));
                    ok = true;
                } catch (Exception ignored) { }
            }
            reply(saveId, ok ? "{\"ok\":true}" : "{\"ok\":false,\"reason\":\"" + (uri == null ? "cancelled" : "error") + "\"}");
            saveText = null;
        });

        billing = new Billing(this);
        ads = new Ads(this, billing::isPro);
        net = getSystemService(ConnectivityManager.class);
        net.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
            @Override public void onCapabilitiesChanged(Network n, NetworkCapabilities c) { pushNet(); }
            @Override public void onLost(Network n) { pushNet(); }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return assets.shouldInterceptRequest(r.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (HOST.equals(r.getUrl().getHost())) return false;
                openExternal(r.getUrl().toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (picked != null) picked.onReceiveValue(null);
                picked = cb;
                try { openFile.launch("*/*"); } catch (ActivityNotFoundException e) { picked = null; return false; }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(this), "CatOSAndroid");
        if (state == null) web.loadUrl(START); else web.restoreState(state);

        // Back walks the app's own history; from the village it leaves.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                String url = web.getUrl();
                if (web.canGoBack() && url != null && !url.endsWith("#/world")) web.goBack();
                else moveTaskToBack(true);
            }
        });
    }

    boolean online() {
        Network n = net.getActiveNetwork();
        NetworkCapabilities c = n == null ? null : net.getNetworkCapabilities(n);
        return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void pushNet() {
        runOnUiThread(() -> {
            boolean on = online();
            web.setNetworkAvailable(on);
            event("{\"type\":\"net\",\"online\":" + on + "}");
        });
    }

    /** Answer a call the page made with an id (core/native.js ask). */
    void reply(String id, String json) {
        runOnUiThread(() -> web.evaluateJavascript("window.__catosNative&&window.__catosNative(" + JSONObject.quote(id) + "," + JSONObject.quote(json) + ")", null));
    }

    /** Tell the page something it did not ask (Pro changed, the network moved). */
    void event(String json) {
        runOnUiThread(() -> web.evaluateJavascript("window.__catosEvent&&window.__catosEvent(" + JSONObject.quote(json) + ")", null));
    }

    void share(String text) {
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
        startActivity(Intent.createChooser(send, "Share CAT OS"));
    }

    void openExternal(String url) {
        if (!url.startsWith("https://") && !url.startsWith("http://") && !url.startsWith("mailto:")) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (ActivityNotFoundException ignored) { }
    }

    void saveFile(String id, String name, String text) {
        if (saveText != null) { reply(id, "{\"ok\":false,\"reason\":\"busy\"}"); return; }
        saveId = id;
        saveText = text;
        try { saveFile.launch(name); } catch (ActivityNotFoundException e) { saveText = null; reply(id, "{\"ok\":false,\"reason\":\"error\"}"); }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override protected void onPause() { web.onPause(); super.onPause(); }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        pushNet();
        billing.refresh(pro -> { });
    }

    @Override
    protected void onDestroy() {
        billing.end();
        web.destroy();
        super.onDestroy();
    }
}
