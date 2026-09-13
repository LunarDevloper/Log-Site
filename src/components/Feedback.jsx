export function ErrorBanner({ message, onRetry, onDismiss, retrying }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner__dot" aria-hidden="true">!</span>
      <p>{message}</p>
      <div className="error-banner__actions">
        {onRetry && (
          <button type="button" className="error-banner__btn" onClick={onRetry} disabled={retrying}>
            {retrying ? `Tentando...` : `Tentar de novo`}
          </button>
        )}
        {onDismiss && (
          <button type="button" className="error-banner__btn error-banner__btn--ghost" onClick={onDismiss} aria-label="Dispensar erro">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon = `📦`, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <strong>{title}</strong>
      {subtitle && <span>{subtitle}</span>}
      {actionLabel && (
        <button type="button" className="primary-button" onClick={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, columns = 4 }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Carregando">
      <table>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}><span className="skeleton" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
