import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import MapPicker from '../components/MapPicker'
import { LoadingRow } from '../components/ui/Feedback'

export default function BookService() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [service, setService] = useState(null)
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [scheduledTime, setScheduledTime] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()
      .then(({ data, error }) => {
        if (error) setErrorMsg(error.message)
        else setService(data)
      })
  }, [serviceId])

  function useMyLocation() {
    setErrorMsg('')

    if (!('geolocation' in navigator)) {
      setErrorMsg('Your browser does not support location access — please tap on the map instead.')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        if (err.code === 1) {
          setErrorMsg(
            'Location permission was denied. Click the 🔒/ⓘ icon next to the address bar → ' +
            'Site settings → Location → Allow, then try again. Or just tap on the map instead.'
          )
        } else if (err.code === 3) {
          setErrorMsg('Getting your location timed out — please tap on the map instead.')
        } else {
          setErrorMsg('Could not get your location (position unavailable) — please tap on the map instead.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (lat == null || lng == null) {
      setErrorMsg('Please set a service location first (button above, or tap the map).')
      return
    }

    setSubmitting(true)
    try {
      const { data: booking, error: insertErr } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          service_id: serviceId,
          scheduled_time: isEmergency ? new Date().toISOString() : scheduledTime,
          is_emergency: isEmergency,
          status: 'pending',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      const { error: locErr } = await supabase.rpc('set_booking_location', {
        p_booking_id: booking.id,
        p_lat: lat,
        p_lng: lng,
      })
      if (locErr) throw locErr

      navigate(`/customer/matches/${booking.id}`)
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong creating your booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!service) {
    return (
      <div className="page">
        {errorMsg ? <div className="alert alert-danger">{errorMsg}</div> : <LoadingRow>{t('loading')}</LoadingRow>}
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/customer" className="eyebrow-link">← {t('browse_services')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('book')}: {service.name}</h1>
        <p className="page-subtitle">₹{service.base_price} {t('onwards')}</p>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <div className="card stack-sm">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            🚨 {t('emergency_option')}
          </label>

          {!isEmergency && (
            <div className="field">
              <label className="label" htmlFor="scheduledTime">{t('preferred_datetime')}</label>
              <input
                id="scheduledTime"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required={!isEmergency}
              />
            </div>
          )}
        </div>

        <div className="card stack-sm">
          <div className="section-title">{t('location')}</div>
          <button type="button" className="btn-outline btn-sm" onClick={useMyLocation} disabled={gettingLocation}>
            {gettingLocation ? t('getting_location') : `📍 ${t('use_my_location')}`}
          </button>
          <p className="helper-text">{t('tap_map_instructions')}</p>
          <div className="map-frame">
            <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln) }} />
          </div>
        </div>

        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

        <button type="submit" className="btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? t('loading') : `${t('find_nearby_workers')} →`}
        </button>
      </form>
    </div>
  )
}
