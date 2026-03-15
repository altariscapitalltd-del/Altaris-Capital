'use client'
import { useEffect, useState } from 'react'

type Withdrawal = { id: string; amount: number; currency: string; status: string; createdAt: string; user: { name: string; email: string } }

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([])

  useEffect(() => {
    fetch('/api/admin/withdrawals').then((r) => r.json()).then((d) => setRows(d.withdrawals || [])).catch(() => {})
  }, [])

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Withdrawals Queue</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Monitor and process pending withdrawals.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {rows.map((w) => (
          <div key={w.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{w.user.name} · {w.user.email}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(w.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>${w.amount.toLocaleString()} {w.currency}</div>
              <div style={{ fontSize: 12, color: w.status === 'PENDING' ? 'var(--warning)' : 'var(--text-muted)' }}>{w.status}</div>
            </div>
          </div>
        ))}
        {!rows.length && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No withdrawals found.</div>}
      </div>
    </div>
  )
}
