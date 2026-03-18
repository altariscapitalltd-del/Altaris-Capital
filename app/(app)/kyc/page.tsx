'use client'
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id: 'personal', label: 'Profile', description: 'Confirm your legal details' },
  { id: 'document', label: 'Document', description: 'Upload a government-issued ID' },
  { id: 'selfie', label: 'Selfie', description: 'Match your face to your ID' },
  { id: 'review', label: 'Review', description: 'Submit for compliance review' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, bg: string, color: string }> = {
    NOT_SUBMITTED: { label: 'Not verified', bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1' },
    PENDING_REVIEW: { label: 'Pending', bg: 'rgba(242,186,14,0.14)', color: '#F2BA0E' },
    APPROVED: { label: 'Verified', bg: 'rgba(34,197,94,0.14)', color: '#4ade80' },
    REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.14)', color: '#f87171' },
  }
  const item = map[status] || map.NOT_SUBMITTED
  return <span style={{ padding: '7px 12px', borderRadius: 999, background: item.bg, color: item.color, fontSize: 12, fontWeight: 700 }}>{item.label}</span>
}

function ShieldCheckIcon() {
  return <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z"/><path d="m9.5 12 1.8 1.8L15.5 9.5"/></svg>
}
function DocumentCardIcon() {
  return <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h6"/><path d="M9 13h6M9 17h6"/></svg>
}
function CameraCardIcon() {
  return <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h3l2-2h6l2 2h3v10H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
}

export default function KYCPage() {
  const [status, setStatus] = useState('NOT_SUBMITTED')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport', docNumber: '' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then((r) => r.json()).then((d) => { setStatus(d.status || 'NOT_SUBMITTED'); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const completedSteps = useMemo(() => ([
    !!(form.firstName && form.lastName && form.dob && form.country),
    !!(form.docType && form.docNumber && docFile),
    !!selfieFile,
    false,
  ]), [form, docFile, selfieFile])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (docFile) fd.append('documentFile', docFile)
      if (selfieFile) fd.append('selfieFile', selfieFile)
      const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) return setMsg({ type: 'error', text: data.error || 'Submission failed' })
      setStatus('PENDING_REVIEW')
      setMsg({ type: 'success', text: 'Your verification package is now pending review.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}><div style={{ width: 34, height: 34, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div>

  if (status === 'APPROVED' || status === 'PENDING_REVIEW') {
    const approved = status === 'APPROVED'
    return (
      <div style={{ padding: '12px 16px 32px' }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(242,186,14,0.16), rgba(14,18,24,1))', border: '1px solid rgba(242,186,14,0.18)', borderRadius: 24, padding: 24, minHeight: '70vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Identity Verification</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{approved ? 'Verified account' : 'Verification in progress'}</h1>
            </div>
            <StatusBadge status={status} />
          </div>
          <div style={{ width: 82, height: 82, borderRadius: 22, background: approved ? 'rgba(34,197,94,0.12)' : 'rgba(242,186,14,0.12)', color: approved ? '#4ade80' : '#F2BA0E', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
            <ShieldCheckIcon />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, maxWidth: 440 }}>{approved ? 'Your identity has been approved and your account is fully verified for investing, withdrawals, and bonus eligibility.' : 'Our compliance team is reviewing your submitted documents and selfie. We will update your status automatically as soon as the review is completed.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 16px 32px', display: 'grid', gap: 18 }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,1))', border: '1px solid var(--border)', borderRadius: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Identity verification</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Complete your KYC</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>A polished verification flow designed to feel like a top-tier financial platform. Submit your ID and a live selfie to unlock full access.</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {STEPS.map((item, index) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', padding: 12, borderRadius: 16, background: index === step ? 'rgba(242,186,14,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${index === step ? 'rgba(242,186,14,0.24)' : 'rgba(255,255,255,0.06)'}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: completedSteps[index] || index < step ? 'rgba(34,197,94,0.14)' : index === step ? 'rgba(242,186,14,0.14)' : 'rgba(148,163,184,0.12)', display: 'grid', placeItems: 'center', color: completedSteps[index] || index < step ? '#4ade80' : index === step ? '#F2BA0E' : '#cbd5e1', fontWeight: 800 }}>{index + 1}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{item.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.description}</div>
              </div>
              {(completedSteps[index] || index < step) && <ShieldCheckIcon />}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && <div style={{ display: 'grid', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>First name</label><input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
          <div><label style={labelStyle}>Last name</label><input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div><label style={labelStyle}>Date of birth</label><input className="input" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} /></div>
        <div><label style={labelStyle}>Country of residence</label><select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}><option value="">Select country</option>{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select></div>
        <button className="btn-primary" disabled={!completedSteps[0]} onClick={() => setStep(1)}>Continue to document upload</button>
      </div>}

      {step === 1 && <div style={{ display: 'grid', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>{[{ id: 'passport', label: 'Passport' }, { id: 'drivers_license', label: 'Driver license' }, { id: 'national_id', label: 'National ID' }].map((doc) => <button key={doc.id} onClick={() => setForm((f) => ({ ...f, docType: doc.id }))} style={{ borderRadius: 14, border: `1px solid ${form.docType === doc.id ? 'rgba(242,186,14,0.4)' : 'var(--border)'}`, padding: 12, background: form.docType === doc.id ? 'rgba(242,186,14,0.10)' : 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}>{doc.label}</button>)}</div>
        <div><label style={labelStyle}>Document number</label><input className="input" value={form.docNumber} onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))} /></div>
        <button onClick={() => docRef.current?.click()} style={uploadCardStyle}><DocumentCardIcon /><div><div style={{ fontWeight: 800 }}>Upload document</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{docFile ? docFile.name : 'Tap to add your document file'}</div></div></button>
        <input ref={docRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button className="btn-ghost" onClick={() => setStep(0)}>Back</button><button className="btn-primary" disabled={!completedSteps[1]} onClick={() => setStep(2)}>Continue to selfie</button></div>
      </div>}

      {step === 2 && <div style={{ display: 'grid', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
        <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Selfie checklist</div>
          {['Face the camera directly', 'Use bright lighting', 'Keep your face fully visible', 'Match your selfie to the document details'].map((item) => <div key={item} style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '6px 0' }}>• {item}</div>)}
        </div>
        <button onClick={() => selfieRef.current?.click()} style={uploadCardStyle}><CameraCardIcon /><div><div style={{ fontWeight: 800 }}>Take selfie</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selfieFile ? selfieFile.name : 'Open camera or upload a selfie'}</div></div></button>
        <input ref={selfieRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button className="btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn-primary" disabled={!completedSteps[2]} onClick={() => setStep(3)}>Review details</button></div>
      </div>}

      {step === 3 && <div style={{ display: 'grid', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
        <div style={{ display: 'grid', gap: 10 }}>{[
          ['Full name', `${form.firstName} ${form.lastName}`],
          ['Date of birth', form.dob],
          ['Country', form.country],
          ['Document', `${form.docType.replace('_', ' ')} • ${form.docNumber}`],
          ['Document file', docFile?.name || ''],
          ['Selfie', selfieFile?.name || ''],
        ].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span><span style={{ fontWeight: 700, fontSize: 13, textAlign: 'right' }}>{value}</span></div>)}</div>
        {msg && <div style={{ padding: 12, borderRadius: 12, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 13 }}>{msg.text}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button className="btn-ghost" onClick={() => setStep(2)}>Back</button><button className="btn-primary" disabled={submitting} onClick={submit}>{submitting ? 'Submitting...' : 'Submit verification'}</button></div>
      </div>}
    </div>
  )
}

const labelStyle: CSSProperties = { display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 6 }
const uploadCardStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: 14, borderRadius: 18, border: '1px dashed rgba(242,186,14,0.35)', padding: 18, background: 'rgba(242,186,14,0.05)', color: 'var(--text-primary)', textAlign: 'left' }
