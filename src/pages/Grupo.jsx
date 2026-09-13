import Card from "../components/Card";
import dogRobot from "../assets/dog-robot.png";

const kpis = ["Total em estoque", "Pedidos do dia", "Robôs ativos", "Produtividade", "Expedições", "Pendências"];

export default function Dashboard() {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span>Início / Dashboard</span>
            <h1>Dashboard</h1><p>Visão geral das operações logísticas</p>
          </div>
        <button className="primary-button">Atualizar</button>
      </div>

      <div className="kpi-grid">

        {kpis.map((label) => 
          <Card key={label} className="stat">
            <span>{label}</span>
              <strong>--</strong>
                <small>Aguardando dados</small>
          </Card>)}
          
      </div>

      <div className="dashboard-grid">
        <Card title="Operações em tempo real" subtitle="Atividades recentes">
          <div className="empty-state"><div className="empty-icon">✓</div><strong>Nenhuma atividade registrada</strong><span>Os eventos aparecerão aqui.</span></div>
        </Card>

        <Card title="Mapa do armazém" subtitle="Rastreamento visual da rota do robô">
          <div className="warehouse-map warehouse-map--tracking">
            <div className="map-grid" />

            <svg className="robot-route" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="13,12 13,50 61,50 61,31 85,31" />
            </svg>

            <span className="map-dot destination-dot destination-dot-one" title="Destino" />
            <span className="map-dot destination-dot destination-dot-two" title="Destino" />
            <span className="map-dot product-dot" title="Produto" />

            <img className="dog-robot dog-robot-start" src={dogRobot} alt="Robô cachorro no ponto inicial da rota" title="Robô" />

            <div className="map-legend">
              <span><i className="legend-dot legend-robot" />Robô</span>
              <span><i className="legend-dot legend-product" />Produto</span>
              <span><i className="legend-dot legend-destination" />Destino</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="charts-grid">
        <Card title="Movimentações por hora">
          <div className="fake-chart bars">{[32, 55, 40, 72, 60, 85, 45, 68, 52, 76].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
        </Card>
        <Card title="Produtividade diária">
          <div className="fake-chart line">
            <svg viewBox="0 0 500 160" preserveAspectRatio="none">
              <polyline points="0,130 60,110 120,118 180,75 240,90 300,55 360,70 420,35 500,48" />
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
}
