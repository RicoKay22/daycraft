import { useEffect, useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import { fetchFeedPosts, selectAllPosts, selectPostsStatus, postsActions } from '../store/postsSlice'
import { fetchFollowingIds, selectFollowingIds } from '../store/usersSlice'
import { selectFeedPosts, feedActions, selectFeedPage, selectFeedHasMore, selectFeedLoading } from '../store/feedSlice'
import { supabase } from '../lib/supabase'

/**
 * useFeed — REQUIRED by assignment
 * - Uses createSelector (selectFeedPosts) for filtered feed
 * - Fetches posts from followed users only (Milestone 4)
 * - Integrates with useInfiniteScroll
 * - Hydrates liked post IDs for optimistic state
 */
export function useFeed() {
  const dispatch  = useDispatch()
  const { user }  = useAuth()

  const followingIds  = useSelector(selectFollowingIds)
  const status        = useSelector(selectPostsStatus)
  const page          = useSelector(selectFeedPage)
  const hasMore       = useSelector(selectFeedHasMore)
  const feedLoading   = useSelector(selectFeedLoading)

  // Derived selector — posts filtered by followed users + own posts
  const feedPosts = useSelector(state =>
    selectFeedPosts(state, user?.id)
  )

  // Initial load
  useEffect(() => {
    if (!user) return

    const init = async () => {
      // 1. Fetch who the user follows
      await dispatch(fetchFollowingIds(user.id))

      // 2. Fetch liked post IDs for optimistic state
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)

      if (likes?.length) {
        dispatch(postsActions.setLikedPostIds(likes.map(l => l.post_id)))
      }
    }

    init()
  }, [user?.id, dispatch])

  // Fetch posts whenever followingIds are loaded
  useEffect(() => {
    if (!user || status !== 'idle') return

    dispatch(fetchFeedPosts({
      followingIds,
      userId: user.id,
      page: 0,
      limit: 12,
    }))
    dispatch(feedActions.setFeedPage(0))
  }, [followingIds, user?.id, dispatch])

  // Load more for infinite scroll
  const loadMore = useCallback(() => {
    if (!user || feedLoading || !hasMore) return

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
  }, [user, feedLoading, hasMore, page, followingIds, dispatch])

  return {
    feedPosts,
    loading:  status === 'loading',
    error:    status === 'failed',
    hasMore,
    loadMore,
    isEmpty:  status === 'succeeded' && feedPosts.length === 0,
  }
}
