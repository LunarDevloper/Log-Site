import Card from "./Card";

export default function Stats({ stats }) {
  const items = stats.map((item) =>
    typeof item === `string` ? { label: item, value: `--`, hint: `Em breve` } : item,
  );
  return (
    <div className="stat-grid">
      {items.map(({ label, value, hint }) => (
        <Card key={label} className="stat">
          <span>{label}</span>
          <strong>{value ?? `--`}</strong>
          <small>{hint ?? `Em breve`}</small>
        </Card>
      ))}
    </div>
  );
}
