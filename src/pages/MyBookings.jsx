import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

const STATUS_COLORS = {
  pending: '#ffa726',
  accepted: '#42a5f5',
  in_progress: '#ab47bc',
  completed: '#66bb6a',
  cancelled: '#ef5350',
}

export default function MyBookings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('bookings')
      .select('*, services(name)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setBookings(data || [])
        setLoading(false)
      })
  }, [user])

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <Link to="/customer">← {t('back_to_browse')}</Link>
      <h2>{t('my_bookings')}</h2>

      {loading && <p>{t('loading')}</p>}
      {!loading && bookings.length === 0 && <p>{t('no_bookings_yet')}</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {bookings.map((b) => (
          <li key={b.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Link to={`/customer/bookings/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>{b.services?.name}</b>
                <span
                  style={{
                    background: STATUS_COLORS[b.status] || '#999',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {b.is_emergency ? '🚨 Emergency booking' : new Date(b.scheduled_time).toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
