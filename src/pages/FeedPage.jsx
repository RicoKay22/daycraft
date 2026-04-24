import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFeed } from '../hooks/useFeed'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import PostCard from '../components/feed/PostCard'
import PostCardSkeleton from '../components/feed/PostCardSkeleton'
import FeedEmpty from '../components/feed/FeedEmpty'
import CommentSheet from '../components/comments/CommentSheet'
import EtherealBackground from '../components/ui/EtherealBackground'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function FeedPage() {
  const { profile } = useAuth()
  const { feedPosts, loading, hasMore, loadMore, isEmpty } = useFeed()
  const [commentPost, setCommentPost] = useState(null)
  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore })

  const greeting = getGreeting()
  const name     = profile?.full_name || profile?.username || 'builder'

  return (
    <div style={{ position: 'relative' }}>
      {/* Forest Minimal ambient background — subtle green glow */}
      <EtherealBackground
        color="rgba(34, 197, 94, 0.12)"
        animationScale={45}
        animationSpeed={60}
        opacity={0.7}
      />

      {/* Content above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Feed header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24 }}
        >
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 22,
            color: 'var(--text-primary)', margin: '0 0 4px',
          }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>{name}</span> 👋
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            What's everyone building today?
          </p>
        </motion.div>

        {/* Skeleton loading */}
        {loading && feedPosts.length === 0 && (
          [...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)
        )}

        {/* Empty state */}
        {isEmpty && !loading && <FeedEmpty />}

        {/* Posts */}
        {feedPosts.map(post => (
          <PostCard key={post.id} post={post} onComment={setCommentPost} />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {loading && feedPosts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

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

      {/* Comment Sheet */}
      <CommentSheet
        post={commentPost}
        isOpen={!!commentPost}
        onClose={() => setCommentPost(null)}
      />
    </div>
  )
}
