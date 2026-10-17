import { isValidEmail, normalizeEmail } from '../utils/authValidation';

export function canSendEmergencyEmail(profile: { emailEmergencia?: unknown; emailAlertsEnabled?: unknown }): boolean {
  return !!profile && typeof profile === 'object' && profile.emailAlertsEnabled === true && typeof profile.emailEmergencia === 'string'
    && isValidEmail(normalizeEmail(profile.emailEmergencia));
}

/** HTTP aprovado significa somente aceitação pelo provedor, nunca entrega. */
export async function sendExperimentalEmail(input: {
  recipient: string; message: string; childName: string;
}): Promise<{ acceptedAt: string }> {
  const recipient = normalizeEmail(input.recipient);
  if (!isValidEmail(recipient)) throw new Error('Informe um e-mail válido.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({
        service_id: 'service_oepr28p', template_id: 'template_4wi1j79', user_id: 'o4hSlYAVWUIATAbWp',
        template_params: { to_email: recipient, message: input.message, child_name: input.childName },
      }),
    });
    if (!response.ok) throw new Error('O serviço de e-mail não aceitou a solicitação.');
    return { acceptedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeout);
  }
}
