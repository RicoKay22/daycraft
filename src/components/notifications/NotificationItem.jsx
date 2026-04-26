import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, Repeat2 } from 'lucide-react'
import { formatDistanceToNow } from '../utils/time'

const TYPE_CONFIG = {
  like:    { icon: Heart,         color: '#EF4444', label: 'liked your post' },
  comment: { icon: MessageCircle, color: '#22C55E', label: 'commented on your post' },
  follow:  { icon: UserPlus,      color: '#F59E0B', label: 'started following you' },
  repost:  { icon: Repeat2,       color: '#A3E635', label: 'reposted your post' },
}

export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate()
  const cfg      = TYPE_CONFIG[notification.type] || TYPE_CONFIG.like
  const Icon     = cfg.icon
  const actor    = notification.actor || {}
  const initials = (actor.username || 'U').slice(0, 2).toUpperCase()

  function handleClick() {
    onRead?.(notification.id)
    if (notification.type === 'follow') {
      navigate(`/profile/${actor.username}`)
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: notification.is_read ? 'transparent' : 'rgba(245,158,11,0.04)',
        border: `1px solid ${notification.is_read ? 'var(--border)' : 'rgba(245,158,11,0.15)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
      onMouseLeave={e => e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(245,158,11,0.04)'}
    >
      {/* Actor avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: actor.avatar_url ? 'transparent' : 'var(--surface-raised)',
          border: '1px solid var(--border)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {actor.avatar_url
            ? <img src={actor.avatar_url} alt={actor.username || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{initials}</span>
          }
        </div>
        {/* Type icon badge */}
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          width: 18, height: 18, borderRadius: '50%',
          background: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--surface)',
        }}>
          <Icon size={9} color="#fff" strokeWidth={2.5} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>@{actor.username || 'someone'}</span>
          {' '}{cfg.label}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {formatDistanceToNow(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--primary)', flexShrink: 0,
        }} />
      )}
    </div>
  )
}
