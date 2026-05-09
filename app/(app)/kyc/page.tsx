'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { COUNTRIES } from '@/lib/countries'

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
]

const FILE_KEYS = ['front', 'back', 'selfie'] as const

type FileKey = (typeof FILE_KEYS)[number]
type UploadState = { progress: number; status: 'idle' | 'uploading' | 'done' | 'error'; error?: string }

export default function KYCPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport' })
  const [files, setFiles] = useState<Record<FileKey, File | null>>({ front: null, back: null, selfie: null })
  const [urls, setUrls] = useState<Record<FileKey, string | null>>({ front: null, back: null, selfie: null })
  const [uploads, setUploads] = useState<Record<FileKey, UploadState>>({
    front: { progress: 0, status: 'idle' },
    back: { progress: 0, status: 'idle' },
    selfie: { progress: 0, status: 'idle' },
  })
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc')
      .then(r => r.json())
      .then(d => {
        setStatus(d.status)
        setRejectionReason(d.kyc?.rejectionReason || null)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    return () => {
      Object.values(urls).forEach(u => u && URL.revokeObjectURL(u))
    }
  }, [urls])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const setFile = (key: FileKey, file: File | null) => {
    setFiles(p => ({ ...p, [key]: file }))
    setUrls(p => {
      if (p[key]) URL.revokeObjectURL(p[key]!)
      return { ...p, [key]: file ? URL.createObjectURL(file) : null }
    })
    setUploads(p => ({ ...p, [key]: { progress: 0, status: 'idle' } }))
    setMsg(null)
  }

  async function normalizeImageFile(file: File): Promise<File> {
    const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)
    if (isJpeg || file.type === 'application/pdf') return file
    if (!file.type.startsWith('image/')) return file

    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = reject
        el.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return file
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function uploadOne(key: FileKey, label: string, file: File) {
    const normalized = await normalizeImageFile(file)
    setUploads(p => ({ ...p, [key]: { progress: 0, status: 'uploading' } }))
    try {
      const pathname = `kyc/${Date.now()}-${label}.jpg`
      const result = await upload(pathname, normalized, {
        access: 'public',
        handleUploadUrl: '/api/kyc/upload',
        onUploadProgress: ({ percentage }) => {
          setUploads(p => ({ ...p, [key]: { progress: Math.round(percentage), status: 'uploading' } }))
        },
      })
      setUploads(p => ({ ...p, [key]: { progress: 100, status: 'done' } }))
      return result.url
    } catch (err: any) {
      const message = err?.message?.replace(/^Vercel Blob:\s*/i, '') || 'Upload failed'
      setUploads(p => ({ ...p, [key]: { progress: 0, status: 'error', error: message } }))
      throw new Error(message)
    }
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setMsg(null)
    try {
      if (!form.firstName || !form.lastName || !form.dob || !form.country) {
        throw new Error('Please complete your personal details.')
      }
      if (!files.front || !files.back || !files.selfie) {
        throw new Error('Please upload front, back, and selfie photos.')
      }

      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        uploadOne('front', 'front', files.front),
        uploadOne('back', 'back', files.back),
        uploadOne('selfie', 'selfie', files.selfie),
      ])

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          dob: form.dob,
          country: form.country,
          docType: form.docType,
          documentFrontUrl: frontUrl,
          documentBackUrl: backUrl,
          selfieUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setStatus('PENDING_REVIEW')
      setMsg({ type: 'success', text: 'Submitted successfully. We’ll review it shortly.' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const canContinue = useMemo(() => form.firstName && form.lastName && form.dob && form.country, [form])

  if (loading) return <CenteredSpinner />
  if (status === 'APPROVED') return <SimpleState title="Identity Verified" body="Your identity is confirmed." />
  if (status === 'PENDING_REVIEW') return <SimpleState title="Under Review" body="We’ll notify you within 1–2 business days." />
  if (status === 'REJECTED') {
    return <div style={pageStyle}><SimpleState title="Verification Not Approved" body={rejectionReason || 'Please resubmit.'} button={<button className="btn-primary" onClick={() => { setStatus('NOT_SUBMITTED'); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Resubmit</button>} /></div>
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Identity Verification</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Complete KYC to unlock withdrawals.</p>

      <Section title="Personal Info">
        <Grid2>
          <input placeholder="First name" value={form.firstName} onChange={set('firstName')} style={inputStyle} />
          <input placeholder="Last name" value={form.lastName} onChange={set('lastName')} style={inputStyle} />
          <input type="date" value={form.dob} onChange={set('dob')} style={inputStyle} />
          <select value={form.country} onChange={set('country')} style={inputStyle}>
            <option value="">Country</option>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={form.docType} onChange={set('docType')} style={inputStyle}>
            {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </Grid2>
      </Section>

      <Section title="Uploads">
        {(['front', 'back', 'selfie'] as const).map(key => (
          <UploadCard
            key={key}
            label={key === 'front' ? 'Document Front photo' : key === 'back' ? 'Document Back photo' : 'Selfie photo'}
            file={files[key]}
            preview={urls[key]}
            upload={uploads[key]}
            onClick={() => ({ front: frontRef, back: backRef, selfie: selfieRef }[key].current?.click())}
          />
        ))}
        <HiddenInputs
          frontRef={frontRef}
          backRef={backRef}
          selfieRef={selfieRef}
          onChange={setFile}
        />
      </Section>

      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, background: msg.type === 'success' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', color: msg.type === 'success' ? '#0ECB81' : '#F6465D', marginBottom: 14 }}>{msg.text}</div>}

      <button className="btn-primary" disabled={submitting || !canContinue} onClick={submit} style={{ width: '100%', opacity: submitting || !canContinue ? 0.6 : 1 }}>
        {submitting ? 'Uploading…' : 'Submit for Review'}
      </button>
    </div>
  )
}

function HiddenInputs({ frontRef, backRef, selfieRef, onChange }: any) {
  return (
    <>
      <input ref={frontRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => onChange('front', e.target.files?.[0] || null)} />
      <input ref={backRef} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e => onChange('back', e.target.files?.[0] || null)} />
      <input ref={selfieRef} type="file" accept="image/*" capture="user" hidden onChange={e => onChange('selfie', e.target.files?.[0] || null)} />
    </>
  )
}

function UploadCard({ label, file, preview, upload, onClick }: any) {
  return (
    <div onClick={onClick} style={uploadBoxStyle(file)}>
      {preview ? <img src={preview} alt={label} style={previewStyle} /> : <UploadHint label={file ? file.name : label} />}
      <Progress upload={upload} />
    </div>
  )
}

function Progress({ upload }: any) {
  if (upload.status === 'idle') return null
  return <div style={{ marginTop: 10, fontSize: 12, color: upload.status === 'error' ? '#F6465D' : 'var(--text-muted)' }}>{upload.status === 'error' ? upload.error : `${upload.progress}% uploaded`}</div>
}

function SimpleState({ title, body, button }: any) {
  return <div style={{ padding: 24, textAlign: 'center', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}><h2 style={{ fontSize: 22, fontWeight: 800 }}>{title}</h2><p style={{ color: 'var(--text-muted)' }}>{body}</p>{button}</div>
}
function CenteredSpinner() { return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div> }
function Section({ title, children }: any) { return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{title}</div>{children}</div> }
function Grid2({ children }: any) { return <div style={{ display: 'grid', gap: 12 }}>{children}</div> }

const pageStyle: React.CSSProperties = { padding: '20px 20px 100px', maxWidth: 560, margin: '0 auto' }
const inputStyle: React.CSSProperties = { width: '100%', background: '#111', color: '#fff', padding: '13px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const previewStyle: React.CSSProperties = { maxHeight: 160, width: '100%', objectFit: 'contain', borderRadius: 8 }
function uploadBoxStyle(active: File | null): React.CSSProperties { return { border: `2px dashed ${active ? '#0ECB81' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer', background: active ? 'rgba(14,203,129,0.04)' : 'transparent', marginBottom: 10 } }
function UploadHint({ label }: { label: string }) { return <><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div><div style={{ fontSize: 11, color: '#444' }}>Camera or file · Max 10MB</div></> }
