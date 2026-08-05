package com.nackl.forge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the mining WebView alive in the background.
 * Mirrors the pattern from the original MinerGo app — a persistent notification
 * with type=specialUse and subtype=user_visible_local_mining.
 *
 * On Color OS 16 (Oppo/Realme) this is the only reliable way to prevent the
 * system from killing the mining process when the user switches apps.
 */
public class MinerStatusService extends Service {
    private static final String TAG = "NacklForge";
    private static final String CHANNEL_ID = "mining_status";
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_NAME = "Mining Status";
    private static final String CHANNEL_DESC = "Persistent notification to keep mining alive in background";

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification("Mining active");
        startForeground(NOTIFICATION_ID, notification);
        Log.i(TAG, "Foreground service started — mining protected from battery optimization");
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
        Log.i(TAG, "Foreground service destroyed");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(CHANNEL_DESC);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NacklForge")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NacklForge::MiningWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
                Log.i(TAG, "Wake lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Wake lock acquire failed: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
            Log.i(TAG, "Wake lock released");
        }
    }
}
