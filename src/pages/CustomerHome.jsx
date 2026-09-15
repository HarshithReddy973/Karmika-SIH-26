import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabaseClient'

// PHASE 1 STUB: just proves auth + role routing works end-to-end.
// In Phase 2 this becomes the real "Browse Services" page.
export default function CustomerHome() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>{t('welcome')}, {profile?.full_name || 'Customer'} 👋</h1>
      <p>Role confirmed: <b>{profile?.role}</b></p>
      <p>This is the Customer Home stub. Phase 2 will turn this into the "Browse Services" page.</p>
      <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
    </div>
  )
}
