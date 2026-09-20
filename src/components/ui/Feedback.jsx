// Both purely presentational - just consistent wrappers around whatever
// text a page already passes as children. No state, no handlers.

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>
}

export function LoadingRow({ children }) {
  return (
    <div className="loading-row">
      <span className="spinner" />
      <span>{children}</span>
    </div>
  )
}
