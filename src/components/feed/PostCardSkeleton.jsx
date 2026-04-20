export default function PostCardSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 16px 12px',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '25%', height: 10, borderRadius: 4 }} />
        </div>
      </div>
      {/* Content lines */}
      <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: '88%', height: 13, borderRadius: 4, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: '65%', height: 13, borderRadius: 4, marginBottom: 14 }} />
      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ width: 50, height: 24, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 50, height: 24, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 36, height: 24, borderRadius: 6 }} />
      </div>
    </div>
  )
}
