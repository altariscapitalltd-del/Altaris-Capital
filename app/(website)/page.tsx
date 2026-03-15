'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'

// ── helpers ───────────────────────────────────────────────────────────────────

function useLivePrice() {
  const [prices, setPrices] = useState<Record<string,any>>({})
  useEffect(() => {
    const load = () => fetch('/api/market').then(r=>r.json()).then(setPrices).catch(()=>{})
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])
  return prices
}

function MiniSpark({ data, color, w=80, h=32 }: { data:number[]; color:string; w?:number; h?:number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr)
    const min=Math.min(...data), max=Math.max(...data), rng=max-min||1
    const xs=data.map((_,i)=>(i/(data.length-1))*w)
    const ys=data.map(v=>h-((v-min)/rng)*(h-4)-2)
    ctx.clearRect(0,0,w,h)
    const g=ctx.createLinearGradient(0,0,0,h)
    g.addColorStop(0,color+'30');g.addColorStop(1,color+'00')
    ctx.beginPath();ctx.moveTo(xs[0],ys[0]);xs.forEach((_,i)=>i&&ctx.lineTo(xs[i],ys[i]))
    ctx.lineTo(xs[xs.length-1],h);ctx.lineTo(xs[0],h);ctx.closePath();ctx.fillStyle=g;ctx.fill()
    ctx.beginPath();ctx.moveTo(xs[0],ys[0]);xs.forEach((_,i)=>i&&ctx.lineTo(xs[i],ys[i]))
    ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.stroke()
  },[data,color,w,h])
  return <canvas ref={ref} style={{ width:w, height:h, display:'block' }}/>
}

function UiGlyph({ kind, color = '#F2BA0E', size = 22 }: { kind: string; color?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'security') return <svg {...common}><path d='M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z'/><path d='M9 12l2 2 4-4'/></svg>
  if (kind === 'speed') return <svg {...common}><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>
  if (kind === 'ai') return <svg {...common}><rect x='4' y='4' width='16' height='16' rx='4'/><path d='M9 9h.01M15 9h.01M8 15h8'/></svg>
  if (kind === 'global') return <svg {...common}><circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18'/></svg>
  if (kind === 'chart') return <svg {...common}><path d='M4 19V5'/><path d='M4 19h16'/><path d='M8 14l3-3 3 2 4-5'/></svg>
  if (kind === 'target') return <svg {...common}><circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='4'/><circle cx='12' cy='12' r='1'/></svg>
  if (kind === 'account') return <svg {...common}><circle cx='12' cy='8' r='4'/><path d='M4 20c2-3 5-4 8-4s6 1 8 4'/></svg>
  if (kind === 'kyc') return <svg {...common}><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8 9h8M8 13h8M8 17h4'/></svg>
  if (kind === 'invest') return <svg {...common}><path d='M4 18l6-6 4 4 6-8'/><path d='M14 8h6v6'/></svg>
  return <svg {...common}><circle cx='12' cy='12' r='9'/></svg>
}

function Counter({ to, prefix='', suffix='' }: { to:number; prefix?:string; suffix?:string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      ob.disconnect()
      const dur=1800, start=Date.now()
      const tick=()=>{
        const p=Math.min(1,(Date.now()-start)/dur)
        const ease=1-Math.pow(1-p,3)
        setV(Math.round(ease*to))
        if(p<1)requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold:0.3 })
    if(ref.current) ob.observe(ref.current)
    return ()=>ob.disconnect()
  },[to])
  return <span ref={ref}>{prefix}{v.toLocaleString()}{suffix}</span>
}

// ── static data ───────────────────────────────────────────────────────────────

const COINS = [
  { sym:'BTC', name:'Bitcoin',  color:'#F7931A', spark:[42,44,43,46,45,48,50,49,53,55,58,60,62,61,65,63,68,66,70,72] },
  { sym:'ETH', name:'Ethereum', color:'#627EEA', spark:[30,32,31,33,35,38,37,39,40,42,41,43,42,44,43,45,44,46,48,47] },
  { sym:'SOL', name:'Solana',   color:'#9945FF', spark:[20,24,23,28,27,30,34,35,38,40,42,41,45,47,48,50,52,51,54,56] },
  { sym:'BNB', name:'BNB',      color:'#F0B90B', spark:[50,52,51,53,52,54,55,54,56,55,57,56,55,54,56,55,58,57,59,58] },
]

const PLANS = [
  { name:'Stablecoin Reserve',  roi:'0.6% daily', dur:'60 days', min:'$100',   risk:1, cat:'CRYPTO',   color:'#0ECB81' },
  { name:'Altaris Smart Save',  roi:'40% / year', dur:'1 year',  min:'$500',   risk:1, cat:'BONDS',    color:'#3B82F6' },
  { name:'Blue Chip Equities',  roi:'1.2% daily', dur:'90 days', min:'$1,000', risk:2, cat:'STOCKS',   color:'#A78BFA' },
  { name:'Prime Real Estate',   roi:'1.8% daily', dur:'180 days',min:'$2,500', risk:2, cat:'REAL EST', color:'#F97316' },
  { name:'DeFi Accelerator',    roi:'3.5% daily', dur:'7 days',  min:'$2,000', risk:3, cat:'DEFI',     color:'#F6465D' },
  { name:'Commodity Hedge',     roi:'1.0% daily', dur:'120 days',min:'$1,500', risk:2, cat:'COMMOD',   color:'#F2BA0E' },
]

const FEATURES = [
  { icon:'security', title:'Bank-Grade Security',   desc:'Multi-layer encryption, 2FA, biometrics, and real-time fraud detection protect every account.' },
  { icon:'speed', title:'Instant Confirmation',  desc:'Deposits appear in seconds. Our 24/7 automated system never sleeps.' },
  { icon:'ai', title:'AI-Powered Returns',    desc:'Machine learning models optimise your portfolio across 200+ market signals daily.' },
  { icon:'global', title:'Global Access',         desc:'Available in 150+ countries. Multilingual support. Withdraw in your local currency.' },
  { icon:'chart', title:'Live Portfolio Tracker',desc:'Real-time charts, ROI projections, and daily profit summaries at a glance.' },
  { icon:'target', title:'Tailored Strategies',   desc:'From conservative bonds to high-yield crypto — pick a plan that matches your risk appetite.' },
]

const TESTIMONIALS = [
  { name:'David M.', loc:'London, UK',      role:'Retired Engineer',    text:"I started with $500 on the Smart Save plan. Six months later I'm reinvesting my earnings. The dashboard is clean, payouts are on time, every single month.",     init:'D', color:'#F2BA0E' },
  { name:'Sarah K.', loc:'Toronto, Canada', role:'Marketing Manager',   text:"Withdrew twice without any issues. Verification took 10 minutes. Compared to my old broker, Altaris feels like the future.",                                     init:'S', color:'#0ECB81' },
  { name:'James T.', loc:'Lagos, Nigeria',  role:'Tech Entrepreneur',   text:"The DeFi plan doubled my initial in 3 weeks. High risk, yes — but the transparency and real-time earnings tracker made me comfortable taking the leap.",         init:'J', color:'#A78BFA' },
  { name:'Priya R.', loc:'Dubai, UAE',      role:'Financial Analyst',   text:"As someone who works in finance, I was sceptical. The KYC process, segregated funds policy, and audit trail won me over. I've since referred 4 colleagues.",    init:'P', color:'#3B82F6' },
]

const FAQ = [
  { q:'How do I get started?', a:'Create a free account, complete a quick identity check (under 10 min), fund your wallet, and pick a plan. Your first earnings appear the next day.' },
  { q:'What is the minimum investment?', a:'Plans start from $100 on our Stablecoin Reserve. Every plan has a clearly stated minimum on the Marketplace page.' },
  { q:'How is my money protected?', a:'Client funds are held in segregated multi-sig cold wallets. We never mix client funds with company assets, and every balance is auditable.' },
  { q:'When can I withdraw?', a:'After KYC approval you can withdraw anytime. Requests are processed within 24 hours, 7 days a week.' },
  { q:'Which cryptocurrencies are accepted?', a:'BTC, ETH, and USDT (ERC-20 & TRC-20). More networks rolling out in Q3 2025.' },
  { q:'Are returns guaranteed?', a:'All ROI figures are based on historical performance and model projections. Markets carry inherent risk — we optimise to minimise it.' },
  { q:'Is there a referral programme?', a:'Yes. Refer a friend and earn $25 for every verified referral who deposits $500+. Track referrals from your dashboard.' },
]

// ── component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const prices = useLivePrice()
  const [openFaq, setOpenFaq] = useState<number|null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const COIN_DATA = COINS.map(c => ({ ...c, d: prices[c.sym] }))

  return (
    <div style={{ background:'#000', color:'#fff', fontFamily:'Inter,-apple-system,sans-serif', overflowX:'hidden' }}>

      {/* ── Sticky Nav ────────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, height:64, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', background: scrolled ? 'rgba(0,0,0,0.95)' : 'transparent', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent', backdropFilter: scrolled ? 'blur(24px)' : 'none', transition:'all .3s' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none', color:'#fff' }}>
          <AltarisLogoMark size={34} />
          <div>
            <div style={{ fontWeight:800, fontSize:14, letterSpacing:'0.08em' }}>ALTARIS</div>
            <div style={{ color:'#505050', fontSize:9, letterSpacing:'0.16em', lineHeight:1 }}>CAPITAL</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }} className="nav-desktop">
          {[['#features','Features'],['#plans','Plans'],['#markets','Markets'],['#testimonials','Reviews'],['#faq','FAQ']].map(([h,l]) => (
            <a key={h} href={h} style={{ padding:'8px 14px', color:'#666', textDecoration:'none', fontSize:13, fontWeight:500, borderRadius:8, transition:'color .15s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='#fff')} onMouseLeave={e=>(e.currentTarget.style.color='#666')}>{l}</a>
          ))}
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)', margin:'0 6px' }}/>
          <Link href="/login" style={{ padding:'9px 18px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', color:'#ccc', textDecoration:'none', fontSize:13, fontWeight:600 }}>Sign In</Link>
          <Link href="/signup" style={{ padding:'9px 20px', borderRadius:9, background:'#F2BA0E', color:'#000', textDecoration:'none', fontSize:13, fontWeight:800 }}>Get Started →</Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen(o => !o)} className="nav-mobile" style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:8 }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/></svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.97)', zIndex:99, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, fontSize:22, fontWeight:700 }}>
          <button onClick={() => setMobileMenuOpen(false)} style={{ position:'absolute', top:20, right:20, background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:28 }}>×</button>
          {[['#features','Features'],['#plans','Plans'],['#markets','Markets'],['#testimonials','Reviews'],['#faq','FAQ']].map(([h,l]) => (
            <a key={h} href={h} onClick={() => setMobileMenuOpen(false)} style={{ color:'#fff', textDecoration:'none' }}>{l}</a>
          ))}
          <Link href="/login"  onClick={() => setMobileMenuOpen(false)} style={{ padding:'12px 40px', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, color:'#ccc', textDecoration:'none', fontSize:15 }}>Sign In</Link>
          <Link href="/signup" onClick={() => setMobileMenuOpen(false)} style={{ padding:'14px 48px', background:'#F2BA0E', borderRadius:12, color:'#000', textDecoration:'none', fontSize:15, fontWeight:800 }}>Get Started →</Link>
        </div>
      )}

      {/* ── Ticker ────────────────────────────────────────────────────── */}
      <div style={{ background:'#0A0A0A', borderBottom:'1px solid rgba(255,255,255,0.05)', overflow:'hidden', height:38 }}>
        <div style={{ display:'flex', alignItems:'center', height:38, animation:'ticker 30s linear infinite', width:'200%', whiteSpace:'nowrap' }}>
          {[...COIN_DATA, ...COIN_DATA].map((c, i) => (
            <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'0 32px', borderRight:'1px solid rgba(255,255,255,0.04)', height:'100%', flexShrink:0 }}>
              <span style={{ color:c.color, fontWeight:700, fontSize:13 }}>{c.sym}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{c.d?.price ? `$${c.d.price.toLocaleString()}` : '—'}</span>
              {c.d?.change24h !== undefined && (
                <span style={{ fontSize:11, fontWeight:700, color: c.d.change24h >= 0 ? '#0ECB81' : '#F6465D', background: c.d.change24h >= 0 ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', padding:'1px 6px', borderRadius:4 }}>
                  {c.d.change24h >= 0 ? '+' : ''}{c.d.change24h?.toFixed(2)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{ minHeight:'90vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 60px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.06),transparent 60%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'50%', left:'20%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.05),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%', right:'15%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.04),transparent 70%)', pointerEvents:'none' }}/>

        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 16px', borderRadius:99, background:'rgba(242,186,14,0.08)', border:'1px solid rgba(242,186,14,0.2)', marginBottom:28, fontSize:12, fontWeight:600, color:'#F2BA0E' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#F2BA0E', animation:'pulseLive 2s infinite' }}/>
          500,000+ Investors • $2.4B+ AUM
        </div>

        <h1 style={{ fontSize:'clamp(38px, 7vw, 76px)', fontWeight:900, lineHeight:1.08, marginBottom:24, maxWidth:800, letterSpacing:'-1.5px' }}>
          Invest smarter.<br/>
          <span style={{ background:'linear-gradient(90deg, #F2BA0E 0%, #FFD23A 40%, #F2BA0E 80%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', backgroundSize:'200%', animation:'shimmer 3s linear infinite' }}>
            Grow faster.
          </span>
        </h1>

        <p style={{ fontSize:'clamp(15px, 2.2vw, 19px)', color:'#555', maxWidth:560, lineHeight:1.7, marginBottom:40 }}>
          Institutional-grade investment strategies for everyone. Start with $100 and watch AI-powered compounding work 24/7.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:60 }}>
          <Link href="/signup" style={{ padding:'16px 36px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:12, fontWeight:800, fontSize:16, letterSpacing:'0.01em', transition:'all .15s' }}>
            Start Investing Free →
          </Link>
          <Link href="#plans" style={{ padding:'16px 32px', background:'rgba(255,255,255,0.04)', color:'#ccc', textDecoration:'none', borderRadius:12, fontWeight:600, fontSize:15, border:'1px solid rgba(255,255,255,0.09)' }}>
            View Plans
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:0, flexWrap:'wrap', justifyContent:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, overflow:'hidden', maxWidth:680, width:'100%' }}>
          {[
            { v:2400000000, prefix:'$', suffix:'+', label:'Assets Under Management', short:'AUM' },
            { v:500000, suffix:'+', label:'Active Investors' },
            { v:99, suffix:'.97% Uptime', label:'Platform Reliability' },
            { v:150, suffix:'+', label:'Countries Supported' },
          ].map(({ v, prefix='', suffix='', label }, i) => (
            <div key={label} style={{ flex:'1 1 140px', padding:'24px 20px', textAlign:'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontSize:'clamp(20px, 3vw, 28px)', fontWeight:900, color:'#F2BA0E', marginBottom:4 }}>
                <Counter to={v} prefix={prefix} suffix={suffix} />
              </div>
              <div style={{ color:'#444', fontSize:12 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Markets ──────────────────────────────────────────────── */}
      <section id="markets" style={{ padding:'80px 24px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:'clamp(26px, 4vw, 40px)', fontWeight:900, marginBottom:12 }}>Live Market Prices</h2>
          <p style={{ color:'#555', fontSize:15 }}>Real-time data powering every investment decision</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
          {COIN_DATA.map(c => (
            <div key={c.sym} style={{ background:'#0E0E0E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:20, transition:'border-color .2s, transform .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=c.color+'40'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${c.color}15`, border:`1px solid ${c.color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:c.color }}>
                    {c.sym[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{c.sym}</div>
                    <div style={{ color:'#444', fontSize:11 }}>{c.name}</div>
                  </div>
                </div>
                {c.d?.change24h !== undefined && (
                  <span style={{ fontSize:12, fontWeight:700, color: c.d.change24h >= 0 ? '#0ECB81' : '#F6465D', background: c.d.change24h >= 0 ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', padding:'4px 9px', borderRadius:8 }}>
                    {c.d.change24h >= 0 ? '+' : ''}{c.d.change24h?.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize:22, fontWeight:900, marginBottom:10 }}>
                {c.d?.price ? `$${c.d.price.toLocaleString()}` : '—'}
              </div>
              <MiniSpark data={c.spark} color={c.d?.change24h !== undefined && c.d.change24h < 0 ? '#F6465D' : c.color} w={200} h={40}/>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" style={{ padding:'80px 24px', background:'#060606' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:99, background:'rgba(242,186,14,0.08)', border:'1px solid rgba(242,186,14,0.2)', color:'#F2BA0E', fontSize:12, fontWeight:700, marginBottom:14, letterSpacing:'0.05em' }}>WHY ALTARIS</div>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:12 }}>Built for serious investors</h2>
            <p style={{ color:'#555', fontSize:15, maxWidth:500, margin:'0 auto' }}>Every feature engineered to maximise performance and minimise risk.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ background:'#0E0E0E', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, padding:28, position:'relative', overflow:'hidden', transition:'border-color .2s, transform .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(242,186,14,0.2)'; (e.currentTarget as HTMLElement).style.transform='translateY(-3px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
                <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:'radial-gradient(circle at 100% 0%, rgba(242,186,14,0.06), transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ width:48, height:48, borderRadius:14, background:'rgba(242,186,14,0.07)', border:'1px solid rgba(242,186,14,0.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}><UiGlyph kind={f.icon} /></div>
                <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{f.title}</h3>
                <p style={{ color:'#555', fontSize:13, lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Investment Plans ──────────────────────────────────────────── */}
      <section id="plans" style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:99, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', color:'#3B82F6', fontSize:12, fontWeight:700, marginBottom:14, letterSpacing:'0.05em' }}>INVESTMENT PLANS</div>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:12 }}>30 plans across 10 asset classes</h2>
            <p style={{ color:'#555', fontSize:15 }}>Conservative to aggressive — we have a strategy for every goal.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12, marginBottom:36 }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ background:'#0E0E0E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:22, transition:'transform .2s, border-color .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.borderColor=p.color+'40' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)';  (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <span style={{ padding:'3px 10px', borderRadius:99, background:`${p.color}18`, border:`1px solid ${p.color}30`, color:p.color, fontSize:11, fontWeight:700 }}>{p.cat}</span>
                  <div style={{ display:'flex', gap:3 }}>
                    {[1,2,3].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background: i <= p.risk ? p.color : '#222' }}/>)}
                  </div>
                </div>
                <h3 style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>{p.name}</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[{l:'ROI',v:p.roi,c:p.color},{l:'Duration',v:p.dur},{l:'Minimum',v:p.min}].map(({l,v,c})=>(
                    <div key={l} style={{ background:'#161616', borderRadius:9, padding:'10px 12px' }}>
                      <div style={{ color:'#444', fontSize:10, marginBottom:3, fontWeight:600 }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:c||'#ddd' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center' }}>
            <Link href="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:12, fontWeight:800, fontSize:15 }}>
              View All 30 Plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section style={{ padding:'80px 24px', background:'#060606' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:99, background:'rgba(14,203,129,0.08)', border:'1px solid rgba(14,203,129,0.2)', color:'#0ECB81', fontSize:12, fontWeight:700, marginBottom:20, letterSpacing:'0.05em' }}>HOW IT WORKS</div>
          <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:14 }}>Start earning in 3 steps</h2>
          <p style={{ color:'#555', fontSize:15, marginBottom:60 }}>From signup to your first ROI — typically under 15 minutes.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:0, position:'relative' }}>
            {[
              { step:'01', title:'Create Account',   desc:'Sign up free. Verify your email in 60 seconds.', icon:'account', color:'#F2BA0E' },
              { step:'02', title:'Complete KYC',      desc:'Quick 5-step identity check. Usually approved in minutes.', icon:'kyc', color:'#A78BFA' },
              { step:'03', title:'Fund & Invest',     desc:'Deposit crypto or USD. Pick a plan. Earn daily.', icon:'invest', color:'#0ECB81' },
            ].map((s, i) => (
              <div key={s.step} style={{ padding:'32px 28px', background:'#0E0E0E', border:'1px solid rgba(255,255,255,0.06)', borderRadius: i===0 ? '18px 0 0 18px' : i===2 ? '0 18px 18px 0' : '0', borderLeft: i>0 ? 'none' : undefined, position:'relative' }}>
                <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:'#060606', padding:'0 12px', fontSize:11, fontWeight:800, color:s.color, letterSpacing:'0.1em' }}>STEP {s.step}</div>
                <div style={{ marginBottom:16, marginTop:8, display:'inline-flex', width:40, height:40, alignItems:'center', justifyContent:'center', borderRadius:12, background:'rgba(255,255,255,0.04)' }}><UiGlyph kind={s.icon} color={s.color} size={26} /></div>
                <h3 style={{ fontSize:17, fontWeight:800, marginBottom:10 }}>{s.title}</h3>
                <p style={{ color:'#555', fontSize:13, lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:36 }}>
            <Link href="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 36px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:12, fontWeight:800, fontSize:15 }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>


      <section style={{ padding:'24px 24px 80px' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:'clamp(22px, 3vw, 34px)', fontWeight:900, marginBottom:10 }}>See Altaris in action</h3>
            <p style={{ color:'#555', fontSize:14 }}>A short product walkthrough optimized for first-time visitors.</p>
          </div>
          <div style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', background:'#050505' }}>
            <video controls playsInline preload="metadata" style={{ width:'100%', display:'block' }} poster="/icons/icon-512x512.png">
              <source src="/videos/altaris-explainer.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:99, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', color:'#A78BFA', fontSize:12, fontWeight:700, marginBottom:14, letterSpacing:'0.05em' }}>TESTIMONIALS</div>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:12 }}>What our investors say</h2>
            <p style={{ color:'#555', fontSize:15 }}>Real stories from real users — not cherry-picked.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background:'#0E0E0E', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, padding:24, display:'flex', flexDirection:'column', gap:16, transition:'border-color .2s, transform .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor=`${t.color}30` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)' }}>
                {/* Stars */}
                <div style={{ display:'flex', gap:2 }}>{[...Array(5)].map((_,i)=><span key={i} style={{ color:'#F2BA0E', fontSize:13 }}>*</span>)}</div>
                <p style={{ color:'#999', fontSize:13, lineHeight:1.7, flex:1 }}>"{t.text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:`${t.color}20`, border:`1.5px solid ${t.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color:t.color, flexShrink:0 }}>{t.init}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{t.name}</div>
                    <div style={{ color:'#444', fontSize:11 }}>{t.role} · {t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bonus CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding:'0 24px 80px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', background:'linear-gradient(135deg, #1A1200 0%, #0F0A00 50%, #000 100%)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:24, padding:'60px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-60, right:-60, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(242,186,14,0.08), transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:99, background:'rgba(242,186,14,0.1)', border:'1px solid rgba(242,186,14,0.25)', color:'#F2BA0E', fontSize:12, fontWeight:700, marginBottom:20 }}>
             LIMITED TIME OFFER
          </div>
          <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:14 }}>
            Claim your <span style={{ color:'#F2BA0E' }}>$100 welcome bonus</span>
          </h2>
          <p style={{ color:'#666', fontSize:15, maxWidth:480, margin:'0 auto 32px', lineHeight:1.7 }}>
            Sign up, complete KYC, and make your first deposit to unlock $100 added directly to your investment balance.
          </p>
          <Link href="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'16px 44px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:14, fontWeight:900, fontSize:16 }}>
            Claim $100 Bonus →
          </Link>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding:'80px 24px', background:'#060606' }}>
        <div style={{ maxWidth:740, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 40px)', fontWeight:900, marginBottom:10 }}>Common questions</h2>
            <p style={{ color:'#555', fontSize:15 }}>Everything you need to know before investing.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background:'#0E0E0E', border:`1px solid ${openFaq===i ? 'rgba(242,186,14,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius:14, overflow:'hidden', transition:'border-color .2s' }}>
                <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
                  style={{ width:'100%', padding:'18px 20px', background:'none', border:'none', color:'#fff', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'inherit', fontSize:15, fontWeight:600, textAlign:'left', gap:12 }}>
                  <span>{f.q}</span>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={openFaq===i?'#F2BA0E':'#555'} strokeWidth="2.5" style={{ flexShrink:0, transition:'transform .25s', transform: openFaq===i ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {openFaq===i && (
                  <div style={{ padding:'0 20px 18px', color:'#666', fontSize:14, lineHeight:1.8, animation:'fadeIn .2s' }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <AltarisLogoMark size={52} />
          <h2 style={{ fontSize:'clamp(28px, 5vw, 52px)', fontWeight:900, marginTop:24, marginBottom:16, letterSpacing:'-0.5px' }}>
            Ready to grow<br/>your wealth?
          </h2>
          <p style={{ color:'#555', fontSize:16, marginBottom:36, lineHeight:1.7 }}>
            Join 500,000+ investors already compounding with Altaris Capital. Free to start. No hidden fees.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/signup" style={{ padding:'16px 44px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:14, fontWeight:900, fontSize:16 }}>
              Create Free Account →
            </Link>
            <Link href="/login" style={{ padding:'16px 32px', background:'rgba(255,255,255,0.04)', color:'#ccc', textDecoration:'none', borderRadius:14, fontWeight:600, fontSize:15, border:'1px solid rgba(255,255,255,0.09)' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'48px 24px 32px', background:'#050505' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:48 }} className="footer-grid">
            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <AltarisLogoMark size={30} />
                <div>
                  <div style={{ fontWeight:800, fontSize:13, letterSpacing:'0.08em' }}>ALTARIS</div>
                  <div style={{ color:'#444', fontSize:9, letterSpacing:'0.16em' }}>CAPITAL</div>
                </div>
              </div>
              <p style={{ color:'#444', fontSize:12, lineHeight:1.8, maxWidth:260 }}>
                Premium investment platform offering institutional-grade strategies to individual investors worldwide.
              </p>
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                {['𝕏','in','f','t'].map(s => (
                  <div key={s} style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#555', fontSize:12, fontWeight:700, cursor:'pointer' }}>{s}</div>
                ))}
              </div>
            </div>
            {/* Links */}
            {[
              { title:'Platform', links:['Dashboard','Markets','Invest','Wallet','Support'] },
              { title:'Company',  links:['About Us','Careers','Blog','Press','Contact'] },
              { title:'Legal',    links:['Terms of Service','Privacy Policy','Cookie Policy','Risk Disclosure','Compliance'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight:700, fontSize:12, letterSpacing:'0.08em', color:'#888', marginBottom:16, textTransform:'uppercase' }}>{col.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ color:'#444', fontSize:13, textDecoration:'none', transition:'color .15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#ddd')} onMouseLeave={e=>(e.currentTarget.style.color='#444')}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ color:'#333', fontSize:12 }}>© {new Date().getFullYear()} Altaris Capital Ltd. All rights reserved.</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[' SSL Secured',' Segregated Funds',' KYC Compliant'].map(b => (
                <span key={b} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', color:'#444', fontSize:11 }}>{b}</span>
              ))}
            </div>
          </div>
          <p style={{ color:'#252525', fontSize:11, marginTop:16, lineHeight:1.7 }}>
            Risk Warning: Investing involves risk including possible loss of principal. Past performance is not indicative of future results. Please read our Risk Disclosure before investing.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes pulseLive { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 641px) {
          .nav-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}
