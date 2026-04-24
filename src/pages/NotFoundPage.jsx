import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Big 404 */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 96, fontWeight: 700,
          color: 'var(--border-bright)', margin: '0 0 8px', lineHeight: 1,
          letterSpacing: '-0.05em',
        }}>
          404
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 24,
          color: 'var(--text-primary)', margin: '0 0 10px',
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: 14, color: 'var(--text-muted)',
          margin: '0 0 32px', lineHeight: 1.6, maxWidth: 280,
        }}>
          This page doesn't exist on Daycraft. It may have been moved or deleted.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 9999, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={13} /> Go back
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px',
              background: 'var(--primary)', border: 'none',
              borderRadius: 9999, color: '#0B0B0E',
              fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Home size={13} /> Home
          </button>
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-muted)', marginTop: 48, letterSpacing: '0.06em',
        }}>
          DAYCRAFT · WHERE DESIGN MEETS LOGIC
        </p>
      </motion.div>
    </div>
  )
}
