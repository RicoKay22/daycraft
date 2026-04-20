import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Same rules as AuthPage
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

// This page is ISOLATED from AuthContext (Section 6, rule 4)
// It handles its own session via the recovery hash in the URL
export default function UpdatePasswordPage() {
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const navigate  = useNavigate()
  const strength  = getStrength(password)
  const allMet    = RULES.every(r => r.test(password))

  // Wait for Supabase to exchange the recovery token from the URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allMet || !sessionReady) return
    setLoading(true); setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      // Redirect to home after 2.5s
      setTimeout(() => navigate('/', { replace: true }), 2500)
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-bright)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', fontFamily: 'var(--font-body)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7, background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: '#0B0B0E' }}>D</span>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text-primary)' }}>Daycraft</span>
        </div>

        {done ? (
          /* Success state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '32px 0' }}
          >
            <CheckCircle2 size={48} color="var(--accent)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Password updated.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              Redirecting you to Daycraft...
            </p>
          </motion.div>
        ) : (
          /* Form */
          <>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Set new password.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', margin: '0 0 32px' }}>
              {sessionReady
                ? 'Choose a strong new password for your account.'
                : 'Verifying your reset link...'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontFamily: 'var(--font-heading)',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  color: 'var(--text-secondary)', marginBottom: 6,
                }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    disabled={!sessionReady}
                    required
                    style={{ ...inputStyle, paddingRight: 44, opacity: sessionReady ? 1 : 0.5 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, display: 'flex',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength meter */}
                {password.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i <= strength.score ? strength.color : 'var(--border)',
                          transition: 'background 300ms',
                        }} />
                      ))}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: strength.color, marginLeft: 8, minWidth: 44 }}>
                        {strength.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {RULES.map(rule => {
                        const ok = rule.test(password)
                        return (
                          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{
                              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                              background: ok ? '#22C55E' : 'var(--border-bright)',
                              transition: 'background 200ms',
                            }} />
                            <span style={{
                              fontFamily: 'var(--font-body)', fontSize: 11,
                              color: ok ? 'var(--text-secondary)' : 'var(--text-muted)',
                              transition: 'color 200ms',
                            }}>{rule.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p style={{
                  padding: '10px 14px', margin: 0,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#FCA5A5',
                }}>{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading || !allMet || !sessionReady}
                whileHover={{ scale: loading || !allMet || !sessionReady ? 1 : 1.015 }}
                whileTap={{ scale: 0.975 }}
                style={{
                  width: '100%', padding: '12px 20px', marginTop: 4,
                  background: allMet && sessionReady && !loading ? 'var(--primary)' : 'var(--surface-raised)',
                  border: `1px solid ${allMet && sessionReady && !loading ? 'var(--primary)' : 'var(--border-bright)'}`,
                  borderRadius: 9999,
                  color: allMet && sessionReady && !loading ? '#0B0B0E' : 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: loading || !allMet || !sessionReady ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 200ms',
                }}
              >
                {loading
                  ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-bright)', borderTopColor: 'var(--primary)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : <>Update password <ArrowRight size={14} /></>
                }
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
