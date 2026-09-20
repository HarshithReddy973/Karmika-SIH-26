import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { computeBreakdown } from '../lib/payment'
import { mapLink, formatDateTime } from '../lib/jobDisplay'

export default function WorkerJobCompletion() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [booking, setBooking] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, services(name, base_price), customer:customer_id(full_name, phone)')
      .eq('id', bookingId)
      .single()
      .then(({ data, error }) => {
        if (error) setErrorMsg(error.message)
        else setBooking(data)
      })
  }, [bookingId])

  async function confirmCompletion() {
    setErrorMsg('')
    setConfirming(true)
    try {
      // Guard: only the assigned worker can complete it, and only from
      // in_progress - protects against a stale page/back-button re-submit.
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('worker_id', user.id)
        .eq('status', 'in_progress')
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('This job could not be marked completed — it may have already been updated elsewhere.')
      }
      setDone(true)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (errorMsg && !booking) return <p style={{ color: 'red', padding: 20 }}>{errorMsg}</p>
  if (!booking) return <p style={{ padding: 20 }}>{t('loading')}</p>

  const alreadyPastInProgress = !['in_progress'].includes(booking.status) && !done
  const payout = computeBreakdown(booking.services.base_price).workerPayout

  return (
    <div style={{ maxWidth: 480, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to="/worker">← {t('my_active_jobs')}</Link>
      <h2>{t('complete_job_confirm_title')}</h2>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <b>{booking.services.name}</b>
        <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
          {t('customer_label')}: {booking.customer?.full_name || '—'}
          {booking.customer?.phone ? ` (${booking.customer.phone})` : ''}
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          {t('scheduled_for')}: {booking.is_emergency ? 'ASAP' : formatDateTime(booking.scheduled_time)}
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>{t('booked_at')}: {formatDateTime(booking.created_at)}</div>
        {booking.accepted_at && (
          <div style={{ fontSize: 13, color: '#666' }}>{t('accepted_at_label')}: {formatDateTime(booking.accepted_at)}</div>
        )}
        {mapLink(booking.lat, booking.lng) && (
          <a href={mapLink(booking.lat, booking.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
            📍 {t('view_location')}
          </a>
        )}
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>{t('expected_payout')}</span>
          <span>₹{payout}</span>
        </div>
        <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          Final amount is confirmed once the customer pays on their end.
        </p>
      </div>

      {errorMsg && <p style={{ color: 'red', marginTop: 10 }}>{errorMsg}</p>}

      {done ? (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p>Job marked as completed. The customer has been notified to proceed with payment.</p>
          <button onClick={() => navigate('/worker')}>{t('my_active_jobs')}</button>
        </div>
      ) : alreadyPastInProgress ? (
        <p style={{ marginTop: 16, color: '#666' }}>
          This job is already in status <b>{booking.status}</b> — nothing to confirm here.
        </p>
      ) : (
        <button onClick={confirmCompletion} disabled={confirming} style={{ marginTop: 16, width: '100%', padding: 12, fontSize: 15 }}>
          {confirming ? t('loading') : `✅ ${t('confirm_completion')}`}
        </button>
      )}
    </div>
  )
}
