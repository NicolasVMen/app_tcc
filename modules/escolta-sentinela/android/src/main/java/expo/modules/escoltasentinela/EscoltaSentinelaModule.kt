package expo.modules.escoltasentinela

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EscoltaSentinelaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EscoltaSentinela")

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
        childName: String, delayMs: Long, alertsEnabled: Boolean, vibrationEnabled: Boolean ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Contexto Android indisponível")
      EscoltaSentinelaService.armEmergency(
        context,
        childName,
        delayMs,
        alertsEnabled,
        vibrationEnabled
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
  }
}
