import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

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

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h3>Pending Worker Verifications</h3>
      {msg && <p style={{ color: 'red' }}>{msg}</p>}
      {pending.length === 0 && <p style={{ color: '#666' }}>No pending verifications right now.</p>}

      {pending.map((wp) => (
        <div key={wp.user_id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <b>{wp.users?.full_name}</b> — {wp.users?.phone || 'no phone on file'}
          <div style={{ fontSize: 13, color: '#666' }}>
            Skills: {(wp.skills || []).join(', ') || 'None set yet'}
          </div>
          <div style={{ fontSize: 13, color: '#666' }}>
            Location: {wp.lat ? '✅ set' : '⚠️ not set yet'}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => approve(wp.user_id)}>✅ Approve</button>{' '}
            <button onClick={() => reject(wp.user_id)}>❌ Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}
