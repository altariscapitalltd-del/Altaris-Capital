'use client'

import { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [{ label: 'Personal Info' }, { label: 'ID Front/Back' }, { label: 'Review' }]
const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
]

type FileKey = 'front' | 'back'
type UploadState = { status: 'idle' | 'uploading' | 'done' | 'error'; progress: number; error?: string; url?: string }

export default function KYCPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport' })
  const [files, setFiles] = useState<Record<FileKey, File | null>>({ front: null, back: null })
  const [previews, setPreviews] = useState<Record<FileKey, string | null>>({ front: null, back: null })
  const [uploads, setUploads] = useState<Record<FileKey, UploadState>>({ front: { status: 'idle', progress: 0 }, back: { status: 'idle', progress: 0 } })
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then(r => r.json()).then(d => { setStatus(d.status); setRejectionReason(d.kyc?.rejectionReason || null); setLoading(false) })
  }, [])

  useEffect(() => () => { Object.values(previews).forEach(u => u && URL.revokeObjectURL(u)) }, [previews])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const setFile = (key: FileKey, file: File | null) => {
    setFiles(p => ({ ...p, [key]: file }))
    setPreviews(p => {
      if (p[key]) URL.revokeObjectURL(p[key]!)
      return { ...p, [key]: file ? URL.createObjectURL(file) : null }
    })
    setUploads(p => ({ ...p, [key]: { status: 'idle', progress: 0 } }))
    setMsg(null)
  }

  async function normalize(file: File) {
    if (file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)) return file
    if (!file.type.startsWith('image/')) return file
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) return file
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    } finally { URL.revokeObjectURL(url) }
  }

  async function uploadOne(key: FileKey) {
    const file = files[key]
    if (!file) throw new Error(`Missing ${key} image`)
    setUploads(p => ({ ...p, [key]: { status: 'uploading', progress: 0 } }))
    const normalized = await normalize(file)
    const label = key === 'front' ? 'front' : 'back'
    const pathname = `kyc/${Date.now()}-${label}.jpg`
    const result = await upload(pathname, normalized, {
      access: 'public',
      handleUploadUrl: '/api/kyc/upload',
      onUploadProgress: ({ percentage }) => setUploads(p => ({ ...p, [key]: { status: 'uploading', progress: Math.round(percentage) } })),
    })
    setUploads(p => ({ ...p, [key]: { status: 'done', progress: 100, url: result.url } }))
    return result.url
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setMsg(null)
    try {
      if (!form.firstName || !form.lastName || !form.dob || !form.country) throw new Error('Please complete your personal details.')
      if (!files.front || !files.back) throw new Error('Please upload front and back photos.')

      const [frontUrl, backUrl] = await Promise.all([uploadOne('front'), uploadOne('back')])

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          dob: form.dob,
          country: form.country,
          docType: form.docType,
          frontUrl,
          backUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit KYC')
      setStatus('PENDING_REVIEW')
      setMsg({ type: 'success', text: 'Submitted! We’ll review it within 1–2 business days.' })
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Failed to submit KYC. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <CenteredSpinner />
  if (status === 'APPROVED') return <State title="Identity Verified" body="Your identity is confirmed." />
  if (status === 'PENDING_REVIEW') return <State title="Under Review" body="We’ll notify you within 1–2 business days." />
  if (status === 'REJECTED') return <State title="Verification Not Approved" body={rejectionReason || 'Please resubmit.'} button={<button className="btn-primary" onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Resubmit</button>} />

  const valid1 = form.firstName && form.lastName && form.dob && form.country
  const valid2 = files.front && files.back

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Identity Verification</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Complete KYC to unlock withdrawals.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((s, i) => <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 999, background: i === step ? '#F2BA0E' : i < step ? '#0ECB81' : '#111', color: i === step ? '#000' : '#fff', fontSize: 11, fontWeight: 800 }}>{s.label}</div>)}
      </div>

      {step === 0 && <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="First name" value={form.firstName} onChange={set('firstName')} style={inputStyle} />
        <input placeholder="Last name" value={form.lastName} onChange={set('lastName')} style={inputStyle} />
        <input type="date" value={form.dob} onChange={set('dob')} style={inputStyle} />
        <select value={form.country} onChange={set('country')} style={inputStyle}><option value="">Country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select>
        <button className="btn-primary" disabled={!valid1} onClick={() => setStep(1)} style={{ opacity: valid1 ? 1 : 0.5 }}>Continue →</button>
      </div>}

      {step === 1 && <div style={{ display: 'grid', gap: 12 }}>
        <select value={form.docType} onChange={set('docType')} style={inputStyle}>{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
        <UploadBox label="Upload ID front" file={files.front} preview={previews.front} upload={uploads.front} onClick={() => frontRef.current?.click()} />
        <UploadBox label="Upload ID back" file={files.back} preview={previews.back} upload={uploads.back} onClick={() => backRef.current?.click()} />
        <input ref={frontRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => setFile('front', e.target.files?.[0] || null)} />
        <input ref={backRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => setFile('back', e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button className="btn-ghost" onClick={() => setStep(0)}>← Back</button><button className="btn-primary" disabled={!valid2} onClick={() => setStep(2)} style={{ opacity: valid2 ? 1 : 0.5 }}>Review →</button></div>
      </div>}

      {step === 2 && <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <Row l="Full Name" v={`${form.firstName} ${form.lastName}`} />
          <Row l="Date of Birth" v={form.dob} />
          <Row l="Country" v={form.country} />
          <Row l="Document Type" v={DOC_TYPES.find(d => d.value === form.docType)?.label} />
          <Row l="Front Photo" v={files.front?.name} />
          <Row l="Back Photo" v={files.back?.name} />
          <Row l="Front Upload" v={uploads.front.status === 'done' ? 'Uploaded' : uploads.front.status === 'uploading' ? `${uploads.front.progress}%` : 'Pending'} />
          <Row l="Back Upload" v={uploads.back.status === 'done' ? 'Uploaded' : uploads.back.status === 'uploading' ? `${uploads.back.progress}%` : 'Pending'} />
        </div>
        {msg && <div style={{ padding: '10px 14px', borderRadius: 9, background: msg.type === 'success' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', color: msg.type === 'success' ? '#0ECB81' : '#F6465D' }}>{msg.text}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button className="btn-ghost" onClick={() => setStep(1)}>← Back</button><button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for Review →'}</button></div>
      </div>}
    </div>
  )
}

function UploadBox({ label, file, preview, upload, onClick }: any) {
  return <div onClick={onClick} style={uploadBoxStyle(file)}><div>{preview ? <img src={preview} alt={label} style={previewStyle} /> : <UploadHint label={file ? file.name : label} />}</div><div style={{ marginTop: 10, fontSize: 12, color: upload.status === 'error' ? '#F6465D' : 'var(--text-muted)' }}>{upload.status === 'uploading' ? `${upload.progress}% uploaded` : upload.status === 'done' ? 'Uploaded' : upload.status === 'error' ? upload.error : ''}</div></div>
}
function State({ title, body, button }: any) { return <div style={{ padding: 24, textAlign: 'center', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}><h2 style={{ fontSize: 22, fontWeight: 800 }}>{title}</h2><p style={{ color: 'var(--text-muted)' }}>{body}</p>{button}</div> }
function CenteredSpinner() { return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div> }
function Row({ l, v }: { l: string; v: any }) { return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</span><span style={{ fontWeight: 600, fontSize: 13, maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span></div> }

const pageStyle: React.CSSProperties = { padding: '20px 20px 100px', maxWidth: 560, margin: '0 auto' }
const inputStyle: React.CSSProperties = { width: '100%', background: '#111', color: '#fff', padding: '13px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const previewStyle: React.CSSProperties = { maxHeight: 160, width: '100%', objectFit: 'contain', borderRadius: 8 }
function uploadBoxStyle(active: File | null): React.CSSProperties { return { border: `2px dashed ${active ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer', background: active ? 'rgba(14,203,129,0.04)' : 'transparent' } }
function UploadHint({ label }: { label: string }) { return <><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div><div style={{ fontSize: 11, color: '#444' }}>Camera or file · Max 10MB</div></> }
