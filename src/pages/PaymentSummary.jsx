import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { computeBreakdown, PLATFORM_FEE_PERCENT, WELFARE_PERCENT } from '../lib/payment'

export default function PaymentSummary() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [booking, setBooking] = useState(null)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, services(name, base_price)')
      .eq('id', bookingId)
      .single()
      .then(({ data, error }) => {
        if (error) setErrorMsg(error.message)
        else {
          setBooking(data)
          setPaid(data.status === 'confirmed')
        }
      })
  }, [bookingId])

  async function handlePayNow() {
    setErrorMsg('')
    setPaying(true)
    try {
      const breakdown = computeBreakdown(booking.services.base_price)

      // Mock processing delay - no real payment gateway call happens here.
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Phase 7: the moment payment is "confirmed" is when the worker's
      // welfare contribution gets logged - one row per completed+paid job.
      if (booking.worker_id) {
        const { error: welfareErr } = await supabase.from('welfare_contributions').insert({
          worker_id: booking.worker_id,
          booking_id: booking.id,
          amount: breakdown.welfareContribution,
        })
        if (welfareErr) throw welfareErr
      }

      const { error: statusErr } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)
      if (statusErr) throw statusErr

      setPaid(true)
    } catch (err) {
      setErrorMsg(err.message || 'Payment simulation failed.')
    } finally {
      setPaying(false)
    }
  }

  if (errorMsg && !booking) return <p style={{ color: 'red', padding: 20 }}>{errorMsg}</p>
  if (!booking) return <p style={{ padding: 20 }}>{t('loading')}</p>

  const breakdown = computeBreakdown(booking.services.base_price)

  return (
    <div style={{ maxWidth: 480, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to={`/customer/bookings/${bookingId}`}>← {t('track_this_booking')}</Link>
      <h2>{t('payment_summary_title')}</h2>
      <p style={{ color: '#666' }}>{booking.services.name}</p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <Row label={t('service_cost')} value={breakdown.basePrice} />
        <Row label={`${t('platform_fee')} (${PLATFORM_FEE_PERCENT}%)`} value={-breakdown.platformFee} />
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
        <Row label={t('worker_payout')} value={breakdown.workerPayout} bold />
        <p style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
          Includes ₹{breakdown.welfareContribution} ({WELFARE_PERCENT}%) contributed to the
          Worker Welfare Fund on your behalf.
        </p>
      </div>

      {errorMsg && <p style={{ color: 'red', marginTop: 10 }}>{errorMsg}</p>}

      {!paid ? (
        <button onClick={handlePayNow} disabled={paying} style={{ marginTop: 16, width: '100%', padding: 12, fontSize: 15 }}>
          {paying ? t('processing_payment') : `${t('pay_now')} — ₹${breakdown.basePrice}`}
        </button>
      ) : (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p>{t('payment_success_msg')}</p>
          <button onClick={() => navigate('/customer/bookings')}>{t('back_to_bookings')}</button>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#aaa', marginTop: 24, textAlign: 'center' }}>
        This is a prototype payment flow — no real transaction occurs. Real gateway
        integration (e.g. Razorpay sandbox) is the planned next step post-prototype.
      </p>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 'bold' : 'normal', margin: '4px 0' }}>
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}₹{Math.abs(value)}</span>
    </div>
  )
}
