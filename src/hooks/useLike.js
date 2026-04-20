import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { postsActions } from '../store/postsSlice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * useLike — REQUIRED by assignment (Redux optimistic updates)
 * Section 7 pattern: dispatch immediately → API in background → revert on error
 */
export function useLike() {
  const dispatch = useDispatch()
  const { user }  = useAuth()

  const toggleLike = useCallback(async (postId, currentlyLiked) => {
    if (!user) return

    // 1. Optimistic update — UI changes instantly
    dispatch(postsActions.toggleLikeOptimistic({
      postId,
      liked: !currentlyLiked,
    }))

    try {
      // 2. API call in background — don't await before showing feedback
      if (currentlyLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: user.id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id })
        if (error) throw error
      }
    } catch (err) {
      // 3. Revert on failure — undo the optimistic update
      dispatch(postsActions.toggleLikeOptimistic({
        postId,
        liked: currentlyLiked,   // revert to original state
      }))
      console.error('Like toggle failed, reverted:', err.message)
    }
  }, [dispatch, user])

  return { toggleLike }
}
