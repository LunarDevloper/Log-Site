// No navegador a API passa pelo proxy /api do próprio site (vercel.json / vite.config.js).
// Domínio diferente faria o cookie de sessão virar "de terceiros" e o Safari bloqueia.
const isHttp = typeof window !== `undefined` && /^https?:$/.test(window.location.protocol);
const BASE = isHttp
  ? `${window.location.origin}/api`
  : (import.meta.env.VITE_API_URL ?? `https://buddylog-rosy.vercel.app`).replace(/\/$/, ``);

export const API_BASE = BASE;

// Rotas onde 401 é resposta normal (senha errada, sem sessão ainda), não sessão expirada
const AUTH_PATHS = [`/auth/login`, `/auth/signup`, `/auth/me`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/session`];
export const UNAUTHORIZED_EVENT = `buddylog:unauthorized`;

function notifyUnauthorized(url, status) {
  if (status !== 401) return;
  const path = url.slice(BASE.length).split(`?`)[0];
  if (AUTH_PATHS.includes(path)) return;
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

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
    const response = await fetch(url, options);
    notifyUnauthorized(url, response.status);
    return response;
  }

  const hit = cache.get(url);
  if (hit && (Date.now() - hit.time < CACHE_TTL_MS || Date.now() < blockedUntil)) {
    return toResponse(hit);
  }

  // Duas telas pedindo a mesma coisa ao mesmo tempo viram uma requisição só
  if (!inflight.has(url)) {
    inflight.set(url, fetchAndStore(url, options).finally(() => inflight.delete(url)));
  }
  const entry = await inflight.get(url);
  notifyUnauthorized(url, entry.status);
  return toResponse(entry);
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

// Mensagens da API vêm em inglês; as genéricas viram texto em português
const SERVER_MESSAGES = {
  'Unauthorized': `Sua sessão expirou. Entre novamente.`,
  'Forbidden': `Você não tem permissão para isso. Fale com um admin do grupo.`,
  'Bad Request': `Verifique os dados informados e tente de novo.`,
  'Not found': `Não encontramos esse recurso. Pode ter sido removido.`,
  'Group not found': `Essa empresa não existe mais ou você não tem acesso.`,
  'Member not found': `Esse membro não está mais na equipe.`,
  'Internal Server Error': `O servidor falhou agora. Tente de novo em instantes.`,
  'Name is required': `Informe um nome.`,
  'Description is required': `Escreva uma descrição curta.`,
  'Invalid CNPJ': `Esse CNPJ não é válido. Confira os números.`,
  'Unable to create group': `Não foi possível criar a empresa. Confira o nome e a descrição.`,
  'Unable to remove member': `Não foi possível remover esse membro.`,
  'Current password is incorrect': `A senha atual está incorreta.`,
  'New password must be different': `A nova senha precisa ser diferente da atual.`,
  'Password is too weak': `Senha fraca. Use letras, números e pelo menos 6 caracteres.`,
  'Invite not found': `Esse convite não existe ou já expirou.`,
  'Item not found': `Esse item não existe mais no estoque.`,
  'Already a member': `Você já faz parte dessa empresa.`,
};

export function friendlyError(status, serverMessage, fallback) {
  if (typeof serverMessage === `string`) {
    if (SERVER_MESSAGES[serverMessage]) return SERVER_MESSAGES[serverMessage];
    // Texto já em português (com acento) passa direto; inglês cai no texto padrão
    if (serverMessage.length < 120 && /[^\x00-\x7F]/.test(serverMessage)) return serverMessage;
  }
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
