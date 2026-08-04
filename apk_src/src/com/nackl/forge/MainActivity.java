package com.nackl.forge;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.View;
import android.view.WindowManager;
import android.graphics.Color;

public class MainActivity extends Activity {
    private static final String TAG = "NacklForge";
    private WebView webView;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge dark theme
        getWindow().setStatusBarColor(Color.parseColor("#0d0b1a"));
        getWindow().setNavigationBarColor(Color.parseColor("#0d0b1a"));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        prefs = getSharedPreferences("nacklforge", Context.MODE_PRIVATE);

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
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        // Critical: allow file:// WASM imports + fetch
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        // Enable hardware acceleration for WASM
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "WebView error " + errorCode + ": " + description + " (url=" + failingUrl + ")");
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0d0b1a"));

        // JS bridge for persistence + logging
        webView.addJavascriptInterface(new ForgeBridge(this, prefs), "AndroidBridge");

        // Load local asset
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
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

    /**
     * Bridge exposed to JS as window.AndroidBridge.
     * Methods must be annotated @JavascriptInterface on Android 4.2+.
     */
    public static class ForgeBridge {
        private final Context ctx;
        private final SharedPreferences prefs;

        ForgeBridge(Context ctx, SharedPreferences prefs) {
            this.ctx = ctx;
            this.prefs = prefs;
        }

        @android.webkit.JavascriptInterface
        public void onLog(String type, String msg) {
            Log.i(TAG, "[" + type + "] " + msg);
        }

        @android.webkit.JavascriptInterface
        public void saveAccount(String json) {
            try {
                prefs.edit().putString("account", json).apply();
                Log.i(TAG, "Account saved");
            } catch (Exception e) {
                Log.e(TAG, "saveAccount failed: " + e.getMessage());
            }
        }

        @android.webkit.JavascriptInterface
        public String loadAccount() {
            try {
                return prefs.getString("account", null);
            } catch (Exception e) {
                return null;
            }
        }

        @android.webkit.JavascriptInterface
        public String getAppVersion() {
            return "1.0.0";
        }
    }
}
