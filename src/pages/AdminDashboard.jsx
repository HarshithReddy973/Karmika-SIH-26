import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import VerificationQueue from '../components/admin/VerificationQueue'
import BookingsOverview from '../components/admin/BookingsOverview'
import ServicesManager from '../components/admin/ServicesManager'
import DemandForecast from '../components/admin/DemandForecast'
import WelfareOverview from '../components/admin/WelfareOverview'

const TABS = [
  { key: 'verifications', labelKey: 'tab_verifications' },
  { key: 'bookings', labelKey: 'tab_bookings' },
  { key: 'services', labelKey: 'tab_services' },
  { key: 'forecast', labelKey: 'tab_forecast' },
  { key: 'welfare', labelKey: 'tab_welfare' },
]

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [tab, setTab] = useState('verifications')

  return (
    <div style={{ maxWidth: 820, margin: '30px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>{t('admin_dashboard')} 🛠️</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </div>
      <p>{t('welcome')}, {profile?.full_name}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === tb.key ? 'bold' : 'normal',
              textDecoration: tab === tb.key ? 'underline' : 'none',
              fontSize: 14,
            }}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'verifications' && <VerificationQueue />}
      {tab === 'bookings' && <BookingsOverview />}
      {tab === 'services' && <ServicesManager />}
      {tab === 'forecast' && <DemandForecast />}
      {tab === 'welfare' && <WelfareOverview />}
    </div>
  )
}
