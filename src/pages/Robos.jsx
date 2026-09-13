import { useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';

const page = 'Robôs';

const config = {
  subtitle: 'Frota de robôs autônomos',
  columns: ['Robô', 'Status', 'Bateria', 'Localização', 'Missão'],
  stats: ['Online', 'Carregando', 'Manutenção', 'Offline'],
};

export default function Robos() {
  const [items] = useState([]);
  const [error] = useState(null);

  return (
    <div className="page-stack">
      {error && <div className="error-banner">{error}</div>}
      <PageHeader page={page} subtitle={config.subtitle} />
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
