import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { selectPostById, fetchFeedPosts } from '../store/postsSlice'
import { selectFollowingIds } from '../store/usersSlice'
import { useAuth } from '../context/AuthContext'
import { useLike } from '../hooks/useLike'
import { supabase } from '../lib/supabase'
import PostCard from '../components/feed/PostCard'
import { formatDistanceToNow } from '../components/utils/time'

export default function PostDetailPage() {
  const { postId }   = useParams()
  const navigate     = useNavigate()
  const dispatch     = useDispatch()
  const { user }     = useAuth()
  const { toggleLike } = useLike()

  const post = useSelector(state => selectPostById(state, postId))
  const [loading, setLoading]   = useState(!post)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch post if not in store
  useEffect(() => {
    if (post) { setLoading(false); return }

    supabase
      .from('posts')
      .select('*, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data) dispatch({ type: 'posts/upsertOne', payload: data })
        setLoading(false)
      })
  }, [postId]) // eslint-disable-line

  // Fetch comments
  useEffect(() => {
    supabase
      .from('comments')
      .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data || []))
  }, [postId])

  async function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim() || !user || submitting) return
    setSubmitting(true)

    const optimistic = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      post_id: postId,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      author: { username: 'you', full_name: '', avatar_url: '' },
    }

    setComments(prev => [...prev, optimistic])
    setNewComment('')

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: user.id, post_id: postId, content: newComment.trim() })
        .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
        .single()

      if (error) throw error
      // Replace optimistic with real
      setComments(prev => prev.map(c => c.id === optimistic.id ? data : c))
    } catch (err) {
      // Revert
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      setNewComment(optimistic.content)
      console.error('Comment failed:', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: '25%', height: 10, borderRadius: 4 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '80%', height: 13, borderRadius: 4 }} />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Post not found.</p>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', border: 'none', borderRadius: 9999, color: '#0B0B0E', fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13, padding: '0 0 16px', transition: 'color 150ms' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Post card */}
      <PostCard post={post} />

      {/* Comments section */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px', letterSpacing: '0.04em' }}>
          COMMENTS · {comments.length}
        </h3>

        {/* Comment list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {comments.length === 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
              No comments yet. Be the first.
            </p>
          )}
          {comments.map(comment => {
            const a = comment.author || {}
            const initials = (a.username || 'U').slice(0, 2).toUpperCase()
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: a.avatar_url ? 'transparent' : 'var(--surface-raised)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {a.avatar_url
                    ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>{initials}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, color: 'var(--text-primary)' }}>@{a.username || 'user'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{formatDistanceToNow(comment.created_at)}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {comment.content}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Add comment */}
        {user && (
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              maxLength={300}
              disabled={submitting}
              style={{
                flex: 1, padding: '10px 14px',
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-bright)',
                borderRadius: 10, color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: 14,
                outline: 'none', opacity: submitting ? 0.7 : 1,
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              style={{
                padding: '10px 16px',
                background: newComment.trim() && !submitting ? 'var(--primary)' : 'var(--surface-raised)',
                border: 'none', borderRadius: 10,
                color: newComment.trim() && !submitting ? '#0B0B0E' : 'var(--text-muted)',
                fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                cursor: newComment.trim() && !submitting ? 'pointer' : 'not-allowed',
                transition: 'all 200ms', flexShrink: 0,
              }}
            >
              {submitting ? '...' : 'Post'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
