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
 * NacklForge — main activity.
 *
 * Improvements vs previous version:
 *   - No auto-open of system settings at launch (#2 — was annoying users)
 *   - Notification permission requested only once, then never again
 *   - Battery optimization requested only if not already granted
 *   - ColorOS Startup Manager: user opens manually via in-app button (not forced)
 *   - WebView: hardware layer, offscreenPreRaster=false, debugging disabled in release (#33)
 *   - Process isolation: FGS in :mining process (#31)
 *   - Watchdog: AlarmManager every 15 min
 *   - onMiningState callback: FGS notification updates with heartbeat (#27)
 */
public class MainActivity extends Activity {
    private static final String TAG = "NacklForge";
    private static final String PREFS = "nacklforge";
    private static final String KEY_ACCOUNT = "account";
    private static final String KEY_NOTIF_ASKED = "notif_asked";
    private static final String KEY_BATTERY_ASKED = "battery_asked";
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
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        // Create WebView directly (no layout XML — minimal overhead)
        webView = new WebView(this);
        setContentView(webView);

        configureWebViewOptimized();

        webView.setWebViewClient(new MiningWebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0a0a0f"));
        webView.addJavascriptInterface(new Bridge(prefs, this), "AndroidBridge");

        // Force hardware layer for Adreno 825 GPU compositor (API > 26)
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }

        // Disable WebView debugging in release builds (#33)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        // Load immediately
        webView.loadUrl("file:///android_asset/index.html");

        // Permissions — request once, then never again (no more auto-open settings!)
        requestEssentialPermissions();
        startWatchdog();
    }

    private void configureWebViewOptimized() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            s.setOffscreenPreRaster(false);
        }
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Try enabling WebGPU (#35) — Adreno 825 supports it
        try {
            java.lang.reflect.Method m = WebSettings.class.getMethod(
                "setForceEnableWebContentsGPU", boolean.class);
            m.invoke(s, true);
        } catch (Exception ignored) {}
    }

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

    /**
     * Request only essential permissions — NO auto-open of system settings.
     * Battery optimization requested once (sets KEY_BATTERY_ASKED flag).
     * ColorOS Startup Manager: user opens manually via in-app button.
     */
    private void requestEssentialPermissions() {
        // 1. Notification permission (Android 13+) — ask once
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && !prefs.getBoolean(KEY_NOTIF_ASKED, false)) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    REQ_NOTIFICATIONS);
                Log.i(TAG, "Requesting POST_NOTIFICATIONS permission");
            }
            prefs.edit().putBoolean(KEY_NOTIF_ASKED, true).apply();
        }

        // 2. Battery optimization exemption — ask once
        if (!prefs.getBoolean(KEY_BATTERY_ASKED, false)) {
            requestBatteryOptimizationExemption();
            prefs.edit().putBoolean(KEY_BATTERY_ASKED, true).apply();
        }

        // 3. Start foreground service
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
                    Log.e(TAG, "Battery opt request failed: " + e.getMessage());
                }
            }
        }
    }

    /** Start foreground service in :mining process (#31 process isolation). */
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
            } catch (Exception e) {
                Log.e(TAG, "Watchdog schedule failed: " + e.getMessage());
            }
        }
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

    /**
     * Open ColorOS Startup Manager — only when user explicitly requests it
     * via the in-app "Optimize for ColorOS" button. No auto-open at launch.
     */
    public void openOppoStartupManager() {
        ComponentName[] targets = {
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.startupapp.StartupAppListActivity"),
            new ComponentName("com.coloros.safecenter",
                "com.coloros.safecenter.MainActivity"),
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
                return;
            } catch (Exception ignored) {}
        }
        // Fallback: app details
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "App details open failed: " + e.getMessage());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.i(TAG, "POST_NOTIFICATIONS " + (granted ? "granted" : "denied"));
            if (granted) startMiningService();
        }
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
        startMiningService();
    }

    @Override
    protected void onDestroy() {
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
        private final MainActivity activity;

        Bridge(SharedPreferences p, MainActivity a) {
            this.prefs = p;
            this.activity = a;
        }

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
        public String getAppVersion() { return "1.3.0"; }

        @JavascriptInterface
        public void onMiningState(String state, String detail) {
            // Heartbeat: update FGS notification with current mining state (#27)
            Log.i(TAG, "Mining state: " + state + " — " + detail);
            Intent intent = new Intent(activity, MinerStatusService.class);
            intent.putExtra("state", state);
            intent.putExtra("detail", detail);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    activity.startForegroundService(intent);
                } else {
                    activity.startService(intent);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openColorOSSettings() {
            // User explicitly requested — open Startup Manager
            activity.openOppoStartupManager();
        }

        @JavascriptInterface
        public void sendFeedback(String body) {
            // #50 — feedback collection
            Log.i(TAG, "User feedback:\n" + body);
            // In production: send to Crashlytics custom key or backend
        }
    }
}
