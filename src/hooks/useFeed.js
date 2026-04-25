import { useEffect, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  fetchFeedPosts, selectPostsStatus, selectPostsHasMore,
  postsActions, hydrateRepostedIds
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
 * fetchFollowingIds is async. The initial feed fetch was firing with followingIds=[]
 * before it resolved. followingLoaded state gates the initial fetch so it only runs
 * after the following list is confirmed populated.
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

  const [followingLoaded, setFollowingLoaded] = useState(false)

  const initializedRef = useRef(false)
  const followingKey   = followingIds.join(',')

  // ── Step 1: Fetch followingIds + hydrate liked + reposted IDs ───────────
  useEffect(() => {
    if (!user?.id) return

    dispatch(fetchFollowingIds(user.id))
      .then(() => setFollowingLoaded(true))
      .catch(() => setFollowingLoaded(true))

    // Liked post IDs — for heart state on load
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data: likes }) => {
        if (likes?.length) {
          dispatch(postsActions.setLikedPostIds(likes.map(l => l.post_id)))
        }
      })

    // Reposted post IDs — for repost button state on load
    dispatch(hydrateRepostedIds(user.id))

  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: Initial feed fetch — runs ONLY after followingIds resolved ──
  useEffect(() => {
    if (!user?.id)          return
    if (!followingLoaded)   return
    if (initializedRef.current) return

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

  // ── Step 3: Load more ────────────────────────────────────────────────────
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

  return { feedPosts, loading, error: status === 'failed', hasMore, loadMore, isEmpty }
}
