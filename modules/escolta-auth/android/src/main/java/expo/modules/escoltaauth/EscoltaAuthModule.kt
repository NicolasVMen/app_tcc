package expo.modules.escoltaauth

import android.content.MutableContextWrapper
import android.content.pm.PackageManager
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// Tokens ficam somente em memória até sua validação pelo Firebase; nunca em logs.
class EscoltaAuthModule : Module() {
  private val signingIn = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("EscoltaAuth")
    Constant("applicationId") { appContext.reactContext?.packageName.orEmpty() }
    Constant("isTestBuild") { appContext.reactContext?.packageName?.endsWith(".teste") == true }
    Constant("validatedMonitorEnabled") {
      val context = appContext.reactContext
      context != null && runCatching {
        context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
          .metaData?.getBoolean("escolta.validated_monitor", false) == true
      }.getOrDefault(false)
    }

    AsyncFunction("signInGoogleAsync") Coroutine { webClientId: String ->
      if (!webClientId.matches(Regex("[A-Za-z0-9_-]+\\.apps\\.googleusercontent\\.com"))) {
        return@Coroutine mapOf("status" to "error", "code" to "google/not-configured")
      }
      if (!signingIn.compareAndSet(false, true)) {
        return@Coroutine mapOf("status" to "error", "code" to "google/in-progress")
      }
      try {
        withContext(Dispatchers.Main) {
          val activity = appContext.currentActivity
            ?: return@withContext mapOf("status" to "error", "code" to "google/provider-unavailable")
          val manager = CredentialManager.create(activity.applicationContext)
          val option = GetSignInWithGoogleOption.Builder(webClientId).build()
          val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
          val result = manager.getCredential(MutableContextWrapper(activity), request)
          val credential = result.credential
          if (credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            return@withContext mapOf("status" to "error", "code" to "google/invalid-response")
          }
          val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
          if (token.isBlank()) mapOf("status" to "error", "code" to "google/invalid-response")
          else mapOf("status" to "success", "idToken" to token)
        }
      } catch (_: GetCredentialCancellationException) {
        mapOf("status" to "cancelled")
      } catch (_: NoCredentialException) {
        mapOf("status" to "error", "code" to "google/no-credential")
      } catch (_: GetCredentialProviderConfigurationException) {
        mapOf("status" to "error", "code" to "google/provider-unavailable")
      } catch (_: GoogleIdTokenParsingException) {
        mapOf("status" to "error", "code" to "google/invalid-response")
      } catch (_: GetCredentialException) {
        mapOf("status" to "error", "code" to "google/provider-unavailable")
      } finally {
        signingIn.set(false)
      }
    }

    AsyncFunction("clearGoogleStateAsync") Coroutine { ->
      val context = appContext.reactContext ?: return@Coroutine false
      CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
      true
    }
  }
}
