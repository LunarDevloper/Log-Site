import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Popup from '../components/Popup';
import { EmptyState, ErrorBanner } from '../components/Feedback';
import { API_BASE, friendlyError, networkError } from '../lib/api';

function formatDate(value) {
  if (!value) return `--`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `--`;
  return date.toLocaleDateString(`pt-BR`);
}

function initial(name) {
  const t = (name ?? `?`).trim();
  return (t[0] ?? `?`).toUpperCase();
}

export default function Empresa({ onSelect, selectedId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(``);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(``);
  const [description, setDescription] = useState(``);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/listgroups`, {
        method: `GET`,
        credentials: `include`,
      });
      if (response.status === 401) {
        setError(`Sessão expirada. Faça login novamente.`);
        setGroups([]);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(friendlyError(response.status, data?.error, `Não foi possível carregar suas empresas.`));
        return;
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      setError(networkError(`carregar suas empresas`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      `${g.name ?? ``} ${g.description ?? ``}`.toLowerCase().includes(q),
    );
  }, [groups, query]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(`Dê um nome para a empresa (até 64 caracteres).`);
      return;
    }
    if (trimmedName.length > 64) {
      setError(`O nome passou de 64 caracteres. Encurte um pouco.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/create`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ name: trimmedName.slice(0, 64), description: description.trim().slice(0, 500) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(friendlyError(response.status, data?.error, `Não foi possível criar a empresa.`));
        return;
      }
      const created = data.id ? data : data.group ?? data;
      if (created?.id) {
        setGroups((prev) => [created, ...prev]);
        if (onSelect) onSelect(created);
      } else {
        loadGroups();
      }
      setName(``);
      setDescription(``);
      setShowCreate(false);
    } catch {
      setError(networkError(`criar a empresa`));
    } finally {
      setSaving(false);
    }
  }

  async function handleOpen(group) {
    if (onSelect) {
      setOpeningId(group.id);
      onSelect(group);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/groups/${group.id}`, {
        method: `GET`,
        credentials: `include`,
      });
      if (!response.ok) return;
      setDetail(await response.json());
    } catch {
      setDetail(group);
    }
  }

  return (
    <div className="page-stack">
      <ErrorBanner message={error} onRetry={loadGroups} retrying={loading} onDismiss={() => setError(null)} />
      <PageHeader page="Empresa" subtitle="Escolha uma empresa para entrar no painel" />
      <div className="toolbar">
        <input
          placeholder="Pesquisar empresa..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="secondary-button" type="button" onClick={loadGroups} disabled={loading}>
          {loading ? `Carregando...` : `Atualizar`}
        </button>
        <button className="primary-button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? `Fechar` : `+ Nova empresa`}
        </button>
      </div>

      {showCreate && (
        <Card title="Criar empresa" subtitle="Nome até 64 caracteres, descrição até 500">
          <form onSubmit={handleCreate} className="stock-form">
            <label className="form-field"><span>Nome</span>
              <input
                placeholder="Ex: Depósito A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
              />
            </label>
            <label className="form-field"><span>Descrição (opcional)</span>
              <input
                placeholder="Estoque principal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </label>
            <div className="form-actions form-field--full">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? `Criando...` : `Criar e entrar →`}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Minhas empresas"
        subtitle={loading ? `Carregando...` : `${filtered.length} empresa(s) · clique em Entrar`}
      >
        {loading && filtered.length === 0 && (
          <div style={{ display: `grid`, gridTemplateColumns: `repeat(auto-fill, minmax(260px, 1fr))`, gap: 12 }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{ border: `1px solid var(--border)`, borderRadius: 16, padding: 16, background: `var(--bg2)` }}>
                <span className="skeleton" style={{ height: 18, width: `60%`, marginBottom: 10 }} />
                <span className="skeleton" style={{ height: 12, width: `90%`, marginBottom: 16 }} />
                <span className="skeleton" style={{ height: 46, width: `100%` }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display: `grid`, gridTemplateColumns: `repeat(auto-fill, minmax(260px, 1fr))`, gap: 12 }}>
          {filtered.map((group) => {
            const active = group.id === selectedId;
            const opening = openingId === group.id;
            return (
              <div
                key={group.id}
                style={{
                  border: active ? `1px solid var(--neon)` : `1px solid var(--border)`,
                  borderRadius: 16,
                  padding: 16,
                  background: active ? `rgba(124, 58, 237, .14)` : `var(--bg2)`,
                  display: `flex`,
                  flexDirection: `column`,
                  gap: 10,
                }}
              >
                <div style={{ display: `flex`, alignItems: `center`, gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: `var(--purple)`,
                    display: `grid`, placeItems: `center`, fontWeight: 800, fontSize: 18, flexShrink: 0,
                  }}>
                    {initial(group.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: `block`, overflow: `hidden`, textOverflow: `ellipsis`, whiteSpace: `nowrap` }}>
                      {group.name ?? `--`}
                    </strong>
                    <small style={{ color: `var(--muted)` }}>
                      {active ? `Ativa agora ✓` : `Criada em ${formatDate(group.createdAt)}`}
                    </small>
                  </div>
                </div>
                <p style={{ margin: 0, color: `var(--muted)`, fontSize: 12, minHeight: 32 }}>
                  {group.description || `Sem descrição`}
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleOpen(group)}
                  disabled={opening}
                  style={{ width: `100%`, minHeight: 46, fontSize: 14 }}
                >
                  {active ? `Entrar novamente →` : opening ? `Entrando...` : `Entrar →`}
                </button>
              </div>
            );
          })}
        </div>
        {!loading && filtered.length === 0 && (
          groups.length === 0
            ? <EmptyState icon="🏢" title="Você ainda não tem empresas" subtitle="Crie a primeira para liberar o painel, o estoque e a equipe." actionLabel="+ Criar minha primeira empresa" onAction={() => setShowCreate(true)} />
            : <EmptyState icon="🔍" title="Nada com esse nome" subtitle="Ajuste a pesquisa para achar sua empresa." />
        )}
      </Card>

      <Popup
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? `Grupo`}
        subtitle={[detail?.description, detail?.id ? `ID: ${detail.id}` : null].filter(Boolean).join(` — `)}
      />
    </div>
  );
}
