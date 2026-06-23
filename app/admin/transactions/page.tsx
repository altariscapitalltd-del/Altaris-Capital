'use client'

import { useEffect, useMemo, useState } from 'react'

export default function AdminTransactionsPage() {
  const [all, setAll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin/transactions')
      .then(r => r.json())
      .then(d => {
        setAll(d.transactions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!q) return all
    const s = q.toLowerCase()
    return all.filter((t: any) =>
      [t.id, t.type, t.currency, t.status, t.note, t.userId, t.user?.name, t.user?.email]
        .some((v: any) => String(v ?? '').toLowerCase().includes(s))
    )
  }, [all, q])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>All Transactions</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Platform-wide activity</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search type, currency, user email…"
          style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', padding: '9px 12px', borderRadius: 10, fontSize: 13, minWidth: 260 }}
        />
      </div>

      <section style={{ background: '#0B0E11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['ID', 'User', 'Type', 'Amount', 'Currency', 'Status', 'Time'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 14px', color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#475569' }}>No transactions</td></tr>
              ) : filtered.map((t: any) => {
                const credit = ['deposit','profit','roi','bonus','referral_bonus','referral','adjustment','transfer_in'].includes((t.type || '').toLowerCase())
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{t.id}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{t.user?.name || '—'}<br/><span style={{ color: '#64748b', fontSize: 11 }}>{t.user?.email}</span></td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700 }}>{t.type}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: credit ? '#0ECB81' : '#F6465D' }}>{credit ? '+' : '-'}{Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>{t.currency}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}><span style={{ padding: '3px 8px', borderRadius: 6, color: t.status === 'SUCCESS' || t.status === 'COMPLETED' ? '#0ECB81' : '#C9A227', background: `${t.status === 'SUCCESS' || t.status === 'COMPLETED' ? '#0ECB81' : '#C9A227'}15`, border: `1px solid ${t.status === 'SUCCESS' || t.status === 'COMPLETED' ? '#0ECB81' : '#C9A227'}25`, fontSize: 11, fontWeight: 700 }}>{t.status}</span></td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
