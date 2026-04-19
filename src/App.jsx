import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'

// Pages
import AuthPage           from './pages/AuthPage'
import FeedPage           from './pages/FeedPage'
import ExplorePage        from './pages/ExplorePage'
import ProfilePage        from './pages/ProfilePage'
import PostDetailPage     from './pages/PostDetailPage'
import NotificationsPage  from './pages/NotificationsPage'
import DashboardPage      from './pages/DashboardPage'
import NotFoundPage       from './pages/NotFoundPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth"            element={<AuthPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />

              {/* Protected routes */}
              <Route path="/" element={
                <AuthGuard><FeedPage /></AuthGuard>
              } />
              <Route path="/explore" element={
                <AuthGuard><ExplorePage /></AuthGuard>
              } />
              <Route path="/notifications" element={
                <AuthGuard><NotificationsPage /></AuthGuard>
              } />
              <Route path="/dashboard" element={
                <AuthGuard><DashboardPage /></AuthGuard>
              } />
              <Route path="/profile/:username" element={
                <AuthGuard><ProfilePage /></AuthGuard>
              } />
              <Route path="/post/:postId" element={
                <AuthGuard><PostDetailPage /></AuthGuard>
              } />

              {/* Fallback */}
              <Route path="/404"  element={<NotFoundPage />} />
              <Route path="*"     element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  )
}
