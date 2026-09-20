import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { LoadingRow } from '../components/ui/Feedback'

const STEPS = ['pending', 'accepted', 'in_progress', 'completed', 'confirmed']
const STEP_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  confirmed: 'Paid',
}

export default function BookingTracker() {
  const { bookingId } = useParams()
  const { t } = useTranslation()
  const [booking, setBooking] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, services(name), worker:worker_id(full_name)')
      .eq('id', bookingId)
      .single()
      .then(({ data, error }) => {
        if (error) setErrorMsg(error.message)
        else setBooking(data)
      })

    const channel = supabase
      .channel(`booking-tracker-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => setBooking((prev) => ({ ...prev, ...payload.new }))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [bookingId])

  if (errorMsg) return <div className="page"><div className="alert alert-danger">{errorMsg}</div></div>
  if (!booking) return <div className="page"><LoadingRow>{t('loading')}</LoadingRow></div>

  const currentIndex = STEPS.indexOf(booking.status)

  return (
    <div className="page">
      <Link to="/customer/bookings" className="eyebrow-link">← {t('back_to_bookings')}</Link>

      <div className="page-header">
        <h1 className="page-title">{booking.services?.name}</h1>
        <p className="page-subtitle">
          {t('worker_label')}: <b>{booking.worker?.full_name || t('not_yet_assigned')}</b>
        </p>
      </div>

      <div className="card">
        <div className="section-title">Status</div>
        <div className="stepper">
          {STEPS.map((step, i) => (
            <span key={step} className={`step-pill ${i <= currentIndex ? 'done' : ''}`}>
              {STEP_LABELS[step]}
            </span>
          ))}
          {booking.status === 'cancelled' && <span className="step-pill cancelled">Cancelled</span>}
        </div>
      </div>

      {booking.status === 'completed' && (
        <Link to={`/customer/bookings/${bookingId}/payment`}>
          <button className="btn-primary btn-block btn-lg" style={{ marginTop: 16 }}>
            {t('proceed_to_payment')} →
          </button>
        </Link>
      )}

      {booking.status === 'confirmed' && (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          ✅ {t('paid_label')} — <Link to={`/customer/bookings/${bookingId}/payment`}>view receipt</Link>
          {' · '}
          <Link to={`/customer/bookings/${bookingId}/review`}>{t('rate_this_service')}</Link>
        </div>
      )}

      <p className="helper-text" style={{ marginTop: 16 }}>{t('live_update_note')}</p>
    </div>
  )
}
