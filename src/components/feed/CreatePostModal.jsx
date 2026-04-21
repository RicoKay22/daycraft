import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Code2, Dumbbell, BookOpen, Flame, Zap, Send, Loader2, AlertCircle } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useAuth } from '../../context/AuthContext'
import { createPost } from '../../store/postsSlice'
import { supabase } from '../../lib/supabase'

const TYPE_OPTIONS = [
  { id: 'dev',     label: 'Dev',     icon: Code2,    color: '#22C55E' },
  { id: 'workout', label: 'Workout', icon: Dumbbell, color: '#A3E635' },
  { id: 'build',   label: 'Build',   icon: Flame,    color: '#F59E0B' },
  { id: 'read',    label: 'Read',    icon: BookOpen, color: '#22C55E' },
  { id: 'log',     label: 'Log',     icon: Zap,      color: '#A3E635' },
]

const MAX_CHARS  = 500
const DRAFT_KEY  = 'dc_post_draft'
const TIMEOUT_MS = 12000   // 12 seconds before we give up

// ─── Promise with timeout ─────────────────────────────────────────────────────
function withTimeout(promise, ms, label = 'Request') {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out. Check your connection and try again.`)), ms)
  )
  return Promise.race([promise, timer])
}

export default function CreatePostModal({ isOpen, onClose }) {
  const { user, profile } = useAuth()
  const dispatch           = useDispatch()

  // ── Draft state — restored from localStorage on mount ────────────────────
  const [content,      setContent]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY))?.content || '' } catch { return '' }
  })
  const [postType,     setPostType]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY))?.postType || 'dev' } catch { return 'dev' }
  })
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading,    setUploading]    = useState(false)
  const [error,        setError]        = useState('')
  const [timedOut,     setTimedOut]     = useState(false)
  const fileRef = useRef(null)

  // ── Persist draft to localStorage whenever content/type changes ───────────
  useEffect(() => {
    if (content || postType !== 'dev') {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, postType }))
    }
  }, [content, postType])

  const charsLeft = MAX_CHARS - content.length
  const canPost   = content.trim().length > 0 && !uploading

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'you'
  const displayName     = profile?.full_name || displayUsername
  const displayAvatar   = profile?.avatar_url || null
  const displayInitials = displayUsername.slice(0, 2).toUpperCase()

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
  }

  function resetAndClose() {
    clearDraft()
    setContent(''); setImageFile(null); setImagePreview(null)
    setError(''); setPostType('dev'); setUploading(false); setTimedOut(false)
    onClose()
  }

  function handleClose() {
    if (uploading) return
    // Don't clear draft on close — user might have lost focus by accident
    // Draft is only cleared on successful post
    setImageFile(null); setImagePreview(null)
    setError(''); setUploading(false); setTimedOut(false)
    onClose()
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit() {
    if (!canPost || !user) return
    setUploading(true); setError(''); setTimedOut(false)

    try {
      let imageUrl = null

      // ── Image upload with timeout ───────────────────────────────────────
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop().toLowerCase()
        const path = `${user.id}/${Date.now()}.${ext}`

        const uploadPromise = supabase.storage
          .from('daycraft-media')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false })

        const { error: uploadErr } = await withTimeout(uploadPromise, TIMEOUT_MS, 'Image upload')
        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`)

        const { data: urlData } = supabase.storage.from('daycraft-media').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      // ── Post insert with timeout ────────────────────────────────────────
      const typePrefix   = `[${postType.toUpperCase()}] `
      const finalContent = content.startsWith('[') ? content : typePrefix + content

      const postPromise = dispatch(createPost({
        userId:   user.id,
        content:  finalContent,
        imageUrl,
        author: {
          id:         user.id,
          username:   displayUsername,
          full_name:  displayName,
          avatar_url: displayAvatar || '',
        },
      }))

      const result = await withTimeout(postPromise, TIMEOUT_MS, 'Post creation')

      if (createPost.rejected.match(result)) {
        throw new Error(result.payload || 'Failed to create post')
      }

      // ── Success ──────────────────────────────────────────────────────────
      clearDraft()
      resetAndClose()

    } catch (err) {
      console.error('Post error:', err)
      const isTimeout = err.message?.includes('timed out')
      setTimedOut(isTimeout)
      setError(
        isTimeout
          ? 'Connection timed out. Your draft is saved — please try again.'
          : err.message || 'Failed to create post. Please try again.'
      )
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — flex container for responsive centering */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: 'calc(100dvh - 32px)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                zIndex: 201,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Scrollable content */}
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '20px 20px 0' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
                    New post
                    {content.length > 0 && !uploading && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--accent)', marginLeft: 8, fontWeight: 400 }}>
                        · Draft saved
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={handleClose}
                    disabled={uploading}
                    style={{
                      background: 'none', border: 'none',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      color: 'var(--text-muted)', padding: 6, borderRadius: 7,
                      display: 'flex', opacity: uploading ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'var(--surface-raised)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Type selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {TYPE_OPTIONS.map(type => {
                    const Icon   = type.icon
                    const active = postType === type.id
                    return (
                      <button
                        key={type.id}
                        onClick={() => setPostType(type.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px',
                          background: active ? `${type.color}18` : 'var(--surface-raised)',
                          border: `1px solid ${active ? type.color + '50' : 'var(--border)'}`,
                          borderRadius: 9999,
                          color: active ? type.color : 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 150ms',
                        }}
                      >
                        <Icon size={11} />
                        {type.label}
                      </button>
                    )
                  })}
                </div>

                {/* User chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: displayAvatar ? 'transparent' : 'var(--primary)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border)',
                  }}>
                    {displayAvatar
                      ? <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: '#0B0B0E' }}>{displayInitials}</span>
                    }
                  </div>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    @{displayUsername}
                  </span>
                </div>

                {/* Textarea */}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="What are you crafting today?"
                  autoFocus
                  rows={4}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)', fontSize: 15,
                    lineHeight: 1.6, resize: 'none', outline: 'none',
                    boxSizing: 'border-box', marginBottom: 12,
                    opacity: uploading ? 0.6 : 1,
                  }}
                />

                {/* Image preview */}
                {imagePreview && (
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null) }}
                      disabled={uploading}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.68)', border: 'none',
                        borderRadius: '50%', width: 26, height: 26,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer', color: '#fff',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Error / timeout message */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    color: timedOut ? '#FCD34D' : '#FCA5A5',
                    marginBottom: 12, padding: '10px 12px',
                    background: timedOut ? 'rgba(252,211,77,0.08)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${timedOut ? 'rgba(252,211,77,0.25)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 8,
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </div>
                )}

                <div style={{ height: 8 }} />
              </div>

              {/* Footer — always visible, never compressed */}
              <div style={{
                flexShrink: 0,
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Attach image (max 5MB)"
                  style={{
                    background: 'none', border: 'none',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    color: imageFile ? 'var(--accent)' : 'var(--text-muted)',
                    padding: 8, borderRadius: 8, display: 'flex',
                    opacity: uploading ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!uploading && !imageFile) { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--accent)' }}}
                  onMouseLeave={e => { if (!imageFile) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}}
                >
                  <Image size={17} />
                </button>

                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 'auto',
                  color: charsLeft < 50 ? (charsLeft < 20 ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)',
                }}>
                  {charsLeft}
                </span>

                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canPost}
                  whileHover={{ scale: canPost ? 1.02 : 1 }}
                  whileTap={{ scale: canPost ? 0.97 : 1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px',
                    background: canPost ? 'var(--primary)' : 'var(--surface-raised)',
                    border: `1px solid ${canPost ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 9999,
                    color: canPost ? '#0B0B0E' : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.04em',
                    cursor: canPost ? 'pointer' : 'not-allowed',
                    transition: 'all 200ms', minWidth: 88,
                    justifyContent: 'center',
                  }}
                >
                  {uploading
                    ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Posting...</>
                    : timedOut
                    ? <><Send size={13} /> Retry</>
                    : <><Send size={13} /> Post</>
                  }
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
