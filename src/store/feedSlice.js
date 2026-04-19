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
    resetFeed(state) { state.page = 0; state.hasMore = true; state.loading = false; state.error = null },
  },
})

export const selectFeedPosts = createSelector(
  [selectAllPosts, selectFollowingIds, (_state, userId) => userId],
  (posts, followingIds, userId) =>
    posts
      .filter(post => followingIds.includes(post.user_id) || post.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

export const selectPostsByUserId = createSelector(
  [selectAllPosts, (_state, userId) => userId],
  (posts, userId) =>
    posts.filter(post => post.user_id === userId)
         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

export const selectTrendingPosts = createSelector(
  [selectAllPosts],
  (posts) => [...posts].sort((a, b) => {
    const score = (p) => (p.like_count || 0) * 3 + (new Date(p.created_at).getTime() / 1e10)
    return score(b) - score(a)
  })
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