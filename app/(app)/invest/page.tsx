'use client'
import { useEffect, useMemo, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

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
  // level 1-5
  const colors = ['#0ECB81','#0ECB81','#F2BA0E','#FF6B35','#F6465D']
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{ width:10, height:4, borderRadius:2, background: i<=level ? colors[level-1] : 'var(--bg-elevated)' }}/>
      ))}
    </div>
  )
}


type PlanType = {
  id: string
  name: string
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
}

// Map each plan ID to the right provider SVG icon in /public/invest-icons/
const PLAN_ICON: Record<string, string> = {
  'btc-yield':    '/invest-icons/bitcoin-logo.svg',
  'btc-micro':    '/invest-icons/bitcoin-logo.svg',
  'eth-stake':    '/invest-icons/ethereum.svg',
  'defi-accel':   '/invest-icons/network.svg',
  'altcoin':      '/invest-icons/coins.svg',
  'web3-venture': '/invest-icons/lightning.svg',
  'us-tech':      '/invest-icons/chip.svg',
  'dividend':     '/invest-icons/badge-dollar.svg',
  'sp500':        '/invest-icons/chart-square.svg',
  'blue-chip':    '/invest-icons/briefcase.svg',
  'ai-stocks':    '/invest-icons/analytics.svg',
  'reit-us':      '/invest-icons/buildings.svg',
  'reit-asia':    '/invest-icons/building.svg',
  'dev-fund':     '/invest-icons/home-1.svg',
  'reit-global':  '/invest-icons/globe.svg',
  'us-treasury':  '/invest-icons/bank.svg',
  'corp-bond':    '/invest-icons/document-text.svg',
  'hi-yield-bond':'/invest-icons/bank.svg',
  'em-bond':      '/invest-icons/world.svg',
  'smart-save':   '/invest-icons/safe.svg',
  'stablecoin':   '/invest-icons/coin-stack.svg',
  'gold':         '/invest-icons/gold.svg',
  'silver':       '/invest-icons/silver.svg',
  'energy':       '/invest-icons/lightning.svg',
  'usd-eur':      '/invest-icons/exchange-rate.svg',
  'em-fx':        '/invest-icons/arrows-up-down.svg',
  'asia-fx':      '/invest-icons/exchange-rate.svg',
  'clean-energy': '/invest-icons/leaf.svg',
  'health-etf':   '/invest-icons/heart-pulse.svg',
  'global-macro': '/invest-icons/briefcase.svg',
  'longshort':    '/invest-icons/line-chart.svg',
}

// Map each plan to the live market symbol it tracks
const PLAN_MARKET: Record<string, string> = {
  'btc-yield': 'BTC',    'btc-micro': 'BTC',     'eth-stake': 'ETH',
  'defi-accel': 'UNI',   'altcoin': 'SOL',        'web3-venture': 'ETH',
  'us-tech': 'QQQ',      'dividend': 'SPY',        'sp500': 'SPY',
  'blue-chip': 'SPY',    'ai-stocks': 'ARKK',
  'reit-us': 'VNQ',      'reit-asia': 'IYR',       'dev-fund': 'VNQ', 'reit-global': 'VNQ',
  'us-treasury': 'TLT',  'corp-bond': 'LQD',       'hi-yield-bond': 'HYG', 'em-bond': 'HYG',
  'smart-save': 'USDC-APY', 'stablecoin': 'USDT-APY',
  'gold': 'XAU',         'silver': 'XAG',          'energy': 'OIL',
  'usd-eur': 'EUR/USD',  'em-fx': 'USD/JPY',       'asia-fx': 'USD/JPY',
  'clean-energy': 'ICLN','health-etf': 'XLV',
  'global-macro': 'HFRX','longshort': 'MCSI',
}

const planImagePath = (planId: string): string => {
  const baseId = planId.replace(/-hot-\d+$/, '')
  return PLAN_ICON[baseId] || `/invest-icons/plans/${planId}.svg`
}

// 30 investment plans across all asset classes
const PLANS = [
  // ── Crypto ──
  { id:'btc-yield',    name:'BTC Yield Vault',        class:'Crypto',       icon:'BTC',   iconBg:'#F7931A', daily:2.50, roi:'912%',  dur:14,  min:1000,  risk:4, investors:1892, spots:null,  badge:'Hot',    spark:[30,34,38,36,42,45,48,46,52,55,58,56,62,65,68,66,72,75,78,80] },
  { id:'eth-stake',    name:'ETH Staking Pool',        class:'Crypto',       icon:'ETH',  iconBg:'#627EEA', daily:1.20, roi:'438%',  dur:90,  min:500,   risk:3, investors:3241, spots:null,  badge:'Popular',   spark:[20,22,21,24,23,26,25,28,27,30,29,32,31,34,33,36,35,38,37,40] },
  { id:'defi-accel',   name:'DeFi Accelerator',        class:'DeFi',         icon:'DEF',  iconBg:'#7C3AED', daily:3.50, roi:'1277%', dur:7,   min:2000,  risk:5, investors:891,  spots:5,     badge:'Limited', spark:[10,15,14,20,18,25,22,30,28,35,32,40,38,45,42,50,48,55,52,60] },
  { id:'altcoin',      name:'Altcoin Growth Fund',     class:'Crypto',       icon:'ALT',  iconBg:'#06B6D4', daily:1.80, roi:'657%',  dur:30,  min:300,   risk:4, investors:2156, spots:null,  badge:null,        spark:[25,27,26,29,28,31,30,33,32,35,34,37,36,39,38,41,40,43,42,45] },
  { id:'btc-micro',    name:'Micro BTC Accumulator',   class:'Crypto',       icon:'BTC',  iconBg:'#F7931A', daily:0.80, roi:'292%',  dur:60,  min:100,   risk:2, investors:8910, spots:null,  badge:'Beginner',  spark:[30,31,32,31,33,34,33,35,36,35,37,38,37,39,40,39,41,40,42,43] },
  { id:'web3-venture', name:'Web3 Venture Capital',    class:'Crypto',       icon:'WEB3', iconBg:'#10B981', daily:2.20, roi:'803%',  dur:20,  min:3000,  risk:4, investors:412,  spots:10,    badge:'VIP',       spark:[20,23,22,26,25,29,28,32,31,35,34,38,37,41,40,44,43,47,46,50] },

  // ── Stocks ──
  { id:'us-tech',      name:'US Tech Growth',          class:'Stocks',       icon:'STK',  iconBg:'#3B82F6', daily:0.55, roi:'201%',  dur:90,  min:500,   risk:2, investors:5621, spots:null,  badge:'Stable',    spark:[40,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48,47,49,48,50] },
  { id:'dividend',     name:'Dividend Income Fund',    class:'Stocks',       icon:'DIV',  iconBg:'#059669', daily:0.30, roi:'109%',  dur:180, min:1000,  risk:1, investors:7234, spots:null,  badge:'Low Risk',   spark:[30,31,30,32,31,33,32,34,33,35,34,36,35,37,36,38,37,39,38,40] },
  { id:'sp500',        name:'S&P 500 Index',            class:'Stocks',       icon:'SPX',  iconBg:'#6366F1', daily:0.40, roi:'146%',  dur:120, min:200,   risk:2, investors:9823, spots:null,  badge:'Most Stable',spark:[35,36,35,37,36,38,37,39,38,40,39,41,40,42,41,43,42,44,43,45] },
  { id:'blue-chip',    name:'Blue Chip Portfolio',      class:'Stocks',       icon:'CHP',  iconBg:'#8B5CF6', daily:0.60, roi:'219%',  dur:90,  min:2000,  risk:2, investors:3456, spots:null,  badge:null,        spark:[38,39,38,40,39,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48] },
  { id:'ai-stocks',    name:'AI & Robotics ETF',        class:'Stocks',       icon:'AI',   iconBg:'#0EA5E9', daily:0.75, roi:'274%',  dur:60,  min:500,   risk:3, investors:2187, spots:null,  badge:'Trending',  spark:[20,23,22,26,25,29,28,32,31,35,34,38,37,41,40,44,43,47,46,50] },

  // ── Real Estate ──
  { id:'reit-us',      name:'US REIT Income',           class:'Real Estate',  icon:'REIT', iconBg:'#D97706', daily:0.45, roi:'164%',  dur:120, min:1000,  risk:2, investors:4231, spots:null,  badge:'Stable',    spark:[40,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48,47,49,48,50] },
  { id:'reit-asia',    name:'Asia Property Fund',       class:'Real Estate',  icon:'REIT', iconBg:'#B45309', daily:0.60, roi:'219%',  dur:90,  min:2000,  risk:3, investors:1820, spots:null,  badge:null,        spark:[30,32,31,34,33,36,35,38,37,40,39,42,41,44,43,46,45,48,47,50] },
  { id:'dev-fund',     name:'Property Dev Fund',        class:'Real Estate',  icon:'DEV',  iconBg:'#92400E', daily:1.10, roi:'401%',  dur:45,  min:5000,  risk:3, investors:623,  spots:15,    badge:'High Yield', spark:[20,22,24,23,26,28,27,30,32,31,34,36,35,38,40,42,41,44,46,48] },
  { id:'reit-global',  name:'Global Property Index',   class:'Real Estate',  icon:'GPI',  iconBg:'#7C3AED', daily:0.38, roi:'138%',  dur:180, min:500,   risk:1, investors:6341, spots:null,  badge:'Long Term',  spark:[38,39,38,40,39,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48] },

  // ── Bonds ──
  { id:'us-treasury',  name:'US Treasury Bonds',       class:'Bonds',        icon:'BND',  iconBg:'#1D4ED8', daily:0.14, roi:'51%',   dur:365, min:100,   risk:1, investors:12847,spots:null,  badge:'Safest',    spark:[30,31,30,31,32,31,32,33,32,33,34,33,34,35,34,35,36,35,36,37] },
  { id:'corp-bond',    name:'Corporate Bond Fund',     class:'Bonds',        icon:'BND',  iconBg:'#2563EB', daily:0.20, roi:'73%',   dur:180, min:200,   risk:1, investors:8234, spots:null,  badge:'Safe',      spark:[32,33,32,33,34,33,34,35,34,35,36,35,36,37,36,37,38,37,38,39] },
  { id:'hi-yield-bond',name:'High Yield Bond',         class:'Bonds',        icon:'HYB',  iconBg:'#1E40AF', daily:0.35, roi:'128%',  dur:120, min:500,   risk:2, investors:3421, spots:null,  badge:null,        spark:[30,31,32,31,33,34,33,35,36,35,37,38,37,39,40,39,41,40,42,43] },
  { id:'em-bond',      name:'Emerging Markets Bond',   class:'Bonds',        icon:'EMB',  iconBg:'#1E3A8A', daily:0.28, roi:'102%',  dur:150, min:300,   risk:2, investors:2156, spots:null,  badge:null,        spark:[28,29,30,29,31,32,31,33,34,33,35,36,35,37,38,37,39,40,39,41] },

  // ── Fixed Income ──
  { id:'smart-save',   name:'Altaris Smart Save',      class:'Fixed Income', icon:'SAV',  iconBg:'#059669', daily:0.11, roi:'40%',   dur:365, min:500,   risk:1, investors:8241, spots:null,  badge:'Flagship', spark:[30,31,30,32,31,33,32,34,33,35,34,36,35,37,36,38,37,39,38,40] },
  { id:'stablecoin',   name:'Stablecoin Reserve',      class:'Fixed Income', icon:'USDT', iconBg:'#047857', daily:0.60, roi:'219%',  dur:60,  min:100,   risk:1, investors:15234,spots:null,  badge:'Beginner',  spark:[38,39,38,39,40,39,40,41,40,41,42,41,42,43,42,43,44,43,44,45] },

  // ── Commodities ──
  { id:'gold',         name:'Gold Reserve Fund',       class:'Commodities',  icon:'GLD',  iconBg:'#D97706', daily:0.32, roi:'117%',  dur:120, min:300,   risk:2, investors:5620, spots:null,  badge:'Safe Haven', spark:[35,36,35,37,36,38,37,39,38,40,39,41,40,42,41,43,42,44,43,45] },
  { id:'silver',       name:'Silver & Metals',         class:'Commodities',  icon:'SLV',  iconBg:'#9CA3AF', daily:0.28, roi:'102%',  dur:150, min:200,   risk:2, investors:2341, spots:null,  badge:null,        spark:[30,31,32,31,33,34,33,35,36,35,37,38,37,39,40,39,41,40,42,43] },
  { id:'energy',       name:'Oil & Energy Fund',       class:'Commodities',  icon:'OIL',  iconBg:'#92400E', daily:0.50, roi:'182%',  dur:90,  min:500,   risk:3, investors:1823, spots:null,  badge:null,        spark:[28,30,29,32,31,34,33,36,35,38,37,40,39,42,41,44,43,46,45,48] },

  // ── Forex ──
  { id:'usd-eur',      name:'USD/EUR Carry Trade',     class:'Forex',        icon:'FX',   iconBg:'#2563EB', daily:0.45, roi:'164%',  dur:90,  min:500,   risk:2, investors:3421, spots:null,  badge:null,        spark:[40,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48,47,49,48,50] },
  { id:'em-fx',        name:'Emerging Markets FX',     class:'Forex',        icon:'FX',   iconBg:'#7C3AED', daily:0.70, roi:'255%',  dur:45,  min:1000,  risk:3, investors:1234, spots:null,  badge:null,        spark:[25,27,26,29,28,31,30,33,32,35,34,37,36,39,38,41,40,43,42,45] },
  { id:'asia-fx',      name:'Asian Currency Fund',     class:'Forex',        icon:'FX',   iconBg:'#DC2626', daily:0.55, roi:'201%',  dur:60,  min:500,   risk:3, investors:981,  spots:null,  badge:null,        spark:[30,32,31,34,33,36,35,38,37,40,39,42,41,44,43,46,45,48,47,50] },

  // ── ETF ──
  { id:'clean-energy', name:'Clean Energy ETF',        class:'ETF',          icon:'ETF',  iconBg:'#16A34A', daily:0.48, roi:'175%',  dur:90,  min:300,   risk:2, investors:4231, spots:null,  badge:'ESG',       spark:[20,22,24,23,26,28,27,30,32,31,34,36,35,38,40,42,41,44,46,48] },
  { id:'health-etf',   name:'Healthcare & Biotech',    class:'ETF',          icon:'ETF',  iconBg:'#0891B2', daily:0.42, roi:'153%',  dur:120, min:300,   risk:2, investors:2341, spots:null,  badge:null,        spark:[35,36,35,37,36,38,37,39,38,40,39,41,40,42,41,43,42,44,43,45] },

  // ── Hedge ──
  { id:'global-macro', name:'Global Macro Strategy',  class:'Hedge',        icon:'HED',  iconBg:'#1D4ED8', daily:1.50, roi:'547%',  dur:30,  min:10000, risk:4, investors:128,  spots:8,     badge:'Platinum',  spark:[20,24,22,28,26,32,30,36,34,40,38,44,42,48,46,52,50,56,54,60] },
  { id:'longshort',    name:'Long/Short Equity',       class:'Hedge',        icon:'HED',  iconBg:'#7C3AED', daily:1.20, roi:'438%',  dur:30,  min:5000,  risk:4, investors:341,  spots:20,    badge:'Advanced',  spark:[22,26,24,30,28,34,32,38,36,42,40,46,44,50,48,54,52,58,56,62] },
]

const CATEGORIES = ['All','Crypto','DeFi','Stocks','Real Estate','Bonds','Fixed Income','Commodities','Forex','ETF','Hedge']
const CATEGORY_COLORS: Record<string,string> = {
  'Crypto':'#F7931A','DeFi':'#7C3AED','Stocks':'#3B82F6','Real Estate':'#D97706',
  'Bonds':'#1D4ED8','Fixed Income':'#059669','Commodities':'#D97706','Forex':'#2563EB','ETF':'#16A34A','Hedge':'#DC2626',
}

const PLANS_WITH_SHARP: PlanType[] = PLANS.map((plan) => ({ ...plan, icon: 'SHP', iconBg: '#F2BA0E', image: planImagePath(plan.id) }))

const EXTRA_PLANS = Array.from({ length: 70 }, (_, idx) => {
  const source = PLANS_WITH_SHARP[idx % PLANS_WITH_SHARP.length]
  const n = idx + 1
  const daily = Number((Math.max(0.25, source.daily + ((idx % 6) - 2) * 0.07)).toFixed(2))
  const dur = source.dur + (idx % 5) * 15
  const investors = source.investors + 300 + idx * 61
  const min = Math.max(100, source.min + (idx % 4) * 100)
  return {
    ...source,
    id: `${source.id}-hot-${n}`,
    name: `${source.name} Hot`,
    badge: idx % 3 === 0 ? 'Hot' : source.badge,
    daily,
    roi: `${Math.round(daily * dur * 2.6)}%`,
    dur,
    min,
    investors,
    spots: idx % 11 === 0 ? 12 - (idx % 6) : null,
    spark: source.spark.map((v, pointIdx) => v + ((idx + pointIdx) % 5) - 2),
    image: planImagePath(`${source.id}-hot-${n}`),
  }
})

const ALL_PLANS = [...PLANS_WITH_SHARP, ...EXTRA_PLANS]

export default function InvestPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <InvestPageContent />
    </Suspense>
  )
}

function InvestPageContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'marketplace'|'my'>(searchParams?.get('tab')==='my' ? 'my' : 'marketplace')
  const [category, setCategory] = useState('All')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'roi'|'popular'|'min'|'risk'>('popular')
  const [selected, setSelected] = useState<PlanType | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [userInvestments, setUserInvestments] = useState<any[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [liveMarkets, setLiveMarkets] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  useBodyScrollLock(!!selected)

  useEffect(() => {
    if (!selected) return
    requestAnimationFrame(() => setSheetOpen(true))
    return () => {
      setSheetOpen(false)
    }
  }, [selected])

  const openInvestSheet = (plan: PlanType) => {
    setSelected(plan)
    setAmount(String(plan.min))
    setMsg(null)
  }

  const closeInvestSheet = () => setSelected(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r=>r.json()).then(d=>{
      const bal = d.user?.balances?.find((b:any)=>b.currency==='USD')?.amount||0
      setBalance(bal)
    })
    fetch('/api/investments').then(r=>r.json()).then(d=>{
      setUserInvestments(d.investments||[])
      if (d.summary) setSummary(d.summary)
    })
    fetch('/api/markets/live').then(r=>r.json()).then(d=>setLiveMarkets(d.markets||[])).catch(()=>{})
  }, [])

  // Overlay real market data (sparklines, live price/change) onto the static plan definitions
  const enrichedPlans = useMemo(() => {
    const bySymbol: Record<string, any> = {}
    liveMarkets.forEach(m => { bySymbol[m.symbol] = m })
    return ALL_PLANS.map(plan => {
      const baseId = plan.id.replace(/-hot-\d+$/, '')
      const sym = PLAN_MARKET[baseId]
      const mkt = sym ? bySymbol[sym] : null
      return {
        ...plan,
        spark: (mkt?.spark?.length >= 10) ? mkt.spark : plan.spark,
        livePrice: mkt?.price ?? null,
        liveChange24h: mkt?.change24h ?? null,
        liveSymbol: sym ?? null,
        isYield: mkt?.isYield ?? false,
      }
    })
  }, [liveMarkets])

  const filtered = enrichedPlans
    .filter(p => category==='All' || p.class===category)
    .filter(p => q ? p.name.toLowerCase().includes(q.toLowerCase()) : true)
    .sort((a,b)=>{
      if (sortBy==='roi') return parseFloat(b.roi)-parseFloat(a.roi)
      if (sortBy==='min') return a.min-b.min
      if (sortBy==='risk') return a.risk-b.risk
      return b.investors-a.investors
    })

  const hotPlans = useMemo(() => enrichedPlans.filter(plan => plan.badge === 'Hot').slice(0, 18), [enrichedPlans])

  async function invest() {
    if (!selected) return
    const amt = parseFloat(amount)
    if (!amt || amt < selected.min) { setMsg({type:'error',text:`Minimum investment is $${selected.min}`}); return }
    if (amt > balance) { setMsg({type:'error',text:'Insufficient balance'}); return }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/investments', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ planId:selected.id, planName:selected.name, amount:amt, dailyRoi:selected.daily/100 })
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({type:'success',text:`Invested $${amt.toLocaleString()} in ${selected.name}!`})
      setSelected(null); setAmount('')
      fetch('/api/investments').then(r=>r.json()).then(d=>{ setUserInvestments(d.investments||[]); if(d.summary) setSummary(d.summary) })
      fetch('/api/user/profile').then(r=>r.json()).then(d=>{ const bal = d.user?.balances?.find((b:any)=>b.currency==='USD')?.amount||0; setBalance(bal) })
    } else { setMsg({type:'error',text:data.error}) }
    setLoading(false)
  }

  return (
    <div style={{ padding:'0 0 12px' }}>
      {/* Header */}
      <div style={{ padding:'8px 16px 0' }}>
        <p style={{ color:'var(--text-muted)', fontSize:12, marginBottom:14 }}>
          Balance: <strong style={{ color:'var(--text-primary)' }}>${balance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
        </p>

        {/* Search plans */}
        <div style={{ padding:'0 0 16px' }}>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/></svg>
            <input className="input" style={{ paddingLeft:36, borderRadius:99, fontSize:13 }} placeholder="Search plans..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'var(--bg-elevated)', borderRadius:99, padding:3, marginBottom:16, gap:2 }}>
          {[{id:'marketplace',l:'Marketplace'},{id:'my',l:`My Plans (${userInvestments.length})`}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              style={{ flex:1, padding:'9px', borderRadius:99, border:'none', background:tab===t.id?'var(--bg-card)':'transparent', color:tab===t.id?'var(--text-primary)':'var(--text-muted)', fontWeight:tab===t.id?700:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {tab==='marketplace' && <>

        {/* Category chips */}
        <div style={{ display:'flex', gap:7, overflowX:'auto', padding:'0 16px', marginBottom:12 }} className="no-scrollbar">
          {CATEGORIES.map(c=>{
            const color = CATEGORY_COLORS[c]
            const isActive = category===c
            return (
              <button key={c} onClick={()=>setCategory(c)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:99, border:'1px solid', borderColor: isActive?color||'var(--brand-primary)':'var(--border)', background: isActive?(color||'#F2BA0E')+'18':'var(--bg-card)', color: isActive?color||'var(--brand-primary)':'var(--text-muted)', fontWeight: isActive?700:500, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:'inherit', transition:'all .15s' }}>
                {c}
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <div style={{ display:'flex', gap:6, padding:'0 16px', marginBottom:16, overflowX:'auto' }} className="no-scrollbar">
          <span style={{ color:'var(--text-muted)', fontSize:11, alignSelf:'center', flexShrink:0 }}>Sort:</span>
          {[{id:'popular',l:'Popular'},{id:'roi',l:'Highest ROI'},{id:'min',l:'Min Investment'},{id:'risk',l:'Lowest Risk'}].map(s=>(
            <button key={s.id} onClick={()=>setSortBy(s.id as any)}
              style={{ padding:'5px 11px', borderRadius:99, border:'1px solid', borderColor:sortBy===s.id?'var(--brand-primary)':'var(--border)', background:sortBy===s.id?'rgba(242,186,14,0.1)':'transparent', color:sortBy===s.id?'var(--brand-primary)':'var(--text-muted)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
              {s.l}
            </button>
          ))}
        </div>


        <div style={{ padding:'0 16px', marginBottom:14 }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8, fontWeight:700, letterSpacing:'0.06em' }}>HOT</div>
          <div style={{ display:'flex', gap:10, overflowX:'auto' }} className="no-scrollbar">
            {hotPlans.map(plan => {
              const hColor = CATEGORY_COLORS[plan.class] || '#F2BA0E'
              const hp = plan as any
              return (
                <button key={plan.id} onClick={()=>openInvestSheet(plan)}
                  style={{ minWidth:220, textAlign:'left', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:12, color:'var(--text-primary)', fontFamily:'inherit' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:`${hColor}1A`, border:`1px solid ${hColor}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <img src={plan.image} alt={plan.name} style={{ width:18, height:18, objectFit:'contain' }} />
                    </div>
                    <div style={{ fontWeight:700, fontSize:12, lineHeight:1.2 }}>{plan.name}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:18, fontWeight:900, color:'var(--brand-primary)' }}>{plan.daily}%</span>
                    {hp.liveChange24h != null && (
                      <span style={{ fontSize:9, fontWeight:700, color: hp.liveChange24h >= 0 ? '#0ECB81' : '#F6465D' }}>
                        {hp.liveChange24h >= 0 ? '+' : ''}{hp.liveChange24h.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:8 }}>daily · min ${plan.min.toLocaleString()}</div>
                  <Sparkline data={plan.spark} color={hColor} width={190} height={34} />
                </button>
              )
            })}
          </div>
        </div>

        {msg && (
          <div style={{ margin:'0 16px 12px', padding:'11px 14px', borderRadius:10, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)', fontSize:13, fontWeight:600 }}>
            {msg.text}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(plan => {
            const catColor = CATEGORY_COLORS[plan.class] || '#F2BA0E'
            return (
              <div key={plan.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, cursor:'pointer', transition:'all .15s' }}
                role="button" tabIndex={0}
                onClick={()=>openInvestSheet(plan)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvestSheet(plan) } }}
                className="pressable">
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  {/* Provider icon — clean SVG in a category-coloured container */}
                  <div style={{ width:54, height:54, borderRadius:14, background:`${catColor}1A`, border:`1px solid ${catColor}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <img src={plan.image} alt={plan.name} style={{ width:32, height:32, objectFit:'contain' }} />
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:5 }}>
                      <div>
                        {/* Class + badge */}
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:catColor, background:catColor+'18', padding:'2px 7px', borderRadius:99, border:`1px solid ${catColor}28` }}>{plan.class}</span>
                          {plan.badge && <span style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', background:'var(--bg-elevated)', padding:'2px 7px', borderRadius:99 }}>{plan.badge}</span>}
                        </div>
                        <div style={{ fontWeight:700, fontSize:15, lineHeight:1.2 }}>{plan.name}</div>
                      </div>
                      {/* ROI big */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:20, fontWeight:900, color:'var(--brand-primary)' }}>{plan.daily}%</div>
                        <div style={{ color:'var(--text-muted)', fontSize:10 }}>daily</div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
                      {[
                        {l:'Duration',v:`${plan.dur}d`},
                        {l:'Min',v:`$${plan.min.toLocaleString()}`},
                        {l:'Investors',v:plan.investors.toLocaleString()},
                        {l:'Ann. ROI',v:plan.roi},
                      ].map(({l,v})=>(
                        <div key={l}>
                          <div style={{ color:'var(--text-muted)', fontSize:9, fontWeight:500 }}>{l}</div>
                          <div style={{ fontWeight:700, fontSize:12, marginTop:1 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Risk bar + sparkline */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: (plan as any).livePrice != null ? 8 : 0 }}>
                      <div>
                        <div style={{ color:'var(--text-muted)', fontSize:9, marginBottom:4 }}>RISK LEVEL</div>
                        <RiskBar level={plan.risk}/>
                      </div>
                      <Sparkline data={plan.spark} color={catColor} width={80} height={30}/>
                    </div>

                    {/* Live market price row (real data from provider) */}
                    {(plan as any).livePrice != null && (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:7, background:'var(--bg-elevated)', marginBottom:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:'#0ECB81', animation:'pulseLive 1.5s infinite' }}/>
                          <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)' }}>
                            {(plan as any).liveSymbol} Live
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ fontSize:12, fontWeight:800 }}>
                            {(plan as any).isYield
                              ? `${(plan as any).livePrice}% APY`
                              : (plan as any).livePrice >= 100
                                ? `$${(plan as any).livePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                                : (plan as any).livePrice >= 1
                                  ? `$${(plan as any).livePrice.toFixed(4)}`
                                  : `$${(plan as any).livePrice.toFixed(6)}`}
                          </span>
                          {(plan as any).liveChange24h != null && !(plan as any).isYield && (
                            <span style={{ fontSize:9, fontWeight:800, padding:'2px 5px', borderRadius:4, background:(plan as any).liveChange24h >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)', color:(plan as any).liveChange24h >= 0 ? '#0ECB81' : '#F6465D' }}>
                              {(plan as any).liveChange24h >= 0 ? '+' : ''}{(plan as any).liveChange24h.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Scarcity */}
                    {plan.spots && (
                      <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#F6465D', animation:'pulseLive 1.5s infinite' }}/>
                        <span style={{ color:'#F6465D', fontSize:11, fontWeight:700 }}>{plan.spots} spots remaining</span>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={(e)=>{e.stopPropagation(); openInvestSheet(plan)}} style={{ width:'100%', marginTop:14, padding:'11px', background:'rgba(242,186,14,0.1)', color:'var(--brand-primary)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Invest Now
                </button>
              </div>
            )
          })}
        </div>
      </>}

      {tab==='my' && (
        <div style={{ padding:'0 16px' }}>
          {userInvestments.length===0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ width:72, height:72, borderRadius:24, background:'rgba(242,186,14,0.1)', border:'1px solid rgba(242,186,14,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <img src="/invest-icons/analytics.svg" alt="" style={{ width:38, height:38, objectFit:'contain' }} />
              </div>
              <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>No Active Investments</div>
              <div style={{ color:'var(--text-muted)', fontSize:14, marginBottom:24 }}>Start investing to grow your portfolio</div>
              <button onClick={()=>setTab('marketplace')} style={{ padding:'12px 28px', background:'var(--brand-primary)', color:'#000', borderRadius:10, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                Browse Plans
              </button>
            </div>
          ) : (
            <>
              {/* ── Portfolio Summary Card ── */}
              {summary && (
                <div style={{ background:'linear-gradient(135deg,rgba(242,186,14,0.12),rgba(14,203,129,0.08))', border:'1px solid rgba(242,186,14,0.2)', borderRadius:16, padding:16, marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:10 }}>PORTFOLIO OVERVIEW</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    <div>
                      <div style={{ color:'var(--text-muted)', fontSize:10 }}>Total Invested</div>
                      <div style={{ fontWeight:900, fontSize:20, color:'var(--text-primary)' }}>${summary.totalInvested.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                    <div>
                      <div style={{ color:'var(--text-muted)', fontSize:10 }}>Total Value</div>
                      <div style={{ fontWeight:900, fontSize:20, color:'var(--text-primary)' }}>${summary.totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <div style={{ color:'var(--text-muted)', fontSize:10 }}>Profit Earned</div>
                      <div style={{ fontWeight:800, fontSize:16, color:'#0ECB81' }}>+${summary.totalProfit.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                    <div>
                      <div style={{ color:'var(--text-muted)', fontSize:10 }}>Daily Earning</div>
                      <div style={{ fontWeight:800, fontSize:16, color:'#F2BA0E' }}>+${summary.dailyEarning.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}/day</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Investment Cards ── */}
              {userInvestments.map((inv:any) => {
                const isActive = inv.status === 'ACTIVE'
                const isCompleted = inv.status === 'COMPLETED'
                const prog = inv.progressPct ?? 0
                const daysLeft = inv.daysRemaining ?? 0

                return (
                  <div key={inv.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:10, position:'relative', overflow:'hidden' }}>
                    {/* Subtle glow for active */}
                    {isActive && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#F2BA0E,#0ECB81)', opacity:0.6 }}/>}

                    {/* Header row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{inv.planName}</div>
                        <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:2 }}>{(inv.dailyRoi*100).toFixed(2)}% daily ROI · {inv.totalDurationDays}d plan</div>
                      </div>
                      <span style={{ padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:800, background: isCompleted?'rgba(14,203,129,0.1)':isActive?'rgba(242,186,14,0.1)':'rgba(246,70,93,0.1)', color: isCompleted?'#0ECB81':isActive?'#F2BA0E':'#F6465D', border:`1px solid ${isCompleted?'rgba(14,203,129,0.2)':isActive?'rgba(242,186,14,0.2)':'rgba(246,70,93,0.2)'}` }}>
                        {inv.status}
                      </span>
                    </div>

                    {/* Main values */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:3 }}>Invested</div>
                        <div style={{ fontWeight:800, fontSize:17 }}>${inv.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      </div>
                      <div style={{ background: inv.hasStartedEarning ? 'rgba(14,203,129,0.07)' : 'rgba(242,186,14,0.07)', border:`1px solid ${inv.hasStartedEarning?'rgba(14,203,129,0.15)':'rgba(242,186,14,0.15)'}`, borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:3 }}>Profit Earned</div>
                        {inv.hasStartedEarning ? (
                          <div style={{ fontWeight:800, fontSize:17, color:'#0ECB81' }}>+${inv.profitEarned.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                        ) : (
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:'#F2BA0E' }}>Starts in {inv.hoursUntilProfit}h</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>24h activation period</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:3 }}>Total Value</div>
                        <div style={{ fontWeight:800, fontSize:15 }}>${inv.totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      </div>
                      <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:3 }}>{isCompleted?'Final Profit':'Daily Earning'}</div>
                        <div style={{ fontWeight:800, fontSize:15, color:'#0ECB81' }}>+${inv.dailyProfit.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}/day</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ background:'var(--bg-elevated)', borderRadius:99, height:6, overflow:'hidden', marginBottom:6 }}>
                      <div style={{ height:'100%', background:`linear-gradient(90deg,#F2BA0E,${inv.hasStartedEarning?'#0ECB81':'#F2BA0E'})`, width:`${prog}%`, borderRadius:99, transition:'width .5s' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:10, fontWeight:600 }}>
                      <span>{Math.round(prog)}% complete</span>
                      <span>{isCompleted ? 'Completed' : `${Math.ceil(daysLeft)}d remaining`}</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Invest Modal ── */}
      {selected && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:120, transition:'opacity .25s ease', opacity: sheetOpen ? 1 : 0 }}
          onClick={e=>{if(e.target===e.currentTarget)closeInvestSheet()}}
        >
          <div
            style={{
              position:'fixed',
              left:0,
              right:0,
              bottom:'calc(78px + env(safe-area-inset-bottom))',
              margin:'0 auto',
              transform:`translateY(${sheetOpen ? '0%' : '110%'})`,
              transition:'transform .25s ease',
              background:'var(--bg-card)',
              borderRadius:'20px 20px 16px 16px',
              width:'calc(100% - 16px)',
              maxWidth:480,
              border:'1px solid var(--border)',
              maxHeight:'calc(100svh - 110px - env(safe-area-inset-bottom))',
              display:'flex',
              flexDirection:'column',
              overflow:'hidden'
            }}
          >
            <div style={{ padding:'14px 24px 0' }}><div style={{ width:40, height:4, background:'var(--bg-elevated)', borderRadius:2, margin:'0 auto 14px' }}/></div><div style={{ padding:'0 24px', overflowY:'auto', overscrollBehavior:'contain', WebkitOverflowScrolling:'touch', touchAction:'pan-y' }}>

            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`${selected.iconBg}1A`, border:`1px solid ${selected.iconBg}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <img src={selected.image} alt={selected.name} style={{ width:28, height:28, objectFit:'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:18 }}>{selected.name}</div>
                <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:2 }}>{selected.class} · {selected.dur} days · {selected.daily}% daily</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[{l:'Daily ROI',v:`${selected.daily}%`,c:'var(--brand-primary)'},{l:'Annual ROI',v:selected.roi},{l:'Min',v:`$${selected.min}`}].map(({l,v,c})=>(
                <div key={l} style={{ background:'var(--bg-elevated)', borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:4 }}>{l}</div>
                  <div style={{ fontWeight:800, fontSize:16, color:c||'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            <label style={{ display:'block', color:'var(--text-muted)', fontSize:12, marginBottom:7 }}>Investment Amount (USD)</label>
            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontWeight:700, color:'var(--text-muted)', fontSize:18 }}>$</span>
              <input style={{ width:'100%', background:'var(--bg-input)', color:'var(--text-primary)', padding:'14px 14px 14px 34px', borderRadius:10, border:'1px solid var(--border)', fontSize:22, fontWeight:800, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }}
                type="number" value={amount} onChange={e=>{setAmount(e.target.value);setMsg(null)}}
                onFocus={e=>(e.target.style.borderColor='var(--brand-primary)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            </div>

            <div style={{ display:'flex', gap:7, marginBottom:14 }}>
              {[selected.min, selected.min*2, selected.min*5, selected.min*10].map(v=>(
                <button key={v} onClick={()=>setAmount(String(v))}
                  style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-muted)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  ${v.toLocaleString()}
                </button>
              ))}
            </div>

            {amount && parseFloat(amount)>=selected.min && (
              <div style={{ background:'rgba(14,203,129,0.05)', border:'1px solid rgba(14,203,129,0.15)', borderRadius:12, padding:14, marginBottom:16 }}>
                <div style={{ color:'var(--text-muted)', fontSize:11, marginBottom:8, fontWeight:600 }}>PROFIT ESTIMATE</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    {l:'Daily Profit',v:`+$${(parseFloat(amount)*selected.daily/100).toFixed(2)}`},
                    {l:'Total Return',v:`+$${(parseFloat(amount)*selected.daily/100*selected.dur).toFixed(2)}`},
                  ].map(({l,v})=>(
                    <div key={l}><div style={{color:'var(--text-muted)',fontSize:10}}>{l}</div><div style={{color:'var(--success)',fontWeight:800,fontSize:16,marginTop:2}}>{v}</div></div>
                  ))}
                </div>
              </div>
            )}

            </div>

            <div style={{ padding:'12px 24px calc(env(safe-area-inset-bottom) + 14px)', borderTop:'1px solid var(--border)', background:'var(--bg-card)' }}>
              {msg && <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:14, fontSize:13, fontWeight:600, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)' }}>{msg.text}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
                <button onClick={closeInvestSheet} className="btn-ghost">Cancel</button>
                <button onClick={invest} disabled={loading||!amount||parseFloat(amount)<selected.min}
                  style={{ padding:'14px', background:'#F2BA0E', color:'#000', border:'none', borderRadius:10, fontWeight:800, fontSize:15, cursor:'pointer', opacity:loading?0.7:1, fontFamily:'inherit' }} className="pressable">
                  {loading ? 'Investing...' : `Invest $${parseFloat(amount||'0').toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
