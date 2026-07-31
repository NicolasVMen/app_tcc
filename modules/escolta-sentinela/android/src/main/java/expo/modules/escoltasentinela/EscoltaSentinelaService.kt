package expo.modules.escoltasentinela

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class EscoltaSentinelaService : Service() {
  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      isRunning = false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
      stopSelf()
      return START_NOT_STICKY
    }

    val title = intent?.getStringExtra(EXTRA_TITLE) ?: DEFAULT_TITLE
    val body = intent?.getStringExtra(EXTRA_BODY) ?: DEFAULT_BODY
    val notification = buildNotification(title, body)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    isRunning = true
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Monitoramento da Sentinela",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Mantém visível o monitoramento do dispositivo Escolta"
      setShowBadge(false)
      enableVibration(false)
      setSound(null, null)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, body: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("escolta_destino", "CENTRAL")
    }
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        4101,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(pendingIntent)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "escolta_monitoramento"
    private const val NOTIFICATION_ID = 4101
    private const val ACTION_START = "expo.modules.escoltasentinela.INICIAR"
    private const val ACTION_UPDATE = "expo.modules.escoltasentinela.ATUALIZAR"
    private const val ACTION_STOP = "expo.modules.escoltasentinela.PARAR"
    private const val EXTRA_TITLE = "titulo"
    private const val EXTRA_BODY = "mensagem"
    private const val DEFAULT_TITLE = "Sentinela ativa"
    private const val DEFAULT_BODY = "Monitorando o vínculo com o dispositivo Escolta"

    @Volatile
    var isRunning: Boolean = false
      private set

    fun start(context: Context, title: String, body: String) {
      val intent = serviceIntent(context, ACTION_START, title, body)
      ContextCompat.startForegroundService(context, intent)
    }

    fun update(context: Context, title: String, body: String) {
      if (!isRunning) {
        start(context, title, body)
        return
      }
      context.startService(serviceIntent(context, ACTION_UPDATE, title, body))
    }

    fun stop(context: Context) {
      if (!isRunning) return
      context.startService(Intent(context, EscoltaSentinelaService::class.java).setAction(ACTION_STOP))
    }

    private fun serviceIntent(context: Context, action: String, title: String, body: String) =
      Intent(context, EscoltaSentinelaService::class.java).apply {
        this.action = action
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
      }
  }
}
