import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, UserPlus, UserCheck, Loader2, TrendingUp } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { selectFollowingIds, usersActions } from '../store/usersSlice'
import { fetchExplorePosts } from '../store/postsSlice'
import PostCard from '../components/feed/PostCard'
import PostCardSkeleton from '../components/feed/PostCardSkeleton'
import { selectTrendingPosts } from '../store/feedSlice'

// ── Debounce utility ──────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── User card ─────────────────────────────────────────────────────────────────
function UserCard({ profile, currentUserId, followingIds, onFollow }) {
  const navigate    = useNavigate()
  const isOwn       = profile.id === currentUserId
  const isFollowing = followingIds.includes(profile.id)
  const [loading,   setLoading] = useState(false)

  const initials = (profile.full_name || profile.username || 'U').slice(0, 2).toUpperCase()

  async function handleFollow() {
    if (loading || isOwn) return
    setLoading(true)
    await onFollow(profile.id, isFollowing)
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      onClick={() => navigate(`/profile/${profile.username}`)}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: profile.avatar_url ? 'transparent' : 'var(--primary)',
        border: '1px solid var(--border)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#0B0B0E' }}>{initials}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.full_name || profile.username}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>
          @{profile.username} · {profile.follower_count || 0} followers
        </p>
      </div>

      {/* Follow button */}
      {!isOwn && (
        <button
          onClick={e => { e.stopPropagation(); handleFollow() }}
          disabled={loading}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px',
            background: isFollowing ? 'transparent' : 'var(--primary)',
            border: `1px solid ${isFollowing ? 'var(--border-bright)' : 'var(--primary)'}`,
            borderRadius: 9999,
            color: isFollowing ? 'var(--text-secondary)' : '#0B0B0E',
            fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 200ms',
          }}
          onMouseEnter={e => { if (!loading && isFollowing) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}}
          onMouseLeave={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
        >
          {loading
            ? <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />
            : isFollowing ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>
          }
        </button>
      )}
    </motion.div>
  )
}

// ── ExplorePage ───────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const dispatch     = useDispatch()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const followingIds = useSelector(selectFollowingIds)
  const trendingPosts = useSelector(selectTrendingPosts)

  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState([])
  const [suggestions,  setSuggestions]  = useState([])
  const [searching,    setSearching]    = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [activeTab,    setActiveTab]    = useState('trending')  // 'trending' | 'people'

  const debouncedQuery = useDebounce(query, 300)

  // ── Load trending posts ────────────────────────────────────────────────────
  useEffect(() => {
    if (trendingPosts.length === 0) {
      setPostsLoading(true)
      dispatch(fetchExplorePosts({ page: 0, limit: 20 }))
        .finally(() => setPostsLoading(false))
    }
  }, []) // eslint-disable-line

  // ── Load suggested users (not following yet) ───────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, follower_count, post_count')
      .neq('id', user.id)
      .order('follower_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setSuggestions(data || [])
      })
  }, [user?.id]) // eslint-disable-line

  // ── Live search (debounced 300ms) ──────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    setSearching(true)
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, follower_count')
      .or(`username.ilike.%${debouncedQuery}%,full_name.ilike.%${debouncedQuery}%`)
      .limit(10)
      .then(({ data }) => {
        setResults(data || [])
        setSearching(false)
      })
  }, [debouncedQuery])

  // ── Optimistic follow toggle ───────────────────────────────────────────────
  async function handleFollow(targetId, isFollowing) {
    dispatch(usersActions.toggleFollowOptimistic({ targetUserId: targetId, following: !isFollowing }))
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: user.id, following_id: targetId })
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      }
    } catch (err) {
      // Revert
      dispatch(usersActions.toggleFollowOptimistic({ targetUserId: targetId, following: isFollowing }))
      console.error('Follow failed:', err.message)
    }
  }

  const displayProfiles = query.trim() ? results : suggestions

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Explore
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Discover builders and see what everyone is crafting.
        </p>
      </motion.div>

      {/* Search bar */}
      <div style={{
        position: 'relative', marginBottom: 20,
      }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search builders by name or @username..."
          style={{
            width: '100%', padding: '11px 40px 11px 42px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
            <X size={15} />
          </button>
        )}
        {searching && (
          <Loader2 size={15} color="var(--text-muted)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {/* Tab switcher — only when not searching */}
      {!query.trim() && (
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
          {[['trending', 'Trending'], ['people', 'People to Follow']].map(([t, lbl]) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1, padding: '8px 0',
                background: activeTab === t ? 'var(--primary)' : 'transparent',
                color: activeTab === t ? '#0B0B0E' : 'var(--text-secondary)',
                border: 'none', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.05em', transition: 'all 200ms',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {query.trim() && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
            {results.length > 0 ? `${results.length} RESULT${results.length > 1 ? 'S' : ''}` : searching ? 'SEARCHING...' : 'NO RESULTS'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((p, i) => (
              <UserCard key={p.id} profile={p} currentUserId={user?.id} followingIds={followingIds} onFollow={handleFollow} />
            ))}
          </div>
          {results.length === 0 && !searching && (
            <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              No builders found for "{query}"
            </div>
          )}
        </div>
      )}

      {/* Trending posts tab */}
      {!query.trim() && activeTab === 'trending' && (
        <div>
          {postsLoading && [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          {!postsLoading && trendingPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <TrendingUp size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                No posts yet. Be the first to craft something!
              </p>
            </div>
          )}
          {trendingPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* People tab */}
      {!query.trim() && activeTab === 'people' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
            BUILDERS ON DAYCRAFT
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
                No other builders yet.
              </p>
            )}
            {suggestions.map(p => (
              <UserCard key={p.id} profile={p} currentUserId={user?.id} followingIds={followingIds} onFollow={handleFollow} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
