import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorBanner } from '../components/Feedback';
import { API_BASE, friendlyError, networkError } from '../lib/api';

const PERM_KEYS = [`CreateItem`, `DeleteItem`, `AddItemToInventory`, `RemoveItemFromInventory`, `ViewInventory`, `ViewItemHistory`, `CreateRole`, `AddRole`, `RemoveRole`];

const PERM_LABELS = {
  CreateItem: `Criar produto`,
  DeleteItem: `Excluir produto`,
  AddItemToInventory: `Dar entrada`,
  RemoveItemFromInventory: `Dar saída`,
  ViewInventory: `Ver estoque`,
  ViewItemHistory: `Ver histórico`,
  CreateRole: `Criar cargo`,
  AddRole: `Gerenciar equipe`,
  RemoveRole: `Excluir cargo`,
};

function emptyPerms() {
  return Object.fromEntries(PERM_KEYS.map((k) => [k, false]));
}

export default function Equipe({ group }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignable, setAssignable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(``);
  const [rank, setRank] = useState(1);
  const [perms, setPerms] = useState(emptyPerms);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newUserId, setNewUserId] = useState(``);
  const [newRoleId, setNewRoleId] = useState(``);

  const load = useCallback(async () => {
    if (!group?.id) {
      setLoading(false);
      setError(`Escolha uma empresa para gerenciar a equipe.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, membersRes, assignRes] = await Promise.all([
        fetch(`${API_BASE}/groups/${group.id}/roles`, { credentials: `include` }),
        fetch(`${API_BASE}/groups/${group.id}/members`, { credentials: `include` }),
        fetch(`${API_BASE}/groups/getassignableperms/${group.id}`, { credentials: `include` }),
      ]);
      let failed = 0;
      if (rolesRes.ok) {
        const d = await rolesRes.json().catch(() => ({}));
        setRoles(Array.isArray(d.roles) ? d.roles : []);
      } else failed += 1;
      if (membersRes.ok) {
        const d = await membersRes.json().catch(() => ({}));
        setMembers(Array.isArray(d.members) ? d.members : []);
      } else failed += 1;
      if (assignRes.ok) setAssignable(await assignRes.json().catch(() => null));
      if (failed >= 2) {
        const d = await rolesRes.json().catch(() => ({}));
        setError(friendlyError(rolesRes.status, d?.error, `Não foi possível carregar a equipe.`));
      }
    } catch {
      setError(networkError(`carregar a equipe`));
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (assignable?.minRank) setRank(assignable.minRank);
  }, [assignable?.minRank]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 32);
    if (!trimmed) { setError(`Dê um nome ao cargo (ex: Operador).`); return; }
    if (assignable?.minRank && Number(rank) < assignable.minRank) {
      setError(`O rank precisa ser ${assignable.minRank} ou maior (menor número = mais poder).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/roles`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ name: trimmed, rank: Number(rank), perms }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível criar o cargo.`)); return; }
      setName(``); setRank((assignable?.minRank ?? 1)); setPerms(emptyPerms()); setShowCreate(false);
      load();
    } catch {
      setError(networkError(`criar o cargo`));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(role) {
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/roles/${role.id}`, {
        method: `PATCH`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ perms: editing.perms }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível atualizar o cargo.`)); return; }
      setEditing(null);
      load();
    } catch {
      setError(networkError(`atualizar o cargo`));
    }
  }

  async function handleDeleteRole(role) {
    if (role.rank === 0) { setError(`O cargo Admin (rank 0) não pode ser excluído.`); return; }
    if (!confirm(`Excluir o cargo ${role.name}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/roles/${role.id}`, {
        method: `DELETE`,
        credentials: `include`,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível excluir. Tire os membros do cargo antes.`)); return; }
      load();
    } catch {
      setError(networkError(`excluir o cargo`));
    }
  }

  async function handleChangeMemberRole(member, roleId) {
    if (!roleId) return;
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/members/role`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ userId: member.userId, roleId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível trocar o cargo.`)); return; }
      load();
    } catch {
      setError(networkError(`trocar o cargo`));
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!newUserId.trim() || !newRoleId) { setError(`Cole o ID do usuário e escolha o cargo para adicionar.`); return; }
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/members`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ userId: newUserId.trim(), roleId: newRoleId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível adicionar. Confira se o usuário já tem conta.`)); return; }
      setNewUserId(``); setNewRoleId(``);
      load();
    } catch {
      setError(networkError(`adicionar o membro`));
    }
  }

  async function handleRemoveMember(member) {
    if (member.isOwner) { setError(`O dono da empresa não pode ser removido.`); return; }
    if (!confirm(`Remover ${member.displayName ?? member.userId} da empresa?`)) return;
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}/members`, {
        method: `DELETE`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ userId: member.userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(friendlyError(response.status, data.error, `Não foi possível remover.`)); return; }
      load();
    } catch {
      setError(networkError(`remover o membro`));
    }
  }

  return (
    <div className="page-stack">
      <ErrorBanner message={error} onRetry={load} retrying={loading} onDismiss={() => setError(null)} />
      <PageHeader page="Equipe" subtitle={group ? `Cargos e colaboradores · ${group.name}` : `Cargos e colaboradores`} />
      <div className="toolbar">
        <button className="secondary-button" type="button" onClick={load} disabled={loading}>
          {loading ? `Carregando...` : `Atualizar`}
        </button>
        <button className="primary-button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? `Fechar` : `+ Novo cargo`}
        </button>
        {assignable && <span style={{ alignSelf: `center`, color: `var(--muted)`, fontSize: 12 }}>rank mínimo liberado: {assignable.minRank}</span>}
      </div>

      {showCreate && (
        <Card title="Criar cargo" subtitle="Rank menor = mais poder · marque só o que o colaborador precisa">
          <form onSubmit={handleCreate} className="stock-form">
            <label className="form-field"><span>Nome *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Ex: Operador" />
            </label>
            <label className="form-field"><span>Rank (mínimo {assignable?.minRank ?? 1})</span>
              <input type="number" min={assignable?.minRank ?? 1} value={rank} onChange={(e) => setRank(e.target.value)} />
            </label>
            <div className="form-field form-field--full"><span>Permissões</span>
              <div style={{ display: `flex`, flexWrap: `wrap`, gap: 10 }}>
                {PERM_KEYS.map((k) => (
                  <label key={k} title={PERM_LABELS[k]} style={{ display: `flex`, gap: 6, alignItems: `center`, fontSize: 12, opacity: assignable && assignable.assignable?.[k] === false ? 0.4 : 1 }}>
                    <input type="checkbox" checked={!!perms[k]} onChange={(e) => setPerms((p) => ({ ...p, [k]: e.target.checked }))} />
                    {PERM_LABELS[k]}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions form-field--full">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? `Criando...` : `Criar cargo`}</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Cargos" subtitle={loading ? `Carregando...` : `${roles.length} cargo(s) · rank 0 é o Admin`}>
        {loading && roles.length === 0
          ? <div className="table-wrap"><table><tbody>{[1, 2, 3].map((r) => <tr key={r}><td><span className="skeleton" /></td><td><span className="skeleton" /></td><td><span className="skeleton" /></td></tr>)}</tbody></table></div>
          : roles.length === 0
            ? <EmptyState icon="🛡️" title="Nenhum cargo além do Admin" subtitle="Crie cargos como Operador ou Estoquista para organizar a equipe." actionLabel="Criar cargo" onAction={() => setShowCreate(true)} />
            : <div className="table-wrap"><table>
              <thead><tr><th>Nome</th><th>Rank</th><th>Permissões</th><th>Ações</th></tr></thead>
              <tbody>
                {roles.map((r) => {
                  const active = PERM_KEYS.filter((k) => r.perms?.[k]);
                  const isEditing = editing?.id === r.id;
                  return (
                    <tr key={r.id}>
                      <td data-label="Nome"><strong>{r.name}</strong>{r.rank === 0 && <small style={{ color: `var(--neon)` }}> · Admin</small>}</td>
                      <td data-label="Rank">{r.rank}</td>
                      <td data-label="Permissões">{isEditing
                        ? <div style={{ display: `flex`, flexWrap: `wrap`, gap: 8 }}>
                          {PERM_KEYS.map((k) => (
                            <label key={k} title={PERM_LABELS[k]} style={{ display: `flex`, gap: 4, alignItems: `center`, fontSize: 11 }}>
                              <input type="checkbox" checked={!!editing.perms[k]} onChange={(e) => setEditing((ed) => ({ ...ed, perms: { ...ed.perms, [k]: e.target.checked } }))} />
                              {PERM_LABELS[k]}
                            </label>
                          ))}
                        </div>
                        : active.length === 0 ? `Nenhuma` : active.map((k) => PERM_LABELS[k]).join(` · `)}
                      </td>
                      <td data-label="Ações" style={{ display: `flex`, gap: 8 }}>
                        {isEditing
                          ? <><button type="button" onClick={() => handleUpdateRole(r)}>Salvar</button>
                            <button type="button" onClick={() => setEditing(null)}>Cancelar</button></>
                          : <><button type="button" onClick={() => setEditing({ id: r.id, perms: { ...r.perms } })}>Editar</button>
                            {r.rank !== 0 && <button type="button" onClick={() => handleDeleteRole(r)}>Excluir</button>}</>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>}
      </Card>

      <Card title="Colaboradores" subtitle={loading ? `Carregando...` : `${members.length} pessoa(s)`}>
        <form onSubmit={handleAddMember} className="toolbar" style={{ flexWrap: `wrap` }}>
          <input placeholder="Cole o ID do usuário (UUID)" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} style={{ minWidth: 220 }} />
          <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Escolha o cargo...</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name} (rank {r.rank})</option>)}
          </select>
          <button className="primary-button" type="submit">Adicionar</button>
        </form>
        {loading && members.length === 0
          ? <div className="table-wrap"><table><tbody>{[1, 2].map((r) => <tr key={r}><td><span className="skeleton" /></td><td><span className="skeleton" /></td></tr>)}</tbody></table></div>
          : members.length === 0
            ? <EmptyState icon="👥" title="Só você por aqui" subtitle="Adicione colaboradores pelo ID para dividir o trabalho." />
            : <div className="table-wrap"><table>
              <thead><tr><th>Nome</th><th>Cargo</th><th>Tipo</th><th>Ações</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td data-label="Nome"><strong>{m.displayName ?? `Usuário`}</strong><br /><small style={{ color: `var(--dim)` }}>{String(m.userId).slice(0, 8)}…</small></td>
                    <td data-label="Cargo">
                      <select value={m.role?.id ?? ``} onChange={(e) => handleChangeMemberRole(m, e.target.value)} disabled={m.isOwner}>
                        <option value="">{m.role?.name ?? `Sem cargo`}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td data-label="Tipo">{m.isOwner ? `👑 Dono` : `Membro`}</td>
                    <td data-label="Ações">
                      {!m.isOwner && <button type="button" onClick={() => handleRemoveMember(m)}>Remover</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>}
      </Card>
    </div>
  );
}
