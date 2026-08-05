package com.nackl.forge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Receiver that starts the foreground mining service on:
 *   - Device boot (BOOT_COMPLETED)
 *   - App package update (MY_PACKAGE_REPLACED)
 *   - Watchdog alarm (com.nackl.forge.WATCHDOG) — re-asserts FGS every 15 min
 *
 * Mirrors MinerGo's BootReceiver pattern + adds ColorOS 16 watchdog defense.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "NacklForge";
    public static final String ACTION_WATCHDOG = "com.nackl.forge.WATCHDOG";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;

        boolean shouldStart = Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || ACTION_WATCHDOG.equals(action);

        if (!shouldStart) return;

        Log.i(TAG, "Receiver triggered: " + action);

        // Only auto-start service if user has previously logged in
        android.content.SharedPreferences prefs = context.getSharedPreferences("nacklforge", Context.MODE_PRIVATE);
        String account = prefs.getString("account", null);
        if (account == null || account.isEmpty()) {
            Log.i(TAG, "No saved account — skipping service start");
            return;
        }

        Intent serviceIntent = new Intent(context, MinerStatusService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(TAG, "MinerStatusService started from " + action);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service from " + action + ": " + e.getMessage());
        }
    }
}
