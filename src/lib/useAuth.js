import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

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
