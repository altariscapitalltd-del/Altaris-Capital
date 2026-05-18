'use client'

import { useEffect, useState, useCallback } from 'react'

type ChainBalance = {
  chainId: number; chainName: string; eth: string; wei: string
  status: 'source' | 'ok' | 'low'; isSource: boolean; error?: boolean
}

type Authorization = {
  id: string; wallet: string; chainId: number; tokenAddress: string
  authType: string; amount: string; status: string; createdAt: string
  executedTxHash?: string; executedAt?: string
  campaign?: { titleTemplate: string; claimToken: string }
}

const C = {
  bg:        '#0B0E11',
  card:      '#151A21',
  elevated:  '#1E2329',
  border:    '#2B3139',
  brand:     '#F0B90B',
  success:   '#0ECB81',
  danger:    '#F6465D',
  muted:     '#848E9C',
  white:     '#EAECEF',
}

const s = {
  card: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: 20, marginBottom: 16,
  } as React.CSSProperties,
  label: { fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.06em' } as React.CSSProperties,
  value: { fontSize: 18, fontWeight: 700, color: C.white } as React.CSSProperties,
  btn: (color = C.brand, bg = 'transparent') => ({
    background: bg, border: `1px solid ${color}40`,
    color: color, borderRadius: 8,
    padding: '8px 14px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties),
}

function statusColor(status: string) {
  if (status === 'source') return C.brand
  if (status === 'ok')     return C.success
  return C.danger
}

function statusLabel(status: string) {
  if (status === 'source') return 'SOURCE'
  if (status === 'ok')     return '✅ OK'
  return '⚠️ LOW'
}

export default function AdminAirdropPage() {
  const [gasData,       setGasData]       = useState<any>(null)
  const [queue,         setQueue]         = useState<Authorization[]>([])
  const [queueTotal,    setQueueTotal]    = useState(0)
  const [tab,           setTab]           = useState<'pending' | 'executed' | 'failed'>('pending')
  const [loading,       setLoading]       = useState(true)
  const [executing,     setExecuting]     = useState<string | null>(null)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [copied,        setCopied]        = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadGas = useCallback(async () => {
    const res = await fetch('/api/admin/airdrop/gas')
    if (res.ok) setGasData(await res.json())
  }, [])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/airdrop/queue?status=${tab}`)
    if (res.ok) {
      const data = await res.json()
      setQueue(data.authorizations)
      setQueueTotal(data.total)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { loadGas(); loadQueue() }, [loadGas, loadQueue])

  const execute = async (auth: Authorization) => {
    setExecuting(auth.id)
    try {
      const customAmount = customAmounts[auth.id]
      const res = await fetch('/api/admin/airdrop/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationId: auth.id, customAmount: customAmount || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Execution failed')
      showToast(`Executed! TX: ${data.txHash?.slice(0, 20)}...`)
      loadQueue()
    } catch (err: any) {
      showToast(err?.message ?? 'Execution failed', false)
    } finally {
      setExecuting(null)
    }
  }

  const copyAddress = () => {
    if (!gasData?.relayerAddress) return
    navigator.clipboard.writeText(gasData.relayerAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAmount = (raw: string, decimals = 6) => {
    try { return (Number(raw) / 10 ** decimals).toFixed(2) } catch { return raw }
  }

  const truncate = (s: string, l = 6, r = 4) =>
    s ? `${s.slice(0, l)}...${s.slice(-r)}` : '—'

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: toast.ok ? '#0ECB8120' : '#F6465D20',
          border: `1px solid ${toast.ok ? C.success : C.danger}`,
          borderRadius: 10, padding: '12px 18px',
          color: toast.ok ? C.success : C.danger,
          fontSize: 13, fontWeight: 600, maxWidth: 320,
        }}>{toast.msg}</div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 4 }}>Airdrop Control</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        Manage gas tank, review authorizations, execute transferFrom
      </p>

      {/* ── Gas Tank ──────────────────────────────────────────── */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...s.label }}>⛽ RELAYER GAS TANK</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyAddress} style={s.btn(C.brand)}>
              {copied ? '✓ Copied' : 'Copy Address'}
            </button>
            <button onClick={loadGas} style={s.btn(C.muted)}>Refresh</button>
          </div>
        </div>

        {gasData?.relayerAddress && (
          <div style={{
            background: C.elevated, borderRadius: 8, padding: '8px 12px',
            fontFamily: 'monospace', fontSize: 12, color: C.muted, marginBottom: 16,
          }}>
            {gasData.relayerAddress}
          </div>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          {(gasData?.balances ?? []).map((b: ChainBalance) => (
            <div key={b.chainId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.elevated, borderRadius: 8, padding: '10px 14px',
              border: b.status === 'low' ? `1px solid ${C.danger}40` : `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusColor(b.status),
                }} />
                <span style={{ fontSize: 13, color: C.white, fontWeight: 600 }}>{b.chainName}</span>
                {b.isSource && (
                  <span style={{ fontSize: 10, color: C.brand, background: '#F0B90B15', borderRadius: 4, padding: '2px 6px' }}>
                    SOURCE
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, color: C.white, fontWeight: 700 }}>{b.eth} ETH</span>
                <span style={{ fontSize: 11, color: statusColor(b.status), fontWeight: 600 }}>
                  {statusLabel(b.status)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
          To top up: copy the relayer address above and send ETH to it on Base (source chain).
          Auto-bridge will refill other chains when they drop below threshold.
        </p>
      </div>

      {/* ── Authorization Queue ───────────────────────────────── */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...s.label }}>📋 AUTHORIZATION QUEUE — {queueTotal}</div>
          <button onClick={loadQueue} style={s.btn(C.muted)}>Refresh</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.elevated, borderRadius: 8, padding: 4 }}>
          {(['pending', 'executed', 'failed'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: 6, border: 'none',
              background: tab === t ? C.card : 'transparent',
              color: tab === t ? C.white : C.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: 13 }}>
            Loading...
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: 13 }}>
            No {tab} authorizations
          </div>
        )}

        {!loading && queue.map((auth) => (
          <div key={auth.id} style={{
            background: C.elevated, borderRadius: 10, padding: '14px',
            marginBottom: 10, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>
                  {auth.campaign?.titleTemplate ?? 'Uncampaigned Claim'}
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                  {truncate(auth.wallet, 8, 6)} · Chain {auth.chainId}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color:      auth.status === 'executed' ? C.success : auth.status === 'failed' ? C.danger : C.brand,
                background: auth.status === 'executed' ? '#0ECB8115' : auth.status === 'failed' ? '#F6465D15' : '#F0B90B15',
                borderRadius: 4, padding: '3px 8px',
              }}>{auth.status.toUpperCase()}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 11, color: C.muted, marginBottom: 12 }}>
              <span>Token</span>
              <span style={{ fontFamily: 'monospace', color: C.white }}>{truncate(auth.tokenAddress)}</span>
              <span>Type</span>
              <span style={{ color: C.white, textTransform: 'capitalize' }}>{auth.authType}</span>
              <span>Amount (raw)</span>
              <span style={{ color: C.white }}>{auth.amount}</span>
              <span>Submitted</span>
              <span style={{ color: C.white }}>{new Date(auth.createdAt).toLocaleString()}</span>
              {auth.executedTxHash && (
                <>
                  <span>TX Hash</span>
                  <span style={{ fontFamily: 'monospace', color: C.success, fontSize: 10 }}>
                    {truncate(auth.executedTxHash, 10, 6)}
                  </span>
                </>
              )}
            </div>

            {auth.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Custom amount (optional)"
                  value={customAmounts[auth.id] ?? ''}
                  onChange={(e) => setCustomAmounts((p) => ({ ...p, [auth.id]: e.target.value }))}
                  style={{
                    flex: 1, background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 12px',
                    color: C.white, fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => execute(auth)}
                  disabled={executing === auth.id}
                  style={{
                    ...s.btn(C.success, '#0ECB8115'),
                    opacity: executing === auth.id ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {executing === auth.id ? 'Executing...' : 'Transfer All'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Recent Gas Refills ────────────────────────────────── */}
      {gasData?.recentRefills?.length > 0 && (
        <div style={s.card}>
          <div style={{ ...s.label, marginBottom: 12 }}>🔄 RECENT AUTO-REFILLS</div>
          {gasData.recentRefills.slice(0, 10).map((r: any) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: `1px solid ${C.border}`,
              fontSize: 12,
            }}>
              <span style={{ color: C.muted }}>Chain {r.fromChainId} → {r.toChainId}</span>
              <span style={{ color: C.white, fontFamily: 'monospace' }}>
                {r.txHash ? truncate(r.txHash) : '—'}
              </span>
              <span style={{
                color: r.status === 'pending' ? C.brand : r.status === 'confirmed' ? C.success : C.danger,
                fontSize: 10, fontWeight: 700,
              }}>{r.status.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
