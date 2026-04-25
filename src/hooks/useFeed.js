import { useEffect, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  fetchFeedPosts, selectPostsStatus, selectPostsHasMore, postsActions
} from '../store/postsSlice'
import { fetchFollowingIds, selectFollowingIds } from '../store/usersSlice'
import {
  selectFeedPosts, feedActions,
  selectFeedPage, selectFeedLoading
} from '../store/feedSlice'
import { supabase } from '../lib/supabase'

/**
 * useFeed — required by assignment
 *
 * RACE CONDITION FIX:
 * Previously, the initial feed fetch fired immediately on mount with followingIds = []
 * because fetchFollowingIds is async and Redux hadn't resolved it yet.
 * initializedRef was set to true on that empty-array fetch, so when following IDs
 * finally loaded, the guard blocked the re-fetch — feed showed only own posts.
 *
 * Fix: followingLoaded state is set only after fetchFollowingIds resolves.
 * The initial feed fetch useEffect has followingLoaded as a dependency and
 * will not run until it is true — guaranteeing followingIds is populated first.
 */
export function useFeed() {
  const dispatch   = useDispatch()
  const { user }   = useAuth()

  const followingIds  = useSelector(selectFollowingIds)
  const status        = useSelector(selectPostsStatus)
  const page          = useSelector(selectFeedPage)
  const feedLoading   = useSelector(selectFeedLoading)
  const hasMore       = useSelector(selectPostsHasMore)
  const feedPosts     = useSelector(state => selectFeedPosts(state, user?.id))

  // Tracks whether fetchFollowingIds has resolved — gates the initial feed fetch
  const [followingLoaded, setFollowingLoaded] = useState(false)

  const initializedRef = useRef(false)
  const followingKey   = followingIds.join(',')

  // ── Step 1: Fetch followingIds + hydrate liked post IDs ─────────────────
  useEffect(() => {
    if (!user?.id) return

    // Wait for followingIds to resolve before allowing feed fetch
    dispatch(fetchFollowingIds(user.id))
      .then(() => setFollowingLoaded(true))
      .catch(() => setFollowingLoaded(true)) // still unblock on error

    // Hydrate liked post IDs so heart states are correct on load
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data: likes }) => {
        if (likes?.length) {
          dispatch(postsActions.setLikedPostIds(likes.map(l => l.post_id)))
        }
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: Initial feed fetch — runs ONLY after followingIds has loaded ─
  useEffect(() => {
    if (!user?.id)          return
    if (!followingLoaded)   return  // wait — following IDs not resolved yet
    if (initializedRef.current) return  // already ran

    initializedRef.current = true
    dispatch(feedActions.setFeedLoading(true))
    dispatch(fetchFeedPosts({
      followingIds,
      userId: user.id,
      page: 0,
      limit: 12,
    })).finally(() => {
      dispatch(feedActions.setFeedLoading(false))
      dispatch(feedActions.setFeedPage(0))
    })
  }, [followingLoaded, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 3: Load more — triggered by IntersectionObserver ──────────────
  const loadMore = useCallback(() => {
    if (!user?.id)               return
    if (!initializedRef.current) return
    if (feedLoading)             return
    if (!hasMore)                return
    if (status === 'loading')    return

    const nextPage = page + 1
    dispatch(feedActions.setFeedPage(nextPage))
    dispatch(feedActions.setFeedLoading(true))
    dispatch(fetchFeedPosts({
      followingIds,
      userId: user.id,
      page: nextPage,
      limit: 12,
    })).finally(() => {
      dispatch(feedActions.setFeedLoading(false))
    })
  }, [user?.id, feedLoading, hasMore, status, page, followingKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = status === 'loading' || feedLoading
  const isEmpty = !loading && initializedRef.current && feedPosts.length === 0

  return {
    feedPosts,
    loading,
    error:  status === 'failed',
    hasMore,
    loadMore,
    isEmpty,
  }
}
