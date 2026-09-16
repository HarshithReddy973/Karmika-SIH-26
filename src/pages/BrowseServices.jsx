import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

export default function BrowseServices() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        setServices(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('welcome')}, {profile?.full_name} 👋</h1>
        <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
      </div>

      <Link to="/customer/bookings">📋 My Bookings →</Link>

      <h2 style={{ marginTop: 30 }}>Browse Services</h2>
      {loading && <p>{t('loading')}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {services.map((s) => (
          <li
            key={s.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <b>{s.name}</b>
              <div style={{ fontSize: 13, color: '#666' }}>₹{s.base_price} onwards</div>
            </div>
            <Link to={`/customer/book/${s.id}`}>
              <button>Book</button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
