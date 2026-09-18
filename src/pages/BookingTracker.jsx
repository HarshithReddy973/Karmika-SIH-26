import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'

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

  if (errorMsg) return <p style={{ color: 'red', padding: 20 }}>{errorMsg}</p>
  if (!booking) return <p style={{ padding: 20 }}>{t('loading')}</p>

  const currentIndex = STEPS.indexOf(booking.status)

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to="/customer/bookings">← {t('back_to_bookings')}</Link>
      <h2>{booking.services?.name}</h2>
      <p>{t('worker_label')}: <b>{booking.worker?.full_name || t('not_yet_assigned')}</b></p>

      <div style={{ display: 'flex', gap: 6, margin: '20px 0', flexWrap: 'wrap' }}>
        {STEPS.map((step, i) => (
          <div
            key={step}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              fontSize: 13,
              background: i <= currentIndex ? '#4caf50' : '#e0e0e0',
              color: i <= currentIndex ? 'white' : '#555',
            }}
          >
            {STEP_LABELS[step]}
          </div>
        ))}
        {booking.status === 'cancelled' && (
          <div style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, background: '#e53935', color: 'white' }}>
            Cancelled
          </div>
        )}
      </div>

      {booking.status === 'completed' && (
        <Link to={`/customer/bookings/${bookingId}/payment`}>
          <button style={{ width: '100%', padding: 10 }}>{t('proceed_to_payment')} →</button>
        </Link>
      )}

      {booking.status === 'confirmed' && (
        <div style={{ background: '#e8f5e9', padding: 10, borderRadius: 6 }}>
          ✅ {t('paid_label')} —{' '}
          <Link to={`/customer/bookings/${bookingId}/payment`}>view receipt</Link>
        </div>
      )}

      <p style={{ fontSize: 13, color: '#666', marginTop: 16 }}>{t('live_update_note')}</p>
    </div>
  )
}
