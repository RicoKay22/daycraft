import { useState } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import CreatePostModal from '../feed/CreatePostModal'

export default function AppLayout({ children }) {
  const [createPostOpen, setCreatePostOpen] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      <TopBar onCreatePost={() => setCreatePostOpen(true)} />

      <div className="dc-sidebar-wrap">
        <Sidebar onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      <main style={{ paddingTop: 56, minHeight: '100dvh' }} className="dc-main">
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }} className="dc-content">
          {children}
        </div>
      </main>

      <div className="dc-bottomnav-wrap">
        <BottomNav onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
      />

      <style>{`
        @media (min-width: 768px) {
          .dc-sidebar-wrap    { display: block !important; }
          .dc-main            { padding-left: 220px !important; }
          .dc-bottomnav-wrap  { display: none !important; }
          .dc-content         { padding-bottom: 24px !important; }
        }
        @media (max-width: 767px) {
          .dc-sidebar-wrap    { display: none !important; }
          .dc-main            { padding-left: 0 !important; }
          .dc-bottomnav-wrap  { display: block !important; }
        }
      `}</style>
    </div>
  )
}
