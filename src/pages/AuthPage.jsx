import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Zap, Dumbbell, Code2, BookOpen, Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Animated preview cards ───────────────────────────────────────────────────
const PREVIEW_POSTS = [
  { icon: Code2,    color: '#F59E0B', label: 'Dev',     user: 'rico.kay',    text: 'Shipped the auth system for Daycraft. Section 6 patterns held up perfectly 🔥', time: '2m ago',  likes: 14 },
  { icon: Dumbbell, color: '#22C55E', label: 'Workout', user: 'plant.mana',  text: 'Day 47 of 100. 5km run + upper body. Consistency > perfection. Keep going 💪',   time: '18m ago', likes: 31 },
  { icon: BookOpen, color: '#A3E635', label: 'Build',   user: 'jxseph.dev',  text: 'Finished reading Atomic Habits. Key insight: systems beat goals every single time.', time: '1h ago',  likes: 8  },
  { icon: Flame,    color: '#F59E0B', label: 'Dev',     user: 'temi.codes',  text: 'Redux optimistic updates clicked today. No more waiting for the server. Beautiful.', time: '3h ago',  likes: 22 },
  { icon: Zap,      color: '#22C55E', label: 'Workout', user: 'kade.builds', text: 'Morning routine locked in. Code for 2hrs, gym at 7pm, ship something every day.', time: '5h ago',  likes: 19 },
]

function FloatingCard({ post, index }) {
  const Icon = post.icon
  const leftPositions   = [8, 36, 62, 18, 48]
  const bottomPositions = [5, 10, 5, 15, 8]
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: [0, 0.92, 0.92, 0], y: [60, 0, -30, -90] }}
      transition={{ duration: 7, delay: index * 1.8, repeat: Infinity, repeatDelay: PREVIEW_POSTS.length * 1.8 - 7, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        left: `${leftPositions[index]}%`,
        bottom: `${bottomPositions[index]}%`,
        width: 230,
        background: 'rgba(17,17,22,0.88)',
        border: `1px solid ${post.color}30`,
        borderRadius: 12, padding: '12px 14px',
        backdropFilter: 'blur(12px)', pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${post.color}18`, border: `1px solid ${post.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={12} color={post.color} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: post.color, fontWeight: 700, letterSpacing: '0.06em' }}>{post.label}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{post.time}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{post.text}</p>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>@{post.user}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>♥ {post.likes}</span>
      </div>
    </motion.div>
  )
}

// ─── Password rules ───────────────────────────────────────────────────────────
const RULES = [
  { id: 'len',     label: 'At least 8 characters',  test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',   test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter',   test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number',             test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character',  test: (p) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password) {
  const passed = RULES.filter(r => r.test(password)).length
  if (passed <= 1) return { score: passed, label: 'Weak',   color: '#EF4444' }
  if (passed <= 3) return { score: passed, label: 'Fair',   color: '#F59E0B' }
  if (passed === 4) return { score: passed, label: 'Good',  color: '#A3E635' }
  return               { score: passed, label: 'Strong', color: '#22C55E' }
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-bright)',
  borderRadius: 8, color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontFamily: 'var(--font-heading)',
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'var(--text-secondary)', marginBottom: 6,
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // ── registered state with localStorage persistence ──────────────────────────
  const [registered, setRegistered] = useState(() => {
    return localStorage.getItem('dc_registered') === 'true'
  })
  const [registeredEmail, setRegisteredEmail] = useState(() => {
    return localStorage.getItem('dc_registered_email') || ''
  })

  // ── Resend cooldown ──────────────────────────────────────────────────────────
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ── Persist registered state ─────────────────────────────────────────────────
  useEffect(() => {
    if (registered) {
      localStorage.setItem('dc_registered', 'true')
      localStorage.setItem('dc_registered_email', email || registeredEmail)
    } else {
      localStorage.removeItem('dc_registered')
      localStorage.removeItem('dc_registered_email')
    }
  }, [registered])

  const { signIn, signUp, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from?.pathname || '/'

  const params        = new URLSearchParams(location.search)
  const justConfirmed = params.get('confirmed') === 'true'

  // ── Auth redirect / confirmation handler ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    if (registered) return   // don't navigate away while showing success screen

    if (justConfirmed) {
      // Email confirmed — sign out auto-session, show confirmed message
      signOut()
      setRegistered(false)
      setSuccess('Email confirmed! You can now sign in with your password.')
      setTab('login')
      return
    }

    navigate(from, { replace: true })
  }, [isAuthenticated, justConfirmed, registered])

  const strength    = getStrength(password)
  const allRulesMet = RULES.every(r => r.test(password))
  const canSubmit   = tab === 'login'
    ? email && password
    : email && username.length >= 3 && allRulesMet

  function switchTab(t) { setTab(t); setError(''); setSuccess('') }

  async function checkUsernameAvailable(handle) {
    const { data } = await supabase
      .from('profiles').select('username')
      .eq('username', handle.toLowerCase().trim())
      .maybeSingle()
    return data === null
  }

  // Prevents SMTP delays from hanging the UI indefinitely
async function signUpWithTimeout(email, password, username) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request is taking too long. Please try again.')), 15000)
  )
  return Promise.race([
    signUp(email, password, username),
    timeout
  ])
}

  // ── handleSubmit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    // Guard: prevent double-submit
    if (!canSubmit || loading || registered) return

    setError(''); setSuccess(''); setLoading(true)

    try {
      if (tab === 'login') {
        await signIn(email, password)
        navigate(from, { replace: true })

      } else {
        await supabase.auth.signOut().catch(() => {})
        // Check username before anything else
        const available = await checkUsernameAvailable(username)
        if (!available) {
          setError('That username is already taken. Please choose another.')
          setLoading(false)
          return
        }

        // LOCK UI immediately before network call — prevents multiple emails
        setRegistered(true)
        setRegisteredEmail(email)

        const { data } = await signUpWithTimeout(email, password, username.toLowerCase().trim())

        // Duplicate email — Supabase returns identities: []
        if (data?.user?.identities?.length === 0) {
          setRegistered(false)   // unlock
          setError('An account with this email already exists. Please sign in instead.')
          setLoading(false)
          return
        }

        if (data?.session) {
          // Email confirmation disabled (shouldn't happen in prod)
          setRegistered(false)
          navigate(from, { replace: true })
        }
        // registered=true stays — success screen is now showing
      }
    } catch (err) {
      setRegistered(false)   // unlock on any error
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox and spam folder.')
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many attempts. Please wait about 30–60 seconds and try again.')
      } else {
        setError(msg || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── handleGoogle ──────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setGLoading(false)
    }
  }

  // ── handleForgotPassword ──────────────────────────────────────────────────────
  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address above first.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setSuccess('If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.')
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many reset attempts. Please wait a few minutes before trying again.')
      } else {
        setError('Failed to send reset email. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── handleResendConfirmation ──────────────────────────────────────────────────
  async function handleResendConfirmation() {
    const targetEmail = email || registeredEmail
    if (!targetEmail || resendCooldown > 0) return
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=true` },
      })
      if (error) throw error
      setSuccess('Confirmation email resent. Check your inbox and spam folder.')
      setResendCooldown(30)
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('rate limit')) {
        setError("You've requested too many emails. Please wait before trying again.")
      } else {
        setError('Failed to resend email. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Registration success screen ───────────────────────────────────────────────
  if (registered) {
    const displayEmail = email || registeredEmail
    return (
      <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Account created!
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>
            A confirmation link has been sent to:
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--primary)', margin: '0 0 24px' }}>
            {displayEmail}
          </p>

          <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
            Click the link in the email to verify your account, then come back to sign in.
            <br /><br />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Don't see it? Check your <strong style={{ color: 'var(--text-secondary)' }}>spam or junk folder</strong>.
            </span>
          </div>

          {/* Error / success inside success screen */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '10px 14px', margin: '0 0 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#FCA5A5' }}>
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '10px 14px', margin: '0 0 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#86EFAC' }}>
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Go to sign in */}
          <button
            onClick={() => { setRegistered(false); setTab('login'); setError(''); setSuccess('') }}
            style={{ width: '100%', padding: '12px 20px', background: 'var(--primary)', border: 'none', borderRadius: 9999, color: '#0B0B0E', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Go to sign in <ArrowRight size={14} />
          </button>

          {/* Resend button with cooldown */}
          <button
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0 || loading}
            style={{ width: '100%', padding: '10px 16px', marginTop: 12, background: 'transparent', border: '1px solid var(--border-bright)', borderRadius: 9999, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: resendCooldown > 0 || loading ? 'not-allowed' : 'pointer', opacity: resendCooldown > 0 || loading ? 0.55 : 1, transition: 'opacity 200ms' }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend confirmation email'}
          </button>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 40, letterSpacing: '0.06em' }}>
            RICO KAY · WHERE DESIGN MEETS LOGIC
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Main auth form ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* LEFT PANEL */}
      <div style={{ display: 'none', flex: 1, position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--border)' }} className="dc-left">
        <div style={{ position: 'absolute', bottom: -120, left: '5%', width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '15%', right: -100, width: 350, height: 350, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(245,158,11,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '44px 48px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 72 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#0B0B0E' }}>D</span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--text-primary)' }}>Daycraft</span>
          </div>

          <div style={{ flex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(30px, 2.8vw, 44px)', lineHeight: 1.15, color: 'var(--text-primary)', margin: '0 0 18px' }}>
                Craft something<br />
                <span style={{ color: 'var(--primary)' }}>every day.</span>
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 340, margin: '0 0 44px' }}>
                A builder's log for developers and creators. Document your code, your reps, your reads — and share what you're building.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ display: 'flex', gap: 36, marginBottom: 52 }}>
              {[['2.4k', 'Builders'], ['18k', 'Posts'], ['94k', 'Days logged']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{val}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </motion.div>

            <div style={{ position: 'relative', height: 280 }}>
              {PREVIEW_POSTS.map((post, i) => <FloatingCard key={post.user} post={post} index={i} />)}
            </div>
          </div>

          <div style={{ paddingBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Built by</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, color: 'var(--primary)', letterSpacing: '0.06em' }}>RICO KAY</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', margin: '0 6px' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>WHERE DESIGN MEETS LOGIC</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }} className="dc-right">

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }} className="dc-mobile-logo">
          <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: '#0B0B0E' }}>D</span>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text-primary)' }}>Daycraft</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              {tab === 'login' ? 'Welcome back.' : 'Start crafting.'}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px' }}>
              {tab === 'login' ? 'Sign in to your Daycraft account.' : "Create your account. It's free."}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
          {[['login', 'SIGN IN'], ['register', 'JOIN']].map(([t, lbl]) => (
            <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: '9px 0', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? '#0B0B0E' : 'var(--text-secondary)', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', transition: 'all 200ms' }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} disabled={gLoading} style={{ width: '100%', padding: '11px 16px', background: 'var(--surface-raised)', border: '1px solid var(--border-bright)', borderRadius: 9, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: gLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: gLoading ? 0.6 : 1, transition: 'border-color 200ms' }}
          onMouseEnter={e => { if (!gLoading) e.currentTarget.style.borderColor = 'var(--primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
        >
          <svg width="17" height="17" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.51 10.53A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.53V5.4H1.83A8 8 0 0 0 .98 9c0 1.29.31 2.51.85 3.6l2.68-2.07z"/>
            <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.51 7.47c.63-1.89 2.4-3.29 4.47-3.29z"/>
          </svg>
          {gLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Username */}
          <AnimatePresence>
            {tab === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>@</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="your_handle" maxLength={30} autoComplete="username" style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Lowercase letters, numbers and underscores only.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={tab === 'register' ? 'Create a strong password' : 'Enter your password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {tab === 'register' && password.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 8 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : 'var(--border)', transition: 'background 300ms' }} />
                    ))}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: strength.color, marginLeft: 8, minWidth: 44 }}>{strength.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {RULES.map(rule => {
                      const ok = rule.test(password)
                      return (
                        <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: ok ? '#22C55E' : 'var(--border-bright)', transition: 'background 200ms' }} />
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: ok ? 'var(--text-secondary)' : 'var(--text-muted)', transition: 'color 200ms' }}>{rule.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Forgot password */}
          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -6 }}>
              <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline', transition: 'color 150ms' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error / Success */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '10px 14px', margin: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#FCA5A5' }}>
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '10px 14px', margin: 0, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#86EFAC' }}>
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !canSubmit || registered}
            whileHover={{ scale: loading || !canSubmit || registered ? 1 : 1.015 }}
            whileTap={{ scale: loading || !canSubmit || registered ? 1 : 0.975 }}
            style={{ width: '100%', padding: '12px 20px', marginTop: 4, background: canSubmit && !loading && !registered ? 'var(--primary)' : 'var(--surface-raised)', border: `1px solid ${canSubmit && !loading && !registered ? 'var(--primary)' : 'var(--border-bright)'}`, borderRadius: 9999, color: canSubmit && !loading && !registered ? '#0B0B0E' : 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: loading || !canSubmit || registered ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 200ms' }}
          >
            {loading
              ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-bright)', borderTopColor: 'var(--primary)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <>{tab === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={14} /></>
            }
          </motion.button>
        </form>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => switchTab(tab === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
            {tab === 'login' ? 'Join Daycraft' : 'Sign in'}
          </button>
        </p>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 48, letterSpacing: '0.06em' }}>
          RICO KAY · WHERE DESIGN MEETS LOGIC
        </p>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .dc-left        { display: flex !important; }
          .dc-right       { width: 440px !important; margin: 0 !important; }
          .dc-mobile-logo { display: none !important; }
        }
        @media (max-width: 899px) {
          .dc-right { padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  )
}
