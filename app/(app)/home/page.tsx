'use client'
import { useEffect, useState, useRef, useCallback, useMemo, memo, startTransition } from 'react'
import Link from 'next/link'
import { Download, Upload, TrendingUp, History, UserCheck } from 'lucide-react'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import * as HomeSections from '@/components/home/HomeSections'
import { TradingViewTicker, FearGreedGauge, MarketStats, TrendingCoins, DeFiTVL, CryptoNews } from '@/components/widgets'

// ─── Shared mobile hook ───────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const upd = () => setMobile(mq.matches)
    upd()
    mq.addEventListener?.('change', upd)
    return () => mq.removeEventListener?.('change', upd)
  }, [])
  return mobile
}

// ─── Deferred render hook ─────────────────────────────────────────────────
function useIdleReady(delay = 0) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ('requestIdleCallback' in window)
        (window as any).requestIdleCallback(() => setReady(true), { timeout: 1500 })
      else
        requestAnimationFrame(() => setReady(true))
    }, delay)
    return () => clearTimeout(t)
  }, [delay])
  return ready
}

// ─── Sparkline (canvas) ───────────────────────────────────────────────────
const Sparkline = memo(
  function Sparkline({ data, color, width = 64, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
    const ref = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
      const c = ref.current; if (!c) return
      const ctx = c.getContext('2d'); if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      c.width = width * dpr; c.height = height * dpr; ctx.scale(dpr, dpr)
      const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
      const xs = data.map((_, i) => (i / (data.length - 1)) * width)
      const ys = data.map(v => height - ((v - min) / range) * (height - 4) - 2)
      ctx.clearRect(0, 0, width, height)
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, color + '30'); grad.addColorStop(1, color + '00')
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
      ctx.lineTo(xs[xs.length - 1], height); ctx.lineTo(xs[0], height)
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
    }, [data, color, width, height])
    return <canvas ref={ref} style={{ width, height, display: 'block' }} />
  },
  (p, n) => p.data === n.data && p.color === n.color
)

// ─── Portfolio chart (canvas + touch scrub, Coinbase-style) ──────────────
const PortfolioChart = memo(
  function PortfolioChart({ data, times, color = '#C9A227', height = 110 }: { data: number[]; times: number[]; color?: string; height?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef(0)
    const [scrub, setScrub] = useState<{ pct: number; value: number; label: string } | null>(null)
    const liveRef = useRef({ data, times })
    liveRef.current = { data, times }

    useEffect(() => {
      const c = canvasRef.current; if (!c) return
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ctx = c.getContext('2d')!; if (!ctx) return
      const width = wrapRef.current?.clientWidth || 340
      const dpr = window.devicePixelRatio || 1
      c.width = width * dpr; c.height = height * dpr; ctx.scale(dpr, dpr)

      const values = data.length > 1 ? data : [0, 1]
      const minV = Math.min(...values), maxV = Math.max(...values)
      const pad = Math.max((maxV - minV) * 0.18, maxV * 0.004, 0.01)
      const lo = minV - pad, range = (maxV + pad) - lo || 1
      const L = 2, R = width - 2, T = 12, B = height - 10
      const xs = values.map((_, i) => L + (i / Math.max(values.length - 1, 1)) * (R - L))
      const ys = values.map(v => B - ((v - lo) / range) * (B - T))

      cancelAnimationFrame(rafRef.current)
      let frame = 0
      const TOTAL = 48

      function draw(prog: number) {
        ctx.clearRect(0, 0, width, height)
        // subtle grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
        ;[0.33, 0.67].forEach(r => { const y = T + (B - T) * r; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke() })

        const n = values.length
        const ei = Math.min(n - 1, Math.floor(prog * (n - 1)))
        const ef = prog * (n - 1) - ei
        const curX = ei < n - 1 ? xs[ei] + (xs[ei+1] - xs[ei]) * ef : xs[n-1]
        const curY = ei < n - 1 ? ys[ei] + (ys[ei+1] - ys[ei]) * ef : ys[n-1]

        // fill path
        const grd = ctx.createLinearGradient(0, T, 0, B)
        grd.addColorStop(0, color + '60'); grd.addColorStop(0.55, color + '18'); grd.addColorStop(1, color + '00')
        ctx.save(); ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
        for (let i = 1; i <= ei; i++) { const m = (xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i]) }
        if (ei < n-1) ctx.lineTo(curX, curY)
        ctx.lineTo(curX, B); ctx.lineTo(xs[0], B); ctx.closePath()
        ctx.fillStyle = grd; ctx.fill(); ctx.restore()

        // line stroke
        ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
        for (let i = 1; i <= ei; i++) { const m = (xs[i-1]+xs[i])/2; ctx.bezierCurveTo(m,ys[i-1],m,ys[i],xs[i],ys[i]) }
        if (ei < n-1) ctx.lineTo(curX, curY)
        ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()

        // terminal dot
        if (prog >= 0.98) {
          ctx.fillStyle = '#06070A'; ctx.beginPath(); ctx.arc(curX, curY, 5.5, 0, Math.PI*2); ctx.fill()
          ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(curX, curY, 4, 0, Math.PI*2); ctx.stroke()
        }
      }

      function tick() { frame++; const p = Math.min(1, frame / TOTAL); draw(p); if (p < 1) rafRef.current = requestAnimationFrame(tick) }
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }, [data, color, height])

    function onPtr(e: React.PointerEvent) {
      const rect = wrapRef.current?.getBoundingClientRect(); if (!rect) return
      const { data: d, times: ts } = liveRef.current; if (d.length < 2) return
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const idx = Math.round(pct * (d.length - 1))
      const t = ts[idx]; const v = d[idx]
      const label = t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
      setScrub({ pct, value: v, label })
    }

    return (
      <div ref={wrapRef} style={{ width: '100%', position: 'relative', touchAction: 'pan-y' }}
        onPointerMove={onPtr} onPointerDown={onPtr} onPointerLeave={() => setScrub(null)}>
        <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
        {scrub && (
          <>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scrub.pct * 100}%`, width: 1, background: color + '45', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(6,7,10,0.92)', border: `1px solid ${color}35`, borderRadius: 9, padding: '5px 12px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>${scrub.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {scrub.label && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', textAlign: 'center' }}>{scrub.label}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    )
  },
  (p, n) => p.data === n.data && p.times === n.times && p.color === n.color
)

// ─── Build balance history ────────────────────────────────────────────────
function useBalanceHistory(latest: number, transactions: any[]) {
  return useMemo(() => {
    const ordered = transactions.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-40)
    if (ordered.length === 0) {
      const base = latest || 1000
      const times = Array.from({ length: 32 }, (_, i) => Date.now() - (31 - i) * 60_000)
      const values = times.map((_, i) => {
        const t = i / 31
        return Number((base * (1 + Math.sin(t * Math.PI * 2.6) * 0.018 + (t - 0.5) * 0.045)).toFixed(2))
      })
      return { times, values }
    }
    let running = latest || 0
    const values: number[] = [], times: number[] = []
    for (let i = ordered.length - 1; i >= 0; i--) {
      const item = ordered[i], amount = Number(item.amount || 0)
      if (['DEPOSIT','PROFIT','ROI','BONUS','REFERRAL_BONUS','REFERRAL'].includes(item.type)) running = Math.max(0, running - amount)
      if (['WITHDRAWAL','INVESTMENT'].includes(item.type)) running += amount
      values.unshift(Number(running.toFixed(2))); times.unshift(new Date(item.createdAt).getTime())
    }
    values.push(Number((latest || 0).toFixed(2))); times.push(Date.now())
    while (values.length < 32) { values.unshift(values[0] ?? 0); times.unshift((times[0] || Date.now()) - 60_000) }
    return { times: times.slice(-40), values: values.slice(-40) }
  }, [latest, transactions])
}

// ─── Balance chart ────────────────────────────────────────────────────────
const BalanceChart = memo(function BalanceChart({ usdBalance, transactions }: { usdBalance: number; transactions: any[] }) {
  const [range, setRange] = useState<'24H' | '7D' | '30D' | 'All'>('24H')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try { if (localStorage.getItem('altaris_hide_chart') === '1') setVisible(false) } catch {}
  }, [])

  const toggleVisible = useCallback(() => {
    setVisible(v => { try { localStorage.setItem('altaris_hide_chart', v ? '1' : '0') } catch {}; return !v })
  }, [])

  // FIX: filteredTransactions is memoized — not recalculated on every render
  const filteredTransactions = useMemo(() => {
    if (range === 'All') return transactions
    const ms = range === '24H' ? 86_400_000 : range === '7D' ? 604_800_000 : 2_592_000_000
    return transactions.filter(tx => Date.now() - new Date(tx.createdAt).getTime() <= ms)
  }, [range, transactions])

  const history = useBalanceHistory(usdBalance, filteredTransactions)
  const pnl = useMemo(() => history.values.length < 2 ? 0 : history.values[history.values.length - 1] - history.values[0], [history.values])

  if (!visible) return (
    <div onClick={toggleVisible} style={{ margin: '18px 16px 0', padding: '10px 12px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
      Tap to show portfolio chart
    </div>
  )

  return (
    <section style={{ margin: '14px 16px 0' }}>
      <div className="portfolio-range-tabs compact" style={{ marginBottom: 6 }}>
        {(['24H', '7D', '30D', 'All'] as const).map(item => (
          <button key={item} type="button" onClick={() => setRange(item)} className={range === item ? 'active' : ''}>{item === 'All' ? 'All-time' : item}</button>
        ))}
      </div>
      <div onClick={toggleVisible} style={{ cursor: 'pointer', overflow: 'hidden' }}>
        <PortfolioChart data={history.values} times={history.times} color={pnl >= 0 ? '#0ECB81' : '#F6465D'} />
      </div>
    </section>
  )
})

// ─── Countdown — desktop only ─────────────────────────────────────────────
const Countdown = memo(function Countdown({ endsAt }: { endsAt: Date }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    function calc() {
      const diff = Math.max(0, endsAt.getTime() - Date.now())
      setTime({ d: Math.floor(diff / 86_400_000), h: Math.floor(diff / 3_600_000) % 24, m: Math.floor(diff / 60_000) % 60, s: Math.floor(diff / 1000) % 60 })
    }
    calc(); const t = setInterval(calc, 1000); return () => clearInterval(t)
  }, [endsAt])
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[{ v: time.d, l: 'D' }, { v: time.h, l: 'H' }, { v: time.m, l: 'M' }, { v: time.s, l: 'S' }].map(({ v, l }) => (
        <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'center' }}>{String(v).padStart(2, '0')}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 600 }}>{l}</span>
        </div>
      ))}
    </div>
  )
})

// ─── Stable hash to avoid coin re-renders when data didn't change ─────────
function hashCoins(coins: any[]) {
  return coins.map(c => `${c.sym}:${c.price.toFixed(2)}:${c.change.toFixed(2)}`).join('|')
}

type LiveCoin = { sym: string; name: string; price: number; change: number; spark: number[] }
const FEATURED_PLAN = { name: 'DeFi Accelerator', roi: '3.5%', spots: 3, endsAt: new Date(Date.now() + 2 * 86_400_000 + 14 * 3_600_000) }

const FIAT_RATES: Record<string, number> = {
  USD:1, EUR:0.92, GBP:0.79, JPY:157, CNY:7.25, CAD:1.37, AUD:1.52, CHF:0.9,
  SGD:1.35, HKD:7.82, NZD:1.63, SEK:10.5, NOK:10.6, DKK:6.88, INR:83.5,
  AED:3.67, SAR:3.75, NGN:1550, BRL:5.1, MXN:17.2, ZAR:18.5, KRW:1350,
  TRY:32.5, IDR:16200, PHP:58, THB:36, VND:25000,
}
const FIAT_SYMBOLS: Record<string, string> = {
  USD:'$', EUR:'€', GBP:'£', JPY:'¥', CNY:'¥', CAD:'$', AUD:'$', CHF:'Fr',
  SGD:'$', HKD:'$', NZD:'$', SEK:'kr', NOK:'kr', DKK:'kr', INR:'₹',
  AED:'د.إ', SAR:'﷼', NGN:'₦', BRL:'R$', MXN:'$', ZAR:'R', KRW:'₩',
  TRY:'₺', IDR:'Rp', PHP:'₱', THB:'฿', VND:'₫',
}

// ─────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [coins, setCoins] = useState<LiveCoin[]>([])
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [bonusDone, setBonusDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedFiat, setSelectedFiat] = useState<string>(() => {
    if (typeof window === 'undefined') return 'USD'
    return localStorage.getItem('altaris:fiat') || 'USD'
  })
  const coinsHashRef = useRef('')
  const isMobile = useIsMobile()
  // FIX: mobile waits longer, prevents paint jank on first load
  const sectionsReady = useIdleReady(isMobile ? 600 : 100)

  // Seed from localStorage so first paint has both balances AND prices — no flash
  useEffect(() => {
    try {
      const cached = localStorage.getItem('altaris_user_cache')
      if (cached) { setUser(JSON.parse(cached)); setLoading(false) }
      const cachedCoins = localStorage.getItem('altaris_coins_cache')
      if (cachedCoins) setCoins(JSON.parse(cachedCoins))
    } catch {}
  }, [])

  const parseCoins = useCallback((d: any): LiveCoin[] => {
    return (d.list || [])
      .filter((c: any) => c?.symbol && Array.isArray(c.spark) && c.spark.length > 1)
      .map((c: any) => ({
        sym: String(c.symbol).toUpperCase(),
        name: c.name || String(c.symbol).toUpperCase(),
        price: Number(c.price || 0),
        change: Number(c.change24h || 0),
        spark: c.spark.slice(-24), // FIX: only last 24 points
      }))
      .sort((a: LiveCoin, b: LiveCoin) => Math.abs(b.change) - Math.abs(a.change))
  }, [])

  const fetchCoins = useCallback(() => {
    // Fetch 100 coins so the price map covers all holdings for accurate balance calc
    return fetch('/api/markets/list?per_page=100')
      .then(r => r.json())
      .then(d => {
        const next = parseCoins(d)
        const hash = hashCoins(next)
        // FIX: skip state update if data is unchanged — no re-render, no sparkline redraw
        if (hash !== coinsHashRef.current) {
          coinsHashRef.current = hash
          startTransition(() => {
            setCoins(next)
            try {
              localStorage.setItem('altaris_coins_cache', JSON.stringify(next))
              // Share price map for consistent balance display across pages
              const priceCache: Record<string, number> = { USD: 1, USDT: 1, USDC: 1 }
              next.forEach((c: any) => { priceCache[c.sym] = c.price })
              localStorage.setItem('altaris_price_cache', JSON.stringify({ prices: priceCache, ts: Date.now() }))
            } catch {}
          })
        }
      })
      .catch(() => {})
  }, [parseCoins])

  const load = useCallback(() => {
    setLoading(true)
    // FIX: parallel fetch with Promise.all — one render instead of two
    Promise.all([
      fetch('/api/user/profile').then(r => r.json()).catch(() => null),
      fetch('/api/transactions?page=1').then(r => r.json()).catch(() => null),
    ]).then(([profileData, txData]) => {
      if (profileData?.user) setUser(profileData.user)
      if (txData?.transactions) setTransactions(txData.transactions)
      setLoading(false)
    })
    fetchCoins()
  }, [fetchCoins])

  useEffect(() => {
    load()

    // FIX: pause polling when tab/screen is hidden — stops wasting resources
    let pollTimer: ReturnType<typeof setInterval>
    const startPoll = () => { pollTimer = setInterval(() => { if (!document.hidden) fetchCoins() }, 90_000) }
    const onVisible = () => {
      clearInterval(pollTimer)
      if (document.hidden) return
      fetchCoins()
      startPoll()
    }
    startPoll()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('balance:refresh', load)
    return () => {
      clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('balance:refresh', load)
    }
  }, [load, fetchCoins])

  async function claimBonus() {
    const res = await fetch('/api/user/claim-bonus', { method: 'POST' })
    if (res.ok) { setBonusDone(true); load() }
  }

  const priceMap = useMemo(() => Object.fromEntries(coins.map(c => [c.sym, c.price])), [coins])
  const balanceList: any[] = user?.balances || []

  const usdBal = useMemo(() => balanceList.reduce((sum, b) => {
    const cur = String(b.currency || '').toUpperCase()
    const amt = Number(b.amount || 0)
    if (cur === 'USD' || cur === 'USDT' || cur === 'USDC') return sum + amt
    return sum + amt * Number(priceMap[cur] || 0)
  }, 0), [balanceList, priceMap])

  const activeInvestments = useMemo(() => user?.investments?.filter((i: any) => i.status === 'ACTIVE') || [], [user?.investments])

  const cryptoPL = useMemo(() => balanceList.reduce((sum, b) => {
    const cur = String(b.currency || '').toUpperCase()
    if (cur === 'USD') return sum
    const coin = coins.find(c => c.sym === cur)
    const price = cur === 'USDT' ? 1 : Number(coin?.price || 0)
    const change = Number(coin?.change || 0)
    const prev = price && change !== -100 ? price / (1 + change / 100) : price
    return sum + Number(b.amount || 0) * (price - prev)
  }, 0), [balanceList, coins])

  const canClaimBonus = !user?.bonusClaimed && !bonusDone

  if (loading && !user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(242,186,14,0.18)', borderTopColor: '#C9A227', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  const firstName = (user?.name || '').trim().split(' ')[0]
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()

  return (
    <div style={{ padding: '4px 0 16px' }}>

      {/* ── Personalized greeting ── */}
      <div style={{ margin: '6px 16px 2px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--text-muted)' }}>{greeting}</div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 3, color: 'var(--text-primary)' }}>
            {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
          </div>
        </div>
      </div>

      {/* ── Portfolio Balance — private-bank statement ── */}
      <section className="statement-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="eyebrow gold">Total Portfolio</span>
          <button onClick={() => setBalanceHidden(h => !h)} aria-label={balanceHidden ? 'Show balance' : 'Hide balance'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1, display: 'flex' }}>
            {balanceHidden
              ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" /></svg>
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            }
          </button>
        </div>
        {(() => {
          const fiatRate = FIAT_RATES[selectedFiat] || 1
          const fiatSymbol = FIAT_SYMBOLS[selectedFiat] || '$'
          const converted = usdBal * fiatRate
          const displayStr = balanceHidden ? '••••••' : `${fiatSymbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          const overrideFontSize = displayStr.length > 17 ? 22 : displayStr.length > 13 ? 32 : undefined
          return (
            <div className="statement-value notranslate" translate="no" style={overrideFontSize ? { fontSize: overrideFontSize } : undefined}>
              {balanceHidden ? '••••••' : (() => {
                const [whole, cents] = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.')
                return <>{fiatSymbol}{whole}<span className="cents">.{cents}</span></>
              })()}
            </div>
          )
        })()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span className="num notranslate" translate="no" style={{ color: cryptoPL >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
            {balanceHidden ? '••••' : `${cryptoPL >= 0 ? '+' : '−'}$${Math.abs(cryptoPL).toFixed(2)} today`}
          </span>
          {cryptoPL !== 0 && <span className="eyebrow" style={{ color: 'var(--gold)', fontSize: 9 }}>● Live</span>}
        </div>
        {/* Statement actions */}
        <div className="statement-actions">
          {[
            { l: 'Deposit', Icon: Download, href: '/wallet?action=deposit' },
            { l: 'Withdraw', Icon: Upload, href: '/wallet?action=withdraw' },
            { l: 'Invest', Icon: TrendingUp, href: '/invest' },
            { l: 'History', Icon: History, href: '/transactions' },
          ].map(({ l, Icon, href }) => (
            <Link key={l} href={href} className="statement-action pressable">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: 'var(--gold)' }}><Icon size={19} strokeWidth={1.8} /></div>
              <div className="lbl">{l}</div>
            </Link>
          ))}
        </div>
      </section>

      {sectionsReady && <BalanceChart usdBalance={usdBal} transactions={transactions} />}

      {/* ── Widgets Row ── */}
      {sectionsReady && (
        <div style={{ margin: '14px 16px 0' }}>
          <TradingViewTicker />
        </div>
      )}

      {sectionsReady && (
        <div style={{ margin: '14px 16px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          <FearGreedGauge />
          <MarketStats />
        </div>
      )}

      {sectionsReady && (
        <div style={{ margin: '14px 16px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          <TrendingCoins />
          <DeFiTVL />
        </div>
      )}

      {sectionsReady && (
        <div style={{ margin: '14px 16px 0' }}>
          <CryptoNews />
        </div>
      )}

      <HomeSections.PromoBanner user={user} canClaimBonus={canClaimBonus} claimBonus={claimBonus} />
      <HomeSections.BybitSection coins={coins} ready={sectionsReady} />

      {/* ── Limited Offer with Countdown — desktop only ── */}
      {!isMobile && sectionsReady && (
        <div style={{ margin: '18px 16px 0' }}>
          <div style={{ background: 'linear-gradient(135deg,#0D0D0D,#141414)', border: '1px solid rgba(246,70,93,0.2)', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F6465D', animation: 'pulseLive 1.5s infinite' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>LIMITED OFFER</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{FEATURED_PLAN.name}</div>
                <div style={{ color: '#F6465D', fontWeight: 800, fontSize: 22, marginTop: 2 }}>{FEATURED_PLAN.roi} <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>daily return</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 5 }}>Ends in</div>
                <Countdown endsAt={FEATURED_PLAN.endsAt} />
                <div style={{ background: 'rgba(246,70,93,0.1)', color: '#F6465D', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, marginTop: 6 }}>{FEATURED_PLAN.spots} spots left</div>
              </div>
            </div>
            <Link href="/invest" style={{ display: 'block', padding: '11px', background: '#F6465D', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center' }} className="pressable">Invest Now →</Link>
          </div>
        </div>
      )}

      {/* ── Active Plans ── */}
      {sectionsReady && activeInvestments.length > 0 && (
        <div style={{ margin: '22px 0 0' }}>
          <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="font-display" style={{ fontWeight: 600, fontSize: 19 }}>Active Plans</span>
            <Link href="/invest?tab=my" style={{ color: 'var(--brand-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }} className="no-scrollbar">
            {activeInvestments.slice(0, 5).map((inv: any) => {
              const prog = Math.min(100, ((Date.now() - new Date(inv.startDate).getTime()) / (new Date(inv.endDate).getTime() - new Date(inv.startDate).getTime())) * 100)
              return (
                <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, flexShrink: 0, width: 148 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>{inv.planName}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 1 }}>${inv.amount.toLocaleString()}</div>
                  <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>+${(inv.amount * inv.dailyRoi).toFixed(2)}/day</div>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#C9A227', width: `${prog}%`, borderRadius: 3 }} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>{Math.round(prog)}% complete</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Market Prices grid ── */}
      {sectionsReady && coins.length > 0 && (
        <div style={{ margin: '22px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="font-display" style={{ fontWeight: 600, fontSize: 19 }}>Markets</span>
            <Link href="/markets" style={{ color: 'var(--brand-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {coins.slice(0, 4).map(coin => (
              <Link key={coin.sym} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }} className="pressable">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{coin.sym}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 1 }}>{coin.name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)', background: coin.change >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '2px 7px', borderRadius: 99 }}>
                      {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                    ${coin.price.toLocaleString('en-US', { minimumFractionDigits: coin.price < 10 ? 4 : 0 })}
                  </div>
                  {/* FIX: no canvas sparklines on mobile — saves GPU & prevents scroll jank */}
                  {!isMobile && coin.spark.length > 1 && (
                    <Sparkline data={coin.spark} color={coin.change >= 0 ? '#0ECB81' : '#F6465D'} width={120} height={36} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── KYC Prompt ── */}
      {user?.kycStatus !== 'APPROVED' && user?.kycStatus !== 'PENDING_REVIEW' && (
        <Link href="/kyc" style={{ display: 'block', margin: '20px 16px 0', background: 'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border: '1px solid rgba(242,186,14,0.24)', borderRadius: 16, padding: 16, textDecoration: 'none' }} className="pressable">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(242,186,14,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--brand-primary)' }}>
              <UserCheck size={22} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Complete KYC to Withdraw</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Quick identity check — takes under 5 minutes</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </Link>
      )}

      <div style={{ height: 8 }} />
    </div>
  )
}
