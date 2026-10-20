export function userName(user) {
  const name = (user?.displayName ?? ``).trim();
  if (name) return name;
  return (user?.email ?? ``).split(`@`)[0] || `Usuário`;
}

// Iniciais no lugar da foto: "Ana Souza" -> "AS", "buddylog" -> "BU"
export function userInitials(user) {
  const parts = userName(user).split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) ?? `?`;
  return letters.toUpperCase();
}
