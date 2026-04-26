import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/AuthContext'
import { selectFollowingIds, usersActions } from '../store/usersSlice'
import { fetchUserPosts } from '../store/postsSlice'
import { selectPostsByUserId } from '../store/feedSlice'
import { supabase } from '../lib/supabase'

const EMPTY_POSTS = []

/**
 * useProfile — loads a profile by username + their posts + liked posts + reposted posts
 *
 * Repost semantics (matching X/Twitter):
 *   repostedPosts = posts by OTHER users that THIS profile owner has reposted
 *   These are fetched by joining reposts → posts → author for the profile's user_id
 */
export function useProfile(username) {
  const dispatch = useDispatch()
  const { user } = useAuth()

  const [profileUser,     setProfileUser]     = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [isFollowing,     setIsFollowing]     = useState(false)
  const [followLoading,   setFollowLoading]   = useState(false)
  const [likedPosts,      setLikedPosts]      = useState([])
  const [likedLoading,    setLikedLoading]    = useState(false)
  const [repostedPosts,   setRepostedPosts]   = useState([])
  const [repostLoading,   setRepostLoading]   = useState(false)

  const followingIds = useSelector(selectFollowingIds)
  const isOwnProfile = profileUser?.id === user?.id
  const profileUserId = profileUser?.id ?? null

  // Own posts — stable selector reference
  const posts = useSelector(
    useCallback(
      state => profileUserId ? selectPostsByUserId(state, profileUserId) : EMPTY_POSTS,
      [profileUserId]
    )
  )

  // ── Load profile by username ─────────────────────────────────────────────
  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(null)
    setLikedPosts([])
    setRepostedPosts([])

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
        dispatch(fetchUserPosts({ userId: data.id, page: 0, limit: 24 }))
        fetchLikedPosts(data.id)
        fetchRepostedPosts(data.id)
        if (user?.id && data.id !== user.id) {
          setIsFollowing(followingIds.includes(data.id))
        }
        setLoading(false)
      })
  }, [username, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Posts this user liked (from ALL authors) ─────────────────────────────
  async function fetchLikedPosts(profileId) {
    setLikedLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('likes')
        .select(`
          post_id, created_at,
          post:posts!likes_post_id_fkey(
            *, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(48)
      if (err) throw err
      setLikedPosts(
        (data || []).filter(l => l.post).map(l => ({ ...l.post, is_liked_by_me: true }))
      )
    } catch (err) {
      console.error('fetchLikedPosts error:', err.message)
    } finally {
      setLikedLoading(false)
    }
  }

  // ── Posts this user reposted (from OTHER authors) ────────────────────────
  // Joins reposts → posts → author. Excludes own posts (X/Twitter behaviour:
  // you can't repost your own post — and even if you could, it doesn't make
  // sense to show your own posts in your Reposts tab).
  async function fetchRepostedPosts(profileId) {
    setRepostLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('reposts')
        .select(`
          post_id, created_at,
          post:posts!reposts_post_id_fkey(
            *, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(48)
      if (err) throw err
      setRepostedPosts(
        (data || [])
          .filter(r => r.post && r.post.user_id !== profileId)  // exclude own posts
          .map(r => ({ ...r.post, is_reposted_by_me: true, reposted_at: r.created_at }))
      )
    } catch (err) {
      console.error('fetchRepostedPosts error:', err.message)
    } finally {
      setRepostLoading(false)
    }
  }

  // ── Sync follow state ────────────────────────────────────────────────────
  useEffect(() => {
    if (profileUser?.id) setIsFollowing(followingIds.includes(profileUser.id))
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
    dispatch(usersActions.toggleFollowOptimistic({ targetUserId: profileUser.id, following: nowFollowing }))

    try {
      if (nowFollowing) {
        const { error } = await supabase.from('follows')
          .insert({ follower_id: user.id, following_id: profileUser.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('follows')
          .delete().match({ follower_id: user.id, following_id: profileUser.id })
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
      dispatch(usersActions.toggleFollowOptimistic({ targetUserId: profileUser.id, following: !nowFollowing }))
    } finally {
      setFollowLoading(false)
    }
  }, [user, profileUser, isOwnProfile, isFollowing, followLoading, dispatch])

  // ── Refresh profile after edit ───────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!profileUser?.id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', profileUser.id).single()
    if (data) setProfileUser(data)
  }, [profileUser?.id])

  return {
    profileUser,
    posts,
    likedPosts,   likedLoading,
    repostedPosts, repostLoading,
    loading, error,
    isOwnProfile, isFollowing, followLoading,
    toggleFollow, refreshProfile,
  }
}
