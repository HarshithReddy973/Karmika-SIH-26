import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { mapLink, formatDateTime } from '../lib/jobDisplay'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AppHeader from '../components/ui/AppHeader'
import { EmptyState } from '../components/ui/Feedback'

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
    <>
      <AppHeader>
        <LanguageSwitcher />
        <button className="btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
      </AppHeader>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">{t('new_requests_near_you')}</h1>
          <p className="page-subtitle">{t('welcome')}, {profile?.full_name} 🔧</p>
        </div>

        <Link to="/worker/profile" className="eyebrow-link">{t('my_profile_title')} →</Link>

        {statusMsg && <div className="alert alert-info" style={{ marginTop: 12 }}>{statusMsg}</div>}

        {!workerProfile?.lat && (
          <div className="alert alert-warning" style={{ marginTop: 16 }}>
            Set your skills and location in <Link to="/worker/profile">{t('my_profile_title')}</Link> to start seeing job requests.
          </div>
        )}

        <div className="section-title" style={{ marginTop: 24 }}>{t('new_requests_near_you')}</div>
        {nearbyJobs.length === 0 && <EmptyState>{t('no_requests_nearby')}</EmptyState>}
        <div className="stack">
          {nearbyJobs.map((job) => (
            <div key={job.booking_id} className="card">
              <div className="card-title-row">
                <div style={{ fontWeight: 600 }}>{job.service_name}</div>
                {job.is_emergency && <span className="badge badge-danger">Emergency</span>}
              </div>
              <div className="list-meta">{(job.distance_meters / 1000).toFixed(1)} km away</div>
              <div className="list-meta">
                {t('scheduled_for')}: {job.is_emergency ? 'ASAP' : formatDateTime(job.scheduled_time)}
              </div>
              <div className="list-meta">{t('requested_at')}: {formatDateTime(job.created_at)}</div>
              {mapLink(job.lat, job.lng) && (
                <a href={mapLink(job.lat, job.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  📍 {t('view_location')}
                </a>
              )}
              <div style={{ marginTop: 10 }}>
                <button className="btn-primary btn-sm" onClick={() => acceptJob(job.booking_id)} disabled={busyJobId === job.booking_id}>
                  {t('accept_job')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 28 }}>{t('my_active_jobs')}</div>
        {activeJobs.length === 0 && <EmptyState>{t('no_active_jobs')}</EmptyState>}
        <div className="stack">
          {activeJobs.map((job) => (
            <div key={job.id} className="card">
              <div className="card-title-row">
                <div style={{ fontWeight: 600 }}>{job.services?.name}</div>
                <span className="badge badge-neutral">{job.status.replace('_', ' ')}</span>
              </div>
              <div className="list-meta">{t('customer_label')}: {job.customer?.full_name || '—'}</div>
              <div className="list-meta">
                {t('scheduled_for')}: {job.is_emergency ? 'ASAP' : formatDateTime(job.scheduled_time)}
              </div>
              <div className="list-meta">{t('booked_at')}: {formatDateTime(job.created_at)}</div>
              {job.accepted_at && (
                <div className="list-meta">{t('accepted_at_label')}: {formatDateTime(job.accepted_at)}</div>
              )}
              {mapLink(job.lat, job.lng) && (
                <a href={mapLink(job.lat, job.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  📍 {t('view_location')}
                </a>
              )}

              <div style={{ marginTop: 10 }}>
                {job.status === 'accepted' && (
                  <>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => startJob(job.id)}
                      disabled={busyJobId === job.id || (hasInProgressJob && job.status !== 'in_progress')}
                    >
                      {t('start_job')}
                    </button>
                    {hasInProgressJob && (
                      <p className="helper-text" style={{ color: 'var(--color-warning-text)', marginTop: 6 }}>
                        {t('cannot_start_job_msg')}
                      </p>
                    )}
                  </>
                )}
                {job.status === 'in_progress' && (
                  <Link to={`/worker/job/${job.id}/complete`}>
                    <button className="btn-primary btn-sm">{t('mark_completed')}</button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
