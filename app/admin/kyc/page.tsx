'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter]           = useState('PENDING_REVIEW')
  const [selected, setSelected]       = useState<any>(null)
  const [note, setNote]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState<{type:'success'|'error';text:string}|null>(null)

  function load() { fetch('/api/admin/kyc').then(r=>r.json()).then(d=>setSubmissions(d.submissions||[])) }
  useEffect(load,[])

  async function decide(subId:string, action:'approve'|'reject') {
    setLoading(true); setMsg(null)
    const res = await fetch('/api/admin/kyc',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId:subId,action,note})})
    if(res.ok){setMsg({type:'success',text:`KYC ${action}d`});setSelected(null);setNote('');load()}
    else{const d=await res.json();setMsg({type:'error',text:d.error})}
    setLoading(false)
  }

  const filtered = filter==='ALL' ? submissions : submissions.filter(s=>s.status===filter)
  const pending = submissions.filter(s=>s.status==='PENDING_REVIEW').length

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>KYC Review</h1>
          <p style={{color:'#444',fontSize:12}}>{pending} pending review</p>
        </div>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',border:`1px solid ${msg.type==='success'?'rgba(14,203,129,0.2)':'rgba(246,70,93,0.2)'}`,borderRadius:10,padding:'11px 16px',marginBottom:16,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      <div style={{display:'flex',gap:6,marginBottom:20,background:'#111',borderRadius:99,padding:4,border:'1px solid rgba(255,255,255,0.06)',width:'fit-content'}}>
        {['PENDING_REVIEW','APPROVED','REJECTED','ALL'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'8px 16px',borderRadius:99,border:'none',background:filter===f?'#F2BA0E':'transparent',color:filter===f?'#000':'#555',fontWeight:filter===f?700:500,fontSize:12,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',whiteSpace:'nowrap'}}>
            {f.replace('_',' ')}
          </button>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length===0 ? (
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:40,textAlign:'center',color:'#333',fontSize:13}}>
            No {filter.replace('_',' ').toLowerCase()} submissions
          </div>
        ) : filtered.map((s:any)=>(
          <div key={s.id} style={{background:'#111',border:`1px solid ${s.status==='PENDING_REVIEW'?'rgba(242,186,14,0.15)':'rgba(255,255,255,0.06)'}`,borderRadius:14,padding:18,display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
            {/* Avatar */}
            <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#A78BFA40,#7C3AED20)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:17,color:'#A78BFA',flexShrink:0}}>
              {s.user?.name?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{s.user?.name||'Unknown'}</div>
              <div style={{color:'#555',fontSize:12,marginBottom:6}}>{s.user?.email}</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {[{l:'Document',v:s.documentType?.replace('_',' ')},{l:'Doc #',v:s.documentNumber},{l:'Country',v:s.country},{l:'Submitted',v:new Date(s.createdAt).toLocaleDateString()}].map(({l,v})=>(
                  <div key={l}><span style={{color:'#444',fontSize:10}}>{l}: </span><span style={{fontSize:12,fontWeight:600}}>{v||'—'}</span></div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
              <span style={{padding:'4px 11px',borderRadius:99,fontSize:11,fontWeight:700,
                background:s.status==='APPROVED'?'rgba(14,203,129,0.1)':s.status==='PENDING_REVIEW'?'rgba(242,186,14,0.1)':'rgba(246,70,93,0.1)',
                color:s.status==='APPROVED'?'#0ECB81':s.status==='PENDING_REVIEW'?'#F2BA0E':'#F6465D'}}>
                {s.status.replace('_',' ')}
              </span>
              {s.status==='PENDING_REVIEW' && (
                <button onClick={()=>setSelected(s)}
                  style={{padding:'7px 16px',borderRadius:9,border:'1px solid rgba(242,186,14,0.2)',background:'rgba(242,186,14,0.08)',color:'#F2BA0E',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  Review →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,backdropFilter:'blur(8px)',padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div style={{background:'#131313',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:28,width:'100%',maxWidth:460}}>
            <h3 style={{fontSize:17,fontWeight:800,marginBottom:18}}>KYC Review — {selected.user?.name}</h3>
            <div style={{background:'#1A1A1A',borderRadius:12,padding:16,marginBottom:18}}>
              {[
                {l:'Full Name',v:`${selected.firstName} ${selected.lastName}`},
                {l:'Date of Birth',v:selected.dateOfBirth||'—'},
                {l:'Country',v:selected.country},
                {l:'Document Type',v:selected.documentType?.replace('_',' ')},
                {l:'Document Number',v:selected.documentNumber},
              ].map(({l,v})=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{color:'#555',fontSize:13}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
            <label style={{display:'block',color:'#444',fontSize:11,fontWeight:600,marginBottom:7,letterSpacing:'0.06em'}}>REVIEW NOTE</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:12,borderRadius:9,border:'1px solid rgba(255,255,255,0.07)',fontSize:13,fontFamily:'inherit',outline:'none',resize:'none',minHeight:70,boxSizing:'border-box',marginBottom:16}}
              placeholder="Approve or reject note…"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <button onClick={()=>setSelected(null)} style={{padding:'11px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#555',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
              <button onClick={()=>decide(selected.id,'reject')} disabled={loading} style={{padding:'11px',borderRadius:9,border:'1px solid rgba(246,70,93,0.2)',background:'rgba(246,70,93,0.08)',color:'#F6465D',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Rejected Reject</button>
              <button onClick={()=>decide(selected.id,'approve')} disabled={loading} style={{padding:'11px',borderRadius:9,border:'none',background:'#F2BA0E',color:'#000',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Check Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
