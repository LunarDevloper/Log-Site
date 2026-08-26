export default function DataTable({ columns }) {
  return (
    <div className="table-wrap">

      <table>

        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>

          {[1, 2, 3].map((row) => (
            <tr key={row}>

              {columns.map((col, i) => (
                <td
                  key={col}
                  data-label={col}
                >
                  {i === 0
                    ? "—"
                    : <span className="skeleton" />
                  }
                </td>
              ))}

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}