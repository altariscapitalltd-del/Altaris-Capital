'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'

// Single deposit rail: USDC on Ethereum (ERC-20)
const USDC_ADDRESS = '0x879C6dbF4EFBf6aECFAFeaca61c166a507a3B7bf'
const USDC_MIN_DEPOSIT = 10
const USDC_COLOR = '#2775CA'

type WalletTab = 'none' | 'deposit' | 'withdraw' | 'reward'

function ShadowCard({ h = 96 }: { h?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: 18,
      background: '#050505',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 18%, rgba(255,255,255,0.06) 32%, transparent 46%)', backgroundSize: '200% 100%', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: 38, left: 14, right: 70, height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 14, left: 14, width: '58%', height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: 14, right: 14, width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

function MiniTrend({ values, color = '#F2BA0E' }: { values: number[]; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || values.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 130
    const height = 52
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * width,
      y: height - ((v - min) / range) * (height - 8) - 4,
    }))

    ctx.clearRect(0, 0, width, height)

    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(242,186,14,0.38)')
    grad.addColorStop(1, 'rgba(242,186,14,0)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [values, color])

  return <canvas ref={canvasRef} style={{ width: 130, height: 52, display: 'block' }} />
}

function PortfolioChart({ data, color = '#0ECB81', width = 336, height = 96 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr)
    const values = data.length > 1 ? data : [0, 0]
    const min = Math.min(...values), max = Math.max(...values), pad = Math.max((max - min) * .18, max * .004, 1)
    const lo = min - pad, hi = max + pad, range = hi - lo || 1
    const left = 8, right = width - 8, top = 8, bottom = height - 16
    const xs = values.map((_, i) => left + (i / Math.max(values.length - 1, 1)) * (right - left))
    const ys = values.map(v => bottom - ((v - lo) / range) * (bottom - top))
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1
    ;[.33,.66].forEach(t => { const y = top + (bottom - top) * t; ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke() })
    const grad = ctx.createLinearGradient(0, top, 0, bottom); grad.addColorStop(0, color + '40'); grad.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++){const m=(xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i])} ctx.lineTo(xs[xs.length-1],bottom); ctx.lineTo(xs[0],bottom); ctx.closePath(); ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++){const m=(xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i])} ctx.strokeStyle=color; ctx.lineWidth=2.3; ctx.lineCap='round'; ctx.stroke()
  }, [data, color, width, height])
  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
}

export default function WalletPage() {
  const [tab, setTab] = useState<WalletTab>('none')
  const [amount, setAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [investedTotal, setInvestedTotal] = useState(0)
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change: number; image?: string; spark?: number[] }>>({})
  const [chartRange, setChartRange] = useState<'24H' | '7D' | '30D' | 'All'>('24H')
  const [transactions, setTransactions] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [refCode, setRefCode] = useState('')
  const marketCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']

  function loadProfile() {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        const nextBalances: Record<string, number> = {}
        d.user?.balances?.forEach((b: any) => {
          nextBalances[b.currency] = b.amount
        })
        setBalances(nextBalances)

        const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
        setInvestedTotal(active.reduce((sum: number, i: any) => sum + i.amount, 0))
        setRefCode(d.user?.referralCode || 'ALTARIS01')
      })
      .catch(() => {})
  }

  function loadTransactions() {
    fetch('/api/transactions?page=1')
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => setTransactions([]))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [profileRes, txRes, addrRes, marketRes] = await Promise.allSettled([
          fetch('/api/user/profile'),
          fetch('/api/transactions?page=1'),
          fetch('/api/wallet/addresses'),
          fetch('/api/markets/list?per_page=40'),
        ])

        if (cancelled) return

        if (profileRes.status === 'fulfilled') {
          const d = await profileRes.value.json().catch(() => ({}))
          const nextBalances: Record<string, number> = {}
          d.user?.balances?.forEach((b: any) => { nextBalances[b.currency] = b.amount })
          setBalances(nextBalances)
          const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
          setInvestedTotal(active.reduce((sum: number, i: any) => sum + i.amount, 0))
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

        if (marketRes.status === 'fulfilled') {
          const d = await marketRes.value.json().catch(() => ({}))
          const mapped: Record<string, { price: number; change: number; image?: string; spark?: number[] }> = { USDT: { price: 1, change: 0 } }
          ;(d.list || []).forEach((c: any) => {
            const sym = String(c.symbol || '').toUpperCase()
            if (sym) mapped[sym] = { price: Number(c.price || 0), change: Number(c.change24h || 0), image: c.image || '', spark: Array.isArray(c.spark) ? c.spark : [] }
          })
          setMarketPrices(mapped)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handler = () => {
      loadProfile()
      loadTransactions()
    }
    window.addEventListener('balance:refresh', handler)
    return () => window.removeEventListener('balance:refresh', handler)
  }, [])

  useEffect(() => {
    if (tab !== 'deposit') {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(activeAddress, { width: 512, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, walletAddresses])

  const usdBalance = balances.USD || 0
  const cryptoValue = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'USDT'].reduce((sum, sym) => sum + (balances[sym] || 0) * (marketPrices[sym]?.price || (sym === 'USDT' ? 1 : 0)), 0)
  const walletBalance = usdBalance + cryptoValue
  const portfolioBalance = walletBalance + investedTotal
  const cryptoPL = ['BTC', 'ETH', 'USDT'].reduce((sum, sym) => {
    const amountHeld = balances[sym] || 0
    const price = marketPrices[sym]?.price || (sym === 'USDT' ? 1 : 0)
    const change = marketPrices[sym]?.change || 0
    const previous = price && change !== -100 ? price / (1 + change / 100) : price
    return sum + amountHeld * (price - previous)
  }, 0)

  const trendData = useMemo(() => {
    const tx = transactions
      .slice()
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .filter((a: any) => {
        if (chartRange === 'All') return true
        const hours = chartRange === '24H' ? 24 : chartRange === '7D' ? 168 : 720
        return Date.now() - new Date(a.createdAt).getTime() <= hours * 60 * 60 * 1000
      })
      .slice(-40)

    if (tx.length === 0) {
      const base = walletBalance || 0
      return Array.from({ length: 24 }, () => Number(base.toFixed(2)))
    }

    let running = Math.max(0, walletBalance)
    const result: number[] = []
    for (let i = tx.length - 1; i >= 0; i--) {
      const item = tx[i]
      const amount = Number(item.amount || 0)
      const isCredit = ['DEPOSIT', 'PROFIT', 'ROI', 'BONUS', 'REFERRAL_BONUS'].includes(item.type)
      const isDebit = ['WITHDRAWAL', 'INVESTMENT'].includes(item.type)
      if (isCredit) running = Math.max(0, running - amount)
      if (isDebit) running = running + amount
      result.unshift(Number(running.toFixed(2)))
    }

    const padded = result.slice(-24)
    while (padded.length < 24) padded.unshift(padded[0] ?? walletBalance)
    return padded
  }, [transactions, walletBalance, chartRange])

  const chartPerformance = useMemo(() => {
    const start = trendData[0] || walletBalance
    const end = trendData[trendData.length - 1] || walletBalance
    const pnl = end - start
    const percent = start ? (pnl / start) * 100 : 0
    const previous = trendData[trendData.length - 2] || start
    return { pnl, percent, daily: end - previous }
  }, [trendData, walletBalance])

  const txSummary = useMemo(() => {
    return {
      totalCount: transactions.length,
      pending: transactions.filter((t: any) => t.status === 'PENDING').length,
      latest: transactions.slice(0, 4),
    }
  }, [transactions])

  const activeAddress = walletAddresses['USDC'] || USDC_ADDRESS

  async function submitWithdraw() {
    if (!amount || !withdrawAddress.trim()) {
      setMsg({ type: 'error', text: 'Please enter amount and destination wallet address' })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: 'USD', amount: Number(amount), address: withdrawAddress.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to request withdrawal' })
        return
      }
      setMsg({ type: 'success', text: 'Withdrawal request submitted successfully' })
      setAmount('')
      setWithdrawAddress('')
      loadProfile()
      loadTransactions()
    } catch {
      setMsg({ type: 'error', text: 'Failed to request withdrawal' })
    } finally {
      setLoading(false)
    }
  }

  function copyAddress() {
    copyWalletAddress(activeAddress, 'USDC')
  }

  function copyWalletAddress(address: string, symbol: string) {
    if (!address) {
      setMsg({ type: 'error', text: `${symbol} address unavailable` })
      return
    }
    navigator.clipboard.writeText(address)
    setCopied(true)
    setMsg({ type: 'success', text: `${symbol} address copied` })
    setTimeout(() => setCopied(false), 1800)
  }

  async function shareAddress() {
    if (!activeAddress) return
    const payload = `USDC (ERC-20) deposit address:\n${activeAddress}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'USDC Deposit Address', text: payload })
        return
      } catch {}
    }
    copyAddress()
  }

  async function shareReferral() {
    const referralUrl = `${window.location.origin}/signup?ref=${refCode}`
    const text = `I'm using Altaris Capital — an investment platform that grows your wealth. Join with my referral link and get a $40 bonus when you start investing!\n${referralUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Altaris Capital', text, url: referralUrl })
        return
      } catch {}
    }
    navigator.clipboard.writeText(referralUrl)
    setMsg({ type: 'success', text: 'Referral link copied to clipboard.' })
  }

  function closeDashboard() {
    setTab('none')
    setMsg(null)
  }

  const walletCurrencies = marketCoins.map((sym) => ({
    sym,
    name: sym === 'BTC' ? 'Bitcoin' : sym === 'ETH' ? 'Ethereum' : sym === 'BNB' ? 'BNB' : sym === 'SOL' ? 'Solana' : 'XRP',
    image: marketPrices[sym]?.image,
    price: marketPrices[sym]?.price || 0,
    value: `$${((balances[sym] || 0) * (marketPrices[sym]?.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    amount: balances[sym] || 0,
    color: sym === 'BTC' ? '#F7931A' : sym === 'ETH' ? '#627EEA' : sym === 'BNB' ? '#F3BA2F' : sym === 'SOL' ? '#14F195' : '#E74C3C',
    note: walletAddresses[sym] ? `${walletAddresses[sym].slice(0, 8)}...${walletAddresses[sym].slice(-6)}` : 'Admin address required',
  }))

  const trendingTokens = [
    { sym: 'ETH', name: 'Ethereum', price: marketPrices.ETH?.price || 0, change: marketPrices.ETH?.change || 0, color: '#627EEA' },
    { sym: 'USDC', name: 'USDC', price: 1, change: 0, color: '#2775CA' },
    { sym: 'SOL', name: 'Solana', price: marketPrices.SOL?.price || 0, change: marketPrices.SOL?.change || 0, color: '#14F195' },
  ]

  const shortcutTabs = [
    { label: 'Deposit', tone: 'var(--success)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>, onClick: () => { setTab('deposit'); setMsg(null) } },
    { label: 'Withdraw', tone: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>, onClick: () => { setTab('withdraw'); setMsg(null) } },
    { label: 'Invested', tone: 'var(--brand-primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>, onClick: () => { window.location.href = '/invest?tab=my' } },
    { label: 'Reward', tone: 'var(--brand-primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/></svg>, onClick: () => { setTab('reward'); setMsg(null) } },
  ]

  const ActionButton = ({
    active,
    onClick,
    label,
    icon,
    color,
  }: {
    active: boolean
    onClick?: () => void
    label: string
    icon: React.ReactNode
    color: string
  }) => (
    <button
      onClick={onClick}
      type="button"
      style={{
        minHeight: 96,
        padding: 12,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: active ? `${color}20` : 'var(--bg-card)',
        color: active ? color : 'var(--text-secondary)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
      className="pressable ui-upgrade-card"
    >
      {icon}
      <span style={{ textAlign: 'center' }}>{label}</span>
    </button>
  )

  return (
    <div style={{ padding: '10px 16px 22px', background: '#000', minHeight: '100vh' }}>
      {!ready && (
        <div style={{ display: 'grid', gap: 14 }}>
          <ShadowCard h={118} />
          <ShadowCard h={92} />
          <ShadowCard h={92} />
          <ShadowCard h={92} />
          <ShadowCard h={210} />
        </div>
      )}
      {ready && copied && (
        <div style={{ position: 'fixed', top: 'calc(var(--app-header-height, 64px) + 12px)', left: 16, right: 16, zIndex: 80, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(14,203,129,0.15)', color: '#0ECB81', border: '1px solid rgba(14,203,129,0.25)', padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
            Copied
          </div>
        </div>
      )}
      <div style={{ marginBottom: 14, padding: '18px 16px', borderRadius: 22, background: '#000', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'none' }}>
        <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Wallet balance</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="notranslate" translate="no" style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8 }}>${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'rgba(14,203,129,0.12)', color: 'var(--success)', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              {cryptoPL >= 0 ? '+' : '-'}${Math.abs(cryptoPL).toFixed(2)} P/L today
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Available ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style={{ flexShrink: 0, width: 118, height: 54 }}>
            <MiniTrend values={trendData} color={chartPerformance.pnl >= 0 ? '#0ECB81' : '#F6465D'} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
          {shortcutTabs.map((item) => (
            <button key={item.label} type="button" onClick={item.onClick} style={{ minHeight: 72, borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 28, height: 28, borderRadius: 999, background: `${item.tone}22`, color: item.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 11 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 2px 12px' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>INVESTMENT PLANS</div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, marginTop: 4 }}>Top plans from Invest</div>
        </div>
        <Link href="/invest" style={{ fontSize: 12, fontWeight: 800, color: '#F2BA0E', textDecoration: 'none', padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(242,186,14,0.16)', background: 'rgba(242,186,14,0.08)' }}>More →</Link>
      </div>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {(!walletCurrencies.some((a) => a.image) || loading) && (
          <ShadowCard h={96} />
        )}
        {[
          { title: 'BTC Growth Plan', sub: 'Best for high conviction holders', roi: '2.4% daily', sym: 'BTC', color: '#F7931A' },
          { title: 'ETH Builder Plan', sub: 'Balanced growth and stability', roi: '1.6% daily', sym: 'ETH', color: '#627EEA' },
          { title: 'SOL Momentum Plan', sub: 'Aggressive short-term upside', roi: '1.3% daily', sym: 'SOL', color: '#14F195' },
        ].map((p) => {
          const img = marketPrices[p.sym]?.image
          return (
            <Link key={p.title} href="/invest" style={{ padding: 14, borderRadius: 18, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} className="pressable">
              <div style={{ width: 42, height: 42, borderRadius: 14, background: img ? '#111' : p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {img ? <img src={img} alt={`${p.sym} logo`} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <div style={{ width: 18, height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.1)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{p.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, marginTop: 2 }}>{p.sub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#0ECB81', fontWeight: 900, fontSize: 13 }}>{p.roi}</div>
                <div style={{ color: 'rgba(255,255,255,0.44)', fontSize: 11 }}>Open</div>
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>CRYPTO LIST</div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, marginTop: 4 }}>Your held assets</div>
        </div>
        <Link href="/markets" style={{ fontSize: 12, fontWeight: 800, color: '#F2BA0E', textDecoration: 'none' }}>All markets</Link>
      </div>

      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {walletCurrencies.map((asset) => (
          <Link key={asset.sym} href={`/markets/${asset.sym.toLowerCase()}`} className="wallet-currency-card" style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="wallet-currency-icon" style={{ background: asset.image ? '#111' : asset.color }}>
              {asset.image ? <img src={asset.image} alt={`${asset.name} logo`} /> : <div style={{ width: 16, height: 16, borderRadius: 999, background: 'rgba(255,255,255,0.1)' }} />}
            </span>
            <span className="wallet-currency-copy">
              <strong>{asset.name}</strong>
              <em>
                Price <span style={{ color: (asset.price || 0) >= 0 ? '#0ECB81' : '#F6465D', fontVariantNumeric: 'tabular-nums' }}>${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
              </em>
            </span>
            <span className="wallet-currency-value">
              <strong>{asset.amount.toLocaleString('en-US', { maximumFractionDigits: asset.sym === 'USDT' ? 2 : 6 })}</strong>
              <em>{asset.value}</em>
            </span>
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: (asset.price || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>
              {(marketPrices[asset.sym]?.change || 0) >= 0 ? '+' : ''}{(marketPrices[asset.sym]?.change || 0).toFixed(2)}%
            </span>
          </Link>
        ))}
      </div>

      {!walletCurrencies.some((a) => a.image) && (
        <div style={{ marginBottom: 14 }}>
          <ShadowCard h={96} />
        </div>
      )}
      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      {tab === 'withdraw' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'calc(73px + env(safe-area-inset-bottom))', zIndex: 45, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={closeDashboard} type="button" style={{ border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Withdraw</div>
            <div style={{ width: 36 }} />
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Withdraw from account balance (USD)</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Destination wallet address</label>
                <input className="input" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder="Enter wallet address" />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ paddingRight: 64 }} />
                  <button onClick={() => setAmount(String(usdBalance))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: 6, background: 'rgba(242,186,14,0.16)', color: 'var(--brand-primary)', fontWeight: 700, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>MAX</button>
                </div>
              </div>
              <button onClick={submitWithdraw} disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 6 }}>
                {loading ? 'Processing...' : 'Request Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'reward' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'calc(73px + env(safe-area-inset-bottom))', zIndex: 45, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={closeDashboard} type="button" style={{ border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Rewards & Referrals</div>
            <div style={{ width: 36 }} />
          </div>

          {/* Hero card */}
          <div style={{ marginBottom: 16, background: 'linear-gradient(135deg,#1A1500,#0D0D0D)', border: '1px solid rgba(242,186,14,0.25)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,186,14,0.15),transparent 70%)' }} />
            <div style={{ fontSize: 11, color: '#F2BA0E', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>REFERRAL PROGRAM</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>Earn $200 per<br/>qualified referral</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Invite friends to Altaris Capital. When they verify and deposit, you both earn cash bonuses. Share your unique link and track earnings in real time.</div>
            <Link href="/rewards" style={{ display: 'block', background: '#F2BA0E', color: '#000', fontWeight: 800, fontSize: 14, padding: '14px', borderRadius: 12, textAlign: 'center', textDecoration: 'none' }}>
              Open Rewards Dashboard →
            </Link>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>How It Works</div>
            {[
              { n: '1', t: 'Share your link', d: 'Send your unique referral link to anyone', c: '#A78BFA' },
              { n: '2', t: 'They sign up', d: 'Friend creates an account via your link', c: '#F2BA0E' },
              { n: '3', t: 'They verify + deposit', d: 'Complete KYC and make first deposit', c: '#0ECB81' },
              { n: '4', t: 'Both earn bonuses', d: 'You get $200 · They get $40 — instantly', c: '#F2BA0E' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${s.c}15`, border: `1.5px solid ${s.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: s.c, flexShrink: 0 }}>{s.n}</div>
                <div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.t}</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          {/* Tier overview */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Tier Bonuses</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ icon: '🌱', label: 'Starter', n: '1 ref', bonus: '+$40' }, { icon: '⭐', label: 'Rising', n: '5 refs', bonus: '+$700' }, { icon: '👑', label: 'Elite', n: '20 refs', bonus: '+$3K' }, { icon: '💎', label: 'VIP', n: '50 refs', bonus: 'VIP' }].map(t => (
                <div key={t.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: '#1A1A1A', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{t.n}</div>
                  <div style={{ fontSize: 10, color: '#F2BA0E', fontWeight: 800, marginTop: 3 }}>{t.bonus}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ── USDC Receive — full-screen ── */}
      {tab === 'deposit' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#07090c', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(var(--app-bottom-nav-height, 84px) + env(safe-area-inset-bottom) + 24px)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={closeDashboard} type="button" aria-label="Close" style={{ border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', width: 38, height: 38, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em' }}>Deposit USDC</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 3, padding: '3px 10px', borderRadius: 99, background: 'rgba(39,117,202,0.12)', border: '1px solid rgba(39,117,202,0.25)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: USDC_COLOR }} />
                <span style={{ color: '#6FA8DC', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}>ERC-20 · ETHEREUM</span>
              </div>
            </div>
            <div style={{ width: 38 }} />
          </div>

          {/* QR card */}
          <div style={{ maxWidth: 360, margin: '0 auto 16px', padding: 22, borderRadius: 24, background: 'linear-gradient(180deg, #0e1320, #0a0d14)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 99, background: USDC_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" fill="#2775CA"/><path d="M15.2 13.94c0-1.7-1.02-2.28-3.06-2.52-1.46-.2-1.75-.59-1.75-1.27 0-.68.49-1.12 1.46-1.12.88 0 1.36.29 1.6.97a.37.37 0 00.34.24h.78a.33.33 0 00.34-.33v-.05a2.43 2.43 0 00-2.19-1.99v-1.16c0-.2-.15-.34-.39-.39h-.73c-.2 0-.34.15-.39.39v1.12c-1.46.19-2.38 1.16-2.38 2.37 0 1.6.97 2.23 3.01 2.47 1.36.24 1.8.54 1.8 1.31 0 .78-.68 1.31-1.6 1.31-1.26 0-1.7-.53-1.85-1.26-.05-.19-.2-.29-.34-.29h-.83a.33.33 0 00-.34.34v.05c.2 1.21.97 2.08 2.57 2.32v1.17c0 .19.15.34.39.39h.73c.2 0 .34-.15.39-.39v-1.17c1.46-.24 2.43-1.26 2.43-2.51z" fill="#fff"/><path d="M9.85 19.41c-3.8-1.36-5.75-5.6-4.33-9.36.73-2.04 2.33-3.6 4.33-4.32.2-.1.29-.25.29-.49v-.68c0-.2-.1-.34-.29-.39-.05 0-.15 0-.2.05a8.751 8.751 0 00-5.69 11.01c.88 2.72 2.97 4.81 5.69 5.69.2.1.39 0 .44-.2.05-.04.05-.09.05-.19v-.68c0-.14-.15-.34-.29-.44zm4.49-15.19c-.19-.1-.39 0-.43.2-.05.05-.05.1-.05.19v.69c0 .19.15.39.29.48 3.8 1.36 5.75 5.6 4.33 9.36-.73 2.04-2.33 3.6-4.33 4.32-.2.1-.29.25-.29.49v.68c0 .2.1.34.29.39.05 0 .15 0 .2-.05a8.751 8.751 0 005.69-11.01 8.84 8.84 0 00-5.7-5.74z" fill="#fff"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>USD Coin</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600 }}>1 USDC = $1.00 USD</div>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(14,203,129,0.1)', border: '1px solid rgba(14,203,129,0.2)', color: '#0ECB81', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>STABLE</div>
            </div>

            {/* QR */}
            <div style={{ margin: '0 auto', width: '100%', maxWidth: 250, aspectRatio: '1/1', borderRadius: 20, overflow: 'hidden', position: 'relative', background: '#fff', padding: 10 }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="USDC deposit address QR code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.08)', borderTopColor: USDC_COLOR, animation: 'qrSpin 0.7s linear infinite' }} />
                </div>
              )}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.16)' }}>
                <AltarisLogoMark size={26} />
              </div>
            </div>

            {/* Address */}
            <button
              onClick={copyAddress}
              type="button"
              aria-label="Copy USDC deposit address"
              style={{ width: '100%', marginTop: 18, padding: '13px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
              className="pressable"
            >
              <span style={{ flex: 1, textAlign: 'left', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all', lineHeight: 1.5, fontWeight: 600 }}>
                {activeAddress}
              </span>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: copied ? 'rgba(14,203,129,0.15)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
                {copied ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
              </span>
            </button>
          </div>

          {/* Actions */}
          <div style={{ maxWidth: 360, margin: '0 auto 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={copyAddress} type="button" className="btn-ghost pressable" style={{ padding: '13px', borderRadius: 14, fontWeight: 800, fontSize: 13 }}>
              {copied ? 'Copied ✓' : 'Copy Address'}
            </button>
            <button onClick={shareAddress} type="button" className="btn-ghost pressable" style={{ padding: '13px', borderRadius: 14, fontWeight: 800, fontSize: 13 }}>
              Share
            </button>
          </div>

          {/* Network warning */}
          <div style={{ maxWidth: 360, margin: '0 auto 16px', padding: '12px 14px', borderRadius: 14, background: 'rgba(242,186,14,0.07)', border: '1px solid rgba(242,186,14,0.16)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2BA0E" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style={{ fontSize: 12, color: 'rgba(242,186,14,0.85)', lineHeight: 1.55 }}>
              Send only <strong>USDC</strong> on the <strong>Ethereum (ERC-20)</strong> network. Deposits on other networks or in other assets will be lost. Minimum deposit: <strong>${USDC_MIN_DEPOSIT} USDC</strong>.
            </div>
          </div>

          <style>{`@keyframes qrSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </div>
  )
}
