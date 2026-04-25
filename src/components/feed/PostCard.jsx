import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Share2, MoreHorizontal, Trash2, Code2, Dumbbell, BookOpen, Flame, Zap, Coffee, Repeat2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { formatDistanceToNow } from '../utils/time'
import { useLike } from '../../hooks/useLike'
import {
  deletePost, toggleRepost, trackImpression,
  postsActions, selectImpressionTracked,
} from '../../store/postsSlice'
import { useAuth } from '../../context/AuthContext'
import LikeButton from '../ui/LikeButton'

// ── Post type tags ────────────────────────────────────────────────────────────
const POST_TYPES = {
  dev:     { icon: Code2,    label: 'Dev',     color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  workout: { icon: Dumbbell, label: 'Workout', color: '#A3E635', bg: 'rgba(163,230,53,0.1)' },
  build:   { icon: Flame,    label: 'Build',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  read:    { icon: BookOpen, label: 'Read',    color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  log:     { icon: Zap,      label: 'Log',     color: '#A3E635', bg: 'rgba(163,230,53,0.1)' },
  other:   { icon: Coffee,   label: 'Craft',   color: '#8A8980', bg: 'rgba(138,137,128,0.1)' },
}

function detectType(content = '') {
  const explicit = content.match(/^\[(DEV|WORKOUT|BUILD|READ|LOG)\]/i)
  if (explicit) {
    const map = { dev: 'dev', workout: 'workout', build: 'build', read: 'read', log: 'log' }
    return map[explicit[1].toLowerCase()] || 'other'
  }
  const stripped = content.replace(/^\[\w+\]\s*/, '')
  const lower = stripped.toLowerCase()
  if (/\b(code|ship|deploy|commit|react|js|python|api)\b/.test(lower)) return 'dev'
  if (/\b(workout|gym|run|lift|reps|fitness|km|miles)\b/.test(lower)) return 'workout'
  if (/\b(read|book|chapter|finished|novel)\b/.test(lower)) return 'read'
  if (/\b(build|launched|shipped|mvp|project)\b/.test(lower)) return 'build'
  if (/\b(log|day|streak|habit|daily)\b/.test(lower)) return 'log'
  return 'other'
}

function stripTypePrefix(text = '') {
  return text.replace(/^\[\w+\]\s*/, '').trim()
}

export default function PostCard({ post, onComment }) {
  const { user }       = useAuth()
  const navigate       = useNavigate()
  const dispatch       = useDispatch()
  const { toggleLike } = useLike()

  const impressionTracked = useSelector(selectImpressionTracked)
  const cardRef           = useRef(null)

  const [menuOpen,  setMenuOpen]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [copyDone,  setCopyDone]  = useState(false)
  const [reposting, setReposting] = useState(false)

  const isOwner      = user?.id === post.user_id
  const type         = detectType(post.content)
  const postType     = POST_TYPES[type] || POST_TYPES.other
  const TypeIcon     = postType.icon
  const author       = post.author || {}
  const username     = author.username || 'unknown'
  const name         = author.full_name || username
  const avatar       = author.avatar_url
  const initials     = (name || 'U').slice(0, 2).toUpperCase()
  const timeAgo      = formatDistanceToNow(post.created_at)
  const isReposted   = post.is_reposted_by_me || false

  // ── Impression tracking — IntersectionObserver ────────────────────────────
  // Fires once per post per session when the card enters the viewport.
  // This is the same API required by the assignment (IntersectionObserver).
  useEffect(() => {
    if (!cardRef.current || impressionTracked.includes(post.id)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          dispatch(postsActions.markImpressionTracked(post.id))
          dispatch(trackImpression(post.id))
          observer.disconnect()
        }
      },
      { threshold: 0.5 }   // 50% of card must be visible to count as an impression
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [post.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return
    setDeleting(true)
    setMenuOpen(false)
    await dispatch(deletePost({ postId: post.id, userId: user.id }))
    setDeleting(false)
  }

  // ── Repost (optimistic) ───────────────────────────────────────────────────
  async function handleRepost(e) {
    e.stopPropagation()
    if (reposting) return
    setReposting(true)

    // Optimistic update immediately
    dispatch(postsActions.toggleRepostOptimistic({ postId: post.id, reposted: !isReposted }))

    // API call in background — postsSlice reverts on failure
    await dispatch(toggleRepost({
      postId: post.id,
      userId: user.id,
      currentlyReposted: isReposted,
    }))
    setReposting(false)
  }

  // ── Share / copy link ─────────────────────────────────────────────────────
  async function handleShare(e) {
    e.stopPropagation()
    const url = `${window.location.origin}/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    } catch {
      if (navigator.share) navigator.share({ url })
    }
  }

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 16px 12px',
        marginBottom: 10,
        opacity: deleting ? 0.4 : 1,
        transition: 'opacity 200ms',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>

        {/* Avatar */}
        <button
          onClick={() => navigate(`/profile/${username}`)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: avatar ? 'transparent' : 'var(--primary)',
            overflow: 'hidden', flexShrink: 0, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {avatar
            ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, color: '#0B0B0E' }}>{initials}</span>
          }
        </button>

        {/* Name + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/profile/${username}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {name}
              </span>
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              @{username}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 7px',
              background: postType.bg,
              border: `1px solid ${postType.color}25`,
              borderRadius: 9999,
              fontFamily: 'var(--font-mono)', fontSize: 9,
              fontWeight: 700, letterSpacing: '0.05em',
              color: postType.color,
            }}>
              <TypeIcon size={9} />
              {postType.label.toUpperCase()}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>
            {timeAgo}
          </p>
        </div>

        {/* Three-dot menu (own posts only) */}
        {isOwner && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
              style={{
                background: menuOpen ? 'var(--surface-raised)' : 'none',
                border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 6, borderRadius: 7,
                display: 'flex', transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
              onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'none' }}
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 9, minWidth: 130,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    overflow: 'hidden', zIndex: 20,
                  }}
                >
                  <button
                    onClick={handleDelete}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'none', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', color: 'var(--danger)',
                      fontFamily: 'var(--font-body)', fontSize: 13,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Trash2 size={13} /> Delete post
                  </button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div onClick={() => navigate(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--text-primary)', lineHeight: 1.65,
          margin: '0 0 12px',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {stripTypePrefix(post.content)}
        </p>

        {post.image_url && (
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--border)' }}>
            <img
              src={post.image_url}
              alt="Post"
              loading="lazy"
              style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }}
            />
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderTop: '1px solid var(--border)',
        paddingTop: 8, marginTop: 4, gap: 4,
      }}>
        {/* Like */}
        <LikeButton
          liked={post.is_liked_by_me}
          count={post.like_count}
          onToggle={() => toggleLike(post.id, post.is_liked_by_me)}
        />

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); if (onComment) { onComment(post) } else { navigate(`/post/${post.id}`) } }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 8,
            color: 'var(--text-muted)', transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.color = '#22C55E' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {post.comment_count || 0}
          </span>
        </button>

        {/* Repost — green when active, same as X/Twitter repost */}
        <button
          onClick={handleRepost}
          disabled={reposting}
          title={isReposted ? 'Undo repost' : 'Repost'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isReposted ? 'rgba(34,197,94,0.08)' : 'none',
            border: 'none', cursor: reposting ? 'not-allowed' : 'pointer',
            padding: '6px 8px', borderRadius: 8,
            color: isReposted ? '#22C55E' : 'var(--text-muted)',
            opacity: reposting ? 0.6 : 1,
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { if (!reposting) { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.color = '#22C55E' }}}
          onMouseLeave={e => { if (!isReposted) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}}
        >
          <Repeat2 size={16} strokeWidth={1.8} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {post.repost_count || 0}
          </span>
        </button>

        {/* Share / copy link */}
        <button
          onClick={handleShare}
          title="Copy post link"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 8,
            color: copyDone ? '#22C55E' : 'var(--text-muted)',
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { if (!copyDone) { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
          onMouseLeave={e => { if (!copyDone) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}}
        >
          <Share2 size={15} strokeWidth={1.8} />
          {copyDone && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22C55E' }}>Copied!</span>
          )}
        </button>
      </div>
    </motion.article>
  )
}
