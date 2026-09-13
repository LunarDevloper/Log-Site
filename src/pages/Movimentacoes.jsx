import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { ErrorBanner } from '../components/Feedback';
import { API_BASE, friendlyError, networkError } from '../lib/api';

const page = 'Movimentações';

const columns = ['Tipo', 'Produto', 'Quantidade', 'Quando'];

function typeLabel(t) {
  if (t === `add`) return `➕ Entrada`;
  if (t === `remove`) return `➖ Saída`;
  return t ?? `--`;
}

export default function Movimentacoes({ group }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(``);
  const [filter, setFilter] = useState(`all`);

  const load = useCallback(async () => {
    if (!group?.id) {
      setLoading(false);
      setError(`Escolha uma empresa para ver as movimentações.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/gethistory/${group.id}`, {
        credentials: `include`,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403) {
          setError(`Seu cargo não tem acesso ao histórico. Peça a permissão ViewItemHistory a um admin.`);
        } else {
          setError(friendlyError(response.status, data?.error, `Não foi possível carregar as movimentações.`));
        }
        return;
      }
      const history = Array.isArray(data.history) ? data.history : [];
      setRows(history.map((m) => ({
        type: m.Type ?? `--`,
        item: m.ItemName ?? `--`,
        qty: m.Quantity ?? `--`,
        when: m.CreatedAt ? new Date(m.CreatedAt).toLocaleString(`pt-BR`) : `--`,
      })));
    } catch {
      setError(networkError(`carregar as movimentações`));
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (filter === `all` ? true : r.type === filter))
      .filter((r) => (!q ? true : `${r.item} ${r.type}`.toLowerCase().includes(q)))
      .map((r) => [typeLabel(r.type), r.item, r.qty, r.when]);
  }, [rows, query, filter]);

  const entries = rows.filter((r) => r.type === `add`).length;
  const exits = rows.filter((r) => r.type === `remove`).length;

  return (
    <div className="page-stack">
      <ErrorBanner message={error} onRetry={load} retrying={loading} onDismiss={() => setError(null)} />
      <PageHeader
        page={page}
        subtitle={group ? `${entries} entradas · ${exits} saídas · ${group.name}` : `Entradas e saídas`}
      />
      <Card title="Movimentações" subtitle={loading ? `Carregando...` : `${filtered.length} registro(s)`}>
        <div className="toolbar">
          <input placeholder="Pesquisar produto..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="add">Entradas</option>
            <option value="remove">Saídas</option>
          </select>
          <button className="secondary-button" type="button" onClick={load} disabled={loading}>
            {loading ? `Carregando...` : `Atualizar`}
          </button>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="Nenhuma movimentação ainda"
          emptySubtitle="Quando houver entradas e saídas, elas aparecem aqui."
        />
      </Card>
    </div>
  );
}
