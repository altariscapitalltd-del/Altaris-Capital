'use client'
import { useEffect, useState, useRef, useCallback, useMemo, memo, startTransition } from 'react'
import Link from 'next/link'
import { Download, Upload, TrendingUp, History, UserCheck } from 'lucide-react'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import * as HomeSections from '@/components/home/HomeSections'

// ─── TradingView widget loader (shared by all widgets) ────────────────────
function TradingViewWidget({
  widgetName,
  config,
  height = 400,
  style,
}: {
  widgetName: string
  config: Record<string, any>
  height?: number
  style?: React.CSSProperties
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !containerRef.current) return
    loaded.current = true

    const script = document.createElement('script')
    script.src = `https://s.tradingview.com/external-embedding/embed-widget-${widgetName}.js`
    script.async = true
    script.innerHTML = JSON.stringify({
      ...config,
      colorTheme: 'dark',
      locale: 'en',
      isTransparent: true,
      width: '100%',
      height,
    })
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
      loaded.current = false
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height, overflow: 'hidden', ...style }}
    />
  )
}

// ─── 1. Ticker Tape (always-on, top of page) ──────────────────────────────
const TickerTape = memo(function TickerTape() {
  const ref = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !ref.current) return
    loaded.current = true
    const script = document.createElement('script')
    script.src = 'https://s.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
        { proName: 'BINANCE:ETHUSDT', title: 'ETH' },
        { proName: 'BINANCE:XRPUSDT', title: 'XRP' },
        { proName: 'BINANCE:SOLUSDT', title: 'SOL' },
        { proName: 'BINANCE:BNBUSDT', title: 'BNB' },
        { description: 'Gold', proName: 'OANDA:XAUUSD' },
        { description: 'S&P 500', proName: 'FOREXCOM:SPXUSD' },
        { description: 'EUR/USD', proName: 'FX:EURUSD' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    })
    ref.current.appendChild(script)
  }, [])
  return <div ref={ref} style={{ width: '100%', minHeight: 46, overflow: 'hidden' }} />
})

// ─── 2. Fear & Greed Gauge (custom built from API) ────────────────────────
const FearGreedGauge = memo(function FearGreedGauge() {
  const [data, setData] = useState<{ value: number; label: string } | null>(null)

  useEffect(() => {
    fetch('https://api.alternative.me/fng/')
      .then(r => r.json())
      .then(d => {
        const item = d?.data?.[0]
        if (item) setData({ value: Number(item.value), label: item.value_classification })
      })
      .catch(() => {})
  }, [])

  if (!data) return null

  const color =
    data.value <= 24 ? '#F6465D' :
    data.value <= 44 ? '#F6A935' :
    data.value <= 54 ? '#B7BDC6' :
    data.value <= 74 ? '#0ECB81' : '#00E5A0'

  const rotation = (data.value / 100) * 180 - 90

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '16px 20px',
      textAlign: 'center',
      flex: 1,
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10 }}>FEAR & GREED</div>
      {/* Gauge arc */}
      <div style={{ position: 'relative', width: 100, height: 54, margin: '0 auto 8px' }}>
        <svg width="100" height="54" viewBox="0 0 100 54">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(data.value / 100) * 126} 126`} />
        </svg>
        {/* Needle */}
        <div style={{
          position: 'absolute', bottom: 4, left: '50%',
          width: 2, height: 36, transformOrigin: 'bottom center',
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          background: '#fff', borderRadius: 2,
        }} />
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{data.value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>{data.label}</div>
    </div>
  )
})

// ─── 3. Global Market Stats (from CoinGecko /global) ─────────────────────
const GlobalStats = memo(function GlobalStats() {
  const [stats, setStats] = useState<{ btcDom: number; totalMcap: string; vol24h: string } | null>(null)

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/global')
      .then(r => r.json())
      .then(d => {
        const data = d?.data
        if (!data) return
        const mcap = data.total_market_cap?.usd || 0
        const vol = data.total_volume?.usd || 0
        setStats({
          btcDom: Number((data.market_cap_percentage?.btc || 0).toFixed(1)),
          totalMcap: mcap >= 1e12 ? `$${(mcap / 1e12).toFixed(2)}T` : `$${(mcap / 1e9).toFixed(0)}B`,
          vol24h: vol >= 1e12 ? `$${(vol / 1e12).toFixed(2)}T` : `$${(vol / 1e9).toFixed(0)}B`,
        })
      })
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div style={{ display: 'flex', gap: 10, flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
      {[
        { label: 'BTC DOMINANCE', value: `${stats.btcDom}%`, color: '#F7931A' },
        { label: 'TOTAL MARKET CAP', value: stats.totalMcap, color: 'var(--text-primary)' },
        { label: '24H VOLUME', value: stats.vol24h, color: '#0ECB81' },
      ].map(s => (
        <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{s.label}</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: s.color }}>{s.value}</span>
        </div>
      ))}
    </div>
  )
})

// ─── 4. Trending Coins (CoinGecko /search/trending) ──────────────────────
const TrendingCoins = memo(function TrendingCoins() {
  const [coins, setCoins] = useState<{ name: string; sym: string; rank: number; change: number }[]>([])

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/search/trending')
      .then(r => r.json())
      .then(d => {
        const list = (d?.coins || []).slice(0, 6).map((c: any) => ({
          name: c.item?.name || '',
          sym: c.item?.symbol || '',
          rank: c.item?.market_cap_rank || 0,
          change: Number((c.item?.data?.price_change_percentage_24h?.usd || 0).toFixed(2)),
        }))
        setCoins(list)
      })
      .catch(() => {})
  }, [])

  if (coins.length === 0) return null

  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Trending</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>via CoinGecko</span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
        {coins.map(c => (
          <div key={c.sym} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '10px 14px', flexShrink: 0, minWidth: 110,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.sym}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>#{c.rank}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {c.change >= 0 ? '+' : ''}{c.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

// ─── 5. Market Overview (TradingView) ────────────────────────────────────
const MarketOverview = memo(function MarketOverview() {
  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Market Overview</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>via TradingView</span>
      </div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <TradingViewWidget
          widgetName="market-overview"
          height={400}
          config={{
            tabs: [
              {
                title: 'Crypto',
                symbols: [
                  { s: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
                  { s: 'BINANCE:ETHUSDT', d: 'Ethereum' },
                  { s: 'BINANCE:SOLUSDT', d: 'Solana' },
                  { s: 'BINANCE:XRPUSDT', d: 'XRP' },
                  { s: 'BINANCE:BNBUSDT', d: 'BNB' },
                ],
              },
              {
                title: 'Forex',
                symbols: [
                  { s: 'FX:EURUSD' }, { s: 'FX:GBPUSD' }, { s: 'FX:USDJPY' }, { s: 'FX:USDNGN' },
                ],
              },
              {
                title: 'Stocks',
                symbols: [
                  { s: 'NASDAQ:AAPL', d: 'Apple' },
                  { s: 'NASDAQ:NVDA', d: 'NVIDIA' },
                  { s: 'NYSE:BRK.A', d: 'Berkshire' },
                  { s: 'NASDAQ:TSLA', d: 'Tesla' },
                ],
              },
              {
                title: 'Commodities',
                symbols: [
                  { s: 'OANDA:XAUUSD', d: 'Gold' },
                  { s: 'NYMEX:CL1!', d: 'Oil' },
                  { s: 'COMEX:SI1!', d: 'Silver' },
                ],
              },
            ],
          }}
        />
      </div>
    </div>
  )
})

// ─── 6. Crypto Heatmap (TradingView) ─────────────────────────────────────
const CryptoHeatmap = memo(function CryptoHeatmap() {
  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Crypto Heatmap</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>via TradingView</span>
      </div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <TradingViewWidget
          widgetName="crypto-coins-heatmap"
          height={400}
          config={{ dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: 'change' }}
        />
      </div>
    </div>
  )
})

// ─── 7. Economic Calendar (TradingView) ──────────────────────────────────
const EconomicCalendar = memo(function EconomicCalendar() {
  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Economic Calendar</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>via TradingView</span>
      </div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <TradingViewWidget
          widgetName="events"
          height={350}
          config={{ currencyFilter: 'USD,EUR,GBP,NGN' }}
        />
      </div>
    </div>
  )
})

// ─── 8. Top Financial News (TradingView) ──────────────────────────────────
const FinancialNews = memo(function FinancialNews() {
  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Market News</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>via TradingView</span>
      </div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <TradingViewWidget
          widgetName="timeline"
          height={400}
          config={{ feedMode: 'market', market: 'crypto' }}
        />
      </div>
    </div>
  )
})

// ─── 9. DeFi TVL stat ────────────────────────────────────────────────────
const DefiTVL = memo(function DefiTVL() {
  const [tvl, setTvl] = useState<string | null>(null)

  useEffect(() => {
    fetch('https://api.llama.fi/v2/chains')
      .then(r => r.json())
      .then((d: any[]) => {
        const total = d.reduce((sum, c) => sum + (c.tvl || 0), 0)
        setTvl(total >= 1e12 ? `$${(total / 1e12).toFixed(2)}T` : `$${(total / 1e9).toFixed(0)}B`)
      })
      .catch(() => {})
  }, [])

  if (!tvl) return null

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>TOTAL DEFI TVL</span>
      <span style={{ fontWeight: 800, fontSize: 14, color: '#7B68EE' }}>{tvl}</span>
    </div>
  )
})

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

// ─── Portfolio chart (canvas) ─────────────────────────────────────────────
const PortfolioChart = memo(
  function PortfolioChart({ data, color = '#0ECB81', height = 150 }: { data: number[]; color?: string; height?: number }) {
    const ref = useRef<HTMLCanvasElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
      const c = ref.current; if (!c) return
      const ctx = c.getContext('2d'); if (!ctx) return
      const width = wrapRef.current?.clientWidth || 336
      const dpr = window.devicePixelRatio || 1
      c.width = width * dpr; c.height = height * dpr; ctx.scale(dpr, dpr)
      const values = data.length > 1 ? data : [0, 0]
      const min = Math.min(...values), max = Math.max(...values)
      const pad = Math.max((max - min) * 0.18, max * 0.004, 1)
      const lo = min - pad, hi = max + pad, range = hi - lo || 1
      const left = 8, right = width - 8, top = 10, bottom = height - 18
      const xs = values.map((_, i) => left + (i / Math.max(values.length - 1, 1)) * (right - left))
      const ys = values.map(v => bottom - ((v - lo) / range) * (bottom - top))
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1
      ;[0.25, 0.5, 0.75].forEach(t => { const y = top + (bottom - top) * t; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke() })
      const grad = ctx.createLinearGradient(0, top, 0, bottom)
      grad.addColorStop(0, color + '42'); grad.addColorStop(0.72, color + '10'); grad.addColorStop(1, color + '00')
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < xs.length; i++) { const mx = (xs[i - 1] + xs[i]) / 2; ctx.bezierCurveTo(mx, ys[i - 1], mx, ys[i], xs[i], ys[i]) }
      ctx.lineTo(xs[xs.length - 1], bottom); ctx.lineTo(xs[0], bottom); ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < xs.length; i++) { const mx = (xs[i - 1] + xs[i]) / 2; ctx.bezierCurveTo(mx, ys[i - 1], mx, ys[i], xs[i], ys[i]) }
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
      const lx = xs[xs.length - 1], ly = ys[ys.length - 1]
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.stroke()
    }, [data, color, height])
    return <div ref={wrapRef} style={{ width: '100%' }}><canvas ref={ref} style={{ width: '100%', height, display: 'block' }} /></div>
  },
  (p, n) => p.data === n.data && p.color === n.color
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
        <PortfolioChart data={history.values} color={pnl >= 0 ? '#0ECB81' : '#F6465D'} />
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

// ─────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [coins, setCoins] = useState<LiveCoin[]>([])
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [bonusDone, setBonusDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const coinsHashRef = useRef('')
  const isMobile = useIsMobile()
  // FIX: mobile waits longer, prevents paint jank on first load
  const sectionsReady = useIdleReady(isMobile ? 600 : 100)

  // FIX: read user from layout's localStorage cache first — avoids duplicate API call
  useEffect(() => {
    try {
      const cached = localStorage.getItem('altaris_user_cache')
      if (cached) { setUser(JSON.parse(cached)); setLoading(false) }
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
      .slice(0, 8)
  }, [])

  const fetchCoins = useCallback(() => {
    // FIX: per_page=8 instead of 40 — 5x less data, 5x faster
    return fetch('/api/markets/list?per_page=8')
      .then(r => r.json())
      .then(d => {
        const next = parseCoins(d)
        const hash = hashCoins(next)
        // FIX: skip state update if data is unchanged — no re-render, no sparkline redraw
        if (hash !== coinsHashRef.current) {
          coinsHashRef.current = hash
          // FIX: startTransition marks this as non-urgent — UI stays responsive
          startTransition(() => setCoins(next))
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
    if (cur === 'USD' || cur === 'USDT') return sum + amt
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 20 }}>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(242,186,14,0.12)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: -4, border: '1px solid rgba(242,186,14,0.06)', borderRadius: '50%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading</span>
        <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 0 16px' }}>
      {/* ── Ticker Tape — always on, no delay ── */}
      <div style={{ marginBottom: 4 }}>
        <TickerTape />
      </div>

      {/* ── Premium Portfolio Balance Card ── */}
      <div className="gold-card" style={{ margin: '8px 16px 0', padding: '24px 20px 18px', borderRadius: 24 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px rgba(14,203,129,0.5)' }} className="animate-pulse-live" />
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total Portfolio Value</span>
          </div>
          <button onClick={() => setBalanceHidden(h => !h)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', padding: 6, lineHeight: 1, transition: 'all var(--transition-base)' }}>
            {balanceHidden
              ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" /></svg>
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            }
          </button>
        </div>
        {/* Balance value */}
        <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: '-1.5px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(135deg, #FFFFFF 0%, #E8E8E8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 8 }}>
          {balanceHidden ? '••••••' : `$${usdBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
        {/* P/L row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: cryptoPL >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 14, fontWeight: 800, background: cryptoPL >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '4px 10px', borderRadius: 99, fontVariantNumeric: 'tabular-nums' }}>
            {balanceHidden ? '••••' : `${cryptoPL >= 0 ? '+' : '-'}$${Math.abs(cryptoPL).toFixed(2)} crypto P/L`}
          </span>
          {cryptoPL !== 0 && <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>LIVE</span>}
        </div>
        {/* Premium Quick Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          {[
            { l: 'Deposit', Icon: Download, href: '/wallet', gradient: 'linear-gradient(135deg, rgba(242,186,14,0.12), rgba(242,186,14,0.04))' },
            { l: 'Withdraw', Icon: Upload, href: '/wallet', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))' },
            { l: 'Invest', Icon: TrendingUp, href: '/invest', gradient: 'linear-gradient(135deg, rgba(14,203,129,0.12), rgba(14,203,129,0.04))' },
            { l: 'History', Icon: History, href: '/transactions', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))' },
          ].map(({ l, Icon, href, gradient }) => (
            <Link key={l} href={href} style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ background: gradient, borderRadius: 16, padding: '14px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', transition: 'all var(--transition-base)', backdropFilter: 'blur(12px)' }} className="pressable hover-lift">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon size={20} strokeWidth={2} color={l === 'Deposit' ? '#F2BA0E' : l === 'Withdraw' ? '#3B82F6' : l === 'Invest' ? '#0ECB81' : '#A855F7'} /></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>{l}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {sectionsReady && <BalanceChart usdBalance={usdBal} transactions={transactions} />}

      <HomeSections.PromoBanner user={user} canClaimBonus={canClaimBonus} claimBonus={claimBonus} />
      <HomeSections.BybitSection coins={coins} ready={sectionsReady} />

      {/* ── Premium Limited Offer — desktop only ── */}
      {!isMobile && sectionsReady && (
        <div style={{ margin: '20px 16px 0' }}>
          <div className="glow-danger" style={{ background: 'linear-gradient(135deg, #0D0D0D, #141414)', border: '1px solid rgba(246,70,93,0.2)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
            {/* Glow effect */}
            <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, rgba(246,70,93,0.12), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F6465D', animation: 'pulseLive 1.5s infinite', boxShadow: '0 0 8px rgba(246,70,93,0.5)' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>LIMITED OFFER</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.01em' }}>{FEATURED_PLAN.name}</div>
                <div style={{ color: '#F6465D', fontWeight: 900, fontSize: 24, marginTop: 4, letterSpacing: '-0.02em' }}>{FEATURED_PLAN.roi} <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>daily return</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>Ends in</div>
                <Countdown endsAt={FEATURED_PLAN.endsAt} />
                <div style={{ background: 'rgba(246,70,93,0.1)', color: '#F6465D', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 800, marginTop: 8, border: '1px solid rgba(246,70,93,0.15)' }}>{FEATURED_PLAN.spots} spots left</div>
              </div>
            </div>
            <Link href="/invest" style={{ display: 'block', padding: '13px', background: 'linear-gradient(135deg, #F6465D, #FB7185)', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center', boxShadow: '0 8px 24px rgba(246,70,93,0.25)', letterSpacing: '0.02em' }} className="pressable hover-lift">Invest Now →</Link>
          </div>
        </div>
      )}

      {/* ── Premium Active Plans ── */}
      {sectionsReady && activeInvestments.length > 0 && (
        <div style={{ margin: '24px 0 0' }}>
          <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--success), #0ECB81)', borderRadius: 2 }} />
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>Active Plans</span>
            </div>
            <Link href="/invest?tab=my" style={{ color: 'var(--brand-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }} className="pressable-glow">
              View All <span style={{ fontSize: 14 }}>→</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }} className="no-scrollbar">
            {activeInvestments.slice(0, 5).map((inv: any) => {
              const prog = Math.min(100, ((Date.now() - new Date(inv.startDate).getTime()) / (new Date(inv.endDate).getTime() - new Date(inv.startDate).getTime())) * 100)
              return (
                <div key={inv.id} className="glass-card hover-lift" style={{ padding: 16, flexShrink: 0, width: 160 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{inv.planName}</div>
                  <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>${inv.amount.toLocaleString()}</div>
                  <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>+${(inv.amount * inv.dailyRoi).toFixed(2)}/day</div>
                  {/* Premium progress bar */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #F2BA0E, #FFD234)', width: `${prog}%`, borderRadius: 4, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 0 8px rgba(242,186,14,0.3)' }} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6, fontWeight: 600 }}>{Math.round(prog)}% complete</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Premium Market Prices Grid ── */}
      {sectionsReady && coins.length > 0 && (
        <div style={{ margin: '24px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--brand-primary), var(--brand-primary-hover))', borderRadius: 2 }} />
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>Markets</span>
            </div>
            <Link href="/markets" style={{ color: 'var(--brand-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'all var(--transition-base)' }} className="pressable-glow">
              View All <span style={{ fontSize: 14 }}>→</span>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {coins.slice(0, 4).map(coin => (
              <Link key={coin.sym} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card hover-lift" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${coin.change >= 0 ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)'}, rgba(255,255,255,0.02))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0, border: `1px solid ${coin.change >= 0 ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)'}` }}>
                        {coin.sym.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>{coin.sym}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 1, fontWeight: 500 }}>{coin.name}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)', background: coin.change >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.02em' }}>
                      {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 17, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginBottom: 8 }}>
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

      {/* ── Fear & Greed + Global Stats row ── */}
      {sectionsReady && (
        <div style={{ margin: '20px 16px 0', display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <FearGreedGauge />
          <GlobalStats />
        </div>
      )}

      {/* ── Trending Coins ── */}
      {sectionsReady && <TrendingCoins />}

      {/* ── Crypto Heatmap ── */}
      {sectionsReady && <CryptoHeatmap />}

      {/* ── Market Overview ── */}
      {sectionsReady && <MarketOverview />}

      {/* ── Economic Calendar ── */}
      {sectionsReady && <EconomicCalendar />}

      {/* ── DeFi TVL stat ── */}
      {sectionsReady && (
        <div style={{ margin: '12px 16px 0' }}>
          <DefiTVL />
        </div>
      )}

      {/* ── Market News ── */}
      {sectionsReady && <FinancialNews />}

      {/* ── Premium KYC Prompt ── */}
      {user?.kycStatus !== 'APPROVED' && user?.kycStatus !== 'PENDING_REVIEW' && (
        <Link href="/kyc" style={{ display: 'block', margin: '20px 16px 0' }} className="pressable">
          <div className="gold-card border-glow-gold" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(242,186,14,0.15), rgba(242,186,14,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--brand-primary)', border: '1px solid rgba(242,186,14,0.2)', boxShadow: '0 4px 16px rgba(242,186,14,0.1)' }}>
              <UserCheck size={24} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3, letterSpacing: '-0.01em' }}>Complete KYC to Withdraw</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>Quick identity check — takes under 5 minutes</div>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--brand-primary)" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </Link>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
