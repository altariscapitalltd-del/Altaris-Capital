'use client'
import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { label: 'Personal Info' },
  { label: 'ID Front/Back' },
  { label: 'Review' },
]
const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
]

export default function KYCPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport' })
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then(r => r.json()).then(d => { setStatus(d.status); setRejectionReason(d.kyc?.rejectionReason || null); setLoading(false) })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  const onFront = (file: File | null) => { setFrontFile(file); setFrontPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null) }
  const onBack = (file: File | null) => { setBackFile(file); setBackPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null) }

  async function normalizeImageFile(file: File): Promise<File> {
    const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)
    if (isJpeg || file.type === 'application/pdf') return file
    if (!file.type.startsWith('image/')) return file
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return file
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
    } finally { URL.revokeObjectURL(url) }
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('firstName', form.firstName)
      fd.append('lastName', form.lastName)
      fd.append('dob', form.dob)
      fd.append('country', form.country)
      fd.append('docType', form.docType)
      if (frontFile) fd.append('documentFile', await normalizeImageFile(frontFile))
      if (backFile) fd.append('documentBackFile', await normalizeImageFile(backFile))
      const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setStatus('PENDING_REVIEW'); setMsg({ type: 'success', text: "Submitted! We'll review within 1–2 business days." }) }
      else setMsg({ type: 'error', text: data.error || 'Failed to submit KYC. Please try again.' })
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please check your connection and try again.' })
    } finally { setSubmitting(false) }
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#F2BA0E', borderRadius:'50%', animation:'spin .8s linear infinite' }}/></div>
  if (status === 'APPROVED') return <div style={{ padding:24, textAlign:'center', minHeight:'70vh', display:'flex', flexDirection:'column', justifyContent:'center' }}><h2 style={{ fontSize:22, fontWeight:800 }}>Identity Verified</h2><p style={{ color:'var(--text-muted)' }}>Your identity is confirmed.</p></div>
  if (status === 'PENDING_REVIEW') return <div style={{ padding:24, textAlign:'center', minHeight:'70vh', display:'flex', flexDirection:'column', justifyContent:'center' }}><h2 style={{ fontSize:22, fontWeight:800 }}>Under Review</h2><p style={{ color:'var(--text-muted)' }}>We’ll notify you within 1–2 business days.</p></div>
  if (status === 'REJECTED') return (
    <div style={{ padding:24, textAlign:'center', minHeight:'70vh', display:'flex', flexDirection:'column', justifyContent:'center', gap:12 }}>
      <h2 style={{ fontSize:22, fontWeight:800 }}>Verification Not Approved</h2>
      <p style={{ color:'var(--text-muted)' }}>{rejectionReason || 'Please resubmit.'}</p>
      <button
        className="btn-primary"
        onClick={() => {
          setStatus('NOT_SUBMITTED')
          setStep(0)
          setMsg(null)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        style={{ marginTop: 8 }}
      >
        Resubmit
      </button>
    </div>
  )

  const valid1 = form.firstName && form.lastName && form.dob && form.country
  const valid2 = frontFile && backFile && form.docType

  return (
    <div style={{ padding:'20px 20px 100px', maxWidth:560, margin:'0 auto' }}>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Identity Verification</h1>
      <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24 }}>Complete KYC to unlock withdrawals.</p>

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {STEPS.map((s, i) => <div key={s.label} style={{ flex:1, textAlign:'center', padding:'8px 0', borderRadius:999, background:i===step ? '#F2BA0E' : i<step ? '#0ECB81' : '#111', color:i===step ? '#000' : '#fff', fontSize:11, fontWeight:800 }}>{s.label}</div>)}
      </div>

      {step === 0 && <div style={{ display:'grid', gap:12 }}>
        <input placeholder="First name" value={form.firstName} onChange={set('firstName')} style={inputStyle} />
        <input placeholder="Last name" value={form.lastName} onChange={set('lastName')} style={inputStyle} />
        <input type="date" value={form.dob} onChange={set('dob')} style={inputStyle} />
        <select value={form.country} onChange={set('country')} style={inputStyle}><option value="">Country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select>
        <button onClick={() => setStep(1)} disabled={!valid1} className="btn-primary" style={{ opacity:valid1 ? 1 : 0.5 }}>Continue →</button>
      </div>}

      {step === 1 && <div style={{ display:'grid', gap:12 }}>
        <select value={form.docType} onChange={set('docType')} style={inputStyle}>{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
        <div onClick={() => frontRef.current?.click()} style={uploadBoxStyle(frontFile)}>{frontPreview ? <img src={frontPreview} alt="Front" style={previewStyle} /> : <UploadHint label={frontFile ? frontFile.name : 'Upload ID front'} />}</div>
        <input ref={frontRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => onFront(e.target.files?.[0] || null)} />
        <div onClick={() => backRef.current?.click()} style={uploadBoxStyle(backFile)}>{backPreview ? <img src={backPreview} alt="Back" style={previewStyle} /> : <UploadHint label={backFile ? backFile.name : 'Upload ID back'} />}</div>
        <input ref={backRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => onBack(e.target.files?.[0] || null)} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={() => setStep(0)} className="btn-ghost">← Back</button><button onClick={() => setStep(2)} disabled={!valid2} className="btn-primary" style={{ opacity:valid2 ? 1 : 0.5 }}>Review →</button></div>
      </div>}

      {step === 2 && <div style={{ display:'grid', gap:12 }}>
        <div style={{ border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
          <Row l="Full Name" v={`${form.firstName} ${form.lastName}`} />
          <Row l="Date of Birth" v={form.dob} />
          <Row l="Country" v={form.country} />
          <Row l="Document Type" v={DOC_TYPES.find(d => d.value===form.docType)?.label} />
          <Row l="Front Photo" v={frontFile?.name} />
          <Row l="Back Photo" v={backFile?.name} />
        </div>
        {msg && <div style={{ padding:'10px 14px', borderRadius:9, background:msg.type==='success' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', color:msg.type==='success' ? '#0ECB81' : '#F6465D' }}>{msg.text}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={() => setStep(1)} className="btn-ghost">← Back</button><button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting…' : 'Submit for Review →'}</button></div>
      </div>}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width:'100%', background:'#111', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
const previewStyle: React.CSSProperties = { maxHeight:160, width:'100%', objectFit:'contain', borderRadius:8 }
function uploadBoxStyle(active: File | null): React.CSSProperties { return { border:`2px dashed ${active ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius:12, padding:24, textAlign:'center', cursor:'pointer', background:active ? 'rgba(14,203,129,0.04)' : 'transparent' } }
function UploadHint({ label }: { label: string }) { return <><div style={{ fontWeight:600, fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>{label}</div><div style={{ fontSize:11, color:'#444' }}>Camera or file · Max 10MB</div></> }
function Row({ l, v }: { l: string; v: any }) { return <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text-muted)', fontSize:13 }}>{l}</span><span style={{ fontWeight:600, fontSize:13, maxWidth:'55%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span></div> }
