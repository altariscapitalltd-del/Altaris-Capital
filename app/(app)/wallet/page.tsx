'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import CoinIcon from '@/components/ui/CoinIcon'

const DEPOSIT_COINS = [
  { sym: 'BTC', name: 'Bitcoin', color: '#F7931A', minDeposit: 0.001 },
  { sym: 'ETH', name: 'Ethereum', color: '#627EEA', minDeposit: 0.01 },
  { sym: 'USDT', name: 'Tether', color: '#26A17B', minDeposit: 10 },
] as const

type WalletTab = 'none' | 'deposit' | 'withdraw' | 'reward'

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
  const [depositMode, setDepositMode] = useState<'select' | 'network' | 'crypto' | 'fiat'>('select')
  const [coin, setCoin] = useState<(typeof DEPOSIT_COINS)[number]['sym']>('USDT')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
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
    loadProfile()
    loadTransactions()

    fetch('/api/wallet/addresses')
      .then((r) => r.json())
      .then((d) => {
        const mapped: Record<string, string> = {}
        d.addresses?.forEach((a: any) => {
          mapped[a.currency] = a.address
        })
        setWalletAddresses(mapped)
      })
      .catch(() => setWalletAddresses({}))

    fetch('/api/markets/list?per_page=40')
      .then((r) => r.json())
      .then((d) => {
        const mapped: Record<string, { price: number; change: number; image?: string; spark?: number[] }> = { USDT: { price: 1, change: 0 } }
        ;(d.list || []).forEach((c: any) => {
          const sym = String(c.symbol || '').toUpperCase()
          if (sym) mapped[sym] = { price: Number(c.price || 0), change: Number(c.change24h || 0), image: c.image || '', spark: Array.isArray(c.spark) ? c.spark : [] }
        })
        setMarketPrices(mapped)
      })
      .catch(() => setMarketPrices({ USDT: { price: 1, change: 0 } }))
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
    if (tab !== 'deposit' || depositMode !== 'select') return
    const timer = window.setTimeout(() => {
      setTab((current) => (current === 'deposit' ? 'none' : current))
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [tab, depositMode])

  useEffect(() => {
    const address = walletAddresses[coin]
    if (!address || tab !== 'deposit' || depositMode !== 'crypto') {
      setQrDataUrl(null)
      return
    }

    QRCode.toDataURL(address, { width: 300, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [coin, walletAddresses, tab, depositMode])

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

  const paybisUrl = process.env.NEXT_PUBLIC_PAYBIS_URL || 'https://paybis.com'

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

  const selectedCoin = DEPOSIT_COINS.find((c) => c.sym === coin)!
  const activeAddress = walletAddresses[coin] || ''

  async function submitDeposit() {
    if (!amount || !txHash.trim()) {
      setMsg({ type: 'error', text: 'Please enter amount and transaction hash' })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: coin, amount: Number(amount), txHash: txHash.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to submit deposit' })
        return
      }
      setMsg({ type: 'success', text: 'Deposit submitted. Awaiting admin confirmation.' })
      setAmount('')
      setTxHash('')
      loadTransactions()
    } catch {
      setMsg({ type: 'error', text: 'Failed to submit deposit' })
    } finally {
      setLoading(false)
    }
  }

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
    if (!activeAddress) return
    copyWalletAddress(activeAddress, coin)
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
    const amountQuery = amount ? `?amount=${encodeURIComponent(amount)}` : ''
    const payload = `${coin} deposit address:\n${activeAddress}${amountQuery}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${coin} Deposit Address`, text: payload })
        return
      } catch {}
    }
    copyAddress()
  }

  function setSuggestedAmount() {
    const next = prompt(`Set ${coin} amount`, amount || String(selectedCoin.minDeposit))
    if (next === null) return
    setAmount(next)
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
    setDepositMode('select')
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
    { label: 'Deposit', tone: 'var(--success)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>, onClick: () => { setTab('deposit'); setDepositMode('select'); setMsg(null) } },
    { label: 'Withdraw', tone: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>, onClick: () => { setTab('withdraw'); setDepositMode('select'); setMsg(null) } },
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
      <div style={{ marginBottom: 14, padding: '18px 16px', borderRadius: 22, background: '#000', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'none' }}>
        <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Wallet balance</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8 }}>${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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

      <div style={{ marginBottom: 12, padding: 10, borderRadius: 18, background: '#050505', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 10 }}>DEPOSIT TYPE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" onClick={() => { setTab('deposit'); setDepositMode('network'); setMsg(null) }} style={{ padding: '14px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: depositMode === 'network' ? 'rgba(242,186,14,0.12)' : '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontWeight: 900 }}>
            Crypto
          </button>
          <button type="button" onClick={() => { setTab('deposit'); setDepositMode('fiat'); setMsg(null) }} style={{ padding: '14px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: depositMode === 'fiat' ? 'rgba(242,186,14,0.12)' : '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontWeight: 900 }}>
            Fiat
          </button>
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
        {[
          { title: 'BTC Growth Plan', sub: 'Best for high conviction holders', roi: '2.4% daily', sym: 'BTC', color: '#F7931A' },
          { title: 'ETH Builder Plan', sub: 'Balanced growth and stability', roi: '1.6% daily', sym: 'ETH', color: '#627EEA' },
          { title: 'SOL Momentum Plan', sub: 'Aggressive short-term upside', roi: '1.3% daily', sym: 'SOL', color: '#14F195' },
        ].map((p) => {
          const img = marketPrices[p.sym]?.image
          return (
            <Link key={p.title} href="/invest" style={{ padding: 14, borderRadius: 18, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} className="pressable">
              <div style={{ width: 42, height: 42, borderRadius: 14, background: img ? '#111' : p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {img ? <img src={img} alt={`${p.sym} logo`} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <CoinIcon symbol={p.sym} size={26} />}
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
              {asset.image ? <img src={asset.image} alt={`${asset.name} logo`} /> : <CoinIcon symbol={asset.sym} size={34} />}
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
      {tab === 'deposit' && (
        <div style={{ marginBottom: 14 }}>
          {depositMode === 'network' && (
            <div className="network-sheet">
              <div className="network-sheet-head">
                <h2>Change network</h2>
                <button onClick={() => setDepositMode('select')} type="button" aria-label="Close">×</button>
              </div>
              <div className="network-list">
                {DEPOSIT_COINS.map((c) => {
                  const addr = walletAddresses[c.sym] || ''
                  return (
                    <button
                      key={c.sym}
                      type="button"
                      onClick={() => { setCoin(c.sym); setDepositMode('crypto') }}
                      className="network-row pressable"
                    >
                      <span className="network-logo" style={{ background: c.color }}>
                        {c.sym === 'BTC' ? '₿' : c.sym === 'ETH' ? '◆' : '₮'}
                      </span>
                      <span className="network-copy">
                        <strong>{c.name}</strong>
                        <em>{addr ? `${addr.slice(0, 10)}...${addr.slice(-7)}` : `${c.sym.toLowerCase()} address unavailable`}</em>
                      </span>
                      <span
                        className="network-icons network-copy-action"
                        role="button"
                        tabIndex={0}
                        aria-label={`Copy ${c.sym} wallet address`}
                        title={`Copy ${c.sym} address`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyWalletAddress(addr, c.sym)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            copyWalletAddress(addr, c.sym)
                          }
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2v2h-2v-2Zm3 0h2v5h-5v-2h3v-3Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {depositMode === 'fiat' && (
            <div className="network-sheet fiat-sheet">
              <div className="network-sheet-head">
                <h2>Select payment method</h2>
                <button onClick={() => setDepositMode('select')} type="button" aria-label="Close">×</button>
              </div>
              <div className="paybis-hero-row">
                <span className="paybis-mark">P</span>
                <span>
                  <strong>Paybis</strong>
                  <em>Buy crypto with fiat, then send to your Altaris wallet</em>
                </span>
              </div>
              <div className="fiat-logo-grid" aria-label="Supported fiat payment methods">
                <span className="visa-logo">VISA</span>
                <span className="mc-logo"><i></i><b></b></span>
                <span className="apple-logo"> Pay</span>
                <span className="gpay-logo"><b>G</b> Pay</span>
              </div>
              <div className="paybis-flow">
                <div><strong>1</strong><span>Redirect to Paybis</span></div>
                <div><strong>2</strong><span>Complete purchase with card or wallet pay</span></div>
                <div><strong>3</strong><span>Crypto sent to your wallet</span></div>
              </div>
              <a href={paybisUrl} target="_blank" rel="noopener noreferrer" className="paybis-button pressable">
                Continue to Paybis →
              </a>
            </div>
          )}
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
      {/* Full-screen crypto receive dashboard */}
      {tab === 'deposit' && depositMode === 'crypto' && (
        <div className="receive-shell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button onClick={() => setDepositMode('select')} type="button" className="trade-icon-button" aria-label="Back">←</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Receive</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>{selectedCoin.name}</div>
            </div>
            <div style={{ width: 44 }} />
          </div>

          <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: 'rgba(242,186,14,0.16)', border: '1px solid rgba(242,186,14,0.24)', color: '#F2BA0E', fontSize: 12, fontWeight: 600 }}>
            Only send {coin} to this address. Other assets may be lost permanently.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }} className="no-scrollbar">
            {DEPOSIT_COINS.map((c) => (
              <button
                key={c.sym}
                onClick={() => setCoin(c.sym)}
                style={{
                  whiteSpace: 'nowrap',
                  border: '1px solid',
                  borderColor: c.sym === coin ? c.color : 'var(--border)',
                  background: c.sym === coin ? `${c.color}22` : 'var(--bg-card)',
                  color: c.sym === coin ? c.color : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {c.sym} · {c.name}
              </button>
            ))}
          </div>

          <div className="receive-qr-card">
            <div style={{ margin: '0 auto', width: '100%', maxWidth: 270, aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden', position: 'relative', background: '#fff' }}>
              {qrDataUrl ? <img src={qrDataUrl} alt={`${coin} QR`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#111', fontWeight: 700 }}>Generating QR...</div>}
              <div style={{ position: 'absolute', inset: '50% auto auto 50%', transform: 'translate(-50%, -50%)', width: 42, height: 42, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                <AltarisLogoMark size={24} />
              </div>
            </div>
            <div className="receive-address-pill">
              {activeAddress ? `${activeAddress.slice(0, 8)}…${activeAddress.slice(-8)}` : 'Address unavailable'}
            </div>
          </div>

          <div className="receive-action-grid">
            <button onClick={copyAddress} type="button" className="btn-ghost">{copied ? 'Copied' : 'Copy address'}</button>
            <button onClick={shareAddress} type="button" className="btn-ghost">Share</button>
          </div>

          <div style={{ maxWidth: 360, margin: '0 auto 14px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={setSuggestedAmount} type="button" style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Optional: set expected amount</button>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Amount ({coin})
                </label>
                <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(selectedCoin.minDeposit)} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Transaction Hash
                </label>
                <input className="input" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Paste blockchain tx hash" />
              </div>
              <button onClick={submitDeposit} disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                {loading ? 'Submitting...' : 'I sent crypto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
