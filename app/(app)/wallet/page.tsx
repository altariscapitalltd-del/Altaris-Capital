'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
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
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        const bals: Record<string, number> = {}
        d.user?.balances?.forEach((b: any) => {
          bals[b.currency] = b.amount
        })
        setBalances(bals)
        const active = d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []
        setInvestedTotal(active.reduce((s: number, i: any) => s + i.amount, 0))
        setProfitToday(active.reduce((s: number, i: any) => s + i.amount * (i.dailyRoi || 0), 0))
      })
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

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Wallet</h1>

        {/* Single summary card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Total Balance</div>
          <div style={{ fontWeight: 900, fontSize: 28, marginBottom: 14 }}>
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Available</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Invested</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>${investedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Profit today</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--success)' }}>+${profitToday.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Crypto</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {(balances['BTC'] || 0).toFixed(4)} BTC, {(balances['ETH'] || 0).toFixed(4)} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons: Deposit, Withdraw, Rewards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => {
              setTab('deposit')
              setDepositMode('select')
              setMsg(null)
            }}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: tab === 'deposit' ? 'rgba(14,203,129,0.1)' : 'var(--bg-card)',
              color: tab === 'deposit' ? 'var(--success)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>⬇</span> Deposit
          </button>
          <button
            onClick={() => {
              setTab('withdraw')
              setDepositMode('select')
              setMsg(null)
            }}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: tab === 'withdraw' ? 'rgba(246,70,93,0.1)' : 'var(--bg-card)',
              color: tab === 'withdraw' ? 'var(--danger)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>⬆</span> Withdraw
          </button>
          <Link
            href="/home"
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--brand-primary)',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>🎁</span> Rewards
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
                    border: '2px solid var(--border)',
                    background: 'var(--bg-card)',
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
                  <span style={{ fontSize: 24 }}>₿</span> Crypto
                </button>
                <button
                  onClick={() => setDepositMode('fiat')}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: '2px solid var(--border)',
                    background: 'var(--bg-card)',
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
                  <span style={{ fontSize: 24 }}>$</span> Fiat
                </button>
              </div>
            </div>
          )}

          {depositMode === 'fiat' && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setDepositMode('select')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}
              >
                ← Back
              </button>
              {fiatWidgetUrl ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', minHeight: 500 }}>
                  <iframe
                    src={fiatWidgetUrl}
                    title="Buy crypto"
                    style={{ width: '100%', height: 520, border: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Fiat onboarding is available via our partner. Use crypto deposit for now, or contact support.</p>
                  <button onClick={() => setDepositMode('crypto')} className="btn-primary" style={{ marginTop: 14 }}>
                    Deposit with Crypto
                  </button>
                </div>
              )}
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

              <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.7 }}>
                  ⚠️ Only send <strong>{coin}</strong> to this address. Deposits are credited after admin confirmation (1–24 hours).
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

          <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid rgba(246,70,93,0.15)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.7 }}>⚠️ KYC verification required for withdrawals. Processing time: 1–3 business days.</p>
          </div>
        </div>
      )}
    </div>
  )
}
