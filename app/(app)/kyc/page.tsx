'use client'
import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

function VerificationLogo({ tone = '#F2BA0E' }: { tone?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.97-3.05 8.94-7 10-3.95-1.06-7-5.03-7-10V6l7-3Z" fill={tone} fillOpacity="0.15" stroke={tone} strokeWidth="1.5" />
      <path d="m9.5 12 1.7 1.7L15.5 9.5" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DocumentIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="#F2BA0E" strokeWidth="1.6"/><path d="M14 3v5h5M9 13h6M9 17h6" stroke="#F2BA0E" strokeWidth="1.6" strokeLinecap="round"/></svg>
}

function CameraIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.2-1.6A2 2 0 0 1 10.8 4h2.4a2 2 0 0 1 1.6.8L16 6h1.5A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z" stroke="#8AB4FF" strokeWidth="1.6"/><circle cx="12" cy="12" r="3.2" stroke="#8AB4FF" strokeWidth="1.6"/></svg>
}

const steps = ['Personal details', 'Document upload', 'Selfie check', 'Review & submit']

export default function KYCPage() {
  const [status, setStatus] = useState<string>('NOT_SUBMITTED')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', dob:'', country:'', docType:'passport', docNumber:'' })
  const [docFile, setDocFile] = useState<File|null>(null)
  const [selfieFile, setSelfieFile] = useState<File|null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then(r=>r.json()).then(d=>{
      const viewedRejected = typeof window !== 'undefined' && sessionStorage.getItem('kyc-rejected-seen') === '1'
      setStatus(d.status === 'REJECTED' && viewedRejected ? 'NOT_SUBMITTED' : d.status || 'NOT_SUBMITTED')
      setLoading(false)
    })
  },[])

  useEffect(() => {
    if (status === 'REJECTED' && typeof window !== 'undefined') sessionStorage.setItem('kyc-rejected-seen', '1')
  }, [status])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k,v])=>fd.append(k,v))
    if(docFile) fd.append('documentFile', docFile)
    if(selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method:'POST', body:fd })
    const data = await res.json()
    if(res.ok) { setStatus('PENDING_REVIEW'); setMsg({type:'success',text:'Your KYC was submitted successfully.'}) }
    else setMsg({type:'error',text:data.error})
    setSubmitting(false)
  }

  if(loading) return <div style={{display:'grid',placeItems:'center',height:'60vh'}}><VerificationLogo /></div>

  const statusLabel = status === 'APPROVED' ? 'Verified' : status === 'PENDING_REVIEW' ? 'Pending' : status === 'REJECTED' ? 'Rejected' : 'Not verified'
  const statusTone = status === 'APPROVED' ? '#0ECB81' : status === 'PENDING_REVIEW' ? '#F2BA0E' : status === 'REJECTED' ? '#F6465D' : '#7f8a9a'

  if (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'REJECTED') {
    return (
      <div style={{ padding:'12px 16px 32px' }}>
        <div style={{ background:'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border:'1px solid var(--border)', borderRadius:24, padding:24, textAlign:'center', minHeight:'72vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
          <div style={{ width:84, height:84, borderRadius:24, display:'grid', placeItems:'center', background:`${statusTone}22`, border:`1px solid ${statusTone}44`, marginBottom:18 }}><VerificationLogo tone={statusTone} /></div>
          <div style={{ fontSize:13, color:statusTone, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{statusLabel}</div>
          <h1 style={{ fontSize:28, fontWeight:900, marginBottom:10 }}>{status === 'APPROVED' ? 'Your account is verified' : status === 'PENDING_REVIEW' ? 'Verification in progress' : 'Verification was rejected'}</h1>
          <p style={{ color:'var(--text-muted)', maxWidth:320, lineHeight:1.7, marginBottom:24 }}>{status === 'APPROVED' ? 'Your identity is approved and your account now shows Verified.' : status === 'PENDING_REVIEW' ? 'We received your document and selfie. Your account now shows Pending until our team reviews it.' : 'Your account shows Rejected for this session. When you come back later it resets to Not verified so you can start a fresh submission.'}</p>
          {status === 'REJECTED' && <button onClick={() => setStatus('NOT_SUBMITTED')} className="btn-primary">Start new verification</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'0 16px 32px' }}>
      <div style={{ margin:'12px 0 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,marginBottom:4}}>Identity verification</h1>
          <p style={{color:'var(--text-muted)',fontSize:13}}>Professional KYC flow with secure document review and live status updates.</p>
        </div>
        <div style={{ padding:'10px 12px', borderRadius:14, background:`${statusTone}18`, border:`1px solid ${statusTone}33`, color:statusTone, fontWeight:800, fontSize:12 }}>{statusLabel}</div>
      </div>

      <div style={{ background:'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border:'1px solid var(--border)', borderRadius:22, padding:18, marginBottom:18 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {steps.map((label, index) => (
            <div key={label}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:12, display:'grid', placeItems:'center', background:index <= step ? 'rgba(242,186,14,0.16)' : 'rgba(255,255,255,0.06)', border:`1px solid ${index <= step ? 'rgba(242,186,14,0.26)' : 'rgba(255,255,255,0.08)'}`, color:index <= step ? '#F2BA0E' : 'var(--text-muted)', fontWeight:800 }}>{index + 1}</div>
              </div>
              <div style={{ fontSize:11, color:index === step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight:index === step ? 700 : 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {step===0 && <div style={{ display:'grid', gap:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={{display:'block',marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>First name</label><input className="input" value={form.firstName} onChange={e=>setForm(f=>({...f, firstName:e.target.value}))} /></div>
          <div><label style={{display:'block',marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>Last name</label><input className="input" value={form.lastName} onChange={e=>setForm(f=>({...f, lastName:e.target.value}))} /></div>
        </div>
        <div><label style={{display:'block',marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>Date of birth</label><input className="input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f, dob:e.target.value}))} /></div>
        <div><label style={{display:'block',marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>Country of residence</label><select className="input" value={form.country} onChange={e=>setForm(f=>({...f, country:e.target.value}))}><option value="">Select country</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div style={{ background:'rgba(242,186,14,0.08)', border:'1px solid rgba(242,186,14,0.16)', borderRadius:16, padding:14, fontSize:12, color:'var(--text-secondary)' }}>Your data is encrypted and reviewed securely. Status moves from <strong>Not verified</strong> to <strong>Pending</strong>, then <strong>Verified</strong> after approval.</div>
        <button onClick={()=>setStep(1)} disabled={!form.firstName||!form.lastName||!form.dob||!form.country} className="btn-primary">Continue</button>
      </div>}

      {step===1 && <div style={{ display:'grid', gap:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>{[{id:'passport',label:'Passport'},{id:'drivers_license',label:'Driver license'},{id:'national_id',label:'National ID'}].map(d => <button key={d.id} onClick={()=>setForm(f=>({...f, docType:d.id}))} style={{ padding:'12px 8px', borderRadius:14, border:`1px solid ${form.docType===d.id ? 'rgba(242,186,14,0.3)' : 'var(--border)'}`, background:form.docType===d.id ? 'rgba(242,186,14,0.1)' : 'var(--bg-card)', color:form.docType===d.id ? '#F2BA0E' : 'var(--text-secondary)', fontWeight:700, cursor:'pointer' }}>{d.label}</button>)}</div>
        <div><label style={{display:'block',marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>Document number</label><input className="input" value={form.docNumber} onChange={e=>setForm(f=>({...f, docNumber:e.target.value}))} /></div>
        <div onClick={()=>docRef.current?.click()} style={{ border:'1px dashed rgba(242,186,14,0.34)', borderRadius:20, padding:22, background:'linear-gradient(180deg,rgba(242,186,14,0.05),rgba(255,255,255,0.02))', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}><div style={{ width:68, height:68, borderRadius:18, display:'grid', placeItems:'center', background:'rgba(242,186,14,0.12)' }}><DocumentIcon /></div><div><div style={{ fontWeight:800, marginBottom:4 }}>{docFile ? docFile.name : 'Upload document'}</div><div style={{ color:'var(--text-muted)', fontSize:12 }}>Tap to upload a clear document image or PDF. Max 10MB.</div></div></div>
        </div>
        <input ref={docRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>setDocFile(e.target.files?.[0]||null)} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={()=>setStep(0)} className="btn-ghost">Back</button><button onClick={()=>setStep(2)} disabled={!form.docNumber || !docFile} className="btn-primary">Continue</button></div>
      </div>}

      {step===2 && <div style={{ display:'grid', gap:14 }}>
        <div onClick={()=>selfieRef.current?.click()} style={{ border:'1px dashed rgba(138,180,255,0.34)', borderRadius:20, padding:22, background:'linear-gradient(180deg,rgba(138,180,255,0.05),rgba(255,255,255,0.02))', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}><div style={{ width:68, height:68, borderRadius:18, display:'grid', placeItems:'center', background:'rgba(138,180,255,0.12)' }}><CameraIcon /></div><div><div style={{ fontWeight:800, marginBottom:4 }}>{selfieFile ? selfieFile.name : 'Upload selfie'}</div><div style={{ color:'var(--text-muted)', fontSize:12 }}>Use a clear selfie photo with your face fully visible. No need to hold your document.</div></div></div>
        </div>
        <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={e=>setSelfieFile(e.target.files?.[0]||null)} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={()=>setStep(1)} className="btn-ghost">Back</button><button onClick={()=>setStep(3)} disabled={!selfieFile} className="btn-primary">Continue</button></div>
      </div>}

      {step===3 && <div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:16, marginBottom:16 }}>{[
          ['Full name', `${form.firstName} ${form.lastName}`],
          ['Date of birth', form.dob],
          ['Country', form.country],
          ['Document', `${form.docType.replace('_',' ')} · ${form.docNumber}`],
          ['Uploaded document', docFile?.name || '—'],
          ['Selfie', selfieFile?.name || '—'],
        ].map(([l,v]) => <div key={String(l)} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}><span style={{ color:'var(--text-muted)', fontSize:12 }}>{l}</span><span style={{ fontWeight:700, fontSize:13, textAlign:'right' }}>{v}</span></div>)}</div>
        {msg && <div style={{ padding:'12px 14px', borderRadius:12, marginBottom:14, background:msg.type==='success'?'var(--success-bg)':'var(--danger-bg)', color:msg.type==='success'?'var(--success)':'var(--danger)', fontWeight:700, fontSize:13 }}>{msg.text}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={()=>setStep(2)} className="btn-ghost">Back</button><button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit verification'}</button></div>
      </div>}
    </div>
  )
}
