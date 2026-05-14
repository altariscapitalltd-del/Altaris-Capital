export default function HomeLoading() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, border: '3px solid rgba(242,186,14,0.18)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Loading your dashboard…</div>
      </div>
    </div>
  )
}
