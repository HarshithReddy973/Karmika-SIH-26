import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import i18n from '../i18n'

// A simple hook that gives any component the current logged-in user
// (or null) plus their role from the "users" table, and keeps it updated
// automatically if the user logs in/out.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // row from "users" table (has .role)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get current session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Listen for login/logout events anywhere in the app
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) console.error('[useAuth] Failed to fetch profile:', error.message)
    setProfile(data ?? null)

    // If this user has a saved language preference that differs from
    // what's currently active, switch to it automatically - this is
    // what makes language "follow" a user across devices/browsers.
    if (data?.language_pref && data.language_pref !== i18n.language) {
      i18n.changeLanguage(data.language_pref)
    }

    setLoading(false)
  }

  return {
    session,
    user: session?.user ?? null,
    profile,      // profile.role will be 'customer' | 'worker' | 'admin'
    loading,
    isLoggedIn: !!session,
  }
}
