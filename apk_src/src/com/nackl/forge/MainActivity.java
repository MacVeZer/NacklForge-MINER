package com.nackl.forge;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.View;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * NacklForge — main activity.
 *
 * On launch, requests:
 *   1. Notification permission (Android 13+) — required for foreground service.
 *   2. Battery optimization exemption — required on Color OS 16 / MIUI / etc.
 *   3. Starts MinerStatusService as a foreground service to keep mining alive.
 *
 * Then loads the WebView UI from assets/index.html.
 */
public class MainActivity extends Activity {
    private static final String TAG = "NacklForge";
    private static final String PREFS = "nacklforge";
    private static final String KEY_ACCOUNT = "account";
    private static final int REQ_NOTIFICATIONS = 1001;
    private static final int REQ_BATTERY = 1002;

    private WebView webView;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark theme — set BEFORE WebView creation to avoid white flash
        getWindow().setStatusBarColor(Color.parseColor("#0a0a0f"));
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a0f"));
        // Layout behind system bars so CSS env(safe-area-inset-*) takes effect
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        // Create WebView directly (no layout XML — minimal overhead)
        webView = new WebView(this);
        setContentView(webView);

        configureWebView();
        loadUI();

        // Request runtime permissions and start foreground service
        requestPermissionsAndStartService();
    }

    private void configureWebView() {
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
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);

        // Make sure status bar area is respected — apply top padding for safe area
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, int code, String desc, String url) {
                Log.e(TAG, "WebView error " + code + ": " + desc);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0a0a0f"));
        webView.addJavascriptInterface(new Bridge(prefs), "AndroidBridge");
    }

    private void loadUI() {
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void requestPermissionsAndStartService() {
        // 1. Notification permission (Android 13+ / API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    REQ_NOTIFICATIONS);
                Log.i(TAG, "Requesting POST_NOTIFICATIONS permission");
            }
        }

        // 2. Battery optimization exemption — critical on Color OS 16, MIUI, EMUI
        requestBatteryOptimizationExemption();

        // 3. Start foreground service to keep mining alive
        startMiningService();
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            String pkg = getPackageName();
            if (pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                try {
                    Intent intent = new Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + pkg)
                    );
                    startActivityForResult(intent, REQ_BATTERY);
                    Log.i(TAG, "Requesting battery optimization exemption");
                } catch (Exception e) {
                    Log.e(TAG, "Battery optimization request failed: " + e.getMessage());
                    // Fallback: open app settings
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + pkg));
                        startActivity(intent);
                    } catch (Exception e2) {
                        Log.e(TAG, "Fallback settings open failed: " + e2.getMessage());
                    }
                }
            } else {
                Log.i(TAG, "Already exempt from battery optimization");
            }
        }
    }

    private void startMiningService() {
        Intent serviceIntent = new Intent(this, MinerStatusService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.i(TAG, "MinerStatusService started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start MinerStatusService: " + e.getMessage());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.i(TAG, "POST_NOTIFICATIONS " + (granted ? "granted" : "denied"));
            if (granted) {
                // Service may not have shown notification before permission — restart it
                startMiningService();
            }
        }
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
        // Keep service running — don't stop it on activity destroy.
        // The foreground service will keep mining alive in background.
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
        public String getAppVersion() { return "1.1.0"; }
    }
}
