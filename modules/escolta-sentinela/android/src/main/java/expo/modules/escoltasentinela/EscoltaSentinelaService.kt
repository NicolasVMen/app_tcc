package expo.modules.escoltasentinela

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class EscoltaSentinelaService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var emergencyRunnable: Runnable? = null
  private var emergencyRingtone: Ringtone? = null
  private var emergencyVibrator: Vibrator? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      cancelEmergency()
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

    if (intent?.action == ACTION_CANCEL_EMERGENCY) {
      cancelEmergency()
      return START_STICKY
    }

    if (intent?.action == ACTION_ARM_EMERGENCY) {
      val childName = intent.getStringExtra(EXTRA_CHILD_NAME) ?: "a criança"
      val delayMs = intent.getLongExtra(EXTRA_DELAY_MS, DEFAULT_GRACE_MS)
      val alertsEnabled = intent.getBooleanExtra(EXTRA_ALERTS_ENABLED, true)
      val vibrationEnabled = intent.getBooleanExtra(EXTRA_VIBRATION_ENABLED, true)
      armEmergency(childName, delayMs, alertsEnabled, vibrationEnabled)
      return START_STICKY
    }

    val title = intent?.getStringExtra(EXTRA_TITLE) ?: DEFAULT_TITLE
    val body = intent?.getStringExtra(EXTRA_BODY) ?: DEFAULT_BODY
    val notification = buildNotification(title, body)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE or
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    isRunning = true
    return START_STICKY
  }

  override fun onDestroy() {
    cancelEmergency()
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val monitoringChannel = NotificationChannel(
      MONITORING_CHANNEL_ID,
      "Monitoramento da Sentinela",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Mantém visível o monitoramento do dispositivo Escolta"
      setShowBadge(false)
      enableVibration(false)
      setSound(null, null)
    }
    val emergencyChannel = NotificationChannel(
      EMERGENCY_CHANNEL_ID,
      "Emergências do Escolta",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Alertas críticos de perda de vínculo ou pânico do dispositivo"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
      enableLights(true)
      lightColor = android.graphics.Color.RED
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(monitoringChannel)
    manager.createNotificationChannel(emergencyChannel)
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

    return NotificationCompat.Builder(this, MONITORING_CHANNEL_ID)
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

  private fun armEmergency(
    childName: String,
    delayMs: Long,
    alertsEnabled: Boolean,
    vibrationEnabled: Boolean
  ) {
    cancelEmergency()
    emergencyRunnable = Runnable {
      val body = "Não foi possível restabelecer o vínculo. Verifique $childName imediatamente."
      val manager = getSystemService(NotificationManager::class.java)
      manager.notify(NOTIFICATION_ID, buildNotification("Emergência ativa — Escolta UNITAU", body))
      if (alertsEnabled) {
        manager.notify(EMERGENCY_NOTIFICATION_ID, buildEmergencyNotification(body))
        startNativeAlarm(vibrationEnabled)
      }
      emergencyRunnable = null
    }.also { handler.postDelayed(it, delayMs.coerceAtLeast(0)) }
  }

  private fun cancelEmergency() {
    emergencyRunnable?.let(handler::removeCallbacks)
    emergencyRunnable = null
    emergencyRingtone?.stop()
    emergencyRingtone = null
    emergencyVibrator?.cancel()
    emergencyVibrator = null
    getSystemService(NotificationManager::class.java).cancel(EMERGENCY_NOTIFICATION_ID)
  }

  private fun startNativeAlarm(vibrationEnabled: Boolean) {
    val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    emergencyRingtone = RingtoneManager.getRingtone(this, alarmUri)?.apply {
      audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) isLooping = true
      play()
    }

    if (!vibrationEnabled) return
    @Suppress("DEPRECATION")
    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    emergencyVibrator = vibrator
    val pattern = longArrayOf(0, 500, 200, 500, 600)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(pattern, 0)
    }
  }

  private fun buildEmergencyNotification(body: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("escolta_destino", "CENTRAL")
    }
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        EMERGENCY_NOTIFICATION_ID,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    return NotificationCompat.Builder(this, EMERGENCY_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Emergência — Escolta UNITAU")
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(pendingIntent)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setAutoCancel(false)
      .setOngoing(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(0, "Abrir Central", pendingIntent)
      .build()
  }

  companion object {
    private const val MONITORING_CHANNEL_ID = "escolta_monitoramento"
    private const val EMERGENCY_CHANNEL_ID = "escolta_emergencias_v2"
    private const val NOTIFICATION_ID = 4101
    private const val EMERGENCY_NOTIFICATION_ID = 4102
    private const val ACTION_START = "expo.modules.escoltasentinela.INICIAR"
    private const val ACTION_UPDATE = "expo.modules.escoltasentinela.ATUALIZAR"
    private const val ACTION_STOP = "expo.modules.escoltasentinela.PARAR"
    private const val ACTION_ARM_EMERGENCY = "expo.modules.escoltasentinela.ARMAR_EMERGENCIA"
    private const val ACTION_CANCEL_EMERGENCY = "expo.modules.escoltasentinela.CANCELAR_EMERGENCIA"
    private const val EXTRA_TITLE = "titulo"
    private const val EXTRA_BODY = "mensagem"
    private const val EXTRA_CHILD_NAME = "nome_crianca"
    private const val EXTRA_DELAY_MS = "atraso_ms"
    private const val EXTRA_ALERTS_ENABLED = "alertas_habilitados"
    private const val EXTRA_VIBRATION_ENABLED = "vibracao_habilitada"
    private const val DEFAULT_GRACE_MS = 5000L
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

    fun armEmergency(
      context: Context,
      childName: String,
      delayMs: Long,
      alertsEnabled: Boolean,
      vibrationEnabled: Boolean
    ) {
      if (!isRunning) start(context, DEFAULT_TITLE, DEFAULT_BODY)
      context.startService(Intent(context, EscoltaSentinelaService::class.java).apply {
        action = ACTION_ARM_EMERGENCY
        putExtra(EXTRA_CHILD_NAME, childName)
        putExtra(EXTRA_DELAY_MS, delayMs)
        putExtra(EXTRA_ALERTS_ENABLED, alertsEnabled)
        putExtra(EXTRA_VIBRATION_ENABLED, vibrationEnabled)
      })
    }

    fun cancelEmergency(context: Context) {
      if (!isRunning) return
      context.startService(Intent(context, EscoltaSentinelaService::class.java).setAction(ACTION_CANCEL_EMERGENCY))
    }

    private fun serviceIntent(context: Context, action: String, title: String, body: String) =
      Intent(context, EscoltaSentinelaService::class.java).apply {
        this.action = action
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
      }
  }
}
