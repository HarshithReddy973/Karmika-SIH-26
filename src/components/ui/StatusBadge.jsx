// Pure display component - takes the exact same status string every page
// already has (from the bookings table) and maps it to a consistent
// colored pill instead of each page inventing its own color scheme.
const STATUS_VARIANTS = {
  pending: 'warning',
  accepted: 'info',
  in_progress: 'purple',
  completed: 'info',
  confirmed: 'success',
  cancelled: 'danger',
}

export default function StatusBadge({ status }) {
  const variant = STATUS_VARIANTS[status] || 'neutral'
  const label = (status || '').replace('_', ' ')
  return <span className={`badge badge-${variant}`}>{label}</span>
}
