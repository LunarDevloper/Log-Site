import Card from "./Card";

export default function Stats({ stats }) {
  return (
    <div className="stat-grid">

      {stats.map((item) => (
        <Card key={item} className="stat">

          <span>{item}</span>

          <strong>--</strong>

          <small>
            Aguardando dados
          </small>

        </Card>
      ))}

    </div>
  );
}