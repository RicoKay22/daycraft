import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, UserPlus, Settings, Code2, Dumbbell } from 'lucide-react'

export default function ProfileHeader({
  profileUser,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollow,
  onEdit,
}) {
  const [imgError, setImgError] = useState(false)

  if (!profileUser) return null

  const {
    username,
    full_name,
    bio,
    avatar_url,
    follower_count  = 0,
    following_count = 0,
    post_count      = 0,
  } = profileUser

  const displayName = full_name || username
  const initials    = (displayName || 'U').slice(0, 2).toUpperCase()
  const showAvatar  = avatar_url && !imgError

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '24px 24px 20px',
        marginBottom: 20,
      }}
    >
      {/* ── Top row: avatar + actions ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>

        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 16, flexShrink: 0,
          background: showAvatar ? 'transparent' : 'var(--primary)',
          border: '2px solid var(--border)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 4px var(--primary-glow)',
        }}>
          {showAvatar
            ? <img
                src={avatar_url}
                alt={displayName}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            : <span style={{
                fontFamily: 'var(--font-heading)', fontSize: 24,
                fontWeight: 700, color: '#0B0B0E',
              }}>
                {initials}
              </span>
          }
        </div>

        {/* Name + username */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 20,
            color: 'var(--text-primary)', margin: '0 0 2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--text-muted)', margin: 0,
          }}>
            @{username}
          </p>
        </div>

        {/* Action button */}
        <div style={{ flexShrink: 0 }}>
          {isOwnProfile ? (
            <button
              onClick={onEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-bright)',
                borderRadius: 9999,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.04em', cursor: 'pointer',
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.color = 'var(--primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-bright)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Settings size={13} />
              Edit Profile
            </button>
          ) : (
            <motion.button
              onClick={onFollow}
              disabled={followLoading}
              whileTap={{ scale: followLoading ? 1 : 0.95 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px',
                background: isFollowing ? 'transparent' : 'var(--primary)',
                border: `1px solid ${isFollowing ? 'var(--border-bright)' : 'var(--primary)'}`,
                borderRadius: 9999,
                color: isFollowing ? 'var(--text-secondary)' : '#0B0B0E',
                fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: followLoading ? 'not-allowed' : 'pointer',
                opacity: followLoading ? 0.7 : 1,
                transition: 'all 200ms',
              }}
              onMouseEnter={e => {
                if (!followLoading && isFollowing) {
                  e.currentTarget.style.borderColor = 'var(--danger)'
                  e.currentTarget.style.color = 'var(--danger)'
                }
              }}
              onMouseLeave={e => {
                if (isFollowing) {
                  e.currentTarget.style.borderColor = 'var(--border-bright)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {isFollowing
                ? <><UserCheck size={13} /> Following</>
                : <><UserPlus size={13} /> Follow</>
              }
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Bio ─────────────────────────────────────────────────────── */}
      {bio && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--text-secondary)', lineHeight: 1.6,
          margin: '0 0 16px',
        }}>
          {bio}
        </p>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 24,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}>
        {[
          { value: post_count,      label: 'Posts' },
          { value: follower_count,  label: 'Followers' },
          { value: following_count, label: 'Following' },
        ].map(stat => (
          <div key={stat.label}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 18,
              fontWeight: 700, color: 'var(--primary)',
              display: 'block',
            }}>
              {formatCount(stat.value)}
            </span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 11,
              color: 'var(--text-muted)',
            }}>
              {stat.label}
            </span>
          </div>
        ))}

        {/* Builder type tags */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 9999,
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            color: '#22C55E', letterSpacing: '0.06em',
          }}>
            <Code2 size={9} /> BUILDER
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}
