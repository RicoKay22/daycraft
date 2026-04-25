import { useState, useEffect } from 'react'
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
import { useDispatch, useSelector } from 'react-redux'
import { fetchExplorePosts, selectPostsStatus } from '../store/postsSlice'
import { selectTrendingPosts } from '../store/feedSlice'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function FeedPage() {
  const { profile }    = useAuth()
  const dispatch       = useDispatch()
  const [commentPost, setCommentPost] = useState(null)
  const [activeTab,   setActiveTab]   = useState('foryou')  // 'foryou' | 'following'

  const greeting = getGreeting()
  const name     = profile?.full_name || profile?.username || 'builder'

  // ── Following feed (assignment Milestone 4) ──────────────────────────────
  const {
    feedPosts, loading: followingLoading,
    hasMore: followingHasMore, loadMore, isEmpty,
  } = useFeed()

  const sentinelRef = useInfiniteScroll({
    hasMore: activeTab === 'following' ? followingHasMore : false,
    loading: followingLoading,
    onLoadMore: loadMore,
  })

  // ── For You feed — all posts (X/Instagram style) ─────────────────────────
  const forYouPosts   = useSelector(selectTrendingPosts)
  const postsStatus   = useSelector(selectPostsStatus)
  const forYouLoading = postsStatus === 'loading' && forYouPosts.length === 0

  useEffect(() => {
    if (forYouPosts.length === 0) {
      dispatch(fetchExplorePosts({ page: 0, limit: 20 }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative' }}>

      {/* Forest Minimal ambient background */}
      <EtherealBackground
        color="rgba(34, 197, 94, 0.15)"
        animationScale={45}
        animationSpeed={60}
        opacity={0.75}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20 }}
        >
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 22,
            color: 'var(--text-primary)', margin: '0 0 4px',
          }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>{name}</span> 👋
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            What's everyone building today?
          </p>
        </motion.div>

        {/*
          Tab switcher — For You (global) + Following (assignment Milestone 4)
          Underline style matching profile tabs, green accent for forest minimal
        */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(34,197,94,0.15)',
          marginBottom: 20,
        }}>
          {[
            { key: 'foryou',    label: 'For You' },
            { key: 'following', label: 'Following' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                marginBottom: -1,
                color: activeTab === tab.key
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FOR YOU TAB — all posts ──────────────────────────────────── */}
        {activeTab === 'foryou' && (
          <div>
            {forYouLoading && [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
            {!forYouLoading && forYouPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                  No posts yet. Be the first to craft something!
                </p>
              </div>
            )}
            {forYouPosts.map(post => (
              <PostCard key={post.id} post={post} onComment={setCommentPost} />
            ))}
             <p style={{
                textAlign: 'center', padding: '24px 0',
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--text-secondary)', letterSpacing: '0.06em',
              }}>
                YOU'VE SEEN IT ALL · CRAFT SOMETHING NEW
              </p>
          </div>
        )}

        {/* ── FOLLOWING TAB — Milestone 4 filtered feed ───────────────── */}
        {activeTab === 'following' && (
          <div>
            {followingLoading && feedPosts.length === 0 && (
              [...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)
            )}
            {isEmpty && !followingLoading && <FeedEmpty />}
            {feedPosts.map(post => (
              <PostCard key={post.id} post={post} onComment={setCommentPost} />
            ))}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {followingLoading && feedPosts.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
              </div>
            )}
            {!followingHasMore && feedPosts.length > 0 && (
              <p style={{
                textAlign: 'center', padding: '24px 0',
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--text-secondary)', letterSpacing: '0.06em',
              }}>
                YOU'VE SEEN IT ALL · CRAFT SOMETHING NEW
              </p>
            )}
          </div>
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
