import { useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';

const page = 'Empresa';

const config = {
  subtitle: 'Gerencie seus empregados e informações da empresa',
  columns: ['Nome', 'Categoria', 'Cargo', 'Departamento', 'Status'],
  stats: ['Número de Empregados', 'Empregados ativos', 'Horas Online', 'Empregados inativos'],
};

export default function Empresa() {
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
