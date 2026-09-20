import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

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
      <h3>All Bookings</h3>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {loading && <p>Loading...</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: '4px 8px' }}>Service</th>
              <th style={{ padding: '4px 8px' }}>Customer</th>
              <th style={{ padding: '4px 8px' }}>Worker</th>
              <th style={{ padding: '4px 8px' }}>Status</th>
              <th style={{ padding: '4px 8px' }}>Booked</th>
              <th style={{ padding: '4px 8px' }}>Accepted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '4px 8px' }}>{b.services?.name}</td>
                <td style={{ padding: '4px 8px' }}>{b.customer?.full_name}</td>
                <td style={{ padding: '4px 8px' }}>{b.worker?.full_name || '—'}</td>
                <td style={{ padding: '4px 8px' }}>{b.status}</td>
                <td style={{ padding: '4px 8px' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '4px 8px' }}>{b.accepted_at ? new Date(b.accepted_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !loading && <p style={{ color: '#666' }}>No bookings match this filter.</p>}
    </div>
  )
}
