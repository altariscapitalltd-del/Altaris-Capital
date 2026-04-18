'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const DEPOSIT_COINS = [
  { sym: 'BTC', name: 'Bitcoin', color: '#F7931A', minDeposit: 0.001 },
  { sym: 'ETH', name: 'Ethereum', color: '#627EEA', minDeposit: 0.01 },
  { sym: 'USDT', name: 'Tether', color: '#26A17B', minDeposit: 10 },
] as const

type WalletTab = 'none' | 'deposit' | 'withdraw' | 'reward'

function MiniTrend({ values }: { values: number[] }) {
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
    ctx.strokeStyle = '#F2BA0E'
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [values])

  return <canvas ref={canvasRef} style={{ width: 130, height: 52, display: 'block' }} />
}

export default function WalletPage() {
  const [tab, setTab] = useState<WalletTab>('none')
  const [depositMode, setDepositMode] = useState<'select' | 'crypto' | 'fiat'>('select')
  const [coin, setCoin] = useState<(typeof DEPOSIT_COINS)[number]['sym']>('USDT')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [investedTotal, setInvestedTotal] = useState(0)
  const [profitToday, setProfitToday] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refCode, setRefCode] = useState('')

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
        setProfitToday(active.reduce((sum: number, i: any) => sum + i.amount * (i.dailyRoi || 0), 0))

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
  const totalBalance = usdBalance + investedTotal

  const fiatProviders = useMemo(
    () => [
      { name: 'MoonPay', logo: 'https://www.google.com/s2/favicons?domain=moonpay.com&sz=64', url: process.env.NEXT_PUBLIC_MOONPAY_WIDGET_URL || 'https://buy.moonpay.com' },
      { name: 'Ramp', logo: 'https://www.google.com/s2/favicons?domain=ramp.network&sz=64', url: process.env.NEXT_PUBLIC_RAMP_WIDGET_URL || 'https://ramp.network/buy' },
      { name: 'Transak', logo: 'https://www.google.com/s2/favicons?domain=transak.com&sz=64', url: process.env.NEXT_PUBLIC_TRANSAK_WIDGET_URL || 'https://global.transak.com' },
      { name: 'Alchemy Pay', logo: 'https://www.google.com/s2/favicons?domain=alchemypay.org&sz=64', url: process.env.NEXT_PUBLIC_ALCHEMY_PAY_WIDGET_URL || 'https://ramp.alchemypay.org' },
      { name: 'Mercuryo', logo: 'https://www.google.com/s2/favicons?domain=mercuryo.io&sz=64', url: process.env.NEXT_PUBLIC_MERCURYO_WIDGET_URL || 'https://exchange.mercuryo.io' },
      { name: 'Onramper', logo: 'https://www.google.com/s2/favicons?domain=onramper.com&sz=64', url: process.env.NEXT_PUBLIC_ONRAMPER_WIDGET_URL || 'https://buy.onramper.com' },
    ],
    []
  )

  const trendData = useMemo(() => {
    const tx = transactions
      .slice()
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-24)

    if (tx.length === 0) {
      const base = totalBalance || 1
      return Array.from({ length: 24 }, (_, i) => Number((base * (0.96 + (i / 24) * 0.04)).toFixed(2)))
    }

    let running = Math.max(0, totalBalance)
    const result: number[] = []
    for (let i = tx.length - 1; i >= 0; i--) {
      const item = tx[i]
      const amount = Number(item.amount || 0)
      const isCredit = item.type === 'DEPOSIT' || item.type === 'ROI' || item.type === 'BONUS'
      const isDebit = item.type === 'WITHDRAWAL' || item.type === 'INVESTMENT'
      if (isCredit) running = Math.max(0, running - amount)
      if (isDebit) running = running + amount
      result.unshift(Number(running.toFixed(2)))
    }

    const padded = result.slice(-24)
    while (padded.length < 24) padded.unshift(padded[0] ?? totalBalance)
    return padded
  }, [transactions, totalBalance])

  const txSummary = useMemo(() => {
    // Never show ADJUSTMENT type to users — those are internal admin entries
    const visible = transactions.filter((t: any) => t.type !== 'ADJUSTMENT')
    return {
      totalCount: visible.length,
      pending: visible.filter((t: any) => t.status === 'PENDING').length,
      latest: visible.slice(0, 4),
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
    navigator.clipboard.writeText(activeAddress)
    setCopied(true)
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
    const text = `I'm using Altaris Capital — an investment platform that grows your wealth. Join with my referral link and get a $100 bonus when you start investing!\n${referralUrl}`
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
    <div style={{ padding: '6px 16px 22px' }}>
      <div style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Wallet</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Funds, providers, and recent activity</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
          TOTAL BALANCE
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-1.2px', lineHeight: 1 }}>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ marginTop: 8, color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
              +${profitToday.toFixed(2)} today
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
              Available ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <MiniTrend values={trendData} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <ActionButton
          active={tab === 'deposit'}
          onClick={() => {
            setTab('deposit')
            setDepositMode('select')
            setMsg(null)
          }}
          label="Deposit"
          color="var(--success)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>}
        />
        <ActionButton
          active={tab === 'withdraw'}
          onClick={() => {
            setTab('withdraw')
            setDepositMode('select')
            setMsg(null)
          }}
          label="Withdraw"
          color="var(--danger)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
        />
        <ActionButton
          active={false}
          onClick={() => (window.location.href = '/invest?tab=my')}
          label="Invested"
          color="var(--brand-primary)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>}
        />
        <ActionButton
          active={tab === 'reward'}
          onClick={() => {
            setTab('reward')
            setMsg(null)
          }}
          label="Rewards"
          color="var(--brand-primary)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/></svg>}
        />
      </div>

      {tab === 'deposit' && (
        <div style={{ marginBottom: 14 }}>
          {depositMode === 'select' && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Deposit with</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => setDepositMode('crypto')}
                  className="pressable"
                  style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Crypto
                </button>
                <button
                  onClick={() => setDepositMode('fiat')}
                  className="pressable"
                  style={{ textAlign: 'center', padding: 16, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Fiat
                </button>
              </div>
            </div>
          )}

          {depositMode === 'fiat' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Choose fiat provider</div>
                <button onClick={() => setDepositMode('select')} type="button" style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>Back</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {fiatProviders.map((provider) => (
                  <a
                    key={provider.name}
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pressable"
                    style={{ textDecoration: 'none', textAlign: 'left', padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <img src={provider.logo} alt={`${provider.name} logo`} width={18} height={18} style={{ borderRadius: 4, flexShrink: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    <span>{provider.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Recent activity</div>
          <Link href="/transactions" style={{ color: 'var(--brand-primary)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
        </div>

        {txSummary.latest.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No transactions yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {txSummary.latest.slice(0, 4).map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{t.type}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(t.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>${Number(t.amount || 0).toFixed(2)}</div>
                  <div style={{ color: t.status === 'SUCCESS' ? 'var(--success)' : t.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)', fontSize: 10, fontWeight: 700 }}>{t.status}</div>
                </div>
              </div>
            ))}
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              {txSummary.totalCount} total · {txSummary.pending} pending
            </div>
          </div>
        )}
      </div>


      {tab === 'withdraw' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(env(safe-area-inset-bottom) + 20px)' }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(env(safe-area-inset-bottom) + 80px)' }}>
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
              { n: '4', t: 'Both earn bonuses', d: 'You get $200 · They get $100 — instantly', c: '#F2BA0E' },
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
              {[{ icon: '🌱', label: 'Starter', n: '1 ref', bonus: '+$100' }, { icon: '⭐', label: 'Rising', n: '5 refs', bonus: '+$700' }, { icon: '👑', label: 'Elite', n: '20 refs', bonus: '+$3K' }, { icon: '💎', label: 'VIP', n: '50 refs', bonus: 'VIP' }].map(t => (
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: '#07090c', overflowY: 'auto', padding: 'calc(var(--app-header-height, 64px) + 14px) 16px calc(env(safe-area-inset-bottom) + 20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => setDepositMode('select')} type="button" style={{ border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Receive</div>
            <div style={{ width: 36 }} />
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

          <div style={{ textAlign: 'center', marginBottom: 14, background: '#fff', borderRadius: 20, padding: 14 }}>
            <div style={{ margin: '0 auto', width: '100%', maxWidth: 260, aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#fff' }}>
              {qrDataUrl ? <img src={qrDataUrl} alt={`${coin} QR`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#111', fontWeight: 700 }}>Generating QR...</div>}
              <div style={{ position: 'absolute', inset: '50% auto auto 50%', transform: 'translate(-50%, -50%)', width: 42, height: 42, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                <AltarisLogoMark size={24} />
              </div>
            </div>
            <div style={{ marginTop: 10, color: '#2B3139', fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all', fontWeight: 700 }}>
              {activeAddress || 'Address unavailable'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <button onClick={copyAddress} type="button" className="btn-ghost" style={{ width: '100%' }}>{copied ? 'Copied' : 'Copy'}</button>
            <button onClick={setSuggestedAmount} type="button" className="btn-ghost" style={{ width: '100%' }}>Set Amount</button>
            <button onClick={shareAddress} type="button" className="btn-ghost" style={{ width: '100%' }}>Share</button>
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
