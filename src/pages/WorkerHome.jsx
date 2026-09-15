import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabaseClient'

// PHASE 1 STUB. Phase 2 turns this into the "Job Requests" page.
export default function WorkerHome() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>{t('welcome')}, {profile?.full_name || 'Worker'} 🔧</h1>
      <p>Role confirmed: <b>{profile?.role}</b></p>
      <p>This is the Worker Home stub. Phase 2 will turn this into the "Job Requests" page.</p>
      <button onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
    </div>
  )
}
