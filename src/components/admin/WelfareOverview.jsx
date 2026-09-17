import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

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

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h3>Worker Welfare Fund</h3>
      <p style={{ fontSize: 13, color: '#666' }}>
        Auto-accumulates a small contribution per completed job. This table starts
        filling in once Phase 7 wires up automatic contributions on job completion — for
        now it reflects whatever is already in the <code>welfare_contributions</code> table.
      </p>

      <h2>₹{total.toFixed(2)}</h2>

      {rows.length === 0 && <p style={{ color: '#666' }}>No contributions recorded yet.</p>}
      {rows.map((r) => (
        <div key={r.id} style={{ borderBottom: '1px solid #eee', padding: '4px 0', fontSize: 14 }}>
          {r.worker?.full_name || 'Unknown worker'} — ₹{r.amount}
        </div>
      ))}
    </div>
  )
}
