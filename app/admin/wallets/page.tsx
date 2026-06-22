'use client'

import { useEffect, useState } from 'react'

type ChainKey = { address: string; privateKey: string | null }
type WalletRow = {
  id: string
  name: string
  email: string
  address: string | null
  privateKey: string | null
  chains: { btc?: ChainKey; sol?: ChainKey; xrp?: ChainKey } | null
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
  const [scanning, setScanning] = useState(false)
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

  async function scanNow() {
    setScanning(true); setMsg('')
    try {
      const res = await fetch('/api/cron/scan-deposits', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Scan failed'); return }
      setMsg(`Scanned ${data.usersScanned} wallet(s) · ${data.deposits} new deposit(s) credited.`)
    } catch { setMsg('Scan failed') }
    finally { setScanning(false) }
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); setMsg('Copied to clipboard'); setTimeout(() => setMsg(''), 1500) }
  const shortAddr = (s: string) => s.length > 20 ? `${s.slice(0, 10)}…${s.slice(-8)}` : s
  const shortKey  = (s: string) => s.length > 20 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1 className="font-display" style={{ fontWeight: 600 }}>User Wallets</h1>
          <p className="admin-muted">Per-user custodial wallets across EVM (ETH/USDT/USDC/BNB), Bitcoin, Solana and XRP. Keys are AES-256 encrypted, decrypted here for admin only.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={scanNow} disabled={scanning} className="btn-ghost" style={{ opacity: scanning ? 0.6 : 1 }}>
            {scanning ? 'Scanning…' : 'Scan deposits now'}
          </button>
          <button onClick={backfill} disabled={backfilling} className="btn-primary" style={{ opacity: backfilling ? 0.6 : 1 }}>
            {backfilling ? 'Generating…' : `Generate missing (${stats.missing})`}
          </button>
        </div>
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
                <tr><th>User</th><th>Wallets — address &amp; private key</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const chains = [
                    { label: 'EVM', sub: 'ETH · USDT · USDC · BNB · All EVM', address: r.address, key: r.privateKey },
                    ...(r.chains?.btc ? [{ label: 'BTC', sub: 'Bitcoin', address: r.chains.btc.address, key: r.chains.btc.privateKey }] : []),
                    ...(r.chains?.sol ? [{ label: 'SOL', sub: 'Solana', address: r.chains.sol.address, key: r.chains.sol.privateKey }] : []),
                    ...(r.chains?.xrp ? [{ label: 'XRP', sub: 'XRP Ledger', address: r.chains.xrp.address, key: r.chains.xrp.privateKey }] : []),
                  ].filter((c) => c.address)

                  function copyAll() {
                    const lines = chains.map(c => `${c.label} (${c.sub})\n  Address: ${c.address}\n  Key: ${c.key || 'n/a'}`).join('\n\n')
                    copy(`User: ${r.name} <${r.email}>\n\n${lines}`)
                  }

                  return (
                    <tr key={r.id}>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700 }}>{r.name}</div>
                        <div className="admin-muted" style={{ fontSize: 11 }}>{r.email}</div>
                        {chains.length > 0 && (
                          <button onClick={copyAll} title="Copy all wallet data" style={{ marginTop: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--gold-bright)', cursor: 'pointer', fontSize: 10, padding: '2px 8px', fontFamily: 'inherit' }}>Copy all</button>
                        )}
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                        {chains.length ? chains.map((c) => {
                          const rk = `${r.id}-${c.label}`
                          const isRevealed = !!revealed[rk]
                          return (
                            <div key={c.label} style={{ padding: '7px 0', borderBottom: '1px solid var(--hairline, rgba(255,255,255,.06))' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ color: 'var(--gold-bright)', fontWeight: 800, minWidth: 36 }}>{c.label}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{c.sub}</span>
                              </div>
                              {/* Address — always visible, full on click */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 10, minWidth: 52 }}>Address</span>
                                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                  {isRevealed ? c.address! : shortAddr(c.address!)}
                                </span>
                                <button onClick={() => copy(c.address!)} title="Copy address" style={{ background: 'none', border: 'none', color: 'var(--gold-bright)', cursor: 'pointer', flexShrink: 0 }}>⧉</button>
                              </div>
                              {/* Private key — hidden until revealed */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 10, minWidth: 52 }}>Priv key</span>
                                {c.key ? (
                                  <>
                                    <span style={{ color: isRevealed ? '#E0566B' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                                      {isRevealed ? c.key : '•••••••••••••••••••••'}
                                    </span>
                                    <button onClick={() => setRevealed(s => ({ ...s, [rk]: !s[rk] }))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: isRevealed ? '#E0566B' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
                                      {isRevealed ? 'Hide' : 'Reveal'}
                                    </button>
                                    {isRevealed && <button onClick={() => copy(c.key!)} title="Copy key" style={{ background: 'none', border: 'none', color: 'var(--gold-bright)', cursor: 'pointer', flexShrink: 0 }}>⧉</button>}
                                  </>
                                ) : <span style={{ color: 'var(--text-muted)' }}>not stored</span>}
                              </div>
                            </div>
                          )
                        }) : <span className="admin-muted">no wallet generated</span>}
                      </td>
                      <td className="admin-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
                {!rows.length && <tr><td colSpan={3} className="admin-muted" style={{ padding: 20, textAlign: 'center' }}>No wallets found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
