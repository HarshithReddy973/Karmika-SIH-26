// Small formatting helpers shared by the worker-facing job screens.

// A plain link to view a lat/lng on OpenStreetMap - no API key, no
// reverse-geocoding service to depend on (keeps this reliable for a demo).
export function mapLink(lat, lng) {
  if (lat == null || lng == null) return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
