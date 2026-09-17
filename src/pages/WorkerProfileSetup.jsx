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
        }
      })
  }, [user])

  function toggleSkill(skill) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  async function saveProfile() {
    setStatusMsg('Saving...')
    const { error } = await supabase
      .from('worker_profiles')
      .upsert({ user_id: user.id, skills, is_available: isAvailable })
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
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to="/worker">← {t('new_requests_near_you')}</Link>
      <h2>{t('my_profile_title')}</h2>

      <p>
        {verified ? (
          <b style={{ color: 'green' }}>✅ Verified</b>
        ) : (
          <b style={{ color: '#e65100' }}>⏳ Pending verification</b>
        )}
      </p>

      <h3>{t('my_skills')}</h3>
      {ALL_SKILLS.map((skill) => (
        <label key={skill} style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />
          {' '}{skill}
        </label>
      ))}

      <h3 style={{ marginTop: 20 }}>{t('availability')}</h3>
      <label>
        <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
        {' '}{t('available_for_jobs')}
      </label>

      <h3 style={{ marginTop: 20 }}>{t('location')}</h3>
      <p>{locationSet ? '✅ Location is set' : "⚠️ Not set yet — you won't appear in customer matches until you set this"}</p>
      <button type="button" onClick={updateLocation}>📍 {t('update_location')}</button>

      <div style={{ marginTop: 24 }}>
        <button onClick={saveProfile}>{t('save_profile')}</button>
      </div>

      {statusMsg && <p style={{ marginTop: 10 }}>{statusMsg}</p>}

      {!verified && (
        <p style={{ marginTop: 24, fontSize: 13, color: '#555', background: '#fff3e0', padding: 10, borderRadius: 6 }}>
          <b>Note for testing (Phase 2–3):</b> you won't show up in customer matches until
          an admin verifies you. As of Phase 4, this now happens from the real{' '}
          <b>Admin Dashboard → Verifications</b> tab — no more manually editing Supabase!
        </p>
      )}
    </div>
  )
}
