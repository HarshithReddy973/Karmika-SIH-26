import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AppHeader from '../components/ui/AppHeader'
import { EmptyState, LoadingRow } from '../components/ui/Feedback'

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
    <>
      <AppHeader>
        <LanguageSwitcher />
        <button className="btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
      </AppHeader>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">{t('browse_services')}</h1>
          <p className="page-subtitle">{t('welcome')}, {profile?.full_name} 👋</p>
        </div>

        <Link to="/customer/bookings" className="eyebrow-link">📋 {t('my_bookings')} →</Link>

        {loading && <LoadingRow>{t('loading')}</LoadingRow>}

        {!loading && services.length === 0 && <EmptyState>No services available yet.</EmptyState>}

        <div className="stack">
          {services.map((s) => (
            <div key={s.id} className="card card-hover row">
              <div>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="list-meta">₹{s.base_price} {t('onwards')}</div>
              </div>
              <Link to={`/customer/book/${s.id}`}>
                <button className="btn-primary btn-sm">{t('book')}</button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
