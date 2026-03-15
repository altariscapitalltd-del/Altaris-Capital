'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import CoinIcon from '@/components/ui/CoinIcon'

const COINS = [
  { sym: 'BTC', name: 'Bitcoin', color: '#F7931A', minDeposit: 0.001 },
  { sym: 'ETH', name: 'Ethereum', color: '#627EEA', minDeposit: 0.01 },
  { sym: 'USDT', name: 'Tether', color: '#26A17B', minDeposit: 10 },
]

export default function WalletPage() {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [depositMode, setDepositMode] = useState<'select' | 'crypto' | 'fiat'>('select')
  const [coin, setCoin] = useState('USDT')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [investedTotal, setInvestedTotal] = useState(0)
  const [profitToday, setProfitToday] = useState(0)
  const [investments, setInvestments] = useState<any[]>([])
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  function loadProfile() {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        const bals: Record<string, number> = {}
        d.user?.balances?.forEach((b: any) => {
          bals[b.currency] = b.amount
        })
        setBalances(bals)
        const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
        setInvestments(active)
        setInvestedTotal(active.reduce((s: number, i: any) => s + i.amount, 0))
        setProfitToday(active.reduce((s: number, i: any) => s + i.amount * (i.dailyRoi || 0), 0))
      })
  }

  useEffect(() => {
    loadProfile()
    fetch('/api/wallet/addresses')
      .then((r) => r.json())
      .then((d) => {
        const addrs: Record<string, string> = {}
        d.addresses?.forEach((a: any) => {
          addrs[a.currency] = a.address
        })
        setWalletAddresses(addrs)
      })
  }, [])

  useEffect(() => {
    const handler = () => loadProfile()
    window.addEventListener('balance:refresh', handler)
    return () => window.removeEventListener('balance:refresh', handler)
  }, [])

  useEffect(() => {
    const addr = walletAddresses[coin]
    if (!addr) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(addr, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [coin, walletAddresses])

  async function submitDeposit() {
    if (!amount || !txHash) {
      setMsg({ type: 'error', text: 'Please fill all fields' })
      return
    }
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: coin, amount: parseFloat(amount), txHash }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: 'Deposit submitted! Pending admin approval.' })
      setAmount('')
      setTxHash('')
    } else setMsg({ type: 'error', text: data.error })
    setLoading(false)
  }

  async function submitWithdraw() {
    if (!amount || !withdrawAddress) {
      setMsg({ type: 'error', text: 'Please fill all fields' })
      return
    }
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: coin, amount: parseFloat(amount), walletAddress: withdrawAddress }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: 'Withdrawal requested! Processing...' })
      setAmount('')
      setWithdrawAddress('')
    } else setMsg({ type: 'error', text: data.error })
    setLoading(false)
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const usdBalance = balances['USD'] ?? 0
  const totalBalance = usdBalance + investedTotal
  const selectedCoin = COINS.find((c) => c.sym === coin)!

  const fiatWidgetUrl = process.env.NEXT_PUBLIC_MOONPAY_WIDGET_URL || 'https://buy.moonpay.com'

  const IconDeposit = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
  )
  const IconWithdraw = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  )
  const IconRewards = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/></svg>
  )
  const IconCrypto = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg>
  )
  const IconFiat = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
  )
  const IconExternal = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  )
  const IconWarning = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Wallet</h1>

        {/* Premium balance card — Bybit-style sharp, dark, clean */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 18,
            boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>Total Balance</div>
          <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', marginBottom: 20, color: '#fff' }}>
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Available</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Invested</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>${investedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Profit today</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>+${profitToday.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Crypto</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                {(balances['BTC'] || 0).toFixed(4)} BTC, {(balances['ETH'] || 0).toFixed(4)} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons: Deposit, Withdraw, Rewards — SVG icons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => { setTab('deposit'); setDepositMode('select'); setMsg(null) }}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: tab === 'deposit' ? 'rgba(14,203,129,0.12)' : '#111',
              color: tab === 'deposit' ? 'var(--success)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconDeposit /> Deposit
          </button>
          <button
            onClick={() => { setTab('withdraw'); setDepositMode('select'); setMsg(null) }}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: tab === 'withdraw' ? 'rgba(246,70,93,0.12)' : '#111',
              color: tab === 'withdraw' ? 'var(--danger)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconWithdraw /> Withdraw
          </button>
          <Link
            href="/home"
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#111',
              color: 'var(--brand-primary)',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconRewards /> Rewards
          </Link>
        </div>
      </div>

      {tab === 'deposit' && (
        <div style={{ padding: '0 16px' }}>
          {depositMode === 'select' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Deposit with</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => setDepositMode('crypto')}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: '2px solid rgba(255,255,255,0.08)',
                    background: '#111',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  className="pressable"
                >
                  <IconCrypto /> Crypto
                </button>
                <a
                  href={fiatWidgetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: '2px solid rgba(255,255,255,0.08)',
                    background: '#111',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                  }}
                  className="pressable"
                >
                  <IconFiat /> Fiat
                </a>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 10 }}>Fiat opens Moonpay in your browser to buy crypto.</p>
            </div>
          )}

          {depositMode === 'crypto' && (
            <>
              <button
                onClick={() => setDepositMode('select')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}
              >
                ← Back
              </button>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Select coin</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COINS.map((c) => (
                    <button
                      key={c.sym}
                      onClick={() => {
                        setCoin(c.sym)
                        setMsg(null)
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 11,
                        border: `2px solid ${coin === c.sym ? c.color : 'var(--border)'}`,
                        background: coin === c.sym ? c.color + '15' : 'var(--bg-card)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all .15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <CoinIcon symbol={c.sym} bg={c.color} size={18} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: coin === c.sym ? c.color : 'var(--text-secondary)' }}>{c.sym}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 14, textAlign: 'center' }}>
                {qrDataUrl && walletAddresses[coin] ? (
                  <div style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 12, marginBottom: 12 }}>
                    <img src={qrDataUrl} alt="QR Code" width={200} height={200} style={{ display: 'block', borderRadius: 6 }} />
                  </div>
                ) : (
                  <div style={{ width: 200, height: 200, margin: '0 auto 12px', background: 'var(--bg-elevated)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    {walletAddresses[coin] ? 'Generating QR…' : `No ${coin} address`}
                  </div>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Scan to get {coin} deposit address</p>
                {walletAddresses[coin] ? (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                    <code style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>{walletAddresses[coin]}</code>
                    <button
                      onClick={() => copy(walletAddresses[coin])}
                      style={{
                        flexShrink: 0,
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: copied ? 'var(--success-bg)' : 'var(--bg-card)',
                        color: copied ? 'var(--success)' : 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all .15s',
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No {coin} address configured yet</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Amount Sent ({coin})</label>
                  <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min: ${selectedCoin.minDeposit} ${coin}`} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Transaction Hash / TXID</label>
                  <input className="input" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
              </div>

              {msg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 9,
                    marginBottom: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {msg.text}
                </div>
              )}

              <button onClick={submitDeposit} disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                {loading ? 'Submitting...' : 'Confirm Deposit'}
              </button>

              <div style={{ marginTop: 14, padding: 14, background: 'rgba(242,186,14,0.06)', borderRadius: 12, border: '1px solid rgba(242,186,14,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--brand-primary)', flexShrink: 0, marginTop: 1 }}><IconWarning /></span>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                  Only send <strong>{coin}</strong> to this address. Deposits are credited after admin confirmation (1–24 hours).
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'withdraw' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Select coin</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {COINS.map((c) => (
                <button
                  key={c.sym}
                  onClick={() => {
                    setCoin(c.sym)
                    setMsg(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 11,
                    border: `2px solid ${coin === c.sym ? c.color : 'var(--border)'}`,
                    background: coin === c.sym ? c.color + '15' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all .15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <CoinIcon symbol={c.sym} bg={c.color} size={18} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: coin === c.sym ? c.color : 'var(--text-secondary)' }}>{c.sym}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Available Balance</div>
            <div style={{ fontWeight: 900, fontSize: 28 }}>
              {(balances[coin] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{coin}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Your {coin} Wallet Address</label>
              <input className="input" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder="Enter destination address" style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Amount ({coin})</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ paddingRight: 60 }} />
                <button
                  onClick={() => setAmount(String(balances[coin] || 0))}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(242,186,14,0.1)',
                    color: 'var(--brand-primary)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {msg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 9,
                marginBottom: 12,
                fontSize: 13,
                fontWeight: 600,
                background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {msg.text}
            </div>
          )}

          <button onClick={submitWithdraw} disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </button>

          <div style={{ marginTop: 14, padding: 14, background: 'rgba(246,70,93,0.06)', borderRadius: 12, border: '1px solid rgba(246,70,93,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}><IconWarning /></span>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.7, margin: 0 }}>KYC verification required for withdrawals. Processing time: 1–3 business days.</p>
          </div>
        </div>
      )}

      {/* Active investments — below deposit/withdraw flows */}
      {investments.length > 0 && (
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Active investments</h2>
            <Link href="/invest" style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}>View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {investments.map((inv, idx) => {
                const start = new Date(inv.startDate).getTime()
                const end = new Date(inv.endDate).getTime()
                const prog = Math.min(100, ((Date.now() - start) / (end - start)) * 100)
                const dailyEarn = inv.amount * (inv.dailyRoi || 0)
                const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86400000))
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    style={{
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{inv.planName || inv.planId}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--success)' }}>+${dailyEarn.toFixed(2)}/day</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>${inv.amount.toLocaleString()} invested</span>
                      <span>{daysLeft}d left</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: prog + '%' }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        style={{ height: '100%', background: 'var(--brand-primary)', borderRadius: 2 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
