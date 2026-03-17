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
        <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid rgba(242,186,14,.2)', borderTopColor: '#f2ba0e', borderRadius: '999px' }} />
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
      <div className="admin-heading">
        <div>
          <h1>Admin Overview</h1>
          <div className="admin-muted">Live metrics updated at {now}</div>
        </div>
        <Link href="/admin/users" className="admin-nav-link" style={{ width: 'fit-content' }}>
          Manage users
        </Link>
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
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15 }}>Recent Sign-ups</h2>
          <Link href="/admin/users" style={{ color: '#f2ba0e', textDecoration: 'none', fontSize: 12 }}>
            View all
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['User', 'Email', 'KYC', 'Balance', 'Joined'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#666', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#666' }}>No recent signups</td>
                </tr>
              ) : (
                signups.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding: '12px 14px' }}>{u.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#8a8a8a' }}>{u.email}</td>
                    <td style={{ padding: '12px 14px', color: '#f2ba0e' }}>{u.kycStatus === 'APPROVED' ? 'Verified' : 'Pending'}</td>
                    <td style={{ padding: '12px 14px' }}>${(u.balances?.find((b: any) => b.currency === 'USD')?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 14px', color: '#8a8a8a' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
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
