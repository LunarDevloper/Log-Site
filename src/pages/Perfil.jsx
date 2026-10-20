import { useCallback, useEffect, useState } from "react";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { ErrorBanner } from "../components/Feedback";
import { API_BASE, cachedFetch, friendlyError, networkError, refresh } from "../lib/api";
import { maskCnpj } from "../lib/cnpj";
import { userInitials, userName } from "../lib/user";

const NAME_MAX = 64;

function formatDate(value, withTime = false) {
  if (!value) return `--`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `--`;
  return withTime
    ? date.toLocaleString(`pt-BR`, { dateStyle: `short`, timeStyle: `short` })
    : date.toLocaleDateString(`pt-BR`);
}

export default function Perfil({ user, onUserChange, onLogout, onLeftGroup, onOpenGroup }) {
  const [name, setName] = useState(user?.displayName ?? ``);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);

  const [passwords, setPasswords] = useState({ current: ``, next: ``, confirm: `` });
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(null);
  const [leavingId, setLeavingId] = useState(null);

  const [confirmEverywhere, setConfirmEverywhere] = useState(false);

  // Sessão aberta pelo login traz só o básico; completa com /auth/me
  useEffect(() => {
    if (user?.createdAt) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await cachedFetch(`${API_BASE}/auth/me`, { credentials: `include` });
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && data?.user) {
          onUserChange(data.user);
          setName((prev) => prev || data.user.displayName || ``);
        }
      } catch {
        /* segue com o que já tem */
      }
    })();
    return () => { cancelled = true; };
  }, [user?.createdAt, onUserChange]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setGroupsError(null);
    try {
      const response = await cachedFetch(`${API_BASE}/groups/listgroups`, { credentials: `include` });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGroupsError(friendlyError(response.status, data?.error, `Não foi possível carregar suas empresas.`));
        return;
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      setGroupsError(networkError(`carregar suas empresas`));
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function handleSaveName(e) {
    e.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, ` `);
    if (!trimmed) {
      setNameMessage({ type: `error`, text: `Escreva como você quer ser chamado.` });
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setNameMessage({ type: `error`, text: `O nome pode ter no máximo ${NAME_MAX} caracteres.` });
      return;
    }
    if (trimmed === (user?.displayName ?? ``)) {
      setNameMessage({ type: `ok`, text: `Nada mudou: esse já é o seu nome.` });
      return;
    }

    setSavingName(true);
    setNameMessage(null);
    try {
      const response = await cachedFetch(`${API_BASE}/auth/me`, {
        method: `PATCH`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNameMessage({ type: `error`, text: friendlyError(response.status, data?.error, `Não foi possível salvar o nome.`) });
        return;
      }
      onUserChange({ ...user, ...data.user });
      setName(data.user?.displayName ?? trimmed);
      setNameMessage({ type: `ok`, text: `Nome atualizado. Sua equipe já vê o nome novo.` });
    } catch {
      setNameMessage({ type: `error`, text: networkError(`salvar o nome`) });
    } finally {
      setSavingName(false);
    }
  }

  function handlePasswordChange(e) {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (passwordMessage) setPasswordMessage(null);
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    const { current, next, confirm } = passwords;
    if (!current) {
      setPasswordMessage({ type: `error`, text: `Digite sua senha atual.` });
      return;
    }
    if (next.length < 6 || next.length > 72) {
      setPasswordMessage({ type: `error`, text: `A nova senha precisa ter entre 6 e 72 caracteres.` });
      return;
    }
    if (next !== confirm) {
      setPasswordMessage({ type: `error`, text: `A confirmação não bate com a nova senha.` });
      return;
    }
    if (next === current) {
      setPasswordMessage({ type: `error`, text: `A nova senha precisa ser diferente da atual.` });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      const response = await cachedFetch(`${API_BASE}/auth/change-password`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPasswordMessage({ type: `error`, text: friendlyError(response.status, data?.error, `Não foi possível trocar a senha.`) });
        return;
      }
      setPasswords({ current: ``, next: ``, confirm: `` });
      setPasswordMessage({ type: `ok`, text: `Senha alterada. Use a nova senha no próximo login.` });
    } catch {
      setPasswordMessage({ type: `error`, text: networkError(`trocar a senha`) });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLeave(group) {
    if (!user?.id) return;
    setLeavingId(group.id);
    setGroupsError(null);
    try {
      const response = await cachedFetch(`${API_BASE}/groups/${group.id}/members`, {
        method: `DELETE`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGroupsError(friendlyError(response.status, data?.error, `Não foi possível sair dessa empresa.`));
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      onLeftGroup?.(group.id);
    } catch {
      setGroupsError(networkError(`sair da empresa`));
    } finally {
      setLeavingId(null);
      setConfirmLeave(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader page="Meu perfil" subtitle="Seus dados de acesso, senha e empresas" />

      <section className="card profile-hero">
        <div className="profile-hero__avatar" aria-hidden="true">{userInitials(user)}</div>
        <div className="profile-hero__info">
          <h2>{userName(user)}</h2>
          <p>{user?.email ?? `--`}</p>
          <div className="profile-hero__tags">
            {user?.emailConfirmed !== false && <span className="status-tag status-tag--ok">E-mail confirmado</span>}
            <span className="status-tag">{groups.length} empresa(s)</span>
          </div>
        </div>
        <dl className="profile-hero__meta">
          <div><dt>Conta criada</dt><dd>{formatDate(user?.createdAt)}</dd></div>
          <div><dt>Último acesso</dt><dd>{formatDate(user?.lastSignInAt, true)}</dd></div>
        </dl>
      </section>

      <div className="profile-grid">
        <Card title="Seus dados" subtitle="O nome aparece para a sua equipe">
          <form className="stock-form" onSubmit={handleSaveName}>
            <label className="form-field form-field--full"><span>Nome</span>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameMessage(null); }}
                maxLength={NAME_MAX}
                placeholder="Como devemos te chamar?"
                autoComplete="name"
              />
              <small>{name.trim().length}/{NAME_MAX} caracteres</small>
            </label>
            <label className="form-field form-field--full"><span>E-mail</span>
              <input value={user?.email ?? ``} readOnly />
              <small>O e-mail é o seu login e não pode ser trocado por aqui.</small>
            </label>
            {nameMessage && (
              <p className={`form-field--full ${nameMessage.type === `ok` ? `form-success` : `form-error`}`} role="status">{nameMessage.text}</p>
            )}
            <div className="form-actions form-field--full">
              <button className="primary-button" type="submit" disabled={savingName}>
                {savingName ? `Salvando...` : `Salvar nome`}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Senha" subtitle="Confirme a senha atual para escolher uma nova">
          <form className="stock-form" onSubmit={handleSavePassword}>
            <label className="form-field form-field--full"><span>Senha atual</span>
              <input
                type={showPasswords ? `text` : `password`}
                name="current"
                value={passwords.current}
                onChange={handlePasswordChange}
                autoComplete="current-password"
              />
            </label>
            <label className="form-field"><span>Nova senha</span>
              <input
                type={showPasswords ? `text` : `password`}
                name="next"
                value={passwords.next}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                placeholder="Mínimo de 6 caracteres"
              />
            </label>
            <label className="form-field"><span>Confirmar nova senha</span>
              <input
                type={showPasswords ? `text` : `password`}
                name="confirm"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                autoComplete="new-password"
              />
            </label>
            {passwordMessage && (
              <p className={`form-field--full ${passwordMessage.type === `ok` ? `form-success` : `form-error`}`} role="status">{passwordMessage.text}</p>
            )}
            <div className="form-actions form-field--full">
              <button className="secondary-button" type="button" onClick={() => setShowPasswords((v) => !v)}>
                {showPasswords ? `Ocultar senhas` : `Mostrar senhas`}
              </button>
              <button className="primary-button" type="submit" disabled={savingPassword}>
                {savingPassword ? `Trocando...` : `Trocar senha`}
              </button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Minhas empresas" subtitle="Empresas em que você participa e o seu cargo em cada uma">
        <ErrorBanner message={groupsError} onRetry={() => refresh(loadGroups)} retrying={loadingGroups} onDismiss={() => setGroupsError(null)} />
        {loadingGroups && groups.length === 0 && (
          <div className="profile-groups">
            {[1, 2].map((s) => <span key={s} className="skeleton" style={{ height: 64 }} />)}
          </div>
        )}
        {!loadingGroups && groups.length === 0 && !groupsError && (
          <p className="profile-empty">Você ainda não participa de nenhuma empresa. Crie uma ou use um convite em Minhas empresas.</p>
        )}
        <ul className="profile-groups">
          {groups.map((group) => (
            <li key={group.id} className="profile-group">
              <div className="profile-group__info">
                <strong>{group.name}</strong>
                <small>
                  {group.isOwner ? `Dono` : group.roleName ?? `Membro`}
                  {group.cnpj ? ` · ${maskCnpj(group.cnpj)}` : ``}
                </small>
              </div>
              <div className="profile-group__actions">
                {confirmLeave === group.id ? (
                  <>
                    <span className="profile-group__ask">Sair de {group.name}?</span>
                    <button className="secondary-button" type="button" onClick={() => setConfirmLeave(null)} disabled={leavingId === group.id}>
                      Cancelar
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleLeave(group)} disabled={leavingId === group.id}>
                      {leavingId === group.id ? `Saindo...` : `Sim, sair`}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="secondary-button" type="button" onClick={() => onOpenGroup?.(group)}>Abrir</button>
                    {group.isOwner ? (
                      <span className="profile-group__hint" title="O dono não pode sair da própria empresa">Você é o dono</span>
                    ) : (
                      <button className="secondary-button profile-group__leave" type="button" onClick={() => setConfirmLeave(group.id)}>
                        Sair da empresa
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Sessão" subtitle="Encerre o acesso neste aparelho ou em todos de uma vez">
        <div className="profile-session">
          <div>
            <strong>Sair deste aparelho</strong>
            <small>Você volta para a tela de login. Seus dados continuam salvos.</small>
          </div>
          <button className="secondary-button" type="button" onClick={() => onLogout()}>Sair</button>
        </div>
        <div className="profile-session">
          <div>
            <strong>Sair de todos os aparelhos</strong>
            <small>Use se entrou em um computador ou celular de outra pessoa.</small>
          </div>
          {confirmEverywhere ? (
            <div className="profile-group__actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmEverywhere(false)}>Cancelar</button>
              <button className="danger-button" type="button" onClick={() => onLogout({ everywhere: true })}>Confirmar</button>
            </div>
          ) : (
            <button className="danger-button" type="button" onClick={() => setConfirmEverywhere(true)}>Sair de todos</button>
          )}
        </div>
      </Card>
    </div>
  );
}
