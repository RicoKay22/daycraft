import { useEffect, useRef, useCallback } from 'react'

/**
 * useInfiniteScroll — REQUIRED by assignment
 * Uses IntersectionObserver to detect when the sentinel element
 * enters the viewport, then calls loadMore()
 *
 * Usage:
 *   const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore })
 *   <div ref={sentinelRef} />
 */
export function useInfiniteScroll({ hasMore, loading, onLoadMore }) {
  const sentinelRef  = useRef(null)
  const observerRef  = useRef(null)

  const handleIntersect = useCallback(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore]
  )

  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root:       null,        // viewport
      rootMargin: '200px',     // trigger 200px before element is visible
      threshold:  0,
    })

    const el = sentinelRef.current
    if (el) observerRef.current.observe(el)

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [handleIntersect])

  return sentinelRef
}
