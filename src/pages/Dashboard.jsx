import { useCallback, useEffect, useState } from "react";
import Card from "../components/Card";
import { ErrorBanner, EmptyState } from "../components/Feedback";
import WarehouseMap from "../components/WarehouseMap";
import { API_BASE, cachedFetch, friendlyError, networkError, refresh } from "../lib/api";

function relTime(value) {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return ``;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return `agora`;
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(t).toLocaleDateString(`pt-BR`);
}

export default function Dashboard({ group }) {
  const [summary, setSummary] = useState({ total: `…`, items: `…`, low: `…`, moves: `…` });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partial, setPartial] = useState(null);

  const load = useCallback(async () => {
    if (!group?.id) {
      setLoading(false);
      setError(`Escolha uma empresa para ver o painel.`);
      return;
    }
    setLoading(true);
    setError(null);
    setPartial(null);
    try {
      const [invRes, lowRes, histRes] = await Promise.all([
        cachedFetch(`${API_BASE}/groups/getinvetory/${group.id}`, { credentials: `include` }),
        cachedFetch(`${API_BASE}/groups/getlowstock/${group.id}`, { credentials: `include` }),
        cachedFetch(`${API_BASE}/groups/gethistory/${group.id}`, { credentials: `include` }),
      ]);
      const invDenied = invRes.status === 403;
      const histDenied = histRes.status === 403;
      const inv = invRes.ok ? await invRes.json().catch(() => ({})) : {};
      const low = lowRes.ok ? await lowRes.json().catch(() => ({})) : {};
      const hist = histRes.ok ? await histRes.json().catch(() => ({})) : {};
      const items = inv.inventory?.Items ?? [];
      const total = items.reduce((acc, it) => acc + (Number(it.Amount) || 0), 0);
      setSummary({
        total: invDenied ? `🔒` : total,
        items: invDenied ? `🔒` : items.length,
        low: invDenied ? `🔒` : (low.inventory?.Items ?? []).length,
        moves: histDenied ? `🔒` : (hist.history ?? []).length,
      });
      setActivity((hist.history ?? []).slice(0, 5));
      if (!invRes.ok && !invDenied) {
        const d = inv;
        setPartial(friendlyError(invRes.status, d?.error, `Estoque indisponível agora.`));
      } else if (invDenied || histDenied) {
        setPartial(`Alguns dados estão ocultos: seu cargo não tem permissão de estoque ou histórico.`);
      } else if (!histRes.ok) {
        setPartial(friendlyError(histRes.status, hist?.error, `Histórico indisponível agora.`));
      }
    } catch {
      setError(networkError(`atualizar o painel`));
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = [
    { label: `Total em estoque`, value: summary.total, hint: `${summary.items} item(ns)` },
    { label: `Itens cadastrados`, value: summary.items, hint: group?.name ?? `` },
    { label: `Estoque baixo`, value: summary.low, hint: summary.low === 0 ? `Tudo sob controle` : `Precisando de reposição` },
    { label: `Movimentações`, value: summary.moves, hint: `Últimos 100 registros` },
  ];

  return (
    <div className="page-stack">
      <ErrorBanner message={error} onRetry={() => refresh(load)} retrying={loading} onDismiss={() => setError(null)} />
      <div className="page-heading">
        <div>
          <span>Início / Dashboard</span>
          <h1>{group?.name ?? `Dashboard`}</h1><p>Visão geral das operações logísticas</p>
        </div>
        <button className="primary-button" type="button" onClick={() => refresh(load)} disabled={loading}>
          {loading ? `Atualizando...` : `Atualizar`}
        </button>
      </div>
      {partial && !error && <ErrorBanner message={partial} onDismiss={() => setPartial(null)} />}

      <div className="kpi-grid">
        {kpis.map(({ label, value, hint }) =>
          <Card key={label} className="stat">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint || `—`}</small>
          </Card>)}
      </div>

      <div className="dashboard-grid">
        <Card title="Operações em tempo real" subtitle="Últimas 5 movimentações">
          {loading && activity.length === 0
            ? <div className="table-wrap"><table><tbody>{[1, 2, 3].map((r) => <tr key={r}><td><span className="skeleton" /></td></tr>)}</tbody></table></div>
            : activity.length === 0
              ? <EmptyState icon="🧾" title="Nenhuma movimentação ainda" subtitle="Entradas e saídas do estoque aparecem aqui." />
              : <div className="table-wrap"><table><tbody>
                {activity.map((m) => (
                  <tr key={m.Id}>
                    <td data-label="Tipo"><strong>{m.Type === `add` ? `➕ Entrada` : m.Type === `remove` ? `➖ Saída` : m.Type}</strong><br /><small style={{ color: `var(--dim)` }}>{relTime(m.CreatedAt)}</small></td>
                    <td data-label="Item">{m.ItemName}</td>
                    <td data-label="Qtd">{m.Quantity}</td>
                  </tr>
                ))}
              </tbody></table></div>}
        </Card>

        <Card title="Mapa do armazém" subtitle="Ruas, módulos e curva ABC · ilustrativo">
          <WarehouseMap />
        </Card>
      </div>
    </div>
  );
}
