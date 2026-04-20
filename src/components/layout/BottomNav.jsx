import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Compass, PlusSquare, Bell, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSelector } from 'react-redux'
import { selectUnreadCount } from '../../store/notificationsSlice'

export default function BottomNav({ onCreatePost }) {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const unread      = useSelector(selectUnreadCount)
  const username    = profile?.username || ''

  const tabs = [
    { icon: Home,        label: 'Home',    path: '/',              action: () => navigate('/') },
    { icon: Compass,     label: 'Explore', path: '/explore',       action: () => navigate('/explore') },
    { icon: PlusSquare,  label: 'Post',    path: '__create__',     action: onCreatePost, isPrimary: true },
    { icon: Bell,        label: 'Alerts',  path: '/notifications', action: () => navigate('/notifications'), badge: true },
    { icon: User,        label: 'Me',      path: `/profile/${username}`, action: () => navigate(`/profile/${username}`) },
  ]

  const isActive = (path) => {
    if (path === '__create__') return false
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 60,
      background: 'rgba(11,11,14,0.92)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 4px',
      zIndex: 100,
      /* Safe area for iOS notch */
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = isActive(tab.path)

        return (
          <button
            key={tab.path}
            onClick={tab.action}
            style={{
              flex: 1,
              height: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              position: 'relative',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 150ms',
            }}
            onMouseDown={e => e.currentTarget.style.opacity = '0.7'}
            onMouseUp={e => e.currentTarget.style.opacity = '1'}
            onTouchStart={e => e.currentTarget.style.opacity = '0.7'}
            onTouchEnd={e => e.currentTarget.style.opacity = '1'}
          >
            {/* Active dot indicator */}
            {active && (
              <motion.div
                layoutId="bottomnav-active"
                style={{
                  position: 'absolute', top: 6,
                  width: 20, height: 2,
                  background: 'var(--primary)',
                  borderRadius: 9999,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}

            {/* Create post — amber filled icon */}
            {tab.isPrimary ? (
              <div style={{
                width: 40, height: 40,
                borderRadius: 12,
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -8,
                boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                transition: 'transform 150ms',
              }}>
                <PlusSquare size={20} color="#0B0B0E" strokeWidth={2} />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <tab.icon size={20} strokeWidth={active ? 2.2 : 1.7} />
                {tab.badge && unread > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -4,
                    minWidth: 13, height: 13,
                    background: 'var(--danger)',
                    borderRadius: 9999,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 7, fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 2px',
                    border: '1.5px solid var(--bg)',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            )}

            {/* Label — hidden for create post */}
            {!tab.isPrimary && (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 9,
                letterSpacing: '0.02em',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
              }}>
                {tab.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
