'use client'

import { useEffect, useMemo, useState } from 'react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || [])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(
    () => users.filter((u) => !q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())),
    [q, users]
  )

  const paged = filtered.slice(0, page * 25)

  return (
    <div>
      <div className="admin-heading">
        <div>
          <h1>Users</h1>
          <p className="admin-muted">{users.length.toLocaleString()} total users</p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 320, height: 40, padding: '8px 12px', fontSize: 13 }}
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <section className="admin-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['User', 'Email', 'KYC', 'Balance', 'Status', 'Joined'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 14px', color: '#666', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#888' }}>Loading users...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#666' }}>No users found</td>
                </tr>
              ) : (
                paged.map((u: any) => {
                  const bal = u.balances?.find((b: any) => b.currency === 'USD')?.amount || 0
                  return (
                    <tr key={u.id} onClick={() => (window.location.href = `/admin/users/${u.id}`)} style={{ borderBottom: '1px solid rgba(255,255,255,.05)', cursor: 'pointer' }}>
                      <td style={{ padding: '12px 14px' }}>{u.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#888' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {(() => {
                          const cfg: Record<string,{c:string;l:string}> = {
                            APPROVED:       { c:'#0ECB81', l:'Verified'   },
                            PENDING_REVIEW: { c:'#F2BA0E', l:'Pending'    },
                            REJECTED:       { c:'#F6465D', l:'Rejected'   },
                            NOT_SUBMITTED:  { c:'#64748b', l:'Unverified' },
                          }
                          const t = cfg[u.kycStatus] || cfg.NOT_SUBMITTED
                          return <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, color:t.c, background:`${t.c}15`, border:`1px solid ${t.c}25` }}>{t.l}</span>
                        })()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 14px', color: u.isFrozen ? '#f6465d' : '#0ECB81' }}>{u.isFrozen ? 'Frozen' : 'Active'}</td>
                      <td style={{ padding: '12px 14px', color: '#888' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > paged.length && (
          <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setPage((p) => p + 1)}>
              Load more users ({filtered.length - paged.length} remaining)
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
