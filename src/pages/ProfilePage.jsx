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

const TABS = [
  { key: 'posts',    label: 'Posts' },
  { key: 'reposts',  label: 'Reposts' },
  { key: 'liked',    label: 'Liked' },
]

export default function ProfilePage() {
  const { username }            = useParams()
  const navigate                = useNavigate()
  const { profile: myProfile }  = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')

  const {
    profileUser,
    posts,
    likedPosts,   likedLoading,
    repostedPosts, repostLoading,
    loading, error,
    isOwnProfile, isFollowing, followLoading,
    toggleFollow, refreshProfile,
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
            fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Back home
        </button>
      </div>
    )
  }

  // Which posts to show depends on active tab
  const tabPosts = activeTab === 'posts'
    ? posts
    : activeTab === 'reposts'
      ? repostedPosts
      : likedPosts

  const tabLoading = activeTab === 'reposts'
    ? repostLoading
    : activeTab === 'liked'
      ? likedLoading
      : loading

  const tabEmpty = activeTab === 'posts'
    ? isOwnProfile
      ? "You haven't posted anything yet. Start crafting!"
      : `@${username} hasn't posted yet.`
    : activeTab === 'reposts'
      ? isOwnProfile
        ? "You haven't reposted anything yet."
        : `@${username} hasn't reposted anything yet.`
      : 'No liked posts yet.'

  return (
    <div style={{ position: 'relative' }}>

      {/* Creator Gold ambient layer */}
      <EtherealBackground
        color="rgba(245, 158, 11, 0.22)"
        animationScale={45}
        animationSpeed={55}
        opacity={0.85}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Back button */}
        {!isOwnProfile && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              padding: '0 0 16px', transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={15} /> Back
          </motion.button>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 0 }} />
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
          Tab switcher — Posts / Reposts / Liked
          Underline amber indicator, matching profile Creator Gold palette
        */}
        {!loading && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(245,158,11,0.15)',   
            marginBottom: 20,
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  background: 'none', border: 'none',
                  borderBottom: activeTab === tab.key
                    ? '2px solid #F59E0B'
                    : '2px solid transparent',
                  marginBottom: -1,
                  color: activeTab === tab.key ? '#F59E0B' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'color 150ms, border-color 150ms',
                }}
                onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Reposted-by header — shows above grid when on Reposts tab */}
        {!loading && activeTab === 'reposts' && repostedPosts.length > 0 && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-primary)', letterSpacing: '0.05em',
            marginBottom: 12,
          }}>
            POSTS @{username} HAS REPOSTED
          </p>
        )}

        {/* Post grid */}
        {!loading && (
          <PostGrid
            posts={tabPosts}
            loading={tabLoading}
            emptyMessage={tabEmpty}
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
