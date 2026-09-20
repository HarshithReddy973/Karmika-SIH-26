import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'

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

  if (errorMsg && !booking) return <p style={{ color: 'red', padding: 20 }}>{errorMsg}</p>
  if (!booking) return <p style={{ padding: 20 }}>{t('loading')}</p>

  return (
    <div style={{ maxWidth: 460, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to={`/customer/bookings/${bookingId}`}>← {t('track_this_booking')}</Link>
      <h2>{t('rate_this_service')}</h2>
      <p style={{ color: '#666' }}>{booking.services?.name} — {booking.worker?.full_name}</p>

      {done || existingRating ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 28 }}>{'⭐'.repeat(rating)}</div>
          {comment && <p style={{ fontStyle: 'italic', color: '#555' }}>&ldquo;{comment}&rdquo;</p>}
          <p style={{ color: 'green' }}>{t('thank_you_review_msg')}</p>
        </div>
      ) : (
        <>
          <div style={{ margin: '16px 0' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                style={{
                  fontSize: 28,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: n <= rating ? 1 : 0.3,
                }}
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
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
          {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
          <button onClick={submitReview} disabled={submitting} style={{ marginTop: 12, width: '100%', padding: 10 }}>
            {submitting ? t('loading') : t('submit_review')}
          </button>
        </>
      )}
    </div>
  )
}
