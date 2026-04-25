import { createSelector, createSlice } from '@reduxjs/toolkit'
import { selectAllPosts } from './postsSlice'
import { selectFollowingIds } from './usersSlice'

const feedSlice = createSlice({
  name: 'feed',
  initialState: { page: 0, hasMore: true, loading: false, error: null },
  reducers: {
    setFeedPage(state, action)    { state.page    = action.payload },
    setFeedHasMore(state, action) { state.hasMore  = action.payload },
    setFeedLoading(state, action) { state.loading  = action.payload },
    resetFeed(state) {
      state.page    = 0
      state.hasMore = true
      state.loading = false
      state.error   = null
    },
  },
})

// ── Selectors ────────────────────────────────────────────────────────────────

// Feed: posts from followed users + own posts, sorted by recency
export const selectFeedPosts = createSelector(
  [selectAllPosts, selectFollowingIds, (_state, userId) => userId],
  (posts, followingIds, userId) =>
    posts
      .filter(post => followingIds.includes(post.user_id) || post.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

// Profile grid: posts by a specific user
export const selectPostsByUserId = createSelector(
  [selectAllPosts, (_state, userId) => userId],
  (posts, userId) =>
    posts
      .filter(post => post.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

/*
  selectTrendingPosts — previously applied a client-side score sort.
  Now that fetchExplorePosts calls the get_trending_posts RPC, the server
  already returns posts in correct decay-score order. Re-sorting client-side
  would corrupt that ordering. We now sort only by insertion order (IDs array
  order from the adapter) which preserves the server's ranking.
  Falling back to created_at sort as a safe default when RPC data isn't loaded.
*/
export const selectTrendingPosts = createSelector(
  [selectAllPosts],
  (posts) =>
    [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

export const selectLikedPosts = createSelector(
  [selectAllPosts],
  (posts) => posts.filter(post => post.is_liked_by_me)
)

export const selectFeedPage    = (state) => state.feed.page
export const selectFeedHasMore = (state) => state.feed.hasMore
export const selectFeedLoading = (state) => state.feed.loading

export const feedActions = feedSlice.actions
export default feedSlice.reducer
