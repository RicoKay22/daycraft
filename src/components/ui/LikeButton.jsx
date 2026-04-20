import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'

/**
 * LikeButton — animated heart with burst particles on like
 * Uses Framer Motion scale spring + particle burst
 */
export default function LikeButton({ liked, count, onToggle, size = 'md' }) {
  const [burst, setBurst] = useState(false)

  const iconSize    = size === 'sm' ? 14 : 16
  const fontSize    = size === 'sm' ? 11 : 12

  function handleClick(e) {
    e.stopPropagation()
    if (!liked) {
      setBurst(true)
      setTimeout(() => setBurst(false), 600)
    }
    onToggle()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none',
        cursor: 'pointer', padding: '6px 8px',
        borderRadius: 8,
        color: liked ? '#EF4444' : 'var(--text-muted)',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {/* Heart icon with spring scale */}
      <motion.div
        animate={liked
          ? { scale: [1, 1.35, 0.9, 1.1, 1] }
          : { scale: 1 }
        }
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <Heart
          size={iconSize}
          fill={liked ? '#EF4444' : 'none'}
          color={liked ? '#EF4444' : 'var(--text-muted)'}
          strokeWidth={liked ? 0 : 1.8}
        />
      </motion.div>

      {/* Like count */}
      <motion.span
        key={count}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18 }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: fontSize,
          color: liked ? '#EF4444' : 'var(--text-muted)',
          minWidth: 14,
          lineHeight: 1,
        }}
      >
        {count || 0}
      </motion.span>

      {/* Burst particles */}
      <AnimatePresence>
        {burst && (
          <>
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * 360
              const rad   = (angle * Math.PI) / 180
              const x     = Math.cos(rad) * 18
              const y     = Math.sin(rad) * 18
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 0, x, y, scale: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    width: 4, height: 4,
                    borderRadius: '50%',
                    background: i % 2 === 0 ? '#EF4444' : '#F59E0B',
                    pointerEvents: 'none',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>
    </button>
  )
}
