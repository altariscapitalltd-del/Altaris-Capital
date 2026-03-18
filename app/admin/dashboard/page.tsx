'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const WAVE = [28, 40, 36, 48, 44, 58, 53, 66, 61, 74, 70, 83]

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [signups, setSignups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(new Date().toLocaleTimeString())
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats)
        setSignups(d.recentSignups || [])
        setLoading(false)
      })

    const t = setInterval(() => {
      fetch('/api/admin/dashboard')
        .then((r) => r.json())
        .then((d) => {
          setStats(d.stats)
          setNow(new Date().toLocaleTimeString())
        })
    }, 30000)

    return () => clearInterval(t)
  }, [])

  const chartBars = useMemo(() => {
    const base = Math.max(1, Number(stats?.newToday || 1))
    return WAVE.map((v, i) => Math.min(92, Math.max(22, Math.round((v * (base + i + 2)) % 100))))
  }, [stats?.newToday])

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '55vh' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,.2)', borderTopColor: '#8b5cf6', borderRadius: '999px' }} />
      </div>
    )
  }

  const metrics = [
    { label: 'Total Users', value: stats?.totalUsers?.toLocaleString() || '0', sub: `+${stats?.newToday || 0} today`, bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
    { label: 'KYC Verified', value: stats?.verifiedUsers?.toLocaleString() || '0', sub: 'Trust score', bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { label: 'Pending Reviews', value: ((stats?.pendingDeposits || 0) + (stats?.pendingKyc || 0) + (stats?.pendingWithdrawals || 0)).toLocaleString(), sub: 'Needs action', bg: 'linear-gradient(135deg,#ef4444,#f97316)' },
    { label: 'AUM', value: `$${((stats?.totalAUM || 0) / 1000).toFixed(1)}K`, sub: 'Managed assets', bg: 'linear-gradient(135deg,#14b8a6,#059669)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section className="admin-panel" style={{ padding: 18 }}>
        <div className="admin-heading" style={{ marginBottom: 12 }}>
          <div>
            <h1>Welcome back, Admin</h1>
            <div className="admin-muted">Command center synced at {now}</div>
          </div>
          <Link href="/admin/users" className="admin-nav-link" style={{ width: 'fit-content' }}>
            <span>Manage users</span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {metrics.map((card) => (
            <article key={card.label} style={{ borderRadius: 14, padding: 14, background: card.bg, boxShadow: '0 10px 26px rgba(15,23,42,.28)' }}>
              <div style={{ fontSize: 11, opacity: 0.9 }}>{card.label}</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>{card.value}</div>
              <div style={{ marginTop: 3, fontSize: 12, opacity: 0.9 }}>{card.sub}</div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
        <div className="admin-panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14 }}>Wallet Analytics</h2>
            <small className="admin-muted">7-day signal</small>
          </div>
          <div style={{ height: 220, borderRadius: 12, padding: '12px 10px', background: 'rgba(15,23,42,.65)', border: '1px solid rgba(148,163,184,.18)', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {chartBars.map((h, idx) => (
              <div key={idx} style={{ flex: 1, minWidth: 10, height: `${h}%`, borderRadius: 8, background: idx % 2 ? 'linear-gradient(180deg,#38bdf8,#2563eb)' : 'linear-gradient(180deg,#a78bfa,#6d28d9)' }} />
            ))}
          </div>
        </div>

        <div className="admin-panel" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 14, marginBottom: 14 }}>Overview</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(56,189,248,.12)', border: '1px solid rgba(56,189,248,.3)' }}>
              <div className="admin-muted">Pending Deposits</div>
              <strong style={{ fontSize: 28 }}>{stats?.pendingDeposits || 0}</strong>
            </div>
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.3)' }}>
              <div className="admin-muted">Pending KYC</div>
              <strong style={{ fontSize: 28 }}>{stats?.pendingKyc || 0}</strong>
            </div>
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(248,113,113,.12)', border: '1px solid rgba(248,113,113,.3)' }}>
              <div className="admin-muted">Pending Withdrawals</div>
              <strong style={{ fontSize: 28 }}>{stats?.pendingWithdrawals || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,.2)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14 }}>Recent Sign-ups</h2>
          <Link href="/admin/users" style={{ color: '#c4b5fd', textDecoration: 'none', fontSize: 12 }}>View all</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 620 }}>
            <thead><tr>{['User', 'Email', 'KYC', 'Balance', 'Joined'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {signups.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No recent signups</td></tr>
              ) : signups.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.name || '—'}</td>
                  <td style={{ color: '#cbd5e1' }}>{u.email}</td>
                  <td style={{ color: u.kycStatus === 'APPROVED' ? '#22c55e' : '#fbbf24' }}>{u.kycStatus === 'APPROVED' ? 'Verified' : u.kycStatus === 'PENDING_REVIEW' ? 'Pending' : u.kycStatus === 'REJECTED' ? 'Rejected' : 'Not verified'}</td>
                  <td>${(u.balances?.find((b: any) => b.currency === 'USD')?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ color: '#a5b4fc' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
