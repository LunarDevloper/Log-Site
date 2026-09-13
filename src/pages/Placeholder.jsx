import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Stats from '../components/Stats';
import DataTable from '../components/DataTable';

export default function Placeholder({ title, subtitle, columns, stats, icon = `🚧`, emptyTitle, emptySubtitle, group }) {
  return (
    <div className="page-stack">
      <PageHeader page={title} subtitle={group ? `${subtitle} · ${group.name}` : subtitle} />
      <Stats stats={stats} />
      <Card title={title} subtitle="Em breve com dados reais">
        <DataTable
          columns={columns}
          data={[]}
          loading={false}
          emptyTitle={emptyTitle ?? `${title} em construção`}
          emptySubtitle={emptySubtitle ?? `Estamos preparando esta área. Por enquanto, use Dashboard, Estoque, Movimentações e Equipe.`}
        />
      </Card>
    </div>
  );
}
