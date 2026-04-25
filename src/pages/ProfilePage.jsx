import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import ProfileHeader from '../components/profile/ProfileHeader'
import PostGrid from '../components/profile/PostGrid'
import EditProfileModal from '../components/profile/EditProfileModal'
import EtherealBackground from '../components/ui/EtherealBackground'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { username }            = useParams()
  const navigate                = useNavigate()
  const { profile: myProfile }  = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')  // 'posts' | 'liked'

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
            padding: '10px 20px', background: '#F59E0B', border: 'none',
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
    <div style={{ position: 'relative' }}>

      {/*
        Creator Gold ambient layer — stacks on top of AppLayout's base.
        Amber glow behind the profile content, matching the cover gradient
        and avatar ring color for a cohesive Creator Gold identity.
      */}
      <EtherealBackground
        color="rgba(245, 158, 11, 0.22)"
        animationScale={45}
        animationSpeed={55}
        opacity={0.85}
      />

      {/* All content above the amber background */}
      <div style={{ position: 'relative', zIndex: 1 }}>

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
            onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={15} /> Back
          </motion.button>
        )}

        {/* ProfileHeader skeleton */}
        {loading && (
          <div style={{ marginBottom: 20 }}>
            {/* Cover skeleton */}
            <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 0 }} />
            {/* Avatar skeleton */}
            <div style={{ marginTop: -44, padding: '0 4px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div className="skeleton" style={{ width: 88, height: 88, borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 9999 }} />
            </div>
            <div className="skeleton" style={{ width: '35%', height: 22, borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '20%', height: 14, borderRadius: 4, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 4 }} />
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
            onCoverUpdated={refreshProfile}
          />
        )}

        {/*
          Tab switcher — underline style matching the other agent screenshot.
          Amber underline indicator on active tab, not pill buttons.
        */}
        {!loading && (
          <div style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid rgba(245,158,11,0.15)',
            marginBottom: 20,
          }}>
            {[
              { key: 'posts', label: 'Posts' },
              { key: 'liked', label: 'Liked' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key
                    ? '2px solid #F59E0B'
                    : '2px solid transparent',
                  marginBottom: -1,           // sits on top of the container border
                  color: activeTab === tab.key
                    ? '#F59E0B'
                    : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'color 150ms, border-color 150ms',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {tab.label}
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
                : 'No liked posts yet.'
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
    </div>
  )
}
