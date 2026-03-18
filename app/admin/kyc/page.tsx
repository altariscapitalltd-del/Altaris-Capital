'use client'
import { useEffect, useState } from 'react'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter] = useState('PENDING_REVIEW')
  const [selected, setSelected] = useState<any>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)

  useBodyScrollLock(Boolean(selected))

  function load() {
    fetch(`/api/admin/kyc?status=${filter}`)
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions || []))
  }
  useEffect(load, [filter])

  async function decide(action:'approve'|'reject') {
    if (!selected) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/admin/kyc', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:selected.userId, action, reason:note }) })
    const data = await res.json().catch(() => ({}))
    if(res.ok){ setMsg({type:'success',text:`KYC ${action}d successfully.`}); setSelected(null); setNote(''); load() }
    else setMsg({type:'error',text:data.error || 'Failed to update KYC'})
    setLoading(false)
  }

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,marginBottom:2}}>KYC Review</h1>
          <p style={{color:'#666',fontSize:12}}>Professional verification queue with document + selfie review.</p>
        </div>
      </div>

      {msg && <div style={{background:msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)',borderRadius:10,padding:'11px 16px',marginBottom:16,fontSize:13,color:msg.type==='success'?'#0ECB81':'#F6465D'}}>{msg.text}</div>}

      <div style={{display:'flex',gap:6,marginBottom:20,background:'#111',borderRadius:99,padding:4,border:'1px solid rgba(255,255,255,0.06)',width:'fit-content'}}>
        {['PENDING_REVIEW','APPROVED','REJECTED','ALL'].map(f=>(<button key={f} onClick={()=>setFilter(f)} style={{padding:'8px 16px',borderRadius:99,border:'none',background:filter===f?'#F2BA0E':'transparent',color:filter===f?'#000':'#777',fontWeight:700,fontSize:12,cursor:'pointer'}}>{f.replace('_',' ')}</button>))}
      </div>

      <div style={{display:'grid',gap:12}}>
        {submissions.map((s:any)=>(
          <div key={s.id} style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:18,display:'grid',gridTemplateColumns:'1fr auto',gap:16}}>
            <div>
              <div style={{fontWeight:800,fontSize:15}}>{s.fullName}</div>
              <div style={{color:'#777',fontSize:12,margin:'4px 0 10px'}}>{s.user?.email}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:12,fontSize:12}}>
                <span><strong>Country:</strong> {s.country || '—'}</span>
                <span><strong>Document:</strong> {s.documentType || '—'}</span>
                <span><strong>Number:</strong> {s.documentNumber || '—'}</span>
                <span><strong>Submitted:</strong> {new Date(s.submittedAt).toLocaleString()}</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'flex-end'}}>
              <span style={{padding:'6px 10px',borderRadius:99,fontSize:11,fontWeight:800,background:s.status==='APPROVED'?'rgba(14,203,129,0.1)':s.status==='REJECTED'?'rgba(246,70,93,0.1)':'rgba(242,186,14,0.1)',color:s.status==='APPROVED'?'#0ECB81':s.status==='REJECTED'?'#F6465D':'#F2BA0E'}}>{s.status.replace('_',' ')}</span>
              <button onClick={()=>setSelected(s)} style={{padding:'8px 14px',borderRadius:10,border:'1px solid rgba(242,186,14,0.2)',background:'rgba(242,186,14,0.08)',color:'#F2BA0E',fontWeight:700,cursor:'pointer'}}>Open review</button>
            </div>
          </div>
        ))}
        {submissions.length===0 && <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:40,textAlign:'center',color:'#666',fontSize:13}}>No submissions found.</div>}
      </div>

      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.84)',display:'grid',placeItems:'center',zIndex:60,padding:20}} onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div style={{background:'#131313',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:24,width:'100%',maxWidth:580}}>
            <h3 style={{fontSize:18,fontWeight:900,marginBottom:16}}>Review {selected.fullName}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div style={{background:'#1a1a1a',borderRadius:16,padding:14}}>
                <div style={{fontWeight:800,marginBottom:10}}>Document</div>
                <a href={`/api/user/kyc/file/${selected.documentPath}`} target="_blank" style={{color:'#F2BA0E'}}>Open uploaded document</a>
              </div>
              <div style={{background:'#1a1a1a',borderRadius:16,padding:14}}>
                <div style={{fontWeight:800,marginBottom:10}}>Selfie</div>
                <a href={`/api/user/kyc/file/${selected.selfiePath}`} target="_blank" style={{color:'#8AB4FF'}}>Open uploaded selfie</a>
              </div>
            </div>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add optional review note" style={{width:'100%',background:'#1A1A1A',color:'#fff',padding:12,borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',minHeight:90,marginBottom:16}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <button onClick={()=>setSelected(null)} style={{padding:'12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#bbb'}}>Cancel</button>
              <button onClick={()=>decide('reject')} disabled={loading} style={{padding:'12px',borderRadius:10,border:'1px solid rgba(246,70,93,0.2)',background:'rgba(246,70,93,0.08)',color:'#F6465D',fontWeight:800}}>Reject</button>
              <button onClick={()=>decide('approve')} disabled={loading} style={{padding:'12px',borderRadius:10,border:'none',background:'#F2BA0E',color:'#000',fontWeight:900}}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
