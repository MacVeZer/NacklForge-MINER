package com.nackl.forge;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.View;

/**
 * NacklForge — minimal WebView host for the on-chain Nackl miner.
 *
 * The entire UI + mining logic lives in assets/index.html (loaded as a
 * file:// URL). This Activity only:
 *   1. Configures the WebView for WASM + DOM storage + file access.
 *   2. Exposes a tiny JS bridge for account persistence (SharedPreferences).
 *
 * Launch is fast: no layout XML, no fragments, no background work.
 */
public class MainActivity extends Activity {
    private static final String TAG = "NacklForge";
    private static final String PREFS = "nacklforge";
    private static final String KEY_ACCOUNT = "account";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark theme — set before WebView creation to avoid white flash
        getWindow().setStatusBarColor(Color.parseColor("#0a0a0f"));
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a0f"));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        // Create and configure WebView in code — no layout XML inflation overhead
        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE); // faster: skip cache check
        s.setAllowFileAccessFromFileURLs(true);    // required for WASM import
        s.setAllowUniversalAccessFromFileURLs(true); // required for fetch from file://

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0a0a0f"));
        webView.addJavascriptInterface(new Bridge(prefs), "AndroidBridge");

        // Load immediately — no post-delay, no splash
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /** JS bridge: window.AndroidBridge */
    public static class Bridge {
        private final SharedPreferences prefs;
        Bridge(SharedPreferences p) { this.prefs = p; }

        @JavascriptInterface
        public void onLog(String type, String msg) {
            Log.i(TAG, "[" + type + "] " + msg);
        }

        @JavascriptInterface
        public void saveAccount(String json) {
            prefs.edit().putString(KEY_ACCOUNT, json).apply();
        }

        @JavascriptInterface
        public String loadAccount() {
            return prefs.getString(KEY_ACCOUNT, null);
        }

        @JavascriptInterface
        public void clearAccount() {
            prefs.edit().remove(KEY_ACCOUNT).apply();
        }

        @JavascriptInterface
        public String getAppVersion() { return "1.0.0"; }
    }
}
