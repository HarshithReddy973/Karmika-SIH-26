import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { rankWorkers } from '../lib/matchingScore'
import { EmptyState, LoadingRow } from '../components/ui/Feedback'

const SEARCH_RADIUS_METERS = 8000 // 8km

export default function MatchedWorkers() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('*, services(category, name)')
        .eq('id', bookingId)
        .single()

      if (bErr) { setErrorMsg(bErr.message); setLoading(false); return }

      const { data: nearby, error: rpcErr } = await supabase.rpc('find_nearby_workers', {
        customer_lat: booking.lat,
        customer_lng: booking.lng,
        radius_meters: SEARCH_RADIUS_METERS,
        service_category: booking.services.category,
      })

      if (rpcErr) { setErrorMsg(rpcErr.message); setLoading(false); return }

      setWorkers(rankWorkers(nearby || []))
      setLoading(false)
    }
    load()
  }, [bookingId])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('matched_workers_title')}</h1>
      </div>

      {loading && <LoadingRow>{t('searching_workers')}</LoadingRow>}
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

      {!loading && workers.length === 0 && (
        <EmptyState>
          No verified workers matched yet within {SEARCH_RADIUS_METERS / 1000}km for this
          service. Your request is still posted — any nearby worker with this skill who
          gets verified can still pick it up from their Job Requests screen.
        </EmptyState>
      )}

      {!loading && workers.length > 0 && (
        <>
          <p className="helper-text" style={{ marginBottom: 12 }}>
            Ranked by distance, rating, and fair job-rotation (so the same top worker
            isn't always picked). Your request has been posted to all of them — whoever
            accepts first gets the job.
          </p>
          <div className="stack">
            {workers.map((w) => (
              <div key={w.worker_id} className="card">
                <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                <div className="list-meta">
                  {(w.distance_meters / 1000).toFixed(1)} km away · rating{' '}
                  {w.rating_avg ? w.rating_avg.toFixed(1) : 'New worker'} · match score{' '}
                  {w.score.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="btn-primary btn-block btn-lg"
        style={{ marginTop: 20 }}
        onClick={() => navigate(`/customer/bookings/${bookingId}`)}
      >
        {t('track_this_booking')} →
      </button>
    </div>
  )
}
