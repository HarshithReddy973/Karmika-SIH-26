import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { computeBreakdown, PLATFORM_FEE_PERCENT, WELFARE_PERCENT } from '../lib/payment'
import { LoadingRow } from '../components/ui/Feedback'

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

  if (errorMsg && !booking) return <div className="page"><div className="alert alert-danger">{errorMsg}</div></div>
  if (!booking) return <div className="page"><LoadingRow>{t('loading')}</LoadingRow></div>

  const breakdown = computeBreakdown(booking.services.base_price)

  return (
    <div className="page page-narrow">
      <Link to={`/customer/bookings/${bookingId}`} className="eyebrow-link">← {t('track_this_booking')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('payment_summary_title')}</h1>
        <p className="page-subtitle">{booking.services.name}</p>
      </div>

      <div className="card">
        <Row label={t('service_cost')} value={breakdown.basePrice} />
        <Row label={`${t('platform_fee')} (${PLATFORM_FEE_PERCENT}%)`} value={-breakdown.platformFee} />
        <hr />
        <Row label={t('worker_payout')} value={breakdown.workerPayout} bold />
        <p className="helper-text" style={{ marginTop: 10 }}>
          Includes ₹{breakdown.welfareContribution} ({WELFARE_PERCENT}%) contributed to the
          Worker Welfare Fund on your behalf.
        </p>
      </div>

      {errorMsg && <div className="alert alert-danger" style={{ marginTop: 12 }}>{errorMsg}</div>}

      {!paid ? (
        <button onClick={handlePayNow} disabled={paying} className="btn-primary btn-block btn-lg" style={{ marginTop: 16 }}>
          {paying ? t('processing_payment') : `${t('pay_now')} — ₹${breakdown.basePrice}`}
        </button>
      ) : (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p style={{ marginBottom: 14 }}>{t('payment_success_msg')}</p>
          <button className="btn-outline" onClick={() => navigate('/customer/bookings')}>{t('back_to_bookings')}</button>
        </div>
      )}

      <p className="helper-text" style={{ marginTop: 24, textAlign: 'center' }}>
        This is a prototype payment flow — no real transaction occurs. Real gateway
        integration (e.g. Razorpay sandbox) is the planned next step post-prototype.
      </p>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="row" style={{ fontWeight: bold ? 700 : 400, margin: '4px 0' }}>
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}₹{Math.abs(value)}</span>
    </div>
  )
}
