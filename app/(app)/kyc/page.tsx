'use client'
import { useEffect, useState, useRef } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'document', label: 'ID Document' },
  { id: 'selfie',   label: 'Selfie' },
  { id: 'review',   label: 'Review' },
]

const DOC_TYPES = [
  { value: 'passport',         label: 'Passport' },
  { value: 'national_id',      label: 'National ID Card' },
  { value: 'drivers_license',  label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
]

function ShieldVerifiedIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <path d="M36 6L10 18v16c0 14.94 10.94 28.94 26 32 15.06-3.06 26-17.06 26-32V18L36 6z" fill="rgba(14,203,129,0.12)" stroke="#0ECB81" strokeWidth="2"/>
      <path d="M25 36l8 8 14-16" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ClockPendingIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="28" stroke="#F2BA0E" strokeWidth="2" fill="rgba(242,186,14,0.08)"/>
      <circle cx="36" cy="36" r="28" stroke="#F2BA0E" strokeWidth="2" strokeDasharray="8 4" fill="none" opacity="0.3"/>
      <path d="M36 22v14l9 5" stroke="#F2BA0E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function XRejectedIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="28" stroke="#F6465D" strokeWidth="2" fill="rgba(246,70,93,0.08)"/>
      <path d="M26 26l20 20M46 26L26 46" stroke="#F6465D" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function StepDot({ idx, current }: { idx: number; current: number }) {
  const active = idx === current
  const completed = idx < current
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: completed ? '#0ECB81' : active ? '#F2BA0E' : '#1A1A1A',
        border: `2px solid ${completed ? '#0ECB81' : active ? '#F2BA0E' : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s',
      }}>
        {completed ? (
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#000' : '#555' }}>{idx + 1}</span>
        )}
      </div>
      <span style={{ fontSize: 9, color: active ? '#F2BA0E' : completed ? '#0ECB81' : '#444', fontWeight: 600, textAlign: 'center', maxWidth: 60, lineHeight: 1.2 }}>
        {STEPS[idx].label}
      </span>
    </div>
  )
}

export default function KYCPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport', docNumber: '' })
  const [docFile, setDocFile]       = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [docPreview, setDocPreview]     = useState<string | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const docRef    = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then(r => r.json()).then(d => {
      setStatus(d.status); setRejectionReason(d.kyc?.rejectionReason || null); setLoading(false)
    })
  }, [])

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  function onDocFile(file: File | null) {
    setDocFile(file)
    setDocPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }
  function onSelfieFile(file: File | null) {
    setSelfieFile(file)
    setSelfiePreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  async function submit() {
    setSubmitting(true); setMsg(null)
    const fd = new FormData()
    fd.append('firstName', form.firstName); fd.append('lastName', form.lastName)
    fd.append('dob', form.dob); fd.append('country', form.country)
    fd.append('docType', form.docType); fd.append('docNumber', form.docNumber)
    if (docFile) fd.append('documentFile', docFile)
    if (selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) { setStatus('PENDING_REVIEW'); setMsg({ type: 'success', text: "Submitted! We'll review within 1–2 business days." }) }
    else setMsg({ type: 'error', text: data.error })
    setSubmitting(false)
  }

  const inp: React.CSSProperties = { width:'100%', background:'#111', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' }
  const lbl: React.CSSProperties = { display:'block', color:'#555', fontSize:11, fontWeight:600, letterSpacing:'0.06em', marginBottom:7 }
  const focus = (e: any) => { e.target.style.borderColor='#F2BA0E' }
  const blur  = (e: any) => { e.target.style.borderColor='rgba(255,255,255,0.08)' }
  const checkRow = (text: string) => (
    <div key={text} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span style={{ color:'var(--text-secondary)', fontSize:12 }}>{text}</span>
    </div>
  )

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#F2BA0E', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  if (status === 'APPROVED') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, textAlign:'center' }}>
      <div style={{ marginBottom:20 }}><ShieldVerifiedIcon /></div>
      <div style={{ display:'inline-block', padding:'6px 16px', borderRadius:99, background:'rgba(14,203,129,0.12)', color:'#0ECB81', fontSize:12, fontWeight:700, marginBottom:16 }}>VERIFIED</div>
      <h2 style={{ fontWeight:800, fontSize:22, marginBottom:10 }}>Identity Verified</h2>
      <p style={{ color:'var(--text-muted)', fontSize:14, maxWidth:280, lineHeight:1.7 }}>Your identity is confirmed. You have full access to withdrawals and all platform features.</p>
    </div>
  )

  if (status === 'PENDING_REVIEW') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, textAlign:'center' }}>
      <div style={{ marginBottom:20 }}><ClockPendingIcon /></div>
      <div style={{ display:'inline-block', padding:'6px 16px', borderRadius:99, background:'rgba(242,186,14,0.12)', color:'#F2BA0E', fontSize:12, fontWeight:700, marginBottom:16 }}>PENDING REVIEW</div>
      <h2 style={{ fontWeight:800, fontSize:22, marginBottom:10 }}>Under Review</h2>
      <p style={{ color:'var(--text-muted)', fontSize:14, maxWidth:280, lineHeight:1.7, marginBottom:24 }}>Your documents are with our compliance team. This takes 1–2 business days. You'll be notified by email.</p>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:16, maxWidth:300, width:'100%', textAlign:'left' }}>
        {[{ label:'Documents Submitted', done:true }, { label:'Compliance Review', done:false }, { label:'Decision & Notification', done:false }].map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<2?'1px solid var(--border)':'none' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:item.done?'rgba(14,203,129,0.15)':'rgba(242,186,14,0.1)', border:`1.5px solid ${item.done?'#0ECB81':'#F2BA0E'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {item.done ? <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : <div style={{ width:6, height:6, borderRadius:'50%', background:'#F2BA0E' }}/>}
            </div>
            <span style={{ fontSize:13, color:item.done?'var(--text-primary)':'var(--text-muted)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (status === 'REJECTED') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, textAlign:'center' }}>
      <div style={{ marginBottom:20 }}><XRejectedIcon /></div>
      <div style={{ display:'inline-block', padding:'6px 16px', borderRadius:99, background:'rgba(246,70,93,0.12)', color:'#F6465D', fontSize:12, fontWeight:700, marginBottom:16 }}>NOT APPROVED</div>
      <h2 style={{ fontWeight:800, fontSize:22, marginBottom:10 }}>Verification Not Approved</h2>
      {rejectionReason && <div style={{ background:'rgba(246,70,93,0.06)', border:'1px solid rgba(246,70,93,0.15)', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#F6465D', maxWidth:320 }}>{rejectionReason}</div>}
      <p style={{ color:'var(--text-muted)', fontSize:14, maxWidth:280, lineHeight:1.7, marginBottom:24 }}>Ensure documents are clear, unexpired, and match your account name.</p>
      <button onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0) }} className="btn-primary">Resubmit Documents →</button>
    </div>
  )

  const step1Valid = form.firstName && form.lastName && form.dob && form.country
  const step2Valid = docFile && form.docType
  const step3Valid = selfieFile

  return (
    <div style={{ padding:'0 0 100px', maxWidth:560, margin:'0 auto' }}>
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(255,255,255,0.05)', color:'#777', fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>NOT VERIFIED</div>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Identity Verification</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6, marginBottom:24 }}>Complete KYC to unlock withdrawals and full account access.</p>

        <div style={{ display:'flex', alignItems:'flex-start', marginBottom:28, position:'relative' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position:'absolute', top:15, left:'50%', width:'100%', height:2, background:i < step ? '#0ECB81' : 'rgba(255,255,255,0.07)', transition:'background 0.3s', zIndex:0 }}/>
              )}
              <div style={{ position:'relative', zIndex:1 }}><StepDot idx={i} current={step} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 20px' }}>
        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:4 }}>
              <div style={{ display:'flex', gap:10 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#F2BA0E" strokeWidth="2" style={{ flexShrink:0, marginTop:2 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>Personal Information</div>
                  <div style={{ color:'var(--text-muted)', fontSize:12, lineHeight:1.5 }}>Enter your legal name exactly as it appears on your government-issued ID.</div>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>FIRST NAME</label><input style={inp} placeholder="John" value={form.firstName} onChange={f('firstName')} onFocus={focus} onBlur={blur}/></div>
              <div><label style={lbl}>LAST NAME</label><input style={inp} placeholder="Doe" value={form.lastName} onChange={f('lastName')} onFocus={focus} onBlur={blur}/></div>
            </div>
            <div><label style={lbl}>DATE OF BIRTH</label><input type="date" style={inp} value={form.dob} onChange={f('dob')} onFocus={focus} onBlur={blur} max={new Date().toISOString().split('T')[0]}/></div>
            <div>
              <label style={lbl}>COUNTRY OF RESIDENCE</label>
              <select style={{ ...inp, appearance:'none' }} value={form.country} onChange={f('country')} onFocus={focus} onBlur={blur}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={() => setStep(1)} disabled={!step1Valid} className="btn-primary" style={{ opacity:step1Valid ? 1 : 0.5 }}>Continue →</button>
          </div>
        )}

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Document Requirements</div>
              {['Government-issued ID document', 'Clearly shows your full name and photo', 'Must not be expired', 'All 4 corners must be visible', 'JPEG, PNG or PDF (max 10MB)'].map(checkRow)}
            </div>
            <div>
              <label style={lbl}>DOCUMENT TYPE</label>
              <select style={{ ...inp, appearance:'none' }} value={form.docType} onChange={f('docType')} onFocus={focus} onBlur={blur}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>DOCUMENT NUMBER</label><input style={inp} placeholder="e.g. A12345678" value={form.docNumber} onChange={f('docNumber')} onFocus={focus} onBlur={blur}/></div>
            <div onClick={() => docRef.current?.click()} style={{ border:`2px dashed ${docFile ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius:12, padding:28, textAlign:'center', cursor:'pointer', background:docFile ? 'rgba(14,203,129,0.04)' : 'transparent', transition:'all 0.2s' }}>
              {docPreview ? (
                <img src={docPreview} alt="Document" style={{ maxHeight:140, borderRadius:8, objectFit:'contain' }}/>
              ) : (
                <>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={docFile ? '#0ECB81' : '#555'} strokeWidth="1.5" style={{ margin:'0 auto 10px', display:'block' }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="12" y2="17"/><line x1="10" y1="15" x2="14" y2="15"/>
                  </svg>
                  <div style={{ fontWeight:600, fontSize:13, color:docFile ? '#0ECB81' : 'var(--text-muted)', marginBottom:4 }}>{docFile ? docFile.name : 'Tap to upload document photo'}</div>
                  <div style={{ fontSize:11, color:'#444' }}>JPEG, PNG or PDF · Max 10MB</div>
                </>
              )}
            </div>
            <input ref={docRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display:'none' }} onChange={e => onDocFile(e.target.files?.[0] || null)}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setStep(0)} className="btn-ghost">← Back</button>
              <button onClick={() => setStep(2)} disabled={!step2Valid} className="btn-primary" style={{ opacity:step2Valid ? 1 : 0.5 }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Selfie Requirements</div>
              {['Hold your ID document next to your face', 'Good lighting — face clearly visible', 'Remove glasses and hats', 'Look directly at the camera', 'Photo must match your document'].map(checkRow)}
            </div>
            <div onClick={() => selfieRef.current?.click()} style={{ border:`2px dashed ${selfieFile ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius:12, padding:28, textAlign:'center', cursor:'pointer', background:selfieFile ? 'rgba(14,203,129,0.04)' : 'transparent', transition:'all 0.2s' }}>
              {selfiePreview ? (
                <img src={selfiePreview} alt="Selfie" style={{ maxHeight:180, borderRadius:10, objectFit:'cover' }}/>
              ) : (
                <>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#555" strokeWidth="1.5" style={{ margin:'0 auto 10px', display:'block' }}>
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>Take or upload selfie with ID</div>
                  <div style={{ fontSize:11, color:'#444' }}>Hold your document clearly visible</div>
                </>
              )}
            </div>
            <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={e => onSelfieFile(e.target.files?.[0] || null)}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
              <button onClick={() => setStep(3)} disabled={!step3Valid} className="btn-primary" style={{ opacity:step3Valid ? 1 : 0.5 }}>Review →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Review Your Details</div>
              {[
                { l:'Full Name', v:`${form.firstName} ${form.lastName}` },
                { l:'Date of Birth', v:form.dob },
                { l:'Country', v:form.country },
                { l:'Document Type', v:DOC_TYPES.find(d => d.value === form.docType)?.label },
                { l:'Document Number', v:form.docNumber || '—' },
                { l:'Document Photo', v:docFile?.name },
                { l:'Selfie Photo', v:selfieFile?.name },
              ].map(({ l, v }) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--text-muted)', fontSize:13 }}>{l}</span>
                  <span style={{ fontWeight:600, fontSize:13, maxWidth:'55%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(242,186,14,0.06)', border:'1px solid rgba(242,186,14,0.15)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#F2BA0E', lineHeight:1.6 }}>
              By submitting, you confirm all information is accurate and documents belong to you.
            </div>
            {msg && <div style={{ padding:'10px 14px', borderRadius:9, fontSize:13, fontWeight:600, background:msg.type==='success'?'rgba(14,203,129,0.1)':'rgba(246,70,93,0.1)', color:msg.type==='success'?'#0ECB81':'#F6465D' }}>{msg.text}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setStep(2)} className="btn-ghost">← Back</button>
              <button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting…' : 'Submit for Review →'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
