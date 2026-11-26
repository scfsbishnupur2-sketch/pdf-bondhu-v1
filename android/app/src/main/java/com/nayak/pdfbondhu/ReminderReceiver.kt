package com.nayak.pdfbondhu

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.util.Calendar

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ID) ?: return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "ONEORA Reminder"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "Scheduled reminder from ONEORA"
        val repeat = intent.getStringExtra(EXTRA_REPEAT) ?: "none"

        showNotification(context, id, title, body)

        val nextTrigger = computeNextRepeatTrigger(repeat)
        if (nextTrigger != null) {
            scheduleReminder(context, id, title, body, nextTrigger, repeat)
        } else {
            removeStoredReminder(context, id)
        }
    }

    private fun showNotification(context: Context, id: String, title: String, body: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ONEORA Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Daily planner, bill, and document expiry reminders"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val openIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.nayak.pdfbondhu.ACTION_SHORTCUT"
            putExtra("shortcut_tool", "oneoraPlannerTab")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPending = PendingIntent.getActivity(
            context,
            id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(contentPending)
            .build()

        manager.notify(id.hashCode(), notification)
    }

    companion object {
        const val PREFS_NAME = "oneora_reminders_store"
        const val CHANNEL_ID = "oneora_reminders"
        const val EXTRA_ID = "reminder_id"
        const val EXTRA_TITLE = "reminder_title"
        const val EXTRA_BODY = "reminder_body"
        const val EXTRA_REPEAT = "reminder_repeat"

        fun scheduleReminder(
            context: Context,
            id: String,
            title: String,
            body: String,
            triggerAtMillis: Long,
            repeat: String
        ) {
            val now = System.currentTimeMillis()
            val safeTrigger = if (triggerAtMillis <= now) now + 5_000L else triggerAtMillis
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val alarmIntent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra(EXTRA_ID, id)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_REPEAT, repeat)
            }
            val pending = PendingIntent.getBroadcast(
                context,
                id.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }

            try {
                if (canExact) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, safeTrigger, pending)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, safeTrigger, pending)
                }
            } catch (_: SecurityException) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, safeTrigger, pending)
            }

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val record = JSONObject()
                .put("id", id)
                .put("title", title)
                .put("body", body)
                .put("triggerAtMillis", safeTrigger)
                .put("repeat", repeat)
                .toString()
            prefs.edit().putString(id, record).apply()
        }

        fun cancelReminder(context: Context, id: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val alarmIntent = Intent(context, ReminderReceiver::class.java)
            val pending = PendingIntent.getBroadcast(
                context,
                id.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pending != null) {
                alarmManager.cancel(pending)
                pending.cancel()
            }
            removeStoredReminder(context, id)
        }

        fun rescheduleAllStored(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            for ((key, raw) in prefs.all) {
                val jsonStr = raw as? String ?: continue
                runCatching {
                    val obj = JSONObject(jsonStr)
                    val id = obj.optString("id", key)
                    val title = obj.optString("title", "ONEORA Reminder")
                    val body = obj.optString("body", "Scheduled reminder from ONEORA")
                    val trigger = obj.optLong("triggerAtMillis", 0L)
                    val repeat = obj.optString("repeat", "none")
                    if (trigger > now) {
                        scheduleReminder(context, id, title, body, trigger, repeat)
                    } else {
                        val next = computeNextRepeatTrigger(repeat)
                        if (next != null) {
                            scheduleReminder(context, id, title, body, next, repeat)
                        } else {
                            prefs.edit().remove(key).apply()
                        }
                    }
                }
            }
        }

        private fun removeStoredReminder(context: Context, id: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(id)
                .apply()
        }

        private fun computeNextRepeatTrigger(repeat: String): Long? {
            val cal = Calendar.getInstance()
            return when (repeat.lowercase()) {
                "daily" -> {
                    cal.add(Calendar.DAY_OF_YEAR, 1)
                    cal.timeInMillis
                }
                "weekly" -> {
                    cal.add(Calendar.WEEK_OF_YEAR, 1)
                    cal.timeInMillis
                }
                "monthly" -> {
                    cal.add(Calendar.MONTH, 1)
                    cal.timeInMillis
                }
                else -> null
            }
        }
    }
}
