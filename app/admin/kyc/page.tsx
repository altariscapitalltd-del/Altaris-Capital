'use client'
import { useEffect, useState } from 'react'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter] = useState('PENDING_REVIEW')
  const [selected, setSelected] = useState<any>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type:'success'|'error'; text:string } | null>(null)
  useBodyScrollLock(!!selected)

  function load() {
    fetch(`/api/admin/kyc?status=${filter}`).then((r) => r.json()).then((d) => setSubmissions(d.submissions || []))
  }
  useEffect(load, [filter])

  async function decide(action: 'approve' | 'reject') {
    if (!selected) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/admin/kyc', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ submissionId: selected.id, action, reason: note }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg({ type:'success', text:`KYC ${action}d successfully.` })
      setSelected(null)
      setNote('')
      load()
    } else {
      setMsg({ type:'error', text:data.error || 'Failed to update submission' })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div><h1 style={{ fontSize:24, fontWeight:900, marginBottom:4 }}>KYC Review</h1><p style={{ color:'#666', fontSize:12 }}>Review document and selfie submissions from users.</p></div>
      </div>
      {msg && <div style={{ marginBottom:16, padding:12, borderRadius:12, background: msg.type==='success'?'rgba(14,203,129,0.08)':'rgba(246,70,93,0.08)', color: msg.type==='success'?'#0ECB81':'#F6465D' }}>{msg.text}</div>}
      <div style={{ display:'flex', gap:8, marginBottom:18 }}>{['PENDING_REVIEW','APPROVED','REJECTED','ALL'].map((item) => <button key={item} onClick={()=>setFilter(item)} style={{ padding:'8px 12px', borderRadius:999, border:'1px solid rgba(255,255,255,0.08)', background:filter===item?'#F2BA0E':'#111', color:filter===item?'#000':'#fff', cursor:'pointer' }}>{item.replace('_', ' ')}</button>)}</div>
      <div style={{ display:'grid', gap:12 }}>
        {submissions.map((submission) => <div key={submission.id} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:16, display:'flex', justifyContent:'space-between', gap:12, alignItems:'center' }}><div><div style={{ fontWeight:800 }}>{submission.user?.name}</div><div style={{ color:'#777', fontSize:12 }}>{submission.user?.email}</div><div style={{ fontSize:12, marginTop:6 }}>Document: {submission.documentType || '—'} · {submission.documentNumber || '—'} · Submitted {new Date(submission.submittedAt).toLocaleString()}</div></div><button onClick={()=>setSelected(submission)} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(242,186,14,0.28)', background:'rgba(242,186,14,0.08)', color:'#F2BA0E', cursor:'pointer' }}>Review</button></div>)}
        {submissions.length === 0 && <div style={{ padding:26, background:'#111', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, color:'#888' }}>No submissions for this filter.</div>}
      </div>

      {selected && <div onClick={(e)=>e.target===e.currentTarget&&setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'grid', placeItems:'center', zIndex:90, padding:24 }}><div style={{ width:'100%', maxWidth:880, background:'#111', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:20 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}><h2 style={{ fontWeight:900, fontSize:20 }}>Review: {selected.user?.name}</h2><button onClick={()=>setSelected(null)} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:20 }}>×</button></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}><div style={{ background:'#171717', borderRadius:16, padding:16 }}><div style={{ fontWeight:800, marginBottom:10 }}>Applicant details</div>{[['Full name', selected.fullName], ['Date of birth', selected.dateOfBirth], ['Country', selected.country], ['Address', selected.address], ['Document type', selected.documentType], ['Document number', selected.documentNumber], ['Status', selected.status]].map(([k,v]) => <div key={String(k)} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}><span style={{ color:'#777' }}>{k}</span><strong>{v || '—'}</strong></div>)}<textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional rejection reason or approval note" style={{ width:'100%', marginTop:14, minHeight:90, borderRadius:12, background:'#0d0d0d', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', padding:12 }} /></div><div style={{ display:'grid', gap:16 }}><div style={{ background:'#171717', borderRadius:16, padding:16 }}><div style={{ fontWeight:800, marginBottom:8 }}>Document</div><a href={`/uploads/kyc/${selected.documentPath}`} target="_blank" rel="noreferrer" style={{ color:'#F2BA0E' }}>{selected.documentPath}</a></div><div style={{ background:'#171717', borderRadius:16, padding:16 }}><div style={{ fontWeight:800, marginBottom:8 }}>Selfie</div><a href={`/uploads/kyc/${selected.selfiePath}`} target="_blank" rel="noreferrer" style={{ color:'#A78BFA' }}>{selected.selfiePath || 'No selfie uploaded'}</a></div></div></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:18 }}><button onClick={()=>setSelected(null)} className="btn-ghost">Close</button><button disabled={loading} onClick={()=>decide('reject')} style={{ border:'1px solid rgba(246,70,93,0.24)', background:'rgba(246,70,93,0.08)', color:'#F6465D', borderRadius:12, fontWeight:800, cursor:'pointer' }}>Reject</button><button disabled={loading} onClick={()=>decide('approve')} className="btn-primary">Approve</button></div></div></div>}
    </div>
  )
}
