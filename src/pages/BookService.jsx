import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import MapPicker from '../components/MapPicker'

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

  const [gettingLocation, setGettingLocation] = useState(false)

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
        // err.code: 1 = permission denied, 2 = position unavailable, 3 = timeout
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
      // Step 1: create the booking row (no location yet - geography
      // columns are set separately via RPC, see set_booking_location below).
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

      // Step 2: attach the geo-location to that booking.
      const { error: locErr } = await supabase.rpc('set_booking_location', {
        p_booking_id: booking.id,
        p_lat: lat,
        p_lng: lng,
      })
      if (locErr) throw locErr

      // Step 3: go see who's nearby (Phase 3 matching engine).
      navigate(`/customer/matches/${booking.id}`)
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong creating your booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!service) return <p style={{ padding: 20 }}>{errorMsg || t('loading')}</p>

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h2>Book: {service.name}</h2>
      <p style={{ color: '#666' }}>Base price: ₹{service.base_price}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
          />
          🚨 Emergency / On-demand (skip scheduling, find the fastest available worker now)
        </label>

        {!isEmergency && (
          <label>
            Preferred date &amp; time
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required={!isEmergency}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
        )}

        <div>
          <button type="button" onClick={useMyLocation} disabled={gettingLocation}>
            {gettingLocation ? 'Getting location...' : '📍 Use My Current Location'}
          </button>
          <p style={{ fontSize: 13, color: '#666', margin: '8px 0' }}>
            ...or tap anywhere on the map to set the service location:
          </p>
          <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln) }} />
        </div>

        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? t('loading') : 'Find Nearby Workers →'}
        </button>
      </form>
    </div>
  )
}
