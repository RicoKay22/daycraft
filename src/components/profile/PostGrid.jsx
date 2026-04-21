import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Image as ImageIcon, Code2, Dumbbell, BookOpen, Flame, Zap, Coffee } from 'lucide-react'

const TYPE_META = {
  dev:     { icon: Code2,    color: '#22C55E', label: 'DEV' },
  workout: { icon: Dumbbell, color: '#A3E635', label: 'WORKOUT' },
  build:   { icon: Flame,    color: '#F59E0B', label: 'BUILD' },
  read:    { icon: BookOpen, color: '#22C55E', label: 'READ' },
  log:     { icon: Zap,      color: '#A3E635', label: 'LOG' },
  other:   { icon: Coffee,   color: '#8A8980', label: 'CRAFT' },
}

function detectType(content = '') {
  const lower = content.toLowerCase()
  if (/\[(dev|build|workout|read|log)\]/i.test(content)) {
    const match = content.match(/\[(\w+)\]/i)
    const t = match?.[1]?.toLowerCase()
    if (TYPE_META[t]) return t
  }
  if (/\b(code|build|ship|deploy|react|js|python|api)\b/.test(lower)) return 'dev'
  if (/\b(workout|gym|run|lift|reps|fitness)\b/.test(lower)) return 'workout'
  if (/\b(read|book|chapter|page|finished)\b/.test(lower)) return 'read'
  if (/\b(build|project|launched|shipped|mvp)\b/.test(lower)) return 'build'
  if (/\b(log|day|streak|habit|daily)\b/.test(lower)) return 'log'
  return 'other'
}

function PostTile({ post, index }) {
  const navigate = useNavigate()
  const type     = detectType(post.content)
  const meta     = TYPE_META[type]
  const Icon     = meta.icon
  const hasImage = !!post.image_url

  // Strip [TYPE] prefix for display
  const displayText = post.content.replace(/^\[.*?\]\s*/, '').trim()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => navigate(`/post/${post.id}`)}
      style={{
        aspectRatio: '1 / 1',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 150ms, transform 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-bright)'
        e.currentTarget.style.transform = 'scale(1.02)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {hasImage ? (
        /* Image post */
        <>
          <img
            src={post.image_url}
            alt={displayText}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Hover overlay */}
          <div
            className="post-tile-overlay"
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(11,11,14,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 16, opacity: 0, transition: 'opacity 200ms',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
              <Heart size={14} fill="#fff" /> {post.like_count || 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
              <MessageCircle size={14} fill="#fff" /> {post.comment_count || 0}
            </span>
          </div>
        </>
      ) : (
        /* Text post */
        <div style={{
          width: '100%', height: '100%',
          padding: 12, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column',
          gap: 8,
        }}>
          {/* Type badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 6px',
            background: `${meta.color}15`,
            border: `1px solid ${meta.color}30`,
            borderRadius: 9999, alignSelf: 'flex-start',
            fontFamily: 'var(--font-mono)', fontSize: 8,
            fontWeight: 700, color: meta.color,
            letterSpacing: '0.06em',
          }}>
            <Icon size={8} />
            {meta.label}
          </span>

          {/* Post text */}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 11,
            color: 'var(--text-secondary)', lineHeight: 1.5,
            margin: 0, flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}>
            {displayText}
          </p>

          {/* Bottom stats */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 10, color: post.like_count ? '#EF4444' : 'var(--text-muted)' }}>
              <Heart size={10} fill={post.like_count ? '#EF4444' : 'none'} />
              {post.like_count || 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              <MessageCircle size={10} />
              {post.comment_count || 0}
            </span>
          </div>
        </div>
      )}

      {/* CSS for image hover overlay */}
      <style>{`
        .post-tile-overlay:hover { opacity: 1 !important; }
        div:hover > .post-tile-overlay { opacity: 1 !important; }
      `}</style>
    </motion.div>
  )
}

export default function PostGrid({ posts, loading, emptyMessage }) {
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 3,
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '1/1', borderRadius: 10 }} />
        ))}
      </div>
    )
  }

  if (!posts?.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 24px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)', fontSize: 14,
      }}>
        {emptyMessage || 'No posts yet.'}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 3,
    }}>
      {posts.map((post, i) => (
        <PostTile key={post.id} post={post} index={i} />
      ))}
    </div>
  )
}
