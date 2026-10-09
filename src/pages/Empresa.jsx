import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Popup from '../components/Popup';
import { EmptyState, ErrorBanner } from '../components/Feedback';
import { API_BASE, friendlyError, networkError } from '../lib/api';
import { cleanCnpj, formatCep, formatPhone, isValidCnpj, lookupCnpj, maskCnpj } from '../lib/cnpj';
import { formatInviteCode, isValidInviteCode, normalizeInviteCode } from '../lib/invite';

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

export default function Empresa({ onSelect, onInviteCode, selectedId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(``);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(``);
  const [description, setDescription] = useState(``);
  const [cnpj, setCnpj] = useState(``);
  const [company, setCompany] = useState(null);
  const [lookup, setLookup] = useState(`idle`);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState(``);

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

  // Consulta a Receita quando o CNPJ fica completo e válido
  useEffect(() => {
    setCompany(null);
    const clean = cleanCnpj(cnpj);
    if (clean.length < 14) {
      setLookup(`idle`);
      return;
    }
    if (!isValidCnpj(clean)) {
      setLookup(`invalid`);
      return;
    }

    const controller = new AbortController();
    setLookup(`loading`);
    const timer = setTimeout(async () => {
      try {
        const info = await lookupCnpj(clean, controller.signal);
        if (!info) {
          setLookup(`notfound`);
          return;
        }
        setCompany(info);
        setLookup(`found`);
        setName((prev) => prev || (info.nomeFantasia || info.razaoSocial).slice(0, 64));
        setDescription((prev) => prev || info.atividade.slice(0, 500));
      } catch (err) {
        if (err?.name !== `AbortError`) setLookup(`error`);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cnpj]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    const qCnpj = cleanCnpj(q);
    return groups.filter((g) =>
      `${g.name ?? ``} ${g.description ?? ``}`.toLowerCase().includes(q) ||
      (qCnpj.length >= 3 && (g.cnpj ?? ``).includes(qCnpj)),
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
    if (!description.trim()) {
      setError(`Escreva uma descrição curta para a empresa.`);
      return;
    }
    const cleanedCnpj = cleanCnpj(cnpj);
    if (cleanedCnpj && !isValidCnpj(cleanedCnpj)) {
      setError(`Esse CNPJ não é válido. Confira os números.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/create`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({
          name: trimmedName.slice(0, 64),
          description: description.trim().slice(0, 500),
          cnpj: cleanedCnpj || null,
        }),
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
      setCnpj(``);
      setShowCreate(false);
    } catch {
      setError(networkError(`criar a empresa`));
    } finally {
      setSaving(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const code = normalizeInviteCode(joinCode);
    if (!isValidInviteCode(code)) {
      setError(`Esse código não parece certo. Ele tem 8 letras e números, tipo K7P2-9XQM.`);
      return;
    }
    setJoinCode(``);
    setShowJoin(false);
    if (onInviteCode) onInviteCode(code);
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
        {onInviteCode && (
          <button className="secondary-button" type="button" onClick={() => { setShowJoin((v) => !v); setShowCreate(false); }}>
            {showJoin ? `Fechar` : `Tenho um convite`}
          </button>
        )}
        <button className="primary-button" type="button" onClick={() => { setShowCreate((v) => !v); setShowJoin(false); }}>
          {showCreate ? `Fechar` : `+ Nova empresa`}
        </button>
      </div>

      {showJoin && (
        <Card title="Entrar com convite" subtitle="Cole o código ou o link que você recebeu">
          <form onSubmit={handleJoin} className="toolbar" style={{ margin: 0 }}>
            <input
              className="mono"
              placeholder="K7P2-9XQM"
              value={joinCode}
              onChange={(e) => {
                const match = e.target.value.match(/convite=([\w-]+)/i);
                setJoinCode(formatInviteCode(match ? match[1] : e.target.value).slice(0, 9));
              }}
              autoComplete="off"
            />
            <button className="primary-button" type="submit">Continuar</button>
          </form>
        </Card>
      )}

      {showCreate && (
        <Card title="Criar empresa" subtitle="Comece pelo CNPJ: buscamos os dados na Receita e preenchemos o resto">
          <form onSubmit={handleCreate} className="stock-form">
            <label className="form-field form-field--full"><span>CNPJ (opcional)</span>
              <input
                className="mono"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                inputMode="text"
                autoComplete="off"
              />
              {lookup === `loading` && <small>Consultando a Receita...</small>}
              {lookup === `invalid` && <small className="field-warn">CNPJ inválido. Confira os dígitos.</small>}
              {lookup === `notfound` && <small className="field-warn">Não achamos esse CNPJ na consulta pública. Dá pra criar mesmo assim.</small>}
              {lookup === `error` && <small className="field-warn">A consulta está fora do ar agora. Dá pra criar mesmo assim.</small>}
            </label>

            {company && (
              <div className="company-sheet form-field--full">
                <div className="company-sheet__head">
                  <div>
                    <strong>{company.razaoSocial || `--`}</strong>
                    {company.nomeFantasia && <small>{company.nomeFantasia}</small>}
                  </div>
                  {company.situacao && (
                    <span className={`status-tag ${company.situacao.toUpperCase() === `ATIVA` ? `status-tag--ok` : `status-tag--warn`}`}>
                      {company.situacao}
                    </span>
                  )}
                </div>
                <dl>
                  <div className="company-sheet__wide"><dt>Endereço</dt><dd>{company.endereco || `--`}</dd></div>
                  <div><dt>Cidade</dt><dd>{company.cidade || `--`}</dd></div>
                  <div><dt>CEP</dt><dd className="mono">{formatCep(company.cep) || `--`}</dd></div>
                  <div className="company-sheet__wide"><dt>Atividade principal</dt><dd>{company.atividade || `--`}</dd></div>
                  <div><dt>Abertura</dt><dd>{formatDate(company.abertura ? `${company.abertura}T12:00:00` : null)}</dd></div>
                  <div><dt>Telefone</dt><dd className="mono">{formatPhone(company.telefone) || `--`}</dd></div>
                  {company.email && <div className="company-sheet__wide"><dt>E-mail</dt><dd>{company.email.toLowerCase()}</dd></div>}
                </dl>
              </div>
            )}

            <label className="form-field"><span>Nome</span>
              <input
                placeholder="Ex: Depósito A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
              />
            </label>
            <label className="form-field"><span>Descrição</span>
              <input
                placeholder="Estoque principal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </label>
            <div className="form-actions form-field--full">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? `Criando...` : `Criar e entrar`}
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
                      {active ? `Ativa agora` : `Criada em ${formatDate(group.createdAt)}`}
                    </small>
                    {group.cnpj && <small className="mono" style={{ display: `block`, color: `var(--dim)` }}>{maskCnpj(group.cnpj)}</small>}
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
                  {active ? `Entrar novamente` : opening ? `Entrando...` : `Entrar`}
                </button>
              </div>
            );
          })}
        </div>
        {!loading && filtered.length === 0 && (
          groups.length === 0
            ? <EmptyState title="Você ainda não tem empresas" subtitle="Crie a primeira ou entre na da sua equipe com um convite." actionLabel="+ Criar minha primeira empresa" onAction={() => setShowCreate(true)} />
            : <EmptyState title="Nada com esse nome" subtitle="Ajuste a pesquisa para achar sua empresa." />
        )}
      </Card>

      <Popup
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? `Grupo`}
        subtitle={[detail?.description, detail?.cnpj ? `CNPJ ${maskCnpj(detail.cnpj)}` : null, detail?.id ? `ID: ${detail.id}` : null].filter(Boolean).join(` — `)}
      />
    </div>
  );
}
