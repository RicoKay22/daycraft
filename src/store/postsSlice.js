import { createEntityAdapter, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabase'

const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => new Date(b.created_at) - new Date(a.created_at),
})

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

export const fetchExplorePosts = createAsyncThunk(
  'posts/fetchExplore',
  async ({ page = 0, limit = 20 }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)`)
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
    const { data, error } = await supabase
      .from('posts').insert({ user_id: userId, content, image_url: imageUrl })
      .select().single()
    if (error) return rejectWithValue(error.message)
    return { ...data, author, like_count: 0, comment_count: 0, is_liked_by_me: false }
  }
)

export const deletePost = createAsyncThunk(
  'posts/delete',
  async ({ postId, userId }, { rejectWithValue }) => {
    const { error } = await supabase.from('posts').delete().match({ id: postId, user_id: userId })
    if (error) return rejectWithValue(error.message)
    return postId
  }
)

const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState({
    status: 'idle',
    error: null,
    hasMore: true,
    exploreHasMore: true,
    likedPostIds: [],
  }),
  reducers: {
    toggleLikeOptimistic(state, action) {
      const { postId, liked } = action.payload
      const post = state.entities[postId]
      if (!post) return
      post.is_liked_by_me = liked
      post.like_count = liked
        ? (post.like_count || 0) + 1
        : Math.max((post.like_count || 1) - 1, 0)
    },
    incrementCommentCount(state, action) {
      const post = state.entities[action.payload.postId]
      if (post) post.comment_count = (post.comment_count || 0) + 1
    },
    decrementCommentCount(state, action) {
      const post = state.entities[action.payload.postId]
      if (post) post.comment_count = Math.max((post.comment_count || 1) - 1, 0)
    },
    setLikedPostIds(state, action) {
      state.likedPostIds = action.payload
      action.payload.forEach(postId => {
        const post = state.entities[postId]
        if (post) post.is_liked_by_me = true
      })
    },
    resetPosts: () => postsAdapter.getInitialState({
      status: 'idle', error: null, hasMore: true, exploreHasMore: true, likedPostIds: [],
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
  },
})

export const { selectAll: selectAllPosts, selectById: selectPostById, selectIds: selectPostIds } =
  postsAdapter.getSelectors((state) => state.posts)

export const selectPostsStatus  = (state) => state.posts.status
export const selectPostsHasMore = (state) => state.posts.hasMore
export const selectLikedPostIds = (state) => state.posts.likedPostIds
export const postsActions = postsSlice.actions
export default postsSlice.reducer