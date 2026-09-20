import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { EmptyState, LoadingRow } from '../ui/Feedback'

// This is the real replacement for "manually flip verified=true in
// Supabase's Table Editor" that we used as a Phase 2-3 stand-in.
export default function VerificationQueue() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*, users(full_name, phone)')
      .eq('verified', false)
    if (error) setMsg(error.message)
    setPending(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function approve(userId) {
    const { error } = await supabase.from('worker_profiles').update({ verified: true }).eq('user_id', userId)
    setMsg(error ? error.message : '')
    load()
  }

  async function reject(userId) {
    if (!confirm('Reject and remove this worker profile? They can fill it in again and resubmit.')) return
    const { error } = await supabase.from('worker_profiles').delete().eq('user_id', userId)
    setMsg(error ? error.message : '')
    load()
  }

  if (loading) return <LoadingRow>Loading...</LoadingRow>

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Pending Worker Verifications</h3>
      {msg && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{msg}</div>}
      {pending.length === 0 && <EmptyState>No pending verifications right now.</EmptyState>}

      <div className="stack">
        {pending.map((wp) => (
          <div key={wp.user_id} className="card">
            <div style={{ fontWeight: 600 }}>{wp.users?.full_name}</div>
            <div className="list-meta">{wp.users?.phone || 'no phone on file'}</div>
            <div className="list-meta">Skills: {(wp.skills || []).join(', ') || 'None set yet'}</div>
            <div className="list-meta">Location: {wp.lat ? '✅ set' : '⚠️ not set yet'}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn-primary btn-sm" onClick={() => approve(wp.user_id)}>✅ Approve</button>
              <button className="btn-danger btn-sm" onClick={() => reject(wp.user_id)}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
