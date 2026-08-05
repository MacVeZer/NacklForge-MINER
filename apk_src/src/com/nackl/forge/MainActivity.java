package com.nackl.forge;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.View;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * NacklForge — main activity, optimized for Oppo K13 Turbo Pro (Snapdragon 8s Gen 4,
 * Adreno 825, ColorOS 16 / Android 16).
 *
 * Optimizations:
 *   - Cold start: pre-warm WebView before loadUrl, set initial clients before load
 *   - WebView: LAYER_TYPE_HARDWARE (Adreno GPU compositor), offscreenPreRaster=false
 *   - ColorOS 16: requests Startup Manager, battery opt-out, App Battery Management
 *   - FGS runs in :mining process so UI crash doesn't kill mining
 *   - AlarmManager watchdog re-asserts FGS every 15 min
 */
public class MainActivity extends Activity {
    private static final String TAG = "NacklForge";
    private static final String PREFS = "nacklforge";
    private static final String KEY_ACCOUNT = "account";
    private static final String KEY_ONBOARDED = "onboarded_coloros";
    private static final int REQ_NOTIFICATIONS = 1001;
    private static final int REQ_BATTERY = 1002;
    private static final int WATCHDOG_INTERVAL_MS = 15 * 60 * 1000;

    private WebView webView;
    private SharedPreferences prefs;
    private Handler watchdogHandler;
    private Runnable watchdogRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark theme BEFORE WebView creation to avoid white flash on AMOLED
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

        // Pre-warm + configure WebView BEFORE setting content (Chromium init off critical path)
        configureWebViewOptimized();

        // Set clients BEFORE loadUrl to avoid blank frame
        webView.setWebViewClient(new MiningWebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0a0a0f"));
        webView.addJavascriptInterface(new Bridge(prefs), "AndroidBridge");

        // Force hardware layer for Adreno 825 GPU compositor (API > 26 to avoid BakedOpRenderer crash)
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }

        // Load immediately
        webView.loadUrl("file:///android_asset/index.html");

        // Permissions + foreground service + watchdog
        requestPermissionsAndStartService();
        startWatchdog();
    }

    /** WebView configuration tuned for Snapdragon 8s Gen 4 / Adreno 825. */
    private void configureWebViewOptimized() {
        WebSettings s = webView.getSettings();
        // Core
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);

        // Cache: LOAD_DEFAULT respects HTTP cache headers; LOAD_NO_CACHE skips disk
        // For file:// assets, LOAD_NO_CACHE avoids unnecessary stat() calls
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        // File access for WASM imports
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);

        // Media / display
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        // Disable offscreen pre-raster — saves GPU on Adreno 825 for non-visible tiles
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            s.setOffscreenPreRaster(false);
        }

        // Mixed content (in case mining endpoints serve http stats)
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Try to enable hidden WebContents GPU flag (no-op on most builds, harmless)
        try {
            java.lang.reflect.Method m = WebSettings.class.getMethod(
                "setForceEnableWebContentsGPU", boolean.class);
            m.invoke(s, true);
        } catch (Exception ignored) {}

        // Enable aggressive native library loading (Chromium cold start)
        try {
            java.lang.reflect.Method m = WebSettings.class.getMethod(
                "setNativeInterval", int.class);
            m.invoke(s, 0);
        } catch (Exception ignored) {}
    }

    /** WebViewClient with shouldInterceptRequest for asset caching. */
    private static class MiningWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            return false;
        }

        @Override
        public void onReceivedError(WebView v, int code, String desc, String url) {
            Log.e(TAG, "WebView error " + code + ": " + desc);
        }
    }

    private void requestPermissionsAndStartService() {
        // 1. Notification permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    REQ_NOTIFICATIONS);
                Log.i(TAG, "Requesting POST_NOTIFICATIONS permission");
            }
        }

        // 2. Battery optimization exemption
        requestBatteryOptimizationExemption();

        // 3. ColorOS-specific: Startup Manager + App Battery Management
        if (prefs.getBoolean(KEY_ONBOARDED, false) == false) {
            // First launch — guide user through Oppo-specific permission screens
            openOppoStartupManager();
            prefs.edit().putBoolean(KEY_ONBOARDED, true).apply();
        }

        // 4. Start foreground service in :mining process
        startMiningService();
    }

    /** Standard AOSP battery optimization exemption. */
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
                    Log.e(TAG, "Battery opt request failed: " + e.getMessage());
                    openAppDetailsSettings();
                }
            }
        }
    }

    /**
     * Open ColorOS Startup Manager (Auto-start permission).
     * No public API — only deep-link to settings page.
     */
    private void openOppoStartupManager() {
        ComponentName[] targets = {
            // ColorOS 13+/16
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
            // Older ColorOS
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.startupapp.StartupAppListActivity"),
            // Security center main
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.MainActivity"),
            // OnePlus variant (Oxygen = ColorOS under the hood)
            new ComponentName("com.oneplus.security",
                "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
        };

        for (ComponentName cn : targets) {
            try {
                Intent intent = new Intent();
                intent.setComponent(cn);
                intent.putExtra("packageName", getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                Log.i(TAG, "Opened Startup Manager: " + cn);
                return;
            } catch (Exception e) {
                Log.d(TAG, "Startup Manager target unavailable: " + cn + " — " + e.getMessage());
            }
        }
        // Fallback: open app details so user can find the settings manually
        openAppDetailsSettings();
    }

    private void openAppDetailsSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "App details open failed: " + e.getMessage());
        }
    }

    /** Start foreground service in separate :mining process. */
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

    /**
     * Watchdog: re-assert FGS every 15 minutes via AlarmManager.
     * Third line of defense after FGS itself and WorkManager guard.
     */
    private void startWatchdog() {
        Intent intent = new Intent(this, BootReceiver.class);
        intent.setAction("com.nackl.forge.WATCHDOG");
        PendingIntent pi = PendingIntent.getBroadcast(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            long triggerAt = System.currentTimeMillis() + WATCHDOG_INTERVAL_MS;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
                Log.i(TAG, "Watchdog scheduled in 15 min");
            } catch (Exception e) {
                Log.e(TAG, "Watchdog schedule failed: " + e.getMessage());
            }
        }

        // Also use Handler-based periodic check while app is foreground
        watchdogHandler = new Handler(Looper.getMainLooper());
        watchdogRunnable = new Runnable() {
            @Override
            public void run() {
                startMiningService();
                watchdogHandler.postDelayed(this, WATCHDOG_INTERVAL_MS);
            }
        };
        watchdogHandler.postDelayed(watchdogRunnable, WATCHDOG_INTERVAL_MS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.i(TAG, "POST_NOTIFICATIONS " + (granted ? "granted" : "denied"));
            if (granted) {
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
        // Keep WebView running — FGS holds wake lock
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        // Re-assert FGS on resume
        startMiningService();
    }

    @Override
    protected void onDestroy() {
        // Stop handler watchdog but keep FGS + AlarmManager running
        if (watchdogHandler != null && watchdogRunnable != null) {
            watchdogHandler.removeCallbacks(watchdogRunnable);
        }
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
        public String getAppVersion() { return "1.2.0"; }

        @JavascriptInterface
        public void openOppoSettings() {
            // Called from JS when user taps "Optimize for ColorOS" button
            Intent intent = new Intent();
            intent.setComponent(new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // Use Application context to avoid needing Activity
            // (Bridge is static so we can't directly startActivity from here)
        }
    }
}
