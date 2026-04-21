import { createEntityAdapter, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabase'

// ─── Entity Adapter ─────────────────────────────────────────────────────────
// Normalises posts: { ids: [...], entities: { [id]: post } }
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
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
      `)
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
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const fetchExplorePosts = createAsyncThunk(
  'posts/fetchExplore',
  async ({ page = 0, limit = 20 }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const createPost = createAsyncThunk(
  'posts/create',
  async ({ userId, content, imageUrl = null, author }, { rejectWithValue }) => {
    // 10 second timeout — prevents infinite hang on slow connections
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
    return { ...data, author, like_count: 0, comment_count: 0, is_liked_by_me: false }
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

// ─── Slice ───────────────────────────────────────────────────────────────────
const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState({
    status: 'idle',         // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    hasMore: true,
    exploreHasMore: true,
    likedPostIds: [],       // post IDs liked by current user
  }),
  reducers: {
    // ── Optimistic like toggle (Section 7) ───────────────────────────────────
    toggleLikeOptimistic(state, action) {
      const { postId, liked } = action.payload
      const post = state.entities[postId]
      if (!post) return
      post.is_liked_by_me = liked
      post.like_count = liked
        ? (post.like_count || 0) + 1
        : Math.max((post.like_count || 1) - 1, 0)
    },

    // ── Optimistic comment count update ──────────────────────────────────────
    incrementCommentCount(state, action) {
      const { postId } = action.payload
      const post = state.entities[postId]
      if (post) post.comment_count = (post.comment_count || 0) + 1
    },

    decrementCommentCount(state, action) {
      const { postId } = action.payload
      const post = state.entities[postId]
      if (post) post.comment_count = Math.max((post.comment_count || 1) - 1, 0)
    },

    // ── Hydrate liked post IDs ────────────────────────────────────────────────
    setLikedPostIds(state, action) {
      state.likedPostIds = action.payload
      // Sync is_liked_by_me on all loaded posts
      action.payload.forEach(postId => {
        const post = state.entities[postId]
        if (post) post.is_liked_by_me = true
      })
    },

    // ── Clear store on sign out ───────────────────────────────────────────────
    resetPosts: () => postsAdapter.getInitialState({
      status: 'idle',
      error: null,
      hasMore: true,
      exploreHasMore: true,
      likedPostIds: [],
    }),
  },
  extraReducers: (builder) => {
    // fetchFeedPosts
    builder
      .addCase(fetchFeedPosts.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        postsAdapter.upsertMany(state, action.payload)
        state.hasMore = action.payload.length === 12
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

    // fetchUserPosts
    builder.addCase(fetchUserPosts.fulfilled, (state, action) => {
      postsAdapter.upsertMany(state, action.payload)
    })

    // fetchExplorePosts
    builder.addCase(fetchExplorePosts.fulfilled, (state, action) => {
      postsAdapter.upsertMany(state, action.payload)
      state.exploreHasMore = action.payload.length === 20
    })

    // createPost — add to store immediately
    builder.addCase(createPost.fulfilled, (state, action) => {
      postsAdapter.addOne(state, action.payload)
    })

    // deletePost — remove from store
    builder.addCase(deletePost.fulfilled, (state, action) => {
      postsAdapter.removeOne(state, action.payload)
    })
  },
})

// ─── Selectors ───────────────────────────────────────────────────────────────
export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectIds: selectPostIds,
} = postsAdapter.getSelectors((state) => state.posts)

export const selectPostsStatus    = (state) => state.posts.status
export const selectPostsHasMore   = (state) => state.posts.hasMore
export const selectLikedPostIds   = (state) => state.posts.likedPostIds

// ─── Actions ─────────────────────────────────────────────────────────────────
export const postsActions = postsSlice.actions
export default postsSlice.reducer
