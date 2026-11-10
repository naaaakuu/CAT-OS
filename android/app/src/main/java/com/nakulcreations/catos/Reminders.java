package com.nakulcreations.catos;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Notifications without a server. The page works out what to say and when
 * (src/duel/reminders.js) and hands over the whole plan; this keeps it, sets
 * one inexact alarm per notification, and shows each as it comes due. A new
 * plan replaces the old one, so nothing stale is ever shown, and a phone
 * restart sets the alarms again. Nothing leaves the device.
 */
final class Reminders {
    static final String EXTRA_ROUTE = "route";
    private static final String EXTRA_ID = "id", EXTRA_TITLE = "title", EXTRA_TEXT = "text";
    private static final String PREFS = "reminders", PLAN = "plan", CHANNEL = "post";

    private Reminders() { }

    static boolean allowed(Context c) { return NotificationManagerCompat.from(c).areNotificationsEnabled(); }

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static JSONArray stored(Context c) {
        try { return new JSONArray(prefs(c).getString(PLAN, "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    static void schedule(Context c, String plan) {
        cancelAlarms(c);
        prefs(c).edit().putString(PLAN, plan).apply();
        arm(c);
    }

    static void clear(Context c) {
        cancelAlarms(c);
        prefs(c).edit().remove(PLAN).apply();
    }

    private static PendingIntent alarm(Context c, int id, Intent i, int flag) {
        return PendingIntent.getBroadcast(c, id, i, PendingIntent.FLAG_IMMUTABLE | flag);
    }

    private static void cancelAlarms(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        JSONArray old = stored(c);
        for (int i = 0; i < old.length(); i += 1) {
            int id = old.optJSONObject(i) == null ? 0 : old.optJSONObject(i).optInt("id");
            PendingIntent p = alarm(c, id, new Intent(c, ReminderReceiver.class), PendingIntent.FLAG_NO_CREATE);
            if (p != null) { am.cancel(p); p.cancel(); }
        }
    }

    /** Inexact on purpose: Android may hold a letter for up to an hour, which costs nothing and needs no special permission. */
    static void arm(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        JSONArray plan = stored(c);
        long now = System.currentTimeMillis();
        for (int i = 0; i < plan.length(); i += 1) {
            JSONObject n = plan.optJSONObject(i);
            if (n == null || n.optLong("at") <= now) continue;
            Intent fire = new Intent(c, ReminderReceiver.class)
                    .putExtra(EXTRA_ID, n.optInt("id"))
                    .putExtra(EXTRA_TITLE, n.optString("title"))
                    .putExtra(EXTRA_TEXT, n.optString("text"))
                    .putExtra(EXTRA_ROUTE, n.optString("route"));
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, n.optLong("at"), alarm(c, n.optInt("id"), fire, PendingIntent.FLAG_UPDATE_CURRENT));
        }
    }

    @SuppressLint("MissingPermission") // allowed() is the check
    static void show(Context c, Intent fired) {
        if (!allowed(c)) return;
        c.getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel(CHANNEL, "Letters and your fire", NotificationManager.IMPORTANCE_DEFAULT));
        int id = fired.getIntExtra(EXTRA_ID, 1);
        String text = fired.getStringExtra(EXTRA_TEXT);
        Intent open = new Intent(c, MainActivity.class)
                .putExtra(EXTRA_ROUTE, fired.getStringExtra(EXTRA_ROUTE))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        NotificationManagerCompat.from(c).notify(id, new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_post)
                .setColor(c.getColor(R.color.brand))
                .setContentTitle(fired.getStringExtra(EXTRA_TITLE))
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setContentIntent(PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
                .setAutoCancel(true)
                .build());
    }
}
