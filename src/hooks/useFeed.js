import { useEffect, useCallback, useRef } from 'react'
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
 * KEY FIX: hasMore must come from postsSlice (updated on every fetch result)
 * NOT feedSlice (which was never updated, causing infinite loadMore loop)
 */
export function useFeed() {
  const dispatch   = useDispatch()
  const { user }   = useAuth()

  const followingIds = useSelector(selectFollowingIds)
  const status       = useSelector(selectPostsStatus)
  const page         = useSelector(selectFeedPage)
  const feedLoading  = useSelector(selectFeedLoading)

  // ← CRITICAL: use posts slice hasMore — it is set to false when result < 12
  // feedSlice.hasMore was never being updated, causing infinite loop
  const hasMore = useSelector(selectPostsHasMore)

  // Derived selector — posts filtered by followed users + own posts
  const feedPosts = useSelector(state => selectFeedPosts(state, user?.id))

  // Stable refs — survive re-renders without causing effect re-runs
  const initializedRef = useRef(false)
  const followingKey   = followingIds.join(',')

  // ── Step 1: Fetch followingIds + hydrate liked post IDs ──────────────────
  useEffect(() => {
    if (!user?.id) return

    dispatch(fetchFollowingIds(user.id))

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

  // ── Step 2: Initial feed fetch — runs ONCE only ───────────────────────────
  useEffect(() => {
    if (!user?.id) return
    if (initializedRef.current) return     // guard: never run twice

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
  }, [followingKey, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 3: Load more — triggered by IntersectionObserver ─────────────────
  const loadMore = useCallback(() => {
    if (!user?.id)                return
    if (!initializedRef.current)  return   // initial load not done yet
    if (feedLoading)              return   // already loading
    if (!hasMore)                 return   // no more pages — STOPS the infinite loop
    if (status === 'loading')     return   // posts are loading

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
