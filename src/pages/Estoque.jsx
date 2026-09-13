import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';
import Popup from '../components/Popup';
import { ErrorBanner } from '../components/Feedback';
import AddStockItem from './AddStockItem';
import { API_BASE, friendlyError, networkError } from '../lib/api';

const page = 'Estoque';

const columns = ['Produto', 'Descrição', 'Quantidade', 'Estoque mín.', 'Status'];

export default function Estoque({ group }) {
  const [addingStockItem, setAddingStockItem] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(``);
  const [onlyLow, setOnlyLow] = useState(false);

  const loadInventory = useCallback(async () => {
    const groupId = group?.id;
    if (!groupId) {
      setLoading(false);
      setError(`Escolha uma empresa para ver o estoque.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/groups/getinvetory/${groupId}`, {
        credentials: `include`,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403) {
          setError(`Seu cargo não tem acesso ao estoque deste grupo. Peça a permissão ViewInventory a um admin.`);
        } else {
          setError(friendlyError(response.status, data?.error, `Não foi possível carregar o estoque.`));
        }
        return;
      }
      setItems(data.inventory?.Items ?? []);
    } catch {
      setError(networkError(`carregar o estoque`));
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (onlyLow && !it.LowStock) return false;
      if (!q) return true;
      return `${it.DisplayName ?? ``} ${it.Description ?? ``}`.toLowerCase().includes(q);
    });
  }, [items, query, onlyLow]);

  const rows = useMemo(() => filtered.map((it) => [
    it.DisplayName ?? `--`,
    it.Description || `—`,
    it.Amount ?? 0,
    it.SecurityLimit ?? 0,
    it.LowStock ? `⚠️ Baixo` : `OK`,
  ]), [filtered]);

  const lowCount = useMemo(() => items.filter((it) => it.LowStock).length, [items]);

  if (addingStockItem) {
    return (
      <AddStockItem
        group={group}
        onCancel={() => setAddingStockItem(false)}
        onSave={() => {
          setAddingStockItem(false);
          loadInventory();
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      <ErrorBanner message={error} onRetry={loadInventory} retrying={loading} onDismiss={() => setError(null)} />
      <PageHeader page={page} subtitle={group ? `Produtos de ${group.name}` : `Escolha uma empresa`} />
      <div className="toolbar">
        <input placeholder="Pesquisar produto..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={onlyLow ? `low` : `all`} onChange={(e) => setOnlyLow(e.target.value === `low`)}>
          <option value="all">Todos</option>
          <option value="low">Estoque baixo</option>
        </select>
        <button className="secondary-button" type="button" onClick={loadInventory} disabled={loading}>
          {loading ? `Carregando...` : `Atualizar`}
        </button>
        <button className="primary-button" type="button" onClick={() => setAddingStockItem(true)}>
          + Adicionar
        </button>
      </div>
      <Stats stats={[
        { label: `Produtos`, value: loading ? `…` : items.length, hint: group?.name ?? `` },
        { label: `Estoque baixo`, value: loading ? `…` : lowCount, hint: lowCount ? `Precisando de reposição` : `Tudo sob controle` },
        { label: `Unidades`, value: loading ? `…` : items.reduce((a, it) => a + (Number(it.Amount) || 0), 0), hint: `Somando quantidades` },
        { label: `Filtro`, value: filtered.length, hint: onlyLow ? `Só estoque baixo` : `Todos os itens` },
      ]} />
      <Card title="Produtos" subtitle={loading ? `Carregando...` : `${filtered.length} item(ns)`}>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle={items.length === 0 ? `Estoque vazio` : `Nada encontrado`}
          emptySubtitle={items.length === 0 ? `Cadastre o primeiro produto para começar.` : `Ajuste a busca ou o filtro.`}
          emptyActionLabel={items.length === 0 ? `Cadastrar produto` : undefined}
          onEmptyAction={items.length === 0 ? () => setAddingStockItem(true) : undefined}
        />
      </Card>
      <Popup
        open={!!error && false}
        onClose={() => setError(null)}
        title="Não foi possível carregar o estoque"
        subtitle="Verifique o detalhe abaixo e tente novamente."
        error={error}
      />
    </div>
  );
}
