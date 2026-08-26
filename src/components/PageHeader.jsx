export default function PageHeader({ page, subtitle }) {
  return (
    <div className="page-heading">

      <div>
        <span>Início / {page}</span>
        <h1>{page}</h1>
        <p>{subtitle}</p>
      </div>

      <button className="primary-button">
        Adicionar
      </button>

    </div>
  );
}