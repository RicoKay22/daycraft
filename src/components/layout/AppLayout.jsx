import { useState } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

/**
 * AppLayout — wraps every protected page
 * TopBar:    fixed top, 56px tall
 * Sidebar:   fixed left, 220px, desktop only (≥768px)
 * BottomNav: fixed bottom, 60px, mobile only (<768px)
 * Content:   padded to avoid overlap with all fixed elements
 */
export default function AppLayout({ children }) {
  // CreatePostModal will be lifted here once Phase 4 is built
  const [createPostOpen, setCreatePostOpen] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      <TopBar onCreatePost={() => setCreatePostOpen(true)} />

      {/* Sidebar — desktop only via CSS */}
      <div className="dc-sidebar-wrap">
        <Sidebar onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      {/* Main content area */}
      <main
        style={{
          paddingTop: 56,           // below TopBar
          minHeight: '100dvh',
        }}
        className="dc-main"
      >
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }} className="dc-content">
          {children}
        </div>
      </main>

      {/* BottomNav — mobile only via CSS */}
      <div className="dc-bottomnav-wrap">
        <BottomNav onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      {/* Responsive layout rules */}
      <style>{`
        /* Desktop: show sidebar, shift content right */
        @media (min-width: 768px) {
          .dc-sidebar-wrap    { display: block !important; }
          .dc-main            { padding-left: 220px !important; }
          .dc-bottomnav-wrap  { display: none !important; }
          .dc-content         { padding-bottom: 24px !important; }
        }

        /* Mobile: hide sidebar, show bottom nav */
        @media (max-width: 767px) {
          .dc-sidebar-wrap    { display: none !important; }
          .dc-main            { padding-left: 0 !important; }
          .dc-bottomnav-wrap  { display: block !important; }
        }
      `}</style>
    </div>
  )
}
