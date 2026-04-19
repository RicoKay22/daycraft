import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isProcessingAuth      = useRef(false)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (!error && data) setProfile(data)
    return data
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
    if (data?.user) {
      setUser(data.user)
      fetchProfile(data.user.id)
    }signUp
    return data
  }

  async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: username },
      // After confirmation click, land back on AuthPage with a flag
      emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
    },
  })
  if (error) throw error

  // Only create profile for a genuinely new user (identities will be populated)
  if (data?.user && data.user.identities?.length > 0) {
    await ensureProfile(data.user.id, { username, email })
  }

  return data
}

  async function signOut() {
    setUser(null)
    setProfile(null)
    supabase.auth.signOut().catch(() => {})
  }

  useEffect(() => {
    const isRecoveryFlow =
      window.location.pathname === '/update-password' ||
      window.location.hash.includes('type=recovery')

    if (isRecoveryFlow) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isProcessingAuth.current) return
        isProcessingAuth.current = true
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            await ensureProfile(session.user.id, {
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name,
              avatar_url: session.user.user_metadata?.avatar_url,
              username: session.user.user_metadata?.username,
            })
            fetchProfile(session.user.id)
          }
          if (event === 'SIGNED_OUT') { setUser(null); setProfile(null) }
          if (event === 'TOKEN_REFRESHED' && session?.user) setUser(session.user)
        } finally {
          isProcessingAuth.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signIn, signUp, signOut,
      fetchProfile, ensureProfile, isAuthenticated: !!user,
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