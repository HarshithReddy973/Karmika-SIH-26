import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>{t('welcome')}, {profile?.full_name} 👋</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </div>

      <Link to="/customer/bookings">📋 {t('my_bookings')} →</Link>

      <h2 style={{ marginTop: 30 }}>{t('browse_services')}</h2>
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
              <div style={{ fontSize: 13, color: '#666' }}>₹{s.base_price} {t('onwards')}</div>
            </div>
            <Link to={`/customer/book/${s.id}`}>
              <button>{t('book')}</button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
