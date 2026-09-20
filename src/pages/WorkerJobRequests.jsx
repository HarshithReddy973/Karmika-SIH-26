import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { mapLink, formatDateTime } from '../lib/jobDisplay'
import LanguageSwitcher from '../components/LanguageSwitcher'

const SEARCH_RADIUS_METERS = 8000 // 8km

export default function WorkerJobRequests() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [workerProfile, setWorkerProfile] = useState(null)
  const [nearbyJobs, setNearbyJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [statusMsg, setStatusMsg] = useState('')
  const [busyJobId, setBusyJobId] = useState(null) // disables buttons mid-request, prevents double-clicks

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
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name), customer:customer_id(full_name)')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setStatusMsg(error.message)
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
    setBusyJobId(bookingId)
    setStatusMsg('Accepting...')
    // Conditional update (worker_id must still be null) prevents two
    // workers from both grabbing the same job in a race condition.
    // Accepting does NOT start the job - a worker can hold several
    // accepted jobs at once, they just can't be "in progress" on more
    // than one simultaneously (enforced in startJob below).
    const { data, error } = await supabase
      .from('bookings')
      .update({ worker_id: user.id, status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', bookingId)
      .is('worker_id', null)
      .select()

    setBusyJobId(null)
    if (error) {
      setStatusMsg(error.message)
      return
    }
    setStatusMsg(data.length === 0 ? 'Too late — another worker already accepted this job.' : '✅ Job accepted!')
    loadNearbyJobs(workerProfile)
    loadMyJobs()
  }

  async function startJob(bookingId) {
    setBusyJobId(bookingId)
    setStatusMsg('Checking your other jobs...')

    // Re-check against the database fresh (not just local state) so
    // this stays correct even if another tab/device changed something.
    const { data: activeJobs, error: checkErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('worker_id', user.id)
      .eq('status', 'in_progress')

    if (checkErr) {
      setBusyJobId(null)
      setStatusMsg(checkErr.message)
      return
    }

    const alreadyHasActiveJob = activeJobs.some((j) => j.id !== bookingId)
    if (alreadyHasActiveJob) {
      setBusyJobId(null)
      setStatusMsg(t('cannot_start_job_msg'))
      return
    }

    const { error: updErr } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', bookingId)
    setBusyJobId(null)
    if (updErr) {
      setStatusMsg(updErr.message)
      return
    }
    setStatusMsg('')
    setMyJobs((prev) => prev.map((j) => (j.id === bookingId ? { ...j, status: 'in_progress' } : j)))
  }

  const activeJobs = myJobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'confirmed')
  const hasInProgressJob = myJobs.some((j) => j.status === 'in_progress')

  return (
    <div style={{ maxWidth: 560, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
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
            <div style={{ fontSize: 13, color: '#666' }}>
              {t('scheduled_for')}: {job.is_emergency ? 'ASAP' : formatDateTime(job.scheduled_time)}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {t('requested_at')}: {formatDateTime(job.created_at)}
            </div>
            {mapLink(job.lat, job.lng) && (
              <a href={mapLink(job.lat, job.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                📍 {t('view_location')}
              </a>
            )}
            <div style={{ marginTop: 6 }}>
              <button onClick={() => acceptJob(job.booking_id)} disabled={busyJobId === job.booking_id}>
                {t('accept_job')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 24 }}>{t('my_active_jobs')}</h2>
      {activeJobs.length === 0 && <p style={{ color: '#666' }}>{t('no_active_jobs')}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activeJobs.map((job) => (
          <li key={job.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{job.services?.name}</b>
              <span style={{ fontSize: 12, color: '#666' }}>{job.status}</span>
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {t('customer_label')}: {job.customer?.full_name || '—'}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {t('scheduled_for')}: {job.is_emergency ? 'ASAP' : formatDateTime(job.scheduled_time)}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>{t('booked_at')}: {formatDateTime(job.created_at)}</div>
            {job.accepted_at && (
              <div style={{ fontSize: 13, color: '#666' }}>{t('accepted_at_label')}: {formatDateTime(job.accepted_at)}</div>
            )}
            {mapLink(job.lat, job.lng) && (
              <a href={mapLink(job.lat, job.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                📍 {t('view_location')}
              </a>
            )}

            <div style={{ marginTop: 8 }}>
              {job.status === 'accepted' && (
                <>
                  <button
                    onClick={() => startJob(job.id)}
                    disabled={busyJobId === job.id || (hasInProgressJob && job.status !== 'in_progress')}
                  >
                    {t('start_job')}
                  </button>
                  {hasInProgressJob && (
                    <p style={{ fontSize: 12, color: '#e65100', marginTop: 4 }}>{t('cannot_start_job_msg')}</p>
                  )}
                </>
              )}
              {job.status === 'in_progress' && (
                <Link to={`/worker/job/${job.id}/complete`}>
                  <button>{t('mark_completed')}</button>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
