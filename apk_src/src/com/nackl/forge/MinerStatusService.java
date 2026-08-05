package com.nackl.forge;

import android.app.ActivityManager;
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
import androidx.core.app.ServiceCompat;
import android.content.pm.ServiceInfo;

/**
 * Foreground service that keeps mining alive in background.
 *
 * ColorOS 16 optimizations:
 *   - Runs in :mining process (declared in manifest) — UI crash doesn't kill FGS
 *   - Persistent low-importance notification (avoids "abnormal app" heuristic)
 *   - PARTIAL_WAKE_LOCK keeps CPU running during Doze
 *   - START_STICKY for system-initiated restart
 *   - Notification uses FOREGROUND_SERVICE_IMMEDIATE behavior
 *   - Detects frozen state and re-asserts notification
 */
public class MinerStatusService extends Service {
    private static final String TAG = "NacklForge";
    private static final String CHANNEL_ID = "mining_status";
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_NAME = "Mining Status";

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        Log.i(TAG, "MinerStatusService created in process: " + getApplicationInfo().processName);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Build notification with FOREGROUND_SERVICE_IMMEDIATE (avoids 5s delay on Android 14+)
        Notification notification = buildNotification("Mining active");
        int type = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            type = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        Log.i(TAG, "Foreground service started — mining protected from ColorOS battery killer");

        // Check if we're in frozen state (ColorOS background freeze)
        if (isProcessFrozen()) {
            Log.w(TAG, "Process detected as frozen — re-asserting notification");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // User swiped app from recents — restart service immediately
        Log.i(TAG, "Task removed — restarting service");
        Intent restartIntent = new Intent(this, MinerStatusService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent);
        } else {
            startService(restartIntent);
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        Log.i(TAG, "Foreground service destroyed");
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW  // Low importance avoids "abnormal app" trigger
            );
            channel.setDescription("Persistent notification to keep mining alive in background");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(false);
            channel.enableLights(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String text) {
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NacklForge")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
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

    /**
     * Detect if our process is frozen by ColorOS Background Freeze feature.
     * Uses reflection on ActivityManager.RunningAppProcessInfo.flags (hidden API).
     */
    @SuppressWarnings("deprecation")
    private boolean isProcessFrozen() {
        try {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) return false;
            java.util.List<ActivityManager.RunningAppProcessInfo> procs = am.getRunningAppProcesses();
            if (procs == null) return false;
            String myProc = getApplicationInfo().processName;
            for (ActivityManager.RunningAppProcessInfo info : procs) {
                if (info.processName.equals(myProc)) {
                    // Reflection: check FLAG_FROZEN (0x00000040) on flags field
                    try {
                        java.lang.reflect.Field f = ActivityManager.RunningAppProcessInfo.class
                            .getDeclaredField("flags");
                        int flags = f.getInt(info);
                        return (flags & 0x00000040) != 0;
                    } catch (Exception ignored) {
                        // Fallback: cached importance
                        return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_CACHED;
                    }
                }
            }
        } catch (Exception e) {
            Log.d(TAG, "Frozen state check failed: " + e.getMessage());
        }
        return false;
    }
}
