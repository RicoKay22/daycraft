import { createEntityAdapter, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabase'

// ─── Entity Adapter ──────────────────────────────────────────────────────────
const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => new Date(b.created_at) - new Date(a.created_at),
})

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchFeedPosts = createAsyncThunk(
  'posts/fetchFeed',
  async ({ followingIds, userId, page = 0, limit = 12 }, { rejectWithValue }) => {
    const allIds = [...followingIds, userId].filter(Boolean)
    if (allIds.length === 0) return []
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)`)
      .in('user_id', allIds)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)
    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const fetchUserPosts = createAsyncThunk(
  'posts/fetchByUser',
  async ({ userId, page = 0, limit = 12 }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)
    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

/**
 * fetchExplorePosts — now calls get_trending_posts RPC instead of simple order.
 * The RPC calculates Wilson decay score server-side:
 *   score = (likes + comments×1.5 + reposts×2) / (hours_since_posted + 2)^1.8
 * This means fresh posts with momentum rank above old posts with many likes.
 */
export const fetchExplorePosts = createAsyncThunk(
  'posts/fetchExplore',
  async ({ page = 0, limit = 20 }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .rpc('get_trending_posts', { p_limit: limit, p_offset: page * limit })
    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const createPost = createAsyncThunk(
  'posts/create',
  async ({ userId, content, imageUrl = null, author }, { rejectWithValue }) => {
    const insertPromise = supabase
      .from('posts')
      .insert({ user_id: userId, content, image_url: imageUrl })
      .select()
      .single()

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Post creation timed out. Please try again.')), 10000)
    )

    const { data, error } = await Promise.race([insertPromise, timeout])
      .catch(err => ({ data: null, error: err }))

    if (error) return rejectWithValue(error.message || error.toString())
    return {
      ...data,
      author,
      like_count: 0,
      comment_count: 0,
      repost_count: 0,
      impression_count: 0,
      is_liked_by_me: false,
      is_reposted_by_me: false,
    }
  }
)

export const deletePost = createAsyncThunk(
  'posts/delete',
  async ({ postId, userId }, { rejectWithValue }) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .match({ id: postId, user_id: userId })
    if (error) return rejectWithValue(error.message)
    return postId
  }
)

/**
 * toggleRepost — optimistic repost toggle
 * Inserts or deletes from reposts table.
 * DB trigger handles repost_count increment/decrement automatically.
 */
export const toggleRepost = createAsyncThunk(
  'posts/toggleRepost',
  async ({ postId, userId, currentlyReposted }, { rejectWithValue }) => {
    try {
      if (currentlyReposted) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .match({ post_id: postId, user_id: userId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reposts')
          .insert({ post_id: postId, user_id: userId })
        if (error) throw error
      }
      return { postId, reposted: !currentlyReposted }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

/**
 * trackImpression — fires when a post enters the viewport.
 * Calls the increment_impression RPC which updates impression_count on the post.
 * Debounced in PostCard so it only fires once per post per session.
 */
export const trackImpression = createAsyncThunk(
  'posts/trackImpression',
  async (postId) => {
    await supabase.rpc('increment_impression', { p_post_id: postId })
    return postId
  }
)

/**
 * hydrateRepostedIds — called on login to mark posts already reposted by user
 */
export const hydrateRepostedIds = createAsyncThunk(
  'posts/hydrateRepostedIds',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('reposts')
      .select('post_id')
      .eq('user_id', userId)
    if (error) return rejectWithValue(error.message)
    return data?.map(r => r.post_id) || []
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────
const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState({
    status: 'idle',
    error: null,
    hasMore: true,
    exploreHasMore: true,
    likedPostIds: [],
    repostedPostIds: [],
    impressionTracked: [],   // post IDs already tracked this session — prevents double-counting
  }),
  reducers: {
    // ── Optimistic like toggle ────────────────────────────────────────────────
    toggleLikeOptimistic(state, action) {
      const { postId, liked } = action.payload
      const post = state.entities[postId]
      if (!post) return
      post.is_liked_by_me = liked
      post.like_count = liked
        ? (post.like_count || 0) + 1
        : Math.max((post.like_count || 1) - 1, 0)
    },

    // ── Optimistic repost toggle ──────────────────────────────────────────────
    toggleRepostOptimistic(state, action) {
      const { postId, reposted } = action.payload
      const post = state.entities[postId]
      if (!post) return
      post.is_reposted_by_me = reposted
      post.repost_count = reposted
        ? (post.repost_count || 0) + 1
        : Math.max((post.repost_count || 1) - 1, 0)
    },

    // ── Comment counts ────────────────────────────────────────────────────────
    incrementCommentCount(state, action) {
      const post = state.entities[action.payload.postId]
      if (post) post.comment_count = (post.comment_count || 0) + 1
    },
    decrementCommentCount(state, action) {
      const post = state.entities[action.payload.postId]
      if (post) post.comment_count = Math.max((post.comment_count || 1) - 1, 0)
    },

    // ── Hydrate liked post IDs ────────────────────────────────────────────────
    setLikedPostIds(state, action) {
      state.likedPostIds = action.payload
      action.payload.forEach(postId => {
        const post = state.entities[postId]
        if (post) post.is_liked_by_me = true
      })
    },

    // ── Mark impression as tracked (prevents double-counting) ────────────────
    markImpressionTracked(state, action) {
      const postId = action.payload
      if (!state.impressionTracked.includes(postId)) {
        state.impressionTracked.push(postId)
        const post = state.entities[postId]
        if (post) post.impression_count = (post.impression_count || 0) + 1
      }
    },

    // ── Reset on sign out ─────────────────────────────────────────────────────
    resetPosts: () => postsAdapter.getInitialState({
      status: 'idle',
      error: null,
      hasMore: true,
      exploreHasMore: true,
      likedPostIds: [],
      repostedPostIds: [],
      impressionTracked: [],
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedPosts.pending,    (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchFeedPosts.fulfilled,  (state, action) => {
        state.status = 'succeeded'
        postsAdapter.upsertMany(state, action.payload)
        state.hasMore = action.payload.length === 12
      })
      .addCase(fetchFeedPosts.rejected,   (state, action) => { state.status = 'failed'; state.error = action.payload })
      .addCase(fetchUserPosts.fulfilled,  (state, action) => { postsAdapter.upsertMany(state, action.payload) })
      .addCase(fetchExplorePosts.fulfilled,(state, action) => {
        postsAdapter.upsertMany(state, action.payload)
        state.exploreHasMore = action.payload.length === 20
      })
      .addCase(createPost.fulfilled,  (state, action) => { postsAdapter.addOne(state, action.payload) })
      .addCase(deletePost.fulfilled,  (state, action) => { postsAdapter.removeOne(state, action.payload) })

      // Repost — revert optimistic if API fails
      .addCase(toggleRepost.rejected, (state, action) => {
        // Extract postId from the original action args to revert
        const meta = action.meta?.arg
        if (!meta) return
        const post = state.entities[meta.postId]
        if (!post) return
        // Revert
        post.is_reposted_by_me = meta.currentlyReposted
        post.repost_count = meta.currentlyReposted
          ? (post.repost_count || 0) + 1
          : Math.max((post.repost_count || 1) - 1, 0)
      })

      // Hydrate reposted IDs
      .addCase(hydrateRepostedIds.fulfilled, (state, action) => {
        state.repostedPostIds = action.payload
        action.payload.forEach(postId => {
          const post = state.entities[postId]
          if (post) post.is_reposted_by_me = true
        })
      })
  },
})

// ─── Selectors ───────────────────────────────────────────────────────────────
export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectIds: selectPostIds,
} = postsAdapter.getSelectors((state) => state.posts)

export const selectPostsStatus      = (state) => state.posts.status
export const selectPostsHasMore     = (state) => state.posts.hasMore
export const selectLikedPostIds     = (state) => state.posts.likedPostIds
export const selectRepostedPostIds  = (state) => state.posts.repostedPostIds
export const selectImpressionTracked = (state) => state.posts.impressionTracked

export const postsActions = postsSlice.actions
export default postsSlice.reducer
