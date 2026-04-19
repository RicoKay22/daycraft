import { createEntityAdapter, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabase'

const notifAdapter = createEntityAdapter({
  sortComparer: (a, b) => new Date(b.created_at) - new Date(a.created_at),
})

export const fetchNotifications = createAsyncThunk('notifications/fetch',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return rejectWithValue(error.message)
    return data || []
  }
)

export const markAllRead = createAsyncThunk('notifications/markAllRead',
  async (userId, { rejectWithValue }) => {
    const { error } = await supabase.from('notifications')
      .update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false)
    if (error) return rejectWithValue(error.message)
    return true
  }
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: notifAdapter.getInitialState({ unreadCount: 0, status: 'idle' }),
  reducers: {
    addNotification(state, action) {
      notifAdapter.addOne(state, action.payload)
      if (!action.payload.is_read) state.unreadCount += 1
    },
    resetNotifications: () => notifAdapter.getInitialState({ unreadCount: 0, status: 'idle' }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        notifAdapter.setAll(state, action.payload)
        state.unreadCount = action.payload.filter(n => !n.is_read).length
        state.status = 'succeeded'
      })
      .addCase(markAllRead.fulfilled, (state) => {
        Object.values(state.entities).forEach(n => { n.is_read = true })
        state.unreadCount = 0
      })
  },
})

export const { selectAll: selectAllNotifications } =
  notifAdapter.getSelectors((state) => state.notifications)

export const selectUnreadCount = (state) => state.notifications.unreadCount
export const notificationsActions = notificationsSlice.actions
export default notificationsSlice.reducer