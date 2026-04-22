import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isProcessingAuth = useRef(false)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (!error && data) setProfile(data)
      return data
    } catch (err) {
      console.error('fetchProfile error:', err)
    }
  }

  const ensureProfile = async (userId, meta = {}) => {
    const { data: existing } = await supabase
      .from('profiles').select('id, username').eq('id', userId).single()
    if (existing) {
      const updates = {}
      if (meta.email && !existing.email) updates.email = meta.email
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', userId)
      }
      return existing
    }
    const username = meta.username ||
      meta.email?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '_').toLowerCase() ||
      `user_${userId.slice(0, 8)}`
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({ id: userId, username, full_name: meta.full_name || '', avatar_url: meta.avatar_url || '' })
      .select().single()
    if (error && error.code !== '23505') console.error('ensureProfile error:', error)
    return newProfile
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user) { setUser(data.user); fetchProfile(data.user.id) }
    return data
  }

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { username, full_name: username },
        emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
      },
    })
    if (error) throw error
    if (data?.user && data.user.identities?.length > 0) {
      await ensureProfile(data.user.id, { username, email })
    }
    return data
  }

  async function signOut() {
    setUser(null); setProfile(null)
    supabase.auth.signOut().catch(() => {})
  }

  // Expose a way to refresh profile after edits
  async function refreshProfile(userId) {
    const id = userId || user?.id
    if (!id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) setProfile(data)
    return data
  }

  useEffect(() => {
    const isRecoveryFlow =
      window.location.pathname === '/update-password' ||
      window.location.hash.includes('type=recovery')

    if (isRecoveryFlow) { setLoading(false); return }

    let isMounted = true

    // ── Restore session safely — loading ALWAYS ends ──────────────────────
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        if (session?.user) {
          setUser(session.user)
          // Don't block loading on profile fetch
          fetchProfile(session.user.id)
            .catch(() => {})
            .finally(() => { if (isMounted) setLoading(false) })
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Session restore error:', err)
        if (isMounted) setLoading(false)
      }
    }

    init()

    // ── Auth listener — NON-BLOCKING, loading always ends ─────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Fire and forget — don't await
          ensureProfile(session.user.id, {
            email:      session.user.email,
            full_name:  session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            username:   session.user.user_metadata?.username,
          }).catch(() => {})
          fetchProfile(session.user.id).catch(() => {})
        }
        if (event === 'SIGNED_OUT') { setUser(null); setProfile(null) }
        if (event === 'TOKEN_REFRESHED' && session?.user) setUser(session.user)

        // Guarantee loading ends no matter what
        if (isMounted) setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut,
      fetchProfile, ensureProfile, refreshProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
