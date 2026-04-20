import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Compass, Bell, User, PlusSquare, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSelector } from 'react-redux'
import { selectUnreadCount } from '../../store/notificationsSlice'

const NAV_ITEMS = [
  { icon: Home,            label: 'Home',          path: '/' },
  { icon: Compass,         label: 'Explore',       path: '/explore' },
  { icon: Bell,            label: 'Notifications', path: '/notifications', badge: true },
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard' },
]

export default function Sidebar({ onCreatePost }) {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const unread      = useSelector(selectUnreadCount)
  const username    = profile?.username || ''

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside style={{
      position: 'fixed',
      top: 56,              // below TopBar
      left: 0,
      width: 220,
      height: 'calc(100dvh - 56px)',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px 24px',
      zIndex: 50,
      overflowY: 'auto',
    }}>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: active ? 'var(--primary-glow)' : 'transparent',
                cursor: 'pointer',
                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: active ? 500 : 400,
                textAlign: 'left', width: '100%',
                transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{
                    position: 'absolute', left: 0, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3, height: 18,
                    background: 'var(--primary)',
                    borderRadius: '0 3px 3px 0',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {item.badge && unread > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 14, height: 14,
                    background: 'var(--danger)',
                    borderRadius: 9999,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8, fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '1.5px solid var(--bg)',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>

              <span>{item.label}</span>
            </button>
          )
        })}

        {/* Profile link — dynamic username */}
        {username && (
          <button
            onClick={() => navigate(`/profile/${username}`)}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              background: location.pathname === `/profile/${username}` ? 'var(--primary-glow)' : 'transparent',
              cursor: 'pointer',
              color: location.pathname === `/profile/${username}` ? 'var(--primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 14,
              fontWeight: location.pathname === `/profile/${username}` ? 500 : 400,
              textAlign: 'left', width: '100%',
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              if (location.pathname !== `/profile/${username}`) {
                e.currentTarget.style.background = 'var(--surface)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={e => {
              if (location.pathname !== `/profile/${username}`) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            {location.pathname === `/profile/${username}` && (
              <motion.div
                layoutId="sidebar-active"
                style={{
                  position: 'absolute', left: 0, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3, height: 18,
                  background: 'var(--primary)',
                  borderRadius: '0 3px 3px 0',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <User size={18} strokeWidth={location.pathname === `/profile/${username}` ? 2.2 : 1.8} />
            <span>Profile</span>
          </button>
        )}
      </nav>

      {/* ── Create Post CTA ─────────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          onClick={onCreatePost}
          style={{
            width: '100%', padding: '11px 16px',
            background: 'var(--primary)',
            border: 'none', borderRadius: 10,
            color: '#0B0B0E',
            fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 150ms, transform 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PlusSquare size={15} />
          New Post
        </button>

        {/* Brand stamp */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-muted)', marginTop: 20,
          letterSpacing: '0.06em', textAlign: 'center',
          lineHeight: 1.6,
        }}>
          DAYCRAFT · RICO KAY<br />
          <span style={{ color: 'var(--border-bright)' }}>WHERE DESIGN MEETS LOGIC</span>
        </p>
      </div>
    </aside>
  )
}
