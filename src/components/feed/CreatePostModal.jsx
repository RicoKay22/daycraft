import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Code2, Dumbbell, BookOpen, Flame, Zap, Send, Loader2 } from 'lucide-react'
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

const MAX_CHARS = 500

export default function CreatePostModal({ isOpen, onClose }) {
  const { user, profile } = useAuth()
  const dispatch          = useDispatch()

  const [content,   setContent]   = useState('')
  const [postType,  setPostType]  = useState('dev')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef(null)

  const charsLeft = MAX_CHARS - content.length
  const canPost   = content.trim().length > 0 && !uploading

  function handleClose() {
    setContent(''); setImageFile(null); setImagePreview(null)
    setError(''); setPostType('dev'); setUploading(false)
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canPost) return
    setUploading(true); setError('')

    try {
      let imageUrl = null

      // Upload image if attached
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('daycraft-media')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('daycraft-media')
          .getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      // Prefix content with type tag so auto-detection works
      const typePrefix = `[${postType.toUpperCase()}] `
      const finalContent = content.startsWith('[') ? content : typePrefix + content

      await dispatch(createPost({
        userId:   user.id,
        content:  finalContent,
        imageUrl,
        author: {
          id:         user.id,
          username:   profile?.username || user.email?.split('@')[0],
          full_name:  profile?.full_name || '',
          avatar_url: profile?.avatar_url || '',
        },
      })).unwrap()

      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to create post. Please try again.')
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', maxWidth: 520,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '20px 20px 16px',
              zIndex: 201,
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontSize: 16,
                color: 'var(--text-primary)', margin: 0, flex: 1,
              }}>
                New post
              </h3>
              <button onClick={handleClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 6, borderRadius: 7,
                display: 'flex', transition: 'background 150ms',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Post type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map(type => {
                const Icon    = type.icon
                const active  = postType === type.id
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
                      letterSpacing: '0.05em', cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <Icon size={11} />
                    {type.label}
                  </button>
                )
              })}
            </div>

            {/* User info row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: profile?.avatar_url ? 'transparent' : 'var(--primary)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: '#0B0B0E' }}>
                      {(profile?.username || 'U').slice(0, 2).toUpperCase()}
                    </span>
                }
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--text-secondary)' }}>
                @{profile?.username || 'you'}
              </span>
            </div>

            {/* Textarea */}
            <form onSubmit={handleSubmit}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder={`What are you crafting today? Share your ${postType === 'dev' ? 'code progress' : postType === 'workout' ? 'workout log' : postType === 'read' ? 'reading update' : 'build update'}...`}
                autoFocus
                rows={4}
                style={{
                  width: '100%', padding: '10px 0',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: 15,
                  lineHeight: 1.6, resize: 'none',
                  outline: 'none', boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />

              {/* Image preview */}
              {imagePreview && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.6)', border: 'none',
                      borderRadius: '50%', width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: '#FCA5A5', margin: '0 0 10px',
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: 8,
                }}>
                  {error}
                </p>
              )}

              {/* Footer actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Attach image */}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 8, borderRadius: 8,
                    display: 'flex', transition: 'background 150ms, color 150ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--surface-raised)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                  title="Attach image"
                >
                  <Image size={17} />
                </button>

                {/* Char count */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: charsLeft < 50 ? (charsLeft < 20 ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)',
                  marginLeft: 'auto',
                }}>
                  {charsLeft}
                </span>

                {/* Post button */}
                <motion.button
                  type="submit"
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
                    transition: 'all 200ms',
                  }}
                >
                  {uploading
                    ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Posting...</>
                    : <><Send size={13} /> Post</>
                  }
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
