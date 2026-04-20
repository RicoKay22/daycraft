import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, Bell, Search, LogOut, User, LayoutDashboard, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSelector } from 'react-redux'
import { selectUnreadCount } from '../../store/notificationsSlice'

export default function TopBar({ onCreatePost }) {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()
  const unread    = useSelector(selectUnreadCount)

  const [scrolled,     setScrolled]     = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Frosted glass activates on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    signOut()                          // instant UI reset (Section 6 rule 3)
    navigate('/auth', { replace: true })
  }

  const avatar    = profile?.avatar_url
  const initials  = (profile?.full_name || profile?.username || user?.email || '?')
    .slice(0, 2).toUpperCase()
  const username  = profile?.username || user?.email?.split('@')[0] || '...'

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: scrolled
          ? 'rgba(11,11,14,0.82)'
          : 'var(--bg)',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'rgba(245,158,11,0.1)' : 'var(--border)'}`,
        transition: 'background 300ms, border-color 300ms, backdrop-filter 300ms',
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 0', flexShrink: 0,
          textDecoration: 'none',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 12,
            fontWeight: 700, color: '#0B0B0E',
          }}>D</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 15,
          color: 'var(--text-primary)', letterSpacing: '-0.01em',
          display: 'none',
        }} className="topbar-wordmark">
          Daycraft
        </span>
      </button>

      {/* ── Spacer ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Search ───────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/explore')}
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-secondary)',
          transition: 'border-color 150ms, color 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title="Search"
      >
        <Search size={15} />
      </button>

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/notifications')}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 9,
          background: 'var(--surface)',
          border: `1px solid ${location.pathname === '/notifications' ? 'var(--primary)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          color: location.pathname === '/notifications' ? 'var(--primary)' : 'var(--text-secondary)',
          transition: 'border-color 150ms, color 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--primary)'
        }}
        onMouseLeave={e => {
          if (location.pathname !== '/notifications') {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }
        }}
        title="Notifications"
      >
        <Bell size={15} />
        {/* Unread badge */}
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: 5, right: 5,
              minWidth: 14, height: 14,
              background: 'var(--danger)',
              borderRadius: 9999,
              fontFamily: 'var(--font-mono)',
              fontSize: 9, fontWeight: 700,
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
              border: '1.5px solid var(--bg)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* ── Theme toggle ──────────────────────────────────────────────── */}
      <button
        onClick={toggleTheme}
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-secondary)',
          transition: 'border-color 150ms, color 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
            transition={{ duration: 0.18 }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* ── User chip + dropdown ───────────────────────────────────────── */}
      <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: dropdownOpen ? 'var(--surface-raised)' : 'var(--surface)',
            border: `1px solid ${dropdownOpen ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 9,
            padding: '5px 9px 5px 5px',
            cursor: 'pointer',
            transition: 'border-color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            if (!dropdownOpen) e.currentTarget.style.borderColor = 'var(--primary)'
          }}
          onMouseLeave={e => {
            if (!dropdownOpen) e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {/* Avatar */}
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: avatar ? 'transparent' : 'var(--primary)',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {avatar
              ? <img src={avatar} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: '#0B0B0E' }}>{initials}</span>
            }
          </div>

          {/* Username — hidden on mobile */}
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 12,
            color: 'var(--text-primary)', letterSpacing: '0.01em',
            display: 'none', maxWidth: 100,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} className="topbar-username">
            @{username}
          </span>

          <motion.div
            animate={{ rotate: dropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.18 }}
          >
            <ChevronDown size={13} color="var(--text-muted)" />
          </motion.div>
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                minWidth: 180,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                zIndex: 200,
              }}
            >
              {/* User info header */}
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid var(--border)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-heading)', fontSize: 12,
                  color: 'var(--text-primary)', margin: 0,
                  letterSpacing: '0.01em',
                }}>
                  @{username}
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 11,
                  color: 'var(--text-muted)', margin: '2px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}>
                  {user?.email}
                </p>
              </div>

              {/* Menu items */}
              {[
                { icon: User,           label: 'My Profile',  action: () => { setDropdownOpen(false); navigate(`/profile/${username}`) } },
                { icon: LayoutDashboard,label: 'Dashboard',   action: () => { setDropdownOpen(false); navigate('/dashboard') } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 150ms, color 150ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--surface-raised)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (min-width: 768px) {
          .topbar-wordmark  { display: inline !important; }
          .topbar-username  { display: inline !important; }
        }
      `}</style>
    </header>
  )
}
