'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

type KycStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

const STEPS = [
  { id: 'personal', label: 'Profile details', hint: 'Tell us who you are' },
  { id: 'document', label: 'Document upload', hint: 'Government-issued ID' },
  { id: 'selfie', label: 'Selfie capture', hint: 'Match your face' },
  { id: 'review', label: 'Final review', hint: 'Confirm and submit' },
]

const statusMeta: Record<KycStatus, { title: string; tone: string; subtitle: string }> = {
  NOT_SUBMITTED: { title: 'Not verified', tone: '#8B5CF6', subtitle: 'Complete identity verification to unlock full access and faster compliance reviews.' },
  PENDING_REVIEW: { title: 'Pending', tone: 'var(--warning)', subtitle: 'Your submission is with our compliance team. We will update your status after review.' },
  APPROVED: { title: 'Verified', tone: 'var(--success)', subtitle: 'Your identity has been approved. Your account is fully verified.' },
  REJECTED: { title: 'Rejected', tone: 'var(--danger)', subtitle: 'We could not approve the last submission. Start again with clearer files to continue.' },
}

function ShieldMark({ status }: { status: KycStatus }) {
  const stroke = statusMeta[status].tone
  const bg = status === 'APPROVED'
    ? 'var(--success-bg)'
    : status === 'PENDING_REVIEW'
      ? 'var(--warning-bg)'
      : status === 'REJECTED'
        ? 'var(--danger-bg)'
        : 'rgba(139,92,246,0.14)'

  return (
    <div style={{ width: 90, height: 90, borderRadius: 24, background: bg, display: 'grid', placeItems: 'center' }}>
      <svg width="52" height="52" viewBox="0 0 64 64" fill="none" aria-hidden>
        <path d="M32 7 13 14.8v17.5c0 13.4 7.4 22.7 19 27.2 11.6-4.5 19-13.8 19-27.2V14.8L32 7Z" stroke={stroke} strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M23 26.5h18M23 34h18M23 41.5h10" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function StepIcon({ step, active }: { step: number; active: boolean }) {
  const color = active ? 'var(--brand-primary)' : 'var(--text-muted)'
  if (step === 0) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" /><path d="M5.5 19c1.7-3 4.3-4.5 6.5-4.5s4.8 1.5 6.5 4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
  if (step === 1) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 3.5V8h4" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><path d="M8.5 12.5h7M8.5 16h7" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
  if (step === 2) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 8.5h3l1.8-2h4.4L16 8.5h3a1 1 0 0 1 1 1V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13.2" r="3.2" stroke={color} strokeWidth="1.8" /></svg>
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 4h12a2 2 0 0 1 2 2v12l-4 2-4-2-4 2-4-2V6a2 2 0 0 1 2-2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 9h8M8 13h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function UploadCard({ title, subtitle, active, kind, onClick }: { title: string; subtitle: string; active: boolean; kind: 'document' | 'camera'; onClick: () => void }) {
  const accent = active ? 'var(--success)' : 'var(--brand-primary)'
  return (
    <button type="button" onClick={onClick} style={{ border: '1px solid var(--border)', background: active ? 'rgba(14,203,129,0.08)' : 'var(--bg-card)', borderRadius: 18, padding: 18, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: active ? 'rgba(14,203,129,0.14)' : 'rgba(242,186,14,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {kind === 'document' ? (
            <svg width="38" height="38" viewBox="0 0 48 48" fill="none"><path d="M15 6h13l9 9v22a3 3 0 0 1-3 3H15a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" /><path d="M28 6v10h10" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" /><path d="M18 24h12M18 30h12" stroke={accent} strokeWidth="2.4" strokeLinecap="round" /></svg>
          ) : (
            <svg width="38" height="38" viewBox="0 0 48 48" fill="none"><path d="M10 18h7l4-5h6l4 5h7v17a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V18Z" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" /><circle cx="24" cy="26" r="7" stroke={accent} strokeWidth="2.4" /><path d="M34.5 18v-3" stroke={accent} strokeWidth="2.4" strokeLinecap="round" /></svg>
          )}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
          <div style={{ color: active ? 'var(--success)' : 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{subtitle}</div>
        </div>
      </div>
    </button>
  )
}

export default function KYCPage() {
  const [status, setStatus] = useState<KycStatus>('NOT_SUBMITTED')
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
    fetch('/api/user/kyc')
      .then((r) => r.json())
      .then((d) => setStatus((d.status || 'NOT_SUBMITTED') as KycStatus))
      .finally(() => setLoading(false))
  }, [])

  const statusInfo = useMemo(() => statusMeta[status], [status])

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
      setMsg({ type: 'success', text: 'KYC submitted successfully. Your status is now pending review.' })
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to submit KYC.' })
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: 24 }}>Loading KYC...</div>

  if (status !== 'NOT_SUBMITTED') {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 26, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><ShieldMark status={status} /></div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', marginBottom: 12, color: statusInfo.tone, fontWeight: 700, fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>
            {statusInfo.title}
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Identity verification</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '12px 0 0' }}>{statusInfo.subtitle}</p>
          {status === 'REJECTED' && (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 14, padding: 14, fontSize: 13 }}>Verification reset to <strong>Not verified</strong>. Upload a clearer ID document and a fresh selfie to resubmit.</div>
              <button className="btn-primary" onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0); setMsg(null) }}>Start new verification</button>
            </div>
          )}
          {status === 'PENDING_REVIEW' && <div style={{ marginTop: 16, background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 14, padding: 14, fontSize: 13 }}>Our team is reviewing the document and selfie you uploaded. Typical review time is within 24 hours.</div>}
          {status === 'APPROVED' && <div style={{ marginTop: 16, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 14, padding: 14, fontSize: 13 }}>Verification complete. You can continue using the platform with verified access.</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 0 60px' }}>
      <div style={{ marginBottom: 20, background: 'linear-gradient(145deg, rgba(242,186,14,0.18), rgba(17,20,24,0.92) 40%, rgba(11,14,17,1))', border: '1px solid rgba(242,186,14,0.22)', borderRadius: 24, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#F2BA0E', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Status: Not verified</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Secure your account with institutional-grade KYC</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '10px 0 0', maxWidth: 560 }}>Provide your legal details, upload your identity document, and take a quick selfie. Once submitted, your status moves to Pending until our team reviews it.</p>
          </div>
          <ShieldMark status="NOT_SUBMITTED" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 22 }}>
            {STEPS.map((item, index) => {
              const active = index === step
              const completed = index < step
              return (
                <div key={item.id} style={{ borderRadius: 18, border: `1px solid ${active ? 'rgba(242,186,14,0.28)' : 'var(--border)'}`, background: active ? 'rgba(242,186,14,0.08)' : completed ? 'rgba(14,203,129,0.08)' : 'transparent', padding: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: completed ? 'rgba(14,203,129,0.12)' : 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                    <StepIcon step={index} active={active || completed} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{item.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{item.hint}</div>
                </div>
              )
            })}
          </div>

          {step === 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
                <input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
                <select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="">Country of residence</option>
                  {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </div>
              <button disabled={!form.firstName || !form.lastName || !form.dob || !form.country} onClick={() => setStep(1)} className="btn-primary">Continue to documents</button>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[{ id: 'passport', label: 'Passport' }, { id: 'drivers_license', label: 'Driver license' }, { id: 'national_id', label: 'National ID' }].map((doc) => (
                  <button key={doc.id} type="button" onClick={() => setForm((f) => ({ ...f, docType: doc.id }))} style={{ borderRadius: 14, border: `1px solid ${form.docType === doc.id ? 'var(--brand-primary)' : 'var(--border)'}`, padding: '13px 12px', background: form.docType === doc.id ? 'rgba(242,186,14,0.08)' : 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}>{doc.label}</button>
                ))}
              </div>
              <input className="input" value={form.docNumber} onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))} placeholder="Document number" />
              <UploadCard title="Upload identity document" subtitle={docFile ? docFile.name : 'Accepted: passport, driver license, national ID or PDF export'} active={!!docFile} kind="document" onClick={() => docRef.current?.click()} />
              <input ref={docRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setStep(0)} className="btn-ghost">Back</button>
                <button type="button" disabled={!docFile || !form.docNumber} onClick={() => setStep(2)} className="btn-primary">Continue to selfie</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <UploadCard title="Take your verification selfie" subtitle={selfieFile ? selfieFile.name : 'Use your front camera and make sure your face is clearly visible'} active={!!selfieFile} kind="camera" onClick={() => selfieRef.current?.click()} />
              <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
                <button type="button" disabled={!selfieFile} onClick={() => setStep(3)} className="btn-primary">Review submission</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
                {[{ label: 'Full name', value: `${form.firstName} ${form.lastName}` }, { label: 'Date of birth', value: form.dob }, { label: 'Country', value: form.country }, { label: 'Document', value: `${form.docType.replace('_', ' ')} • ${form.docNumber}` }, { label: 'Uploaded document', value: docFile?.name || '—' }, { label: 'Uploaded selfie', value: selfieFile?.name || '—' }].map((row, index, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: index === arr.length - 1 ? 'none' : '1px solid var(--border)', padding: '10px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              {msg && <div style={{ background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', padding: 12, borderRadius: 14, fontSize: 13 }}>{msg.text}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setStep(2)} className="btn-ghost">Back</button>
                <button type="button" onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit verification'}</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Status timeline</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <div style={{ padding: 12, borderRadius: 16, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}><strong>Not verified</strong><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>No KYC has been submitted yet.</div></div>
              <div style={{ padding: 12, borderRadius: 16, background: 'var(--warning-bg)', border: '1px solid rgba(240,185,11,0.18)' }}><strong>Pending</strong><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Shown immediately after submission.</div></div>
              <div style={{ padding: 12, borderRadius: 16, background: 'var(--success-bg)', border: '1px solid rgba(14,203,129,0.18)' }}><strong>Verified</strong><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Shown after admin approval.</div></div>
              <div style={{ padding: 12, borderRadius: 16, background: 'var(--danger-bg)', border: '1px solid rgba(246,70,93,0.18)' }}><strong>Rejected</strong><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Shown when compliance rejects the submission, then resets to not verified when you start again.</div></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Before you submit</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8 }}>
              <li>Make sure your full legal name matches your ID.</li>
              <li>Use a clear, uncropped photo or PDF of your document.</li>
              <li>Take your selfie in good lighting with your full face visible.</li>
              <li>After submission, both files are delivered to compliance for review.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
