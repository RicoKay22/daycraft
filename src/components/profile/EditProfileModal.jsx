import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, Check } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useAuth } from '../../context/AuthContext'
import { updateProfile } from '../../store/usersSlice'
import { supabase } from '../../lib/supabase'

const PROFILE_DRAFT_KEY = 'dc_profile_draft'

export default function EditProfileModal({ isOpen, profileUser, onClose, onSaved }) {
  const { user, refreshProfile } = useAuth()
  const dispatch = useDispatch()
  const fileRef  = useRef(null)

  // Restore draft if it exists (same pattern as CreatePostModal)
  const savedDraft = (() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_DRAFT_KEY)) || {} } catch { return {} }
  })()

  const [fullName,      setFullName]      = useState(savedDraft.fullName ?? profileUser?.full_name ?? '')
  const [bio,           setBio]           = useState(savedDraft.bio ?? profileUser?.bio ?? '')
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [saved,         setSaved]         = useState(false)

  const BIO_MAX = 160
  const hasDraft = savedDraft.fullName !== undefined || savedDraft.bio !== undefined

  // Auto-save draft on every keystroke
  function updateDraft(updates) {
    const current = { fullName, bio, ...updates }
    localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(current))
  }

  function clearDraft() {
    localStorage.removeItem(PROFILE_DRAFT_KEY)
  }

  function handleClose() {
    if (saving) return
    // Keep draft on close — user might have accidentally closed
    setAvatarFile(null); setAvatarPreview(null)
    setError(''); setSaving(false)
    onClose()
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!user || saving) return
    setSaving(true); setError('')

    try {
      let avatar_url = profileUser?.avatar_url || ''

      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop().toLowerCase()
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('daycraft-media')
          .upload(path, avatarFile, { cacheControl: '3600', upsert: true })
        if (upErr) throw new Error(`Avatar upload failed: ${upErr.message}`)
        const { data } = supabase.storage.from('daycraft-media').getPublicUrl(path)
        avatar_url = `${data.publicUrl}?t=${Date.now()}`
      }

      const updates = { full_name: fullName.trim(), bio: bio.trim(), avatar_url }

      // Timeout on save — prevents infinite hang
      const savePromise = dispatch(updateProfile({ userId: user.id, updates }))
      const timeout     = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timed out. Please try again.')), 10000)
      )

      const result = await Promise.race([savePromise, timeout])

      if (updateProfile.rejected.match(result)) {
        throw new Error(result.payload || 'Failed to save profile')
      }

      // Refresh profile in AuthContext so TopBar avatar updates immediately
      await refreshProfile(user.id)

      clearDraft()
      setSaved(true)
      await onSaved?.()
      setTimeout(() => { setSaved(false); onClose() }, 800)

    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.')
      setSaving(false)
    }
  }

  const currentAvatar   = avatarPreview || profileUser?.avatar_url
  const currentInitials = ((profileUser?.full_name || profileUser?.username) || 'U').slice(0, 2).toUpperCase()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 460,
                maxHeight: 'calc(100dvh - 32px)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 16, zIndex: 201,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '20px 20px 0' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
                    Edit Profile
                    {hasDraft && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--accent)', marginLeft: 8, fontWeight: 400 }}>
                        · Draft saved
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={handleClose} disabled={saving}
                    style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex', opacity: saving ? 0.4 : 1 }}
                    onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--surface-raised)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 20,
                      background: currentAvatar ? 'transparent' : 'var(--primary)',
                      border: '2px solid var(--border)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {currentAvatar
                        ? <img src={currentAvatar} alt={`${profileUser?.username || 'User'} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#0B0B0E' }}>{currentInitials}</span>
                      }
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        position: 'absolute', bottom: -4, right: -4,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--primary)', border: '2px solid var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#0B0B0E',
                      }}
                    >
                      <Camera size={13} />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input value={`@${profileUser?.username || ''}`} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                    <p style={hintStyle}>Username cannot be changed.</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Display Name</label>
                    <input
                      type="text" value={fullName}
                      onChange={e => { setFullName(e.target.value.slice(0, 50)); updateDraft({ fullName: e.target.value.slice(0, 50), bio }) }}
                      placeholder="Your display name" disabled={saving}
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Bio</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: bio.length > BIO_MAX - 20 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 400 }}>
                        {BIO_MAX - bio.length}
                      </span>
                    </label>
                    <textarea
                      value={bio}
                      onChange={e => { setBio(e.target.value.slice(0, BIO_MAX)); updateDraft({ fullName, bio: e.target.value.slice(0, BIO_MAX) }) }}
                      placeholder="Tell people what you're building..."
                      rows={3} disabled={saving}
                      style={{ ...inputStyle, resize: 'none', lineHeight: 1.55, paddingTop: 10, paddingBottom: 10 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  {error && (
                    <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: '#FCA5A5' }}>
                      {error}
                    </div>
                  )}
                </div>
                <div style={{ height: 8 }} />
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={handleClose} disabled={saving}
                  style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--border-bright)', borderRadius: 9999, color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSave} disabled={saving}
                  whileTap={{ scale: saving ? 1 : 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
                    background: saved ? '#22C55E' : 'var(--primary)',
                    border: 'none', borderRadius: 9999, color: '#0B0B0E',
                    fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background 300ms', minWidth: 90, justifyContent: 'center',
                  }}
                >
                  {saving && !saved && <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />}
                  {saved && <Check size={13} />}
                  {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--surface-raised)', border: '1px solid var(--border-bright)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms, box-shadow 150ms' }
const labelStyle = { display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }
const hintStyle  = { fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }
