package com.nakulcreations.catos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** An alarm from Reminders has gone off, or the phone restarted and the alarms need setting again. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String action = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) Reminders.arm(c);
        else Reminders.show(c, i);
    }
}
