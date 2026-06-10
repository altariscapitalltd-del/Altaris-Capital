'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const USDC_ADDRESS = '0x879C6dbF4EFBf6aECFAFeaca61c166a507a3B7bf'
const USDC_MIN_DEPOSIT = 10
const USDC_COLOR = '#2775CA'

type WalletTab = 'none' | 'deposit' | 'withdraw' | 'reward'
type ChartRange = '1D' | '7D' | '1M' | 'All'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skel({ h = 56, r = 14, w = '100%' }: { h?: number; r?: number; w?: string | number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: r, width: w, flexShrink: 0 }} />
}

// ─── Sparkline (mini, used in balance card) ───────────────────────────────────
function Sparkline({ values, color = '#0ECB81', width = 88, height = 40 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c || values.length < 2) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr; c.height = height * dpr; ctx.scale(dpr, dpr)
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
    const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * width, y: height - 4 - ((v - min) / range) * (height - 8) }))
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, color + '44'); grad.addColorStop(1, color + '00')
    ctx.clearRect(0, 0, width, height)
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
  }, [values, color, width, height])
  return <canvas ref={ref} style={{ width, height, display: 'block' }} />
}

// ─── Area chart (portfolio section) ──────────────────────────────────────────
function AreaChart({ data, color = '#0ECB81', height = 120 }: { data: number[]; color?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const w = c.offsetWidth || 340
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = height * dpr; ctx.scale(dpr, dpr)
    const vals = data.length > 1 ? data : [0, 0]
    const min = Math.min(...vals), max = Math.max(...vals)
    const pad = Math.max((max - min) * 0.15, 1)
    const lo = min - pad, hi = max + pad, range = hi - lo
    const l = 4, r = w - 4, t = 8, b = height - 4
    const xs = vals.map((_, i) => l + (i / Math.max(vals.length - 1, 1)) * (r - l))
    const ys = vals.map(v => b - ((v - lo) / range) * (b - t))
    ctx.clearRect(0, 0, w, height)
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
    ;[0.33, 0.66].forEach(f => { const y = t + (b - t) * f; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke() })
    // Fill
    const grad = ctx.createLinearGradient(0, t, 0, b)
    grad.addColorStop(0, color + '36'); grad.addColorStop(0.7, color + '10'); grad.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) { const mx = (xs[i - 1] + xs[i]) / 2; ctx.bezierCurveTo(mx, ys[i - 1], mx, ys[i], xs[i], ys[i]) }
    ctx.lineTo(xs[xs.length - 1], b); ctx.lineTo(xs[0], b); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    // Line
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) { const mx = (xs[i - 1] + xs[i]) / 2; ctx.bezierCurveTo(mx, ys[i - 1], mx, ys[i], xs[i], ys[i]) }
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    // Dot at end
    const ex = xs[xs.length - 1], ey = ys[ys.length - 1]
    ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2)
    ctx.fillStyle = color + '33'; ctx.fill()
  }, [data, color, height])
  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />
}

// ─── Transaction type config ──────────────────────────────────────────────────
const TX: Record<string, { color: string; label: string; credit: boolean; icon: string }> = {
  DEPOSIT:        { color: '#0ECB81', label: 'Deposit',        credit: true,  icon: 'M12 5v14M5 12l7 7 7-7' },
  WITHDRAWAL:     { color: '#F6465D', label: 'Withdrawal',     credit: false, icon: 'M12 19V5M5 12l7-7 7 7' },
  INVESTMENT:     { color: '#F2BA0E', label: 'Investment',     credit: false, icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
  PROFIT:         { color: '#0ECB81', label: 'Profit',         credit: true,  icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
  ROI:            { color: '#0ECB81', label: 'ROI',            credit: true,  icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
  BONUS:          { color: '#A78BFA', label: 'Bonus',          credit: true,  icon: 'M20 12V22H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z' },
  REFERRAL_BONUS: { color: '#A78BFA', label: 'Referral',       credit: true,  icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  ADJUSTMENT:     { color: '#64748B', label: 'Adjustment',     credit: true,  icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
}

function TxIcon({ type, size = 38 }: { type: string; size?: number }) {
  const cfg = TX[type] || TX.ADJUSTMENT
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {cfg.icon.split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
      </svg>
    </div>
  )
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(s: string) {
  const d = new Date(s)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WalletPage() {
  const [tab, setTab] = useState<WalletTab>('none')
  const [chartRange, setChartRange] = useState<ChartRange>('1D')
  const [amount, setAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [investedTotal, setInvestedTotal] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [depositAddress, setDepositAddress] = useState('')

  function loadProfile() {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      const nb: Record<string, number> = {}
      d.user?.balances?.forEach((b: any) => { nb[b.currency] = b.amount })
      setBalances(nb)
      const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
      setInvestedTotal(active.reduce((s: number, i: any) => s + i.amount, 0))
      setRefCode(d.user?.referralCode || 'ALTARIS01')
    }).catch(() => {})
  }

  function loadTransactions() {
    fetch('/api/transactions?page=1').then(r => r.json()).then(d => setTransactions(d.transactions || [])).catch(() => setTransactions([]))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [profileRes, txRes, addrRes] = await Promise.allSettled([
          fetch('/api/user/profile'),
          fetch('/api/transactions?page=1'),
          fetch('/api/wallet/addresses'),
        ])
        if (cancelled) return
        if (profileRes.status === 'fulfilled') {
          const d = await profileRes.value.json().catch(() => ({}))
          const nb: Record<string, number> = {}
          d.user?.balances?.forEach((b: any) => { nb[b.currency] = b.amount })
          setBalances(nb)
          const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
          setInvestedTotal(active.reduce((s: number, i: any) => s + i.amount, 0))
          setRefCode(d.user?.referralCode || 'ALTARIS01')
        }
        if (txRes.status === 'fulfilled') {
          const d = await txRes.value.json().catch(() => ({}))
          setTransactions(d.transactions || [])
        }
        if (addrRes.status === 'fulfilled') {
          const d = await addrRes.value.json().catch(() => ({}))
          const mapped: Record<string, string> = {}
          d.addresses?.forEach((a: any) => { mapped[a.currency] = a.address })
          setWalletAddresses(mapped)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handler = () => { loadProfile(); loadTransactions() }
    window.addEventListener('balance:refresh', handler)
    return () => window.removeEventListener('balance:refresh', handler)
  }, [])

  useEffect(() => {
    if (tab !== 'deposit') return
    let cancelled = false
    fetch('/api/wallet/deposit-address').then(r => r.json()).then(d => { if (!cancelled && d?.address) setDepositAddress(d.address) }).catch(() => {})
    return () => { cancelled = true }
  }, [tab])

  useEffect(() => {
    if (tab !== 'deposit') { setQrDataUrl(null); return }
    QRCode.toDataURL(activeAddress, { width: 512, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, walletAddresses, depositAddress])

  const usdBalance = balances.USD || 0
  const totalPortfolio = usdBalance + investedTotal

  const totalEarnings = useMemo(() =>
    transactions.filter(t => ['PROFIT', 'ROI', 'BONUS', 'REFERRAL_BONUS'].includes(t.type) && t.status === 'SUCCESS').reduce((s: number, t: any) => s + t.amount, 0),
  [transactions])

  const chartData = useMemo(() => {
    const hours = chartRange === '1D' ? 24 : chartRange === '7D' ? 168 : chartRange === '1M' ? 720 : Infinity
    const filtered = transactions
      .slice().sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .filter((t: any) => hours === Infinity || Date.now() - +new Date(t.createdAt) <= hours * 3_600_000)
      .slice(-40)
    if (!filtered.length) return Array.from({ length: 8 }, () => Number(usdBalance.toFixed(2)))
    let running = Math.max(0, usdBalance)
    const result: number[] = []
    for (let i = filtered.length - 1; i >= 0; i--) {
      const t = filtered[i]
      const credit = ['DEPOSIT', 'PROFIT', 'ROI', 'BONUS', 'REFERRAL_BONUS'].includes(t.type)
      if (credit) running = Math.max(0, running - t.amount)
      else running += t.amount
      result.unshift(Number(running.toFixed(2)))
    }
    const out = result.slice(-24)
    while (out.length < 8) out.unshift(out[0] ?? usdBalance)
    return out
  }, [transactions, usdBalance, chartRange])

  const chartPnl = useMemo(() => {
    const start = chartData[0] ?? usdBalance, end = chartData[chartData.length - 1] ?? usdBalance
    const diff = end - start
    return { diff, pct: start ? (diff / start) * 100 : 0 }
  }, [chartData, usdBalance])

  const activeAddress = depositAddress || walletAddresses['USDC'] || USDC_ADDRESS

  async function submitWithdraw() {
    if (!amount || !withdrawAddress.trim()) { setMsg({ type: 'error', text: 'Enter amount and destination address' }); return }
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency: 'USD', amount: Number(amount), address: withdrawAddress.trim() }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Failed to request withdrawal' }); return }
      setMsg({ type: 'success', text: 'Withdrawal request submitted' })
      setAmount(''); setWithdrawAddress('')
      loadProfile(); loadTransactions()
    } catch { setMsg({ type: 'error', text: 'Failed to request withdrawal' }) }
    finally { setLoading(false) }
  }

  function copyAddress() {
    if (!activeAddress) return
    navigator.clipboard.writeText(activeAddress)
    setCopied(true); setMsg({ type: 'success', text: 'Address copied' })
    setTimeout(() => setCopied(false), 1800)
  }

  async function shareAddress() {
    const text = `My USDC deposit address (any EVM chain):\n${activeAddress}`
    if (navigator.share) { try { await navigator.share({ title: 'USDC Deposit Address', text }); return } catch {} }
    copyAddress()
  }

  async function shareReferral() {
    const url = `${window.location.origin}/signup?ref=${refCode}`
    const text = `Join Altaris Capital and get a $40 bonus!\n${url}`
    if (navigator.share) { try { await navigator.share({ title: 'Join Altaris Capital', text, url }); return } catch {} }
    navigator.clipboard.writeText(url)
    setMsg({ type: 'success', text: 'Referral link copied' })
  }

  function close() { setTab('none'); setMsg(null) }

  const isPositive = chartPnl.diff >= 0
  const chartColor = isPositive ? '#0ECB81' : '#F6465D'

  return (
    <div style={{ padding: '10px 16px 110px', background: 'var(--bg-page)', minHeight: '100vh' }}>

      {/* ── Toast ── */}
      {copied && (
        <div style={{ position: 'fixed', top: 'calc(var(--app-header-height, 64px) + 10px)', left: '50%', transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'none', background: 'rgba(14,203,129,0.18)', color: '#0ECB81', border: '1px solid rgba(14,203,129,0.3)', padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
          ✓ Copied
        </div>
      )}

      {/* ── Skeleton ── */}
      {!ready && (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skel h={210} r={24} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[0,1,2,3].map(i => <Skel key={i} h={80} r={18} />)}
          </div>
          <Skel h={160} r={20} />
          <div style={{ display: 'grid', gap: 10 }}>
            {[0,1,2,3].map(i => <Skel key={i} h={66} r={14} />)}
          </div>
        </div>
      )}

      {ready && (
        <>
          {/* ──────────────────── BALANCE HERO ──────────────────── */}
          <div style={{ marginBottom: 14, borderRadius: 24, background: 'linear-gradient(160deg,#0d1220 0%,#070b12 100%)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', padding: '20px 18px 0' }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Total Portfolio</div>
                <div className="notranslate" translate="no" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                  ${fmt(totalPortfolio)}
                </div>
                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: isPositive ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)', border: `1px solid ${isPositive ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)'}` }}>
                  <span style={{ color: chartColor, fontSize: 12, fontWeight: 800 }}>
                    {isPositive ? '▲' : '▼'} ${Math.abs(chartPnl.diff).toFixed(2)} ({isPositive ? '+' : ''}{chartPnl.pct.toFixed(2)}%)
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>today</span>
                </div>
              </div>
              <div style={{ paddingTop: 4, flexShrink: 0 }}>
                <Sparkline values={chartData} color={chartColor} width={90} height={44} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Available', value: `$${fmt(usdBalance)}`, color: '#fff' },
                { label: 'Invested', value: `$${fmt(investedTotal)}`, color: '#F2BA0E' },
                { label: 'Earnings', value: `+$${fmt(totalEarnings)}`, color: '#0ECB81' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '14px 0 16px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div className="notranslate" style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ──────────────────── QUICK ACTIONS ──────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Deposit', color: '#0ECB81', onClick: () => { setTab('deposit'); setMsg(null) }, icon: 'M12 5v14M5 12l7 7 7-7' },
              { label: 'Withdraw', color: '#F6465D', onClick: () => { setTab('withdraw'); setMsg(null) }, icon: 'M12 19V5M5 12l7-7 7 7' },
              { label: 'Invest', color: '#F2BA0E', onClick: () => { window.location.href = '/invest' }, icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
              { label: 'Rewards', color: '#A78BFA', onClick: () => { setTab('reward'); setMsg(null) }, icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
            ].map(a => (
              <button key={a.label} type="button" onClick={a.onClick} className="pressable" style={{ padding: '14px 6px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
                <span style={{ width: 40, height: 40, borderRadius: 14, background: a.color + '1a', border: `1px solid ${a.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {a.icon.split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
                  </svg>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* ──────────────────── PORTFOLIO CHART ──────────────────── */}
          <div style={{ marginBottom: 14, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 16px 12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Portfolio Performance</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['1D', '7D', '1M', 'All'] as ChartRange[]).map(r => (
                  <button key={r} type="button" onClick={() => setChartRange(r)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, background: chartRange === r ? 'rgba(242,186,14,0.15)' : 'transparent', color: chartRange === r ? '#F2BA0E' : 'rgba(255,255,255,0.35)', transition: 'all .15s' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <AreaChart data={chartData} color={chartColor} height={110} />
            <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Change</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: chartColor }}>{isPositive ? '+' : ''}${fmt(chartPnl.diff)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Return</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: chartColor }}>{isPositive ? '+' : ''}{chartPnl.pct.toFixed(2)}%</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Balance</div>
                <div className="notranslate" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>${fmt(usdBalance)}</div>
              </div>
            </div>
          </div>

          {/* ──────────────────── RECENT ACTIVITY ──────────────────── */}
          <div style={{ marginBottom: 14, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Recent Activity</div>
              <Link href="/transactions" style={{ fontSize: 12, fontWeight: 700, color: '#F2BA0E', textDecoration: 'none', padding: '5px 10px', borderRadius: 8, background: 'rgba(242,186,14,0.08)' }}>See all →</Link>
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(255,255,255,0.04)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No activity yet</div>
                <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12, marginTop: 4 }}>Deposit USDC to get started</div>
              </div>
            ) : (
              <div>
                {transactions.slice(0, 6).map((t: any, i: number) => {
                  const cfg = TX[t.type] || TX.ADJUSTMENT
                  const isLast = i === Math.min(transactions.length, 6) - 1
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                      <TxIcon type={t.type} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 }}>{cfg.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{fmtDate(t.createdAt)}</span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: t.status === 'SUCCESS' || t.status === 'COMPLETED' ? 'rgba(14,203,129,0.12)' : t.status === 'PENDING' ? 'rgba(242,186,14,0.12)' : 'rgba(246,70,93,0.12)', color: t.status === 'SUCCESS' || t.status === 'COMPLETED' ? '#0ECB81' : t.status === 'PENDING' ? '#F2BA0E' : '#F6465D' }}>{t.status}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="notranslate" style={{ fontSize: 14, fontWeight: 800, color: cfg.credit ? '#0ECB81' : '#F6465D' }}>
                          {cfg.credit ? '+' : '-'}${fmt(t.amount)}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t.currency || 'USD'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ──────────────────── INVEST SHORTCUT ──────────────────── */}
          <Link href="/invest" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 20, background: 'linear-gradient(135deg,#111800,#0a0d14)', border: '1px solid rgba(242,186,14,0.18)', textDecoration: 'none', marginBottom: 14 }} className="pressable">
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(242,186,14,0.12)', border: '1px solid rgba(242,186,14,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2BA0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>Start Earning</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Explore investment plans with daily ROI</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(242,186,14,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </>
      )}

      {/* ═══════════════ OVERLAY: DEPOSIT ═══════════════ */}
      {tab === 'deposit' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#07090c', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(var(--app-bottom-nav-height, 84px) + env(safe-area-inset-bottom) + 24px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <button onClick={close} type="button" aria-label="Close" style={{ border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', width: 38, height: 38, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Receive USDC</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(39,117,202,0.12)', border: '1px solid rgba(39,117,202,0.25)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: USDC_COLOR }} />
                <span style={{ color: '#6FA8DC', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}>ANY EVM CHAIN</span>
              </div>
            </div>
            <div style={{ width: 38 }} />
          </div>

          {/* QR card */}
          <div style={{ maxWidth: 360, margin: '0 auto 14px', padding: 22, borderRadius: 24, background: 'linear-gradient(180deg,#0e1320,#0a0d14)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 99, background: USDC_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2775CA"/><path d="M15.2 13.94c0-1.7-1.02-2.28-3.06-2.52-1.46-.2-1.75-.59-1.75-1.27 0-.68.49-1.12 1.46-1.12.88 0 1.36.29 1.6.97a.37.37 0 00.34.24h.78a.33.33 0 00.34-.33v-.05a2.43 2.43 0 00-2.19-1.99v-1.16c0-.2-.15-.34-.39-.39h-.73c-.2 0-.34.15-.39.39v1.12c-1.46.19-2.38 1.16-2.38 2.37 0 1.6.97 2.23 3.01 2.47 1.36.24 1.8.54 1.8 1.31 0 .78-.68 1.31-1.6 1.31-1.26 0-1.7-.53-1.85-1.26-.05-.19-.2-.29-.34-.29h-.83a.33.33 0 00-.34.34v.05c.2 1.21.97 2.08 2.57 2.32v1.17c0 .19.15.34.39.39h.73c.2 0 .34-.15.39-.39v-1.17c1.46-.24 2.43-1.26 2.43-2.51z" fill="#fff"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>USD Coin</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>1 USDC = $1.00 · ERC-20 stablecoin</div>
              </div>
              <div style={{ padding: '4px 9px', borderRadius: 8, background: 'rgba(14,203,129,0.1)', border: '1px solid rgba(14,203,129,0.2)', color: '#0ECB81', fontSize: 10, fontWeight: 800 }}>STABLE</div>
            </div>

            {/* QR */}
            <div style={{ margin: '0 auto', width: '100%', maxWidth: 240, aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden', position: 'relative', background: '#fff', padding: 10 }}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="USDC deposit QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.08)', borderTopColor: USDC_COLOR, animation: 'qrSpin .7s linear infinite' }} /></div>
              }
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 42, height: 42, borderRadius: 13, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                <AltarisLogoMark size={26} />
              </div>
            </div>

            {/* Address row */}
            <button onClick={copyAddress} type="button" aria-label="Copy address" className="pressable" style={{ width: '100%', marginTop: 18, padding: '13px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, textAlign: 'left', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12, color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all', lineHeight: 1.5, fontWeight: 500 }}>{activeAddress}</span>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: copied ? 'rgba(14,203,129,0.15)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
                {copied
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                }
              </span>
            </button>
          </div>

          {/* Buttons */}
          <div style={{ maxWidth: 360, margin: '0 auto 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={copyAddress} type="button" className="btn-ghost pressable" style={{ padding: '13px', borderRadius: 14, fontWeight: 800, fontSize: 13 }}>{copied ? '✓ Copied' : 'Copy Address'}</button>
            <button onClick={shareAddress} type="button" className="btn-ghost pressable" style={{ padding: '13px', borderRadius: 14, fontWeight: 800, fontSize: 13 }}>Share</button>
          </div>

          {/* Network notice */}
          <div style={{ maxWidth: 360, margin: '0 auto', padding: '12px 14px', borderRadius: 14, background: 'rgba(242,186,14,0.07)', border: '1px solid rgba(242,186,14,0.16)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F2BA0E" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style={{ fontSize: 12, color: 'rgba(242,186,14,0.85)', lineHeight: 1.55 }}>
              Send only <strong>USDC</strong> on Ethereum, Base, Polygon, Arbitrum or Optimism. Other tokens or chains will be permanently lost. Minimum: <strong>${USDC_MIN_DEPOSIT} USDC</strong>.
            </div>
          </div>
          <style>{`@keyframes qrSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ═══════════════ OVERLAY: WITHDRAW ═══════════════ */}
      {tab === 'withdraw' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#07090c', overflowY: 'auto', overscrollBehavior: 'contain', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(var(--app-bottom-nav-height, 84px) + env(safe-area-inset-bottom) + 24px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <button onClick={close} type="button" aria-label="Close" style={{ border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', width: 38, height: 38, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Withdraw</div>
            <div style={{ width: 38 }} />
          </div>

          {/* Balance tile */}
          <div style={{ padding: '18px', borderRadius: 20, background: 'linear-gradient(135deg,#0d1220,#070b12)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Available Balance</div>
            <div className="notranslate" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', marginBottom: 4 }}>${fmt(usdBalance)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>USD</div>
          </div>

          <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 18, display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.05em' }}>DESTINATION WALLET</label>
              <input className="input" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} placeholder="0x… wallet address" style={{ borderRadius: 14, fontSize: 14 }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>AMOUNT (USD)</label>
                <button onClick={() => setAmount(String(usdBalance))} style={{ border: 'none', background: 'rgba(242,186,14,0.12)', color: '#F2BA0E', fontWeight: 800, fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>MAX</button>
              </div>
              <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ borderRadius: 14, fontSize: 20, fontWeight: 700 }} />
            </div>

            {msg && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: msg.type === 'success' ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)', color: msg.type === 'success' ? '#0ECB81' : '#F6465D', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
            )}

            <button onClick={submitWithdraw} disabled={loading} className="btn-primary pressable" style={{ width: '100%', borderRadius: 14, padding: '15px', fontSize: 15 }}>
              {loading ? 'Processing…' : 'Request Withdrawal'}
            </button>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.5 }}>Withdrawal requests are reviewed within 24 hours. Funds are sent as USDC.</p>
          </div>
        </div>
      )}

      {/* ═══════════════ OVERLAY: REWARD ═══════════════ */}
      {tab === 'reward' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#07090c', overflowY: 'auto', overscrollBehavior: 'contain', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(var(--app-bottom-nav-height, 84px) + env(safe-area-inset-bottom) + 24px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <button onClick={close} type="button" aria-label="Close" style={{ border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', width: 38, height: 38, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Rewards & Referrals</div>
            <div style={{ width: 38 }} />
          </div>

          {/* Hero */}
          <div style={{ marginBottom: 14, background: 'linear-gradient(135deg,#1a1500,#0d0d0d)', border: '1px solid rgba(242,186,14,0.22)', borderRadius: 22, padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,186,14,0.13),transparent 70%)' }} />
            <div style={{ fontSize: 11, color: '#F2BA0E', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Referral Program</div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.2, marginBottom: 10 }}>Earn $200 per<br/>qualified referral</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>Invite friends to Altaris Capital. When they verify and deposit, you both earn cash bonuses.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={shareReferral} type="button" className="pressable" style={{ flex: 1, background: '#F2BA0E', color: '#000', fontWeight: 800, fontSize: 14, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Share My Link</button>
              <Link href="/rewards" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(242,186,14,0.1)', color: '#F2BA0E', fontWeight: 700, fontSize: 13, padding: '14px', borderRadius: 14, border: '1px solid rgba(242,186,14,0.2)', textDecoration: 'none' }}>Dashboard</Link>
            </div>
          </div>

          {/* Ref code */}
          <div style={{ marginBottom: 14, borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>Your Referral Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, fontFamily: 'ui-monospace,monospace', fontSize: 22, fontWeight: 900, color: '#F2BA0E', letterSpacing: '0.08em' }}>{refCode}</div>
              <button onClick={shareReferral} type="button" className="pressable" style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(242,186,14,0.12)', color: '#F2BA0E', fontWeight: 700, fontSize: 12, border: '1px solid rgba(242,186,14,0.2)', cursor: 'pointer', fontFamily: 'inherit' }}>Copy & Share</button>
            </div>
          </div>

          {/* How it works */}
          <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>How It Works</div>
            {[
              { n: '1', t: 'Share your link', d: 'Send your unique referral link to anyone', c: '#A78BFA' },
              { n: '2', t: 'They sign up', d: 'Friend creates an account via your link', c: '#F2BA0E' },
              { n: '3', t: 'They verify + deposit', d: 'Complete KYC and make first deposit', c: '#0ECB81' },
              { n: '4', t: 'Both earn bonuses', d: 'You get $200 · They get $40 — instantly', c: '#F2BA0E' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display: 'flex', gap: 14, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${s.c}15`, border: `1.5px solid ${s.c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: s.c, flexShrink: 0 }}>{s.n}</div>
                <div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.t}</div><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          {/* Tiers */}
          <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 18px' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Tier Bonuses</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[{ e: '🌱', l: 'Starter', n: '1 ref', b: '$40' }, { e: '⭐', l: 'Rising', n: '5 refs', b: '$700' }, { e: '👑', l: 'Elite', n: '20 refs', b: '$3K' }, { e: '💎', l: 'VIP', n: '50 refs', b: 'VIP' }].map(t => (
                <div key={t.l} style={{ textAlign: 'center', padding: '12px 6px', background: '#1a1a1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{t.e}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{t.l}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.n}</div>
                  <div style={{ fontSize: 11, color: '#F2BA0E', fontWeight: 800, marginTop: 4 }}>{t.b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
