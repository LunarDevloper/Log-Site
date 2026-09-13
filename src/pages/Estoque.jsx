import { useState, useEffect } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';
import Popup from '../components/Popup';
import AddStockItem from './AddStockItem';

const page = 'Estoque';

const config = {
  subtitle: 'Visão geral dos produtos armazenados',
  columns: ['Produto', 'Categoria', 'Localização', 'Quantidade', 'Status'],
  stats: ['Produtos', 'Estoque baixo', 'Categorias', 'Ocupação'],
};

export default function Estoque() {
  const [addingStockItem, setAddingStockItem] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const showError = (message) => {
    setError(message);
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function getGroupId() {
      try {
        const response = await fetch('https://buddylog-rosy.vercel.app/groups/listgroups', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          if (!cancelled) showError('Erro após tentar pegar seu grupo, tente novamente!');
          return null;
        }
        return await response.json();
      } catch (err) {
        console.error('Erro ao buscar grupo:', err);
        if (!cancelled) showError('Erro de conexão, tente novamente mais tarde.');
        return null;
      }
    }

    async function loadInventory() {
      const groupData = await getGroupId();
      const groupId = groupData?.groups?.[0]?.id;
      if (!groupId || cancelled) return;

      try {
        const response = await fetch(`https://buddylog-rosy.vercel.app/groups/getinvetory/${groupId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (cancelled) return;

        if (response.ok) {
          const inventoryData = await response.json();
          setItems(inventoryData.inventory?.Items ?? []);
        } else {
          showError('Erro ao carregar estoque, tente novamente!');
        }
      } catch (err) {
        console.log('Error:', err);
        if (!cancelled) showError('Erro ao carregar item, tente novamente!');
      }
    }

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, []);

  if (addingStockItem) {
    return (
      <AddStockItem
        onCancel={() => setAddingStockItem(false)}
        onSave={async (newItem) => {
          console.log('Item preparado para envio:', newItem);
          setItems((prev) => [...prev, newItem]);
          setAddingStockItem(false);
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      {error && <div className="error-banner">{error}</div>}
      <PageHeader
        page={page}
        subtitle={config.subtitle}
        onAdd={() => setAddingStockItem(true)}
      />
      <button className="primary-button" type="button" onClick={() => setAddingStockItem(true)}>
        Adicionar
      </button>
      <Stats stats={config.stats} />
      <Card title={`Lista de ${page.toLowerCase()}`} subtitle="Estrutura visual preparada para receber dados reais">
        <div className="toolbar">
          <input placeholder="Pesquisar..." />
          <select defaultValue="Todos">
            <option>Todos</option>
          </select>
        </div>
        <DataTable columns={config.columns} data={items} />
      </Card>
      <Popup
        open={popupOpen}
        onClose={handleClosePopup}
        title="Não foi possível carregar o estoque"
        subtitle="Verifique o detalhe abaixo e tente novamente."
        error={error}
      />
    </div>
  );
}
