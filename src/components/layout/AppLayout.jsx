import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { notificationsActions } from '../../store/notificationsSlice'
import { supabase } from '../../lib/supabase'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import CreatePostModal from '../feed/CreatePostModal'
import EtherealBackground from '../ui/EtherealBackground'

const DRAFT_KEY = 'dc_post_draft'

export default function AppLayout({ children }) {
  const dispatch    = useDispatch()
  const { user }   = useAuth()
  const { isDark } = useTheme()

  const [createPostOpen, setCreatePostOpen] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
      return !!(draft?.content?.trim())
    } catch { return false }
  })

  // ── Realtime notification subscription ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notif-badge:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select('*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data) dispatch(notificationsActions.addNotification(data))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, dispatch])

  /*
    Theme-aware ethereal color:
    Dark mode  → dark warm brown — creates flowing dark silk shapes (21st.dev effect)
    Light mode → soft warm cream — keeps white cards legible, adds gentle warmth
  */
  const etherealColor = isDark
    ? 'rgba(55, 50, 45, 0.75)'
    : 'rgba(210, 190, 150, 0.30)'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      {/*
        EtherealBackground is position:fixed with z-index:0.
        In CSS, a positioned element with ANY z-index stacks above
        unpositioned (static) elements — so without an explicit z-index
        on the page content, the background shapes bleed through cards.
        Fix: dc-content gets position:relative + z-index:1, which creates
        a new stacking context above the background on every page.
      */}
      <EtherealBackground
        color={etherealColor}
        animationScale={55}
        animationSpeed={60}
        opacity={1}
      />

      {/* TopBar must also be above the background */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <TopBar onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      <div className="dc-sidebar-wrap" style={{ position: 'relative', zIndex: 10 }}>
        <Sidebar onCreatePost={() => setCreatePostOpen(true)} />
      </div>

      <main style={{ paddingTop: 56, minHeight: '100dvh' }} className="dc-main">
        {/*
          position:relative + zIndex:1 here is the core fix.
          Every page rendered as {children} inherits this stacking context
          and renders above the EtherealBackground automatically.
          No changes needed in any individual page file.
        */}
        <div
          style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', position: 'relative', zIndex: 1 }}
          className="dc-content"
        >
          {children}
        </div>
      </main>

      <div className="dc-bottomnav-wrap" style={{ position: 'relative', zIndex: 10 }}>
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
