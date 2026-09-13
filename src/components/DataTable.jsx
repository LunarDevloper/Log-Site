export default function DataTable({ columns, data, loading, emptyTitle = `Nada por aqui ainda`, emptySubtitle = `Quando houver dados, eles aparecem nesta lista.`, emptyActionLabel, onEmptyAction }) {
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {columns.map((col, i) => (
                <td key={col} data-label={col}>
                  {row[i] ?? `--`}
                </td>
              ))}
            </tr>
          ))}
          {loading && rows.length === 0 && [1, 2, 3].map((row) => (
            <tr key={`loading-${row}`}>
              {columns.map((col) => (
                <td key={col} data-label={col}>
                  <span className="skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📦</div>
          <strong>{emptyTitle}</strong>
          <span>{emptySubtitle}</span>
          {emptyActionLabel && (
            <button type="button" className="primary-button" onClick={onEmptyAction} style={{ marginTop: 8 }}>
              {emptyActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
