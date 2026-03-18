'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'document', label: 'Government ID' },
  { id: 'selfie', label: 'Selfie check' },
  { id: 'review', label: 'Review & submit' },
]

function ShieldBadge({ tone = 'gold' }: { tone?: 'gold' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    gold: { bg: 'rgba(242,186,14,0.14)', stroke: '#F2BA0E' },
    success: { bg: 'rgba(14,203,129,0.12)', stroke: '#0ECB81' },
    warning: { bg: 'rgba(242,186,14,0.12)', stroke: '#F5C542' },
    danger: { bg: 'rgba(246,70,93,0.12)', stroke: '#F6465D' },
  }[tone]
  return (
    <div style={{ width: 84, height: 84, borderRadius: 24, background: tones.bg, display: 'grid', placeItems: 'center', border: `1px solid ${tones.stroke}33` }}>
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M24 5l15 6v10c0 10-6.8 17.7-15 21-8.2-3.3-15-11-15-21V11l15-6z" stroke={tones.stroke} strokeWidth="2.8" />
        <path d="M17 23.5l4.7 4.7L31.5 18" stroke={tones.stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function DocumentCard({ active, filled, title, subtitle, onClick, icon }: any) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'left', borderRadius: 20, border: `1px solid ${active ? 'rgba(242,186,14,0.45)' : 'var(--border)'}`, background: active ? 'rgba(242,186,14,0.08)' : 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, background: filled ? 'rgba(14,203,129,0.16)' : 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
          {filled && <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700, marginTop: 8 }}>Ready to submit</div>}
        </div>
      </div>
    </button>
  )
}

export default function KYCPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
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
    fetch('/api/user/kyc').then((r) => r.json()).then((d) => {
      const rawStatus = d.status || 'NOT_SUBMITTED'
      const showRejected = typeof window !== 'undefined' && sessionStorage.getItem('altaris-kyc-rejected-visible') === '1'
      setStatus(rawStatus === 'REJECTED' && !showRejected ? 'NOT_SUBMITTED' : rawStatus)
      setRejectionReason(d.kyc?.rejectionReason || '')
      if (rawStatus === 'REJECTED' && typeof window !== 'undefined') sessionStorage.setItem('altaris-kyc-rejected-visible', '1')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const statusMeta = useMemo(() => {
    switch (status) {
      case 'APPROVED': return { label: 'Verified', tone: 'success' as const, description: 'Your identity is verified and your account is fully active.' }
      case 'PENDING_REVIEW': return { label: 'Pending', tone: 'warning' as const, description: 'We are reviewing your documents. Most checks finish within 24 hours.' }
      case 'REJECTED': return { label: 'Rejected', tone: 'danger' as const, description: rejectionReason || 'Your last submission was rejected. Please upload clearer images and try again.' }
      default: return { label: 'Not verified', tone: 'gold' as const, description: 'Complete your KYC to unlock a fully verified investment account.' }
    }
  }, [status, rejectionReason])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (docFile) fd.append('documentFile', docFile)
    if (selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setStatus('PENDING_REVIEW')
      sessionStorage.removeItem('altaris-kyc-rejected-visible')
      setMsg({ type: 'success', text: 'Your documents were sent successfully and are now pending review.' })
    } else {
      setMsg({ type: 'error', text: data.error || 'Submission failed' })
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', animation: 'spin .9s linear infinite' }} /></div>

  if (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'REJECTED') {
    return (
      <div style={{ padding: '8px 16px 28px' }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid var(--border)', borderRadius: 28, padding: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><ShieldBadge tone={statusMeta.tone} /></div>
          <div style={{ display: 'inline-flex', padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 800, marginBottom: 14 }}>{statusMeta.label}</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Identity verification</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto', lineHeight: 1.7 }}>{statusMeta.description}</p>
          {status === 'REJECTED' && (
            <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0) }}>
              Start a new submission
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 28px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(242,186,14,0.08)', color: 'var(--brand-primary)', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{statusMeta.label}</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Verify your identity</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>A premium KYC flow designed to feel fast, secure, and trusted. Upload one document and one selfie to get reviewed.</p>
      </div>

      <div style={{ background: 'linear-gradient(155deg, rgba(242,186,14,0.16), rgba(15,18,22,1) 42%, rgba(11,14,17,1))', border: '1px solid rgba(242,186,14,0.18)', borderRadius: 24, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          {STEPS.map((item, index) => (
            <div key={item.id} style={{ flex: 1 }}>
              <div style={{ height: 8, borderRadius: 999, background: index <= step ? '#F2BA0E' : 'rgba(255,255,255,0.12)', marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: index === step ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>Status: <strong style={{ color: '#fff' }}>{statusMeta.label}</strong></div>
      </div>

      {step === 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Tell us about yourself</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>Use the same legal details shown on your government-issued ID.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="input" placeholder="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              <input className="input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <input className="input" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
              <select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                <option value="">Select country</option>
                {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary" disabled={!form.firstName || !form.lastName || !form.dob || !form.country} onClick={() => setStep(1)}>Continue</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Select document type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
              {[['passport', 'Passport'], ['drivers_license', 'Driver license'], ['national_id', 'National ID']].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, docType: value }))} style={{ borderRadius: 14, border: `1px solid ${form.docType === value ? 'rgba(242,186,14,0.4)' : 'var(--border)'}`, background: form.docType === value ? 'rgba(242,186,14,0.08)' : 'transparent', color: form.docType === value ? 'var(--brand-primary)' : 'var(--text-secondary)', padding: '12px 8px', fontSize: 12, fontWeight: 700 }}>{label}</button>
              ))}
            </div>
            <input className="input" placeholder="Document number" value={form.docNumber} onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))} />
            <div style={{ marginTop: 12 }}>
              <DocumentCard
                active={!docFile}
                filled={Boolean(docFile)}
                title={docFile ? docFile.name : 'Upload government ID'}
                subtitle="Accepted: passport, driver license, or national ID. JPG, PNG, or PDF up to 10MB."
                onClick={() => docRef.current?.click()}
                icon={<svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M12 6h11l7 7v21H12z" stroke="#F2BA0E" strokeWidth="2.2" /><path d="M23 6v8h8" stroke="#F2BA0E" strokeWidth="2.2" /><path d="M16 23h10M16 28h8" stroke="#F2BA0E" strokeWidth="2.2" strokeLinecap="round" /></svg>}
              />
              <input ref={docRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary" disabled={!form.docNumber || !docFile} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Take a clean selfie</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>Use your front camera with your face centered. Good lighting and a neutral background help us review your identity faster.</div>
            <DocumentCard
              active={!selfieFile}
              filled={Boolean(selfieFile)}
              title={selfieFile ? selfieFile.name : 'Upload selfie'}
              subtitle="Use your camera or upload a recent selfie image."
              onClick={() => selfieRef.current?.click()}
              icon={<svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M12 14h5l2-3h4l2 3h3a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" stroke="#7DD3FC" strokeWidth="2.2" /><circle cx="20" cy="23" r="5.5" stroke="#7DD3FC" strokeWidth="2.2" /></svg>}
            />
            <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" disabled={!selfieFile} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Review your submission</div>
            {[
              ['Status', statusMeta.label],
              ['Full name', `${form.firstName} ${form.lastName}`.trim()],
              ['Date of birth', form.dob],
              ['Country', form.country],
              ['Document', `${form.docType.replace('_', ' ')} • ${form.docNumber}`],
              ['Document file', docFile?.name || ''],
              ['Selfie file', selfieFile?.name || ''],
            ].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span><span style={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>{value}</span></div>)}
          </div>
          {msg && <div style={{ padding: '12px 14px', borderRadius: 14, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 13 }}>{msg.text}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit verification'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
