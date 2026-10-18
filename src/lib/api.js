const BASE = (import.meta.env.VITE_API_URL ?? `https://buddylog-rosy.vercel.app`).replace(/\/$/, ``);

export const API_BASE = BASE;

// Cache das leituras (GET) no servidor, para não estourar o rate limit
// navegando entre as páginas. Qualquer escrita limpa tudo.
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();
const inflight = new Map();
let blockedUntil = 0;

function toResponse(entry) {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: { 'Content-Type': entry.contentType },
  });
}

export function invalidateApiCache() {
  cache.clear();
}

// Para os botões "Atualizar": busca de novo, mas guarda a cópia antiga
// para mostrar caso o servidor responda 429
export function refresh(load) {
  for (const entry of cache.values()) entry.time = 0;
  return load();
}

async function fetchAndStore(url, options) {
  const response = await fetch(url, options);
  const entry = {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get(`Content-Type`) ?? `application/json`,
    body: await response.text(),
    time: Date.now(),
  };

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get(`Retry-After`)) || 60;
    blockedUntil = Date.now() + retryAfter * 1000;
    const stale = cache.get(url);
    if (stale) return stale;
  }

  if (response.ok) cache.set(url, entry);
  return entry;
}

export async function cachedFetch(url, options = {}) {
  const method = (options.method ?? `GET`).toUpperCase();
  if (!url.startsWith(BASE)) return fetch(url, options);

  if (method !== `GET`) {
    invalidateApiCache();
    return fetch(url, options);
  }

  const hit = cache.get(url);
  if (hit && (Date.now() - hit.time < CACHE_TTL_MS || Date.now() < blockedUntil)) {
    return toResponse(hit);
  }

  // Duas telas pedindo a mesma coisa ao mesmo tempo viram uma requisição só
  if (!inflight.has(url)) {
    inflight.set(url, fetchAndStore(url, options).finally(() => inflight.delete(url)));
  }
  return toResponse(await inflight.get(url));
}

export async function apiFetch(path, options = {}) {
  const response = await cachedFetch(`${BASE}${path}`, {
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
