'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

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

  useBodyScrollLock(mobileMenuOpen)
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
          {[['#features','Features'],['#plans','Plans'],['#markets','Markets'],['#referral','Referral'],['#testimonials','Reviews'],['#faq','FAQ']].map(([h,l]) => (
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
          {[['#features','Features'],['#plans','Plans'],['#markets','Markets'],['#referral','Referral'],['#testimonials','Reviews'],['#faq','FAQ']].map(([h,l]) => (
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


      {/* ── App UI Showcase ───────────────────────────────────────── */}
      <section style={{ padding:'24px 24px 100px', overflow:'hidden' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:99, background:'rgba(14,203,129,0.08)', border:'1px solid rgba(14,203,129,0.2)', color:'#0ECB81', fontSize:12, fontWeight:700, marginBottom:14, letterSpacing:'0.05em' }}>LIVE PLATFORM</div>
            <h2 style={{ fontSize:'clamp(26px, 4vw, 42px)', fontWeight:900, marginBottom:12 }}>Your money. Always in motion.</h2>
            <p style={{ color:'#555', fontSize:15, maxWidth:500, margin:'0 auto' }}>A real-time investment dashboard designed for clarity, speed, and confidence.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:40, alignItems:'center' }} className="showcase-grid">

            {/* Left features */}
            <div style={{ display:'flex', flexDirection:'column', gap:24 }} className="showcase-left">
              {[
                { icon:'📈', title:'Live Portfolio ROI', desc:'Watch your balance grow in real time. ROI credited daily, compound interest calculated automatically.' },
                { icon:'🤖', title:'AI Strategy Engine', desc:'Our ML models rebalance allocations daily across 200+ market signals for optimal risk-adjusted returns.' },
                { icon:'🔒', title:'Cold Wallet Security', desc:'Client funds stored in multi-signature cold wallets. Fully segregated from company assets.' },
              ].map(f => (
                <div key={f.title} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{f.title}</div>
                    <div style={{ color:'#555', fontSize:13, lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Animated phone demo */}
            <div className="phone-showcase" style={{ position:'relative', flexShrink:0 }}>
              {/* Ambient glow */}
              <div style={{ position:'absolute', inset:'-60px', background:'radial-gradient(ellipse at 50% 60%, rgba(242,186,14,0.14), rgba(59,130,246,0.06) 50%, transparent 70%)', pointerEvents:'none' }} />

              {/* Phone shell */}
              <div style={{ width:242, height:490, borderRadius:42, background:'#070A0E', border:'2px solid rgba(255,255,255,0.14)', boxShadow:'0 50px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)', overflow:'hidden', position:'relative' }}>

                {/* Status bar */}
                <div style={{ height:28, background:'#070A0E', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', flexShrink:0 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#666' }}>9:41</span>
                  <div style={{ width:76, height:16, borderRadius:99, background:'#000', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#111' }} />
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>{[3,5,7,9].map((h,i)=><div key={i} style={{ width:2.5, height:h, background:'#888', borderRadius:1 }}/>)}</div>
                    <span style={{ fontSize:9, color:'#888' }}>88%</span>
                  </div>
                </div>

                {/* Screen carousel — 4 screens cycling */}
                <div style={{ flex:1, position:'relative', height:'calc(100% - 28px)', overflow:'hidden' }}>

                  {/* ── Screen 1: Home ── */}
                  <div className="demo-screen" style={{ animationName:'screenCycle1', position:'absolute', inset:0, padding:'12px 14px 0', display:'flex', flexDirection:'column', gap:9, background:'linear-gradient(170deg,#07090C,#0A0D11)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:'#494949', fontSize:9, fontWeight:600, letterSpacing:'0.06em' }}>TOTAL PORTFOLIO</div>
                        <div style={{ fontWeight:900, fontSize:22, color:'#fff', letterSpacing:'-0.5px' }}>$24,810.50</div>
                        <div style={{ fontSize:9, color:'#0ECB81', fontWeight:700 }}>▲ +$187.34 today (+0.76%)</div>
                      </div>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#F2BA0E,#FF8C00)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#000', boxShadow:'0 2px 10px rgba(242,186,14,0.4)' }}>A</div>
                    </div>
                    {/* Portfolio chart */}
                    <div style={{ background:'linear-gradient(135deg,#0F1118,#0A0D13)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'10px 10px 6px', position:'relative', overflow:'hidden' }}>
                      <div style={{ display:'flex', gap:1.5, alignItems:'flex-end', height:44 }}>
                        {[22,28,25,35,30,42,38,50,45,58,52,62,55,70,65,78,72,82,76,88,80,92,85,95].map((h,i)=>(
                          <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'2px 2px 0 0', background:i===23 ? '#0ECB81' : `rgba(14,203,129,${0.08+(i/23)*0.45})` }} />
                        ))}
                      </div>
                      <div style={{ position:'absolute', bottom:6, right:10, fontSize:9, color:'#0ECB81', fontWeight:800 }}>+11.4% MTD</div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {[{ic:'↓',l:'Deposit',c:'#0ECB81'},{ic:'↑',l:'Withdraw',c:'#F6465D'},{ic:'📈',l:'Invest',c:'#3B82F6'},{ic:'📋',l:'History',c:'#A78BFA'}].map(b=>(
                        <div key={b.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'8px 4px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
                          <div style={{ fontSize:14 }}>{b.ic}</div>
                          <div style={{ fontSize:8, color:'#666', fontWeight:600 }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Offer banner */}
                    <div style={{ background:'linear-gradient(135deg,#1A1200,#0F0900)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:10, padding:'8px 10px', display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:16 }}>🎁</div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#F2BA0E' }}>WELCOME OFFER</div>
                        <div style={{ fontSize:8, color:'#555' }}>Claim Your $100 Bonus → Complete KYC</div>
                      </div>
                    </div>
                    {/* Nav */}
                    <div style={{ marginTop:'auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'7px 0 4px' }}>
                      {[{ic:'⊞',l:'Home',a:true},{ic:'◉',l:'Markets'},{ic:'⊕',l:'Invest'},{ic:'◈',l:'Wallet'},{ic:'◎',l:'Profile'}].map((n,i)=>(
                        <div key={n.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ fontSize:13, opacity:n.a?1:0.3 }}>{n.ic}</div>
                          <div style={{ fontSize:7, fontWeight:n.a?800:500, color:n.a?'#F2BA0E':'#333' }}>{n.l}</div>
                          {n.a && <div style={{ width:3, height:3, borderRadius:'50%', background:'#F2BA0E' }}/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Screen 2: Markets ── */}
                  <div className="demo-screen" style={{ animationName:'screenCycle2', position:'absolute', inset:0, padding:'12px 14px 0', display:'flex', flexDirection:'column', gap:8, background:'linear-gradient(170deg,#07090C,#0A0D11)' }}>
                    <div style={{ fontWeight:900, fontSize:15, color:'#fff' }}>Markets</div>
                    <div style={{ display:'flex', gap:5 }}>
                      {['All','⬡ ETH','◆ BNB','◎ SOL'].map((t,i)=>(
                        <div key={t} style={{ padding:'4px 9px', borderRadius:99, background:i===0?'#F2BA0E':'rgba(255,255,255,0.05)', color:i===0?'#000':'#555', fontSize:8, fontWeight:700, flexShrink:0 }}>{t}</div>
                      ))}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:6, borderBottom:'1px solid rgba(255,255,255,0.04)', paddingBottom:4 }}>
                      {['Asset','Price','24h'].map(h=><div key={h} style={{ fontSize:8, color:'#333', fontWeight:600, textTransform:'uppercase' }}>{h}</div>)}
                    </div>
                    {[
                      {sym:'BTC',name:'Bitcoin',   price:'$71,164',chg:'+2.4%', up:true, color:'#F7931A',bars:[50,55,48,60,58,65,62,70,68,75]},
                      {sym:'ETH',name:'Ethereum',  price:'$2,198', chg:'-1.2%', up:false,color:'#627EEA',bars:[70,65,68,62,60,58,55,52,54,50]},
                      {sym:'SOL',name:'Solana',    price:'$90.02', chg:'+5.8%', up:true, color:'#9945FF',bars:[30,38,35,45,42,52,48,58,55,65]},
                      {sym:'BNB',name:'BNB',       price:'$651',   chg:'+0.9%', up:true, color:'#F0B90B',bars:[55,58,52,56,54,60,58,62,60,64]},
                      {sym:'AVAX',name:'Avalanche',price:'$28.4',  chg:'-2.1%', up:false,color:'#E84142',bars:[60,55,58,50,48,45,42,44,40,38]},
                    ].map(c=>(
                      <div key={c.sym} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:6, alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:24, height:24, borderRadius:8, background:`${c.color}20`, border:`1px solid ${c.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:c.color, flexShrink:0 }}>{c.sym[0]}</div>
                          <div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#e0e0e0' }}>{c.sym}</div>
                            <div style={{ fontSize:8, color:'#333' }}>{c.name}</div>
                          </div>
                        </div>
                        <div style={{ fontSize:9, fontWeight:700, color:'#ccc', textAlign:'right' }}>{c.price}</div>
                        <div style={{ fontSize:9, fontWeight:800, color:c.up?'#0ECB81':'#F6465D', background:c.up?'rgba(14,203,129,0.1)':'rgba(246,70,93,0.1)', padding:'2px 5px', borderRadius:4, textAlign:'right' }}>{c.chg}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:'auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'7px 0 4px' }}>
                      {[{ic:'⊞',l:'Home'},{ic:'◉',l:'Markets',a:true},{ic:'⊕',l:'Invest'},{ic:'◈',l:'Wallet'},{ic:'◎',l:'Profile'}].map((n)=>(
                        <div key={n.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ fontSize:13, opacity:n.a?1:0.3 }}>{n.ic}</div>
                          <div style={{ fontSize:7, fontWeight:n.a?800:500, color:n.a?'#F2BA0E':'#333' }}>{n.l}</div>
                          {n.a && <div style={{ width:3, height:3, borderRadius:'50%', background:'#F2BA0E' }}/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Screen 3: Invest ── */}
                  <div className="demo-screen" style={{ animationName:'screenCycle3', position:'absolute', inset:0, padding:'12px 14px 0', display:'flex', flexDirection:'column', gap:8, background:'linear-gradient(170deg,#07090C,#0A0D11)' }}>
                    <div style={{ fontWeight:900, fontSize:15, color:'#fff' }}>Investment Plans</div>
                    <div style={{ display:'flex', gap:5 }}>
                      {['All','Crypto','Bonds','Stocks'].map((t,i)=>(
                        <div key={t} style={{ padding:'4px 9px', borderRadius:99, background:i===0?'#F2BA0E':'rgba(255,255,255,0.05)', color:i===0?'#000':'#555', fontSize:8, fontWeight:700 }}>{t}</div>
                      ))}
                    </div>
                    {[
                      {name:'Stablecoin Reserve', roi:'0.6%/day',  dur:'60d',  min:'$100',  risk:1, color:'#0ECB81', cat:'CRYPTO'},
                      {name:'Altaris Smart Save',  roi:'40%/year',  dur:'1yr',  min:'$500',  risk:1, color:'#3B82F6', cat:'BONDS'},
                      {name:'Blue Chip Equities',  roi:'1.2%/day',  dur:'90d',  min:'$1,000',risk:2, color:'#A78BFA', cat:'STOCKS'},
                      {name:'Prime Real Estate',   roi:'1.8%/day',  dur:'180d', min:'$2,500',risk:2, color:'#F97316', cat:'REAL EST'},
                    ].map(p=>(
                      <div key={p.name} style={{ borderRadius:12, padding:'10px 10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                          <div>
                            <div style={{ fontSize:10, fontWeight:800, color:'#ddd', marginBottom:1 }}>{p.name}</div>
                            <div style={{ display:'flex', gap:4 }}>
                              <span style={{ fontSize:7, padding:'1px 5px', borderRadius:4, background:`${p.color}15`, color:p.color, fontWeight:700 }}>{p.cat}</span>
                              <span style={{ fontSize:7, color:'#444' }}>Min {p.min}</span>
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:13, fontWeight:900, color:p.color }}>{p.roi}</div>
                            <div style={{ fontSize:7, color:'#444' }}>{p.dur}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:2 }}>
                          {[...Array(3)].map((_,i)=><div key={i} style={{ height:2.5, flex:1, borderRadius:99, background:i<p.risk?p.color:'rgba(255,255,255,0.06)' }}/>)}
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop:'auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'7px 0 4px' }}>
                      {[{ic:'⊞',l:'Home'},{ic:'◉',l:'Markets'},{ic:'⊕',l:'Invest',a:true},{ic:'◈',l:'Wallet'},{ic:'◎',l:'Profile'}].map((n)=>(
                        <div key={n.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ fontSize:13, opacity:n.a?1:0.3 }}>{n.ic}</div>
                          <div style={{ fontSize:7, fontWeight:n.a?800:500, color:n.a?'#F2BA0E':'#333' }}>{n.l}</div>
                          {n.a && <div style={{ width:3, height:3, borderRadius:'50%', background:'#F2BA0E' }}/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Screen 4: Wallet ── */}
                  <div className="demo-screen" style={{ animationName:'screenCycle4', position:'absolute', inset:0, padding:'12px 14px 0', display:'flex', flexDirection:'column', gap:9, background:'linear-gradient(170deg,#07090C,#0A0D11)' }}>
                    <div style={{ fontWeight:900, fontSize:15, color:'#fff' }}>Wallet</div>
                    <div style={{ background:'linear-gradient(135deg,#141900,#0F1200)', border:'1px solid rgba(242,186,14,0.2)', borderRadius:16, padding:'14px 14px 10px', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle,rgba(242,186,14,0.08),transparent)' }} />
                      <div style={{ color:'#F2BA0E', fontSize:8, fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>ACCOUNT BALANCE</div>
                      <div style={{ fontWeight:900, fontSize:24, color:'#fff', letterSpacing:'-0.5px', marginBottom:2 }}>$24,810.50</div>
                      <div style={{ fontSize:8, color:'#0ECB81', fontWeight:700 }}>▲ +$187.34 today</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:10 }}>
                        <div style={{ background:'rgba(14,203,129,0.1)', border:'1px solid rgba(14,203,129,0.2)', borderRadius:8, padding:'7px 8px' }}>
                          <div style={{ fontSize:7, color:'#0ECB81', fontWeight:700 }}>INVESTED</div>
                          <div style={{ fontSize:12, fontWeight:800, color:'#fff' }}>$18,500</div>
                        </div>
                        <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'7px 8px' }}>
                          <div style={{ fontSize:7, color:'#60a5fa', fontWeight:700 }}>EARNINGS</div>
                          <div style={{ fontSize:12, fontWeight:800, color:'#fff' }}>$6,310</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
                      {[{ic:'↓',l:'Deposit',c:'#0ECB81'},{ic:'↑',l:'Withdraw',c:'#F6465D'},{ic:'↔',l:'Rewards',c:'#F2BA0E'},{ic:'📋',l:'History',c:'#A78BFA'}].map(b=>(
                        <div key={b.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 4px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
                          <div style={{ fontSize:14 }}>{b.ic}</div>
                          <div style={{ fontSize:7, color:'#555', fontWeight:600 }}>{b.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:9, color:'#444', letterSpacing:'0.06em' }}>RECENT ACTIVITY</div>
                    {[
                      {type:'Deposit',  amt:'+$5,000', date:'Mar 19', color:'#0ECB81'},
                      {type:'Investment',amt:'-$2,000', date:'Mar 18', color:'#F2BA0E'},
                      {type:'ROI Credit',amt:'+$187',   date:'Mar 17', color:'#3B82F6'},
                    ].map(t=>(
                      <div key={t.type} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <div style={{ fontSize:9, fontWeight:700, color:'#ccc' }}>{t.type}</div>
                          <div style={{ fontSize:7, color:'#333' }}>{t.date}</div>
                        </div>
                        <div style={{ fontSize:11, fontWeight:800, color:t.color }}>{t.amt}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:'auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'7px 0 4px' }}>
                      {[{ic:'⊞',l:'Home'},{ic:'◉',l:'Markets'},{ic:'⊕',l:'Invest'},{ic:'◈',l:'Wallet',a:true},{ic:'◎',l:'Profile'}].map((n)=>(
                        <div key={n.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ fontSize:13, opacity:n.a?1:0.3 }}>{n.ic}</div>
                          <div style={{ fontSize:7, fontWeight:n.a?800:500, color:n.a?'#F2BA0E':'#333' }}>{n.l}</div>
                          {n.a && <div style={{ width:3, height:3, borderRadius:'50%', background:'#F2BA0E' }}/>}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Screen indicator dots */}
              <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:14 }}>
                {([0,-12,-8,-4] as number[]).map((delay,i)=>(
                  <div key={i} style={{ width:6, height:6, borderRadius:'50%', transition:'all .3s', animation:`dotActive 16s ${delay}s infinite` }} />
                ))}
              </div>
            </div>

            {/* Right features */}
            <div style={{ display:'flex', flexDirection:'column', gap:24 }} className="showcase-right">
              {[
                { icon:'⚡', title:'Instant Deposits', desc:'Fund your account with BTC, ETH, or USDT in minutes. Deposits confirmed and credited same day.' },
                { icon:'💸', title:'Fast Withdrawals', desc:'Request a withdrawal anytime. Processed within 24 hours, 7 days a week, no hidden fees.' },
                { icon:'🌍', title:'150+ Countries', desc:'Multilingual platform with local currency support. Invest from anywhere in the world.' },
              ].map(f => (
                <div key={f.title} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{f.title}</div>
                    <div style={{ color:'#555', fontSize:13, lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Referral Program Section ──────────────────────────────── */}
      <section id="referral" style={{ padding:'80px 24px', background:'#050505', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }} className="referral-grid">

            {/* Left: headline */}
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:99, background:'rgba(242,186,14,0.08)', border:'1px solid rgba(242,186,14,0.2)', color:'#F2BA0E', fontSize:12, fontWeight:700, marginBottom:20 }}>
                🎁 REFERRAL PROGRAM
              </div>
              <h2 style={{ fontSize:'clamp(28px, 4vw, 46px)', fontWeight:900, lineHeight:1.1, marginBottom:16, letterSpacing:'-0.5px' }}>
                Invite friends.<br/>
                <span style={{ color:'#F2BA0E' }}>Earn together.</span>
              </h2>
              <p style={{ color:'#555', fontSize:15, lineHeight:1.8, marginBottom:28, maxWidth:420 }}>
                Refer a friend who signs up, passes KYC, and makes a deposit — and you both get rewarded. No cap, no expiry. Stack bonuses as you grow your network.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:36 }}>
                {[
                  { who:'You earn', amount:'$200', per:'per qualified referral', color:'#F2BA0E' },
                  { who:'Your friend earns', amount:'$100', per:'welcome bonus on first deposit', color:'#0ECB81' },
                  { who:'Tier bonuses', amount:'Up to 30%', per:'commission on multi-level referrals', color:'#A78BFA' },
                ].map(r => (
                  <div key={r.who} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight:900, fontSize:18, color:r.color, minWidth:80 }}>{r.amount}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#ddd' }}>{r.who}</div>
                      <div style={{ color:'#555', fontSize:12 }}>{r.per}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#F2BA0E', color:'#000', textDecoration:'none', borderRadius:12, fontWeight:800, fontSize:15 }}>
                Start Referring →
              </Link>
            </div>

            {/* Right: how it works steps */}
            <div>
              <div style={{ fontWeight:700, fontSize:12, letterSpacing:'0.1em', color:'#444', textTransform:'uppercase', marginBottom:24 }}>How it works</div>
              <div style={{ position:'relative' }}>
                {/* Vertical line */}
                <div style={{ position:'absolute', left:17, top:24, bottom:24, width:1, background:'linear-gradient(180deg,rgba(242,186,14,0.3),rgba(242,186,14,0.05))' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {[
                    { n:'1', t:'Sign up & get your link', d:'After registration you instantly receive a unique referral link and code to share anywhere.', c:'#F2BA0E' },
                    { n:'2', t:'Share with friends', d:'Send via WhatsApp, email, social media, or embed on your blog. No limit on invites.', c:'#3B82F6' },
                    { n:'3', t:'Friend registers & verifies', d:'They sign up using your link, complete KYC identity check (10 minutes), and make a deposit.', c:'#0ECB81' },
                    { n:'4', t:'Both receive bonuses', d:'You instantly receive $200, they receive $100 — credited directly to your investment wallet.', c:'#A78BFA' },
                    { n:'5', t:'Track earnings live', d:'Monitor all referrals, their status, tier progress, and total earnings from your Rewards dashboard.', c:'#F97316' },
                  ].map((s,i) => (
                    <div key={s.n} style={{ display:'flex', gap:22, paddingBottom: i < 4 ? 28 : 0 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:`${s.c}18`, border:`2px solid ${s.c}50`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:s.c, flexShrink:0, position:'relative', zIndex:1 }}>{s.n}</div>
                      <div style={{ paddingTop:6 }}>
                        <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{s.t}</div>
                        <div style={{ color:'#555', fontSize:13, lineHeight:1.6 }}>{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barGrow { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }
        @keyframes growBar { from { width: 0; } to { } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes phonePulse { 0%,100% { box-shadow: 0 50px 100px rgba(0,0,0,0.8); } 50% { box-shadow: 0 50px 100px rgba(0,0,0,0.8), 0 0 80px 6px rgba(242,186,14,0.07); } }
        .phone-showcase > div:nth-child(2) { animation: phonePulse 5s ease-in-out infinite; }
        .demo-screen { animation-duration: 16s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes screenCycle1 {
          0%     { opacity:1; transform:translateY(0); z-index:4; }
          22%    { opacity:1; transform:translateY(0); z-index:4; }
          25%    { opacity:0; transform:translateY(-8px); z-index:1; }
          97%    { opacity:0; transform:translateY(8px); z-index:1; }
          100%   { opacity:1; transform:translateY(0); z-index:4; }
        }
        @keyframes screenCycle2 {
          0%     { opacity:0; transform:translateY(8px); z-index:1; }
          22%    { opacity:0; transform:translateY(8px); z-index:1; }
          25%    { opacity:1; transform:translateY(0); z-index:4; }
          47%    { opacity:1; transform:translateY(0); z-index:4; }
          50%    { opacity:0; transform:translateY(-8px); z-index:1; }
          100%   { opacity:0; transform:translateY(8px); z-index:1; }
        }
        @keyframes screenCycle3 {
          0%     { opacity:0; transform:translateY(8px); z-index:1; }
          47%    { opacity:0; transform:translateY(8px); z-index:1; }
          50%    { opacity:1; transform:translateY(0); z-index:4; }
          72%    { opacity:1; transform:translateY(0); z-index:4; }
          75%    { opacity:0; transform:translateY(-8px); z-index:1; }
          100%   { opacity:0; transform:translateY(8px); z-index:1; }
        }
        @keyframes screenCycle4 {
          0%     { opacity:0; transform:translateY(8px); z-index:1; }
          72%    { opacity:0; transform:translateY(8px); z-index:1; }
          75%    { opacity:1; transform:translateY(0); z-index:4; }
          97%    { opacity:1; transform:translateY(0); z-index:4; }
          100%   { opacity:0; transform:translateY(-8px); z-index:1; }
        }
        @keyframes dotActive {
          0%,22%   { background: rgba(242,186,14,0.9); transform: scale(1.3); }
          25%,99%  { background: rgba(255,255,255,0.15); transform: scale(1); }
          100%     { background: rgba(242,186,14,0.9); transform: scale(1.3); }
        }
        @media (max-width: 900px) {
          .showcase-grid { grid-template-columns: 1fr !important; }
          .showcase-left, .showcase-right { display: none !important; }
          .phone-showcase { justify-self: center; }
          .referral-grid { grid-template-columns: 1fr !important; }
        }
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
