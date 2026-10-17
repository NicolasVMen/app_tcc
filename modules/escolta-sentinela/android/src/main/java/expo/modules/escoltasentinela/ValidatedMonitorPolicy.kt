package expo.modules.escoltasentinela

import android.content.Context
import android.content.pm.PackageManager

/** Identidade do pacote e comportamento validado são decisões independentes. */
internal object ValidatedMonitorPolicy {
  fun isEnabled(context: Context): Boolean {
    if (context.packageName.endsWith(".teste")) return true
    return runCatching {
      context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData?.getBoolean("escolta.validated_monitor", false) == true
    }.getOrDefault(false)
  }
}
