import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'

const SEARCH_RADIUS_METERS = 8000 // 8km

export default function WorkerJobRequests() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [workerProfile, setWorkerProfile] = useState(null)
  const [nearbyJobs, setNearbyJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [statusMsg, setStatusMsg] = useState('')

  const loadNearbyJobs = useCallback(async (wp) => {
    if (!wp?.lat || !wp?.lng || !wp.skills?.length) {
      setNearbyJobs([])
      return
    }
    const { data, error } = await supabase.rpc('find_nearby_bookings_for_worker', {
      worker_lat: wp.lat,
      worker_lng: wp.lng,
      radius_meters: SEARCH_RADIUS_METERS,
      worker_skills: wp.skills,
    })
    if (error) setStatusMsg(error.message)
    else setNearbyJobs(data || [])
  }, [])

  const loadMyJobs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
    setMyJobs(data || [])
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setWorkerProfile(data)
        loadNearbyJobs(data)
      })
    loadMyJobs()
  }, [user, loadNearbyJobs, loadMyJobs])

  async function acceptJob(bookingId) {
    setStatusMsg('Accepting...')
    const { data, error } = await supabase
      .from('bookings')
      .update({ worker_id: user.id, status: 'accepted' })
      .eq('id', bookingId)
      .is('worker_id', null)
      .select()

    if (error) {
      setStatusMsg(error.message)
      return
    }
    setStatusMsg(data.length === 0 ? 'Too late — another worker already accepted this job.' : '✅ Job accepted!')
    loadNearbyJobs(workerProfile)
    loadMyJobs()
  }

  async function advanceStatus(bookingId, nextStatus) {
    const { error } = await supabase.from('bookings').update({ status: nextStatus }).eq('id', bookingId)
    if (error) setStatusMsg(error.message)
    setMyJobs((prev) => prev.map((j) => (j.id === bookingId ? { ...j, status: nextStatus } : j)))
  }

  const activeJobs = myJobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled')

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>{t('welcome')}, {profile?.full_name} 🔧</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </div>
      <Link to="/worker/profile">{t('my_profile_title')} →</Link>

      {statusMsg && <p style={{ marginTop: 10 }}>{statusMsg}</p>}

      {!workerProfile?.lat && (
        <p style={{ background: '#fff3e0', padding: 10, borderRadius: 6, marginTop: 16 }}>
          Set your skills and location in <Link to="/worker/profile">{t('my_profile_title')}</Link> to start seeing job requests.
        </p>
      )}

      <h2 style={{ marginTop: 24 }}>{t('new_requests_near_you')}</h2>
      {nearbyJobs.length === 0 && <p style={{ color: '#666' }}>{t('no_requests_nearby')}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {nearbyJobs.map((job) => (
          <li key={job.booking_id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <b>{job.service_name}</b>{job.is_emergency && ' 🚨 Emergency'}
            <div style={{ fontSize: 13, color: '#666' }}>{(job.distance_meters / 1000).toFixed(1)} km away</div>
            <button onClick={() => acceptJob(job.booking_id)} style={{ marginTop: 6 }}>{t('accept_job')}</button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 24 }}>{t('my_active_jobs')}</h2>
      {activeJobs.length === 0 && <p style={{ color: '#666' }}>{t('no_active_jobs')}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activeJobs.map((job) => (
          <li key={job.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <b>{job.services?.name}</b> — status: <b>{job.status}</b>
            <div style={{ marginTop: 6 }}>
              {job.status === 'accepted' && (
                <button onClick={() => advanceStatus(job.id, 'in_progress')}>{t('start_job')}</button>
              )}
              {job.status === 'in_progress' && (
                <button onClick={() => advanceStatus(job.id, 'completed')}>{t('mark_completed')}</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
