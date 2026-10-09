// Mesmas regras do servidor (Source/Database/Rules.ts): 8 caracteres, sem 0/O/1/I
const ALPHABET = `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`;
const STORAGE_KEY = `buddylog.invite`;

export function normalizeInviteCode(value) {
  return (value ?? ``).replace(/[\s-]/g, ``).toUpperCase();
}

export function isValidInviteCode(value) {
  const code = normalizeInviteCode(value);
  return code.length === 8 && [...code].every((c) => ALPHABET.includes(c));
}

export function formatInviteCode(value) {
  const code = normalizeInviteCode(value);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

// No Electron a origem é localhost: defina VITE_SITE_URL com o endereço público do site
export function inviteLink(code) {
  const base = (import.meta.env.VITE_SITE_URL || `${window.location.origin}${window.location.pathname}`).replace(/\/$/, ``);
  return `${base}/?convite=${formatInviteCode(code)}`;
}

// Lê ?convite= da URL, guarda e limpa a barra de endereço
export function takeInviteFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(`convite`);
    if (!raw) return null;
    params.delete(`convite`);
    const rest = params.toString();
    window.history.replaceState(null, ``, `${window.location.pathname}${rest ? `?${rest}` : ``}${window.location.hash}`);
    const code = normalizeInviteCode(raw);
    if (!isValidInviteCode(code)) return null;
    storePendingInvite(code);
    return code;
  } catch {
    return null;
  }
}

// localStorage para sobreviver à confirmação de e-mail do cadastro
export function storePendingInvite(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage indisponível, segue só em memória */
  }
}

export function loadPendingInvite() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return code && isValidInviteCode(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada a limpar */
  }
}
