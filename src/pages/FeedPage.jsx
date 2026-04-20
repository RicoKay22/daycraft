import { useAuth } from '../context/AuthContext'
import { useFeed } from '../hooks/useFeed'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import PostCard from '../components/feed/PostCard'
import PostCardSkeleton from '../components/feed/PostCardSkeleton'
import FeedEmpty from '../components/feed/FeedEmpty'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function FeedPage() {
  const { profile } = useAuth()
  const { feedPosts, loading, hasMore, loadMore, isEmpty } = useFeed()

  // IntersectionObserver sentinel (required by assignment)
  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
  })

  const greeting = getGreeting()
  const name     = profile?.full_name || profile?.username || 'builder'

  return (
    <div>
      {/* ── Feed header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 22,
          color: 'var(--text-primary)', margin: '0 0 4px',
        }}>
          {greeting}, <span style={{ color: 'var(--primary)' }}>{name}</span> 👋
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--text-muted)', margin: 0,
        }}>
          What's everyone building today?
        </p>
      </motion.div>

      {/* ── Loading skeletons ─────────────────────────────────────────── */}
      {loading && feedPosts.length === 0 && (
        <>
          {[...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)}
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {isEmpty && !loading && <FeedEmpty />}

      {/* ── Posts ─────────────────────────────────────────────────────── */}
      {feedPosts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* ── Infinite scroll sentinel ──────────────────────────────────── */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* ── Load more indicator ───────────────────────────────────────── */}
      {loading && feedPosts.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '20px 0', color: 'var(--text-muted)',
        }}>
          <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* ── End of feed ───────────────────────────────────────────────── */}
      {!hasMore && feedPosts.length > 0 && (
        <p style={{
          textAlign: 'center', padding: '24px 0',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--text-muted)', letterSpacing: '0.06em',
        }}>
          YOU'VE SEEN IT ALL · CRAFT SOMETHING NEW
        </p>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
