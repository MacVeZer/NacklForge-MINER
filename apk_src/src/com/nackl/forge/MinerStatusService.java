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
 * Foreground service with heartbeat notification updates.
 */
public class MinerStatusService extends Service {
    private static final String TAG = "NacklForge";
    private static final String CHANNEL_ID = "mining_status";
    private static final int NOTIFICATION_ID = 1;

    private PowerManager.WakeLock wakeLock;
    private String currentState = "idle";
    private String currentDetail = "Mining active";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        Log.i(TAG, "MinerStatusService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Update state from intent (heartbeat from JS)
        if (intent != null) {
            String state = intent.getStringExtra("state");
            String detail = intent.getStringExtra("detail");
            if (state != null) currentState = state;
            if (detail != null) currentDetail = detail;
        }

        Notification notification = buildNotification(currentDetail);
        int type = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            type = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
        }
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        } catch (Exception e) {
            Log.e(TAG, "startForeground failed: " + e.getMessage());
        }

        if (isProcessFrozen()) {
            Log.w(TAG, "Process frozen — re-asserting notification");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
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
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Mining Status", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Persistent notification to keep mining alive");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(false);
            channel.enableLights(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NacklForge")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NacklForge::MiningWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
            }
        } catch (Exception e) {
            Log.e(TAG, "Wake lock failed: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

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
                    try {
                        java.lang.reflect.Field f = ActivityManager.RunningAppProcessInfo.class
                            .getDeclaredField("flags");
                        int flags = f.getInt(info);
                        return (flags & 0x00000040) != 0;
                    } catch (Exception ignored) {
                        return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_CACHED;
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }
}
