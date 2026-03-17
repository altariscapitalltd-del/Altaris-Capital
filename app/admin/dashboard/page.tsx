'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '55vh' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,.2)', borderTopColor: '#8b5cf6', borderRadius: '999px' }} />
      </div>
    )
  }

  const statBlocks = [
    { label: 'Total Users', value: stats?.totalUsers?.toLocaleString() || '0', sub: `+${stats?.newToday || 0} today` },
    { label: 'KYC Verified', value: stats?.verifiedUsers?.toLocaleString() || '0', sub: `${((stats?.verifiedUsers / Math.max(1, stats?.totalUsers)) * 100).toFixed(0)}% verification` },
    { label: 'Pending Deposits', value: stats?.pendingDeposits?.toLocaleString() || '0', sub: 'Needs review', href: '/admin/deposits' },
    { label: 'Pending KYC', value: stats?.pendingKyc?.toLocaleString() || '0', sub: 'Needs review', href: '/admin/kyc' },
    { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals?.toLocaleString() || '0', sub: 'Needs review', href: '/admin/withdrawals' },
    { label: 'Total AUM', value: `$${((stats?.totalAUM || 0) / 1000).toFixed(1)}K`, sub: 'Assets under management' },
    { label: 'Total Deposited', value: `$${((stats?.totalDeposited || 0) / 1000).toFixed(1)}K`, sub: 'Lifetime inflow' },
    { label: 'Total Withdrawn', value: `$${((stats?.totalWithdrawn || 0) / 1000).toFixed(1)}K`, sub: 'Lifetime outflow' },
  ]

  return (
    <div>
      <div className="admin-panel" style={{ padding: 18, marginBottom: 16 }}>
        <div className="admin-heading" style={{ marginBottom: 0 }}>
          <div>
            <h1>Executive Operations Hub</h1>
            <div className="admin-muted">Live metrics updated at {now}</div>
          </div>
          <Link href="/admin/users" className="admin-nav-link" style={{ width: 'fit-content' }}>
            <span>Manage users</span>
          </Link>
        </div>
      </div>

      <section className="admin-grid">
        {statBlocks.map((s) => {
          const content = (
            <article className="admin-stat">
              <span>{s.label}</span>
              <strong>{s.value}</strong>
              <span>{s.sub}</span>
            </article>
          )
          return s.href ? (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {content}
            </Link>
          ) : (
            <div key={s.label}>{content}</div>
          )
        })}
      </section>

      <section className="admin-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,.2)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15 }}>Recent Sign-ups</h2>
          <Link href="/admin/users" style={{ color: '#c4b5fd', textDecoration: 'none', fontSize: 12 }}>
            View all
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                {['User', 'Email', 'KYC', 'Balance', 'Joined'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No recent signups</td>
                </tr>
              ) : (
                signups.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.name || '—'}</td>
                    <td style={{ color: '#cbd5e1' }}>{u.email}</td>
                    <td style={{ color: '#c4b5fd' }}>{u.kycStatus === 'APPROVED' ? 'Verified' : 'Pending'}</td>
                    <td>${(u.balances?.find((b: any) => b.currency === 'USD')?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: '#a5b4fc' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
