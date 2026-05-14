'use client'
import { useEffect, useState } from 'react'

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/dashboard').then((r) => r.json()).then((d) => setStats(d.stats || null)).catch(() => {})
  }, [])

  const cards = [
    ['Total Users', stats?.totalUsers || 0],
    ['Verified Users', stats?.verifiedUsers || 0],
    ['AUM (USD)', `$${Number(stats?.totalAUM || 0).toLocaleString()}`],
    ['Total Deposited', `$${Number(stats?.totalDeposited || 0).toLocaleString()}`],
    ['Total Withdrawn', `$${Number(stats?.totalWithdrawn || 0).toLocaleString()}`],
  ]

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Analytics</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Operational metrics refreshed from the live dashboard API.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 14 }}>
        {cards.map(([label, value]) => (
          <div key={String(label)} style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-card)', padding: 14 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
            <div style={{ marginTop: 6, fontWeight: 900, fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
