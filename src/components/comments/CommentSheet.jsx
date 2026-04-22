import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDispatch } from 'react-redux'
import { postsActions } from '../../store/postsSlice'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from '../utils/time'

export default function CommentSheet({ post, isOpen, onClose }) {
  const { user, profile } = useAuth()
  const dispatch           = useDispatch()

  const [comments,    setComments]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [newComment,  setNewComment]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Fetch comments when sheet opens
  useEffect(() => {
    if (!isOpen || !post?.id) return
    setLoading(true)

    supabase
      .from('comments')
      .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(data || [])
        setLoading(false)
        // Focus input after load
        setTimeout(() => inputRef.current?.focus(), 100)
      })
  }, [isOpen, post?.id])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newComment.trim() || !user || submitting) return
    setSubmitting(true)

    const optimisticComment = {
      id:         `temp-${Date.now()}`,
      user_id:    user.id,
      post_id:    post.id,
      content:    newComment.trim(),
      created_at: new Date().toISOString(),
      author: {
        username:   profile?.username || 'you',
        full_name:  profile?.full_name || '',
        avatar_url: profile?.avatar_url || '',
      },
    }

    setComments(prev => [...prev, optimisticComment])
    setNewComment('')

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: user.id, post_id: post.id, content: optimisticComment.content })
        .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
        .single()

      if (error) throw error

      // Replace optimistic with real
      setComments(prev => prev.map(c => c.id === optimisticComment.id ? data : c))

      // Update comment count in Redux optimistically
      dispatch(postsActions.incrementCommentCount({ postId: post.id }))

    } catch (err) {
      // Revert
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      setNewComment(optimisticComment.content)
      console.error('Comment failed:', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!post) return null

  const displayText = post.content?.replace(/^\[.*?\]\s*/, '').trim() || ''

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)',
              zIndex: 150,
            }}
          />

          {/* Sheet — slides up from bottom on mobile, right panel on desktop */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              height: '75dvh',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              borderRadius: '20px 20px 0 0',
              zIndex: 151,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            className="dc-comment-sheet"
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--border-bright)' }} />
            </div>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '8px 16px 12px',
              borderBottom: '1px solid var(--border)',
              gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: 'var(--font-heading)', fontSize: 14,
                  color: 'var(--text-primary)', margin: 0,
                }}>
                  Comments · <span style={{ color: 'var(--primary)' }}>{comments.length}</span>
                </p>
                {displayText && (
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 11,
                    color: 'var(--text-muted)', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '80%',
                  }}>
                    {displayText.slice(0, 60)}{displayText.length > 60 ? '...' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--surface-raised)', border: 'none',
                  borderRadius: '50%', width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Comment list — scrollable */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '12px 16px' }}>
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Loader2 size={20} color="var(--text-muted)" style={{ animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}

              {!loading && comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                    No comments yet. Start the conversation.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(comment => {
                  const a        = comment.author || {}
                  const initials = (a.username || 'U').slice(0, 2).toUpperCase()
                  const isOwn    = comment.user_id === user?.id

                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: 'flex', gap: 10 }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: a.avatar_url ? 'transparent' : (isOwn ? 'var(--primary)' : 'var(--surface-raised)'),
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {a.avatar_url
                          ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: isOwn ? '#0B0B0E' : 'var(--text-secondary)' }}>{initials}</span>
                        }
                      </div>

                      {/* Bubble */}
                      <div style={{
                        flex: 1,
                        background: isOwn ? 'var(--primary-glow)' : 'var(--surface-raised)',
                        border: `1px solid ${isOwn ? 'rgba(245,158,11,0.15)' : 'var(--border)'}`,
                        borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        padding: '8px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, color: isOwn ? 'var(--primary)' : 'var(--text-primary)' }}>
                            @{a.username || 'user'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(comment.created_at)}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                          {comment.content}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Comment input — pinned at bottom */}
            <div style={{
              flexShrink: 0,
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Own avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: profile?.avatar_url ? 'transparent' : 'var(--primary)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border)',
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: '#0B0B0E' }}>
                        {(profile?.username || 'Y').slice(0, 2).toUpperCase()}
                      </span>
                  }
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  maxLength={300}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '9px 14px',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 22,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    outline: 'none',
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
                />

                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: newComment.trim() && !submitting ? 'var(--primary)' : 'var(--surface-raised)',
                    border: 'none', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: newComment.trim() && !submitting ? 'pointer' : 'not-allowed',
                    color: newComment.trim() && !submitting ? '#0B0B0E' : 'var(--text-muted)',
                    transition: 'all 200ms',
                  }}
                >
                  {submitting
                    ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
                    : <Send size={15} />
                  }
                </button>
              </form>
            </div>
          </motion.div>

          <style>{`
            @media (min-width: 768px) {
              .dc-comment-sheet {
                left: auto !important;
                right: 0 !important;
                bottom: 0 !important;
                top: 56px !important;
                height: calc(100dvh - 56px) !important;
                width: 380px !important;
                border-top: none !important;
                border-left: 1px solid var(--border) !important;
                border-radius: 0 !important;
              }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  )
}
