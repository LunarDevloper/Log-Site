const BASE = (import.meta.env.VITE_API_URL ?? `https://buddylog-rosy.vercel.app`).replace(/\/$/, ``);

export const API_BASE = BASE;

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: `include`,
    ...options,
    headers: { 'Content-Type': `application/json`, ...(options.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  return { response, status: response.status, ok: response.ok, data };
}

export function friendlyError(status, serverMessage, fallback) {
  if (serverMessage && typeof serverMessage === `string` && serverMessage.length < 120) return serverMessage;
  switch (status) {
    case 400: return fallback ?? `Verifique os dados informados e tente de novo.`;
    case 401: return `Sua sessão expirou. Entre novamente.`;
    case 403: return `Você não tem permissão para isso. Fale com um admin do grupo.`;
    case 404: return `Não encontramos esse recurso. Pode ter sido removido.`;
    case 409: return `Isso já existe. Tente com outro nome.`;
    case 429: return `Muitas tentativas. Aguarde alguns minutos e tente de novo.`;
    case 500:
    case 502:
    case 503: return `O servidor falhou agora. Tente de novo em instantes.`;
    default: return fallback ?? `Algo deu errado. Tente de novo.`;
  }
}

export function networkError(action = `carregar`) {
  return `Sem conexão ao tentar ${action}. Confira sua internet e tente de novo.`;
}
