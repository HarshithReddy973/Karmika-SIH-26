import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { EmptyState, LoadingRow } from '../ui/Feedback'

export default function WelfareOverview() {
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('welfare_contributions')
      .select('*, worker:worker_id(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setRows(data || [])
        setTotal((data || []).reduce((sum, r) => sum + Number(r.amount), 0))
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingRow>Loading...</LoadingRow>

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Worker Welfare Fund</h3>
      <p className="helper-text" style={{ marginBottom: 16 }}>
        Auto-accumulates a small contribution every time a customer pays for a completed
        job (Phase 6's Payment Summary screen writes to this automatically). Numbers here
        will start showing up as soon as your team completes a full booking → payment
        cycle in testing.
      </p>

      <div className="card" style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', marginBottom: 16 }}>
        <div className="section-title" style={{ color: 'var(--color-primary)' }}>Total Fund Balance</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>₹{total.toFixed(2)}</div>
      </div>

      {rows.length === 0 && <EmptyState>No contributions recorded yet.</EmptyState>}

      <div className="stack-sm">
        {rows.map((r) => (
          <div key={r.id} className="card row" style={{ padding: '10px 16px' }}>
            <span>{r.worker?.full_name || 'Unknown worker'}</span>
            <span style={{ fontWeight: 600 }}>₹{r.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
