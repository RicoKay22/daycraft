import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useAuth } from '../../context/AuthContext'
import { notificationsActions } from '../../store/notificationsSlice'
import { supabase } from '../../lib/supabase'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import CreatePostModal from '../feed/CreatePostModal'
import EtherealBackground from '../ui/EtherealBackground'

const DRAFT_KEY = 'dc_post_draft'

export default function AppLayout({ children }) {
  const dispatch = useDispatch()
  const { user } = useAuth()

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      {/*
        Base ambient background — applies to ALL pages.
        Very subtle neutral-warm tone (opacity kept low so it doesn't
        clash with page-specific colors: Feed adds its own green on top,
        Profile adds its own amber on top).
      */}
      <EtherealBackground
        color="rgba(163, 230, 53, 0.05)"
        animationScale={50}
        animationSpeed={55}
        opacity={0.9}
      />

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
