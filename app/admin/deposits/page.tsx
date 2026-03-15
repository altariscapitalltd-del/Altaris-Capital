'use client'
import { useEffect, useState } from 'react'

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([])
  const [filter, setFilter]     = useState('PENDING')
  const [actionTx, setActionTx] = useState<any>(null)
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{type:'success'|'error';text:string}|null>(null)

  function load() { fetch('/api/admin/deposits').then(r=>r.json()).then(d=>setDeposits(d.deposits||[])) }
  useEffect(load,[])

  async function handleAction(txId:string, action:'approve'|'reject') {
    setLoading(true); setMsg(null)
    const res = await fetch('/api/admin/deposits',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({txId,action,note})})
    if(res.ok){setMsg({type:'success',text:`Deposit ${action}d successfully`});setActionTx(null);setNote('');load()}
    else{const d=await res.json();setMsg({type:'error',text:d.error})}
    setLoading(false)
  }

  const filtered = filter==='ALL' ? deposits : deposits.filter(d=>d.status===filter)
  const counts = { PENDING:deposits.filter(d=>d.status==='PENDING').length, SUCCESS:deposits.filter(d=>d.status==='SUCCESS').length, REJECTED:deposits.filter(d=>d.status==='REJECTED').length }

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>Deposit Management</h1>
          <p style={{color:'#444',fontSize:12}}>{counts.PENDING} pending approval</p>
        </div>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',border:`1px solid ${msg.type==='success'?'rgba(14,203,129,0.2)':'rgba(246,70,93,0.2)'}`,borderRadius:10,padding:'11px 16px',marginBottom:16,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      {/* Filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,background:'#111',borderRadius:99,padding:4,border:'1px solid rgba(255,255,255,0.06)',width:'fit-content'}}>
        {['PENDING','SUCCESS','REJECTED','ALL'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'8px 18px',borderRadius:99,border:'none',background:filter===f?'#F2BA0E':'transparent',color:filter===f?'#000':'#555',fontWeight:filter===f?700:500,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',display:'flex',alignItems:'center',gap:6}}>
            {f}
            {f!=='ALL' && counts[f as keyof typeof counts]>0 && (
              <span style={{background:filter===f?'rgba(0,0,0,0.2)':'rgba(255,255,255,0.1)',borderRadius:99,minWidth:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,padding:'0 4px'}}>
                {counts[f as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                {['User','Amount','Currency','TX Hash','Status','Date','Actions'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#444',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#333',fontSize:13}}>No {filter.toLowerCase()} deposits</td></tr>
              ) : filtered.map((d:any)=>(
                <tr key={d.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.015)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{padding:'13px 16px'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{d.user?.name||'—'}</div>
                      <div style={{color:'#444',fontSize:11}}>{d.user?.email}</div>
                    </div>
                  </td>
                  <td style={{padding:'13px 16px',fontWeight:800,fontSize:15,color:'#0ECB81'}}>${d.amount.toLocaleString()}</td>
                  <td style={{padding:'13px 16px',color:'#888',fontSize:12}}>{d.currency}</td>
                  <td style={{padding:'13px 16px'}}>
                    <code style={{fontFamily:'monospace',fontSize:11,color:'#555',background:'#1A1A1A',padding:'3px 7px',borderRadius:5}}>{d.txHash?d.txHash.slice(0,14)+'…':'—'}</code>
                  </td>
                  <td style={{padding:'13px 16px'}}>
                    <span style={{padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,
                      background:d.status==='SUCCESS'?'rgba(14,203,129,0.1)':d.status==='PENDING'?'rgba(242,186,14,0.1)':'rgba(246,70,93,0.1)',
                      color:d.status==='SUCCESS'?'#0ECB81':d.status==='PENDING'?'#F2BA0E':'#F6465D'}}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{padding:'13px 16px',color:'#444',fontSize:11,whiteSpace:'nowrap'}}>{new Date(d.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                  <td style={{padding:'13px 16px'}}>
                    {d.status==='PENDING' ? (
                      <button onClick={()=>setActionTx(d)}
                        style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(242,186,14,0.2)',background:'rgba(242,186,14,0.07)',color:'#F2BA0E',fontWeight:600,fontSize:11,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                        Review →
                      </button>
                    ) : <span style={{color:'#333',fontSize:11}}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action modal */}
      {actionTx && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,backdropFilter:'blur(8px)',padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setActionTx(null)}}>
          <div style={{background:'#131313',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:28,width:'100%',maxWidth:440}}>
            <h3 style={{fontSize:17,fontWeight:800,marginBottom:18}}>Review Deposit</h3>
            <div style={{background:'#1A1A1A',borderRadius:12,padding:16,marginBottom:18}}>
              {[
                {l:'User',v:actionTx.user?.name+' · '+actionTx.user?.email},
                {l:'Amount',v:`$${actionTx.amount.toLocaleString()} ${actionTx.currency}`},
                {l:'TX Hash',v:actionTx.txHash||'—'},
                {l:'Submitted',v:new Date(actionTx.createdAt).toLocaleString()},
              ].map(({l,v})=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{color:'#555',fontSize:13}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:600,maxWidth:'55%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</span>
                </div>
              ))}
            </div>
            <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:7,letterSpacing:'0.06em'}}>ADMIN NOTE (OPTIONAL)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:12,borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',resize:'none',minHeight:70,boxSizing:'border-box',marginBottom:16}}
              placeholder="Reason or note…"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <button onClick={()=>setActionTx(null)}
                style={{padding:'11px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#555',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                Cancel
              </button>
              <button onClick={()=>handleAction(actionTx.id,'reject')} disabled={loading}
                style={{padding:'11px',borderRadius:9,border:'1px solid rgba(246,70,93,0.2)',background:'rgba(246,70,93,0.08)',color:'#F6465D',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                {loading?'…':'Rejected Reject'}
              </button>
              <button onClick={()=>handleAction(actionTx.id,'approve')} disabled={loading}
                style={{padding:'11px',borderRadius:9,border:'none',background:'#F2BA0E',color:'#000',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                {loading?'…':'Check Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
