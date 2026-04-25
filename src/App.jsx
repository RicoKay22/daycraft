import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import AppLayout from './components/layout/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
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

function ProtectedPage({ children }) {
  return (
    <AuthGuard>
      <AppLayout>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </AppLayout>
    </AuthGuard>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          {/* future prop opts into React Router v7 behaviour early — silences deprecation warnings */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public */}
              <Route path="/auth"            element={<AuthPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />

              {/* Protected */}
              <Route path="/" element={
                <ProtectedPage><FeedPage /></ProtectedPage>
              } />
              <Route path="/explore" element={
                <ProtectedPage><ExplorePage /></ProtectedPage>
              } />
              <Route path="/notifications" element={
                <ProtectedPage><NotificationsPage /></ProtectedPage>
              } />
              <Route path="/dashboard" element={
                <ProtectedPage><DashboardPage /></ProtectedPage>
              } />
              <Route path="/profile/:username" element={
                <ProtectedPage><ProfilePage /></ProtectedPage>
              } />
              <Route path="/post/:postId" element={
                <ProtectedPage><PostDetailPage /></ProtectedPage>
              } />

              {/* Fallback */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*"    element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  )
}
