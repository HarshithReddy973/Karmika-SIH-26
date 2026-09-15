import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabaseClient'

// PHASE 1 STUB. Phase 4 turns this into the real Admin Dashboard.
export default function AdminHome() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>{t('welcome')}, {profile?.full_name || 'Admin'} 🛠️</h1>
      <p>Role confirmed: <b>{profile?.role}</b></p>
      <p>This is the Admin Home stub. Phase 4 will turn this into the full dashboard.</p>
      <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
    </div>
  )
}
