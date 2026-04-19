import { createEntityAdapter, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabase'

const usersAdapter = createEntityAdapter()

export const fetchUserProfile = createAsyncThunk('users/fetchProfile',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) return rejectWithValue(error.message)
    return data
  }
)

export const fetchUserByUsername = createAsyncThunk('users/fetchByUsername',
  async (username, { rejectWithValue }) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (error) return rejectWithValue(error.message)
    return data
  }
)

export const searchUsers = createAsyncThunk('users/search',
  async (query, { rejectWithValue }) => {
    const { data, error } = await supabase.from('profiles')
      .select('id, username, full_name, avatar_url, follower_count')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10)
    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const fetchFollowingIds = createAsyncThunk('users/fetchFollowingIds',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
    if (error) return rejectWithValue(error.message)
    return data?.map(f => f.following_id) || []
  }
)

export const updateProfile = createAsyncThunk('users/updateProfile',
  async ({ userId, updates }, { rejectWithValue }) => {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
    if (error) return rejectWithValue(error.message)
    return data
  }
)

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState({
    followingIds: [],
    currentUserId: null,
    searchResults: [],
    status: 'idle',
    error: null,
  }),
  reducers: {
    toggleFollowOptimistic(state, action) {
      const { targetUserId, following } = action.payload
      if (following) {
        if (!state.followingIds.includes(targetUserId)) state.followingIds.push(targetUserId)
      } else {
        state.followingIds = state.followingIds.filter(id => id !== targetUserId)
      }
      const user = state.entities[targetUserId]
      if (user) {
        user.is_following = following
        user.follower_count = following
          ? (user.follower_count || 0) + 1
          : Math.max((user.follower_count || 1) - 1, 0)
      }
    },
    setCurrentUserId(state, action) { state.currentUserId = action.payload },
    clearSearchResults(state)       { state.searchResults = [] },
    resetUsers: () => usersAdapter.getInitialState({
      followingIds: [], currentUserId: null, searchResults: [], status: 'idle', error: null,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.fulfilled,   (state, action) => { usersAdapter.upsertOne(state, action.payload) })
      .addCase(fetchUserByUsername.fulfilled, (state, action) => { usersAdapter.upsertOne(state, action.payload) })
      .addCase(fetchFollowingIds.fulfilled,   (state, action) => {
        state.followingIds = action.payload
        action.payload.forEach(id => {
          const user = state.entities[id]
          if (user) user.is_following = true
        })
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        usersAdapter.upsertMany(state, action.payload)
        state.searchResults = action.payload.map(u => u.id)
      })
      .addCase(updateProfile.fulfilled, (state, action) => { usersAdapter.upsertOne(state, action.payload) })
  },
})

export const { selectAll: selectAllUsers, selectById: selectUserById } =
  usersAdapter.getSelectors((state) => state.users)

export const selectFollowingIds  = (state) => state.users.followingIds
export const selectCurrentUserId = (state) => state.users.currentUserId
export const selectSearchResults = (state) =>
  state.users.searchResults.map(id => state.users.entities[id]).filter(Boolean)

export const usersActions = usersSlice.actions
export default usersSlice.reducer