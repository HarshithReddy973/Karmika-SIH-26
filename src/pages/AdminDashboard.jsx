import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AppHeader from '../components/ui/AppHeader'
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
    <>
      <AppHeader>
        <LanguageSwitcher />
        <button className="btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
      </AppHeader>

      <div className="page page-wide">
        <div className="page-header">
          <h1 className="page-title">{t('admin_dashboard')}</h1>
          <p className="page-subtitle">{t('welcome')}, {profile?.full_name}</p>
        </div>

        <div className="tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`tab-btn ${tab === tb.key ? 'active' : ''}`}
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
    </>
  )
}
