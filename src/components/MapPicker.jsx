import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Common Leaflet + bundler gotcha: the default marker icon images
// don't resolve correctly with Vite unless we point to them manually.
// Without this fix, markers silently fail to render (no error shown).
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// A click-to-drop-a-pin map. Pass current lat/lng (or null) and an
// onChange(lat, lng) callback. Used by Book Service to pick the job
// location - no API key needed since this uses free OpenStreetMap tiles.
export default function MapPicker({ lat, lng, onChange, height = 300 }) {
  const hasPoint = lat != null && lng != null
  const center = hasPoint ? [lat, lng] : [20.5937, 78.9629] // fallback: center of India

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={hasPoint ? 14 : 5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler onPick={onChange} />
        {hasPoint && <Marker position={[lat, lng]} />}
      </MapContainer>
    </div>
  )
}
