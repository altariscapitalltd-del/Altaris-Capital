'use client'
import { useEffect, useState, useRef } from 'react'

function Sparkline({ data, color, width=60, height=28 }: { data:number[], color:string, width?:number, height?:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio||1; canvas.width=width*dpr; canvas.height=height*dpr; ctx.scale(dpr,dpr)
    const min=Math.min(...data),max=Math.max(...data),range=max-min||1
    const xs=data.map((_,i)=>(i/(data.length-1))*width)
    const ys=data.map(v=>height-((v-min)/range)*(height-4)-2)
    const grad=ctx.createLinearGradient(0,0,0,height)
    grad.addColorStop(0,color+'28'); grad.addColorStop(1,color+'00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.lineTo(xs[xs.length-1],height); ctx.lineTo(xs[0],height); ctx.closePath()
    ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke()
  },[data,color,width,height])
  return <canvas ref={canvasRef} style={{width,height,display:'block'}}/>
}

const ALL_COINS = [
  {sym:'BTC',name:'Bitcoin',    price:65420, change:2.34,  vol:'$28.4B',cap:'$1.28T', spark:[42,41,44,43,46,45,48,47,50,49,51,53,52,55,58,57,60,62,61,65]},
  {sym:'ETH',name:'Ethereum',   price:3421,  change:1.78,  vol:'$12.1B',cap:'$411B',  spark:[30,32,31,33,35,34,36,38,37,39,38,40,42,41,40,43,42,44,43,42]},
  {sym:'BNB',name:'BNB',        price:562,   change:-0.55, vol:'$1.8B', cap:'$87B',   spark:[50,52,51,50,53,52,54,53,55,54,56,55,57,56,55,54,56,55,57,56]},
  {sym:'SOL',name:'Solana',     price:148,   change:5.21,  vol:'$3.2B', cap:'$67B',   spark:[20,22,24,23,26,28,27,30,32,31,34,36,35,38,40,42,41,45,47,48]},
  {sym:'XRP',name:'XRP',        price:0.63,  change:-1.12, vol:'$1.2B', cap:'$34B',   spark:[55,54,56,55,53,54,52,53,51,52,50,51,50,49,50,49,48,49,48,47]},
  {sym:'ADA',name:'Cardano',    price:0.48,  change:2.88,  vol:'$420M', cap:'$17B',   spark:[30,31,32,31,33,34,33,35,36,35,37,38,37,39,40,39,41,40,42,43]},
  {sym:'DOGE',name:'Dogecoin',  price:0.16,  change:7.43,  vol:'$1.1B', cap:'$23B',   spark:[18,20,22,21,24,26,25,28,30,29,32,34,33,36,38,37,40,42,44,46]},
  {sym:'MATIC',name:'Polygon',  price:0.87,  change:-2.11, vol:'$380M', cap:'$8B',    spark:[60,59,58,59,57,56,58,57,55,56,54,55,53,54,52,53,51,52,50,49]},
  {sym:'AVAX',name:'Avalanche', price:38.2,  change:3.55,  vol:'$620M', cap:'$16B',   spark:[25,27,26,29,28,31,30,33,32,35,34,37,36,39,38,41,40,43,42,45]},
  {sym:'LINK',name:'Chainlink', price:18.4,  change:1.22,  vol:'$440M', cap:'$10B',   spark:[40,41,40,42,41,43,42,44,43,45,44,46,45,47,46,48,47,49,48,50]},
  {sym:'UNI',name:'Uniswap',    price:11.2,  change:-0.88, vol:'$180M', cap:'$7B',    spark:[50,49,50,48,49,47,48,46,47,45,46,44,45,43,44,42,43,41,42,40]},
  {sym:'ATOM',name:'Cosmos',    price:9.8,   change:4.11,  vol:'$220M', cap:'$4B',    spark:[22,24,23,26,25,28,27,30,29,32,31,34,33,36,35,38,37,40,39,42]},
]

export default function MarketsPage() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const TABS = [
    {id:'all',label:'All'},
    {id:'gainers',label:'🔼 Gainers'},
    {id:'losers',label:'🔽 Losers'},
    {id:'new',label:'✨ New'},
  ]
  const filtered = ALL_COINS
    .filter(c => q ? (c.sym.toLowerCase().includes(q.toLowerCase())||c.name.toLowerCase().includes(q.toLowerCase())) : true)
    .filter(c => tab==='gainers' ? c.change>0 : tab==='losers' ? c.change<0 : true)

  return (
    <div style={{ padding:'0 0 12px' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px 0' }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:14 }}>Markets</h1>
        {/* Search */}
        <div style={{ position:'relative', marginBottom:14 }}>
          <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/></svg>
          <input className="input" style={{ paddingLeft:38, borderRadius:99 }} placeholder="Search coins..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex', gap:8, overflowX:'auto' }} className="no-scrollbar">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`chip ${tab===t.id?'active':''}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Market Table */}
      <div style={{ padding:'14px 16px 0' }}>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto 70px', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border)', marginBottom:2 }}>
          {['Asset','Price','24h',''].map(h=>(
            <span key={h} style={{ color:'var(--text-muted)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</span>
          ))}
        </div>

        {filtered.map(coin => (
          <div key={coin.sym} style={{ display:'grid', gridTemplateColumns:'1fr auto auto 70px', gap:8, alignItems:'center', padding:'13px 0', borderBottom:'1px solid var(--border)' }} className="pressable">
            {/* Asset */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#F2BA0E', flexShrink:0 }}>{coin.sym.slice(0,3)}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{coin.sym}</div>
                <div style={{ color:'var(--text-muted)', fontSize:11 }}>{coin.name}</div>
              </div>
            </div>
            {/* Price */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontWeight:700, fontSize:14 }}>${coin.price.toLocaleString('en-US',{minimumFractionDigits:coin.price<10?4:coin.price<100?2:0})}</div>
              <div style={{ color:'var(--text-muted)', fontSize:10 }}>Vol {coin.vol}</div>
            </div>
            {/* Change */}
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:13, fontWeight:700, color:coin.change>=0?'var(--success)':'var(--danger)', background:coin.change>=0?'var(--success-bg)':'var(--danger-bg)', padding:'4px 9px', borderRadius:99, whiteSpace:'nowrap' }}>
                {coin.change>=0?'+':''}{coin.change.toFixed(2)}%
              </span>
            </div>
            {/* Sparkline */}
            <Sparkline data={coin.spark} color={coin.change>=0?'#0ECB81':'#F6465D'} width={70} height={30}/>
          </div>
        ))}

        {filtered.length===0 && (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No coins match "{q}"</div>
        )}
      </div>
    </div>
  )
}
