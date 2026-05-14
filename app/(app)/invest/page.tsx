'use client'
import { useEffect, useMemo, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'
import { AltarisLogoMark } from '@/components/AltarisLogo'

function Sparkline({ data, color, width=80, height=32 }: { data:number[], color:string, width?:number, height?:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio||1; canvas.width=width*dpr; canvas.height=height*dpr; ctx.scale(dpr,dpr)
    const min=Math.min(...data),max=Math.max(...data),range=max-min||1
    const xs=data.map((_,i)=>(i/(data.length-1))*width); const ys=data.map(v=>height-((v-min)/range)*(height-4)-2)
    const grad=ctx.createLinearGradient(0,0,0,height); grad.addColorStop(0,color+'30'); grad.addColorStop(1,color+'00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.lineTo(xs[xs.length-1],height); ctx.lineTo(xs[0],height); ctx.closePath(); ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.strokeStyle=color; ctx.lineWidth=1.8; ctx.lineJoin='round'; ctx.stroke()
  },[data,color,width,height])
  return <canvas ref={canvasRef} style={{width,height,display:'block'}}/>
}

function RiskBar({ level }: { level: number }) {
  const colors = ['#0ECB81','#0ECB81','#F2BA0E','#FF6B35','#F6465D']
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{ width:10, height:4, borderRadius:2, background: i<=level ? colors[level-1] : 'var(--bg-elevated)' }}/>
      ))}
    </div>
  )
}

function useIdleReady(delay = 0) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) (window as any).requestIdleCallback(() => setReady(true), { timeout: 1500 })
      else (window as any).requestAnimationFrame(() => setReady(true))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [delay])
  return ready
}

function ShadowCard({ h = 92 }: { h?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: 18,
      background: '#050505',
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 18%, rgba(255,255,255,0.06) 32%, transparent 46%)', backgroundSize: '200% 100%', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: 14, left: 14, right: 84, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: 34, left: 14, right: 126, height: 14, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 14, left: 14, width: '54%', height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

type PlanType = {
  id: string
  name: string
  description?: string
  class: string
  icon: string
  iconBg: string
  daily: number
  roi: string
  dur: number
  min: number
  risk: number
  investors: number
  spots: number | null
  badge: string | null
  spark: number[]
  image?: string
  change24h?: number
}

const FALLBACK_ASSETS = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', category: 'Crypto', dailyReturn: '2.40', riskLevel: 4, image: '', spark: [1, 1.1, 1.05, 1.18, 1.24, 1.35, 1.5], change24h: 2.1 },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', category: 'Crypto', dailyReturn: '1.65', riskLevel: 4, image: '', spark: [1, 1.02, 1.08, 1.1, 1.16, 1.2, 1.28], change24h: 1.2 },
  { id: 'sol', symbol: 'SOL', name: 'Solana', category: 'Crypto', dailyReturn: '1.30', riskLevel: 3, image: '', spark: [1, 1.06, 1.01, 1.12, 1.08, 1.15, 1.22], change24h: 0.8 },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', category: 'Crypto', dailyReturn: '1.05', riskLevel: 3, image: '', spark: [1, 0.98, 1.03, 1.01, 1.06, 1.1, 1.08], change24h: 0.4 },
  { id: 'usd', symbol: 'USD', name: 'USD Cash', category: 'Fixed Income', dailyReturn: '0.45', riskLevel: 1, image: '', spark: [1, 1, 1, 1, 1, 1, 1], change24h: 0 },
  { id: 'bnb', symbol: 'BNB', name: 'BNB', category: 'Crypto', dailyReturn: '1.48', riskLevel: 3, image: '', spark: [1, 1.03, 1.05, 1.09, 1.14, 1.16, 1.2], change24h: 0.7 },
  { id: 'ada', symbol: 'ADA', name: 'Cardano', category: 'Crypto', dailyReturn: '0.96', riskLevel: 2, image: '', spark: [1, 0.99, 1.01, 1.0, 1.03, 1.05, 1.07], change24h: 0.2 },
  { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', category: 'Crypto', dailyReturn: '0.88', riskLevel: 3, image: '', spark: [1, 0.97, 1.0, 1.02, 1.04, 1.06, 1.1], change24h: -0.4 },
  { id: 'trx', symbol: 'TRX', name: 'TRON', category: 'Crypto', dailyReturn: '0.82', riskLevel: 2, image: '', spark: [1, 1.01, 1.0, 1.02, 1.03, 1.04, 1.06], change24h: 0.1 },
  { id: 'xlm', symbol: 'XLM', name: 'Stellar', category: 'Crypto', dailyReturn: '0.79', riskLevel: 2, image: '', spark: [1, 1.0, 1.01, 1.02, 1.03, 1.03, 1.05], change24h: 0.15 },
  { id: 'ltc', symbol: 'LTC', name: 'Litecoin', category: 'Crypto', dailyReturn: '1.12', riskLevel: 3, image: '', spark: [1, 1.02, 1.03, 1.06, 1.05, 1.08, 1.12], change24h: 0.5 },
  { id: 'xau', symbol: 'XAU', name: 'Gold', category: 'Commodities', dailyReturn: '0.58', riskLevel: 1, image: '', spark: [1, 1.01, 1.02, 1.02, 1.03, 1.03, 1.04], change24h: 0.05 },
  { id: 'spx', symbol: 'SPX', name: 'S&P 500', category: 'Stocks', dailyReturn: '0.72', riskLevel: 2, image: '', spark: [1, 1.01, 1.02, 1.03, 1.04, 1.05, 1.07], change24h: 0.25 },
  { id: 'usd-bond', symbol: 'BOND', name: 'Treasury Yield', category: 'Bonds', dailyReturn: '0.31', riskLevel: 1, image: '', spark: [1, 1, 1, 1, 1, 1, 1], change24h: 0 },
]

function generateVariantPlans(asset: any, count: number = 6): PlanType[] {
  const plans: PlanType[] = []
  const durations = [7, 14, 30, 60, 90, 180, 365]
  const minInvestments = [50, 100, 250, 500, 1000, 2500]
  const descriptions = [
    'Conservative strategy with steady returns',
    'Balanced approach for moderate growth',
    'Aggressive strategy for higher yield',
    'Short-term compounding plan',
    'Long-term wealth building plan',
    'Premium tier with priority payouts',
    'Entry-level plan for beginners',
  ]

  const baseDaily = Number(asset.dailyReturn || 0.8)
  const symbol = String(asset.symbol || '').toUpperCase()
  const bonus = symbol === 'BTC' ? 1.9 : symbol === 'ETH' ? 1.1 : symbol === 'SOL' ? 0.8 : symbol === 'XRP' ? 0.6 : 0.4
  const roiSteps = [0, 0.8, 1.6, 2.8, 4.2, 5.8]

  for (let i = 0; i < count; i++) {
    const dur = durations[(i + symbol.length) % durations.length]
    const min = minInvestments[(i + symbol.charCodeAt(0)) % minInvestments.length]
    const daily = Math.max(0.25, baseDaily + bonus + roiSteps[i])
    const annualRoi = daily * 365

    plans.push({
      id: `${asset.id}-variant-${i}`,
      name: `${asset.name} ${['Core', 'Growth', 'Prime', 'Elite', 'Pro', 'Max'][i] || `Tier ${i + 1}`}`,
      description: descriptions[(i + symbol.length) % descriptions.length],
      class: asset.category,
      icon: asset.symbol,
      iconBg: '#111',
      daily: Number(daily.toFixed(2)),
      roi: `${annualRoi.toFixed(1)}%`,
      dur,
      min,
      risk: Math.min(5, Math.max(1, Number(asset.riskLevel || 3) + (i > 1 ? 1 : 0))),
      investors: 1000 + (i * 1250) + symbol.charCodeAt(0),
      spots: null,
      badge: symbol === 'BTC' && i >= 1 ? 'Top' : (i >= 4 ? 'Hot' : null),
      spark: asset.spark && asset.spark.length > 0 ? asset.spark : Array.from({length: 20}, (_, idx) => Math.max(1, 80 + Math.sin(idx / 2) * 8 + i * 3)),
      image: asset.image,
      change24h: asset.change24h,
    })
  }
  return plans
}

function InvestContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'marketplace' | 'my'>( (searchParams.get('tab') as any) || 'marketplace')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<PlanType | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type:'success'|'error', text:string } | null>(null)
  const [userInvestments, setUserInvestments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [allPlans, setAllPlans] = useState<PlanType[]>([])
  const [liveHot, setLiveHot] = useState<PlanType[]>([])
  const [fetchingLive, setFetchingLive] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const heavyReady = useIdleReady(120)

  function PlanLogo({ plan, size = 28 }: { plan: PlanType; size?: number }) {
    const src = plan.image
    return (
      <div style={{ width: size + 12, height: size + 12, borderRadius: Math.max(10, size / 2.4), background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {src ? <img src={src} alt={plan.name} style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} /> : <div style={{ width: size, height: size, borderRadius: size / 2, background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))' }} />}
      </div>
    )
  }

  useBodyScrollLock(sheetOpen)

  const categories = ['All', 'Crypto', 'DeFi', 'Stocks', 'Real Estate', 'Bonds', 'Fixed Income', 'Commodities', 'Forex', 'ETF', 'Hedge']

  useEffect(() => {
    const fallback = FALLBACK_ASSETS.flatMap((a) => generateVariantPlans(a, a.symbol === 'BTC' ? 8 : 6))
    setAllPlans(fallback)
    setLiveHot(fallback.filter((p) => p.badge === 'Hot' || p.badge === 'Top').slice(0, 10))
    setFetchingLive(true)

    const timer = window.setTimeout(() => setFetchingLive(false), 2500)
    fetch(`/api/markets/live?category=${category}`)
      .then(r => r.json())
      .then(data => {
        const allVariants: PlanType[] = []
        ;(data.assets || []).slice(0, 16).forEach((a: any) => {
          const variants = generateVariantPlans(a, a.symbol?.toUpperCase() === 'BTC' ? 8 : 6)
          allVariants.push(...variants)
        })
        if (allVariants.length) {
          setAllPlans(allVariants)
          if (category === 'All') setLiveHot(allVariants.filter((p: any) => p.badge === 'Hot' || p.badge === 'Top').slice(0, 10))
        }
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timer)
        setFetchingLive(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    if (tab === 'my') {
      fetch('/api/investments').then(r => r.json()).then(d => {
        setUserInvestments(d.investments || [])
        setSummary(d.summary)
      })
    }
  }, [tab])

  const filteredPlans = useMemo(() => {
    let plans = allPlans
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      plans = plans.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) ||
        p.class.toLowerCase().includes(q)
      )
    }
    return plans
  }, [allPlans, searchQuery])

  function openInvestSheet(plan: PlanType) {
    setSelected(plan)
    setAmount(String(plan.min))
    setSheetOpen(true)
  }

  function closeInvestSheet() {
    setSheetOpen(false)
    setTimeout(() => { setSelected(null); setAmount(''); setMsg(null) }, 250)
  }

  async function invest() {
    if (!selected || !amount || loading) return
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: selected.id, 
          planName: selected.name,
          amount: parseFloat(amount),
          dailyRoi: selected.daily / 100
        })
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Investment failed' }) }
      else {
        setMsg({ type: 'success', text: 'Investment successful! Redirecting...' })
        setTimeout(() => { closeInvestSheet(); setTab('my') }, 1500)
      }
    } catch { setMsg({ type: 'error', text: 'Network error' }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '6px 16px 22px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <AltarisLogoMark size={26} />
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin:0 }}>Invest</h1>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Grow your wealth with expert plans</div>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button onClick={() => setTab('marketplace')} style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', background: tab === 'marketplace' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'marketplace' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .2s' }}>Market</button>
          <button onClick={() => setTab('my')} style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', background: tab === 'my' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'my' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .2s' }}>My Plans</button>
        </div>
      </div>

      {tab === 'marketplace' ? (
        <div>
          {/* ── Search ── */}
          <div style={{ marginBottom: 16 }}>
            <input 
              type="text" 
              placeholder="Search plans..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {/* ── Categories ── */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 4, scrollbarWidth: 'none' }}>
            {categories.map(c => (
              <button key={c} onClick={() => { setCategory(c); setSearchQuery('') }} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: category === c ? 'var(--brand-primary)' : 'var(--bg-card)', color: category === c ? '#000' : 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all .2s' }}>{c}</button>
            ))}
          </div>

          {/* ── HOT Section ── */}
          {(!heavyReady || fetchingLive) && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>HOT TRENDING</div>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
                <div style={{ minWidth: 160 }}><ShadowCard h={132} /></div>
                <div style={{ minWidth: 160 }}><ShadowCard h={132} /></div>
                <div style={{ minWidth: 160 }}><ShadowCard h={132} /></div>
              </div>
            </div>
          )}

          {heavyReady && !fetchingLive && category === 'All' && liveHot.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>HOT TRENDING</div>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
                {liveHot.map(plan => (
                  <div key={plan.id} onClick={() => openInvestSheet(plan)} style={{ minWidth: 160, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, cursor: 'pointer' }} className="pressable">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${plan.iconBg}1A`, border: `1px solid ${plan.iconBg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PlanLogo plan={plan} size={18} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--brand-primary)' }}>{plan.daily}%</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>DAILY</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.name}</div>
                    <Sparkline data={plan.spark} color={plan.change24h && plan.change24h >= 0 ? '#0ECB81' : '#F6465D'} width={132} height={32} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Plans List ── */}
          <div style={{ display: 'grid', gap: 12 }}>
            {!heavyReady || fetchingLive ? (
              Array.from({ length: 4 }).map((_, i) => <ShadowCard key={i} h={152} />)
            ) : filteredPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No plans found matching your search.</div>
            ) : (
              filteredPlans.map(plan => (
                <div key={plan.id} onClick={() => openInvestSheet(plan)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} className="pressable">
                  {plan.badge && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--brand-primary)', color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: '0 0 0 10px', textTransform: 'uppercase' }}>{plan.badge}</div>}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${plan.iconBg}1A`, border: `1px solid ${plan.iconBg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PlanLogo plan={plan} size={24} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', background: 'rgba(14,203,129,0.1)', padding: '1px 6px', borderRadius: 4 }}>{plan.class}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.name}</div>
                      {plan.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{plan.description}</div>}
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-primary)', lineHeight: 1 }}>{plan.daily}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>DAILY</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, alignItems: 'flex-end' }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Duration</div><div style={{ fontWeight: 700, fontSize: 13 }}>{plan.dur}d</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Min</div><div style={{ fontWeight: 700, fontSize: 13 }}>${plan.min}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Annual ROI</div><div style={{ fontWeight: 700, fontSize: 13 }}>{plan.roi}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 4 }}>Risk Level</div><RiskBar level={plan.risk} /></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── My Plans Tab ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!heavyReady && (
            <div style={{ display:'grid', gap:12 }}>
              <div style={{ height: 110, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ height: 160, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }} />
            </div>
          )}
          {userInvestments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Active Investments</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Start investing to grow your portfolio</div>
              <button onClick={() => setTab('marketplace')} style={{ padding: '12px 28px', background: 'var(--brand-primary)', color: '#000', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Browse Plans</button>
            </div>
          ) : (
            <>
              {summary && (
                <div style={{ background: 'linear-gradient(180deg, rgba(242,186,14,0.14), rgba(12,16,24,0.96))', border: '1px solid rgba(242,186,14,0.18)', borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: '0 18px 40px rgba(0,0,0,0.22)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.14em', marginBottom: 8 }}>MY PLAN DASHBOARD</div>
                      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 6 }}>Locked capital plus profit</div>
                    </div>
                    <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(242,186,14,0.14)', border: '1px solid rgba(242,186,14,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2BA0E', fontWeight: 900, fontSize: 20 }}>%</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 4 }}>Total Invested</div><div style={{ fontWeight: 900, fontSize: 18 }}>${summary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                    <div style={{ padding: 12, borderRadius: 16, background: 'rgba(14,203,129,0.08)', border: '1px solid rgba(14,203,129,0.16)' }}><div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 4 }}>Profit Earned</div><div style={{ fontWeight: 900, fontSize: 18, color: '#0ECB81' }}>+${summary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 4 }}>Daily Earning</div><div style={{ fontWeight: 900, fontSize: 16, color: '#F2BA0E' }}>+${summary.dailyEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</div></div>
                    <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 4 }}>Active Plans</div><div style={{ fontWeight: 900, fontSize: 18 }}>{summary.activeCount}</div></div>
                  </div>
                </div>
              )}
              {userInvestments.map((inv: any) => (
                <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div><div style={{ fontWeight: 800, fontSize: 15 }}>{inv.planName}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{(inv.dailyRoi * 100).toFixed(2)}% daily ROI · {inv.totalDurationDays}d plan</div></div>
                    <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.1)' : inv.status === 'ACTIVE' ? 'rgba(242,186,14,0.1)' : 'rgba(246,70,93,0.1)', color: inv.status === 'COMPLETED' ? '#0ECB81' : inv.status === 'ACTIVE' ? '#F2BA0E' : '#F6465D', border: `1px solid ${inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.2)' : inv.status === 'ACTIVE' ? 'rgba(242,186,14,0.2)' : 'rgba(246,70,93,0.2)'}` }}>{inv.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Invested</div><div style={{ fontWeight: 800, fontSize: 17 }}>${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                    <div style={{ background: inv.hasStartedEarning ? 'rgba(14,203,129,0.07)' : 'rgba(242,186,14,0.07)', border: `1px solid ${inv.hasStartedEarning ? 'rgba(14,203,129,0.15)' : 'rgba(242,186,14,0.15)'}`, borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Profit Earned</div>{inv.hasStartedEarning ? <div style={{ fontWeight: 800, fontSize: 17, color: '#0ECB81' }}>+${inv.profitEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> : <div style={{ fontWeight: 700, fontSize: 13, color: '#F2BA0E' }}>Starts in {inv.hoursUntilProfit}h</div>}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 6 }}><div style={{ height: '100%', background: `linear-gradient(90deg,#F2BA0E,${inv.hasStartedEarning ? '#0ECB81' : '#F2BA0E'})`, width: `${inv.progressPct || 0}%`, borderRadius: 99, transition: 'width .5s' }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}><span>{Math.round(inv.progressPct || 0)}% complete</span><span>{inv.status === 'COMPLETED' ? 'Completed' : `${Math.ceil(inv.daysRemaining || 0)}d remaining`}</span></div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Invest Modal ── */}
      {selected && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 120, transition: 'opacity .25s ease', opacity: sheetOpen ? 1 : 0 }} onClick={e => { if (e.target === e.currentTarget) closeInvestSheet() }}>
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(78px + env(safe-area-inset-bottom))', margin: '0 auto', transform: `translateY(${sheetOpen ? '0%' : '110%'})`, transition: 'transform .25s ease', background: 'var(--bg-card)', borderRadius: '20px 20px 16px 16px', width: 'calc(100% - 16px)', maxWidth: 480, border: '1px solid var(--border)', maxHeight: 'calc(100svh - 110px - env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px 0' }}><div style={{ width: 40, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, margin: '0 auto 14px' }} /></div>
            <div style={{ padding: '0 24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <PlanLogo plan={selected} size={28} />
                <div><div style={{ fontWeight: 800, fontSize: 18 }}>{selected.name}</div><div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{selected.class} · {selected.dur} days · {selected.daily}% daily</div></div>
              </div>
              {selected.description && <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>{selected.description}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[{ l: 'Daily ROI', v: `${selected.daily}%`, c: 'var(--brand-primary)' }, { l: 'Annual ROI', v: selected.roi }, { l: 'Min', v: `$${selected.min}` }].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12, textAlign: 'center' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>{l}</div><div style={{ fontWeight: 800, fontSize: 16, color: c || 'var(--text-primary)' }}>{v}</div></div>
                ))}
              </div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 7 }}>Investment Amount (USD)</label>
              <div style={{ position: 'relative', marginBottom: 14 }}><span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 18 }}>$</span><input style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '14px 14px 14px 34px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 22, fontWeight: 800, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="number" value={amount} onChange={e => { setAmount(e.target.value); setMsg(null) }} /></div>
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>{[selected.min, selected.min * 2, selected.min * 5, selected.min * 10].map(v => (<button key={v} onClick={() => setAmount(String(v))} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>${v.toLocaleString()}</button>))}</div>
              {amount && parseFloat(amount) >= selected.min && (
                <div style={{ background: 'rgba(14,203,129,0.05)', border: '1px solid rgba(14,203,129,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>PROFIT ESTIMATE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Daily Profit</div><div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16, marginTop: 2 }}>+${(parseFloat(amount) * selected.daily / 100).toFixed(2)}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Total Return</div><div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16, marginTop: 2 }}>+${(parseFloat(amount) * selected.daily / 100 * selected.dur).toFixed(2)}</div></div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 24px calc(env(safe-area-inset-bottom) + 14px)', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {msg && <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button onClick={closeInvestSheet} style={{ padding: '14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={invest} disabled={loading || !amount || parseFloat(amount) < selected.min} style={{ padding: '14px', background: '#F2BA0E', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Investing...' : `Invest $${parseFloat(amount || '0').toLocaleString()}`}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default function InvestPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, color: '#fff' }}>Loading marketplace...</div>}>
      <InvestContent />
    </Suspense>
  )
}
