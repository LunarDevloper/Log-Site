import { useState, useEffect } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';
import AddStockItem from './AddStockItem';

//marcos to modularizando o código
//NÃO FUNCIONA POR ENQUANTO


function Estoque() {
    const [addingStockItem, setAddingStockItem] = useState(false);
    const [item, setItem] = useState({ inventory: [] });
    const [error, setError] = useState(null);

    const config = pageConfig[page] || pageConfig.Estoque;

    const pageConfig = {
        Estoque: {
            subtitle: 'Visão geral dos produtos armazenados',
            columns: ['Produto', 'Categoria', 'Localização', 'Quantidade', 'Status'],
            stats: ['Produtos', 'Estoque baixo', 'Categorias', 'Ocupação']
        }
    };

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
                <DataTable columns={config.columns} data={item.inventory} />
            </Card>
        </div>
    );
}