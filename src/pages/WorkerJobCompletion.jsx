import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { computeBreakdown } from '../lib/payment'
import { mapLink, formatDateTime } from '../lib/jobDisplay'
import { LoadingRow } from '../components/ui/Feedback'

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

  if (errorMsg && !booking) return <div className="page"><div className="alert alert-danger">{errorMsg}</div></div>
  if (!booking) return <div className="page"><LoadingRow>{t('loading')}</LoadingRow></div>

  const alreadyPastInProgress = !['in_progress'].includes(booking.status) && !done
  const payout = computeBreakdown(booking.services.base_price).workerPayout

  return (
    <div className="page page-narrow">
      <Link to="/worker" className="eyebrow-link">← {t('my_active_jobs')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('complete_job_confirm_title')}</h1>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600 }}>{booking.services.name}</div>
        <div className="list-meta" style={{ marginTop: 6 }}>
          {t('customer_label')}: {booking.customer?.full_name || '—'}
          {booking.customer?.phone ? ` (${booking.customer.phone})` : ''}
        </div>
        <div className="list-meta">
          {t('scheduled_for')}: {booking.is_emergency ? 'ASAP' : formatDateTime(booking.scheduled_time)}
        </div>
        <div className="list-meta">{t('booked_at')}: {formatDateTime(booking.created_at)}</div>
        {booking.accepted_at && (
          <div className="list-meta">{t('accepted_at_label')}: {formatDateTime(booking.accepted_at)}</div>
        )}
        {mapLink(booking.lat, booking.lng) && (
          <a href={mapLink(booking.lat, booking.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
            📍 {t('view_location')}
          </a>
        )}
        <hr />
        <div className="row" style={{ fontWeight: 700 }}>
          <span>{t('expected_payout')}</span>
          <span>₹{payout}</span>
        </div>
        <p className="helper-text" style={{ marginTop: 4 }}>
          Final amount is confirmed once the customer pays on their end.
        </p>
      </div>

      {errorMsg && <div className="alert alert-danger" style={{ marginTop: 12 }}>{errorMsg}</div>}

      {done ? (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p style={{ marginBottom: 14 }}>Job marked as completed. The customer has been notified to proceed with payment.</p>
          <button className="btn-outline" onClick={() => navigate('/worker')}>{t('my_active_jobs')}</button>
        </div>
      ) : alreadyPastInProgress ? (
        <p className="helper-text" style={{ marginTop: 16 }}>
          This job is already in status <b>{booking.status}</b> — nothing to confirm here.
        </p>
      ) : (
        <button onClick={confirmCompletion} disabled={confirming} className="btn-primary btn-block btn-lg" style={{ marginTop: 16 }}>
          {confirming ? t('loading') : `✅ ${t('confirm_completion')}`}
        </button>
      )}
    </div>
  )
}
