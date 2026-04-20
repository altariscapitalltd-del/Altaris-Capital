 'use client'
 import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
 import Link from 'next/link'
 import { AnimatePresence, motion } from 'framer-motion'
 import { Download, Upload, TrendingUp, History, Gift, Check, UserCheck, Clock } from 'lucide-react'
 import { AltarisLogoMark } from '@/components/AltarisLogo'

// Mini sparkline component
function Sparkline({ data, color, width=64, height=28 }: { data:number[], color: string, width?:number, height?:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr; canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
    const xs = data.map((_, i) => (i / (data.length - 1)) * width)
    const ys = data.map(v => height - ((v - min) / range) * (height - 4) - 2)
    ctx.clearRect(0, 0, width, height)
    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, color + '30'); grad.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
    ctx.lineTo(xs[xs.length-1], height); ctx.lineTo(xs[0], height)
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
    // line
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
  }, [data, color, width, height])
  return <canvas ref={canvasRef} style={{ width, height, display:'block' }} />
}

function useBalanceHistory(latest: number) {
  const [series, setSeries] = useState<{ times: number[]; values: number[] }>({ times: [], values: [] })
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('altaris_balance_history') : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.times?.length && parsed?.values?.length) {
          setSeries(parsed)
          return
        }
      } catch {
        // ignore
      }
    }

    const base = latest || 1000
    const points = Array.from({ length: 32 }, (_, i) => {
      const t = Date.now() - (31 - i) * 60 * 1000
      const drift = 1 + (Math.sin(i / 5) * 0.02 + (Math.random() - 0.5) * 0.01)
      return { t, v: Math.max(0, base * drift) }
    })
    setSeries({ times: points.map(p => p.t), values: points.map(p => p.v) })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('altaris_balance_history', JSON.stringify(series))
  }, [series])

  useEffect(() => {
    if (!latest) return
    setSeries(prev => {
      const last = prev.values[prev.values.length - 1] ?? latest
      if (Math.abs(last - latest) < 0.01) return prev
      const nextTimes = [...prev.times, Date.now()]
      const nextValues = [...prev.values, latest]
      const maxLen = 40
      if (nextValues.length > maxLen) {
        nextTimes.splice(0, nextValues.length - maxLen)
        nextValues.splice(0, nextValues.length - maxLen)
      }
      return { times: nextTimes, values: nextValues }
    })
  }, [latest])

  useEffect(() => {
    const timer = setInterval(() => {
      setSeries(prev => {
        if (prev.values.length === 0) return prev
        const last = prev.values[prev.values.length - 1]
        const delta = last * ((Math.random() - 0.5) * 0.002)
        const next = last + delta
        const nextTimes = [...prev.times, Date.now()]
        const nextValues = [...prev.values, next]
        const maxLen = 40
        if (nextValues.length > maxLen) {
          nextTimes.splice(0, nextValues.length - maxLen)
          nextValues.splice(0, nextValues.length - maxLen)
        }
        return { times: nextTimes, values: nextValues }
      })
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  return series
}

function BalanceChart({ usdBalance }: { usdBalance: number }) {
  const history = useBalanceHistory(usdBalance)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('altaris_hide_chart')
    if (stored === '1') setVisible(false)
    if (stored === '0') setVisible(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('altaris_hide_chart', visible ? '0' : '1')
  }, [visible])

  const change = useMemo(() => {
    if (history.values.length < 2) return 0
    const start = history.values[0]
    const end = history.values[history.values.length - 1]
    return start === 0 ? 0 : ((end - start) / start) * 100
  }, [history.values])

  if (!visible) {
    return (
      <div
        onClick={() => setVisible(true)}
        style={{
          margin: '18px 16px 0',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}
      >
        Tap to show portfolio chart
      </div>
    )
  }

  return (
    <div style={{ margin: '18px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Portfolio (USD)</div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      </div>
      <div
        onClick={() => setVisible(false)}
        style={{
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          animation: 'balanceChartShimmer 3s ease-in-out infinite',
        }}
      >
        <Sparkline data={history.values} color={change >= 0 ? '#0ECB81' : '#F6465D'} width={320} height={140} />
      </div>
    </div>
  )
}

// Countdown timer
function Countdown({ endsAt }: { endsAt: Date }) {
  const [time, setTime] = useState({ d:0, h:0, m:0, s:0 })
  useEffect(() => {
    function calc() {
      const diff = Math.max(0, endsAt.getTime() - Date.now())
      setTime({ d: Math.floor(diff/86400000), h: Math.floor(diff/3600000)%24, m: Math.floor(diff/60000)%60, s: Math.floor(diff/1000)%60 })
    }
    calc(); const t = setInterval(calc, 1000); return () => clearInterval(t)
  }, [endsAt])
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
      {[{v:time.d,l:'D'},{v:time.h,l:'H'},{v:time.m,l:'M'},{v:time.s,l:'S'}].map(({v,l})=>(
        <div key={l} style={{ display:'flex', alignItems:'baseline', gap:1 }}>
          <span style={{ fontWeight:800, fontSize:16, color:'var(--text-primary)', fontVariantNumeric:'tabular-nums', minWidth:20, textAlign:'center' }}>{String(v).padStart(2,'0')}</span>
          <span style={{ color:'var(--text-muted)', fontSize:9, fontWeight:600 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

const LATEST_EVENTS = [
  { title: 'Refer Friends — Get $30', date: '2025-03-10', icon: 'event' },
  { title: 'Seasonal Yield Boost +5%', date: '2025-03-08', icon: 'event' },
  { title: 'VIP Tier 1 Benefits Update', date: '2025-03-05', icon: 'event' },
]
const LATEST_NEWS = [
  { title: 'Altaris Capital Q1 2025 Report', date: '2025-03-11', icon: 'news' },
  { title: 'New DeFi Plans Launched', date: '2025-03-09', icon: 'news' },
  { title: 'KYC Verification Guide', date: '2025-03-04', icon: 'news' },
]

type LiveCoin = { sym: string; name: string; price: number; change: number; spark: number[] }

function BybitSection({ coins }: { coins: LiveCoin[] }) {
  const [eventsTab, setEventsTab] = useState<'events' | 'news'>('events')
  const fallbackCoins: LiveCoin[] = [
    { sym: 'BTC', name: 'Bitcoin', price: 0, change: 0, spark: [1, 2, 1.8, 2.3, 2.2, 2.6, 2.8] },
    { sym: 'ETH', name: 'Ethereum', price: 0, change: 0, spark: [1, 1.1, 1.2, 1.15, 1.3, 1.35, 1.4] },
    { sym: 'BNB', name: 'BNB', price: 0, change: 0, spark: [1.4, 1.35, 1.36, 1.38, 1.4, 1.42, 1.45] },
    { sym: 'SOL', name: 'Solana', price: 0, change: 0, spark: [0.8, 0.9, 0.85, 1, 1.05, 1.1, 1.15] },
  ]
  const list = coins.length ? coins : fallbackCoins

  return (
    <div style={{ marginTop: 18, padding: '0 16px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>Crypto</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {list.slice(0, 4).map((coin, index) => (
            <Link key={coin.sym} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: index < 3 ? '1px solid var(--border)' : 'none', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{coin.sym}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{coin.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>24h</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>${coin.price >= 1 ? coin.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : coin.price.toFixed(4)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</span>
              </div>
              <div style={{ width: 56, height: 28, flexShrink: 0 }}>
                <Sparkline data={coin.spark} color={coin.change >= 0 ? '#0ECB81' : '#F6465D'} width={56} height={28} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>Top movers</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {list.slice(0, 4).map((coin) => (
            <Link key={`${coin.sym}-top`} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }} className="pressable">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{coin.sym}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>${coin.price >= 1 ? coin.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : coin.price.toFixed(2)}</div>
                <Sparkline data={coin.spark} color={coin.change >= 0 ? '#0ECB81' : '#F6465D'} width={100} height={28} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setEventsTab('events')} style={{ flex: 1, padding: '12px', border: 'none', background: eventsTab === 'events' ? 'var(--bg-elevated)' : 'transparent', color: eventsTab === 'events' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Latest Events</button>
          <button onClick={() => setEventsTab('news')} style={{ flex: 1, padding: '12px', border: 'none', background: eventsTab === 'news' ? 'var(--bg-elevated)' : 'transparent', color: eventsTab === 'news' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>News</button>
        </div>
        <div style={{ padding: 12 }}>
          {(eventsTab === 'events' ? LATEST_EVENTS : LATEST_NEWS).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={14} strokeWidth={2} color="var(--brand-primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{item.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{item.date}</div>
              </div>
            </div>
          ))}
          <Link href="/support" style={{ display: 'block', textAlign: 'center', marginTop: 8, color: 'var(--brand-primary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>More</Link>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [coins, setCoins] = useState<LiveCoin[]>([])
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [bonusClaiming, setBonusClaiming] = useState(false)
  const [bonusDone, setBonusDone] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r=>r.json()).then(d=>{ setUser(d.user); setLoading(false) })
    fetch('/api/markets/list?per_page=40')
      .then(r=>r.json())
      .then(d => {
        const list = (d.list || [])
          .filter((c: any) => c?.symbol && Array.isArray(c.spark) && c.spark.length > 1)
          .map((c: any) => ({
            sym: String(c.symbol).toUpperCase(),
            name: c.name || String(c.symbol).toUpperCase(),
            price: Number(c.price || 0),
            change: Number(c.change24h || 0),
            spark: c.spark.slice(-24),
          }))
        const featured = list.slice(0, 8)
        const movers = [...featured].sort((a: LiveCoin, b: LiveCoin) => Math.abs(b.change) - Math.abs(a.change))
        setCoins(movers)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // Refresh market data more frequently
    const t = setInterval(() => { fetch('/api/markets/list?per_page=40').then(r=>r.json()).then(d=>{ const list=(d.list||[]).filter((c:any)=>c?.symbol&&Array.isArray(c.spark)&&c.spark.length>1).map((c:any)=>({ sym:String(c.symbol).toUpperCase(), name:c.name||String(c.symbol).toUpperCase(), price:Number(c.price||0), change:Number(c.change24h||0), spark:c.spark.slice(-24) })); const featured=list.slice(0,8); const movers=[...featured].sort((a:LiveCoin,b:LiveCoin)=>Math.abs(b.change)-Math.abs(a.change)); setCoins(movers) }).catch(()=>{}) }, 8000)
    window.addEventListener('balance:refresh', load)
    return () => { clearInterval(t); window.removeEventListener('balance:refresh', load) }
  }, [load])

  async function claimBonus() {
    setBonusClaiming(true)
    const res = await fetch('/api/user/claim-bonus', { method:'POST' })
    if (res.ok) { setBonusDone(true); load() }
    setBonusClaiming(false)
  }

  const usdBal = user?.balances?.find((b:any)=>b.currency==='USD')?.amount || 0
  const activeInvestments = user?.investments?.filter((i:any)=>i.status==='ACTIVE') || []
  const todayProfit = activeInvestments.reduce((s:number,i:any)=>s+(i.amount*i.dailyRoi),0)
  const canClaimBonus = !user?.bonusClaimed && !bonusDone

  const BANNERS = [
    {
      id: 'welcome',
      title: 'Claim Your $40 Welcome Bonus',
      subtitleApproved: 'KYC verified! Claim your reward instantly.',
      subtitleDefault: 'Complete KYC verification → Get $40 free',
      pill: 'Welcome Offer',
    },
    {
      id: 'referral',
      title: 'Invite Friends, Earn up to 30%',
      subtitleApproved: 'Share your link and earn rebates on every trade.',
      subtitleDefault: 'Unlock referral rewards after KYC approval.',
      pill: 'Referral Reward',
    },
    {
      id: 'daily',
      title: 'Daily Check-In Bonus',
      subtitleApproved: 'Tap claim once a day to stack extra yield.',
      subtitleDefault: 'Verify once, claim every day without friction.',
      pill: 'Daily Claim',
    },
    {
      id: 'seasonal',
      title: 'Seasonal Yield Boost +5%',
      subtitleApproved: 'Limited-time APY boost on select plans.',
      subtitleDefault: 'Finish KYC to join the seasonal campaign.',
      pill: 'Seasonal Offer',
    },
    {
      id: 'vip',
      title: 'Upgrade to VIP Tier 1',
      subtitleApproved: 'Lower fees, higher limits, priority support.',
      subtitleDefault: 'Verify identity to start your VIP journey.',
      pill: 'VIP Upgrade',
    },
  ] as const

  const showWelcomeCard = user?.kycStatus !== 'APPROVED' || canClaimBonus
  const visibleBanners = showWelcomeCard ? BANNERS : []

  useEffect(() => {
    if (!showWelcomeCard || visibleBanners.length === 0) return
    const interval = setInterval(() => {
      setBannerIndex((i) => (i + 1) % visibleBanners.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [showWelcomeCard, visibleBanners.length])

  const FEATURED_PLAN = { name:'DeFi Accelerator', roi:'3.5%', dur:'7 days', spots:3, endsAt: new Date(Date.now()+2*86400000+14*3600000+33*60000) }
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh' }}>
      <AltarisLogoMark size={40} />
    </div>
  )

  return (
    <div style={{ padding:'4px 0 16px' }}>

      {/* ── Portfolio Balance — floats on black, no card box ── */}
      <div style={{ margin:'8px 16px 0', padding:'20px 18px 14px', borderRadius:20, border:'1px solid rgba(242,186,14,0.2)', background:'linear-gradient(145deg, rgba(242,186,14,0.12) 0%, rgba(21,26,33,0.96) 35%, rgba(11,14,17,1) 100%)', boxShadow:'0 20px 45px rgba(0,0,0,0.35)' }}>
        <div style={{ color:'var(--text-muted)', fontSize:12, fontWeight:500, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
          Total Portfolio Value
          <button onClick={()=>setBalanceHidden(h=>!h)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0, lineHeight:1 }}>
            {balanceHidden
              ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
        <div style={{ fontSize:42, fontWeight:900, letterSpacing:'-1px', marginBottom:4, transition:'all .3s' }}>
          {balanceHidden ? '••••••' : `$${usdBal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'var(--success)', fontSize:13, fontWeight:600 }}>
            {balanceHidden ? '••••' : `+$${todayProfit.toFixed(2)} today`}
          </span>
          {todayProfit > 0 && <span style={{ background:'var(--success-bg)', color:'var(--success)', padding:'2px 7px', borderRadius:99, fontSize:11, fontWeight:700 }}>LIVE</span>}
        </div>

        {/* Quick actions */}
        <div style={{ display:'flex', gap:10, marginTop:20, alignItems: 'center' }}>
          {[
            { l:'Deposit', Icon: Download, href:'/wallet' },
            { l:'Withdraw', Icon: Upload, href:'/wallet' },
            { l:'Invest', Icon: TrendingUp, href:'/invest' },
            { l:'History', Icon: History, href:'/transactions' },
          ].map(({ l, Icon, href })=>(
            <Link key={l} href={href} style={{ flex:1, textDecoration:'none' }}>
              <div style={{ background:'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', borderRadius:14, padding:'12px 8px', textAlign:'center', border:'1px solid var(--border)', transition:'all .15s', color:'var(--text-secondary)', boxShadow:'0 10px 24px rgba(0,0,0,0.2)' }} className="pressable ui-upgrade-card">
                <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}><Icon size={20} strokeWidth={2} /></div>
                <div style={{ color:'var(--text-secondary)', fontSize:11, fontWeight:600 }}>{l}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BalanceChart usdBalance={usdBal} />

      {/* ── Promo banner (rotating offers) — only when unverified or bonus not claimed ── */}
      {visibleBanners.length > 0 && (
      <div style={{ margin:'18px 16px 0' }}>
        <div style={{ position:'relative', borderRadius:18, overflow:'hidden', border:'1px solid rgba(242,186,14,0.25)', background:'radial-gradient(circle at 0% 0%,rgba(242,186,14,0.18),transparent 55%), radial-gradient(circle at 100% 100%,rgba(59,130,246,0.12),transparent 55%)' }}>
          <div style={{ position:'absolute', top:-60, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.22),transparent 70%)', opacity:0.85, pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-50, left:-40, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)', pointerEvents:'none' }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={visibleBanners[bannerIndex % visibleBanners.length].id}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ position: 'relative', padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}
            >
              {/* Icon / Illustration */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg,rgba(0,0,0,0.2),rgba(0,0,0,0.8))',
                border: '1px solid rgba(242,186,14,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'conic-gradient(from 210deg,#F2BA0E,#FF7A00,#F2BA0E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}>
                  <Gift size={18} strokeWidth={2} color="#000" />
                </div>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(242,186,14,0.35)',
                    color: '#F2BA0E',
                  }}>
                    {visibleBanners[bannerIndex % visibleBanners.length].pill}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Swipe through the latest offers
                  </span>
                </div>

                <h2 style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  marginBottom: 4,
                  color: 'var(--text-primary)',
                }}>
                  {visibleBanners[bannerIndex % visibleBanners.length].title}
                </h2>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                  {user?.kycStatus === 'APPROVED'
                    ? visibleBanners[bannerIndex % visibleBanners.length].subtitleApproved
                    : visibleBanners[bannerIndex % visibleBanners.length].subtitleDefault}
                </p>

                {/* Steps row stays similar to original bonus card */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, overflowX:'auto' }} className="no-scrollbar">
                  {[{l:'Sign Up',done:true},{l:'Verify KYC',done:user?.kycStatus==='APPROVED'},{l:'Claim Bonus',done:false}].map((s,i,arr)=>(
                    <div key={s.l} style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:s.done?'#F2BA0E':'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:s.done?'#000':'var(--text-muted)', flexShrink:0 }}>
                        {s.done ? <Check size={10} strokeWidth={3} /> : i+1}
                      </div>
                      <span style={{ fontSize:10, color:s.done?'var(--text-primary)':'var(--text-muted)', fontWeight:s.done?600:400, whiteSpace:'nowrap' }}>{s.l}</span>
                      {i<arr.length-1 && <div style={{ width:14, height:1, background:'rgba(242,186,14,0.25)' }}/>} 
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {user?.kycStatus === 'APPROVED' ? (
                  <button
                    onClick={claimBonus}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700 }}
                  >
                    {bonusClaiming ? 'Claiming…' : bonusDone ? 'Claimed' : 'Claim $40 Bonus'}
                  </button>
                ) : (
                  <Link href="/kyc" style={{ display: 'block', textDecoration: 'none' }}>
                    <button className="btn-secondary" style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700 }}>
                      Complete KYC
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* ── Bybit-style: Events, Crypto list/grid, Latest Events/News ── */}
      <BybitSection coins={coins} />



      {/* ── Limited Offer with Countdown ── */}
      <div style={{ margin:'18px 16px 0' }}>
        <div style={{ background:'linear-gradient(135deg,#0D0D0D,#141414)', border:'1px solid rgba(246,70,93,0.2)', borderRadius:16, padding:18, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 85% 50%,rgba(246,70,93,0.06),transparent 60%)', pointerEvents:'none' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#F6465D', animation:'pulseLive 1.5s infinite' }}/>
                <span style={{ color:'var(--text-muted)', fontSize:11, fontWeight:600, letterSpacing:'0.06em' }}>LIMITED OFFER</span>
              </div>
              <div style={{ fontWeight:800, fontSize:17 }}>{FEATURED_PLAN.name}</div>
              <div style={{ color:'#F6465D', fontWeight:800, fontSize:22, marginTop:2 }}>{FEATURED_PLAN.roi} <span style={{ color:'var(--text-muted)', fontSize:12, fontWeight:500 }}>daily return</span></div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:5 }}>Ends in</div>
              <Countdown endsAt={FEATURED_PLAN.endsAt} />
              <div style={{ background:'rgba(246,70,93,0.1)', color:'#F6465D', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, marginTop:6 }}>
                {FEATURED_PLAN.spots} spots left
              </div>
            </div>
          </div>
          <Link href="/invest" style={{ display:'block', padding:'11px', background:'#F6465D', color:'#fff', borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none', textAlign:'center' }} className="pressable">
            Invest Now →
          </Link>
        </div>
      </div>

      {/* ── Active Plans ── */}
      {activeInvestments.length > 0 && (
        <div style={{ margin:'22px 0 0' }}>
          <div style={{ padding:'0 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>Active Plans</span>
            <Link href="/invest?tab=my" style={{ color:'var(--brand-primary)', fontSize:12, textDecoration:'none', fontWeight:600 }}>View All →</Link>
          </div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', padding:'0 16px 4px' }} className="no-scrollbar">
            {activeInvestments.slice(0,5).map((inv:any) => {
              const prog = Math.min(100,((Date.now()-new Date(inv.startDate).getTime())/(new Date(inv.endDate).getTime()-new Date(inv.startDate).getTime()))*100)
              const dailyEarn = inv.amount * inv.dailyRoi
              return (
                <div key={inv.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:14, flexShrink:0, width:148 }}>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:4, fontWeight:500 }}>{inv.planName}</div>
                  <div style={{ fontWeight:800, fontSize:18, marginBottom:1 }}>${inv.amount.toLocaleString()}</div>
                  <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginBottom:10 }}>+${dailyEarn.toFixed(2)}/day</div>
                  <div style={{ background:'var(--bg-elevated)', borderRadius:3, height:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'#F2BA0E', width:`${prog}%`, borderRadius:3 }}/>
                  </div>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginTop:4 }}>{Math.round(prog)}% complete</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Market Prices ── */}
      <div style={{ margin:'22px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Markets</span>
          <Link href="/markets" style={{ color:'var(--brand-primary)', fontSize:12, textDecoration:'none', fontWeight:600 }}>View All →</Link>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {coins.slice(0, 4).map(coin => (
            <div key={coin.sym} style={{ background:'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border:'1px solid var(--border)', borderRadius:16, padding:14, boxShadow:'0 14px 28px rgba(0,0,0,0.22)' }} className="pressable ui-upgrade-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{coin.sym}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginTop:1 }}>{coin.name}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color: coin.change>=0?'var(--success)':'var(--danger)', background: coin.change>=0?'var(--success-bg)':'var(--danger-bg)', padding:'2px 7px', borderRadius:99 }}>
                  {coin.change>=0?'+':''}{coin.change.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>
                ${coin.price.toLocaleString('en-US',{minimumFractionDigits:coin.price<10?4:0})}
              </div>
              <Sparkline data={coin.spark} color={coin.change>=0?'#0ECB81':'#F6465D'} width={120} height={36}/>
            </div>
          ))}
        </div>
      </div>

      {/* ── KYC Prompt ── */}
      {user?.kycStatus !== 'APPROVED' && user?.kycStatus !== 'PENDING_REVIEW' && (
        <Link href="/kyc" style={{ display:'block', margin:'20px 16px 0', background:'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border:'1px solid rgba(242,186,14,0.24)', borderRadius:16, padding:16, textDecoration:'none', boxShadow:'0 12px 30px rgba(0,0,0,0.2)' }} className="ui-upgrade-card">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:11, background:'rgba(242,186,14,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--brand-primary)' }}><UserCheck size={22} strokeWidth={2} /></div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>Complete KYC to Withdraw</div>
              <div style={{ color:'var(--text-muted)', fontSize:12 }}>Quick identity check — takes under 5 minutes</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </Link>
      )}

      <div style={{ height:8 }} />
    </div>
  )
}
