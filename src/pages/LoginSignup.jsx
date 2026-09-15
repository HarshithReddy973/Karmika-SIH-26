import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'

export default function LoginSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('customer') // 'customer' | 'worker'
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // useAuth hook (used in App.jsx) will pick up the new session
        // automatically and route the user to the right home page.
      } else {
        // 1. Create the auth user
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // 2. Create the matching profile row in our own "users" table.
        //    NOTE: data.user may be null until email confirmation, depending
        //    on your Supabase auth settings - for a hackathon prototype,
        //    turn OFF "confirm email" in Supabase Auth settings so signup
        //    logs the user in immediately.
        if (data.user) {
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            full_name: fullName,
            phone,
            role,
          })
          if (profileError) throw profileError
        }
      }
      navigate('/')
    } catch (err) {
      setErrorMsg(err.message || t('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', fontFamily: 'sans-serif' }}>
      <h1>{t('app_name')}</h1>
      <h2>{mode === 'login' ? t('login') : t('signup')}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'signup' && (
          <>
            <input
              placeholder={t('full_name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              placeholder={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <label>
              {t('i_am_a')}:{' '}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="customer">{t('customer')}</option>
                <option value="worker">{t('worker')}</option>
              </select>
            </label>
          </>
        )}

        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? t('loading') : t('submit')}
        </button>
      </form>

      <p
        style={{ cursor: 'pointer', color: 'blue', marginTop: 10 }}
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? t('need_account') : t('already_have_account')}
      </p>
    </div>
  )
}
