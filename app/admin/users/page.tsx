'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin/users?limit=all')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || d.users?.length || 0); setLoading(false) })
  }, [])

  const filtered = useMemo(
    () => users.filter((u) => !q || (u.name || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase())),
    [users, q]
  )

  const fmtBal = (u: any) => {
    if (!u.balances?.length) return '—'
    const parts = u.balances.map((b: any) => `${b.currency} ${Number(b.amount).toLocaleString('en-US', { maximumFractionDigits: 6 })}`).join(' · ')
    return parts
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Users</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>{total.toLocaleString()} total users · showing {users.length.toLocaleString()}</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', padding: '9px 12px', borderRadius: 10, fontSize: 13, minWidth: 260 }}
        />
      </div>

      <section style={{ background: '#0B0E11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['User', 'Email', 'KYC', 'Balances (all)', 'Status', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 14px', color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#475569' }}>No users found</td></tr>
              ) : filtered.map((u: any) => (
                <tr key={u.id} onClick={() => (window.location.href = `/admin/users/${u.id}`)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>{u.name || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      color: u.kycStatus === 'APPROVED' ? '#0ECB81' : u.kycStatus === 'PENDING_REVIEW' ? '#C9A227' : u.kycStatus === 'REJECTED' ? '#F6465D' : '#64748b',
                      background: `${u.kycStatus === 'APPROVED' ? '#0ECB81' : u.kycStatus === 'PENDING_REVIEW' ? '#C9A227' : u.kycStatus === 'REJECTED' ? '#F6465D' : '#64748b'}15`,
                      border: `1px solid ${u.kycStatus === 'APPROVED' ? '#0ECB81' : u.kycStatus === 'PENDING_REVIEW' ? '#C9A227' : u.kycStatus === 'REJECTED' ? '#F6465D' : '#64748b'}25`
                    }}>{u.kycStatus === 'APPROVED' ? 'Verified' : u.kycStatus === 'PENDING_REVIEW' ? 'Pending' : u.kycStatus === 'REJECTED' ? 'Rejected' : 'Unverified'}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#e2e8f0' }}>{fmtBal(u)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: u.isActive ? '#0ECB81' : '#F6465D' }}>{u.isActive ? 'Active' : 'Suspended'}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
