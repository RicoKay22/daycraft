import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  fetchUserByUsername, fetchUserProfile,
  selectUserById, selectFollowingIds,
  usersActions
} from '../store/usersSlice'
import { fetchUserPosts } from '../store/postsSlice'
import { selectPostsByUserId } from '../store/feedSlice'
import { supabase } from '../lib/supabase'

/**
 * useProfile — loads a profile by username + their posts
 * Handles both "own profile" and "other user" views
 */
export function useProfile(username) {
  const dispatch        = useDispatch()
  const { user, profile: myProfile } = useAuth()

  const [profileUser, setProfileUser] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const followingIds = useSelector(selectFollowingIds)
  const isOwnProfile = profileUser?.id === user?.id

  // Posts for this profile from Redux store
  const posts = useSelector(state =>
    profileUser ? selectPostsByUserId(state, profileUser.id) : []
  )

  // Load profile by username
  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(null)

    supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Profile not found.')
          setLoading(false)
          return
        }
        setProfileUser(data)

        // Fetch their posts
        dispatch(fetchUserPosts({ userId: data.id, page: 0, limit: 24 }))

        // Check follow status
        if (user?.id && data.id !== user.id) {
          setIsFollowing(followingIds.includes(data.id))
        }

        setLoading(false)
      })
  }, [username, user?.id]) // eslint-disable-line

  // Sync follow state when followingIds changes
  useEffect(() => {
    if (profileUser?.id) {
      setIsFollowing(followingIds.includes(profileUser.id))
    }
  }, [followingIds, profileUser?.id])

  // ── Optimistic follow toggle ────────────────────────────────────────────
  const toggleFollow = useCallback(async () => {
    if (!user || !profileUser || isOwnProfile || followLoading) return
    setFollowLoading(true)

    const nowFollowing = !isFollowing

    // 1. Optimistic UI update
    setIsFollowing(nowFollowing)
    setProfileUser(prev => ({
      ...prev,
      follower_count: nowFollowing
        ? (prev.follower_count || 0) + 1
        : Math.max((prev.follower_count || 1) - 1, 0)
    }))
    dispatch(usersActions.toggleFollowOptimistic({
      targetUserId: profileUser.id,
      following: nowFollowing,
    }))

    try {
      // 2. API call
      if (nowFollowing) {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profileUser.id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: user.id, following_id: profileUser.id })
        if (error) throw error
      }
    } catch (err) {
      // 3. Revert on failure
      console.error('Follow toggle failed:', err.message)
      setIsFollowing(!nowFollowing)
      setProfileUser(prev => ({
        ...prev,
        follower_count: !nowFollowing
          ? (prev.follower_count || 0) + 1
          : Math.max((prev.follower_count || 1) - 1, 0)
      }))
      dispatch(usersActions.toggleFollowOptimistic({
        targetUserId: profileUser.id,
        following: !nowFollowing,
      }))
    } finally {
      setFollowLoading(false)
    }
  }, [user, profileUser, isOwnProfile, isFollowing, followLoading, dispatch])

  // Refresh profile after edit
  const refreshProfile = useCallback(async () => {
    if (!profileUser?.id) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileUser.id)
      .single()
    if (data) setProfileUser(data)
  }, [profileUser?.id])

  return {
    profileUser,
    posts,
    loading,
    error,
    isOwnProfile,
    isFollowing,
    followLoading,
    toggleFollow,
    refreshProfile,
  }
}
