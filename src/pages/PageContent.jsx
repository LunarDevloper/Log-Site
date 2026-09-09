import { useState, useEffect } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';
import AddStockItem from './AddStockItem';

const pageConfig = {
  Estoque: {
    subtitle: 'Visão geral dos produtos armazenados',
    columns: ['Produto', 'Categoria', 'Localização', 'Quantidade', 'Status'],
    stats: ['Produtos', 'Estoque baixo', 'Categorias', 'Ocupação']
  },
  Movimentações: {
    subtitle: 'Entradas, saídas e movimentações internas',
    columns: ['Código', 'Tipo', 'Produto', 'Origem', 'Destino'],
    stats: ['Entradas', 'Saídas', 'Internas', 'Total']
  },
  Pedidos: {
    subtitle: 'Acompanhamento dos pedidos',
    columns: ['Pedido', 'Cliente', 'Data', 'Prioridade', 'Status'],
    stats: ['Pendentes', 'Separando', 'Transporte', 'Concluídos']
  },
  Robôs: {
    subtitle: 'Frota de robôs autônomos',
    columns: ['Robô', 'Status', 'Bateria', 'Localização', 'Missão'],
    stats: ['Online', 'Carregando', 'Manutenção', 'Offline']
  },
  Alertas: {
    subtitle: 'Central de alertas operacionais',
    columns: ['Nível', 'Tipo', 'Mensagem', 'Data', 'Status'],
    stats: ['Críticos', 'Altos', 'Médios', 'Informativos']
  },
  Relatórios: {
    subtitle: 'Indicadores e análises do sistema',
    columns: ['Relatório', 'Período', 'Categoria', 'Formato', 'Status'],
    stats: ['Movimentações', 'Eficiência', 'Pedidos', 'Tempo médio']
  },
  Configurações: {
    subtitle: 'Preferências gerais do sistema',
    columns: ['Configuração', 'Descrição', 'Categoria', 'Valor', 'Status'],
    stats: ['Empresa', 'Usuários', 'Integrações', 'Sistema']
  },
};

export default function PageContent({ page }) {
  const [addingStockItem, setAddingStockItem] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const config = pageConfig[page] || pageConfig.Estoque;

  async function getGroupId() {
    try {
      const response = await fetch('https://buddylog-rosy.vercel.app/groups/listgroups', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        setError('Erro após tentar pegar seu grupo, tente novamente!');
        return null;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao buscar grupo:', err);
      setError('Erro de conexão, tente novamente mais tarde.');
      return null;
    }
  }

  useEffect(() => {
    if (page === 'Estoque') {
      async function loadInventory() {
        const groupData = await getGroupId();
        const groupId = groupData?.groups?.[0]?.id;
        if (!groupId) return;

        try {
          const response = await fetch(`https://buddylog-rosy.vercel.app/groups/getinvetory/${groupId}`, {
            method: 'GET',
            credentials: 'include'
          });

          if (response.ok) {
            const inventoryData = await response.json();
            setItems(inventoryData.inventory?.Items ?? []);
          } else {
            setError('Erro ao carregar estoque, tente novamente!');
          }
        } catch (err) {
          console.log('Error:', err);
          setError('Erro ao carregar item, tente novamente!');
        }
      }
      loadInventory();
    }
  }, [page]);

  if (page === 'Estoque' && addingStockItem) {
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
        onAdd={page === 'Estoque' ? () => setAddingStockItem(true) : undefined}
      />
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
    </div>
  );
}