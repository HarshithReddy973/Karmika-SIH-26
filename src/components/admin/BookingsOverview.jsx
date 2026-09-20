import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import StatusBadge from '../ui/StatusBadge'
import { EmptyState, LoadingRow } from '../ui/Feedback'

export default function BookingsOverview() {
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, services(name), customer:customer_id(full_name), worker:worker_id(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setBookings(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter)

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3>All Bookings</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && <LoadingRow>Loading...</LoadingRow>}

      {!loading && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Customer</th>
                <th>Worker</th>
                <th>Status</th>
                <th>Booked</th>
                <th>Accepted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>{b.services?.name}</td>
                  <td>{b.customer?.full_name}</td>
                  <td>{b.worker?.full_name || '—'}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>{b.accepted_at ? new Date(b.accepted_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && !loading && <EmptyState>No bookings match this filter.</EmptyState>}
    </div>
  )
}
