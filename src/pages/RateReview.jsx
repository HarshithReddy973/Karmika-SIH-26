import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { LoadingRow } from '../components/ui/Feedback'

export default function RateReview() {
  const { bookingId } = useParams()
  const { t } = useTranslation()

  const [booking, setBooking] = useState(null)
  const [existingRating, setExistingRating] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: b, error } = await supabase
        .from('bookings')
        .select('*, services(name), worker:worker_id(full_name)')
        .eq('id', bookingId)
        .single()
      if (error) {
        setErrorMsg(error.message)
        return
      }
      setBooking(b)

      const { data: existing } = await supabase
        .from('ratings')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle()
      if (existing) {
        setExistingRating(existing)
        setRating(existing.rating)
        setComment(existing.comment || '')
      }
    }
    load()
  }, [bookingId])

  // Recomputes this worker's overall rating_avg from every rating they've
  // ever received - two simple queries (bookings, then ratings for those
  // booking ids) rather than one clever embedded-filter query, matching
  // the same safe pattern used in the Demand Forecast admin page.
  async function recomputeWorkerRating(workerId) {
    const { data: workerBookings } = await supabase.from('bookings').select('id').eq('worker_id', workerId)
    const ids = (workerBookings || []).map((b) => b.id)
    if (ids.length === 0) return

    const { data: ratings } = await supabase.from('ratings').select('rating').in('booking_id', ids)
    if (!ratings || ratings.length === 0) return

    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    await supabase
      .from('worker_profiles')
      .update({ rating_avg: Math.round(avg * 10) / 10 })
      .eq('user_id', workerId)
  }

  async function submitReview() {
    setErrorMsg('')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('ratings').upsert({
        ...(existingRating?.id ? { id: existingRating.id } : {}),
        booking_id: bookingId,
        rating,
        comment,
      })
      if (error) throw error

      if (booking.worker_id) {
        await recomputeWorkerRating(booking.worker_id)
      }
      setDone(true)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (errorMsg && !booking) return <div className="page"><div className="alert alert-danger">{errorMsg}</div></div>
  if (!booking) return <div className="page"><LoadingRow>{t('loading')}</LoadingRow></div>

  return (
    <div className="page page-narrow">
      <Link to={`/customer/bookings/${bookingId}`} className="eyebrow-link">← {t('track_this_booking')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('rate_this_service')}</h1>
        <p className="page-subtitle">{booking.services?.name} — {booking.worker?.full_name}</p>
      </div>

      {done || existingRating ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>{'⭐'.repeat(rating)}</div>
          {comment && <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: 8 }}>&ldquo;{comment}&rdquo;</p>}
          <p style={{ color: 'var(--color-success-text)', marginTop: 8 }}>{t('thank_you_review_msg')}</p>
        </div>
      ) : (
        <div className="card stack">
          <div style={{ textAlign: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="btn-star"
                style={{ opacity: n <= rating ? 1 : 0.3 }}
                aria-label={`${n} star`}
              >
                ⭐
              </button>
            ))}
          </div>
          <textarea
            placeholder={t('comment_label')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
          <button onClick={submitReview} disabled={submitting} className="btn-primary btn-block">
            {submitting ? t('loading') : t('submit_review')}
          </button>
        </div>
      )}
    </div>
  )
}
