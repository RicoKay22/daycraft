import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import ProfileHeader from '../components/profile/ProfileHeader'
import PostGrid from '../components/profile/PostGrid'
import EditProfileModal from '../components/profile/EditProfileModal'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { username }           = useParams()
  const navigate               = useNavigate()
  const { profile: myProfile } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')   // 'posts' | 'liked'

  const {
    profileUser,
    posts,
    loading,
    error,
    isOwnProfile,
    isFollowing,
    followLoading,
    toggleFollow,
    refreshProfile,
  } = useProfile(username)

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
          Profile not found
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          @{username} doesn't exist on Daycraft.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', background: 'var(--primary)', border: 'none',
            borderRadius: 9999, color: '#0B0B0E',
            fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Back home
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Back button — only when viewing other profiles */}
      {!isOwnProfile && (
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: 13,
            padding: '0 0 16px', transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={15} /> Back
        </motion.button>
      )}

      {/* ProfileHeader skeleton */}
      {loading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '40%', height: 18, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '25%', height: 13, borderRadius: 4 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '70%', height: 13, borderRadius: 4 }} />
        </div>
      )}

      {/* Loaded profile */}
      {!loading && profileUser && (
        <ProfileHeader
          profileUser={profileUser}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollow={toggleFollow}
          onEdit={() => setEditOpen(true)}
        />
      )}

      {/* Tab switcher */}
      {!loading && (
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10, marginBottom: 16,
        }}>
          {['posts', 'liked'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px 0',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                color: activeTab === tab ? '#0B0B0E' : 'var(--text-secondary)',
                border: 'none', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.05em', transition: 'all 200ms',
                textTransform: 'uppercase',
              }}
            >
              {tab === 'posts' ? 'Posts' : 'Liked'}
            </button>
          ))}
        </div>
      )}

      {/* Post grid */}
      {!loading && (
        <PostGrid
          posts={activeTab === 'posts' ? posts : posts.filter(p => p.is_liked_by_me)}
          loading={loading}
          emptyMessage={
            activeTab === 'posts'
              ? isOwnProfile
                ? "You haven't posted anything yet. Start crafting!"
                : `@${username} hasn't posted yet.`
              : "No liked posts yet."
          }
        />
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={editOpen}
          profileUser={profileUser}
          onClose={() => setEditOpen(false)}
          onSaved={refreshProfile}
        />
      )}
    </div>
  )
}
