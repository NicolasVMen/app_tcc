export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// Validação básica de formulário. A aceitação final pertence ao provedor.
export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && !/\s/.test(value)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateAuthInput(input: {
  mode: 'login' | 'register'; name: string; email: string;
  password: string; confirmation: string;
}): string | null {
  if (!isValidEmail(normalizeEmail(input.email))) return 'Informe um e-mail válido.';
  if (!input.password) return 'Informe sua senha.';
  if (input.mode === 'login') return null; // Não invalida senhas de contas antigas.
  if (!input.name.trim()) return 'Informe o nome do responsável.';
  if (input.name.trim().length > 100) return 'Use até 100 caracteres no nome.';
  if (input.password.length < 8) return 'Para criar a conta, use pelo menos oito caracteres na senha.';
  if (input.password !== input.confirmation) return 'A confirmação deve ser igual à senha.';
  return null;
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha inválidos.',
    'auth/user-not-found': 'E-mail ou senha inválidos.',
    'auth/wrong-password': 'E-mail ou senha inválidos.',
    'auth/email-already-in-use': 'Este e-mail já possui uma conta. Entre ou use a recuperação de senha.',
    'auth/invalid-email': 'O formato do e-mail não é válido.',
    'auth/weak-password': 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.',
    'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    'auth/network-request-failed': 'Não foi possível acessar a internet.',
    'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o suporte.',
    'auth/operation-not-allowed': 'Este método de acesso está indisponível. Tente outra opção de entrada.',
    'auth/account-exists-with-different-credential': 'Este e-mail usa outro método de acesso. Entre pelo método já cadastrado; seus dados não foram transferidos.',
    'google/not-configured': 'O acesso com Google está indisponível. Use e-mail e senha.',
    'google/native-unavailable': 'O acesso com Google está indisponível nesta instalação. Atualize o aplicativo ou entre com e-mail e senha.',
    'google/no-credential': 'Não foi possível selecionar uma conta Google. Confira as contas cadastradas no celular e tente novamente.',
    'google/provider-unavailable': 'O serviço de acesso com Google não está disponível. Verifique o Google Play Services e tente novamente.',
    'google/invalid-response': 'Não foi possível validar o acesso com Google. Tente novamente.',
    'google/in-progress': 'Já existe uma tentativa de acesso em andamento.',
  };
  return (code && messages[code]) || 'Não foi possível acessar. Verifique sua conexão e tente novamente.';
}
