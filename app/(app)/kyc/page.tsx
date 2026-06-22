'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'document', label: 'ID Document' },
  { id: 'review', label: 'Review' },
]

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
]

function ShieldVerifiedIcon() { return <svg width="72" height="72" viewBox="0 0 72 72" fill="none"><path d="M36 6L10 18v16c0 14.94 10.94 28.94 26 32 15.06-3.06 26-17.06 26-32V18L36 6z" fill="rgba(14,203,129,0.12)" stroke="#0ECB81" strokeWidth="2"/><path d="M25 36l8 8 14-16" stroke="#0ECB81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ClockPendingIcon() { return <svg width="72" height="72" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="28" stroke="#C9A227" strokeWidth="2" fill="rgba(242,186,14,0.08)"/><path d="M36 22v14l9 5" stroke="#C9A227" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XRejectedIcon() { return <svg width="72" height="72" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="28" stroke="#F6465D" strokeWidth="2" fill="rgba(246,70,93,0.08)"/><path d="M26 26l20 20M46 26L26 46" stroke="#F6465D" strokeWidth="2.5" strokeLinecap="round"/></svg> }

function StepDot({ idx, current }: { idx: number; current: number }) {
  const active = idx === current
  const completed = idx < current
  return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}><div style={{ width:32, height:32, borderRadius:'50%', background: completed ? '#0ECB81' : active ? '#C9A227' : '#1A1A1A', border:`2px solid ${completed ? '#0ECB81' : active ? '#C9A227' : 'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>{completed ? '✓' : <span style={{ fontSize:12, fontWeight:800, color: active ? '#000' : '#555' }}>{idx + 1}</span>}</div><span style={{ fontSize:9, color: active ? '#C9A227' : completed ? '#0ECB81' : '#444', fontWeight:600, textAlign:'center', maxWidth:60, lineHeight:1.2 }}>{STEPS[idx].label}</span></div>
}

export default function KYCPage() {
  const router = useRouter()
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
  const [uploading, setUploading] = useState<{ front: number; back: number }>({ front: 0, back: 0 })
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetch('/api/user/kyc').then(r => r.json()).then(d => { setStatus(d.status); setRejectionReason(d.kyc?.rejectionReason || null); setLoading(false) }) }, [])
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setFront = (file: File | null) => { setFrontFile(file); setFrontPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null); setMsg(null) }
  const setBack = (file: File | null) => { setBackFile(file); setBackPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null); setMsg(null) }

  async function normalizeImageFile(file: File): Promise<File> {
    const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)
    if (isJpeg || file.type === 'application/pdf') return file
    if (!file.type.startsWith('image/')) return file
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url })
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d'); if (!ctx) return file
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return file
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
    } finally { URL.revokeObjectURL(url) }
  }

  async function uploadBlob(key: 'front' | 'back', file: File) {
    const normalized = await normalizeImageFile(file)
    const res = await upload(`kyc/${Date.now()}-${key}.jpg`, normalized, {
      access: 'private',
      handleUploadUrl: '/api/kyc/upload',
      multipart: normalized.size > 4 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => setUploading(p => ({ ...p, [key]: Math.round(percentage) })),
    })
    if (!res?.downloadUrl) throw new Error(`${key} upload did not finish`)
    return res.downloadUrl
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true); setMsg(null); setStatus('PENDING_REVIEW')
    try {
      if (!form.firstName || !form.lastName || !form.dob || !form.country) throw new Error('Please complete your personal details.')
      if (!frontFile || !backFile) throw new Error('Please upload front and back photos.')
      const [frontUrl, backUrl] = await Promise.all([uploadBlob('front', frontFile), uploadBlob('back', backFile)])
      const res = await fetch('/api/kyc/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: `${form.firstName} ${form.lastName}`.trim(), dob: form.dob, country: form.country, docType: form.docType, frontUrl, backUrl }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit KYC')
      setMsg({ type: 'success', text: "Submitted! We'll review within 1–2 business days." })
      router.push('/home')
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Failed to submit KYC. Please try again.' }); setStatus(null) } finally { setSubmitting(false) }
  }

  if (loading) return <CenterSpinner />
  if (status === 'APPROVED') return <StateCard icon={<ShieldVerifiedIcon />} badge="VERIFIED" title="Identity Verified" body="Your identity is confirmed. You have full access to withdrawals and all platform features." />
  if (status === 'PENDING_REVIEW') return <StateCard icon={<ClockPendingIcon />} badge="PENDING REVIEW" title="Under Review" body="Your documents are with our compliance team. This takes 1–2 business days. You'll be notified by email." />
  if (status === 'REJECTED') return <div style={wrap}><StateCard icon={<XRejectedIcon />} badge="NOT APPROVED" title="Verification Not Approved" body={rejectionReason || 'Ensure documents are clear, unexpired, and match your account name.'} button={<button className="btn-primary" onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Resubmit Documents →</button>} /></div>

  const step1Valid = form.firstName && form.lastName && form.dob && form.country
  const step2Valid = frontFile && backFile && form.docType

  return <div style={{ padding:'0 0 100px', maxWidth:560, margin:'0 auto' }}>
    <div style={{ padding:'20px 20px 0' }}>
      <div style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(255,255,255,0.05)', color:'#777', fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>NOT VERIFIED</div>
      <h1 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>Identity Verification</h1>
      <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6, marginBottom:24 }}>Complete KYC to unlock withdrawals and full account access.</p>
      <div style={{ display:'flex', alignItems:'flex-start', marginBottom:28, position:'relative' }}>{STEPS.map((s, i) => <div key={s.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>{i < STEPS.length - 1 && <div style={{ position:'absolute', top:15, left:'50%', width:'100%', height:2, background:i < step ? '#0ECB81' : 'rgba(255,255,255,0.07)', zIndex:0 }} />}<div style={{ position:'relative', zIndex:1 }}><StepDot idx={i} current={step} /></div></div>)}</div>
    </div>
    <div style={{ padding:'0 20px' }}>
      {step === 0 && <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <InfoBox title="Personal Information" desc="Enter your legal name exactly as it appears on your government-issued ID." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}><Field label="FIRST NAME"><input style={inp} placeholder="John" value={form.firstName} onChange={f('firstName')} /></Field><Field label="LAST NAME"><input style={inp} placeholder="Doe" value={form.lastName} onChange={f('lastName')} /></Field></div>
        <Field label="DATE OF BIRTH"><input type="date" style={inp} value={form.dob} onChange={f('dob')} max={new Date().toISOString().split('T')[0]} /></Field>
        <Field label="COUNTRY OF RESIDENCE"><select style={{ ...inp, appearance:'none' }} value={form.country} onChange={f('country')}><option value="">Select country…</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
        <button className="btn-primary" disabled={!step1Valid} onClick={() => setStep(1)} style={{ opacity: step1Valid ? 1 : 0.5 }}>Continue →</button>
      </div>}
      {step === 1 && <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <InfoBox title="ID Document" desc="Upload the front and back of your government-issued ID." />
        <Field label="DOCUMENT TYPE"><select style={{ ...inp, appearance:'none' }} value={form.docType} onChange={f('docType')}>{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></Field>
        <UploadCard label="Document Front photo" file={frontFile} preview={frontPreview} progress={uploading.front} onClick={() => frontRef.current?.click()} />
        <UploadCard label="Document Back photo" file={backFile} preview={backPreview} progress={uploading.back} onClick={() => backRef.current?.click()} />
        <input ref={frontRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => setFront(e.target.files?.[0] || null)} />
        <input ref={backRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => setBack(e.target.files?.[0] || null)} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={() => setStep(0)} className="btn-ghost">← Back</button><button onClick={() => setStep(2)} disabled={!step2Valid} className="btn-primary" style={{ opacity: step2Valid ? 1 : 0.5 }}>Review →</button></div>
      </div>}
      {step === 2 && <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <ReviewBox rows={[['Full Name', `${form.firstName} ${form.lastName}`], ['Date of Birth', form.dob], ['Country', form.country], ['Document Type', DOC_TYPES.find(d => d.value === form.docType)?.label], ['Front Upload', uploading.front ? `${uploading.front}%` : 'Pending'], ['Back Upload', uploading.back ? `${uploading.back}%` : 'Pending']]} />
        {msg && <div style={{ padding:'10px 14px', borderRadius:9, background:msg.type==='success' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', color:msg.type==='success' ? '#0ECB81' : '#F6465D' }}>{msg.text}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><button onClick={() => setStep(1)} className="btn-ghost">← Back</button><button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting…' : 'Submit for Review →'}</button></div>
      </div>}
    </div>
  </div>
}

function UploadCard({ label, file, preview, progress, onClick }: any) { return <div onClick={onClick} style={uploadStyle(file)}>{preview ? <img src={preview} alt={label} style={{ maxHeight:140, borderRadius:8, objectFit:'contain' }} /> : <div><div style={{ fontWeight:600, fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>{label}</div><div style={{ fontSize:11, color:'#444' }}>Camera or file · Max 10MB</div></div>}<div style={{ marginTop:10, fontSize:12, color:'#777' }}>{progress ? `${progress}% uploaded` : ''}</div></div> }
function InfoBox({ title, desc }: any) { return <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}><div style={{ display:'flex', gap:10 }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C9A227" strokeWidth="2" style={{ flexShrink:0, marginTop:2 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><div><div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{title}</div><div style={{ color:'var(--text-muted)', fontSize:12, lineHeight:1.5 }}>{desc}</div></div></div></div> }
function Field({ label, children }: any) { return <div><label style={lbl}>{label}</label>{children}</div> }
function ReviewBox({ rows }: any) { return <div style={{ border:'1px solid var(--border)', borderRadius:14, padding:16 }}>{rows.map(([l, v]: any) => <Row key={l} l={l} v={v} />)}</div> }
function Row({ l, v }: { l: string; v: any }) { return <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text-muted)', fontSize:13 }}>{l}</span><span style={{ fontWeight:600, fontSize:13, maxWidth:'55%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span></div> }
function StateCard({ icon, badge, title, body, button }: any) { return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, textAlign:'center' }}><div style={{ marginBottom:20 }}>{icon}</div><div style={{ display:'inline-block', padding:'6px 16px', borderRadius:99, background:'rgba(255,255,255,0.06)', color:'#fff', fontSize:12, fontWeight:700, marginBottom:16 }}>{badge}</div><h2 style={{ fontWeight:800, fontSize:22, marginBottom:10 }}>{title}</h2><p style={{ color:'var(--text-muted)', fontSize:14, maxWidth:320, lineHeight:1.7, marginBottom:24 }}>{body}</p>{button}</div> }
function CenterSpinner() { return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div style={{ width:32, height:32, border:'3px solid rgba(242,186,14,0.2)', borderTopColor:'#C9A227', borderRadius:'50%', animation:'spin .8s linear infinite' }} /></div> }

const wrap = { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24, textAlign:'center' } as const
const inp: React.CSSProperties = { width:'100%', background:'#111', color:'#fff', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
const lbl: React.CSSProperties = { display:'block', color:'#555', fontSize:11, fontWeight:600, letterSpacing:'0.06em', marginBottom:7 }
const uploadStyle = (active: File | null): React.CSSProperties => ({ border:`2px dashed ${active ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius:14, padding:18, textAlign:'center', cursor:'pointer', background:active ? 'rgba(14,203,129,0.04)' : 'transparent' })
