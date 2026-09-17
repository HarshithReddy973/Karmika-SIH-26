import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { rankWorkers } from '../lib/matchingScore'

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
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h2>{t('matched_workers_title')}</h2>

      {loading && <p>{t('searching_workers')}</p>}
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      {!loading && workers.length === 0 && (
        <p>
          No verified workers matched yet within {SEARCH_RADIUS_METERS / 1000}km for this
          service. Your request is still posted — any nearby worker with this skill who
          gets verified can still pick it up from their Job Requests screen.
        </p>
      )}

      {!loading && workers.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: '#666' }}>
            Ranked by distance, rating, and fair job-rotation (so the same top worker
            isn't always picked). Your request has been posted to all of them — whoever
            accepts first gets the job.
          </p>
          <ol style={{ paddingLeft: 20 }}>
            {workers.map((w) => (
              <li
                key={w.worker_id}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8, listStyle: 'none' }}
              >
                <b>{w.full_name}</b>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {(w.distance_meters / 1000).toFixed(1)} km away · rating{' '}
                  {w.rating_avg ? w.rating_avg.toFixed(1) : 'New worker'} · match score{' '}
                  {w.score.toFixed(2)}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <button onClick={() => navigate(`/customer/bookings/${bookingId}`)} style={{ marginTop: 10 }}>
        {t('track_this_booking')} →
      </button>
    </div>
  )
}
