import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  fetchFeedPosts, selectPostsStatus, postsActions
} from '../store/postsSlice'
import { fetchFollowingIds, selectFollowingIds } from '../store/usersSlice'
import {
  selectFeedPosts, feedActions,
  selectFeedPage, selectFeedHasMore, selectFeedLoading
} from '../store/feedSlice'
import { supabase } from '../lib/supabase'

/**
 * useFeed — REQUIRED by assignment
 * Fixed: followingIds reference equality, loadMore guard, initialization race
 */
export function useFeed() {
  const dispatch    = useDispatch()
  const { user }   = useAuth()

  const followingIds = useSelector(selectFollowingIds)
  const status       = useSelector(selectPostsStatus)
  const page         = useSelector(selectFeedPage)
  const hasMore      = useSelector(selectFeedHasMore)
  const feedLoading  = useSelector(selectFeedLoading)

  // Derived selector — posts filtered by followed users + own posts
  const feedPosts = useSelector(state =>
    selectFeedPosts(state, user?.id)
  )

  // Track if initial load has started — prevents loadMore firing before first fetch
  const initializedRef = useRef(false)
  // Stable key for followingIds — prevents new array reference causing re-runs
  const followingKey = followingIds.join(',')

  // ── STEP 1: Fetch who the user follows + hydrate liked post IDs ──────────
  useEffect(() => {
    if (!user?.id) return

    const init = async () => {
      await dispatch(fetchFollowingIds(user.id))

      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)

      if (likes?.length) {
        dispatch(postsActions.setLikedPostIds(likes.map(l => l.post_id)))
      }
    }

    init()
  }, [user?.id]) // eslint-disable-line

  // ── STEP 2: Fetch posts once followingIds are known ──────────────────────
  // Uses followingKey (string) not followingIds (array) to prevent reference churn
  useEffect(() => {
    if (!user?.id) return
    if (initializedRef.current) return  // only run once

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
  }, [followingKey, user?.id]) // eslint-disable-line

  // ── STEP 3: Load more (infinite scroll) ──────────────────────────────────
  const loadMore = useCallback(() => {
    // Guard: don't fire if initial load hasn't settled
    if (!user?.id) return
    if (!initializedRef.current) return
    if (feedLoading) return
    if (!hasMore) return
    if (status === 'loading') return

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
  }, [user?.id, feedLoading, hasMore, status, page, followingKey]) // eslint-disable-line

  return {
    feedPosts,
    loading:  status === 'loading' || feedLoading,
    error:    status === 'failed',
    hasMore,
    loadMore,
    isEmpty:  initializedRef.current && status !== 'loading' && !feedLoading && feedPosts.length === 0,
  }
}
