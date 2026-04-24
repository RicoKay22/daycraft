import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, UserPlus, Settings, Code2, Camera, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { updateProfile } from '../../store/usersSlice'
import { useDispatch } from 'react-redux'

export default function ProfileHeader({
  profileUser,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollow,
  onEdit,
  onCoverUpdated,
}) {
  const { user, refreshProfile } = useAuth()
  const dispatch = useDispatch()
  const coverInputRef = useRef(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (!profileUser) return null

  const {
    username, full_name, bio, avatar_url, cover_url,
    follower_count = 0, following_count = 0, post_count = 0,
  } = profileUser

  const displayName = full_name || username
  const initials    = (displayName || 'U').slice(0, 2).toUpperCase()
  const showAvatar  = avatar_url && !imgError

  // ── Cover photo upload ────────────────────────────────────────────────────
  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { alert('Cover image must be under 5MB'); return }

    setCoverUploading(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${user.id}/cover.${ext}`
      const { error: upErr } = await supabase.storage
        .from('daycraft-media')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('daycraft-media').getPublicUrl(path)
      const cover_url_new = `${data.publicUrl}?t=${Date.now()}`

      await dispatch(updateProfile({ userId: user.id, updates: { cover_url: cover_url_new } }))
      await refreshProfile(user.id)
      onCoverUpdated?.()
    } catch (err) {
      console.error('Cover upload error:', err.message)
    } finally {
      setCoverUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      {/* ── Cover photo area ──────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: 140,
        background: cover_url
          ? 'transparent'
          : 'linear-gradient(135deg, #92400E 0%, #F59E0B 40%, #A3E635 100%)',
        overflow: 'hidden',
      }}>
        {cover_url && (
          <img
            src={cover_url}
            alt="Cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Gradient overlay for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(11,11,14,0.1) 0%, rgba(11,11,14,0.55) 100%)',
        }} />

        {/* Upload cover button — own profile only */}
        {isOwnProfile && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              style={{
                position: 'absolute', bottom: 10, right: 12,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                background: 'rgba(11,11,14,0.72)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 9999,
                color: '#fff', cursor: coverUploading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                backdropFilter: 'blur(8px)',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (!coverUploading) e.currentTarget.style.background = 'rgba(245,158,11,0.8)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(11,11,14,0.72)'}
            >
              {coverUploading
                ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                : <Camera size={12} />
              }
              {coverUploading ? 'Uploading...' : 'Change cover'}
            </button>
          </>
        )}
      </div>

      {/* ── Profile info area ─────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 20px' }}>

        {/* Avatar — overlaps cover */}
        <div style={{
          marginTop: -36,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: showAvatar ? 'transparent' : 'var(--primary)',
            border: '3px solid var(--surface)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 0 2px var(--primary)',
          }}>
            {showAvatar
              ? <img
                  src={avatar_url}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: '#0B0B0E' }}>
                  {initials}
                </span>
            }
          </div>

          {/* Action button */}
          <div style={{ paddingBottom: 4 }}>
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
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Settings size={13} /> Edit Profile
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
                  opacity: followLoading ? 0.7 : 1, transition: 'all 200ms',
                }}
                onMouseEnter={e => { if (!followLoading && isFollowing) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}}
                onMouseLeave={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
              >
                {isFollowing
                  ? <><UserCheck size={13} /> Following</>
                  : <><UserPlus size={13} /> Follow</>
                }
              </motion.button>
            )}
          </div>
        </div>

        {/* Name + username */}
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 20,
          color: 'var(--text-primary)', margin: '0 0 2px',
        }}>
          {displayName}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          @{username}
        </p>

        {/* Bio */}
        {bio && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 14,
            color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px',
          }}>
            {bio}
          </p>
        )}

        {/* Stats + Builder badge */}
        <div style={{
          display: 'flex', gap: 24, alignItems: 'center',
          paddingTop: 14, borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {[
            { value: post_count,      label: 'Posts' },
            { value: follower_count,  label: 'Followers' },
            { value: following_count, label: 'Following' },
          ].map(stat => (
            <div key={stat.label}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--primary)', display: 'block' }}>
                {formatCount(stat.value)}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
                {stat.label}
              </span>
            </div>
          ))}

          <div style={{ marginLeft: 'auto' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 9999,
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
              color: '#22C55E', letterSpacing: '0.06em',
            }}>
              <Code2 size={9} /> BUILDER
            </span>
          </div>
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
