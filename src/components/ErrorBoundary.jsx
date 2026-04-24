import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px', textAlign: 'center',
          minHeight: 320,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <AlertTriangle size={24} color="var(--danger)" />
          </div>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontSize: 18,
            color: 'var(--text-primary)', margin: '0 0 8px',
          }}>
            Something went wrong
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 14,
            color: 'var(--text-muted)', margin: '0 0 24px',
            maxWidth: 280, lineHeight: 1.6,
          }}>
            This section had an error. Try refreshing the page.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px',
              background: 'var(--primary)', border: 'none',
              borderRadius: 9999, color: '#0B0B0E',
              fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
