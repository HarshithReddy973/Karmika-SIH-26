import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import StatusBadge from '../components/ui/StatusBadge'
import { EmptyState, LoadingRow } from '../components/ui/Feedback'

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
    <div className="page">
      <Link to="/customer" className="eyebrow-link">← {t('back_to_browse')}</Link>

      <div className="page-header">
        <h1 className="page-title">{t('my_bookings')}</h1>
      </div>

      {loading && <LoadingRow>{t('loading')}</LoadingRow>}
      {!loading && bookings.length === 0 && <EmptyState>{t('no_bookings_yet')}</EmptyState>}

      <div className="stack">
        {bookings.map((b) => (
          <Link key={b.id} to={`/customer/bookings/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-hover">
              <div className="row">
                <div style={{ fontWeight: 600 }}>{b.services?.name}</div>
                <StatusBadge status={b.status} />
              </div>
              <div className="list-meta">
                {b.is_emergency ? '🚨 Emergency booking' : new Date(b.scheduled_time).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
