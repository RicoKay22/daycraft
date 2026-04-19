import { configureStore } from '@reduxjs/toolkit'
import postsReducer        from './postsSlice'
import usersReducer        from './usersSlice'
import feedReducer         from './feedSlice'
import notificationsReducer from './notificationsSlice'

export const store = configureStore({
  reducer: {
    posts:         postsReducer,
    users:         usersReducer,
    feed:          feedReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['posts/fetchFeed/fulfilled', 'posts/fetchExplore/fulfilled'],
      },
    }),
})

export default store