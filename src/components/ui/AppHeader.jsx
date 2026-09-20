// Purely presentational shared top bar - takes whatever action buttons a
// page already renders (language switcher, logout) as children. Doesn't
// wrap or alter any handler logic, just gives every authenticated page
// the same consistent brand header instead of each one building its own.
export default function AppHeader({ children }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-mark">K</span>
          Karmika
        </div>
        <div className="topbar-actions">{children}</div>
      </div>
    </header>
  )
}
