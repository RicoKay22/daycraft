import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  fetchNotifications, markAllRead,
  selectAllNotifications, selectUnreadCount,
  notificationsActions
} from '../store/notificationsSlice'
import NotificationItem from '../components/notifications/NotificationItem'
import { supabase } from '../lib/supabase'

export default function NotificationsPage() {
  const dispatch       = useDispatch()
  const { user }       = useAuth()
  const notifications  = useSelector(selectAllNotifications)
  const unreadCount    = useSelector(selectUnreadCount)
  const status         = useSelector(state => state.notifications.status)

  // Fetch on mount
  useEffect(() => {
    if (!user?.id) return
    dispatch(fetchNotifications(user.id))
  }, [user?.id, dispatch])

  // Supabase Realtime subscription — live notifications
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch full notification with actor profile
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

  async function handleMarkAllRead() {
    if (!user?.id) return
    dispatch(markAllRead(user.id))
  }

  function handleRead(notifId) {
    // Mark single notification as read (optimistic)
    supabase.from('notifications').update({ is_read: true }).eq('id', notifId).then(() => {})
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Notifications
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 9999,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </motion.div>

      {/* Loading */}
      {status === 'idle' || (status !== 'succeeded' && notifications.length === 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '64px 24px' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Bell size={28} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            No notifications yet
          </h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            When someone likes your post, comments, or follows you, it'll show up here.
          </p>
        </motion.div>
      ) : (
        /* Notification list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <NotificationItem
                notification={notif}
                onRead={handleRead}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
