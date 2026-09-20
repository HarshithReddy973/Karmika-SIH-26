import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

const ALL_SKILLS = ['electrician', 'plumber', 'cleaning', 'carpenter', 'painter', 'caregiver']

export default function WorkerProfileSetup() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [skills, setSkills] = useState([])
  const [isAvailable, setIsAvailable] = useState(true)
  const [locationSet, setLocationSet] = useState(false)
  const [verified, setVerified] = useState(false)
  const [eShramNumber, setEShramNumber] = useState('')
  const [welfareBalance, setWelfareBalance] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSkills(data.skills || [])
          setIsAvailable(data.is_available)
          setLocationSet(!!data.lat)
          setVerified(data.verified)
          setEShramNumber(data.e_shram_number || '')
        }
      })

    // Phase 7: pull this worker's running welfare fund total.
    supabase
      .from('welfare_contributions')
      .select('amount')
      .eq('worker_id', user.id)
      .then(({ data }) => {
        const total = (data || []).reduce((sum, r) => sum + Number(r.amount), 0)
        setWelfareBalance(total)
      })
  }, [user])

  function toggleSkill(skill) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  async function saveProfile() {
    setStatusMsg('Saving...')
    const { error } = await supabase
      .from('worker_profiles')
      .upsert({ user_id: user.id, skills, is_available: isAvailable, e_shram_number: eShramNumber || null })
    setStatusMsg(error ? error.message : '✅ Saved!')
  }

  function updateLocation() {
    if (!('geolocation' in navigator)) {
      setStatusMsg('Your browser does not support location access.')
      return
    }
    setStatusMsg(t('getting_location'))
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.rpc('set_worker_location', {
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        })
        setStatusMsg(error ? error.message : '✅ Location updated!')
        if (!error) setLocationSet(true)
      },
      (err) => {
        if (err.code === 1) {
          setStatusMsg(
            'Location permission denied. Click the 🔒/ⓘ icon next to the address bar → ' +
            'Site settings → Location → Allow, then try again.'
          )
        } else if (err.code === 3) {
          setStatusMsg('Getting your location timed out — please try again.')
        } else {
          setStatusMsg('Could not get your location (position unavailable) — please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="page">
      <Link to="/worker" className="eyebrow-link">← {t('new_requests_near_you')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('my_profile_title')}</h1>
        <p className="page-subtitle">
          {verified ? (
            <span style={{ color: 'var(--color-success-text)', fontWeight: 600 }}>✅ Verified</span>
          ) : (
            <span style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>⏳ Pending verification</span>
          )}
        </p>
      </div>

      <div className="card" style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', marginBottom: 20 }}>
        <div className="section-title" style={{ color: 'var(--color-primary)' }}>{t('welfare_balance')}</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>₹{welfareBalance.toFixed(2)}</div>
        <p className="helper-text" style={{ marginTop: 4 }}>
          A small contribution is added automatically every time a customer pays for one
          of your completed jobs.
        </p>
      </div>

      <div className="stack-lg">
        <div className="card stack-sm">
          <h3>{t('my_skills')}</h3>
          {ALL_SKILLS.map((skill) => (
            <label key={skill} className="checkbox-row">
              <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />
              {skill}
            </label>
          ))}
        </div>

        <div className="card stack-sm">
          <h3>{t('availability')}</h3>
          <label className="checkbox-row">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
            {t('available_for_jobs')}
          </label>
        </div>

        <div className="card stack-sm">
          <h3>{t('location')}</h3>
          <p className="helper-text">
            {locationSet ? '✅ Location is set' : "⚠️ Not set yet — you won't appear in customer matches until you set this"}
          </p>
          <button type="button" className="btn-outline btn-sm" onClick={updateLocation}>📍 {t('update_location')}</button>
        </div>

        <div className="card stack-sm">
          <h3>{t('e_shram_number')}</h3>
          <input
            type="text"
            placeholder="e.g. 12-3456-7890123"
            value={eShramNumber}
            onChange={(e) => setEShramNumber(e.target.value)}
          />
          <p className="helper-text">
            {eShramNumber ? (
              <span style={{ color: 'var(--color-success-text)' }}>✅ {t('insurance_registered')}</span>
            ) : (
              <span>{t('insurance_not_registered')}</span>
            )}
          </p>
        </div>
      </div>

      <button className="btn-primary btn-block btn-lg" style={{ marginTop: 20 }} onClick={saveProfile}>
        {t('save_profile')}
      </button>

      {statusMsg && <div className="alert alert-info" style={{ marginTop: 12 }}>{statusMsg}</div>}

      {!verified && (
        <div className="alert alert-warning" style={{ marginTop: 20 }}>
          You won't show up in customer matches until an admin verifies you — approval
          happens from the <b>Admin Dashboard → Verifications</b> tab.
        </div>
      )}
    </div>
  )
}
