package expo.modules.escoltasentinela

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EscoltaSentinelaModule : Module() {
  private val heartbeatCallback: (Long) -> Unit = { emittedAt ->
    sendEvent("onProtectionHeartbeat", mapOf("emittedAt" to emittedAt))
  }

  override fun definition() = ModuleDefinition {
    Name("EscoltaSentinela")
    Events("onProtectionHeartbeat")
    Constant("protectionHeartbeatAvailable") {
      appContext.reactContext?.let { ValidatedMonitorPolicy.isEnabled(it) } == true
    }
    OnStartObserving {
      if (appContext.reactContext?.let { ValidatedMonitorPolicy.isEnabled(it) } == true) {
        EscoltaSentinelaService.heartbeatCallback = heartbeatCallback
      }
    }
    OnStopObserving { releaseHeartbeatCallback() }
    OnDestroy { releaseHeartbeatCallback() }

    AsyncFunction("startAsync") { title: String, body: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.start(context, title, body)
    }

    AsyncFunction("updateAsync") { title: String, body: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.update(context, title, body)
    }

    AsyncFunction("stopAsync") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.stop(context)
    }

    AsyncFunction("armEmergencyAsync") {
        childName: String, delayMs: Long, alertsEnabled: Boolean, vibrationEnabled: Boolean, reason: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.armEmergency(
        context,
        childName,
        delayMs,
        alertsEnabled,
        vibrationEnabled,
        reason
      )
    }

    AsyncFunction("cancelEmergencyAsync") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.cancelEmergency(context)
    }

    AsyncFunction("connectionRestoredAsync") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.connectionRestored(context)
    }

    AsyncFunction<Boolean>("isRunningAsync") {
      return@AsyncFunction EscoltaSentinelaService.isRunning
    }

    AsyncFunction<Boolean>("isEmergencyActiveAsync") {
      return@AsyncFunction EscoltaSentinelaService.emergencyActive
    }

    AsyncFunction<Boolean>("isAlarmPlayingAsync") {
      return@AsyncFunction EscoltaSentinelaService.alarmPlaying
    }
  }

  private fun releaseHeartbeatCallback() {
    if (EscoltaSentinelaService.heartbeatCallback === heartbeatCallback) {
      EscoltaSentinelaService.heartbeatCallback = null
    }
  }
}
