import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
]

// Drop this into any page's header. Changes are instant (no reload),
// persisted to localStorage so it survives a refresh even when logged
// out, and saved to the user's profile in Supabase when logged in so
// their preference follows them across devices too.
export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  async function changeLanguage(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('language_pref', code)
    if (user) {
      await supabase.from('users').update({ language_pref: code }).eq('id', user.id)
    }
  }

  return (
    <select
      className="btn-sm"
      style={{ width: 'auto', padding: '6px 10px', fontWeight: 500 }}
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
