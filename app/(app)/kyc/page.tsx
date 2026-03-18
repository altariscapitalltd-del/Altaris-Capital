'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STATUSES = {
  NOT_SUBMITTED: { label: 'Not verified', tone: 'var(--text-muted)' },
  PENDING_REVIEW: { label: 'Pending', tone: 'var(--warning)' },
  APPROVED: { label: 'Verified', tone: 'var(--success)' },
  REJECTED: { label: 'Rejected', tone: 'var(--danger)' },
} as const

const STEPS = [
  { id: 'personal', label: 'Profile' },
  { id: 'document', label: 'Document' },
  { id: 'selfie', label: 'Selfie' },
  { id: 'review', label: 'Review' },
]

function StatusBadge({ status }: { status: keyof typeof STATUSES }) {
  const meta = STATUSES[status] || STATUSES.NOT_SUBMITTED
  return <span style={{ padding:'8px 14px', borderRadius:999, fontWeight:800, fontSize:12, background:'rgba(255,255,255,0.06)', color:meta.tone }}>{meta.label}</span>
}

function VerifiedSeal() {
  return <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="29" fill="rgba(14,203,129,0.12)" stroke="rgba(14,203,129,0.45)"/><path d="M32 15l5.8 4.4 7.2.1 2.2 6.8 5.8 4.3-2.1 6.9 2.2 6.8-5.7 4.4-2.1 6.9-7.2.1L32 49l-5.8 4.4-7.2-.1-2.2-6.8-5.8-4.3 2.1-6.9-2.2-6.8 5.7-4.4 2.1-6.9 7.2-.1L32 15z" fill="#0ECB81" fillOpacity="0.18" stroke="#0ECB81"/><path d="M24 32.5l5.5 5.5L40.5 27" stroke="#0ECB81" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function DocumentCardIcon() {
  return <svg width="54" height="54" viewBox="0 0 54 54" fill="none"><rect x="9" y="6" width="36" height="42" rx="10" fill="rgba(242,186,14,0.1)" stroke="rgba(242,186,14,0.45)" strokeWidth="2"/><path d="M18 19h18M18 26h18M18 33h10" stroke="#F2BA0E" strokeWidth="2.4" strokeLinecap="round"/></svg>
}

function CameraCardIcon() {
  return <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="8" y="14" width="40" height="28" rx="10" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.45)" strokeWidth="2"/><path d="M20 14l3.3-5h9.4l3.3 5" stroke="#A78BFA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="28" cy="28" r="8" stroke="#A78BFA" strokeWidth="2.4"/><circle cx="28" cy="28" r="3" fill="#A78BFA"/></svg>
}

export default function KYCPage() {
  const [status, setStatus] = useState<keyof typeof STATUSES>('NOT_SUBMITTED')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type:'success'|'error'; text:string } | null>(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', dob:'', country:'', address:'', docType:'passport', docNumber:'' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then((r) => r.json()).then((d) => { setStatus(d.status || 'NOT_SUBMITTED'); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (docFile) fd.append('documentFile', docFile)
    if (selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method:'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setStatus('PENDING_REVIEW')
      setMsg({ type:'success', text: data.telegramDelivered ? 'KYC submitted and synced to admin review.' : 'KYC submitted successfully and is now pending review.' })
      setStep(3)
    } else {
      setMsg({ type:'error', text: data.error || 'Failed to submit KYC' })
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{display:'grid',placeItems:'center',minHeight:'60vh'}}>Loading…</div>

  if (status === 'APPROVED') return <div style={{padding:24,display:'grid',placeItems:'center',minHeight:'70vh',textAlign:'center'}}><VerifiedSeal /><h1 style={{fontSize:28,fontWeight:900,margin:'18px 0 8px'}}>Verified</h1><p style={{maxWidth:320,color:'var(--text-muted)',lineHeight:1.7}}>Your identity has been successfully verified. Your account now has full KYC access and withdrawal eligibility.</p></div>
  if (status === 'PENDING_REVIEW') return <div style={{padding:24,display:'grid',placeItems:'center',minHeight:'70vh',textAlign:'center'}}><div style={{width:72,height:72,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--warning-bg)'}}>⏳</div><h1 style={{fontSize:28,fontWeight:900,margin:'18px 0 8px'}}>Pending review</h1><p style={{maxWidth:320,color:'var(--text-muted)',lineHeight:1.7}}>Your KYC submission is with our compliance team. We’ll update the status here as soon as the review is complete.</p></div>

  return (
    <div style={{ padding:'10px 16px 34px', maxWidth:720, margin:'0 auto' }}>
      <div style={{ border:'1px solid var(--border)', borderRadius:24, padding:20, background:'linear-gradient(160deg, rgba(242,186,14,0.12), rgba(11,14,17,1) 48%)', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em' }}>Identity verification</div>
            <p style={{ color:'var(--text-muted)', margin:'8px 0 0', lineHeight:1.6 }}>A smoother KYC flow with clear statuses, secure uploads, and professional review messaging.</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div style={{ marginTop:18, height:10, borderRadius:999, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}><div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg, #F2BA0E, #A78BFA)' }} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {STEPS.map((item, index) => <div key={item.id} style={{ color:index<=step?'var(--text-primary)':'var(--text-muted)', fontSize:12, fontWeight:700 }}>{item.label}</div>)}
        </div>
      </div>

      {status === 'REJECTED' && <div style={{ marginBottom:16, padding:14, borderRadius:14, background:'var(--danger-bg)', color:'var(--danger)', fontWeight:700 }}>Your previous submission was rejected. Once you start a new one, your status returns to not verified until it is submitted again.</div>}
      {msg && <div style={{ marginBottom:16, padding:14, borderRadius:14, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight:700 }}>{msg.text}</div>}

      {step === 0 && <div style={{display:'grid',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <input className="input" placeholder="First name" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} />
          <input className="input" placeholder="Last name" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} />
        </div>
        <input className="input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} />
        <select className="input" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value,address:e.target.value}))}><option value="">Select country</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <button className="btn-primary" disabled={!form.firstName || !form.lastName || !form.dob || !form.country} onClick={()=>setStep(1)}>Continue</button>
      </div>}

      {step === 1 && <div style={{display:'grid',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{[{id:'passport',label:'Passport'},{id:'drivers_license',label:'Driver license'},{id:'national_id',label:'National ID'}].map(item => <button key={item.id} className={form.docType===item.id?'btn-primary':'btn-ghost'} onClick={()=>setForm(f=>({...f,docType:item.id}))}>{item.label}</button>)}</div>
        <input className="input" placeholder="Document number" value={form.docNumber} onChange={e=>setForm(f=>({...f,docNumber:e.target.value}))} />
        <button type="button" onClick={()=>docRef.current?.click()} style={{border:'1px dashed var(--border)',borderRadius:20,padding:22,background:docFile?'var(--success-bg)':'var(--bg-card)',display:'grid',justifyItems:'center',gap:10,cursor:'pointer'}}>
          <DocumentCardIcon />
          <div style={{fontWeight:800}}>{docFile ? docFile.name : 'Upload document'}</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Passport, driver license, national ID, JPG, PNG or PDF</div>
        </button>
        <input ref={docRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>setDocFile(e.target.files?.[0] || null)} />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><button className="btn-ghost" onClick={()=>setStep(0)}>Back</button><button className="btn-primary" disabled={!form.docNumber || !docFile} onClick={()=>setStep(2)}>Continue</button></div>
      </div>}

      {step === 2 && <div style={{display:'grid',gap:14}}>
        <div style={{padding:16,border:'1px solid var(--border)',borderRadius:18,background:'var(--bg-card)'}}>
          <div style={{fontSize:18,fontWeight:800,marginBottom:6}}>Selfie capture</div>
          <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7}}>Use your front camera, keep your face centered, and make sure the image is bright and sharp. No extra “hold your ID” step is required.</div>
        </div>
        <button type="button" onClick={()=>selfieRef.current?.click()} style={{border:'1px dashed var(--border)',borderRadius:20,padding:24,background:selfieFile?'rgba(167,139,250,0.1)':'var(--bg-card)',display:'grid',justifyItems:'center',gap:10,cursor:'pointer'}}>
          <CameraCardIcon />
          <div style={{fontWeight:800}}>{selfieFile ? selfieFile.name : 'Take or upload selfie'}</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Camera-ready selfie card upload</div>
        </button>
        <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={e=>setSelfieFile(e.target.files?.[0] || null)} />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><button className="btn-ghost" onClick={()=>setStep(1)}>Back</button><button className="btn-primary" disabled={!selfieFile} onClick={()=>setStep(3)}>Review</button></div>
      </div>}

      {step === 3 && <div style={{display:'grid',gap:14}}>
        <div style={{padding:18,border:'1px solid var(--border)',borderRadius:18,background:'var(--bg-card)'}}>
          {[['Verification status', STATUSES[status].label], ['Full name', `${form.firstName} ${form.lastName}`], ['Date of birth', form.dob], ['Country', form.country], ['Document', `${form.docType.replace('_', ' ')} · ${form.docNumber}`], ['Document file', docFile?.name || '—'], ['Selfie file', selfieFile?.name || '—']].map(([k,v]) => <div key={k} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}><span style={{color:'var(--text-muted)'}}>{k}</span><span style={{fontWeight:700,textAlign:'right'}}>{v}</span></div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><button className="btn-ghost" onClick={()=>setStep(2)}>Back</button><button className="btn-primary" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit verification'}</button></div>
      </div>}
    </div>
  )
}
