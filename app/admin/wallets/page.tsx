'use client'

import { useEffect, useState } from 'react'

type WalletRow = {
  id: string
  name: string
  email: string
  address: string | null
  privateKey: string | null
  createdAt: string
  hasWallet: boolean
}

export default function AdminWalletsPage() {
  const [rows, setRows] = useState<WalletRow[]>([])
  const [stats, setStats] = useState({ total: 0, withWallet: 0, missing: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [backfilling, setBackfilling] = useState(false)
  const [msg, setMsg] = useState('')

  async function load(query = '') {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/wallets${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to load wallets'); setRows([]); return }
      setRows(data.wallets || [])
      setStats({ total: data.total || 0, withWallet: data.withWallet || 0, missing: data.missing || 0 })
    } catch { setError('Failed to load wallets') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function backfill() {
    setBackfilling(true); setMsg('')
    try {
      const res = await fetch('/api/admin/wallets', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Backfill failed'); return }
      setMsg(`Generated ${data.created} new wallet(s).`)
      load(q)
    } catch { setMsg('Backfill failed') }
    finally { setBackfilling(false) }
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); setMsg('Copied to clipboard'); setTimeout(() => setMsg(''), 1500) }
  const mask = (s: string) => (s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s)

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1 className="font-display" style={{ fontWeight: 600 }}>User Wallets</h1>
          <p className="admin-muted">Per-user custodial EVM wallets. Private keys are stored AES-256 encrypted and decrypted here for admin only.</p>
        </div>
        <button onClick={backfill} disabled={backfilling} className="btn-primary" style={{ opacity: backfilling ? 0.6 : 1 }}>
          {backfilling ? 'Generating…' : `Generate missing (${stats.missing})`}
        </button>
      </div>

      {/* Security banner */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'rgba(224,86,107,0.10)', border: '1px solid rgba(224,86,107,0.3)', marginBottom: 16, color: '#E0566B', fontSize: 12.5, lineHeight: 1.6 }}>
        <span style={{ fontWeight: 800 }}>⚠ Sensitive</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          These private keys control real on-chain funds. Anyone who can read this page can move user balances. Restrict admin access, set a strong <code>WALLET_ENCRYPTION_KEY</code>, and never screenshot or paste keys into untrusted tools.
        </span>
      </div>

      <div className="admin-grid">
        <div className="admin-stat"><strong>{stats.total}</strong><span>Total users</span></div>
        <div className="admin-stat"><strong>{stats.withWallet}</strong><span>With wallet</span></div>
        <div className="admin-stat"><strong>{stats.missing}</strong><span>Missing wallet</span></div>
      </div>

      <div className="admin-panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(q)} placeholder="Search name, email, or address…" style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={() => load(q)}>Search</button>
        </div>

        {msg && <div style={{ marginBottom: 12, color: 'var(--gold-bright)', fontSize: 13 }}>{msg}</div>}
        {error && <div style={{ marginBottom: 12, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        {loading ? (
          <div className="admin-muted" style={{ padding: 20 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>User</th><th>Address</th><th>Private key</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div className="admin-muted" style={{ fontSize: 11 }}>{r.email}</div>
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {r.address ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {mask(r.address)}
                          <button onClick={() => copy(r.address!)} title="Copy address" style={{ background: 'none', border: 'none', color: 'var(--gold-bright)', cursor: 'pointer' }}>⧉</button>
                        </span>
                      ) : <span className="admin-muted">—</span>}
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {r.privateKey ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {revealed[r.id] ? mask(r.privateKey) : '•••••••••••••'}
                          <button onClick={() => setRevealed((s) => ({ ...s, [r.id]: !s[r.id] }))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>{revealed[r.id] ? 'Hide' : 'Reveal'}</button>
                          <button onClick={() => copy(r.privateKey!)} title="Copy private key" style={{ background: 'none', border: 'none', color: 'var(--gold-bright)', cursor: 'pointer' }}>⧉</button>
                        </span>
                      ) : <span className="admin-muted">no wallet</span>}
                    </td>
                    <td className="admin-muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={4} className="admin-muted" style={{ padding: 20, textAlign: 'center' }}>No wallets found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
