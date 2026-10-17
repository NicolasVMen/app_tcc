package expo.modules.escoltasentinela

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.net.Uri
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class EscoltaSentinelaService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var emergencyRunnable: Runnable? = null
  private var emergencyPlayer: MediaPlayer? = null
  private var emergencyVibrator: Vibrator? = null
  private var protectionWakeLock: PowerManager.WakeLock? = null
  private var nextWakeRenewal = 0L
  private var heartbeatStarted = false
  private val protectionHeartbeat = object : Runnable {
    override fun run() {
      if (!heartbeatStarted) return
      val callback = heartbeatCallback
      if (callback != null && hasBluetoothPermissions(this@EscoltaSentinelaService)) {
        keepProtectionCpuAwake()
        runCatching { callback(System.currentTimeMillis()) }
      } else {
        releaseProtectionWakeLock()
      }
      handler.postDelayed(this, 500)
    }
  }

  private fun keepProtectionCpuAwake() {
    if (SystemClock.elapsedRealtime() < nextWakeRenewal && protectionWakeLock?.isHeld == true) return
    try {
      val wakeLock = protectionWakeLock ?: getSystemService(PowerManager::class.java)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$packageName:ProtectionHeartbeat")
        .also { it.setReferenceCounted(false); protectionWakeLock = it }
      // Lease limitada: se a rotina parar, o Android libera em no máximo 60 s.
      wakeLock.acquire(60_000)
      nextWakeRenewal = SystemClock.elapsedRealtime() + 45_000
    } catch (_: SecurityException) {
      Log.w("EscoltaSentinela", "Não foi possível manter a CPU ativa para as leituras BLE")
    }
  }

  private fun releaseProtectionWakeLock() {
    runCatching { if (protectionWakeLock?.isHeld == true) protectionWakeLock?.release() }
    nextWakeRenewal = 0L
  }

  private fun stopProtectionHeartbeat() {
    heartbeatStarted = false
    handler.removeCallbacks(protectionHeartbeat)
    releaseProtectionWakeLock()
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    getSystemService(NotificationManager::class.java).cancel(EMERGENCY_NOTIFICATION_ID)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // A permissão pode ser revogada entre a ponte JS e a execução no Android.
    // Encerrar sem reinício automático evita um ciclo de falhas no primeiro acesso.
    if (intent?.action != ACTION_STOP && intent?.action != ACTION_CANCEL_EMERGENCY
        && !hasBluetoothPermissions(this)) {
      isRunning = false
      stopSelf()
      return START_NOT_STICKY
    }
    if (intent == null) {
      val saved = getSharedPreferences("escolta_alarm", MODE_PRIVATE)
      if (saved.contains("deadline")) {
        // Recupera o alarme já armado, não uma suposta conexão GATT.
        val remaining = (saved.getLong("deadline", 0) - System.currentTimeMillis()).coerceAtLeast(0)
        if (!promoteSafely(buildNotification("Sentinela retomando", "Restaurando alerta pendente"))) return START_NOT_STICKY
        armEmergency(saved.getString("child", "a criança") ?: "a criança", remaining,
          saved.getBoolean("notifications", true), saved.getBoolean("vibration", true),
          saved.getString("reason", "Monitoramento interrompido.") ?: "Monitoramento interrompido.")
        return START_STICKY
      }
    }
    if (intent?.action == ACTION_STOP) {
      stopProtectionHeartbeat()
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

    if (intent?.action == ACTION_CONNECTION_RESTORED) {
      handleConnectionRestored()
      return START_STICKY
    }

    if (intent?.action == ACTION_ARM_EMERGENCY) {
      if (!isRunning && !promoteSafely(buildNotification(DEFAULT_TITLE, DEFAULT_BODY))) return START_NOT_STICKY
      val childName = intent.getStringExtra(EXTRA_CHILD_NAME) ?: "a criança"
      val delayMs = intent.getLongExtra(EXTRA_DELAY_MS, DEFAULT_GRACE_MS)
      val alertsEnabled = intent.getBooleanExtra(EXTRA_ALERTS_ENABLED, true)
      val vibrationEnabled = intent.getBooleanExtra(EXTRA_VIBRATION_ENABLED, true)
      val reason = intent.getStringExtra(EXTRA_BODY) ?: "O vínculo com dados válidos não foi recuperado."
      armEmergency(childName, delayMs, alertsEnabled, vibrationEnabled, reason)
      return START_STICKY
    }

    // Enquanto houver uma emergência confirmada pelo serviço, atualizações comuns
    // de conexão não podem esconder o alerta antes da confirmação presencial.
    if (emergencyActive) return START_STICKY

    val title = intent?.getStringExtra(EXTRA_TITLE) ?: DEFAULT_TITLE
    val body = intent?.getStringExtra(EXTRA_BODY) ?: DEFAULT_BODY
    val notification = buildNotification(title, body)

    if (!promoteSafely(notification)) return START_NOT_STICKY
    return START_STICKY
  }

  private fun promoteSafely(notification: Notification): Boolean {
    return try {
      if (!hasBluetoothPermissions(this)) throw SecurityException("Bluetooth não autorizado")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      isRunning = true
      // A futura oficial pode optar pela mesma rotina validada, sem mudar sua identidade.
      if (ValidatedMonitorPolicy.isEnabled(this) && !heartbeatStarted) {
        heartbeatStarted = true
        handler.post(protectionHeartbeat)
      }
      true
    } catch (_: SecurityException) {
      Log.w("EscoltaSentinela", "Serviço interrompido: permissão não autorizada")
      isRunning = false
      stopSelf()
      false
    } catch (_: IllegalStateException) {
      Log.w("EscoltaSentinela", "Serviço interrompido: início não permitido pelo Android")
      isRunning = false
      stopSelf()
      false
    }
  }

  override fun onDestroy() {
    stopProtectionHeartbeat()
    cancelEmergency(preserve = true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
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
      enableVibration(false)
      setSound(null, null)
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
      data = Uri.parse(if (packageName.endsWith(".teste")) "escolta-teste://central" else "escolta://central")
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
    vibrationEnabled: Boolean,
    reason: String
  ) {
    cancelEmergency()
    getSharedPreferences("escolta_alarm", MODE_PRIVATE).edit()
      .putLong("deadline", System.currentTimeMillis() + delayMs.coerceAtLeast(0))
      .putString("child", childName).putString("reason", reason)
      .putBoolean("notifications", alertsEnabled).putBoolean("vibration", vibrationEnabled).apply()
    emergencyRunnable = Runnable {
      val body = "$reason Verifique $childName imediatamente."
      val manager = getSystemService(NotificationManager::class.java)
      if (alertsEnabled) {
        val notification = buildEmergencyNotification(body)
        if (!promoteSafely(notification)) return@Runnable
      } else {
        manager.notify(
          NOTIFICATION_ID,
          buildNotification("Emergência ativa — Escolta UNITAU", body)
        )
      }
      // A preferência de notificações não desliga a sirene de emergência.
      alarmPlaying = startNativeAlarm(vibrationEnabled)
      emergencyActive = true
      emergencyRunnable = null
    }.also { handler.postDelayed(it, delayMs.coerceAtLeast(0)) }
  }

  private fun cancelEmergency(preserve: Boolean = false) {
    if (!preserve) getSharedPreferences("escolta_alarm", MODE_PRIVATE).edit().clear().apply()
    emergencyRunnable?.let(handler::removeCallbacks)
    emergencyRunnable = null
    emergencyActive = false
    alarmPlaying = false
    runCatching { emergencyPlayer?.stop() }
    runCatching { emergencyPlayer?.release() }
    emergencyPlayer = null
    emergencyVibrator?.cancel()
    emergencyVibrator = null
    getSystemService(NotificationManager::class.java).cancel(EMERGENCY_NOTIFICATION_ID)
  }

  private fun handleConnectionRestored() {
    if (emergencyActive) return
    cancelEmergency()
  }

  private fun startNativeAlarm(vibrationEnabled: Boolean): Boolean {
    val alarmAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    emergencyPlayer = runCatching { MediaPlayer.create(this, R.raw.escolta_alerta, alarmAttributes, 0)?.apply {
      isLooping = true
      setOnErrorListener { _, _, _ -> alarmPlaying = false; true }
      setOnCompletionListener { alarmPlaying = false }
      start()
    } }.getOrNull()
    val playing = runCatching { emergencyPlayer?.isPlaying == true }.getOrDefault(false)

    if (!vibrationEnabled) return playing
    @Suppress("DEPRECATION")
    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    emergencyVibrator = vibrator
    val pattern = longArrayOf(0, 500, 200, 500, 600)
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(pattern, 0)
      }
    }
    return playing
  }

  private fun buildEmergencyNotification(body: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("escolta_destino", "CENTRAL")
      data = Uri.parse(if (packageName.endsWith(".teste")) "escolta-teste://central" else "escolta://central")
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
      .setSilent(true)
      .setAutoCancel(false)
      .setOngoing(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(0, "Abrir Central", pendingIntent)
      .build()
  }

  companion object {
    @Volatile
    var heartbeatCallback: ((Long) -> Unit)? = null
    private const val MONITORING_CHANNEL_ID = "escolta_monitoramento"
    private const val EMERGENCY_CHANNEL_ID = "escolta_emergencias_v3"
    private const val NOTIFICATION_ID = 4101
    private const val EMERGENCY_NOTIFICATION_ID = 4102
    private const val ACTION_START = "expo.modules.escoltasentinela.INICIAR"
    private const val ACTION_UPDATE = "expo.modules.escoltasentinela.ATUALIZAR"
    private const val ACTION_STOP = "expo.modules.escoltasentinela.PARAR"
    private const val ACTION_ARM_EMERGENCY = "expo.modules.escoltasentinela.ARMAR_EMERGENCIA"
    private const val ACTION_CANCEL_EMERGENCY = "expo.modules.escoltasentinela.CANCELAR_EMERGENCIA"
    private const val ACTION_CONNECTION_RESTORED = "expo.modules.escoltasentinela.VINCULO_RESTABELECIDO"
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

    @Volatile
    var emergencyActive: Boolean = false
      private set

    @Volatile
    var alarmPlaying: Boolean = false
      private set

    private fun hasBluetoothPermissions(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
          ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED)

    private fun requireBluetoothPermissions(context: Context) {
      if (!hasBluetoothPermissions(context)) throw SecurityException("Autorize Dispositivos próximos antes de iniciar a Sentinela")
    }

    fun start(context: Context, title: String, body: String) {
      requireBluetoothPermissions(context)
      val intent = serviceIntent(context, ACTION_START, title, body)
      ContextCompat.startForegroundService(context, intent)
    }

    fun update(context: Context, title: String, body: String) {
      requireBluetoothPermissions(context)
      if (!isRunning) {
        start(context, title, body)
        return
      }
      context.startService(serviceIntent(context, ACTION_UPDATE, title, body))
    }

    fun stop(context: Context) {
      // Parada explícita não pode restaurar um alerta antigo no próximo processo.
      context.getSharedPreferences("escolta_alarm", Context.MODE_PRIVATE).edit().clear().apply()
      context.stopService(Intent(context, EscoltaSentinelaService::class.java))
    }

    fun armEmergency(
      context: Context,
      childName: String,
      delayMs: Long,
      alertsEnabled: Boolean,
      vibrationEnabled: Boolean,
      reason: String
    ) {
      requireBluetoothPermissions(context)
      if (!isRunning) start(context, DEFAULT_TITLE, DEFAULT_BODY)
      context.startService(Intent(context, EscoltaSentinelaService::class.java).apply {
        action = ACTION_ARM_EMERGENCY
        putExtra(EXTRA_CHILD_NAME, childName)
        putExtra(EXTRA_DELAY_MS, delayMs)
        putExtra(EXTRA_ALERTS_ENABLED, alertsEnabled)
        putExtra(EXTRA_VIBRATION_ENABLED, vibrationEnabled)
        putExtra(EXTRA_BODY, reason)
      })
    }

    fun cancelEmergency(context: Context) {
      context.getSharedPreferences("escolta_alarm", Context.MODE_PRIVATE).edit().clear().apply()
      if (!isRunning) return
      context.startService(Intent(context, EscoltaSentinelaService::class.java).setAction(ACTION_CANCEL_EMERGENCY))
    }

    fun connectionRestored(context: Context) {
      if (!isRunning) return
      context.startService(
        Intent(context, EscoltaSentinelaService::class.java).setAction(ACTION_CONNECTION_RESTORED)
      )
    }

    private fun serviceIntent(context: Context, action: String, title: String, body: String) =
      Intent(context, EscoltaSentinelaService::class.java).apply {
        this.action = action
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
      }
  }
}
