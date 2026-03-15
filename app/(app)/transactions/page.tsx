'use client'
import { useEffect, useState } from 'react'

const TYPE_CONFIG: Record<string, {icon:string, color:string, label:string}> = {
  DEPOSIT:    { icon:'⬇', color:'var(--success)', label:'Deposit' },
  WITHDRAWAL: { icon:'⬆', color:'var(--danger)',  label:'Withdrawal' },
  INVESTMENT: { icon:'INV', color:'var(--brand-primary)', label:'Investment' },
  ROI:        { icon:'ROI', color:'var(--success)', label:'ROI Credit' },
  BONUS:      { icon:'BON', color:'#F2BA0E',        label:'Bonus' },
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/transactions').then(r=>r.json()).then(d => { setTxs(d.transactions||[]); setLoading(false) })
  }, [])

  const FILTERS = ['ALL','DEPOSIT','WITHDRAWAL','INVESTMENT','ROI','BONUS']
  const filtered = txs.filter(t => filter==='ALL' || t.type===filter)
  const paged = filtered.slice(0, page*20)

  if(loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#F2BA0E', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ padding:'12px 16px 0' }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:14 }}>History</h1>
        {/* Filter chips */}
        <div style={{ display:'flex', gap:7, overflowX:'auto', marginBottom:16 }} className="no-scrollbar">
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`chip ${filter===f?'active':''}`}>
              {f==='ALL'?'All':TYPE_CONFIG[f]?.label||f}
            </button>
          ))}
        </div>
      </div>

      {paged.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:48, marginBottom:14 }}>Transactions</div>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>No transactions yet</div>
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>Your transaction history will appear here</div>
        </div>
      ) : (
        <div style={{ padding:'0 16px' }}>
          {paged.map((tx:any, i:number) => {
            const cfg = TYPE_CONFIG[tx.type] || { icon:'TX', color:'var(--text-secondary)', label:tx.type }
            const isCredit = ['DEPOSIT','ROI','BONUS'].includes(tx.type)
            const date = new Date(tx.createdAt)
            const isNewDay = i===0 || new Date(paged[i-1].createdAt).toDateString()!==date.toDateString()
            return (
              <div key={tx.id}>
                {isNewDay && (
                  <div style={{ color:'var(--text-muted)', fontSize:11, fontWeight:600, padding:'12px 0 6px', letterSpacing:'0.04em' }}>
                    {date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:42, height:42, borderRadius:13, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, border:`1px solid ${cfg.color}25` }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{cfg.label}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {tx.description||tx.planName||tx.currency}
                    </div>
                    <div style={{ color:'var(--text-muted)', fontSize:10, marginTop:2 }}>
                      {date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                      {' · '}
                      <span style={{ color: tx.status==='COMPLETED'?'var(--success)':tx.status==='PENDING'?'var(--warning)':'var(--danger)', fontWeight:600 }}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, color: isCredit?'var(--success)':'var(--danger)' }}>
                      {isCredit?'+':'-'}{tx.currency} {Math.abs(tx.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})}
                    </div>
                    <div style={{ color:'var(--text-muted)', fontSize:10, marginTop:2 }}>
                      {tx.currency==='USD'?'':'≈ $'+(Math.abs(tx.amount)*65000).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length > paged.length && (
            <button onClick={()=>setPage(p=>p+1)} style={{ width:'100%', marginTop:16, padding:'13px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  )
}
