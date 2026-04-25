import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import {
  selectFollowingIds,
  usersActions
} from '../store/usersSlice'
import { fetchUserPosts } from '../store/postsSlice'
import { selectPostsByUserId } from '../store/feedSlice'
import { supabase } from '../lib/supabase'

/**
 * useProfile — loads a profile by username + their posts + posts they liked
 *
 * LIKED POSTS FIX:
 * Previously, "liked" tab filtered own posts by is_liked_by_me — so it only
 * showed posts by THIS user that the viewer happened to have liked.
 * It never fetched posts by other users that THIS profile owner liked.
 *
 * Fix: separate supabase query joins likes → posts → author for this user's
 * liked posts. Returns likedPosts separately from posts (own posts).
 */
export function useProfile(username) {
  const dispatch    = useDispatch()
  const { user }    = useAuth()

  const [profileUser,   setProfileUser]   = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [isFollowing,   setIsFollowing]   = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [likedPosts,    setLikedPosts]    = useState([])
  const [likedLoading,  setLikedLoading]  = useState(false)

  const followingIds = useSelector(selectFollowingIds)
  const isOwnProfile = profileUser?.id === user?.id

  // Own posts for this profile from Redux store
  const posts = useSelector(state =>
    profileUser ? selectPostsByUserId(state, profileUser.id) : []
  )

  // ── Load profile by username ─────────────────────────────────────────────
  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(null)
    setLikedPosts([])

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

        // Fetch their own posts into Redux
        dispatch(fetchUserPosts({ userId: data.id, page: 0, limit: 24 }))

        // Fetch posts this user has liked — from ALL users, not just own
        fetchLikedPosts(data.id)

        // Check follow status
        if (user?.id && data.id !== user.id) {
          setIsFollowing(followingIds.includes(data.id))
        }

        setLoading(false)
      })
  }, [username, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch liked posts — all posts liked by this profile owner ────────────
  async function fetchLikedPosts(profileId) {
    setLikedLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('likes')
        .select(`
          post_id,
          created_at,
          post:posts!likes_post_id_fkey(
            *,
            author:profiles!posts_user_id_fkey(
              id, username, full_name, avatar_url
            )
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(48)

      if (err) throw err

      // Flatten: extract the post object, mark as liked
      const shaped = (data || [])
        .filter(l => l.post)
        .map(l => ({ ...l.post, is_liked_by_me: true }))

      setLikedPosts(shaped)
    } catch (err) {
      console.error('fetchLikedPosts error:', err.message)
    } finally {
      setLikedLoading(false)
    }
  }

  // ── Sync follow state when followingIds changes ──────────────────────────
  useEffect(() => {
    if (profileUser?.id) {
      setIsFollowing(followingIds.includes(profileUser.id))
    }
  }, [followingIds, profileUser?.id])

  // ── Optimistic follow toggle ─────────────────────────────────────────────
  const toggleFollow = useCallback(async () => {
    if (!user || !profileUser || isOwnProfile || followLoading) return
    setFollowLoading(true)

    const nowFollowing = !isFollowing

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

  // ── Refresh profile after edit ───────────────────────────────────────────
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
    likedPosts,
    likedLoading,
    loading,
    error,
    isOwnProfile,
    isFollowing,
    followLoading,
    toggleFollow,
    refreshProfile,
  }
}
