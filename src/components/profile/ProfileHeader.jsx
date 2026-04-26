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

  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
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
      const newUrl = `${data.publicUrl}?t=${Date.now()}`
      await dispatch(updateProfile({ userId: user.id, updates: { cover_url: newUrl } }))
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
      style={{ marginBottom: 20 }}
    >
      {/* ── Cover — full width ───────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        background: cover_url
          ? 'transparent'
          : 'linear-gradient(135deg, #78350F 0%, #92400E 25%, #B45309 50%, #F59E0B 75%, #A3E635 100%)',
      }}>
        {cover_url && (
          <img
            src={cover_url}
            alt="Cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(11,11,14,0.65) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: -40, left: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

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
                position: 'absolute', bottom: 12, right: 14,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                background: 'rgba(11,11,14,0.72)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 9999, color: '#F59E0B',
                fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', backdropFilter: 'blur(8px)',
                cursor: coverUploading ? 'not-allowed' : 'pointer',
                transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { if (!coverUploading) { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.7)' }}}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(11,11,14,0.72)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
            >
              {coverUploading ? <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Camera size={11} />}
              {coverUploading ? 'Uploading...' : 'Change cover'}
            </button>
          </>
        )}
      </div>

      {/* ── Avatar + action row ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginTop: -44, padding: '0 4px', marginBottom: 14,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: showAvatar ? 'transparent' : 'var(--primary)',
          border: '4px solid var(--bg)',
          outline: '2px solid #F59E0B',
          outlineOffset: 1,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 24px rgba(245,158,11,0.35)',
          zIndex: 2, position: 'relative',
        }}>
          {showAvatar
            ? <img src={avatar_url} alt={displayName} onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: '#0B0B0E' }}>
                {initials}
              </span>
          }
        </div>

        <div style={{ paddingBottom: 6 }}>
          {isOwnProfile ? (
            <button
              onClick={onEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: 'transparent',
                border: '1px solid rgba(245,158,11,0.4)', borderRadius: 9999,
                color: '#F59E0B',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.04em', cursor: 'pointer',
                transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.borderColor = '#F59E0B' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)' }}
            >
              <Settings size={12} /> Edit Profile
            </button>
          ) : (
            <motion.button
              onClick={onFollow}
              disabled={followLoading}
              whileTap={{ scale: followLoading ? 1 : 0.95 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px',
                background: isFollowing ? 'transparent' : '#F59E0B',
                border: `1px solid ${isFollowing ? 'rgba(245,158,11,0.4)' : '#F59E0B'}`,
                borderRadius: 9999,
                color: isFollowing ? '#F59E0B' : '#0B0B0E',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: followLoading ? 'not-allowed' : 'pointer',
                opacity: followLoading ? 0.7 : 1, transition: 'all 200ms',
              }}
              onMouseEnter={e => {
                if (!followLoading && isFollowing) {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                  e.currentTarget.style.borderColor = '#EF4444'
                  e.currentTarget.style.color = '#EF4444'
                }
              }}
              onMouseLeave={e => {
                if (isFollowing) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'
                  e.currentTarget.style.color = '#F59E0B'
                }
              }}
            >
              {followLoading
                ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                : isFollowing ? <><UserCheck size={12} /> Following</> : <><UserPlus size={12} /> Follow</>
              }
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Name + handle ────────────────────────────────────────────── */}
      <div style={{ padding: '0 4px', marginBottom: 8 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 22,
          color: 'var(--text-primary)', margin: '0 0 3px',
        }}>
          {displayName}
        </h1>
        {/* text-secondary (not muted) — readable against amber background */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
          @{username}
        </p>
      </div>

      {/* ── Bio ──────────────────────────────────────────────────────── */}
      {bio && (
        <p style={{
          padding: '0 4px',
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--text-primary)',   // full brightness for bio
          lineHeight: 1.65, margin: '0 0 14px',
        }}>
          {bio}
        </p>
      )}

      {/* ── Stats row — inline text ───────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '12px 4px 0',
        borderTop: '1px solid rgba(245,158,11,0.15)',
        flexWrap: 'wrap',
      }}>
        {[
          { value: post_count,      label: 'Posts' },
          { value: follower_count,  label: 'Followers' },
          { value: following_count, label: 'Following' },
        ].map(stat => (
          <div key={stat.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>
              {formatCount(stat.value)}
            </span>
            {/* text-secondary — readable, not invisible muted */}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {stat.label}
            </span>
          </div>
        ))}

        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 9999,
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            color: '#F59E0B', letterSpacing: '0.06em',
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
