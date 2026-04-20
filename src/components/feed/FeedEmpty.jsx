import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, Users } from 'lucide-react'

export default function FeedEmpty() {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        textAlign: 'center',
        padding: '64px 24px',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <Users size={32} color="var(--text-muted)" strokeWidth={1.5} />
      </div>

      <h3 style={{
        fontFamily: 'var(--font-heading)', fontSize: 20,
        color: 'var(--text-primary)', margin: '0 0 10px',
      }}>
        Your feed is empty
      </h3>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 14,
        color: 'var(--text-secondary)', lineHeight: 1.6,
        maxWidth: 300, margin: '0 auto 32px',
      }}>
        Follow builders and creators to see their posts here. Start exploring to find people crafting something every day.
      </p>

      <button
        onClick={() => navigate('/explore')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 24px',
          background: 'var(--primary)', border: 'none', borderRadius: 9999,
          color: '#0B0B0E',
          fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.04em', cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <Compass size={15} />
        Explore builders
      </button>
    </motion.div>
  )
}
