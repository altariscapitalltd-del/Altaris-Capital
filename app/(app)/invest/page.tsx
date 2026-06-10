'use client'
import { useEffect, useRef, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'
import { AltarisLogoMark } from '@/components/AltarisLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

type Asset = {
  id: string; symbol: string; name: string; category: string
  image: string; price: number | null; change24h: number
  spark: number[]; dailyReturn: string; riskLevel: number; minInvestment: number
}

type Tier = { label: string; days: number; daily: number; min: number; badge?: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Crypto', 'Stocks', 'DeFi', 'Forex', 'Bonds', 'Commodities']

const FALLBACK: Asset[] = [
  { id: 'bitcoin',  symbol: 'BTC',  name: 'Bitcoin',       category: 'Crypto',      image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',   price: 67420,  change24h:  2.1,  spark: [63000,64200,65100,64800,66200,66800,67420], dailyReturn: '0.85', riskLevel: 4, minInvestment: 250 },
  { id: 'ethereum', symbol: 'ETH',  name: 'Ethereum',      category: 'Crypto',      image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', price: 3421,   change24h:  1.8,  spark: [3200,3280,3310,3290,3350,3400,3421], dailyReturn: '0.70', riskLevel: 4, minInvestment: 100 },
  { id: 'solana',   symbol: 'SOL',  name: 'Solana',        category: 'Crypto',      image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',  price: 148,    change24h:  3.2,  spark: [130,138,142,140,145,147,148], dailyReturn: '0.60', riskLevel: 4, minInvestment: 50 },
  { id: 'aapl',     symbol: 'AAPL', name: 'Apple Inc.',    category: 'Stocks',      image: 'https://logo.clearbit.com/apple.com',                             price: 189.5,  change24h:  0.8,  spark: [185,186,187,188,188.5,189,189.5], dailyReturn: '0.14', riskLevel: 2, minInvestment: 100 },
  { id: 'nvda',     symbol: 'NVDA', name: 'NVIDIA Corp.',  category: 'Stocks',      image: 'https://logo.clearbit.com/nvidia.com',                            price: 875,    change24h:  2.4,  spark: [840,850,860,855,865,870,875], dailyReturn: '0.18', riskLevel: 3, minInvestment: 100 },
  { id: 'gold',     symbol: 'XAU',  name: 'Gold',          category: 'Commodities', image: 'https://assets.coingecko.com/coins/images/32234/small/xaut.png',  price: 3320,   change24h:  0.48, spark: [3200,3240,3260,3280,3300,3310,3320], dailyReturn: '0.22', riskLevel: 2, minInvestment: 100 },
  { id: 'us-10y',   symbol: 'US10Y',name: 'US 10Y Treasury',category: 'Bonds',     image: '',                                                                price: 4.38,   change24h: -0.02, spark: [4.5,4.45,4.42,4.40,4.39,4.38,4.38], dailyReturn: '0.05', riskLevel: 1, minInvestment: 1000 },
  { id: 'forex-eur',symbol: 'USD/EUR',name: 'US Dollar / EUR',category: 'Forex',   image: 'https://flagcdn.com/w40/eu.png',                                  price: 0.918,  change24h:  0.0,  spark: [0.91,0.912,0.915,0.916,0.917,0.918,0.918], dailyReturn: '0.09', riskLevel: 2, minInvestment: 50 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTiers(asset: Asset): Tier[] {
  const base = parseFloat(asset.dailyReturn) || 0.5
  const min = asset.minInvestment || 100
  return [
    { label: 'Starter', days: 30,  daily: base,                         min },
    { label: 'Growth',  days: 90,  daily: +(base + 0.05).toFixed(2),    min: Math.max(min * 3, 500),  badge: 'Popular' },
    { label: 'Premium', days: 180, daily: +(base + 0.12).toFixed(2),    min: Math.max(min * 5, 1000), badge: 'Best' },
  ]
}

function fmtPrice(price: number | null, category: string): string {
  if (price === null) return '—'
  if (category === 'DeFi') return '$' + (price / 1e9).toFixed(2) + 'B TVL'
  if (price >= 1_000) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1)    return '$' + price.toFixed(2)
  return '$' + price.toFixed(5)
}

function calcAPY(daily: number): string {
  const apy = (Math.pow(1 + daily / 100, 365) - 1) * 100
  return apy >= 1000 ? (apy / 1000).toFixed(1) + 'K%' : apy.toFixed(0) + '%'
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, up, w = 72, h = 36 }: { data: number[]; up: boolean; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c || data.length < 2) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr)
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
    const xs = data.map((_, i) => (i / (data.length - 1)) * w)
    const ys = data.map(v => h - ((v - mn) / rng) * (h - 6) - 3)
    const col = up ? '#0ECB81' : '#F6465D'
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, col + '30'); g.addColorStop(1, col + '00')
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
    ctx.lineTo(xs[xs.length - 1], h); ctx.lineTo(xs[0], h); ctx.closePath()
    ctx.fillStyle = g; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke()
  }, [data, up, w, h])
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block' }} />
}

// ─── Asset logo with fallback ─────────────────────────────────────────────────

function Logo({ src, symbol, size = 32 }: { src: string; symbol: string; size?: number }) {
  const [err, setErr] = useState(false)
  const hue = (symbol?.charCodeAt(0) ?? 0) * 47 % 360
  const r = Math.round(size * 0.28)
  if (!err && src) {
    return (
      <img src={src} alt={symbol} onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: r, display: 'block' }} />
    )
  }
  const letter = (symbol?.[0] ?? '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: r, background: `hsl(${hue},55%,22%)`, border: `1px solid hsl(${hue},55%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: `hsl(${hue},80%,70%)`, flexShrink: 0 }}>
      {letter}
    </div>
  )
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkel() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-elevated)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: '45%', background: 'var(--bg-elevated)', borderRadius: 5, marginBottom: 8 }} />
          <div style={{ height: 10, width: '28%', background: 'var(--bg-elevated)', borderRadius: 4 }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: 14, width: 68, background: 'var(--bg-elevated)', borderRadius: 5, marginBottom: 8 }} />
          <div style={{ height: 10, width: 46, background: 'var(--bg-elevated)', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ height: 12, width: '38%', background: 'var(--bg-elevated)', borderRadius: 4 }} />
        <div style={{ height: 12, width: '20%', background: 'var(--bg-elevated)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onTap }: { asset: Asset; onTap: () => void }) {
  const up = asset.change24h >= 0
  const daily = parseFloat(asset.dailyReturn) || 0.5
  const apy = calcAPY(daily)

  return (
    <button onClick={onTap} className="pressable" style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
      {/* Row 1: logo + name + price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Logo src={asset.image} symbol={asset.symbol} size={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{asset.symbol}</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>{asset.category.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{fmtPrice(asset.price, asset.category)}</div>
          <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: up ? 'var(--success)' : 'var(--danger)' }}>
            {up ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Row 2: ROI + sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--brand-primary)', lineHeight: 1 }}>{daily}%</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>/ day</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {apy} APY · from ${asset.minInvestment.toLocaleString()}
          </div>
        </div>
        {asset.spark && asset.spark.length > 2
          ? <Sparkline data={asset.spark} up={up} w={72} h={34} />
          : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)' }}>Invest</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          )
        }
      </div>
    </button>
  )
}

// ─── Hot trending card (horizontal scroll) ────────────────────────────────────

function HotCard({ asset, onTap }: { asset: Asset; onTap: () => void }) {
  const up = asset.change24h >= 0
  const daily = parseFloat(asset.dailyReturn) || 0.5
  return (
    <button onClick={onTap} className="pressable" style={{ minWidth: 148, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo src={asset.image} symbol={asset.symbol} size={22} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--brand-primary)', lineHeight: 1 }}>{daily}%</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginTop: 1 }}>DAILY</div>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{asset.name}</div>
      <div style={{ fontSize: 11, color: up ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
        {up ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
      </div>
      {asset.spark && asset.spark.length > 2 && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={asset.spark} up={up} w={120} h={28} />
        </div>
      )}
    </button>
  )
}

// ─── Invest sheet ─────────────────────────────────────────────────────────────

function InvestSheet({ asset, open, onClose }: { asset: Asset | null; open: boolean; onClose: () => void }) {
  const [tierIdx, setTierIdx] = useState(0)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useBodyScrollLock(open)

  useEffect(() => {
    if (asset && open) {
      const t = getTiers(asset)
      setTierIdx(0); setAmount(String(t[0].min)); setMsg(null)
    }
  }, [asset, open])

  if (!asset) return null
  const tiers = getTiers(asset)
  const tier = tiers[tierIdx]
  const amt = parseFloat(amount) || 0
  const dailyProfit = amt * tier.daily / 100
  const totalProfit = dailyProfit * tier.days
  const maturity = new Date(Date.now() + tier.days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const up = asset.change24h >= 0

  async function submit() {
    if (!asset || !amount || amt < tier.min || loading) return
    const { id: assetId, name: assetName } = asset
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: `${assetId}-${tier.days}d`, planName: `${assetName} ${tier.label}`, amount: amt, dailyRoi: tier.daily / 100 }),
      })
      const data = await res.json()
      if (!res.ok) setMsg({ ok: false, text: data.error || 'Investment failed' })
      else { setMsg({ ok: true, text: `${tier.label} plan started! Profits begin after 24 hours.` }); setTimeout(onClose, 2200) }
    } catch { setMsg({ ok: false, text: 'Network error. Please try again.' }) }
    finally { setLoading(false) }
  }

  const presets = [tier.min, tier.min * 2, tier.min * 5, tier.min * 10]

  return typeof document === 'undefined' ? null : createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: open ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)', backdropFilter: open ? 'blur(6px)' : 'none', transition: 'background 0.25s, backdrop-filter 0.25s', pointerEvents: open ? 'auto' : 'none' }}
    >
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        transform: open ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        background: '#0e1420', borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        maxHeight: '92svh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.14)', margin: '0 auto 16px' }} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* Asset header */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Logo src={asset.image} symbol={asset.symbol} size={34} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{asset.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{fmtPrice(asset.price, asset.category)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--success)' : 'var(--danger)' }}>
                  {up ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Tier picker */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 12 }}>CHOOSE PLAN</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {tiers.map((t, i) => {
                const sel = tierIdx === i
                return (
                  <button key={t.label} onClick={() => { setTierIdx(i); setAmount(String(t.min)); setMsg(null) }}
                    style={{ position: 'relative', padding: '14px 8px', borderRadius: 14, border: sel ? '1.5px solid var(--brand-primary)' : '1px solid rgba(255,255,255,0.08)', background: sel ? 'rgba(242,186,14,0.07)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s' }}>
                    {t.badge && (
                      <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: t.badge === 'Best' ? 'var(--brand-primary)' : 'var(--success)', color: '#000', fontSize: 8, fontWeight: 900, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{t.badge.toUpperCase()}</div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: sel ? 'var(--brand-primary)' : 'rgba(255,255,255,0.5)', marginBottom: 5 }}>{t.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: sel ? 'var(--brand-primary)' : '#fff', lineHeight: 1 }}>{t.daily}%</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 700, letterSpacing: '0.06em' }}>DAILY</div>
                    <div style={{ fontSize: 10, color: sel ? 'rgba(242,186,14,0.65)' : 'rgba(255,255,255,0.3)', marginTop: 7, fontWeight: 600 }}>{t.days}d · {calcAPY(t.daily)} APY</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 10 }}>INVESTMENT AMOUNT</div>
            <div style={{ position: 'relative', marginBottom: 9 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>$</span>
              <input type="number" value={amount} min={tier.min} onChange={e => { setAmount(e.target.value); setMsg(null) }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '14px 14px 14px 34px', fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }} />
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {presets.map(v => (
                <button key={v} onClick={() => { setAmount(String(v)); setMsg(null) }}
                  style={{ flex: 1, padding: '7px 2px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: amt === v ? 'rgba(242,186,14,0.09)' : 'rgba(255,255,255,0.02)', color: amt === v ? 'var(--brand-primary)' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s' }}>
                  ${v >= 1000 ? (v / 1000) + 'k' : v}
                </button>
              ))}
            </div>
          </div>

          {/* Profit estimate */}
          {amt >= tier.min && (
            <div style={{ background: 'rgba(14,203,129,0.05)', border: '1px solid rgba(14,203,129,0.15)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(14,203,129,0.55)', letterSpacing: '0.1em', marginBottom: 12 }}>PROFIT ESTIMATE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
                <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Per day</div><div style={{ fontWeight: 800, fontSize: 16, color: 'var(--success)' }}>+${dailyProfit.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Total return</div><div style={{ fontWeight: 800, fontSize: 16, color: 'var(--success)' }}>+${totalProfit.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Matures</div><div style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{maturity}</div></div>
              </div>
            </div>
          )}
          {amt > 0 && amt < tier.min && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(246,70,93,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
              Minimum for {tier.label}: ${tier.min.toLocaleString()}
            </div>
          )}
          {msg && (
            <div style={{ padding: '12px 14px', borderRadius: 11, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.ok ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.ok ? 'var(--success)' : 'var(--danger)', border: `1px solid ${msg.ok ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)'}` }}>
              {msg.text}
            </div>
          )}
          <div style={{ height: 8 }} />
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0e1420', flexShrink: 0 }}>
          <button onClick={submit} disabled={loading || amt < tier.min} className="btn-primary"
            style={{ width: '100%', padding: 16, fontSize: 16, borderRadius: 14, opacity: (loading || amt < tier.min) ? 0.4 : 1 }}>
            {loading ? 'Processing…' : `Start ${tier.label} · $${(amt || tier.min).toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── My Plans tab ─────────────────────────────────────────────────────────────

function MyPlansTab({ onBrowse }: { onBrowse: () => void }) {
  const [investments, setInvestments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investments').then(r => r.json()).then(d => {
      setInvestments(d.investments ?? [])
      setSummary(d.summary)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      {[1,2,3].map(i => <CardSkel key={i} />)}
    </div>
  )

  if (investments.length === 0) return (
    <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border)' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Active Plans</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Choose an asset and start compounding</div>
      <button onClick={onBrowse} className="btn-primary" style={{ padding: '12px 28px' }}>Browse Plans</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {summary && (
        <div style={{ background: 'linear-gradient(160deg, rgba(242,186,14,0.12) 0%, rgba(14,20,32,0.98) 100%)', border: '1px solid rgba(242,186,14,0.16)', borderRadius: 22, padding: 18, marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(242,186,14,0.55)', letterSpacing: '0.12em', marginBottom: 8 }}>PORTFOLIO OVERVIEW</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
            ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 16 }}>Total value (capital + profit)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Invested',    val: `$${summary.totalInvested.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: null, accent: false },
              { label: 'Profit',      val: `+$${summary.totalProfit.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: null, accent: true },
              { label: 'Daily earn',  val: `+$${summary.dailyEarning.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: '/day', accent: true },
              { label: 'Active plans',val: String(summary.activeCount), sub: null, accent: false },
            ].map(({ label, val, sub, accent }) => (
              <div key={label} style={{ padding: 12, borderRadius: 14, background: accent ? 'rgba(14,203,129,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${accent ? 'rgba(14,203,129,0.14)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: accent ? 'var(--success)' : 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  {val}{sub && <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {investments.map((inv: any) => (
        <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{inv.planName}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                {(inv.dailyRoi * 100).toFixed(2)}% daily · {inv.totalDurationDays}d plan
              </div>
            </div>
            <span className={`badge badge-${inv.status === 'ACTIVE' ? 'warning' : inv.status === 'COMPLETED' ? 'success' : 'danger'}`}>
              {inv.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Invested</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div style={{ background: inv.hasStartedEarning ? 'rgba(14,203,129,0.07)' : 'rgba(242,186,14,0.07)', border: `1px solid ${inv.hasStartedEarning ? 'rgba(14,203,129,0.15)' : 'rgba(242,186,14,0.15)'}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Profit</div>
              {inv.hasStartedEarning
                ? <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--success)' }}>+${inv.profitEarned?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                : <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warning)' }}>Starts in {inv.hoursUntilProfit}h</div>
              }
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 5, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg, var(--brand-primary), ${inv.hasStartedEarning ? 'var(--success)' : 'var(--brand-primary)'})`, width: `${Math.min(100, inv.progressPct || 0)}%`, borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>{Math.round(inv.progressPct || 0)}% complete</span>
            <span>{inv.status === 'COMPLETED' ? 'Completed' : `${Math.ceil(inv.daysRemaining || 0)}d remaining`}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function InvestContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'market' | 'my'>((searchParams.get('tab') as any) || 'market')
  const [category, setCategory] = useState('All')
  const [assets, setAssets] = useState<Asset[]>(FALLBACK)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [selected, setSelected] = useState<Asset | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Load assets from API whenever category changes
  useEffect(() => {
    setLoadingAssets(true)
    fetch(`/api/markets/live?category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => {
        const list: Asset[] = d.assets ?? []
        if (list.length > 0) setAssets(list)
      })
      .catch(() => {})
      .finally(() => setLoadingAssets(false))
  }, [category])

  // Hot = top movers (>2% change)
  const hotAssets = useMemo(() => assets.filter(a => Math.abs(a.change24h) >= 2).slice(0, 8), [assets])

  const filtered = useMemo(() => {
    if (!search.trim()) return assets
    const q = search.toLowerCase()
    return assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.symbol.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    )
  }, [assets, search])

  function open(asset: Asset) { setSelected(asset); setSheetOpen(true) }
  function close() { setSheetOpen(false); setTimeout(() => setSelected(null), 300) }

  return (
    <div style={{ padding: '6px 16px 24px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <AltarisLogoMark size={24} />
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>Invest</h1>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Build wealth with expert plans</div>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 3, borderRadius: 11, border: '1px solid var(--border)', gap: 1 }}>
          {(['market', 'my'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', background: tab === t ? 'var(--bg-elevated)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}>
              {t === 'market' ? 'Market' : 'My Plans'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'market' ? (
        <>
          {/* Search */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="search" placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px 10px 34px', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Category chips */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14, marginBottom: 6 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => { setCategory(c); setSearch('') }}
                className={`chip${category === c ? ' active' : ''}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Trending row */}
          {category === 'All' && hotAssets.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>HOT TRENDING</div>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {hotAssets.map(a => <HotCard key={a.id} asset={a} onTap={() => open(a)} />)}
              </div>
            </div>
          )}

          {/* Asset list */}
          <div style={{ display: 'grid', gap: 10 }}>
            {loadingAssets && assets.length === 0
              ? Array.from({ length: 5 }).map((_, i) => <CardSkel key={i} />)
              : filtered.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>No assets found.</div>
                : filtered.map(a => <AssetCard key={a.id} asset={a} onTap={() => open(a)} />)
            }
          </div>
        </>
      ) : (
        <MyPlansTab onBrowse={() => setTab('market')} />
      )}

      {/* Invest sheet */}
      <InvestSheet asset={selected} open={sheetOpen} onClose={close} />
    </div>
  )
}

export default function InvestPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px 16px', display: 'grid', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <CardSkel key={i} />)}
      </div>
    }>
      <InvestContent />
    </Suspense>
  )
}
